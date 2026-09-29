PRUEBAS.grupo('P207 · privacidad · lo que protegía era un recorte, y el recorte se salteaba por el costado');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Cinco hallazgos de la auditoría de P205, con una sola raíz: **la defensa estaba en el transporte
   y no donde el dato se usa**. El informe completo, con escenarios y refutaciones, está en
   `docs/specs/p205-auditoria-post-demo/informe.md`.

   · 🔴 El texto de la nota clínica viajaba en el `detalle` de la bitácora. La bitácora es
     append-only por R3 —no se edita ni se borra NUNCA— y el supervisor la lee entera con su
     contraseña. O sea: cada determinación firmada archivaba el texto para siempre y se lo devolvía,
     contra lo que `doc_2_p2` le promete al cliente. La función hermana `notaClinicaGuardar()` ya lo
     hacía bien y ésta no la copió.
   · 🔴 `niveles_riesgo` devolvía la hoja ENTERA: nombre, cargo, departamento y nivel de riesgo de
     las personas de las OTRAS empresas clientes, en la respuesta de red. Y a Dirección le llegaba
     nominal, que es la mitad del cruce que `bitacoraParaHseq_` documentó al negarse a mandar el
     umbral.
   · 🟡 La bitácora LOCAL entraba cruda al panel de Dirección: `hseqEventos` sólo anonimizaba en la
     demostración, y `bitPull` conserva los eventos que no llegaron a subir.
   · 🟡 `anonimizarHseq` recortaba por LISTA NEGRA — tercera vez que falla igual (A13 con `cedula`,
     P151 con `id`, y ahora `nivel`/`mrg`).
   · 🟡 La nota clínica se pintaba en la tarjeta del supervisor: el almacén de gestiones es por
     EMPRESA y no por rol, y `gestPull` superpone lo pendiente por encima de lo que recortó el
     servidor.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P207_HOY = (function(){ const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();
const P207_SIN = () => { if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return true; } return false; };

function p207Hojas(extra){
  return Object.assign({
    'Accesos': [['Usuario','Clave','Rol','Empresas','ClaveMedica','ClaveHseq'],
                ['helitec', 'sup-207', 'empresa', 'Helitec', 'med-207', 'dir-207'],
                ['otra',    'sup-otra', 'empresa', 'Otra Empresa SA', '', '']],
    'Bitácora': [['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo','UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON']],
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo','Sexo','Edad','Telefono','Email','EsPiloto','IdPiloto','Rol','Nivel']],
    'Niveles Riesgo': [['Empresa','Departamento','Cargo','Persona','Nivel'],
      ['Helitec',         'Operaciones', 'Piloto', 'Ana Suárez',    '5'],
      ['Helitec',         'Legal',       'Abogado', '',             '2'],
      ['Otra Empresa SA', 'Vuelo',       'Piloto', 'Beto Ajeno',    '4'],
      ['',                '',            '',       '',             '3']],
    'Config Empresa': [['Empresa','Clave','Valor']]
  }, extra || {});
}

/* ── 1 · el texto clínico no se archiva ──────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P207 · el texto de una nota clínica NO llega a la hoja de bitácora', () => {
  if (P207_SIN()) return;
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionBitacoraGuardar','accionBitacora','bitDetalleRecortado_']);
  /* Entra por la acción REAL, que es la que llama el cliente: `bitPush` postea el evento entero. */
  const ev = { id:'b207', ts: Date.now(), empresa:'Helitec', actor:'dr. x', rol:'medico',
    accion:'determinacion_medica', sujeto:'Ana Suárez', origen:'app', app:'6.90',
    detalle:{ id:'g1', nivel:'alto', horas:24, medico:'Dr. X', chars:42,
              nota:'refiere insomnio por tratamiento psiquiatrico' } };
  const r = JSON.parse(api.manejar({ action:'bitacora_guardar', _post:true,
    usuario:'helitec', pass:'sup-207', empresa:'Helitec', dispositivoId:'d207',
    evento: JSON.stringify(ev) }).getContent());
  PRUEBAS.cierto(r.ok, 'guarda: el evento se aceptó · ' + JSON.stringify(r).slice(0,90));

  const hoja = env.__libro.getSheetByName('Bitácora').__volcado();
  const crudo = hoja.slice(1).map(f => String(f[12] || '')).join(' ');
  PRUEBAS.alMenos(crudo.length, 10, 'guarda: se escribió algo · con la hoja vacía esto no probaría nada');
  PRUEBAS.igual(crudo.indexOf('insomnio'), -1,
    '🔴 el texto clínico NO está en la hoja · R3: una fila de bitácora no se edita ni se borra nunca, así que lo que entra queda para siempre');
  PRUEBAS.cierto(crudo.indexOf('"chars"') > 0,
    '⚠️ pero SÍ queda que se escribió una nota, y de qué largo · el hecho es auditable, el contenido no');
  PRUEBAS.cierto(crudo.indexOf('"nivel":"alto"') > 0 || crudo.indexOf('alto') > 0,
    'y el resto del detalle viaja normal · si se hubiera tapado todo, el caso pasaría por la razón equivocada');
});

