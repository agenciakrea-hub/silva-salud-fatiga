
PRUEBAS.grupo('A3 · continuidad: Helitec tiene que poder seguir operando');

/* ⚠️ POR QUÉ EXISTE ESTE GRUPO. Franco lo dijo con todas las letras al pedir el cierre de tanda:
   "acordate que Helitec debe poder seguir operando mientras estamos ejecutando estos planes de
   reformas". No es una preferencia: son pilotos reales usando la app hoy, con la versión anterior
   guardada en el caché del service worker, hablando contra un endpoint que ya cambió.

   Y encontró algo. Medido contra PRODUCCIÓN el 2026-09-03, con el endpoint publicado:

       action=empleado      sin cédula  →  {"ok":false,"motivo":"falta_cedula"}
       action=tareas_mias   sin cédula  →  {"ok":false,"error":"Falta la cédula"}
       action=tarea_estado  sin cédula  →  {"ok":false,"error":"Faltan datos"}

   O sea que toda app con la versión anterior en caché —que no manda cédula— había perdido la
   sincronización de sus estadísticas y TODAS sus notificaciones. En silencio: el cliente ni
   siquiera miraba el motivo. Lo que sí seguía funcionando (verificado en el código) es registrar:
   reporte, operacional, turno y PVT no piden cédula. La operación central no se cayó, pero la
   persona dejó de ver lo suyo y nadie se lo dijo.

   La corrección NO fue apagar Z0b. Fue exigir la cédula donde se puede verificar algo con ella. */

function a3Endpoint(nomina, identidades){
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo']].concat(nomina || []),
    'Tareas': [['Empresa','Id','Cedula','Persona','Tipo','Titulo','Detalle','Estado','Creada','Actualizada','Vence','Autor']],
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS'],
                                   ['2026-09-01','Ana Suárez','Helitec','7']],
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']].concat(identidades || []),
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'],
                ['Helitec','clave-sup','supervisor','Helitec','','']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
  });
  return GS.cargarGs(CTX.gs, env, ['accionEmpleado','accionTareasMias','accionTareaEstado']);
}
const a3r = resp => JSON.parse(resp.getContent());

PRUEBAS.caso('⚠️ la app VIEJA (sin cédula) sigue viendo sus estadísticas', () => {
  /* EL CASO DEL HALLAZGO. Una persona que no está en la nómina con cédula: no hay nada que
     verificar, así que exigirla no protegía — sólo la dejaba afuera. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = a3Endpoint([['Helitec','Ana Suárez','','Op','Piloto']]);   // nómina SIN cédula
  const r = a3r(api.accionEmpleado({ empresa:'Helitec', persona:'Ana Suárez' }));
  PRUEBAS.cierto(r.ok,
    '⚠️ sin cédula en el padrón, exigirla no verifica nada y deja a la persona sin sus datos ' +
    '(respondió: ' + (r.motivo || r.error || 'ok') + ')');
});

PRUEBAS.caso('⚠️ pero donde el padrón SÍ conoce la cédula, se sigue exigiendo (Z0b intacto)', () => {
  /* El discriminador, y es lo que separa "arreglar la continuidad" de "apagar la seguridad".
     Si este caso pasara a verde con `ok:true`, habríamos deshecho Z0b entero: bastaría un nombre
     para leer los datos de salud de cualquiera. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = a3Endpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']],
                         [['Ana Suárez','Helitec','V-111','Ana Suárez','nomina','5','2026-01-01','2026-09-01']]);
  const sin = a3r(api.accionEmpleado({ empresa:'Helitec', persona:'Ana Suárez' }));
  PRUEBAS.falso(sin.ok, '⚠️ con la cédula en el padrón, sin mandarla NO se entra');
  PRUEBAS.igual(sin.motivo, 'falta_cedula', 'y se dice por qué, para que la app pueda pedirla');

  const mal = a3r(api.accionEmpleado({ empresa:'Helitec', persona:'Ana Suárez', cedula:'V-999', dispositivoId:'d1' }));
  PRUEBAS.falso(mal.ok, '⚠️ y con una cédula equivocada tampoco: eso es Z0b y no se tocó');

  const bien = a3r(api.accionEmpleado({ empresa:'Helitec', persona:'Ana Suárez', cedula:'V-111', dispositivoId:'d2' }));
  PRUEBAS.cierto(bien.ok, 'con la correcta, sí');
});

PRUEBAS.caso('⚠️ las notificaciones vuelven para la app vieja, con el mismo criterio', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const sinCed = a3Endpoint([['Helitec','Ana Suárez','','Op','Piloto']]);
  PRUEBAS.cierto(a3r(sinCed.accionTareasMias({ empresa:'Helitec', persona:'Ana Suárez' })).ok,
    'sin cédula en la nómina, las notificaciones tienen que llegar igual');

  const conCed = a3Endpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']]);
  const r = a3r(conCed.accionTareasMias({ empresa:'Helitec', persona:'Ana Suárez' }));
  PRUEBAS.falso(r.ok,
    '⚠️ pero si la nómina la conoce, se sigue pidiendo: por acá viaja la determinación médica');
});

PRUEBAS.caso('⚠️ registrar fatiga NUNCA dependió de la cédula, y tiene que seguir así', () => {
  /* Es la operación central: si esto se cayera, Helitec no podría trabajar. Se comprueba sobre la
     fuente del `.gs` porque son cuatro acciones distintas y lo que importa es que NINGUNA empiece a
     pedirla — es el error que sería fácil cometer "por consistencia" en el próximo cambio. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const malos = [];
  ['accionReporteGuardar','accionOperacionalGuardar','accionTurnoGuardar','accionPvt'].forEach(fn => {
    const i = CTX.gs.indexOf('function ' + fn + '(');
    if (i < 0){ malos.push(fn + ': no existe'); return; }
    const cuerpo = CTX.gs.slice(i, i + 1200);
    if (/if\s*\(\s*!\s*(p\.)?ced/.test(cuerpo) || /falta_cedula/.test(cuerpo)) malos.push(fn + ': empezó a exigir cédula');
  });
  PRUEBAS.igual(malos, [],
    '⚠️ ninguna acción de registro puede exigir cédula: es lo único que hoy mantiene a Helitec ' +
    'operando mientras el resto de la migración avanza — ' + malos.join(' | '));
});

PRUEBAS.grupo('A3 · el fallo no puede ser mudo');

/* ⚠️ SE ESPERA LA PROMESA ANTES DE RESTAURAR, y esto me hizo fallar el caso una vez.
   `misSincronizar()` es asíncrona: devuelve la promesa y sigue. Un `try/finally` alrededor de la
   llamada corre el `finally` DE INMEDIATO, así que `window.prompt` volvía al original antes de que
   llegara la respuesta simulada — y el caso reportaba que la app no preguntaba cuando en realidad
   preguntaba con el prompt de verdad, ya restaurado. Fallo de la prueba, no del código. */
async function a3ConRespuesta(respuesta, perfil){
  const prevPerfil = getProfile();
  const prevFetch = window.fetchConReloj, prevPrompt = window.prompt;
  let preguntó = false;
  try {
    setProfile(perfil);
    try { _misCedulaPedida = false; _misSincronizando = false; } catch(e){}
    window.prompt = function(){ preguntó = true; return null; };   // la pospone: no debe trabar nada
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(respuesta) });
    await misSincronizar();
  } finally {
    window.fetchConReloj = prevFetch; window.prompt = prevPrompt;
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    try { _misCedulaPedida = false; _misSincronizando = false; } catch(e){}
  }
  return preguntó;
}