PRUEBAS.caso('🔴 P207 · el recorte del detalle es LISTA BLANCA, y nombra lo que descartó', () => {
  if (P207_SIN()) return;
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['bitDetalleRecortado_']);
  const r = api.bitDetalleRecortado_({ id:'x', nivel:'alto', chars:12,
                                       nota:'texto', comentarioLibre:'otro', inventadoManana:'z' });
  PRUEBAS.igual(r.nota, undefined, '🔴 `nota` no pasa');
  PRUEBAS.igual(r.comentarioLibre, undefined, '🔴 ni un campo de texto que nadie previó');
  PRUEBAS.igual(r.inventadoManana, undefined,
    '🔴 ni uno que se agregue mañana · es lista BLANCA: A13 y P151 fallaron las dos por tapar lo que ya se había escapado');
  PRUEBAS.igual([r.id, r.nivel, r.chars], ['x','alto',12], '⚠️ y lo legítimo sí pasa');
  PRUEBAS.cierto(String(r.__descartadas || '').indexOf('nota') >= 0,
    '⚠️ y lo descartado se NOMBRA · un recorte silencioso esconde el día en que un campo dejó de llegar');
});

PRUEBAS.caso('🔴 P207 · el cliente tampoco manda el texto: `anotGuardar` pasa `chars`', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf("bitacoraRegistrar(ANOT.nivel === 'ok'");
    PRUEBAS.cierto(i > 0, 'guarda: se encontró la llamada · si la renombran, este caso se cae en vez de pasar');
    const bloque = src.slice(i, i + 320);
    PRUEBAS.igual(bloque.match(/nota\s*:\s*nota/), null,
      '🔴 el texto ya no viaja · el servidor lo recorta igual, pero el cliente es código PÚBLICO y no puede ser la única defensa');
    PRUEBAS.cierto(/chars:/.test(bloque),
      '⚠️ manda el largo, como su hermana `notaClinicaGuardar` · «va que SE ESCRIBIÓ una nota, nunca su contenido»');
  });
});

/* ── 2 · los niveles de riesgo ───────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P207 · `niveles_riesgo` no devuelve las filas de las OTRAS empresas', () => {
  if (P207_SIN()) return;
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionNivelesRiesgo','nivelesParaAcceso_']);
  const r = JSON.parse(api.manejar({ action:'niveles_riesgo', _post:true,
    usuario:'helitec', pass:'sup-207', empresa:'Helitec', dispositivoId:'d207' }).getContent());
  PRUEBAS.cierto(r.ok, 'guarda: la acción respondió · ' + JSON.stringify(r).slice(0,80));
  const nombres = (r.niveles || []).map(x => x.persona || '').join(' ');
  const empresas = Array.from(new Set((r.niveles || []).map(x => String(x.empresa || '(general)'))));
  PRUEBAS.igual(nombres.indexOf('Beto Ajeno'), -1,
    '🔴 nadie de otra empresa · la respuesta llevaba la hoja ENTERA, visible con F12');
  PRUEBAS.igual(empresas.filter(e => e !== 'Helitec' && e !== '(general)' && e !== ''), [],
    '🔴 ni sus filas · leyó: ' + empresas.join(', '));
  PRUEBAS.cierto((r.niveles || []).some(x => !String(x.empresa || '').trim()),
    '⚠️ pero la regla GENERAL sigue viajando · sin ella el cálculo del nivel cambia para todos');
  PRUEBAS.cierto(nombres.indexOf('Ana Suárez') >= 0,
    '⚠️ y el supervisor SÍ ve a los suyos por nombre · decide sobre ellos · si no, el caso pasaría por tapar todo');
});

PRUEBAS.caso('🔴 P207 · a Dirección los niveles le llegan SIN nombre', () => {
  if (P207_SIN()) return;
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionNivelesRiesgo']);
  const r = JSON.parse(api.manejar({ action:'niveles_riesgo', _post:true,
    usuario:'helitec', pass:'dir-207', empresa:'Helitec', vista:'hseq', dispositivoId:'d207' }).getContent());
  PRUEBAS.cierto(r.ok, 'guarda: entró como Dirección · ' + JSON.stringify(r).slice(0,80));
  PRUEBAS.alMenos((r.niveles || []).length, 1, 'guarda: recibió filas · con cero esto no probaría nada');
  PRUEBAS.igual((r.niveles || []).filter(x => x.persona), [],
    '🔴 ninguna fila con nombre · era la mitad del cruce que `bitacoraParaHseq_` documentó al negarse a mandar el umbral: «P1 → nivel 5 → Ana Suárez»');
  PRUEBAS.cierto((r.niveles || []).some(x => x.nivel),
    '⚠️ pero la ESCALA sí llega · Dirección la necesita para sus agregados por nivel de riesgo');
});

/* ── 3 · el recorte de Dirección, por lista blanca ───────────────────────────────────────────── */

PRUEBAS.caso('🔴 P207 · `anonimizarHseq` recorta por lista blanca: una clave nueva NO viaja', () => {
  if (P207_SIN()) return;
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['anonimizarHseq']);
  /* Una fila con un campo que nadie previó — que es exactamente cómo entraron `cedula` (A13) e
     `id` (P151): alguien los agregó a un lector y nadie miró este recorte. */
  const r = api.anonimizarHseq(
    [{ persona:'Ana Suárez', departamento:'Operaciones', cedula:'V-111' }],
    [{ nombre:'Ana Suárez', dep:'Operaciones', nivel:5, mrg:{amarillo:0.85,rojo:1}, inventadoManana:'secreto' }],
    [{ persona:'Ana Suárez', evento:'salida_casa', id:'turno_c12345678_x' }],
    [{ persona:'Ana Suárez', tipo:'checkin', id:'turno_c12345678_y' }]);
  const todo = JSON.stringify(r);
  PRUEBAS.igual(todo.indexOf('Ana Suárez'), -1, 'guarda: ningún nombre sobrevive');
  PRUEBAS.igual(todo.indexOf('secreto'), -1,
    '🔴 la clave que nadie previó NO viaja · con lista negra viajaba, que es como entraron `cedula` e `id`');
  PRUEBAS.igual(todo.indexOf('V-111'), -1, '⚠️ ni la cédula (A13)');
  PRUEBAS.igual(todo.indexOf('c12345678'), -1, '⚠️ ni la cédula escondida dentro del `id` (P151)');
  PRUEBAS.cierto(r.aptitud[0].nivel === 5,
    '⚠️ pero `nivel` SÍ viaja, y es una decisión: Dirección lo usa, y lo que lo volvía peligroso era cruzarlo con la tabla nominal — que ya no le llega');
  PRUEBAS.cierto(String(r.aptitud[0].__descartadas || '').indexOf('inventadoManana') >= 0,
    '⚠️ y lo descartado se nombra');
});