PRUEBAS.caso('⚠️ cuando el servidor pide la cédula, la app la PIDE en vez de callarse', async () => {
  /* La otra mitad del hallazgo. Aunque el servidor ahora sólo la exija donde se puede verificar,
     ahí SÍ la va a exigir — y ahí la app tenía un `if (!d.ok) return false` que descartaba el
     motivo. La persona veía su pantalla sin actualizar y nada le decía qué hacer. */
  const preguntó = await a3ConRespuesta({ ok:false, motivo:'falta_cedula' },
                                         { nombre:'Ana Suárez', empresa:'Helitec' });   // perfil viejo: SIN cédula
  PRUEBAS.cierto(preguntó,
    '⚠️ con `falta_cedula` la app tiene que pedírsela; callarse deja a la persona sin saber por ' +
    'qué dejó de ver sus datos');
});

PRUEBAS.caso('⚠️ y no pregunta por cualquier fallo: un problema de red no se anuncia dos veces', async () => {
  /* El discriminador. Si preguntara ante cualquier `!ok`, aparecería un cartel pidiendo la cédula
     cada vez que se cae la señal — y la cédula no tiene nada que ver con eso. El estado de la
     conexión ya lo dice el indicador de la app. */
  const preguntó = await a3ConRespuesta({ ok:false, error:'Sin conexión' },
                                         { nombre:'Ana Suárez', empresa:'Helitec' });
  PRUEBAS.falso(preguntó, 'un fallo sin motivo de cédula no puede disparar la pregunta');
});

PRUEBAS.caso('⚠️ ni cuando todo salió bien', async () => {
  /* El otro control: con `ok:true` no hay ningún motivo para molestar a nadie. */
  const preguntó = await a3ConRespuesta({ ok:true, registros:[], pvt:[], referencia:{}, metricas:[] },
                                         { nombre:'Ana Suárez', empresa:'Helitec' });
  PRUEBAS.falso(preguntó, 'una sincronización exitosa no puede pedir nada');
});