/* ── 4 · el cliente ──────────────────────────────────────────────────────────────────────────── */

PRUEBAS.caso('🔴 P207 · la bitácora local se anonimiza en Dirección también fuera de la demostración', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf('function hseqEventos()');
    PRUEBAS.cierto(i > 0, 'guarda: la función existe');
    const bloque = src.slice(i, i + 1400);
    PRUEBAS.igual(bloque.match(/DASH\.demoMode\s*&&\s*DASH\.vista === 'hseq'/), null,
      '🔴 ya no depende de `demoMode` · `bitPull` conserva los eventos locales que no llegaron a subir, con nombre y umbral, y el almacén es por EMPRESA, no por rol');
    PRUEBAS.cierto(/DASH\.vista === 'hseq'/.test(bloque),
      '⚠️ y sigue aplicándose sólo en Dirección · al supervisor los nombres le corresponden');
  });
});

PRUEBAS.caso('🔴 P207 · el texto de la nota clínica no se pinta salvo que quien llama lo pida', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf('class="apt-med-txt"');
    PRUEBAS.cierto(i > 0, 'guarda: el banner de la nota existe');
    const bloque = src.slice(Math.max(0, i - 500), i + 120);
    PRUEBAS.cierto(/opts\s*&&\s*opts\.conNota/.test(bloque),
      '🔴 hace falta pedirlo · el recorte del servidor era la única defensa y se saltea por el costado: el almacén es por empresa y `gestPull` superpone lo pendiente por encima');
    /* Y la tarjeta del supervisor —la lista de «Estado por persona»— no lo pide nunca. */
    const j = src.indexOf('visibles.map(p => aptTarjeta(p,');
    PRUEBAS.cierto(j > 0, 'guarda: se encontró la lista del supervisor');
    PRUEBAS.igual(src.slice(j, j + 120).match(/conNota/), null,
      '🔴 la lista de Aptitud no pide la nota · es la que ve el supervisor');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE ENCONTRÓ EL VERIFICADOR SOBRE EL PROPIO ARREGLO

   Cinco defectos que introduje al cerrar los cinco de privacidad, dos de ellos bloqueantes. El
   patrón: un recorte nuevo siempre saca de más en algún camino que no es el que uno miró.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P207 · el ADMINISTRADOR sigue recibiendo todos los niveles', () => {
  if (P207_SIN()) return;
  /* Su `gestScope` es «Todas las empresas», que no es el nombre de ninguna: el filtro nuevo lo
     dejaba sin una sola fila de empresa. Y el daño no es cosmético — `nivelRiesgoDe` cae al nivel 3
     para todos y `bitUmbralDe` ESCRIBE ese 3 en la bitácora de un piloto de nivel 5, en una hoja
     que por R3 no se edita ni se borra nunca. El centinela ya existía en otros tres lugares. */
  const env = GS.crearEntorno(Object.assign(p207Hojas(), {
    'Accesos': [['Usuario','Clave','Rol','Empresas','ClaveMedica','ClaveHseq'],
                ['*', 'adm-207', 'admin', '*', '', '']]
  }));
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionNivelesRiesgo','nivelesParaAcceso_']);
  const r = JSON.parse(api.manejar({ action:'niveles_riesgo', _post:true,
    usuario:'*', pass:'adm-207', empresa:'Todas las empresas', dispositivoId:'d207' }).getContent());
  PRUEBAS.cierto(r.ok, 'guarda: el admin entró · ' + JSON.stringify(r).slice(0,80));
  const emp = Array.from(new Set((r.niveles || []).map(x => String(x.empresa || '(general)'))));
  PRUEBAS.cierto(emp.indexOf('Helitec') >= 0 && emp.indexOf('Otra Empresa SA') >= 0,
    '🔴 ve las de TODAS las empresas · leyó: ' + emp.join(', '));
  PRUEBAS.cierto((r.niveles || []).some(x => x.persona),
    '⚠️ y con nombre · el admin no es Dirección');
});