PRUEBAS.caso('⚠️ una cédula guardada NO se pierde si la persona pospone', () => {
  /* Posponer tiene que ser gratis. Si cancelar borrara o ensuciara el perfil, la app quedaría peor
     que antes de preguntar. */
  const prevPerfil = getProfile();
  const prevPrompt = window.prompt;
  let despues = null;
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec', cedula:'V-111' });
    try { _misCedulaPedida = false; } catch(e){}
    window.prompt = function(){ return null; };
    misPedirCedula('cedula_mal');
    despues = (getProfile() || {}).cedula;
  } finally {
    window.prompt = prevPrompt;
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    try { _misCedulaPedida = false; } catch(e){}
  }
  PRUEBAS.igual(despues, 'V-111', 'cancelar no puede tocar lo que ya estaba guardado');
});

PRUEBAS.caso('⚠️ una cédula inválida no se guarda, y no se pregunta dos veces por sesión', () => {
  const prevPerfil = getProfile();
  const prevPrompt = window.prompt;
  let veces = 0, guardada = null;
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec' });
    try { _misCedulaPedida = false; } catch(e){}
    window.prompt = function(){ veces++; return 'no-es-una-cedula-@@'; };
    misPedirCedula('falta_cedula');
    misPedirCedula('falta_cedula');     // segundo intento en la misma sesión
    guardada = (getProfile() || {}).cedula;
  } finally {
    window.prompt = prevPrompt;
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    try { _misCedulaPedida = false; } catch(e){}
  }
  PRUEBAS.falso(!!guardada, 'una cédula que no valida no se guarda en el perfil');
  PRUEBAS.igual(veces, 1,
    'y no se pregunta de nuevo en la misma sesión: un cartel que reaparece se aprende a cerrar sin leer');
});

PRUEBAS.caso('los textos de la pregunta existen en los dos idiomas (R14, R1)', () => {
  ['ced_pedir','ced_pedir_mal'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
  });
  PRUEBAS.falso(/\b(escribí|escribilo|tenés|podés|querés)\b/i.test(t('ced_pedir') + ' ' + t('ced_pedir_mal')),
    'español neutro, sin voseo (R1)');
});

PRUEBAS.grupo('A3 · el trinquete de contraste');

PRUEBAS.caso('⚠️ la deuda de contraste del panel no puede CRECER', () => {
  /* NO ARREGLA LA DEUDA: impide que aumente. La auditoría del panel (204 corridas, 17 pantallas,
     6 anchos × 2 temas) viene dando 77 hallazgos únicos de contraste desde el cierre de la tanda 2,
     todos anteriores a esa tanda y casi todos el mismo: el naranja de marca como color de texto,
     que da 2,75:1 sobre fondo claro. Tiene su propio prompt planificado, porque decidir qué naranja
     es identidad y cuál es texto es una decisión de diseño, no un reemplazo mecánico.

     Lo que este caso sí hace es poner un tope. Sin él, cada tanda puede sumar unos pocos y el
     número crece sin que nadie lo note hasta la próxima auditoría manual — que es cómo se llegó a
     los ~400 colores a mano que hubo que ordenar el 2026-08-06.

     ⚠️ Cuenta REGLAS CSS, no hallazgos renderizados: correr el auditor entero acá tardaría más que
     la suite completa. Es una aproximación deliberada, y por eso el tope va con margen. Si alguien
     agrega naranja como color de texto, esto sube. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
  /* ⚠️ La clase de negativo hay que EXCLUIRLA: `border-color`, `accent-color` y `background-color`
     contienen la palabra "color" y una regex ingenua los cuenta a todos. Con la regex mal escrita
     daban 25; los que de verdad pintan texto son 6. Un tope inflado no frena nada. */
  const textoNaranja = (css.match(/(^|[^-a-z])color:\s*var\(--orange\)/g) || []).length;
  PRUEBAS.comoMucho(textoNaranja, 6,
    '⚠️ `--orange` como COLOR DE TEXTO da 2,75:1 y el mínimo es 4,5. Para texto está ' +
    '`--orange-legible` (5,01) y para fondo de botón `--orange-solido`. Si este número subió, se ' +
    'agregó texto ilegible: hay ' + textoNaranja + ' reglas y el tope es 6');
  /* Y el piso: si alguien lo baja a 0 arreglando la deuda, este caso tiene que actualizarse a mano.
     Un tope que quedó muy por encima del número real deja pasar regresiones en silencio. */
  PRUEBAS.alMenos(textoNaranja, 1,
    'si ya no queda ninguna, bajá el tope a 0 en este caso: un tope holgado no frena nada');

  /* Y el control: los dos tokens legibles tienen que seguir existiendo y siendo distintos del de
     marca. Si alguien "simplificara" haciéndolos iguales a `--orange`, el tope de arriba seguiría
     verde y no querría decir nada. */
  const probe = document.createElement('div'); document.body.appendChild(probe);
  const leer = tk => { probe.style.background = 'var(' + tk + ')'; return getComputedStyle(probe).backgroundColor; };
  const marca = leer('--orange'), legible = leer('--orange-legible'), solido = leer('--orange-solido');
  probe.remove();
  PRUEBAS.falso(legible === marca, '`--orange-legible` no puede ser igual al naranja de marca');
  PRUEBAS.falso(solido === marca, 'ni `--orange-solido`');
});