PRUEBAS.caso('🔴 P207 · el filtro canoniza LOS DOS lados: una sesión vieja no se queda sin niveles', () => {
  if (P207_SIN()) return;
  /* `acc.canonical` sale congelado de la hoja `Sesiones` y no caduca sola (S4). Si el orden de los
     alias cambió después de emitirla —pasó el 2026-09-10—, la sesión trae un alias viejo y la hoja
     el nuevo: comparar uno crudo contra uno canonizado daba CERO filas, y todos a nivel 3. */
  const env = GS.crearEntorno(Object.assign(p207Hojas(), {
    'Accesos': [['Usuario','Clave','Rol','Empresas','ClaveMedica','ClaveHseq'],
                ['helitec', 'sup-207', 'empresa', 'Consorcio HELITEC, Helitec', 'med-207', 'dir-207']],
    'Niveles Riesgo': [['Empresa','Departamento','Cargo','Persona','Nivel'],
      ['Helitec', 'Operaciones', 'Piloto', 'Ana Suárez', '5'],   // la hoja usa el alias secundario
      ['',        '',            '',       '',           '3']]
  }));
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionNivelesRiesgo']);
  const r = JSON.parse(api.manejar({ action:'niveles_riesgo', _post:true,
    usuario:'helitec', pass:'sup-207', empresa:'Consorcio HELITEC', dispositivoId:'d207' }).getContent());
  PRUEBAS.cierto((r.niveles || []).some(x => x.persona === 'Ana Suárez'),
    '🔴 la fila escrita con OTRO alias de la misma empresa llega igual · leyó ' + ((r.niveles||[]).length) + ' filas');
});

PRUEBAS.caso('🔴 P207 · a Dirección la fila NOMINAL se descarta entera, no se le borra el nombre', () => {
  if (P207_SIN()) return;
  /* Quitarle `persona` a una fila de override por persona —empresa + persona, sin cargo ni área— la
     convierte en «la fila general de la empresa», que `nivelRiesgoDe` reconoce justamente por tener
     los tres campos vacíos: el nivel de UNA persona pasaba a ser el default de TODAS. */
  const env = GS.crearEntorno(Object.assign(p207Hojas(), {
    'Niveles Riesgo': [['Empresa','Departamento','Cargo','Persona','Nivel'],
      ['Helitec', '', '', 'Ana Suárez', '5'],     // override por persona
      ['Helitec', 'Operaciones', '', '', '2'],
      ['',        '', '', '',           '3']]
  }));
  const api = GS.cargarGs(CTX.gs, env, ['manejar','accionNivelesRiesgo']);
  const r = JSON.parse(api.manejar({ action:'niveles_riesgo', _post:true,
    usuario:'helitec', pass:'dir-207', empresa:'Helitec', vista:'hseq', dispositivoId:'d207' }).getContent());
  const generales = (r.niveles || []).filter(x => !String(x.departamento||'').trim() && !String(x.cargo||'').trim() && String(x.empresa||'').trim());
  PRUEBAS.igual(generales, [],
    '🔴 la fila nominal no llega disfrazada de regla general · si llegara, Dirección juzgaría a todos con el nivel de una persona');
  PRUEBAS.cierto((r.niveles || []).some(x => x.departamento === 'Operaciones'),
    '⚠️ pero las reglas por área sí llegan · son las que Dirección necesita');
});

PRUEBAS.caso('🔴 P207 · el espejo del médico NO muestra el texto de la nota', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    /* `aptTarjeta` es la misma función que el médico abre como «Así lo ve el supervisor», con un
       texto al lado que promete «sin valores de los tests ni detalle clínico». Con el filtro por
       `DASH.vista` el espejo mostraba la nota y le juraba al médico que el supervisor la ve. */
    const i = src.indexOf('class="apt-med-txt"');
    PRUEBAS.cierto(i > 0, 'guarda: el banner existe');
    const bloque = src.slice(Math.max(0, i - 400), i + 80);
    PRUEBAS.cierto(/opts\s*&&\s*opts\.conNota/.test(bloque),
      '🔴 la decisión la toma QUIEN LLAMA, no la vista · si no, el espejo miente');
    PRUEBAS.igual(bloque.match(/DASH\.vista === 'medico'/), null,
      '🔴 y no depende de la vista · el espejo se pinta DESDE la vista del médico');
    /* Y el llamador del espejo no la pide. */
    const j = src.indexOf('aptTarjeta(aptPersona(DASH.f.per');
    PRUEBAS.cierto(j > 0, 'guarda: se encontró el espejo');
    PRUEBAS.igual(src.slice(j, j + 90).match(/conNota/), null, '🔴 el espejo no pide la nota');
  });
});

PRUEBAS.caso('🔴 P207 · el recorte de Dirección conserva `resultado`: sin él el ciclo se cuenta dos veces distinto', () => {
  if (P207_SIN()) return;
  /* En una fila de parada `resultado` no es un puntaje: es el INSTANTE del cierre, y
     `recortarCicloServer` lo preserva a propósito (P077). Sin él, `cicloCerradoEn` cae al ISO de la
     fila y el mismo ciclo sale «cerrado» para Dirección y «detenido» para el supervisor. */
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['anonimizarHseq']);
  const r = api.anonimizarHseq([], [],
    [{ persona:'Ana Suárez', evento:'cerrado', resultado: 1790000000000, nivel:'medio', iso:'2026-09-01T10:00:02Z' }],
    [{ persona:'Ana Suárez', tipo:'checkin', kssNivel:'ok', kss: 7 }]);
  PRUEBAS.igual(r.operacional[0].resultado, 1790000000000,
    '🔴 el instante del cierre viaja · es lo que distingue «cerrado» de «detenido»');
  PRUEBAS.igual(r.turnos[0].kss, undefined,
    '⚠️ pero el puntaje crudo del turno NO · es lo que K1a existe para sacar');
  PRUEBAS.igual(r.turnos[0].kssNivel, 'ok', '⚠️ y el semáforo sí, que es lo que Dirección usa');
});

PRUEBAS.caso('⚠️ P207 · el detalle de un cambio de departamento sobrevive entero al recorte', () => {
  if (P207_SIN()) return;
  /* La bitácora existe para ser prueba: una fila de `departamento_baja` sin CUÁL departamento fue
     ni a cuánta gente afectó no prueba nada, y por R3 no se corrige después. */
  const env = GS.crearEntorno(p207Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['bitDetalleRecortado_']);
  const r = api.bitDetalleRecortado_({ departamento:'Operaciones', empresa:'Helitec',
                                       personas:12, forzado:true, sinCambio:false });
  PRUEBAS.igual([r.departamento, r.personas, r.forzado], ['Operaciones', 12, true],
    '⚠️ las cuatro claves de `departamento_*` pasan · se habían caído en la primera lista blanca');
  PRUEBAS.igual(r.__descartadas, undefined, 'y no se descartó nada de esa fila');
});

PRUEBAS.caso('⚠️ P207 · la bitácora de Dirección no renumera a quien ya es seudónimo, y no lleva umbral', () => {
  /* `bitPull` mezcla los eventos del servidor —que ya vienen «P1, P2…»— con los locales sin subir,
     que traen el nombre. Con un solo mapa, la misma persona salía como dos «P» distintas y
     Trazabilidad contaba más gente de la que hay. Y el umbral de un evento local viajaba entero:
     es el campo exacto que `bitacoraParaHseq_` se negó a mandar porque reidentifica. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const i = src.indexOf('function hseqEventos()');
    const bloque = src.slice(i, i + 3000);
    PRUEBAS.cierto(/\^P\\\\d\+\$|\/\^P\\d\+\$\//.test(bloque) || bloque.indexOf('P\\d+$') > 0,
      '⚠️ un sujeto que ya es «PN» se deja como está');
    PRUEBAS.cierto(/umbral:\s*null/.test(bloque),
      '⚠️ y el umbral no viaja · cerrar una puerta y dejar la de al lado ya pasó tres veces acá');
  });
});
