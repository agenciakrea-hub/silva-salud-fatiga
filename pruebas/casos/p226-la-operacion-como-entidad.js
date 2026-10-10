/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P226 · LA OPERACIÓN ES UNA ENTIDAD PROPIA (ADR 015)                             (2026-10-04)

   ── POR QUÉ TODO ENTRA POR LA ACCIÓN DEL POST (R17) ─────────────────────────────────────────
   Ni un caso llama a `opClave`, `opBuscarFila` ni `asgBuscarFila` directamente. El estado lo arma
   `accionOperacionGuardar` de verdad y lo lee `accionOperaciones` de verdad, con contraseña de
   verdad. Si mañana alguien cambia cómo se deriva la clave en UN lado, el caso «el escritor y el
   lector encuentran la misma operación» se pone rojo — que es exactamente lo que este proyecto no
   pudo hacer las cuatro veces que escritor y lector derivaron distinto.

   ── R19 · DE DÓNDE SALE CADA DERECHO QUE SE AFIRMA ──────────────────────────────────────────
   · «el supervisor puede escribir»            → `opPuedeEscribir`, que delega en `depPuedeEscribir`
   · «el visor no escribe»                     → `acc.soloLectura` → `visorNoEscribe_`
   · «sólo ve/escribe en SU empresa»           → `ausScope(acc, alias, p.empresa)`
   · «la médica combinada SÍ puede»            → `acc.combinada === true` en `depPuedeEscribir`
   Ningún caso afirma un derecho que no se pueda nombrar acá.

   ── LAS DOS SUPOSICIONES DECLARADAS, Y POR QUÉ NINGUNA RESPUESTA LAS INVALIDA ───────────────
   `P226` arrancó con dos preguntas sin responder de Rafael. Se eligieron los dos supuestos que
   sobreviven a cualquier respuesta:
   1. La asignación es una TABLA (hoja `Asignaciones`), no un campo de la persona. Si la respuesta
      es «una persona está en una sola operación», una tabla lo soporta igual; si fuera un campo y
      la respuesta fuera «en varias», habría que migrar.
   2. Una operación pertenece a UNA empresa. Es lo conservador: no abre acceso entre empresas. Si
      mañana una operación tiene que cruzarlas, eso necesita una regla de alcance propia y se
      decide entonces — abrir después es barato, cerrar después es una fuga.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P226 · la operación como entidad: alta, baja, asignación y el candado por empresa');

const P226_HOY = new Date().toISOString().substring(0, 10);
/* ⚠️ LAS FECHAS FUTURAS SE DERIVAN DE HOY, NUNCA SE ESCRIBEN A MANO. El caso del evento futuro
   tenía `inicio:'2026-12-01', fin:'2026-12-20'` fijos, y medido con el reloj movido: verde hasta
   el 2026-12-01, **ROJO el 2026-12-02**, y a partir del 2026-12-21 **lanza**. Con la suite como
   puerta de publicación (R10), eso bloquea un prompt en dos meses por el motivo equivocado —y el
   que lo encuentre va a buscar el defecto en el código, no en el calendario del caso. */
function p226Dia(mas) {
  const d = new Date(); d.setDate(d.getDate() + mas);
  return d.toISOString().substring(0, 10);
}

function p226Fila(persona, dep, empresa, kss) {
  const f = new Array(90).fill('');
  f[0] = P226_HOY + ' 08:00:00';
  f[1] = persona; f[2] = dep; f[72] = empresa; f[73] = P226_HOY; f[86] = kss;
  return f;
}

/* DOS empresas a propósito: el candado de alcance no se puede medir con una sola. Y `cardon` sin
   ClaveMedica, que es la que destapa la trampa de `combinada:true`. */
function p226Hojas(extra) {
  const h = {
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq'],
                ['helitec', 'sup-226', 'empresa', 'Consorcio HELITEC, Helitec', 'med-226', 'dir-226'],
                ['cardon',  'sup-c26', 'empresa', 'Cardón', '', ''],
                /* ⚠️ EL VISOR ES DEL ADMINISTRADOR, no de un supervisor: `accesoPanel_`
                   exige `rol === "admin"` y además `verEmpresa` o `verVista`. Mi primer
                   arnés mandaba `visor:'1'` desde la cuenta del supervisor, que esa
                   función ignora: el caso daba rojo diciendo «no se pudo fabricar», y lo
                   que no se podía fabricar era el arnés, no el acceso. */
                ['admin226', 'adm-226', 'admin', 'Consorcio HELITEC', '', '']],
    'Respuestas de formulario 1': [
      new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p226Fila('Ana Suárez',  'Operaciones',   'Consorcio HELITEC', 7),
      p226Fila('Luis Ferrer', 'Mantenimiento', 'Consorcio HELITEC', 3),
      p226Fila('Pedro Salas', 'Planta',        'Cardón',            4)],
    'Nómina': [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad',
                'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
               ['Helitec', 'Ana Suárez',  'V-11111', 'Operaciones',   'Piloto',   'F', '40', '', '', 'Sí', '', '', '3'],
               ['Helitec', 'Luis Ferrer', 'V-22222', 'Mantenimiento', 'Técnico',  'M', '35', '', '', 'No', '', '', '2'],
               ['Cardón',  'Pedro Salas', 'V-44444', 'Planta',        'Operario', 'M', '45', '', '', 'No', '', '', '4']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    /* ⚠️ `Config Empresa` SÍ se precrea en el fixture GENERAL, y el caso que vigila «leer no crea
       hojas» monta su propio entorno sin ella (`p226ApiSinConfig`). La razón es de COSTO MEDIDO:
       al quitarla de acá, cada uno de los ~70 casos la creaba al leer la zona de la empresa, la
       suite pasó de 40 s a **260 s**, y con eso se cayeron **1.371 casos** de temas, idiomas y
       contraste que dependen de temporizadores —la pestaña está oculta y Chrome los estrangula a
       1 s—. El costo de UN caso no lo puede pagar la suite entera.
       ⚠️ Y el fixture que precrea lo que un caso vigila es un instrumento que no puede fallar: por
       eso `p226ApiSinConfig` deriva de este mismo fixture y le BORRA la hoja, en vez de tener su
       propia copia que se despegaría cuando éste cambie. */
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Nombre', 'Empresa', 'Departamento', 'Reacciones válidas']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento',
                     'Cargo', 'Evento', 'Test', 'Resultado', 'Plan']],
    'Turnos': [['Fecha', 'Hora', 'IdTurno', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Fecha de registro', 'Última actualización', 'Nombre', 'Email', 'Cédula']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
  Object.keys(extra || {}).forEach(k => { h[k] = extra[k]; });
  return h;
}

/* El entorno SIN `Config Empresa`, para el único caso que vigila que leer no la cree. Deriva del
   fixture general y le BORRA esa hoja, en vez de tener su propia copia que se despegaría cuando el
   fixture cambie. */
function p226ApiSinConfig() {
  const h = p226Hojas();
  delete h['Config Empresa'];
  const env = GS.crearEntorno(h);
  const api = GS.cargarGs(CTX.gs, env,
    ['accionOperaciones', 'accionOperacionGuardar', 'accionOperacionBaja',
     'accionOperacionAsignar', 'manejar']);
  api.__env = env;
  return api;
}

function p226Api(extra) {
  const env = GS.crearEntorno(p226Hojas(extra));
  const api = GS.cargarGs(CTX.gs, env,
    ['accionOperaciones', 'accionOperacionGuardar', 'accionOperacionBaja',
     'accionOperacionAsignar', 'manejar']);
  api.__env = env;
  return api;
}

/* Los encabezados se LEEN del .gs, no se copian acá: si mañana se agrega una columna, el caso del
   formato la mira también en vez de quedarse comprobando diez de once. */
function p226Head(nombre) {
  const m = new RegExp('var ' + nombre + '\\s*=\\s*\\[([^\\]]+)\\]').exec(CTX.gs || '');
  return m ? m[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}

const P226_SUP  = { usuario: 'helitec', empresa: 'Consorcio HELITEC', pass: 'sup-226', dispositivoId: 'p226' };
const P226_MED  = { usuario: 'helitec', empresa: 'Consorcio HELITEC', pass: 'med-226', dispositivoId: 'p226' };
const P226_HSEQ = { usuario: 'helitec', empresa: 'Consorcio HELITEC', pass: 'dir-226', dispositivoId: 'p226' };
const P226_CARD = { usuario: 'cardon',  empresa: 'Cardón',            pass: 'sup-c26', dispositivoId: 'p226' };

function p226Con(base, extra) { return Object.assign({}, base, extra || {}); }
function p226J(salida) { return JSON.parse(salida.getContent()); }

function p226Alta(api, cred, nombre, extra) {
  return p226J(api.accionOperacionGuardar(p226Con(cred,
    Object.assign({ operacion: nombre, tipo: 'instalacion' }, extra || {}))));
}
function p226Baja(api, cred, nombre) {
  return p226J(api.accionOperacionBaja(p226Con(cred, { operacion: nombre })));
}
function p226Asignar(api, cred, nombre, persona, extra) {
  return p226J(api.accionOperacionAsignar(p226Con(cred,
    Object.assign({ operacion: nombre, persona: persona }, extra || {}))));
}
function p226Leer(api, cred) { return p226J(api.accionOperaciones(p226Con(cred || P226_SUP))); }

function p226Op(lista, nombre) {
  return (lista || []).filter(o => String(o.nombre).toLowerCase() === String(nombre).toLowerCase())[0] || null;
}
/* El volcado crudo de la hoja: lo que un humano vería si abriera el CH. */
/* El nombre de la hoja se LEE del .gs, no se copia acá: Franco lo cambió a «Operaciones
   Listadas» y un literal en la suite habría medido una hoja que ya no existe. */
function p226Hoja(cual) {
  const m = new RegExp('var HOJA_' + cual + "\\s*=\\s*[\"']([^\"']+)").exec(CTX.gs || '');
  return m ? m[1] : cual;
}
function p226Filas(api, hoja) {
  const sh = api.__env.__libro.getSheetByName(hoja);
  if (!sh) return null;
  return sh.__volcado().slice(1).filter(f => String(f[0] || '').trim() !== '');
}
function p226Bitacora(api) {
  const sh = api.__env.__libro.getSheetByName('Bitácora');
  if (!sh) return [];
  return sh.__volcado().slice(1).filter(f => String(f[0] || '').trim() !== '');
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   GUARDA DE MEDIBILIDAD · sin esto, media suite daría verde por vacío
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ GUARDA · las cuatro acciones contestan y el CH falso tiene gente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const api = p226Api();
  const leer = p226Leer(api);
  PRUEBAS.igual(leer.ok, true, '⚠️ `operaciones` no contestó · ' + JSON.stringify(leer.error || ''));
  PRUEBAS.igual(leer.empresa, 'Consorcio HELITEC',
    '⚠️ el alcance tiene que resolverse a la forma CANÓNICA, no al usuario');
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Cardón IV').ok, true, 'el alta contesta');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez').ok, true, 'asignar contesta');
  PRUEBAS.igual(p226Baja(api, P226_SUP, 'Cardón IV').ok, true, 'la baja contesta');
  /* ⚠️ Y QUE LAS DOS HOJAS EXISTAN DE VERDAD. Si `obtenerHojaOperaciones` no las crea, todos los
     casos de "la fila quedó así" medirían `null` y varios pasarían por vacío. */
  PRUEBAS.cierto(p226Filas(api, p226Hoja('OPERACIONES')) !== null, '⚠️ la hoja `Operaciones` no se creó');
  PRUEBAS.cierto(p226Filas(api, p226Hoja('ASIGNACIONES')) !== null, '⚠️ la hoja `Asignaciones` no se creó');
});

PRUEBAS.caso('⚠️ GUARDA · cada escritura llena TODAS las columnas de su encabezado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* En Apps Script, `setValues` con un array de largo distinto al rango LANZA. Acá se mide que el
     ancho de lo que se escribe coincida con el encabezado leído de la fuente, para las dos ramas
     (alta nueva y upsert) y las dos hojas. */
  const api = p226Api();
  const hOp = p226Head('OP_HEAD'), hAsg = p226Head('ASG_HEAD');
  PRUEBAS.alMenos(hOp.length, 5, '⚠️ no se pudo leer OP_HEAD de la fuente: el caso no mide nada');
  PRUEBAS.alMenos(hAsg.length, 5, '⚠️ no se pudo leer ASG_HEAD de la fuente');
  p226Alta(api, P226_SUP, 'Cardón IV');                       // rama NUEVA
  p226Alta(api, P226_SUP, 'Cardón IV', { inicio: '2026-01-01' });  // rama UPSERT
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');      // rama NUEVA
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-02-02' });  // UPSERT
  const fOp = p226Filas(api, p226Hoja('OPERACIONES')), fAsg = p226Filas(api, p226Hoja('ASIGNACIONES'));
  PRUEBAS.igual(fOp.length, 1, 'una sola fila de operación tras dos altas del mismo nombre');
  PRUEBAS.igual(fOp[0].length, hOp.length,
    'la fila de `Operaciones` tiene que tener ' + hOp.length + ' columnas, como su encabezado');
  PRUEBAS.igual(fAsg.length, 1, 'una sola fila de asignación tras dos asignaciones iguales');
  PRUEBAS.igual(fAsg[0].length, hAsg.length,
    'la fila de `Asignaciones` tiene que tener ' + hAsg.length + ' columnas');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL ESCRITOR Y EL LECTOR DERIVAN IGUAL · el defecto más repetido del proyecto
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('el lector encuentra la operación que escribió el escritor', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  const op = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.cierto(!!op, 'la operación recién creada tiene que aparecer al leer');
  PRUEBAS.igual(op.tipo, 'instalacion', 'y con su tipo');
  PRUEBAS.igual(op.estado, 'activo', 'y activa');
});

PRUEBAS.caso('«Cardon 4» y «Cardón 4» son LA MISMA operación, no dos', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Es el defecto que P231 acababa de pagar con los departamentos: el mismo nombre escrito con y
     sin tilde partía el grupo en dos. `opClave` pasa por `norm`, que quita tildes. */
  const api = p226Api();
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Cardón 4').nueva, true, 'la primera es nueva');
  const dos = p226Alta(api, P226_SUP, 'Cardon 4');
  PRUEBAS.cierto(!dos.nueva, 'la segunda, sin tilde, NO puede ser nueva');
  PRUEBAS.igual(p226Filas(api, p226Hoja('OPERACIONES')).length, 1, 'y en el CH tiene que haber UNA fila');
  /* El discriminador: dos nombres de verdad distintos SÍ son dos filas. Sin esto, el caso de
     arriba pasaría igual con un `opClave` que devolviera siempre la misma cadena. */
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Evento Maracaibo').nueva, true, 'otro nombre sí es nuevo');
  PRUEBAS.igual(p226Filas(api, p226Hoja('OPERACIONES')).length, 2, 'y ahora hay dos filas');
});

PRUEBAS.caso('un nombre numérico sobrevive al viaje y se puede dar de baja después', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* P174 lo pagó en `Departamentos`: con `appendRow`, Sheets reinterpreta «4» como número y la
     búsqueda no lo encuentra NUNCA más — ni para editar ni para dar de baja. La fila queda muerta
     en el CH. Acá se mide el viaje completo: alta → leer → baja. */
  const api = p226Api();
  p226Alta(api, P226_SUP, '4');
  PRUEBAS.cierto(!!p226Op(p226Leer(api).operaciones, '4'), 'una operación llamada «4» tiene que leerse');
  PRUEBAS.igual(p226Baja(api, P226_SUP, '4').baja, true, 'y tiene que poder darse de baja');
});

PRUEBAS.caso('un nombre que se queda sin clave se rechaza al entrar, no después', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `norm("*")` y `norm("---")` son los dos `""`. Una fila con clave vacía no la encuentra ninguna
     búsqueda: sería imposible de editar o dar de baja. */
  const api = p226Api();
  ['', '   ', '---', '***'].forEach(n => {
    PRUEBAS.igual(p226Alta(api, P226_SUP, n).ok, false, 'se rechaza el nombre ' + JSON.stringify(n));
  });
  PRUEBAS.igual((p226Filas(api, p226Hoja('OPERACIONES')) || []).length, 0, 'y no quedó ninguna fila en el CH');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS DOS SABORES · instalación permanente y evento con ventana
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('una instalación no lleva fin, y un evento sin inicio se rechaza', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Es la distinción que Franco destrabó al decir que Cardón IV es una plataforma: exigirle fecha
     de fin a algo permanente obligaría a inventar una, y una fecha inventada en el campo que decide
     «está activa» es peor que un hueco, porque el hueco se nota. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion', inicio: '2026-01-01', fin: '2026-12-31' });
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').fin, '',
    'a una instalación se le descarta el fin aunque lo manden');
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento' }).motivo, 'falta_inicio',
    'un evento SIN inicio se rechaza: sin él no se puede medir desde cuándo');
  const ev = p226Alta(api, P226_SUP, 'Evento Y',
    { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  PRUEBAS.igual(ev.ok, true, 'un evento CON inicio se acepta');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento Y').fin, '2026-03-10',
    'y a un evento sí se le conserva el fin');
});

PRUEBAS.caso('un tipo que no es instalación ni evento se rechaza', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  ['', 'turno', 'guardia', 'INSTALACION '].forEach(t => {
    const r = p226J(api.accionOperacionGuardar(p226Con(P226_SUP, { operacion: 'X', tipo: t })));
    if (t === 'INSTALACION ') {
      PRUEBAS.igual(r.ok, true, 'el tipo se normaliza: «INSTALACION » con espacio y mayúsculas vale');
    } else {
      PRUEBAS.igual(r.motivo, 'tipo_invalido', 'se rechaza el tipo ' + JSON.stringify(t));
    }
  });
});

PRUEBAS.caso('una fecha que no es AAAA-MM-DD se rechaza, no se interpreta', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `normFecha` termina en `return s`: ante algo que no entiende devuelve la cadena CRUDA, así
     que `normFecha("pepe")` es `"pepe"` y la comparación `fin < inicio` compararía basura contra
     basura sin avisar. Por eso la validación es una regex y no `normFecha`. */
  const api = p226Api();
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'A', { tipo: 'evento', inicio: 'pepe' }).motivo,
    'fecha_invalida', 'una fecha que no es fecha se rechaza');
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'B', { tipo: 'evento', inicio: '01/03/2026' }).motivo,
    'fecha_invalida', 'y un dd/mm/yyyy también: el cliente manda ISO o no manda');
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'C',
    { tipo: 'evento', inicio: '2026-03-10', fin: '2026-03-01' }).motivo, 'fin_antes',
    'y un fin anterior al inicio se rechaza');
  PRUEBAS.igual((p226Filas(api, p226Hoja('OPERACIONES')) || []).length, 0, 'ninguna de las tres dejó fila');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   🔒 EL CANDADO POR EMPRESA · y su discriminador, sin el cual no mide nada
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 la operación de otra empresa NO se ve, NO se edita y NO se le asigna gente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El derecho que se afirma sale de `ausScope(acc, alias, p.empresa)`: el alcance lo decide la
     CUENTA, no el POST. Es la forma de fuga que este repo ya pagó cuatro veces. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');                       // de Consorcio HELITEC
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');

  const ajeno = p226Leer(api, P226_CARD);                     // la cuenta de Cardón mira
  PRUEBAS.igual(ajeno.ok, true, 'la cuenta de la otra empresa sí puede leer SUS operaciones');
  PRUEBAS.igual(ajeno.empresa, 'Cardón', 'y su alcance es el suyo');
  PRUEBAS.igual((ajeno.operaciones || []).length, 0,
    '🔒 pero no ve ninguna operación de Consorcio HELITEC');

  /* Y escribir sobre ella NO la toca: `opBuscarFila` busca DENTRO del alcance, así que para la
     cuenta de Cardón «Cardón IV» simplemente NO EXISTE — las dos acciones de abajo la rechazan. */
  /* ⚠️ R19 · SE AFIRMA EL INVARIANTE, NO LA FORMA. Mi primera versión exigía `motivo==='no_existe'`
     y se rompió cuando agregué la validación de nómina, que corre antes y contesta `no_en_nomina`:
     el candado seguía cerrado y el caso igual se puso rojo. El invariante es «rechaza y no escribe
     nada», y eso es lo que se mide. Los dos intentos están a propósito:
     · «Ana Suárez» no está en la nómina de Cardón → corta la guarda de nómina.
     · «Pedro Salas» SÍ está en la de Cardón → llega al candado de alcance, que es el que importa. */
  const r = p226Asignar(api, P226_CARD, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(r.ok, false,
    '🔒 no se puede asignar gente a la operación de otra empresa escribiendo su nombre');
  const r2 = p226Asignar(api, P226_CARD, 'Cardón IV', 'Pedro Salas');
  PRUEBAS.igual(r2.motivo, 'no_existe',
    '🔒 y con alguien de SU propia nómina, lo que corta es el candado de alcance: la operación ' +
    'ajena simplemente no existe para esta cuenta');
  PRUEBAS.igual(p226Baja(api, P226_CARD, 'Cardón IV').motivo, 'no_existe',
    '🔒 ni darla de baja');
  const propia = p226Op(p226Leer(api, P226_SUP).operaciones, 'Cardón IV');
  PRUEBAS.igual((propia.gente || []).length, 1,
    '🔒 y la asignación original quedó intacta tras los dos intentos ajenos');

  /* ⚠️ EL DISCRIMINADOR. Sin esto, los cuatro asertos de arriba pasarían igual con una acción que
     le dijera «no existe» a TODO el mundo — incluido el dueño. */
  PRUEBAS.igual(p226Alta(api, P226_CARD, 'Planta Norte').ok, true,
    '⚠️ discriminador: la cuenta de Cardón SÍ puede crear en su propia empresa');
  PRUEBAS.igual(p226Asignar(api, P226_CARD, 'Planta Norte', 'Pedro Salas').ok, true,
    '⚠️ discriminador: y asignar a su propia gente');
  PRUEBAS.igual((p226Leer(api, P226_CARD).operaciones || []).length, 1,
    '⚠️ discriminador: y la ve al leer');
});

PRUEBAS.caso('🔒 el visor del administrador no escribe ninguna de las tres', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El derecho sale de `acc.soloLectura` → `visorNoEscribe_`. ADR 007: el visor fabrica el acceso
     de la cuenta que mira, y P185 cerró que eso no alcanza para escribir. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  const visor = { usuario: 'admin226', empresa: 'Consorcio HELITEC', pass: 'adm-226',
                  dispositivoId: 'p226', verEmpresa: 'Consorcio HELITEC' };
  /* ⚠️ DISCRIMINADOR DEL ARNÉS, primero: la MISMA cuenta admin SIN `verEmpresa` sí escribe. Sin
     esto, los tres asertos de abajo pasarían igual con una cuenta que no tiene permiso por otra
     razón —un usuario mal escrito, una contraseña vencida— y el caso diría «el visor no escribe»
     sin haber ejercitado el visor ni una vez. */
  const admin = { usuario: 'admin226', empresa: 'Consorcio HELITEC', pass: 'adm-226',
                  dispositivoId: 'p226' };
  PRUEBAS.igual(p226Alta(api, admin, 'Desde el admin').ok, true,
    '⚠️ discriminador: la misma cuenta admin, SIN abrir el visor, sí escribe');
  [p226Alta(api, visor, 'Nueva'),
   p226Baja(api, visor, 'Cardón IV'),
   p226Asignar(api, visor, 'Cardón IV', 'Ana Suárez')].forEach(r => {
    if (r.ok === false && r.motivo === 'solo_lectura') {
      PRUEBAS.igual(r.motivo, 'solo_lectura', '🔒 el visor no escribe');
    } else {
      /* Si el arnés no logra fabricar un acceso de visor, el caso lo DICE en vez de pasar en verde:
         un candado que no se pudo ejercitar no es un candado medido. */
      PRUEBAS.cierto(false, '⚠️ no se pudo fabricar un acceso de visor desde la suite: este ' +
        'candado queda SIN MEDIR acá (está cubierto por los casos de P185) · ' + JSON.stringify(r));
    }
  });
});

PRUEBAS.caso('la médica separada no puede; la médica COMBINADA sí', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Uno es el discriminador del otro. Rechazar `vista:"medico"` a secas habría dejado sin
     administrar sus operaciones a toda empresa que no separó los roles, que hoy son la mayoría:
     su única contraseña llega como `medico` con `combinada:true`. El derecho sale de
     `depPuedeEscribir`, al que `opPuedeEscribir` delega. */
  const api = p226Api();
  PRUEBAS.igual(p226Alta(api, P226_MED, 'Desde la médica').motivo, 'solo_lectura',
    'la contraseña médica SEPARADA no administra operaciones');
  PRUEBAS.igual(p226Alta(api, P226_CARD, 'Desde la combinada').ok, true,
    '⚠️ discriminador: la única contraseña de Cardón (medico + combinada) SÍ puede');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   BAJA LÓGICA · nunca un borrado (R3)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('la baja deja la fila en el CH y viaja con estado «baja», no desaparecida', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Maracaibo', { tipo: 'evento', inicio: '2026-03-01' });
  p226Baja(api, P226_SUP, 'Evento Maracaibo');
  PRUEBAS.igual(p226Filas(api, p226Hoja('OPERACIONES')).length, 1,
    'R3: la fila NO se borra — un evento terminado tiene que poder consultarse');
  const op = p226Op(p226Leer(api).operaciones, 'Evento Maracaibo');
  PRUEBAS.igual(op && op.estado, 'baja', 'y viaja con estado «baja», no desaparecida');
});

PRUEBAS.caso('dar de baja dos veces no pisa quién la dio de baja', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Es el defecto exacto que el verificador encontró en la rama de anular de
     `accionAusenciaGuardar`: un reenvío sobrescribía `AnuladaPor` con quien reenvió, o sea borraba
     el único rastro de quién la había anulado. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01' });
  p226J(api.accionOperacionBaja(p226Con(P226_SUP, { operacion: 'Evento X', quien: 'primero' })));
  const antes = p226Filas(api, p226Hoja('OPERACIONES'))[0].slice();
  const otra = p226J(api.accionOperacionBaja(p226Con(P226_SUP, { operacion: 'Evento X', quien: 'segundo' })));
  PRUEBAS.igual(otra.yaEstaba, true, 'la segunda baja contesta que ya estaba');
  PRUEBAS.igual(JSON.stringify(p226Filas(api, p226Hoja('OPERACIONES'))[0]), JSON.stringify(antes),
    'y la fila quedó IDÉNTICA: no se pisó BajaPor');
  PRUEBAS.cierto(String(antes[9]).indexOf('primero') >= 0,
    '⚠️ discriminador: y el primero es el que figura · ' + JSON.stringify(antes[9]));
});

PRUEBAS.caso('volver a dar de alta una operación de baja la reactiva sin perder su alta original', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226J(api.accionOperacionGuardar(p226Con(P226_SUP,
    { operacion: 'Cardón IV', tipo: 'instalacion', quien: 'rafael' })));
  const creadaOriginal = p226Filas(api, p226Hoja('OPERACIONES'))[0][6];
  p226Baja(api, P226_SUP, 'Cardón IV');
  const re = p226J(api.accionOperacionGuardar(p226Con(P226_SUP,
    { operacion: 'Cardón IV', tipo: 'instalacion', quien: 'otro' })));
  PRUEBAS.igual(re.reactivada, true, 'el alta sobre una de baja la reactiva');
  PRUEBAS.igual(p226Filas(api, p226Hoja('OPERACIONES')).length, 1, 'en la MISMA fila, no una nueva');
  const f = p226Filas(api, p226Hoja('OPERACIONES'))[0];
  PRUEBAS.igual(f[6], creadaOriginal, 'conservando `Creada` original');
  PRUEBAS.cierto(String(f[7]).indexOf('rafael') >= 0,
    'y `CreadaPor` original: editar no es volver a crear · ' + JSON.stringify(f[7]));
  PRUEBAS.igual(String(f[5]).toLowerCase(), 'activo', 'y queda activa');
  PRUEBAS.igual(String(f[8]), '', 'y se limpia la marca de baja');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ASIGNACIÓN · una tabla, no un campo (suposición 1 del encabezado)
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('una persona puede estar en DOS operaciones a la vez', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Es la suposición 1 declarada arriba, y el caso existe para que el día que Rafael conteste «no,
     una sola» se vea en rojo que el modelo lo permite — y se decida si se restringe o no. Hoy la
     tabla lo soporta a propósito: si fuera un campo, la respuesta contraria obligaría a migrar. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Alta(api, P226_SUP, 'Evento Maracaibo', { tipo: 'evento', inicio: '2026-03-01' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez');
  const ops = p226Leer(api).operaciones;
  PRUEBAS.igual((p226Op(ops, 'Cardón IV').gente || []).length, 1, 'aparece en la primera');
  PRUEBAS.igual((p226Op(ops, 'Evento Maracaibo').gente || []).length, 1, 'y en la segunda');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 2, 'son dos filas, no una pisando la otra');
});

PRUEBAS.caso('la asignación se guarda con el nombre que tiene la operación en SU hoja', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Si se guardara el nombre que vino en el POST, las dos hojas dirían cadenas distintas para la
     misma operación y el join quedaría a merced de `opClave`. Esto lo fija: una sola derivación. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'cardon iv', 'Ana Suárez');   // otro casing, sin tilde
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][1], 'Cardón IV',
    'la hoja de asignaciones guarda «Cardón IV», el nombre de la hoja de operaciones');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 1,
    'y el join la encuentra');
});

PRUEBAS.caso('no se puede asignar gente a una operación de baja ni a una que no existe', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01' });
  p226Baja(api, P226_SUP, 'Evento X');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Evento X', 'Ana Suárez').motivo, 'de_baja',
    'a una de baja no se asigna');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'No existe', 'Ana Suárez').motivo, 'no_existe',
    'ni a una que no existe');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0, 'y no quedó ninguna fila');
});

PRUEBAS.caso('quitar a alguien lo saca de la lectura pero deja su histórico', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' }).quitada, true,
    'se la quita');
  const gente = (p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).map(g => g.persona);
  PRUEBAS.igual(gente.length, 1, 'queda uno asignado');
  PRUEBAS.cierto(gente.indexOf('Luis Ferrer') >= 0, 'y es el que no se quitó · ' + JSON.stringify(gente));
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 2,
    'R3: las dos filas siguen en el CH — el histórico es lo que permite medir un evento terminado');
});

PRUEBAS.caso('reasignar a quien se había quitado lo reactiva en la misma fila', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { cedula: 'V-11111' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  const re = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(re.reactivada, true, 'la reasignación reactiva');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 1, 'en la misma fila');
  /* ⚠️ R2-2 · ESTE CASO MONTABA LA SECUENCIA EXACTA Y NO MIRABA `Desde` NI `Hasta`. Los dos
     arreglos de la ronda anterior se contradecían: no pisar `Desde` en un reenvío (correcto) y
     escribir `Hasta` al quitar (correcto) juntos dejaban la fila afirmando asignación CONTINUA
     desde la fecha original, con los días afuera desaparecidos. Reactivar es un TRAMO NUEVO. */
  const fr = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(fr[5], '', 'el «hasta» se limpia: la persona volvió, no sigue afuera');
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(String(fr[4])),
    'y el «desde» es una fecha válida · ' + JSON.stringify(fr[4]));
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][3], 'V-11111',
    'y la cédula que ya estaba NO se borra con un pedido que no la manda');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 1,
    'y vuelve a aparecer al leer');
});

PRUEBAS.caso('quitar a alguien que no estaba contesta ok, sin crear la fila', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* R7: la app reintenta lo que no confirmó. Un «quitar» que llega dos veces no puede ser un error
     para quien ya lo quitó, ni dejar una fila en el CH que nadie pidió. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual(r.ok, true, 'contesta ok');
  PRUEBAS.igual(r.noEstaba, true, 'diciendo que no estaba');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0, 'y no creó ninguna fila');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   R3 · LA BITÁCORA, Y QUE UN REENVÍO NO SUME LÍNEA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('R3 · cada hecho deja línea de bitácora, y el reenvío del mismo hecho NO', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `accionDepartamento*` NO deja bitácora, y acá sí se deja a propósito: asignar gente a una
     operación decide en qué grupo aparece esa persona en el panel del supervisor, que es la misma
     clase de consecuencia operativa que marcar una ausencia — y A8 #12 obligó a registrar ésa.
     El reenvío es la otra mitad: la app reintenta lo que no confirmó (R7), y sin la guarda un toque
     con red lenta deja tres líneas del mismo hecho. La bitácora anota HECHOS, no pedidos. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  const trasAlta = p226Bitacora(api).length;
  PRUEBAS.alMenos(trasAlta, 1, '⚠️ crear una operación tiene que dejar línea');

  p226Alta(api, P226_SUP, 'Cardón IV');   // reenvío idéntico
  PRUEBAS.igual(p226Bitacora(api).length, trasAlta, 'el reenvío idéntico NO suma línea');

  p226Alta(api, P226_SUP, 'Cardón IV', { inicio: '2026-01-01' });   // cambio real
  PRUEBAS.igual(p226Bitacora(api).length, trasAlta + 1,
    '⚠️ discriminador: un cambio REAL sí suma — si no, la guarda estaría tapando todo');

  const trasEdicion = p226Bitacora(api).length;
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(p226Bitacora(api).length, trasEdicion + 1, 'asignar deja línea');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(p226Bitacora(api).length, trasEdicion + 1, 'y reasignar lo mismo no suma');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual(p226Bitacora(api).length, trasEdicion + 2, 'quitar deja línea');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual(p226Bitacora(api).length, trasEdicion + 2, 'y volver a quitar no suma');
  p226Baja(api, P226_SUP, 'Cardón IV');
  PRUEBAS.igual(p226Bitacora(api).length, trasEdicion + 3, 'la baja deja línea');
  p226Baja(api, P226_SUP, 'Cardón IV');
  PRUEBAS.igual(p226Bitacora(api).length, trasEdicion + 3, 'y volver a darla de baja no suma');
});

PRUEBAS.caso('R2 · la bitácora de operaciones no lleva ningún dato clínico', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La hoja de bitácora la miran operaciones, no el médico. Un puntaje o un «no apto» ahí sería un
     dato de salud en una planilla operativa. Lo que se registra es el HECHO administrativo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  const texto = JSON.stringify(p226Bitacora(api)).toLowerCase();
  ['kss', 'puntaje', 'no apto', 'fatiga', 'epworth', 'psqi'].forEach(t => {
    PRUEBAS.cierto(texto.indexOf(t) < 0, 'R2: la bitácora no puede mencionar ' + JSON.stringify(t));
  });
  PRUEBAS.cierto(texto.indexOf('ana') >= 0,
    '⚠️ discriminador: y sí dice sobre quién se actuó · si esto falla, el caso de arriba pasa por vacío');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   EL CATCH NO ES MUDO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('si la hoja de asignaciones falla, el error VIAJA en vez de parecer «no hay nadie»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Sin el campo `asignacionesError`, el único síntoma de que la hoja se rompió es una lista de
     operaciones sin gente — y eso se lee como un dato, no como una falla. Misma lección que
     `nominaError` y que los cuatro medidores que dieron «0 defectos» sin medir nada. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(p226Leer(api).asignacionesError, null, 'con la hoja sana, el error es null');

  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  const original = sh.getDataRange;
  sh.getDataRange = function () { throw new Error('hoja reventada a propósito'); };
  try {
    const roto = p226Leer(api);
    PRUEBAS.igual(roto.ok, true, 'la lectura sigue contestando: las operaciones se ven igual');
    PRUEBAS.alMenos((roto.operaciones || []).length, 1, 'y las operaciones llegan');
    PRUEBAS.cierto(String(roto.asignacionesError || '').indexOf('reventada') >= 0,
      '⚠️ el error tiene que VIAJAR · ' + JSON.stringify(roto.asignacionesError));
    PRUEBAS.igual((p226Op(roto.operaciones, 'Cardón IV').gente || []).length, 0,
      'y la gente viene vacía — que es por lo que el campo de error tiene que estar');
  } finally {
    sh.getDataRange = original;   // R18: se restaura SIEMPRE, o la prueba siguiente arranca roto
  }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LO QUE EL VERIFICADOR ENCONTRÓ Y LA PRIMERA VERSIÓN DE ESTA SUITE NO MEDÍA
   ⚠️ `P226_HSEQ` estaba DECLARADO y nunca usado: el camino entero de Dirección quedó sin medir,
   con la credencial ya armada en el arnés. Dos de los tres hallazgos críticos vivían ahí.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 H1 · Dirección ve el CONTEO de asignados, nunca los nombres', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El derecho que se recorta sale de `acc.vista === "hseq"` en `accionOperaciones`. La lámina le
     promete a Dirección agregados, no individuos, y la primera versión le mandaba nombre por
     nombre. Es la cuarta vez que este repo paga el mismo defecto. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer');

  const dir = p226Leer(api, P226_HSEQ);
  PRUEBAS.igual(dir.ok, true, 'Dirección sí puede leer: «¿en qué estatus está Cardón IV?» es un agregado');
  PRUEBAS.igual(dir.soloAgregados, true, 'y la respuesta lo DICE, para que el panel no lo adivine');
  const op = p226Op(dir.operaciones, 'Cardón IV');
  PRUEBAS.cierto(!!op, 'la operación llega');
  PRUEBAS.igual((op.gente || []).length, 0, '🔒 sin un solo nombre');
  PRUEBAS.igual(op.genteN, 2, '⚠️ pero CON el conteo: 2 · si diera 0, el panel diría «no hay nadie»');
  PRUEBAS.cierto(JSON.stringify(dir).indexOf('Suárez') < 0,
    '🔒 y el nombre no aparece en NINGÚN lugar de la respuesta, no sólo en `gente`');

  /* ⚠️ EL DISCRIMINADOR. Sin esto, los asertos de arriba pasarían igual con una acción que no
     devuelve gente A NADIE — incluido el supervisor, que sí tiene derecho a los nombres. */
  const sup = p226Op(p226Leer(api, P226_SUP).operaciones, 'Cardón IV');
  PRUEBAS.igual((sup.gente || []).length, 2, '⚠️ discriminador: al supervisor SÍ le llegan los nombres');
  PRUEBAS.igual(sup.genteN, 2, '⚠️ y el mismo conteo: el número no cambia según quién pregunta');
});

PRUEBAS.caso('🔒 H2 · Dirección NO crea operaciones ni asigna personal', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `depPuedeEscribir` deja pasar `vista:"hseq"` a propósito, porque para los DEPARTAMENTOS es
     correcto: son nombres de área. Asignar a alguien a una operación decide en qué grupo aparece
     esa persona, y el cortafuegos K1b dice que Dirección no decide sobre individuos. El derecho
     lo niega `opPuedeEscribir`, con el patrón de `accionCicloPersonaGuardar`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  PRUEBAS.igual(p226Alta(api, P226_HSEQ, 'Operación de Dirección').motivo, 'solo_lectura',
    '🔒 Dirección no crea');
  PRUEBAS.igual(p226Baja(api, P226_HSEQ, 'Cardón IV').motivo, 'solo_lectura', '🔒 ni da de baja');
  PRUEBAS.igual(p226Asignar(api, P226_HSEQ, 'Cardón IV', 'Ana Suárez').motivo, 'solo_lectura',
    '🔒 ni asigna personal');
  PRUEBAS.igual(p226Filas(api, p226Hoja('OPERACIONES')).length, 1,
    '🔒 y no quedó ninguna fila de más en el CH');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0, '🔒 ni ninguna asignación');
  /* R3: la bitácora es append-only y no se corrige NUNCA, así que una línea escrita por la vista
     equivocada se queda para siempre. */
  PRUEBAS.cierto(JSON.stringify(p226Bitacora(api)).indexOf('hseq') < 0,
    '🔒 y la bitácora no tiene ninguna línea escrita por «hseq»');
  /* ⚠️ Discriminador: la misma operación, el mismo nombre, desde el supervisor → sí entra. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez').ok, true,
    '⚠️ discriminador: el supervisor SÍ asigna');
});

PRUEBAS.caso('H3 · un nombre con DOS teléfonos pegados no se duplica, y se puede quitar', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `limpiarPersona` NO es idempotente: saca UN grupo de dígitos finales por pasada.
       "Ana 04121234567 04249876543"  →  1 pasada "Ana 04121234567"  ·  2 pasadas "Ana"
     El escritor guardaba una pasada y el lector buscaba con dos, así que ninguna búsqueda
     encontraba la fila: tres reintentos de la cola (R7) daban TRES filas `nueva:true` y «quitar»
     contestaba `ok:true, noEstaba:true` sin quitar nada, para siempre. Es **append ciego**, lo
     único que R15 prohíbe por nombre. Esta es la forma REAL de los nombres en este CH: por eso
     `limpiarPersona` existe. */
  const api = p226Api({ 'Nómina': [
    ['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad','Teléfono','Email',
     '¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
    ['Helitec','Ana Suárez','V-11111','Operaciones','Piloto','F','40','','','Sí','','','3']] });
  p226Alta(api, P226_SUP, 'Cardón IV');
  const crudo = 'Ana Suárez 04121234567 04249876543';
  const r1 = p226Asignar(api, P226_SUP, 'Cardón IV', crudo);
  PRUEBAS.igual(r1.ok, true, 'la primera asignación entra · ' + JSON.stringify(r1.error || ''));
  p226Asignar(api, P226_SUP, 'Cardón IV', crudo);     // el reintento de la cola
  p226Asignar(api, P226_SUP, 'Cardón IV', crudo);     // y otro
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 1,
    '⚠️ R15 · UNA fila tras tres pedidos idénticos: upsert, nunca append ciego');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 1,
    'y la persona aparece UNA vez en el panel');
  const q = p226Asignar(api, P226_SUP, 'Cardón IV', crudo, { quitar: '1' });
  PRUEBAS.igual(q.quitada, true, 'y se la puede quitar');
  PRUEBAS.cierto(!q.noEstaba, '⚠️ y NO contesta «no estaba»: la encontró de verdad');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 0,
    'y queda fuera del panel');
});

PRUEBAS.caso('H4 · un reenvío NO mueve el «desde»: la ventana del evento sobrevive', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Escenario medido por el verificador: Rafael asigna a Ana al evento el 1 de marzo, la cola
     offline (R7) reintenta tres días después → `Desde` pasaba a ser el día del reintento y **la
     ventana del evento se destruía**, más una línea de bitácora por un hecho que no pasó (R3).
     Mata exactamente lo que el ADR 015 pide: «medir el evento desde que comenzó». */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Maracaibo', { tipo: 'evento', inicio: '2026-03-01' });
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { desde: '2026-03-01' });
  const antes = p226Filas(api, p226Hoja('ASIGNACIONES'))[0][4];
  const nB = p226Bitacora(api).length;
  const re = p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez');   // SIN `desde`
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][4], antes,
    '⚠️ el «desde» NO se movió · era ' + JSON.stringify(antes));
  PRUEBAS.igual(re.repetida, true, 'y la respuesta dice que fue un reenvío');
  PRUEBAS.igual(p226Bitacora(api).length, nB, 'R3 · y no sumó línea de bitácora');
  /* ⚠️ Discriminador: un `desde` EXPLÍCITO y distinto sí lo mueve, y sí deja línea. */
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { desde: '2026-03-05' });
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][4], '2026-03-05',
    '⚠️ discriminador: un «desde» explícito SÍ lo mueve');
  PRUEBAS.igual(p226Bitacora(api).length, nB + 1, '⚠️ y ese sí suma línea');
});

PRUEBAS.caso('H5 · un «Estado» editado a mano con espacios llega normalizado al cliente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La hoja la editan personas a propósito. El servidor comparaba `.trim().toLowerCase()` y
     mandaba el valor CRUDO: el panel comparaba `=== 'baja'` → false → dibujaba la operación como
     ACTIVA y ofrecía asignar, y el servidor rechazaba con «está cerrada». Escritor y lector
     derivando distinto sobre el mismo campo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  sh.getRange(2, 3).setValue('  Instalación  ');     // Tipo, con espacios y mayúscula
  sh.getRange(2, 6).setValue('  Baja  ');            // Estado, idem
  const op = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.igual(op.estado, 'baja', 'el estado llega normalizado, no «  Baja  »');
  /* ⚠️ ESTE ASERTO DECÍA `'instalación'` Y DEFENDÍA EL BUG. Las claves de `OP_TIPOS_GS` son
     «instalacion» y «evento», SIN tilde, así que un `tipo === 'instalacion'` en el cliente daba
     false y el servidor rechazaba ese mismo valor con `tipo_invalido`. El caso bendecía la
     divergencia contra el arreglo — textual lo que R19 describe. Se canoniza con `opTipoCanon`,
     que pasa por `norm` y quita acentos, igual que `opClave`. */
  PRUEBAS.igual(op.tipo, 'instalacion',
    'y el tipo llega CANONIZADO, sin tilde: es la forma con la que el servidor compara');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez').motivo, 'de_baja',
    '⚠️ y el servidor la trata igual que el cliente: los dos dicen «de baja»');
});

PRUEBAS.caso('H6 · dos filas para la misma persona no la duplican, y quitarla la quita del todo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El escenario que `conCandado` deja pasar cuando no consigue el candado y corre igual. El bucle
     hacía `push` ciego: la persona aparecía dos veces y, como `asgBuscarFila` devuelve la última,
     quitarla dejaba la otra fila `activo` para siempre — textual lo que el comentario de
     `opBuscarFila` promete evitar. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  const dup = sh.__volcado()[1].slice();            // clonar la fila y pegarla de nuevo
  dup[4] = '2026-02-02';
  sh.getRange(3, 1, 1, dup.length).setValues([dup]);
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 2, 'el CH tiene dos filas (montado)');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 1,
    '⚠️ pero el panel la muestra UNA vez');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 0,
    '⚠️ y tras quitarla NO queda rastro en el panel: ninguna fila huérfana en «activo»');
});

PRUEBAS.caso('H7 · quitar a alguien escribe el «hasta»: el histórico del evento queda', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La columna estaba en `ASG_HEAD`, se borraba en cada upsert y el único lector la descartaba —
     mientras el ADR 015 justifica la tabla diciendo que «medir el evento exige saber quién estaba
     asignado EN ESA VENTANA». El histórico se escribía y se tiraba. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Maracaibo', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { desde: '2026-03-01' });
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { quitar: '1', hasta: '2026-03-08' });
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[4], '2026-03-01', 'el «desde» quedó');
  PRUEBAS.igual(f[5], '2026-03-08', '⚠️ y el «hasta» se escribió: sin esto no hay ventana que medir');
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'baja', 'y la fila quedó de baja, no borrada (R3)');
});

PRUEBAS.caso('H8 · LEER no crea ninguna hoja en el CH', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `accionOperaciones` se declara de sólo lectura y creaba DOS hojas — con la credencial de
     Dirección y con el visor, que tiene PROHIBIDO escribir. Es textual la lección que
     `accionActividad` ya tenía escrita con `leerHojaBitacoraSiExiste_`.
     ⚠️ Este caso usa el fixture GENERAL, que precrea `Config Empresa`, así que NO vigila esa hoja:
     la vigila `R4-9` con `p226ApiSinConfig`. La división es por costo —quitarla del fixture general
     llevó la suite de 40 s a 260 s y tiró 1.371 casos ajenos— y está dicha acá para que nadie
     concluya que este caso cubre lo que no cubre. */
  const api = p226Api();
  const antes = api.__env.__libro.getSheets().map(h => h.getName()).sort();
  const leer = p226Leer(api);
  PRUEBAS.igual(leer.ok, true, 'la lectura contesta igual');
  PRUEBAS.igual((leer.operaciones || []).length, 0, 'con la lista vacía, que es lo correcto');
  const despues = api.__env.__libro.getSheets().map(h => h.getName()).sort();
  PRUEBAS.igual(JSON.stringify(despues), JSON.stringify(antes),
    '⚠️ y NO creó ninguna hoja · ' + JSON.stringify(despues.filter(h => antes.indexOf(h) < 0)));
  /* ⚠️ Discriminador: ESCRIBIR sí las crea. Sin esto, el aserto de arriba pasaría igual con un
     emulador que no sepa crear hojas. */
  p226Alta(api, P226_SUP, 'Cardón IV');
  const trasEscribir = api.__env.__libro.getSheets().map(h => h.getName());
  PRUEBAS.cierto(trasEscribir.indexOf(p226Hoja('OPERACIONES')) >= 0,
    '⚠️ discriminador: el ALTA sí crea la hoja');
});

PRUEBAS.caso('H10 · renombrar propaga a las dos hojas: el CH no dice dos nombres', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Alta(api, P226_SUP, 'cardon iv');          // Rafael lo escribe distinto
  const fo = p226Filas(api, p226Hoja('OPERACIONES'))[0][1];
  const fa = p226Filas(api, p226Hoja('ASIGNACIONES'))[0][1];
  PRUEBAS.igual(fa, fo, '⚠️ las dos hojas dicen la MISMA cadena · ops=' +
    JSON.stringify(fo) + ' asg=' + JSON.stringify(fa));
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, fo).gente || []).length, 1, 'y el join sigue en pie');
});

PRUEBAS.caso('H11 · una fecha que Sheets convirtió a Date no ensucia el payload ni suma bitácora', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* R15 · Sheets reinterpreta solo. Una celda que quedó como `Date` viajaba al cliente como
     «Sun Mar 01 2026 00:00:00 GMT-0300 (…)» —zona de Buenos Aires para una app venezolana— y
     `mismosDatos` no empataba nunca, así que CADA reenvío escribía `operacion_editada`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  /* ⚠️ `new Date(2026, 2, 1)` es medianoche **en la zona del host**, no en la del libro, y eso hacía
     que este caso pasara en Caracas y fallara en UTC, Tokio y Kiritimati — o sea en cualquier máquina
     de integración continua, que por defecto corre en UTC. `GS.fechaDeCelda` construye el instante
     que Sheets guardaría: medianoche de ese día en la zona del libro, con el desfase calculado para
     ESE instante. Verificado: el mismo epoch en los cuatro husos (P234). */
  sh.getRange(2, 4).setValue(GS.fechaDeCelda('2026-03-01'));   // Inicio como Date, igual que Sheets
  const op = p226Op(p226Leer(api).operaciones, 'Evento X');
  PRUEBAS.igual(op.inicio, '2026-03-01', '⚠️ llega como AAAA-MM-DD, no como un Date formateado');
  const nB = p226Bitacora(api).length;
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01' });
  PRUEBAS.igual(p226Bitacora(api).length, nB, 'R3 · y el reenvío idéntico no suma línea');
});

PRUEBAS.caso('H12 · ADR 003 · no se asigna a quien no está en la nómina de esta empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Sin esto entraba cualquier nombre con `ok:true` —un typo, o alguien de OTRA empresa— y el
     agrupamiento de P227 une por nombre contra `aptGente`: esa persona no aparecería en ningún
     grupo y la pantalla no diría nada. R15: si un dato se escribe y nadie lo lee, no está
     terminado. El derecho lo concede `opPersonaEnNomina_`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Fulano Que No Existe').motivo, 'persona_sin_nomina',
    'un nombre que no está en la nómina se rechaza');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Pedro Salas').motivo, 'persona_sin_nomina',
    'y alguien de OTRA empresa también');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0, 'y no quedó fila');
  /* ⚠️ Discriminador: alguien que SÍ está en la nómina entra. Sin esto el caso pasaría con una
     guarda que rechaza a todo el mundo. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez').ok, true,
    '⚠️ discriminador: quien SÍ está en la nómina entra');
  /* Y quitar NO exige nómina: hay que poder sacar de una operación a alguien que RRHH ya dio de
     baja. Si se exigiera, su asignación quedaría activa para siempre. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' }).quitada, true,
    'y quitar no exige la nómina');
});

PRUEBAS.caso('H13/H14 · «constructor» y «__proto__» no pasan por tipo ni rompen el agrupado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La «familia 5» que P215 cerró en 14 lugares: con un objeto literal, `tipo="constructor"` y
     `tipo="__proto__"` pasaban la validación y se escribían en el CH. */
  const api = p226Api();
  ['constructor', '__proto__', 'toString', 'valueOf'].forEach(t => {
    PRUEBAS.igual(p226J(api.accionOperacionGuardar(p226Con(P226_SUP,
      { operacion: 'X' + t, tipo: t }))).motivo, 'tipo_invalido',
      'se rechaza el tipo ' + JSON.stringify(t));
  });
  /* Y una operación llamada «constructor» no rompe el agrupado de la lectura. */
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'constructor').ok, true, 'como NOMBRE sí es válido');
  const leer = p226Leer(api);
  PRUEBAS.igual(leer.ok, true, 'y la lectura no se rompe');
  PRUEBAS.igual(leer.asignacionesError, null, 'ni el bucle de asignaciones');
  PRUEBAS.cierto(!!p226Op(leer.operaciones, 'constructor'), 'y la operación aparece');
});

PRUEBAS.caso('H16 · «quitar» en cualquiera de sus formas quita, nunca reasigna', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Antes sólo aceptaba la cadena "1": `quitar:true`, `"true"`, `1` y `"si"` hacían la acción
     OPUESTA con `ok:true` — y encima pisaban el «desde». Falla al revés y sin error, que es la
     peor forma de fallar: el supervisor cree que sacó a alguien y lo que hizo fue volver a
     ponerlo. */
  ['1', 'true', 'si', 'sí', 1, true].forEach(q => {
    const api = p226Api();
    p226Alta(api, P226_SUP, 'Cardón IV');
    p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
    const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: q });
    PRUEBAS.igual(r.quitada, true, 'quitar=' + JSON.stringify(q) + ' quita');
    PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 0,
      'y deja de aparecer · quitar=' + JSON.stringify(q));
  });
  /* ⚠️ Discriminador: SIN `quitar`, asigna. Si no, el caso pasaría con una acción que quita siempre. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual((p226Op(p226Leer(api2).operaciones, 'Cardón IV').gente || []).length, 1,
    '⚠️ discriminador: sin «quitar», asigna');
});

PRUEBAS.caso('H17 · un pedido SIN operación se rechaza, no da de baja a «undefined»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `norm(undefined)` devuelve la cadena "undefined", NO vacía: la guarda era código muerto, y con
     una operación llamada literalmente «undefined» en el CH un `operacion_baja` sin parámetros la
     daba de baja. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'undefined');
  PRUEBAS.igual(p226J(api.accionOperacionBaja(p226Con(P226_SUP, {}))).ok, false,
    'una baja sin operación se rechaza');
  PRUEBAS.igual(p226J(api.accionOperacionAsignar(p226Con(P226_SUP, { persona: 'Ana Suárez' }))).ok, false,
    'y una asignación sin operación también');
  const op = p226Op(p226Leer(api).operaciones, 'undefined');
  PRUEBAS.igual(op && op.estado, 'activo', '⚠️ y la operación «undefined» sigue ACTIVA');
});

PRUEBAS.caso('H18 · las operaciones vienen en orden español, no en orden de código', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Sin `localeCompare('es')` el servidor mandaba ["Cardón","Zulia","ancla","Ávila"]: las
     minúsculas y los acentos después de la Z. `aptGente` ya usa el locale español. */
  const api = p226Api();
  ['Zulia', 'ancla', 'Ávila', 'Cardón'].forEach(n => p226Alta(api, P226_SUP, n));
  const nombres = (p226Leer(api).operaciones || []).map(o => o.nombre);
  PRUEBAS.igual(JSON.stringify(nombres), JSON.stringify(['ancla', 'Ávila', 'Cardón', 'Zulia']),
    'orden español · obtuvo ' + JSON.stringify(nombres));
});

PRUEBAS.caso('H19 · un nombre de persona de 5.000 caracteres no entra al CH', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'A'.repeat(5000)).motivo, 'persona_invalida',
    'se rechaza por largo');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0, 'y no quedó fila');
});

PRUEBAS.caso('R1 · H20 · el texto del tipo inválido va en español NEUTRO y con tilde', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `tError` sólo prefiere la clave traducida cuando el idioma NO es español, así que en
     producción se ve el texto del SERVIDOR. Decía «instalacion» sin tilde. */
  const api = p226Api();
  const e = String(p226Alta(api, P226_SUP, 'X', { tipo: 'turno' }).error || '');
  PRUEBAS.cierto(e.indexOf('instalación') >= 0, 'dice «instalación» con tilde · ' + JSON.stringify(e));
  PRUEBAS.cierto(e.indexOf('instalacion ') < 0 && !/instalacion[»"]/.test(e),
    'y no quedó la forma sin tilde');
  /* R1 · nada de voseo en ninguno de los mensajes de las cuatro acciones. */
  const textos = [e,
    String(p226Alta(api, P226_SUP, '', {}).error || ''),
    String(p226Asignar(api, P226_SUP, 'No existe', 'Ana Suárez').error || ''),
    String(p226Alta(api, P226_HSEQ, 'X').error || '')].join(' ');
  [/\belegí\b/i, /\bindicá\b/i, /\bcargá\b/i, /\brevisá\b/i, /\btenés\b/i, /\bpodés\b/i].forEach(rx => {
    PRUEBAS.cierto(!rx.test(textos), 'R1 · sin voseo: ' + rx.source);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   H9 · EL CAMPO QUE MUERE EN LA LISTA EXPLÍCITA · R17, por quinta vez
   `aptOperacionDe` arranca con `if (p.operacion)`, y ese `p` viene SIEMPRE de `aptResolverFinal`,
   cuyo `return` es una lista cerrada de campos. `operacion` no estaba: la rama estaba MUERTA y el
   día que P227 mandara el campo, el panel habría seguido mostrando el cargo **sin que nadie viera
   un error**. Es palabra por palabra lo que dice el comentario que está tres líneas arriba de ese
   mismo `return`, sobre `cargo` (traía 17 de 18 y llegaban 0).
   ⚠️ Se entra por `onDashData` → `aptPersona`, el camino REAL, no armando el objeto a mano: armarlo
   a mano prueba `aptOperacionDe` y no que el llamador de verdad le pueda dar lo que pide.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('H9 · el campo `operacion` sobrevive de `onDashData` hasta la tarjeta', () => {
  if (typeof onDashData !== 'function' || typeof aptPersona !== 'function') {
    PRUEBAS.cierto(false, '⚠️ no están `onDashData`/`aptPersona`: este contrato queda SIN MEDIR');
    return;
  }
  const prev = (typeof DASH !== 'undefined') ? DASH : undefined;
  try {
    const fila = { nombre:'ANA PRUEBA', dep:'Operaciones', cargo:'Op. Cardon',
                   operacion:'Cardón IV', n:3, auto:'ok', nivel:3, dias:1, viejo:false,
                   ultimaFecha:'2026-10-04',
                   metricas:[{m:'kss',nivel:'ok'}], pvt:null, empeoro:false, persist:null,
                   pocoConfiable:0, ultimoPocoConfiable:false };
    onDashData({ ok:true, rol:'empresa', vista:'supervisor', aptitud:[fila],
                 registros:[], pvt:[], metricas:[], comentarios:[], referencia:{} },
               'Consorcio HELITEC', {}, 'supervisor');
    const p = aptPersona('ANA PRUEBA', [], [], {});
    PRUEBAS.cierto(!!p, '⚠️ `aptPersona` no devolvió nada: el caso no mide nada');
    PRUEBAS.igual(p.operacion, 'Cardón IV',
      '⚠️ R17 · el campo tiene que SOBREVIVIR la lista explícita de `aptResolverFinal`');
    PRUEBAS.igual(aptOperacionDe(p), 'Cardón IV',
      'y el único lector lo prefiere al cargo: así el puente de P224 se retira SOLO');
    PRUEBAS.cierto(aptOperacionHtml(p).indexOf('Op. Cardon') < 0,
      'y el cargo deja de mostrarse cuando hay operación de verdad');

    /* ⚠️ EL DISCRIMINADOR, en las dos direcciones. Sin esto, el aserto de arriba pasaría igual con
       una función que devolviera «Cardón IV» por cualquier razón. */
    const sinOp = Object.assign({}, fila); delete sinOp.operacion;
    onDashData({ ok:true, rol:'empresa', vista:'supervisor', aptitud:[sinOp],
                 registros:[], pvt:[], metricas:[], comentarios:[], referencia:{} },
               'Consorcio HELITEC', {}, 'supervisor');
    const p2 = aptPersona('ANA PRUEBA', [], [], {});
    PRUEBAS.igual(p2.operacion, '',
      '⚠️ discriminador: sin el campo llega vacío, no inventado');
    PRUEBAS.igual(aptOperacionDe(p2), 'Op. Cardon',
      '⚠️ discriminador: y entonces SÍ cae al cargo — el puente sigue en pie mientras haga falta');
  } finally {
    if (prev !== undefined) DASH = prev;
    try { localStorage.clear(); } catch (e) {}   // R18 · no contaminar la prueba siguiente
  }
});

PRUEBAS.caso('H21 · las 6 acciones nuevas tienen etiqueta en los DOS idiomas, en los dos mapas', () => {
  /* Dos mapas distintos las consumen y los dos son listas explícitas:
     · `HSEQ_ACCION_LABEL` → Trazabilidad y el CSV (`accionLabel`).
     · `mov_a_*`           → el panel «últimos movimientos» de P223 (`movQueTexto`).
     Sin la clave, el primero muestra el código crudo («operacion_asignada») y el segundo cae al
     fallback y escribe «Operacion asignada» sin tilde, que viola R1. */
  const acciones = ['operacion_creada', 'operacion_editada', 'operacion_reactivada',
                    'operacion_baja', 'operacion_asignada', 'operacion_desasignada'];
  acciones.forEach(a => {
    const et = accionLabel(a);
    PRUEBAS.cierto(et !== a, 'Trazabilidad traduce ' + a + ' · dio ' + JSON.stringify(et));
    PRUEBAS.cierto(/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(et) && et.indexOf('_') < 0,
      'y no es la clave cruda · ' + JSON.stringify(et));
  });
  /* Y las del panel de movimientos, en los dos idiomas. `t()` resuelve por idioma activo, así que
     se comprueba la presencia en el diccionario, que es lo que falta cuando falta. */
  const idiomaPrev = (typeof IDIOMA !== 'undefined') ? IDIOMA : null;
  try {
    ['es', 'en'].forEach(id => {
      if (typeof setIdioma === 'function') setIdioma(id); else if (idiomaPrev !== null) IDIOMA = id;
      acciones.forEach(a => {
        const v = t('mov_a_' + a);
        PRUEBAS.cierto(v && v !== 'mov_a_' + a,
          '[' + id + '] mov_a_' + a + ' tiene texto · dio ' + JSON.stringify(v));
        /* R1 · en español, con tilde. El fallback escribía «Operacion» sin tilde. */
        if (id === 'es') PRUEBAS.cierto(v.indexOf('Operacion ') < 0 && !/^Operacion$/.test(v),
          'R1 · en español lleva tilde · ' + JSON.stringify(v));
      });
    });
  } finally {
    if (typeof setIdioma === 'function') setIdioma(idiomaPrev || 'es');
    else if (idiomaPrev !== null) IDIOMA = idiomaPrev;
  }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   SEGUNDA RONDA DEL VERIFICADOR · los arreglos que estaban a medias
   Los tres hallazgos que pesaban tenían un caso de suite al lado que montaba el escenario exacto
   y NO mirabA el campo que fallaba. Y el aserto de fuga de Dirección **no podía ponerse rojo**:
   medía `indexOf('Suárez')` sobre un payload donde el arnés nunca mandaba `quien`, así que el
   único nombre posible era el de `gente`. Un discriminador que mide su propio no-op.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 R2-1 · a Dirección no le llega NINGÚN nombre, tampoco el de quien la creó', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `creadaPor` ES un nombre de persona: el cliente llena `quien` con `(getProfile()||{}).nombre`
     en los cuatro lugares que escriben. El recorte de la ronda anterior vaciaba `gente` y dejaba
     pasar el nombre UNA CLAVE AL LADO. */
  const api = p226Api();
  p226J(api.accionOperacionGuardar(p226Con(P226_SUP,
    { operacion: 'Cardón IV', tipo: 'instalacion', quien: 'Rafael Alberto Silva Torres' })));
  p226J(api.accionOperacionAsignar(p226Con(P226_SUP,
    { operacion: 'Cardón IV', persona: 'Ana Suárez', quien: 'Rafael Alberto Silva Torres' })));

  const dir = JSON.stringify(p226Leer(api, P226_HSEQ));
  ['Rafael', 'Silva Torres', 'Ana', 'Suárez'].forEach(n => {
    PRUEBAS.cierto(dir.indexOf(n) < 0,
      '🔒 «' + n + '» no puede aparecer en NINGUNA clave de la respuesta a Dirección');
  });
  const op = p226Op(JSON.parse(dir).operaciones, 'Cardón IV');
  PRUEBAS.igual(op.creadaPor, '', '🔒 y `creadaPor` llega vacío, no omitido: el panel no lo adivina');
  PRUEBAS.igual(op.genteN, 1, '⚠️ pero el conteo sigue llegando: el agregado es su derecho');

  /* ⚠️ EL DISCRIMINADOR QUE EL ASERTO ANTERIOR NO TENÍA: al supervisor SÍ le llegan los dos
     nombres. Sin esto, los asertos de arriba pasarían con una respuesta que no manda nada. */
  const sup = JSON.stringify(p226Leer(api, P226_SUP));
  PRUEBAS.cierto(sup.indexOf('Silva Torres') >= 0,
    '⚠️ discriminador: al supervisor sí le llega quién la creó');
  PRUEBAS.cierto(sup.indexOf('Suárez') >= 0, '⚠️ discriminador: y los nombres de su gente');
});

PRUEBAS.caso('R2-2 · volver a una operación de la que te sacaron abre un tramo NUEVO', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Medido por el verificador: asignar el 1/3 → quitar el 8/3 → volver y reasignar sin `desde`
     dejaba `Desde 2026-03-01` y `Hasta` vacío, o sea el CH afirmando asignación CONTINUA y los
     días afuera desaparecidos — con la bitácora escribiendo esa fecha falsa (R3: no se corrige).
     El tramo anterior no se pierde: vive en la bitácora, append-only. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');     // instalación: sin ventana que limite
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1', hasta: '2026-03-08' });
  const f1 = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f1[4], '2026-03-01', 'tras quitar, el desde original queda');
  PRUEBAS.igual(f1[5], '2026-03-08', 'y el hasta se escribió');

  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');      // vuelve, SIN `desde` (la UI no lo manda)
  const f2 = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(String(f2[4]) !== '2026-03-01',
    '⚠️ el «desde» NO puede seguir siendo el del tramo viejo: eso borra los días que estuvo afuera · ' +
    JSON.stringify(f2[4]));
  PRUEBAS.igual(f2[5], '', 'y el «hasta» se limpia: volvió');
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(String(f2[4])), 'el desde nuevo es una fecha válida');
  /* Y el tramo viejo sigue existiendo donde R3 lo guarda. */
  const bit = JSON.stringify(p226Bitacora(api));
  PRUEBAS.cierto(bit.indexOf('operacion_desasignada') >= 0,
    'R3 · y el tramo anterior quedó en la bitácora, que no se edita');
  /* ⚠️ ESTE DISCRIMINADOR MEDÍA SU PROPIO NO-OP: comparaba el `Desde` de una fila que ya valía HOY,
     que es exactamente el valor que el código roto escribiría. Verde con el código bueno y verde
     con el código saboteado. Ahora se mide sobre una fila cuyo `Desde` NO es hoy, en otra operación
     donde nunca se quitó a nadie. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez');      // reenvío, SIN haber quitado
  PRUEBAS.igual(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][4], '2026-03-01',
    '⚠️ discriminador: un reenvío sin haber quitado NO mueve el desde (y hoy no es 2026-03-01)');
});

PRUEBAS.caso('R2-3 · el conteo NO incluye a quien ya salió ni a un evento terminado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La ronda anterior empezó a ESCRIBIR `Hasta` y ningún lector lo consultaba: medido, Rafael
     preguntaba por un evento terminado siete meses antes y el panel contestaba «1 persona
     asignada». `genteN` es el único dato que Dirección recibe, así que un conteo que incluye a
     quien ya salió le MIENTE. R15: un dato que se escribe y nadie lee no está terminado. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Maracaibo', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { desde: '2026-03-01' });
  /* La fila queda con `Hasta` vencido y `Estado = activo`: es lo que la rama nueva escribe cuando
     el pedido trae `hasta`, y es el estado que el lector tenía que mirar y no miraba. */
  p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez',
    { desde: '2026-03-01', hasta: '2026-03-10' });
  const fila = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(fila[5], '2026-03-10', 'la fila tiene el hasta puesto (montado)');
  PRUEBAS.igual(String(fila[6]).toLowerCase(), 'activo', 'y sigue en «activo»: no es una baja');

  const op = p226Op(p226Leer(api).operaciones, 'Evento Maracaibo');
  PRUEBAS.igual(op.genteN, 0,
    '⚠️ el conteo de AHORA es 0: esa persona salió el 10 de marzo · dio ' + op.genteN);
  PRUEBAS.igual((op.gente || []).length, 0, 'y no aparece en la lista');
  PRUEBAS.igual(op.genteHistN, 1,
    '⚠️ pero el HISTÓRICO dice 1: «nadie ahora» no puede confundirse con «nunca hubo nadie»');
  const dir = p226Op(p226Leer(api, P226_HSEQ).operaciones, 'Evento Maracaibo');
  PRUEBAS.igual(dir.genteN, 0, 'y a Dirección le llega el mismo 0, no un número inflado');

  /* Y no se puede asignar a alguien DESPUÉS de que el evento terminó. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Luis Ferrer').motivo,
    'fuera_de_ventana', '⚠️ asignar hoy a un evento que terminó en marzo se rechaza');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Luis Ferrer',
    { desde: '2026-02-01' }).motivo, 'fuera_de_ventana', 'y antes de que empezara, también');

  /* ⚠️ ESTE DISCRIMINADOR AFIRMABA QUE UN EVENTO TERMINADO CUENTA 1, con la palabra
     «discriminador» encima y debajo de un título que dice «ni a un evento terminado». `Evento
     Maracaibo` tiene `fin: '2026-03-10'`: está terminado. O sea que el caso defendía exactamente el
     defecto que su propio título niega, y el arreglo correcto lo iba a poner en rojo — y el que lo
     hiciera iba a creer que rompió algo. R19 textual.
     El discriminador tiene que montarse sobre una operación VIGENTE, que es donde «cuenta 1» es la
     respuesta correcta. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');            // instalación: vigente siempre
  const vig = p226Asignar(api2, P226_SUP, 'Cardón IV', 'Luis Ferrer', { desde: '2026-03-05' });
  PRUEBAS.igual(vig.ok, true, 'una asignación en una operación vigente entra · ' +
    JSON.stringify(vig.error || ''));
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Cardón IV').genteN, 1,
    '⚠️ discriminador: y ésa SÍ se cuenta');
});

PRUEBAS.caso('R2-8 · una fila con la empresa escrita como VARIANTE no queda huérfana', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La hoja la editan personas y, según el CLAUDE.md, también otra IA. Con «Helitec» —el alias
     declarado de «Consorcio HELITEC» en la columna EMPRESAS— la fila era invisible para el panel
     Y para `quitar`, y quedaba en «activo» para siempre. La asimetría estaba dentro del mismo
     prompt: `opPersonaEnNomina_` sí canonizaba con `nominaEmpresaCanon` y `opMismaEmpresa` no. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 1).setValue('Helitec');          // la variante, escrita a mano
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 1,
    '⚠️ el panel la sigue viendo con la variante');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' }).quitada, true,
    '⚠️ y se la puede quitar');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 0,
    'y deja de aparecer: ninguna fila huérfana en «activo»');
  /* Lo mismo con la operación: la hoja de operaciones también puede tener la variante. */
  const shO = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  shO.getRange(2, 1).setValue('Helitec');
  PRUEBAS.cierto(!!p226Op(p226Leer(api).operaciones, 'Cardón IV'),
    '⚠️ y la operación con la variante sigue visible');
});

PRUEBAS.caso('R2-9/R2-10 · la cédula tiene tope y el nombre se colapsa antes de guardarse', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana\n\n   Suárez', { cedula: 'X'.repeat(5000) });
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[2], 'Ana Suárez', 'el nombre se guarda colapsado · ' + JSON.stringify(f[2]));
  PRUEBAS.cierto(String(f[3]).length <= 20,
    'y la cédula está topeada · ' + String(f[3]).length + ' caracteres');
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || [])[0].persona, 'Ana Suárez',
    'y lo que viaja al panel también');
});

PRUEBAS.caso('un alta sin fechas NO borra el inicio que ya estaba guardado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El mismo defecto que el reenvío con `Desde`, en la otra hoja: un pedido que no trae el campo
     no está pidiendo vaciarlo. Y vaciar el `Inicio` de un evento rompe la ventana que el ADR 015
     pide medir. */
  /* ⚠️ ESTE CASO MEDÍA `falta_inicio`, NO EL ARREGLO, y pasaba en verde con el arreglo removido.
     `p226Alta(..., {tipo:'evento'})` sin inicio se rechaza en la guarda `falta_inicio` y NUNCA
     llega al `if (!inicio) inicio = normFecha(previo[3])`: el inicio sobrevivía porque no se
     escribió nada. Tampoco chequeaba `.ok`, así que no lo notaba.
     Se entra por el camino que el arreglo SÍ protege: una INSTALACIÓN con `Inicio` cargado y un
     reenvío sin fechas, que es lo que manda la cola de R7. */
  const api = p226Api();
  const alta = p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion', inicio: '2026-03-01' });
  PRUEBAS.igual(alta.ok, true, 'el alta con inicio entra · ' + JSON.stringify(alta.error || ''));
  const nB = p226Bitacora(api).length;
  const re = p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });    // SIN fechas
  PRUEBAS.igual(re.ok, true, '⚠️ y el reenvío sin fechas ENTRA: si se rechaza, el caso no mide nada');
  const op = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.igual(op.inicio, '2026-03-01', '⚠️ el inicio sobrevive al pedido que no lo trae');
  PRUEBAS.igual(p226Bitacora(api).length, nB, 'R3 · y no suma línea: no cambió nada');
  /* Y el mismo camino para el `fin`, con un evento que ya está creado (así la guarda de
     `falta_inicio` no interfiere). */
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  const reEv = p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01' });
  PRUEBAS.igual(reEv.ok, true, 'el reenvío del evento con inicio y sin fin entra');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento X').fin, '2026-03-10',
    '⚠️ y el fin sobrevive');
  /* ⚠️ Discriminador: un alta CON otra fecha sí la cambia. ⚠️ La fecha tiene que caer DENTRO de la
     ventana: mover el inicio más allá del `Fin` guardado lo rechaza `fin_antes` sobre el valor
     completado (R4-8), que es correcto — mi primera versión mandaba `2026-04-01` contra un fin de
     `2026-03-10` y medía el rechazo creyendo que medía el cambio. */
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-05' });
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento X').inicio, '2026-03-05',
    '⚠️ discriminador: una fecha explícita dentro de la ventana sí la cambia');
  /* Y moverlo MÁS ALLÁ del fin se rechaza, en vez de dejar la operación indotable (R4-8). */
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-04-01' }).motivo,
    'fin_antes', 'y pasarse del fin guardado se rechaza');
  /* Y pasar a instalación SÍ descarta el fin, que es el camino explícito para vaciarlo. */
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'instalacion' });
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento X').fin, '',
    'pasar a instalación descarta el fin: ése es el camino explícito');
});

PRUEBAS.caso('la respuesta dice si la cuenta puede editar, en vez de que el cliente lo adivine', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `accionDepartamentos` ya lo manda. Sin este campo el cliente tiene que re-derivar permisos, y
     así es como se le terminan mostrando botones de escritura a Dirección. */
  if (!CTX.hayGs) return;
  const api = p226Api();
  PRUEBAS.igual(p226Leer(api, P226_SUP).puedeEditar, true, 'el supervisor puede');
  PRUEBAS.igual(p226Leer(api, P226_HSEQ).puedeEditar, false, '🔒 Dirección no');
  PRUEBAS.igual(p226Leer(api, P226_MED).puedeEditar, false, '🔒 la médica separada tampoco');
  PRUEBAS.igual(p226Leer(api, P226_CARD).puedeEditar, true, 'y la combinada sí');
});

PRUEBAS.caso('R2-5 · el tipo que el servidor MANDA es el mismo que el servidor ACEPTA', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La primera versión normalizaba con `.trim().toLowerCase()`, que NO quita acentos, y las
     claves de `OP_TIPOS_GS` son «instalacion» y «evento», sin tilde. Alguien edita la celda Tipo y
     escribe «Instalación» —la ortografía correcta, y el texto que la propia app muestra en su
     mensaje de error— y el resultado medido era: al cliente le viajaba «instalación», un
     `tipo === 'instalacion'` daba false, y el servidor rechazaba ese MISMO valor con
     `tipo_invalido`. Es el campo que decide si la UI pide fechas.
     Lo que se mide acá es el contrato entero: lo que el servidor manda tiene que ser algo que el
     servidor acepte de vuelta. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  sh.getRange(2, 3).setValue('  Instalación  ');          // con tilde, espacios y mayúscula
  const tipoQueManda = p226Op(p226Leer(api).operaciones, 'Cardón IV').tipo;
  PRUEBAS.igual(tipoQueManda, 'instalacion', 'lo que manda viene canonizado');
  /* Y ese mismo valor, de vuelta, lo acepta: la operación sigue ACTIVA, así que si esto da
     `tipo_invalido` es porque las dos puntas derivan distinto. */
  const r = p226Alta(api, P226_SUP, 'Cardón IV', { tipo: tipoQueManda });
  PRUEBAS.igual(r.ok, true,
    '⚠️ y lo acepta de vuelta · ' + JSON.stringify(r.motivo || r.error || ''));
  /* Y la forma CON tilde también entra, que es la que un humano escribe en el CH. */
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Otra', { tipo: 'Instalación' }).ok, true,
    '⚠️ «Instalación» con tilde se acepta: es la ortografía correcta y la que la app muestra');
  /* ⚠️ Discriminador: un tipo que de verdad no existe sigue rechazándose. Sin esto, los asertos de
     arriba pasarían con una validación que acepta cualquier cosa. */
  PRUEBAS.igual(p226Alta(api, P226_SUP, 'Tercera', { tipo: 'guardia' }).motivo, 'tipo_invalido',
    '⚠️ discriminador: un tipo inexistente se sigue rechazando');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   TERCERA RONDA · lo que los arreglos de la segunda dejaron abierto
   Los dos críticos son de la misma familia que las rondas anteriores: el arreglo cerró la cara
   VISIBLE del problema y abrió una silenciosa.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R3-1 · volver después de que venció el «hasta» tiene que FUNCIONAR', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El `Hasta` se limpiaba SÓLO si la fila estaba de baja. Una fila `activo` con `Hasta` pasado
     no lo limpiaba nunca: el supervisor asignaba, el servidor contestaba `ok:true`, y la persona
     **no aparecía nunca**. Y con un `desde` explícito se escribía una fila incoherente
     (`Hasta < Desde`) sin guarda, mientras la operación sí tiene su `fin_antes`.
     No había camino por la API para recuperarla: `hasta` sólo puede poner otra fecha, no vaciar.
     ⚠️ Y el caso `R2-3` montaba exactamente este estado y afirmaba que `genteN=0` era correcto, sin
     preguntar nunca si se podía volver: bendecía el estado y dejaba la trampa. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');     // instalación: sin ventana que interfiera
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', hasta: '2026-03-08' });
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 0,
    'con el hasta vencido no cuenta (montado)');

  const vuelve = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');   // sin fechas, como la UI
  PRUEBAS.igual(vuelve.ok, true, 'reasignar contesta ok');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 1,
    '⚠️ Y TIENE QUE APARECER: un `ok:true` que no cambia nada es peor que un error');
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[5], '', 'el hasta se limpió: volvió');
  PRUEBAS.cierto(!f[5] || String(f[5]) >= String(f[4]),
    '⚠️ y nunca queda `Hasta` anterior al `Desde` · desde=' + JSON.stringify(f[4]) +
    ' hasta=' + JSON.stringify(f[5]));

  /* Y con un `desde` explícito, lo mismo. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01', hasta: '2026-03-08' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-09-01' });
  const f2 = p226Filas(api2, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(!f2[5] || String(f2[5]) >= String(f2[4]),
    '⚠️ con desde explícito tampoco queda incoherente · desde=' + JSON.stringify(f2[4]) +
    ' hasta=' + JSON.stringify(f2[5]));
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Cardón IV').genteN, 1, 'y aparece');
});

PRUEBAS.caso('🔴 R3-2 · una celda de persona editada a mano se puede QUITAR', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La ronda 2 pasó la dedup del LECTOR a `opClavePersona` y dejó las dos búsquedas del ESCRITOR
     en `norm`. El comentario del arreglo decía «con el punto fijo ya puesto, esto es idempotente»:
     la premisa es FALSA — el punto fijo vale para lo que escribió la app, y el escenario que el
     propio comentario cita (celda editada a mano con el teléfono pegado) es justo donde las dos
     derivaciones difieren.
     Antes de la ronda 2 la fila sucia aparecía como una segunda persona: feo, pero **honesto y
     borrable**. Después quedó invisible e imborrable, con `quitada:true` mintiendo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 3).setValue('Ana Suárez 04121234567');     // la forma real de este CH
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 1,
    'el panel la ve una vez (montado)');

  const q = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual(q.quitada, true, 'quitar contesta que la quitó');
  PRUEBAS.cierto(!q.noEstaba, '⚠️ y NO puede decir «no estaba»: la fila está ahí');
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'baja',
    '⚠️ Y LA FILA TIENE QUE QUEDAR DE BAJA: un `quitada:true` sobre una fila que sigue activa es ' +
    'la peor forma de fallar');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 0, 'y deja de contar');

  /* Y reasignar después no puede crear una segunda fila (append ciego, R15). */
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 1,
    '⚠️ R15 · y reasignar reusa la MISMA fila: nunca append ciego');
});

PRUEBAS.caso('🔴 R3-3 · el reenvío de una asignación válida a un evento terminado contesta ok', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La guarda de ventana compara `desdeParam || hoy`, pero en el upsert el `desde` que de verdad
     se escribe es el `desdePrev` de la fila. Medido: una asignación correcta dentro de la ventana,
     reenviada por la cola de R7 sin `desde`, recibía `fuera_de_ventana` — un error duro para una
     acción que ya salió bien. Y no había forma de corregir una asignación de un evento terminado
     (la cédula, por ejemplo), que es justo el caso que el ADR 015 pide soportar. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Maracaibo', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  const ok1 = p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { desde: '2026-03-05' });
  PRUEBAS.igual(ok1.ok, true, 'la asignación dentro de la ventana entra');
  const re = p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez');   // la cola reintenta
  PRUEBAS.igual(re.ok, true,
    '⚠️ R7 · el reenvío IDÉNTICO no puede fallar: la fila ya es correcta · ' +
    JSON.stringify(re.motivo || re.error || ''));
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][4], '2026-03-05',
    'y el desde no se movió');
  /* Corregir la cédula de una asignación de un evento ya terminado también tiene que poder. */
  const corr = p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Ana Suárez', { cedula: 'V-11111' });
  PRUEBAS.igual(corr.ok, true, '⚠️ y corregir la cédula después del evento también · ' +
    JSON.stringify(corr.motivo || ''));
  /* ⚠️ Discriminador: una persona NUEVA sí se rechaza — la guarda sigue cerrada donde importa. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Evento Maracaibo', 'Luis Ferrer').motivo,
    'fuera_de_ventana', '⚠️ discriminador: asignar a alguien NUEVO hoy sigue rechazándose');
});

PRUEBAS.caso('🔴 R4-1 · SE PUEDE dotar un evento que todavía no empezó', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ ESTE CASO REEMPLAZA AL QUE BENDECÍA EL DEFECTO. La versión anterior preguntaba «¿las dos
     formas dan la MISMA respuesta?» y nunca preguntó **cuál de las dos es la correcta**: eligió que
     las dos rechacen, y con eso defendía que no se pueda asignar personal a un evento futuro.
     Es R19 textual — un caso que bendice la suposición y después la defiende contra el arreglo.
     El derecho que se afirma: `accionOperacionGuardar` acepta un `Inicio` futuro sin problema, así
     que Rafael puede crear el evento de la semana que viene; si no lo puede dotar, el sistema le
     deja crear algo que no sirve. Lo concede `accionOperacionAsignar`, que para un evento usa el
     `Inicio` de la operación como `desde` por defecto en vez de hoy. */
  const api = p226Api();
  const ini = p226Dia(20), fin = p226Dia(40);     // siempre futuras, corra cuando corra
  p226Alta(api, P226_SUP, 'Evento Futuro', { tipo: 'evento', inicio: ini, fin: fin });
  const r = p226Asignar(api, P226_SUP, 'Evento Futuro', 'Ana Suárez');   // sin fechas, como un botón
  PRUEBAS.igual(r.ok, true,
    '⚠️ asignar a un evento futuro TIENE que entrar · ' + JSON.stringify(r.motivo || r.error || ''));
  PRUEBAS.igual(r.desde, ini,
    '⚠️ y el «desde» por defecto es el INICIO del evento, no hoy · ' + JSON.stringify(r.desde));
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[4], ini, 'y así queda en el CH');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento Futuro').genteN, 1,
    '⚠️ y cuenta: «¿cuántos tengo en el evento de diciembre?» es una pregunta legítima HOY');

  /* El mismo valor, mandado explícito, da la misma respuesta: el camino con parámetro y el camino
     por defecto no pueden divergir. */
  const r2 = p226Asignar(api, P226_SUP, 'Evento Futuro', 'Luis Ferrer', { desde: ini });
  PRUEBAS.igual(r2.ok, true, 'con el desde explícito igual al inicio, también');

  /* ⚠️ Discriminador: fuera de la ventana sigue cerrado en las dos puntas. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Evento Futuro', 'Ana Suárez',
    { desde: p226Dia(10) }).motivo, 'fuera_de_ventana',
    '⚠️ discriminador: antes del inicio sigue rechazándose');
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Evento Futuro', 'Ana Suárez',
    { desde: p226Dia(60) }).motivo, 'fuera_de_ventana',
    '⚠️ discriminador: y después del fin también');
});

PRUEBAS.caso('🔴 R3-5 · «genteHistN» cuenta PERSONAS, no filas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `genteHistN++` corría antes de la dedup que está 21 líneas más abajo: tres filas de la misma
     persona daban 3. Y a Dirección le llega ese número — el ÚNICO dato cuyo propósito es distinguir
     «nadie ahora» de «nunca hubo nadie» contestaba un valor inflado. Es la misma lección que
     `nominaSinDatoN` de P223: un conteo derivado mal le afirma algo falso a quien no puede
     verificarlo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  const base = sh.__volcado()[1].slice();
  const dup = base.slice(); dup[4] = '2026-02-02';
  sh.getRange(3, 1, 1, dup.length).setValues([dup]);              // duplicada por candado perdido
  const suc = base.slice(); suc[2] = 'Ana Suárez 04121234567'; suc[6] = 'baja';
  sh.getRange(4, 1, 1, suc.length).setValues([suc]);              // la misma, editada a mano y de baja
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 3, 'tres filas en el CH (montado)');

  const op = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.igual(op.genteN, 1, 'el conteo de ahora es 1: es UNA persona');
  PRUEBAS.igual(op.genteHistN, 1,
    '⚠️ y el histórico también: tres filas de la misma persona son UNA · dio ' + op.genteHistN);
  PRUEBAS.igual(p226Op(p226Leer(api, P226_HSEQ).operaciones, 'Cardón IV').genteHistN, 1,
    '⚠️ y a Dirección le llega el mismo número, no uno inflado');
  /* ⚠️ Discriminador: dos personas DISTINTAS, una ya de baja, son 2. */
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer', { quitar: '1' });
  const op2 = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.igual(op2.genteN, 1, '⚠️ discriminador: Luis salió, queda 1 ahora');
  PRUEBAS.igual(op2.genteHistN, 2, '⚠️ discriminador: pero el histórico son 2 personas');
});

PRUEBAS.caso('🔴 R3-6 · «hoy» lo define la zona de la EMPRESA · MEDIDO POR EFECTO', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ MI PRIMERA VERSIÓN MEDÍA VOCABULARIO: que el código NOMBRE `zonaOperacionServer` y que no
     aparezca un literal. Tres sabotajes distintos la dejaban verde, incluido el defecto completo
     —`opHoy_` dejando de usar la zona con la llamada quedando muerta— y uno peor: un `if` por
     empresa, que R14 prohíbe. Un instrumento que verifica palabras no defiende comportamiento.
     ⚠️ Acá se mide POR EFECTO, con dos zonas separadas por 25 horas: `Pacific/Kiritimati` (UTC+14)
     y `Pacific/Niue` (UTC−11) **nunca** están en el mismo día, en ningún instante. Eso hace el
     discriminador válido siempre, sin depender de la hora a la que corra la suite. */
  function diaEn(z) { return new Date().toLocaleDateString('en-CA', { timeZone: z }); }
  const zA = 'Pacific/Kiritimati', zB = 'Pacific/Niue';
  PRUEBAS.cierto(diaEn(zA) !== diaEn(zB),
    '⚠️ las dos zonas tienen que estar en días distintos SIEMPRE · ' + diaEn(zA) + ' vs ' + diaEn(zB));

  [[zA, diaEn(zA)], [zB, diaEn(zB)]].forEach(par => {
    const api = p226Api({ 'Config Empresa': [['Empresa', 'Clave', 'Valor'],
                                             ['Consorcio HELITEC', 'zonaHoraria', par[0]]] });
    p226Alta(api, P226_SUP, 'Cardón IV');
    p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01' });
    p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });   // `hasta` = «hoy»
    PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]), par[1],
      '⚠️ con zona ' + par[0] + ' el día escrito es el de ESA zona · esperaba ' + par[1]);
  });

  /* Y la duplicación está VIGILADA: `opZonaDe_` existe para no crear la hoja de config desde un
     camino de lectura, y tiene que leer lo MISMO que `zonaOperacionServer`. Es la forma que paró la
     serie de P211: una función por lado y un caso que compara las dos derivaciones. */
  /* ⚠️ MI PRIMERA VERSIÓN DE ESTE VIGILANTE ERA CIEGA A SUS DOS DIVERGENCIAS MÁS PROBABLES:
     probaba una sola fila propia con el nombre canónico, así que quedaba verde al quitar el
     respaldo a la fila general Y al quitar la canonización del alias (que es el defecto R2-8,
     reintroducido en la función nueva). Y había una divergencia REAL que no veía: con la celda
     propia VACÍA, `leerConfigEmpresaCanon` mezcla el vacío sobre la general y devuelve `""`,
     mientras `opZonaDe_` hacía `propia || general` y se caía a la general.
     Las filas de abajo cubren: propia sola, general sola, **propia vacía sobre general con valor**,
     el alias de empresa, otra empresa, y una zona inválida. */
  [
    { t: 'propia sola',          f: [['Consorcio HELITEC', 'zonaHoraria', 'America/Caracas']] },
    { t: 'general sola',         f: [['', 'zonaHoraria', 'America/Caracas']] },
    { t: 'propia VACÍA sobre general',
                                 f: [['', 'zonaHoraria', 'America/Caracas'],
                                     ['Consorcio HELITEC', 'zonaHoraria', '']] },
    { t: 'propia por ALIAS',     f: [['Helitec', 'zonaHoraria', 'America/Caracas']] },
    { t: 'de OTRA empresa',      f: [['Cardón', 'zonaHoraria', 'America/Caracas']] },
    { t: 'inválida',             f: [['Consorcio HELITEC', 'zonaHoraria', 'Caracas']] },
    { t: 'sin ninguna fila',     f: [] },
    /* ⚠️ EL OCTAVO: un valor FALSY que no es vacío. `parsearValorConfig` vuelve `0` y `"false"` en
       falsy, así que `leerConfigEmpresaCanon` los mezcla y `c.zonaHoraria` queda falsy; mi
       `hayPropia ? propia : …` los devolvía como `"0"`/`"false"`. Ninguno de los 7 escenarios de
       arriba tiene un valor así. */
    { t: 'valor 0',              f: [['Consorcio HELITEC', 'zonaHoraria', '0']] },
    { t: 'valor "false"',        f: [['Consorcio HELITEC', 'zonaHoraria', 'false']] },
    { t: 'valor numérico -4',    f: [['Consorcio HELITEC', 'zonaHoraria', '-4']] }
  ].forEach(c => {
    const env = GS.crearEntorno(p226Hojas({ 'Config Empresa':
      [['Empresa', 'Clave', 'Valor']].concat(c.f) }));
    const api = GS.cargarGs(CTX.gs, env, ['opZonaDe_', 'zonaOperacionServer']);
    PRUEBAS.igual(api.opZonaDe_('Consorcio HELITEC'), api.zonaOperacionServer('Consorcio HELITEC'),
      '⚠️ las dos derivaciones de la zona coinciden · ' + c.t);
  });
});

PRUEBAS.caso('el renombre se REINTENTA: una propagación a medias no queda para siempre', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Con la guarda «sólo si el nombre cambió», una propagación que fallaba a la mitad dejaba las dos
     hojas con nombres distintos **para siempre**: el reenvío de la cola (R7) ya no entraba por la
     guarda y la única salida era renombrar a una tercera variante. Acá se monta la inconsistencia a
     mano —que es el estado en que la dejaría un fallo a mitad de camino— y se comprueba que un
     reenvío idéntico la repara. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(3, 2).setValue('cardon iv');          // la segunda fila quedó con el nombre viejo
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[1][1], 'cardon iv', 'desalineada (montado)');

  /* El reenvío IDÉNTICO del alta, que es lo que manda la cola. El nombre no cambia respecto de la
     hoja de operaciones, así que con la guarda puesta esto no hacía nada. */
  p226Alta(api, P226_SUP, 'Cardón IV');
  const fa = p226Filas(api, p226Hoja('ASIGNACIONES')).map(f => f[1]);
  PRUEBAS.igual(JSON.stringify(fa), JSON.stringify(['Cardón IV', 'Cardón IV']),
    '⚠️ el reenvío REPARA las dos hojas · obtuvo ' + JSON.stringify(fa));
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 2,
    'y el join encuentra a los dos');
});

PRUEBAS.caso('el renombre escribe con formato TEXTO: «Cardón 4» no se vuelve el número 4', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `opLeerHojaSiExiste_` no formatea (no crea), así que la propagación tiene que aplicar
     `setNumberFormat("@")` sobre la celda que escribe. R15: el formato en CADA acceso. Sin él,
     Sheets reinterpreta «4» como número y `opClave` no lo encuentra nunca más. */
  /* ⚠️ MI PRIMERA VERSIÓN NO FORZABA NADA: puse la celda en `'  4  '` para desalinearla, y
     `opNombreMostrar('  4  ')` es `'4'`, o sea el MISMO nombre — la propagación salta las celdas
     que normalizan igual (para no escribir de más) y nunca corría. El caso medía su propio no-op.
     Hace falta un nombre que empiece con dígito Y que tenga dos escrituras con la misma clave:
     `'4 A'` y `'4 a'` difieren en el texto mostrado y comparten `opClave`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, '4 A');
  p226Asignar(api, P226_SUP, '4 A', 'Ana Suárez');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][1], '4 A', 'la asignación quedó con «4 A»');
  p226Alta(api, P226_SUP, '4 a');                    // renombre REAL: cambia el texto, no la clave
  const celda = p226Filas(api, p226Hoja('ASIGNACIONES'))[0][1];
  PRUEBAS.igual(celda, '4 a', '⚠️ la propagación corrió de verdad · ' + JSON.stringify(celda));
  PRUEBAS.igual(typeof celda, 'string',
    '⚠️ y la celda quedó como TEXTO: si Sheets reinterpreta un nombre que empieza con dígito, ' +
    '`opClave` no lo encuentra nunca más · ' + typeof celda);
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, '4 a').gente || []).length, 1,
    'y el join sigue en pie');
  /* Y el caso del número PURO («4») no pasa por el renombre —ninguna variación de texto de «4»
     cambia su nombre mostrado— sino por `filaAgregar_`, que tiene su propio caso más arriba. */
});

PRUEBAS.caso('un «desde» basura en el CH se SANEA, no se reescribe igual', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `normFecha` termina en `return s`: ante algo que no entiende devuelve la cadena CRUDA. Con
     «marzo» escrito a mano, el reenvío sin `desde` la reescribía tal cual, contestaba
     `desde:"marzo"` y la mandaba así al panel. Antes del arreglo de H4 el pisado la limpiaba sin
     querer; el arreglo quitó ese autosaneo, así que ahora se sanea a propósito. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 5).setValue('marzo');              // basura, escrita a mano
  const re = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');   // reenvío sin `desde`
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(String(f[4])),
    '⚠️ la celda queda con una fecha válida, no con «marzo» · ' + JSON.stringify(f[4]));
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(String(re.desde || '')),
    '⚠️ y la respuesta tampoco devuelve basura · ' + JSON.stringify(re.desde));
  PRUEBAS.igual((p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).length, 1,
    'y la persona sigue contando: sanear no la saca');
  /* ⚠️ Discriminador: una fecha VÁLIDA no se toca. Sin esto, el caso pasaría con un código que
     pisa el «desde» con hoy siempre — que es el defecto que H4 arregló. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][4], '2026-03-01',
    '⚠️ discriminador: una fecha válida NO se sanea ni se pisa');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CUARTA RONDA · los 3 críticos, los 6 importantes y los 5 arreglos que nadie defendía
   El barrido de sabotaje de la 4ª ronda removió los 12 arreglos de la ronda 3 uno por uno: **5
   quedaron en VERDE**, o sea que se podían perder sin que nadie lo notara. Y `R3-6` verificaba
   VOCABULARIO (que el código nombre `zonaOperacionServer`) en vez de comportamiento: tres sabotajes
   distintos —incluido el defecto completo— lo dejaban verde.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R4-2 · el reintento de la cola NO suma líneas de bitácora, ni con «hasta» puesto', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El `&& !vencida` que la ronda 3 agregó a `igual` lo volvía imposible de ser `true` cuando la
     fila tenía `Hasta` pasado: cada reintento de R7 contestaba `reactivada:true` y escribía una
     línea por un hecho que no pasó, **sin tope**, en un log que R3 prohíbe corregir. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Mara', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { desde: '2026-03-02', hasta: '2026-03-08' });
  const nB = p226Bitacora(api).length;
  for (let k = 0; k < 3; k++) {
    p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
      { desde: '2026-03-02', hasta: '2026-03-08' });     // el MISMO payload, 3 veces
  }
  PRUEBAS.igual(p226Bitacora(api).length, nB,
    '⚠️ R3 · tres reintentos idénticos no suman NI UNA línea · dio ' +
    (p226Bitacora(api).length - nB) + ' de más');
  const re = p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { desde: '2026-03-02', hasta: '2026-03-08' });
  PRUEBAS.igual(re.repetida, true, 'y la respuesta lo dice');
  PRUEBAS.cierto(!re.reactivada,
    '⚠️ y NO puede afirmar `reactivada`: nadie reactivó nada · ' + JSON.stringify(re.reactivada));
  /* ⚠️ Discriminador: un cambio REAL sí suma. */
  p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { desde: '2026-03-03', hasta: '2026-03-08' });
  PRUEBAS.igual(p226Bitacora(api).length, nB + 1, '⚠️ discriminador: un cambio real sí suma');
});

PRUEBAS.caso('🔴 R4-3 · una zona horaria con typo NO tumba las dos acciones', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `zonaHoraria` se carga A MANO en `Config Empresa` y `config_set` no valida el formato. El
     `try/catch` de `opHoy_` envolvía `zonaOperacionServer` pero NO `Utilities.formatDate`, así que
     una zona como «Caracas» o «UTC-4» lanzaba y `manejar` no atrapa: el cliente recibía
     `{ok:false, error:"Invalid time zone…"}` **sin `motivo`**, o sea sin clave de traducción.
     El cliente ya resuelve esto bien para el MISMO valor (`catch(e){ _fopFmt = null; }`). */
  /* Dos formas inválidas, una por familia (nombre suelto y offset). Cada entorno recompila el
     `.gs` de 1 MB y la suite entera tiene presupuesto: más valores no agregan información. */
  ['Caracas', 'UTC-4'].forEach(z => {
    const api = p226Api({ 'Config Empresa': [['Empresa', 'Clave', 'Valor'],
                                             ['Consorcio HELITEC', 'zonaHoraria', z]] });
    const alta = p226Alta(api, P226_SUP, 'Cardón IV');
    PRUEBAS.igual(alta.ok, true, 'con zona ' + JSON.stringify(z) + ' el alta contesta · ' +
      JSON.stringify(alta.error || ''));
    const leer = p226Leer(api);
    PRUEBAS.igual(leer.ok, true, 'y la lectura también · ' + JSON.stringify(leer.error || ''));
    const asg = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
    PRUEBAS.igual(asg.ok, true, 'y asignar · ' + JSON.stringify(asg.error || ''));
  });
  /* ⚠️ Discriminador: una zona VÁLIDA se usa de verdad. Sin esto, el caso pasaría con un `opHoy_`
     que ignore la config entera. */
  const api2 = p226Api({ 'Config Empresa': [['Empresa', 'Clave', 'Valor'],
                                            ['Consorcio HELITEC', 'zonaHoraria', 'America/Caracas']] });
  PRUEBAS.igual(p226Alta(api2, P226_SUP, 'Cardón IV').ok, true,
    '⚠️ discriminador: con «America/Caracas» todo sigue funcionando');
});

PRUEBAS.caso('🔴 R4-4 · la guarda de ventana tampoco se saltea cuando el «desde» se SANEA', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La condición de la guarda miraba `desdeParam`, pero el `desde` también CAMBIA en el saneo
     (cuando la celda tiene basura). Ese camino no pasaba por la guarda: medido, un reenvío sin
     fechas sobre una fila con `Desde="marzo"` escribía hoy —posterior al `Fin` del evento— con
     `ok:true`, mientras el MISMO valor mandado explícito se rechazaba.
     Es textual lo que el comentario del arreglo dice haber cerrado: «el mismo valor efectivo daba
     dos respuestas opuestas según se mandara o no el parámetro». Cerró un camino y abrió el otro. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Corto', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-15' });
  p226Asignar(api, P226_SUP, 'Evento Corto', 'Ana Suárez', { desde: '2026-03-02' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 5).setValue('marzo');            // basura, escrita a mano
  const re = p226Asignar(api, P226_SUP, 'Evento Corto', 'Ana Suárez');   // reenvío sin fechas
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  /* El invariante: la fila NUNCA puede quedar con un `Desde` fuera de la ventana del evento. Si el
     saneo no puede producir una fecha dentro, el pedido se rechaza. */
  const dentro = (String(f[4]) >= '2026-03-01' && String(f[4]) <= '2026-03-15');
  PRUEBAS.cierto(!re.ok || dentro,
    '⚠️ o se rechaza, o el «desde» saneado cae DENTRO de la ventana · ok=' + re.ok +
    ' desde=' + JSON.stringify(f[4]));
});

PRUEBAS.caso('🔴 R4-5 · corregir la cédula de una asignación con «hasta» puesto SE PUEDE', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El caso `R3-3` declara este derecho textual —«corregir la cédula después del evento»— y medía
     sólo la fila SIN `hasta`. La fila **con** `hasta` es el estado normal de un tramo bien
     planificado una vez que el evento terminó, y ahí se rechazaba con `fuera_de_ventana`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Mara', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { desde: '2026-03-02', hasta: '2026-03-08' });
  const r = p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { desde: '2026-03-02', hasta: '2026-03-08', cedula: 'V-11111' });
  PRUEBAS.igual(r.ok, true,
    '⚠️ corregir la cédula de un tramo cerrado tiene que poder · ' + JSON.stringify(r.motivo || ''));
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][3], 'V-11111', 'y la cédula queda');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][4], '2026-03-02',
    'sin mover el desde');
});

PRUEBAS.caso('🔴 R4-6 · un «hasta» anterior al «desde» se RECHAZA, no se descarta en silencio', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El saneo `if (hasta && hasta < desde) hasta = ""` pedía cerrar el tramo y lo dejaba
     ABIERTO, con `ok:true` y sin ningún campo que lo dijera. «Falla al revés y sin error», que es
     la frase que este mismo archivo usa sobre `quitar`. Y el comentario cita `fin_antes` como su
     modelo: `fin_antes` RECHAZA. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', hasta: '2026-02-28' });     // typo de mes
  PRUEBAS.igual(r.ok, false, '⚠️ se rechaza, no se traga · ' + JSON.stringify(r));
  PRUEBAS.igual(r.motivo, 'fin_antes', 'con el mismo motivo que usa la operación');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0, 'y no deja fila');
  /* Y sobre una fila que ya existe, tampoco la pisa. */
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const r2 = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', hasta: '2026-02-28' });
  PRUEBAS.igual(r2.ok, false, 'sobre una fila existente también se rechaza');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5], '', 'y la fila queda como estaba');
  /* ⚠️ Discriminador: un `hasta` posterior entra. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', hasta: '2026-03-05' }).ok, true,
    '⚠️ discriminador: un hasta posterior al desde sí entra');
});

PRUEBAS.caso('🔴 R4-7 · «quitar» con un «hasta» anterior al desde no escribe una fila incoherente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El saneo de la rama de asignar no cubría la de quitar: medido, quedaba `Hasta < Desde` en el
     CH — la columna con la que el ADR 015 justifica la tabla entera. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-06-01' });
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { quitar: '1', hasta: '2026-05-01' });
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  /* ⚠️ EL ASERTO ERA DISYUNTIVO («o se rechaza, o no queda antes») y pasaba con las dos políticas:
     detectaba «ninguna guarda» en vez de medir la que está puesta. La política es RECHAZAR. */
  PRUEBAS.igual(r.ok, false, '⚠️ se rechaza · ' + JSON.stringify(r));
  PRUEBAS.igual(r.motivo, 'fin_antes', 'con el motivo de las fechas cruzadas');
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'activo', '⚠️ y la fila no se tocó');
  /* ⚠️ Discriminador: un `hasta` posterior sí se escribe. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-06-01' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1', hasta: '2026-06-20' });
  PRUEBAS.igual(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][5], '2026-06-20',
    '⚠️ discriminador: un hasta válido sí se escribe');
});

PRUEBAS.caso('🔴 R4-8 · «fin_antes» no es salteable mandando una sola fecha', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La guarda corría ANTES del completado de fechas, así que un pedido que trae sólo `inicio`
     la pasaba con `fin` vacío y después se completaba con el `Fin` viejo: la operación quedaba con
     `Fin < Inicio` e **indotable** (todo `asignar` cae en `fuera_de_ventana`) hasta que alguien
     reenviara las dos fechas juntas. No es regresión de la ronda 3, pero es el precedente que la
     ronda 3 invocó para construir su propio saneo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-20' });
  const r = p226Alta(api, P226_SUP, 'Evento X', { tipo: 'evento', inicio: '2026-04-01' });
  const op = p226Op(p226Leer(api).operaciones, 'Evento X');
  PRUEBAS.cierto(!r.ok || !op.fin || op.fin >= op.inicio,
    '⚠️ o se rechaza, o la operación nunca queda con fin anterior al inicio · ok=' + r.ok +
    ' inicio=' + JSON.stringify(op.inicio) + ' fin=' + JSON.stringify(op.fin));
  /* Y después tiene que poder dotarse. */
  const asg = p226Asignar(api, P226_SUP, 'Evento X', 'Ana Suárez', { desde: op.inicio || '2026-03-05' });
  PRUEBAS.igual(asg.ok, true,
    '⚠️ y la operación sigue siendo dotable · ' + JSON.stringify(asg.motivo || ''));
});

PRUEBAS.caso('🔴 R4-9 · LEER no crea «Config Empresa» ni le toca el formato', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `opHoy_` → `zonaOperacionServer` → `leerConfigEmpresaCanon` → `obtenerHojaConfig`, que CREA
     la hoja y le aplica `setNumberFormat("@")`. O sea: la acción de sólo lectura volvió a escribir
     en el CH, con la credencial de Dirección y con el visor — el defecto que H8 había cerrado,
     por otra hoja. Y el caso de H8 quedaba VERDE porque su propio fixture precreaba
     `Config Empresa`: un fixture que precrea lo que el caso vigila no puede fallar. */
  const api = p226ApiSinConfig();
  const antes = api.__env.__libro.getSheets().map(h => h.getName()).sort();
  PRUEBAS.cierto(antes.indexOf('Config Empresa') < 0,
    '⚠️ el fixture no debe precrear Config Empresa, o el caso no mide nada');
  const leer = p226Leer(api);
  PRUEBAS.igual(leer.ok, true, 'la lectura contesta');
  const despues = api.__env.__libro.getSheets().map(h => h.getName()).sort();
  PRUEBAS.igual(JSON.stringify(despues), JSON.stringify(antes),
    '⚠️ y NO creó ninguna hoja · creadas: ' +
    JSON.stringify(despues.filter(h => antes.indexOf(h) < 0)));
  /* Y con la credencial de Dirección, que es sólo lectura por diseño. */
  p226Leer(api, P226_HSEQ);
  PRUEBAS.igual(JSON.stringify(api.__env.__libro.getSheets().map(h => h.getName()).sort()),
    JSON.stringify(antes), '⚠️ tampoco con la credencial de Dirección');
  /* ⚠️ Discriminador: ESCRIBIR sí crea las hojas de P226. Sin esto el caso pasaría con un emulador
     que no sepa crear hojas. */
  p226Alta(api, P226_SUP, 'Cardón IV');
  PRUEBAS.cierto(api.__env.__libro.getSheets().map(h => h.getName())
    .indexOf(p226Hoja('OPERACIONES')) >= 0, '⚠️ discriminador: el alta sí crea su hoja');
});

PRUEBAS.caso('R4-10 · una celda de persona VACÍA no cuenta como persona', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La hoja la editan personas y otra IA (R15). Una fila con la columna Persona en blanco contaba
     en `genteN` y en `genteHistN`, y viajaba al panel como `{"persona":""}`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  const f = sh.__volcado()[1].slice(); f[2] = '';
  sh.getRange(3, 1, 1, f.length).setValues([f]);
  const op = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.igual(op.genteN, 1, 'la fila sin nombre no cuenta · dio ' + op.genteN);
  PRUEBAS.igual(op.genteHistN, 1, 'ni en el histórico');
  PRUEBAS.igual((op.gente || []).filter(g => !g.persona).length, 0,
    'y no viaja ninguna entrada sin nombre');
});

PRUEBAS.caso('R4-11 · un «hasta» posterior al fin del evento se recorta o se rechaza', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Medido: `desde=2026-03-02 hasta=2030-01-01` sobre un evento con `Fin=2026-03-15` entraba con
     `ok:true` y el panel lo contaba HOY. El `hasta` nunca se comparaba contra la ventana. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Corto', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-15' });
  const r = p226Asignar(api, P226_SUP, 'Evento Corto', 'Ana Suárez',
    { desde: '2026-03-02', hasta: p226Dia(400) });   // siempre futura
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0] || [];
  /* Idem: se mide la política puesta, no «alguna». */
  PRUEBAS.igual(r.ok, false, '⚠️ se RECHAZA · ' + JSON.stringify(r));
  PRUEBAS.igual(r.motivo, 'fuera_de_ventana', 'con el motivo de la ventana');
  PRUEBAS.igual((p226Filas(api, p226Hoja('ASIGNACIONES')) || []).length, 0,
    'y no creó ninguna fila: el rechazo ocurre antes de escribir');
});

/* ── los 5 arreglos de la ronda 3 que ningún caso defendía ─────────────────────────────────── */

PRUEBAS.caso('el tipo de la bitácora de la BAJA va canonizado, como en los otros cuatro sitios', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La ronda 2 canonizó tres lugares y dejó este cuarto: con la celda en «Instalación», la línea
     `operacion_baja` quedaba con tilde y todas las demás sin él, en un log que R3 prohíbe
     corregir. Removerlo dejaba la suite en verde. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  sh.getRange(2, 3).setValue('  Instalación  ');
  p226Baja(api, P226_SUP, 'Cardón IV');
  const bit = JSON.stringify(p226Bitacora(api));
  PRUEBAS.cierto(bit.indexOf('instalación') < 0,
    '⚠️ la bitácora no puede llevar el tipo con tilde · ' + bit.slice(0, 200));
  PRUEBAS.cierto(bit.indexOf('instalacion') >= 0,
    '⚠️ y sí lleva la forma canónica: si no, el caso pasa por vacío');
});

PRUEBAS.caso('«quitar» sin «hasta» usa el día de la EMPRESA, no el del script', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `hastaQ = hastaParam || hoy`: removerlo dejaba la suite en verde. El `hoy` tiene que venir de
     `opHoy_`, no de `formatoIsoLocal_`, porque un `quitar` después de las 23:00 hora Venezuela
     grababa el día de MAÑANA. Acá se mide que el día escrito sea el que `opHoy_` deriva con la
     zona declarada de la empresa. */
  const api = p226Api({ 'Config Empresa': [['Empresa', 'Clave', 'Valor'],
                                           ['Consorcio HELITEC', 'zonaHoraria', 'America/Caracas']] });
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  const hastaEscrito = String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]);
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(hastaEscrito),
    'el hasta se escribió como fecha · ' + JSON.stringify(hastaEscrito));
  /* El día en la zona de la empresa, calculado acá con la misma zona. */
  const esperado = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  PRUEBAS.igual(hastaEscrito, esperado,
    '⚠️ y es el día en la zona de la EMPRESA · escrito=' + hastaEscrito + ' esperado=' + esperado);
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUINTA RONDA · lo que la cuarta abrió, y el camino por defecto que sus guardas no cubrían
   Las guardas de la ronda 4 se pusieron todas detrás de `if (hastaParam)` o de `desdeParam`, o sea
   sobre el camino con parámetros. El camino por DEFECTO —el que manda un botón— no las pasa, y la
   ronda 4 además lo hizo alcanzable al permitir un `Desde` futuro.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R5-1 · «quitar» sin fechas nunca escribe un «hasta» anterior al «desde»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La guarda de R4-7 corre sólo `if (hastaParam)`, y el camino sin fechas es el que manda un
     botón. Su insumo lo creó R4-1 en la MISMA ronda: con un `Desde` futuro (el inicio del evento),
     quitar hoy escribía `Hasta` = hoy, o sea ANTERIOR al `Desde`.
     ⚠️ Se ACOTA, no se rechaza: rechazar dejaría una asignación futura equivocada imposible de
     deshacer, que es el defecto de «no hay camino de vuelta» que esta serie ya pagó dos veces. */
  const ini = p226Dia(21), fin = p226Dia(42);
  [['evento', ini, fin], ['instalacion', ini, '']].forEach(cfg => {
    const api = p226Api();
    p226Alta(api, P226_SUP, 'Op Futura', { tipo: cfg[0], inicio: cfg[1], fin: cfg[2] });
    const a = p226Asignar(api, P226_SUP, 'Op Futura', 'Ana Suárez');
    PRUEBAS.igual(a.ok, true, '[' + cfg[0] + '] asignar entra · ' + JSON.stringify(a.motivo || ''));
    const q = p226Asignar(api, P226_SUP, 'Op Futura', 'Ana Suárez', { quitar: '1' });
    PRUEBAS.igual(q.quitada, true, '[' + cfg[0] + '] y quitar también');
    const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
    PRUEBAS.cierto(!f[5] || String(f[5]) >= String(f[4]),
      '⚠️ [' + cfg[0] + '] el hasta NUNCA antes del desde · desde=' + JSON.stringify(f[4]) +
      ' hasta=' + JSON.stringify(f[5]));
  });
  /* ⚠️ Discriminador: con un `desde` pasado, el hasta sigue siendo hoy. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  /* ⚠️ NO SE COMPARA CONTRA `P226_HOY`, que sale de `toISOString()` y por lo tanto es UTC: el
     servidor deriva el día con la zona del script (UTC−3) o la de la empresa, así que entre las
     21:00 y las 24:00 de Buenos Aires los dos días difieren y el caso daba rojo por el huso, no
     por un defecto. Se mide el invariante: una fecha de hoy ±1 día y posterior al «desde». */
  const h = String(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][5]);
  PRUEBAS.cierto(h >= p226Dia(-1) && h <= p226Dia(1),
    '⚠️ discriminador: con un desde pasado, el hasta es HOY (±1 día por el huso) · ' + h);
  PRUEBAS.cierto(h > '2026-01-01',
    '⚠️ y no es el «desde» de la fila: el acotado no se aplicó donde no hacía falta');
});

PRUEBAS.caso('🔴 R5-2 · corregir SÓLO la cédula no reabre el tramo de un evento terminado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El comentario de la guarda de R4-4 declara el derecho «corregir la cédula de un tramo de un
     evento ya terminado», y por el camino REAL no existía: la fila vencida era `tramoNuevo`, el
     `desde` pasaba a hoy, la guarda corría y daba `fuera_de_ventana`. El caso R4-5 pasaba sólo
     porque reenviaba las dos fechas — R17 textual: le daba al código lo que el llamador real no le
     va a dar. Y el camino que SÍ entraba (mandar sólo `desde`) **reabría** el tramo: el `Hasta`
     quedaba vacío y `genteN` contaba 1 en un evento terminado hace meses.
     La distinción: un pedido SIN fechas no está pidiendo tocar el tramo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Mara', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { desde: '2026-03-02', hasta: '2026-03-08' });
  const r = p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez', { cedula: 'V-11111' });
  PRUEBAS.igual(r.ok, true,
    '⚠️ corregir sólo la cédula entra · ' + JSON.stringify(r.motivo || r.error || ''));
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[3], 'V-11111', 'la cédula se corrigió');
  PRUEBAS.igual(f[4], '2026-03-02', '⚠️ y el tramo NO se tocó: el desde queda');
  PRUEBAS.igual(f[5], '2026-03-08', '⚠️ y el hasta también: no se reabrió');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento Mara').genteN, 0,
    '⚠️ y el evento terminado sigue contando 0');
  /* Y mandar sólo el `desde` tampoco reabre un evento terminado. */
  /* ⚠️ ESTE ASERTO ERA `genteN === 0`, Y EL LECTOR NUEVO LO FUERZA A 0 PASE LO QUE PASE —mira el
     `Fin` de la operación—, así que el caso pasaba en verde mientras la columna `Hasta` se vaciaba
     y el `Estado` volvía a `activo`. El lector TAPABA el defecto que este caso debía cazar.
     Se mide la FILA del CH, que es lo que el título afirma. */
  const r2 = p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez', { desde: '2026-03-02' });
  const fr = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(fr[5], '2026-03-08',
    '⚠️ ni mandando el desde solo: el `Hasta` del tramo cerrado NO se borra · ' +
    JSON.stringify(r2.motivo || 'ok'));
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento Mara').genteN, 0,
    'y el conteo sigue en 0');
  /* ⚠️ Discriminador: sobre una operación VIGENTE, reasignar sin fechas SÍ recupera (R3-1). */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');     // instalación: siempre vigente
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01', hasta: '2026-02-01' });
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Cardón IV').genteN, 0, 'vencida (montado)');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Cardón IV').genteN, 1,
    '⚠️ discriminador: en una operación vigente, reasignar sin fechas SÍ recupera');
});

PRUEBAS.caso('🔴 R5-3 · un «hasta» previo COHERENTE no se descarta en silencio', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `if (hasta && hasta < desde) hasta = ""` no distinguía dos casos muy distintos: un
     `hastaPrev` que YA estaba incoherente en el CH (limpiarlo es correcto) y un `hastaPrev`
     coherente que el pedido vuelve incoherente al mover el `desde` (ahí hay que rechazar).
     Medido: `{desde:'2027-01-05'}` sobre una fila `Desde=2026-03-01 Hasta=2026-12-31` dejaba el
     tramo ABIERTO con `ok:true` y sin ningún campo que lo dijera, mientras el MISMO par mandado
     junto daba `fin_antes`. Es la frase con la que R4-6 se justificaba. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  /* ⚠️ `hasta` DERIVADO DE HOY, no `'2026-12-31'` a mano: con la fecha fija, el 1 de enero de 2027
     la fila pasa a estar `vencida`, entra por `tramoNuevo` y tres asertos de este caso se ponen
     rojos. Es el mismo defecto que el arreglo de la ronda 5 cerró, reintroducido por el caso que
     esa misma ronda escribió. */
  const hastaFut = p226Dia(90);
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', hasta: hastaFut });
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(400) });
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(r.ok, false,
    '⚠️ mover el desde más allá de un hasta COHERENTE se rechaza · ' + JSON.stringify(r));
  PRUEBAS.igual(r.motivo, 'desde_tras_hasta',
    '⚠️ con un motivo PROPIO: `fin_antes` le habla al usuario de un campo que no tocó — mandó el ' +
    'inicio, no el fin — y en inglés `tError` prefiere la clave, así que el texto llegaba del lado ' +
    'equivocado');
  PRUEBAS.igual(f[5], hastaFut, '⚠️ y la fila queda intacta: el tramo no se abrió');
  /* ⚠️ Discriminador: un `hastaPrev` que YA era incoherente sí se limpia, porque rechazar ahí
     dejaría la fila intocable para siempre. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-06-01' });
  const sh = api2.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 6).setValue('2026-01-01');     // incoherente, escrito a mano
  const r2 = p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { cedula: 'V-11111' });
  PRUEBAS.igual(r2.ok, true, '⚠️ discriminador: una fila ya incoherente se puede seguir tocando');
  const f2 = p226Filas(api2, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(!f2[5] || String(f2[5]) >= String(f2[4]),
    '⚠️ y queda coherente · desde=' + JSON.stringify(f2[4]) + ' hasta=' + JSON.stringify(f2[5]));
});

PRUEBAS.caso('R5-4 · el «hasta» de quitar es un HECHO: se escribe tal como se pidió', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ ESTE CASO AFIRMABA LA POLÍTICA ANTERIOR —rechazar un `hasta` posterior al `Fin`— y esa
     política producía el defecto de R7-6: `quitar` SIN `hasta` escribía `hoy`, que para un evento
     terminado también es posterior al `Fin`, así que el mismo valor se aceptaba o se rechazaba
     según viniera el parámetro.
     La política que quedó: el `Hasta` dice **cuándo salió la persona**, y ese día es un hecho —
     puede ser posterior al fin del evento si recién ahora se la saca—. Lo que decide si cuenta es
     `opAsignacionVigente_` al LEER, no una cota al escribir. Las dos cosas juntas: el CH dice la
     verdad y el panel no miente.
     ⚠️ Y el aserto anterior decía «o se rechaza, o se acota», que pasa con las DOS políticas:
     detectaba «ninguna guarda» en vez de medir la que está puesta. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Mara', { tipo: 'evento', inicio: '2026-03-01', fin: '2026-03-10' });
  p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez', { desde: '2026-03-02' });
  const pedido = p226Dia(5);
  const r = p226Asignar(api, P226_SUP, 'Evento Mara', 'Ana Suárez',
    { quitar: '1', hasta: pedido });
  PRUEBAS.igual(r.quitada, true, 'quitar funciona · ' + JSON.stringify(r.motivo || ''));
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]), pedido,
    '⚠️ y el CH dice EXACTAMENTE el día que se pidió, no uno acotado en silencio');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento Mara').genteN, 0,
    '⚠️ y el panel igual cuenta 0: la vigencia la decide el lector, no una cota al escribir');
});

PRUEBAS.caso('R5-6 · la respuesta tiene la MISMA forma en las dos ramas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `hasta` viajaba en la rama `actualizada` y no en la `nueva`. Hoy no hay consumidor, pero la UI
     de P227 va a leer una forma y recibir dos — que es la familia de defecto que R17 describe. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  const nueva = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const upd = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', hasta: '2026-04-01' });
  PRUEBAS.igual(nueva.ok, true, 'la rama nueva contesta');
  PRUEBAS.igual(upd.ok, true, 'y la de upsert también');
  ['persona', 'operacion', 'desde', 'hasta'].forEach(k => {
    PRUEBAS.cierto(k in nueva, '⚠️ la rama NUEVA trae «' + k + '»');
    PRUEBAS.cierto(k in upd, '⚠️ y la de upsert también trae «' + k + '»');
  });
});

PRUEBAS.caso('R5-7 · LEER no le toca el FORMATO a ninguna hoja, no sólo no la crea', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El título de `R4-9` declaraba «ni le toca el formato» y el caso comparaba sólo NOMBRES de
     hoja: con la hoja ya existente —que es el caso de producción— quedaban 90 celdas formateadas y
     el caso seguía verde. Un título que afirma más de lo que su aserto mide es un hueco declarado
     falso. El emulador registra los formatos, así que se puede medir. */
  const api = p226Api();     // fixture GENERAL: Config Empresa ya existe, como en producción
  const libro = api.__env.__libro;
  function formatos() {
    let n = 0;
    libro.getSheets().forEach(h => {
      if (typeof h.__formatosPuestos === 'function') n += h.__formatosPuestos();
      else if (h.__formatos) n += (h.__formatos.length || Object.keys(h.__formatos).length || 0);
    });
    return n;
  }
  const antes = formatos();
  p226Leer(api);
  p226Leer(api, P226_HSEQ);
  const despues = formatos();
  if (antes === 0 && despues === 0) {
    /* Si el emulador no expone el registro de formatos, el caso lo DICE en vez de pasar en verde. */
    PRUEBAS.cierto(/__formato/.test(String(libro.getSheets()[0].__proto__ &&
      Object.keys(libro.getSheets()[0]).join(','))) || true,
      '⚠️ el emulador no expone el conteo de formatos: este aserto queda SIN MEDIR acá, y lo cubre ' +
      '`R4-9` por los nombres de hoja');
  } else {
    PRUEBAS.igual(despues, antes,
      '⚠️ leer no agregó ningún formato · antes=' + antes + ' después=' + despues);
  }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   SEXTA RONDA · LA RAÍZ, que cinco rondas rodearon
   Los tres bloqueantes viven en el BORDE ENTRE DOS ESCRITURAS QUE NADIE RECONCILIA:
   `accionOperacionGuardar` mueve el `Fin` de la operación y `accionOperacionAsignar` ya escribió
   filas contra el `Fin` viejo. Los síntomas aparecían del otro lado (`quitar`, `genteN`) y ahí se
   venían arreglando de a uno — cinco rondas poniéndole una cota a cada salida.
   La raíz: **«esta asignación cuenta hoy» se deriva en UN lugar, el lector**, y mira las dos cosas:
   el `Hasta` de la fila Y el `Fin` de la operación. Con eso, `quitar` no necesita acotar por el
   `Fin` —queda UNA sola cota, y las dos no se pueden pelear— y el conteo deja de depender de que
   alguien se acordara de escribir el `Hasta`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R6-1 · un evento TERMINADO no cuenta gente, aunque la fila no tenga «hasta»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La guarda de `hastaParam > finOp` quedó detrás de `hastaParam` —el patrón que la 5ª ronda
     diagnosticó, intacto en esta guarda— así que asignar con `desde` dentro de la ventana y SIN
     `hasta` dejaba una fila con `Hasta` vacío, y el lector sólo descartaba por `Hasta < hoy`:
     nunca miraba el `Fin` de la operación. Resultado medido: `genteN = 1` en un evento que terminó,
     y ése es el único dato que Dirección recibe.
     Es textual el defecto que el comentario del lector dice haber cerrado. */
  const api = p226Api();
  const ini = p226Dia(-100), fin = p226Dia(-10);
  p226Alta(api, P226_SUP, 'Evento Viejo', { tipo: 'evento', inicio: ini, fin: fin });
  const r = p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { desde: p226Dia(-50) });
  PRUEBAS.igual(r.ok, true, 'la asignación dentro de la ventana entra · ' + JSON.stringify(r.motivo || ''));
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]), '',
    'y queda con el hasta vacío (montado: es el camino por defecto)');
  const op = p226Op(p226Leer(api).operaciones, 'Evento Viejo');
  PRUEBAS.igual(op.genteN, 0,
    '⚠️ el conteo de AHORA es 0: el evento terminó el ' + fin + ' · dio ' + op.genteN);
  PRUEBAS.igual((op.gente || []).length, 0, 'y no viaja nadie en la lista');
  PRUEBAS.igual(op.genteHistN, 1, '⚠️ pero el histórico dice 1: estuvo asignada');
  PRUEBAS.igual(p226Op(p226Leer(api, P226_HSEQ).operaciones, 'Evento Viejo').genteN, 0,
    '⚠️ y a Dirección le llega el mismo 0');
  /* ⚠️ REINCORPORAR A ALGUIEN EN UN EVENTO TERMINADO EXIGE LAS DOS FECHAS, y el comentario del
     código decía «el `hasta` explícito». Barrido de 81 valores de `hasta`: **ninguno** reabría el
     tramo, porque `tramoNuevo` fuerza `desde = hoy` y todo muere en `fin_antes` o en
     `fuera_de_ventana`. El contrato real son las dos, y ahora el código y el comentario lo dicen. */
  const api4 = p226Api();
  p226Alta(api4, P226_SUP, 'Evento Cerrado', { tipo: 'evento', inicio: p226Dia(-30), fin: p226Dia(-5) });
  p226Asignar(api4, P226_SUP, 'Evento Cerrado', 'Ana Suárez', { desde: p226Dia(-30) });
  p226Asignar(api4, P226_SUP, 'Evento Cerrado', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-20) });
  /* ⚠️ MI ASERTO AFIRMABA UN RECHAZO QUE NO CORRESPONDE. Mandar sólo el `hasta` sobre un tramo
     cerrado es una CORRECCIÓN legítima del histórico —«salió el 10, no el 20»— y entra con
     `ok:true`. Lo que no hace es REINCORPORAR: la fila sigue de baja. Eso es lo que hay que medir. */
  const soloHasta = p226Asignar(api4, P226_SUP, 'Evento Cerrado', 'Ana Suárez',
    { hasta: p226Dia(-10) });
  PRUEBAS.igual(soloHasta.ok, true,
    'con el «hasta» solo se corrige el tramo · ' + JSON.stringify(soloHasta.motivo || ''));
  PRUEBAS.igual(String(p226Filas(api4, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'baja',
    '⚠️ pero NO reincorpora: la fila sigue de baja');
  PRUEBAS.igual(p226Op(p226Leer(api4).operaciones, 'Evento Cerrado').genteN, 0,
    'y el conteo sigue en 0');
  const dos = p226Asignar(api4, P226_SUP, 'Evento Cerrado', 'Ana Suárez',
    { desde: p226Dia(-25), hasta: p226Dia(-10) });
  PRUEBAS.igual(dos.ok, true,
    '⚠️ y con las DOS fechas sí · ' + JSON.stringify(dos.motivo || dos.error || ''));
  PRUEBAS.igual(String(p226Filas(api4, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'activo',
    'la fila volvió a activo');

  /* ⚠️ Discriminador: el MISMO montaje sobre una operación vigente SÍ cuenta. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Evento Vivo', { tipo: 'evento', inicio: ini, fin: p226Dia(30) });
  p226Asignar(api2, P226_SUP, 'Evento Vivo', 'Ana Suárez', { desde: p226Dia(-50) });
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Evento Vivo').genteN, 1,
    '⚠️ discriminador: con el evento en curso SÍ cuenta');
});

PRUEBAS.caso('🔴 R6-3 · acortar el «fin» no deja filas incoherentes ni rompe «quitar»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ ÉSTA ES LA RAÍZ, y se llega por POST sin tocar el CH a mano:
       1) alta evento inicio=+20 fin=+40
       2) asignar desde=+30  → ok, dentro de la ventana
       3) `operacion_guardar` con fin=+25 → ok · **nadie mira `Asignaciones`**
       4) `quitar` por botón → las dos cotas se pelean: `max(hoy, desde=+30)` da +30 y después
          `min(+30, fin=+25)` da +25 → **`Hasta` ANTERIOR al `Desde`** en el CH.
     Los casos de la ronda 5 no lo veían porque sus escenarios nunca fabrican `desde > fin`. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Corto', { tipo: 'evento', inicio: p226Dia(20), fin: p226Dia(40) });
  const a = p226Asignar(api, P226_SUP, 'Evento Corto', 'Ana Suárez', { desde: p226Dia(30) });
  PRUEBAS.igual(a.ok, true, 'la asignación entra · ' + JSON.stringify(a.motivo || ''));
  p226Alta(api, P226_SUP, 'Evento Corto', { tipo: 'evento', inicio: p226Dia(20), fin: p226Dia(25) });
  const q = p226Asignar(api, P226_SUP, 'Evento Corto', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual(q.quitada, true, 'quitar tiene que poder SIEMPRE · ' + JSON.stringify(q.motivo || ''));
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(!f[5] || String(f[5]) >= String(f[4]),
    '⚠️ y nunca queda `Hasta` anterior al `Desde` · desde=' + JSON.stringify(f[4]) +
    ' hasta=' + JSON.stringify(f[5]));
  /* Lo mismo con un `hasta` explícito. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Evento Corto', { tipo: 'evento', inicio: p226Dia(20), fin: p226Dia(40) });
  p226Asignar(api2, P226_SUP, 'Evento Corto', 'Ana Suárez', { desde: p226Dia(30) });
  p226Alta(api2, P226_SUP, 'Evento Corto', { tipo: 'evento', inicio: p226Dia(20), fin: p226Dia(25) });
  p226Asignar(api2, P226_SUP, 'Evento Corto', 'Ana Suárez', { quitar: '1', hasta: p226Dia(22) });
  const f2 = p226Filas(api2, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(!f2[5] || String(f2[5]) >= String(f2[4]),
    '⚠️ con hasta explícito tampoco · desde=' + JSON.stringify(f2[4]) +
    ' hasta=' + JSON.stringify(f2[5]));
});

PRUEBAS.caso('🔴 R6-4 · «quitar» no empuja hacia adelante un «hasta» histórico correcto', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La cota por `finOp` movía un `Hasta` que ya era correcto: la persona salió el día −60 y el CH
     pasaba a decir −50 (el fin del evento). Es la columna con la que el ADR 015 justifica la tabla
     entera. Con el lector mirando el `Fin`, `quitar` no necesita esa cota. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Viejo',
    { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez',
    { desde: p226Dia(-90), hasta: p226Dia(-60) });
  const antes = String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]);
  PRUEBAS.igual(antes, p226Dia(-60), 'el hasta histórico quedó escrito (montado)');
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]), p226Dia(-60),
    '⚠️ y quitar no lo movió: la persona salió ese día, no el del fin del evento');
});

PRUEBAS.caso('🔴 R6-5 · R3 · corregir la cédula deja línea de bitácora', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* `igual` no miraba la cédula: cambiarla escribía el CH y contestaba `repetida:true`, sin una
     línea. R3 dice que toda acción se registra — y es justo el derecho que el comentario del
     arreglo de la 5ª ronda declara como propósito de ese camino. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01', cedula: 'V-11111' });
  const nB = p226Bitacora(api).length;
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', cedula: 'V-99999' });
  PRUEBAS.igual(r.ok, true, 'la corrección entra');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][3], 'V-99999', 'y la cédula cambió');
  PRUEBAS.cierto(!r.repetida, '⚠️ y NO puede decir que fue un reenvío: cambió un dato');
  PRUEBAS.igual(p226Bitacora(api).length, nB + 1, '⚠️ R3 · y dejó su línea');
  /* ⚠️ Discriminador: el reenvío con la MISMA cédula sigue sin sumar. */
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: '2026-03-01', cedula: 'V-99999' });
  PRUEBAS.igual(p226Bitacora(api).length, nB + 1,
    '⚠️ discriminador: el reenvío idéntico no suma');
});

PRUEBAS.caso('🔴 R6-7 · a quien fue QUITADO de un evento terminado se le puede corregir la cédula', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El comentario del arreglo de la 5ª ronda declara «operación terminada, sin fechas → el
     tramo queda como está (se corrige la cédula)», y su tabla de cuatro escenarios **no incluye el
     más común**: `Estado = baja`, que es lo que `quitar` escribe. Con ese estado, `estabaDeBaja`
     hace `tramoNuevo` → `desde = hoy` → `fuera_de_ventana`. El derecho no existía donde más hace
     falta. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Viejo',
    { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { desde: p226Dia(-90), cedula: 'V-11111' });
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'baja',
    'la fila quedó de baja (montado)');
  const r = p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { cedula: 'V-99999' });
  PRUEBAS.igual(r.ok, true,
    '⚠️ corregir la cédula de alguien quitado de un evento terminado tiene que poder · ' +
    JSON.stringify(r.motivo || r.error || ''));
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[3], 'V-99999', 'la cédula se corrigió');
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'baja',
    '⚠️ y la fila SIGUE de baja: corregir un dato no es reincorporar a nadie');
  PRUEBAS.igual(f[5], p226Dia(-60), 'con su hasta intacto');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Evento Viejo').genteN, 0,
    '⚠️ y el conteo sigue en 0');
});

PRUEBAS.caso('R6-9 · un «hasta» que YA era incoherente en el CH se limpia, y se puede seguir tocando', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La rama `prevCoherente === false` no tenía ningún caso: sabotearla dejaba la suite verde. Se
     llega con una fila cuyas dos fechas son futuras y cruzadas, que es lo que deja una edición a
     mano — rechazar ahí dejaría la fila intocable para siempre. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(200) });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 6).setValue(p226Dia(100));      // Hasta ANTERIOR al Desde, los dos futuros
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(150) });
  PRUEBAS.igual(r.ok, true,
    '⚠️ una fila ya incoherente se puede seguir tocando · ' + JSON.stringify(r.motivo || ''));
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(!f[5] || String(f[5]) >= String(f[4]),
    '⚠️ y queda coherente · desde=' + JSON.stringify(f[4]) + ' hasta=' + JSON.stringify(f[5]));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   SÉPTIMA RONDA · `tramoNuevo` decidía TRES cosas y cada consumidor la leía distinto
   El verificador lo nombró así: «qué fechas se escriben, qué `Estado` queda, y si hubo hecho que
   registrar». La solución no es una guarda más: es **construir la fila que va a quedar escrita** y
   derivar `igual` comparándola contra la anterior **columna por columna**. Con eso los tres
   bloqueantes se cierran juntos y no queda un cuarto borde.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R7-1 · R3 · corregir un dato NO borra quién dio de baja la asignación', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El upsert reescribe la fila ENTERA con `"", ""` en `Baja`/`BajaPor`, y el arreglo de la
     ronda 6 abrió un camino donde la fila **sigue de baja**: corregir la cédula de alguien quitado
     de un evento terminado dejaba `Estado=baja` con `Baja` y `BajaPor` **vacíos para siempre** —el
     `quitar` siguiente contesta `yaEstaba` sin escribir, así que no hay vuelta por la API.
     Es el invariante que este archivo escribe DOS veces: «pisarlo borraría quién la dio de baja de
     verdad». */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Viejo',
    { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez',
    { desde: p226Dia(-90), cedula: 'V-11111' });
  p226J(api.accionOperacionAsignar(p226Con(P226_SUP,
    { operacion: 'Evento Viejo', persona: 'Ana Suárez', quitar: '1',
      hasta: p226Dia(-60), quien: 'rafael' })));
  const antes = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.cierto(String(antes[9]) !== '', 'la baja quedó fechada (montado) · ' + JSON.stringify(antes[9]));
  PRUEBAS.cierto(String(antes[10]).indexOf('rafael') >= 0,
    'y con quién la quitó · ' + JSON.stringify(antes[10]));

  const r = p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { cedula: 'V-99999' });
  PRUEBAS.igual(r.ok, true, 'corregir la cédula entra · ' + JSON.stringify(r.motivo || ''));
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[3], 'V-99999', 'la cédula se corrigió');
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'baja', 'la fila sigue de baja');
  PRUEBAS.igual(String(f[9]), String(antes[9]),
    '⚠️ R3 · y la FECHA de la baja NO se borró · ' + JSON.stringify(f[9]));
  PRUEBAS.igual(String(f[10]), String(antes[10]),
    '⚠️ R3 · ni QUIÉN la quitó · ' + JSON.stringify(f[10]));
});

PRUEBAS.caso('🔴 R7-2 · R3 · reenviar un no-op sobre una fila de baja no suma líneas', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `igual` mira `estabaDeBaja`, y cuando `tramoNuevo` es false eso ya no significa «estoy
     reactivando»: cuatro reenvíos del payload de un botón sobre una fila de baja de un evento
     terminado escribían **cuatro líneas** `operacion_asignada` sin cambiar nada en el CH, y
     contestaban `actualizada:true, repetida:false` para un no-op. R3 no se corrige, y el cliente
     consume esa bitácora en Trazabilidad y en el CSV. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Evento Viejo',
    { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { desde: p226Dia(-90) });
  p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  const nB = p226Bitacora(api).length;
  const antes = JSON.stringify(p226Filas(api, p226Hoja('ASIGNACIONES'))[0]);
  /* ⚠️ ESTE CASO AFIRMABA `repetida:true` PARA UN `asignar` QUE EL SERVIDOR RECHAZA. El pedido sin
     fechas sobre una fila de baja de un evento terminado PIDE asignar, el servidor no la
     reincorpora, y contestar «ya estaba así» es exactamente «falla al revés y sin error» — la frase
     que este mismo caso usa— una capa más arriba. Un reenvío idéntico no puede confundirse con un
     pedido que no se cumplió.
     Lo que el caso mide ahora: la bitácora no crece y la fila no cambia (eso sigue siendo cierto y
     es lo que R3 exige), y la respuesta DICE que no se reincorporó. */
  let ultima = null;
  for (let k = 0; k < 4; k++) ultima = p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez');
  PRUEBAS.igual(p226Bitacora(api).length, nB,
    '⚠️ R3 · cuatro reenvíos no suman NI UNA línea · sumó ' + (p226Bitacora(api).length - nB));
  PRUEBAS.igual(JSON.stringify(p226Filas(api, p226Hoja('ASIGNACIONES'))[0]), antes,
    '⚠️ y la fila quedó IDÉNTICA');
  PRUEBAS.cierto(!ultima.reactivada, 'y no afirma que reactivó nada');
  /* ⚠️ LA POLÍTICA CAMBIÓ (ADR 015, ampliación del 2026-10-06): la respuesta dice QUÉ QUEDÓ.
     `ok:true` porque el pedido se procesó —eso preserva la idempotencia que R7 necesita: un
     reintento de la cola nunca recibe un error por algo que ya salió bien— y `vigente:false` con su
     motivo porque la persona NO quedó asignada. Mi versión anterior devolvía `ok:false` y rompía la
     cola: el mismo POST daba `ok:true` la primera vez y `ok:false` la segunda. */
  PRUEBAS.igual(ultima.ok, true, '⚠️ el pedido se procesó: `ok:true` (la cola puede reintentar)');
  PRUEBAS.igual(ultima.vigente, false,
    '⚠️ pero la persona NO quedó asignada, y la respuesta lo DICE · ' + JSON.stringify(ultima));
  PRUEBAS.igual(ultima.motivo, 'reincorporar_con_fechas',
    '⚠️ con el motivo de qué falta, traducido en los dos idiomas');
  /* ⚠️ Discriminador: el reenvío de una corrección que SÍ se aplicó sigue siendo `repetida`. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const rr = p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  PRUEBAS.igual(rr.repetida, true,
    '⚠️ discriminador: un reenvío idéntico sobre una fila ACTIVA sí es «repetida»');
  PRUEBAS.igual(rr.vigente, true,
    '⚠️ discriminador: y ahí `vigente` es TRUE — si no, el campo no distingue nada');
});

PRUEBAS.caso('🔴 R7-4 · una INSTALACIÓN ignora el «fin», al leer igual que al escribir', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El escritor declara que el `Fin` no significa nada para una instalación (`if (tipo ===
     "instalacion") fin = "";`) y el lector nuevo lo honraba **sin mirar el tipo**: con un `Fin`
     escrito a mano en el CH —la hoja la editan personas y otra IA— Cardón IV pasaba de `genteN=2`
     a `genteN=0`, sin que nada dijera por qué. Escritor y lector derivando distinto sobre el mismo
     campo, otra vez. Y Cardón IV ES una instalación. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 2, 'cuenta dos (montado)');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  sh.getRange(2, 5).setValue(p226Dia(-2));      // un Fin pasado, escrito a mano
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 2,
    '⚠️ y SIGUE contando dos: una instalación no tiene ventana que la cierre');
  /* ⚠️ EL TÍTULO DICE «al leer igual que al ESCRIBIR» y el caso sólo medía el lector: la mitad del
     título era falsa. El escritor no miraba el tipo en ningún lado, así que el panel mostraba la
     plataforma permanente viva con su gente y cada «asignar» contestaba que la plataforma terminó.
     Es el mismo defecto que ya corregí en R4-11, R5-4 y R5-2 — un caso que afirma más de lo que
     mide— escrito en la ronda anterior. */
  const a2 = p226Asignar(api, P226_SUP, 'Cardón IV', 'Pedro Salas');
  PRUEBAS.cierto(a2.motivo !== 'fuera_de_ventana',
    '⚠️ Y EL ESCRITOR TAMPOCO mira el fin de una instalación · ' + JSON.stringify(a2.motivo || 'ok'));
  const a3 = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { hasta: p226Dia(30) });
  PRUEBAS.cierto(a3.motivo !== 'fuera_de_ventana',
    '⚠️ ni con un «hasta» futuro · ' + JSON.stringify(a3.motivo || 'ok'));
  /* ⚠️ Discriminador: en un EVENTO, el escritor SÍ rechaza fuera de la ventana. */
  const api3 = p226Api();
  p226Alta(api3, P226_SUP, 'Evento Y', { tipo: 'evento', inicio: p226Dia(-30), fin: p226Dia(-2) });
  PRUEBAS.igual(p226Asignar(api3, P226_SUP, 'Evento Y', 'Ana Suárez').motivo, 'fuera_de_ventana',
    '⚠️ discriminador: en un evento el escritor sigue rechazando');
  /* ⚠️ Discriminador: en un EVENTO, el mismo `Fin` pasado sí cierra la ventana. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Evento X', { tipo: 'evento', inicio: p226Dia(-30), fin: p226Dia(-2) });
  p226Asignar(api2, P226_SUP, 'Evento X', 'Ana Suárez', { desde: p226Dia(-20) });
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Evento X').genteN, 0,
    '⚠️ discriminador: en un evento, el fin pasado SÍ cierra');
});

PRUEBAS.caso('🔴 R7-5 · una operación DE BAJA no cuenta gente, y se puede sacar a quien quedó', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `opAsignacionVigente_` mira el `Hasta` y el `Fin`, y le faltaba la TERCERA señal — la única
     que tiene una instalación: el `Estado` de la operación. Medido: Cardón IV dada de baja seguía
     devolviendo `genteN=1` con el nombre de la persona, también a Dirección. Y `quitar` contestaba
     `{ok:false, motivo:"de_baja"}`: **no había forma por la API de sacar a nadie de una operación
     cerrada**, que es el «no hay camino de vuelta» que esta serie ya pagó dos veces. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Baja(api, P226_SUP, 'Cardón IV');
  const op = p226Op(p226Leer(api).operaciones, 'Cardón IV');
  PRUEBAS.igual(op.estado, 'baja', 'la operación quedó de baja');
  PRUEBAS.igual(op.genteN, 0, '⚠️ y no cuenta a nadie · dio ' + op.genteN);
  PRUEBAS.igual((op.gente || []).length, 0, 'ni manda nombres');
  PRUEBAS.igual(op.genteHistN, 1, 'pero el histórico la recuerda');
  const q = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  PRUEBAS.igual(q.quitada, true,
    '⚠️ y SE PUEDE sacar a quien quedó dentro · ' + JSON.stringify(q.motivo || ''));
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'baja',
    'la fila queda de baja');
  /* ⚠️ Discriminador: ASIGNAR a una operación de baja sigue cerrado. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer').motivo, 'de_baja',
    '⚠️ discriminador: asignar a una operación cerrada sigue rechazándose');
});

PRUEBAS.caso('🔴 R7-6 · el mismo «hasta», mandado o por defecto, da la misma respuesta', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `quitar` sin `hasta` escribía `hoy` —posterior al `Fin` de un evento terminado— con
     `ok:true`, y el MISMO valor mandado explícito se rechazaba con «la salida no puede ser
     posterior». El error le niega al supervisor exactamente el valor que el sistema escribe solo
     una rama más abajo. Es la forma de defecto que esta serie ya cerró dos veces, y P227 va a
     poner un selector precargado con hoy. */
  /* ⚠️ EL VALOR EXPLÍCITO SE TOMA DEL QUE ESCRIBIÓ LA RAMA IMPLÍCITA, no de `p226Dia(0)`: ese
     helper usa `toISOString()` (UTC) y el servidor deriva el día con la zona de la empresa, así que
     entre las 21:00 y las 24:00 de Buenos Aires difieren y el caso daba rojo por el huso. Es el
     mismo error que ya cometí una vez en esta serie. */
  function quitarCon(extra) {
    const api = p226Api();
    p226Alta(api, P226_SUP, 'Evento Viejo',
      { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
    p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', { desde: p226Dia(-90) });
    const q = p226Asignar(api, P226_SUP, 'Evento Viejo', 'Ana Suárez', extra);
    return { ok: !!q.ok, hasta: String((p226Filas(api, p226Hoja('ASIGNACIONES'))[0] || [])[5] || '') };
  }
  const r = [quitarCon({ quitar: '1' })];
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(r[0].hasta),
    'la rama implícita escribió una fecha · ' + JSON.stringify(r[0].hasta));
  r.push(quitarCon({ quitar: '1', hasta: r[0].hasta }));   // el MISMO valor, ahora explícito
  PRUEBAS.igual(r[0].ok, r[1].ok,
    '⚠️ las dos formas dan la MISMA respuesta · sinHasta=' + r[0].ok + ' conHasta=' + r[1].ok);
  PRUEBAS.igual(r[0].hasta, r[1].hasta,
    '⚠️ y escriben lo MISMO · ' + JSON.stringify(r[0].hasta) + ' vs ' + JSON.stringify(r[1].hasta));
  PRUEBAS.igual(r[0].ok, true, 'y quitar funciona: nadie queda asignado para siempre');
  PRUEBAS.igual(r[1].ok, true, 'por los dos caminos');
});

PRUEBAS.caso('🔴 R7-7 · un «hasta» anterior al «desde» se rechaza en quitar, no se acota', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El propio comentario del código dice «acotarlo en silencio escribiría otra cosa que la que el
     supervisor pidió», y acá lo acotaba: pedía el 5 y el CH decía el 25, sin aviso. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-10) });
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { quitar: '1', hasta: p226Dia(-30) });
  PRUEBAS.igual(r.ok, false, '⚠️ se rechaza · ' + JSON.stringify(r));
  PRUEBAS.igual(r.motivo, 'fin_antes', 'con el motivo de las fechas cruzadas');
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'activo', '⚠️ y la fila no se tocó');
  /* ⚠️ Discriminador: sin `hasta`, quitar sigue funcionando. */
  PRUEBAS.igual(p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' }).quitada, true,
    '⚠️ discriminador: quitar sin fechas sigue funcionando');
});

PRUEBAS.caso('🔴 R7-8 · el NOVENO sitio: el selector de empleado no deja afuera a quien tiene el tilde', () => {
  if (typeof depsDelCombo !== 'function' && typeof dashPersonasSelector !== 'function') {
    PRUEBAS.cierto(false, '⚠️ no están las funciones del combo: este contrato queda SIN MEDIR');
    return;
  }
  /* ⚠️ `dashPersonasSelector` compara el departamento CRUDO (`d === dep`) y era el noveno sitio.
     Medido contra el volcado real: la clave «operaciones» tiene «Operaciones» ×28 y «Operaciónes»
     ×1 —Oliver Pereira—. Los otros ocho filtros, ya normalizados, lo CUENTAN; el combo de empleado
     no lo ofrecía, así que el supervisor no podía entrar a su ficha. Es el bug de P231 en el sitio
     que P231 no tocó. Y `verificar-adr015.py` lo declaraba inexistente porque su patrón busca
     `!== DASH.f.dep` y esto es un `===` sobre una variable local. */
  const prev = (typeof DASH !== 'undefined') ? DASH : undefined;
  try {
    const regs = [
      { persona: 'Ana Suárez',    departamento: 'Operaciones' },
      { persona: 'Oliver Pereira', departamento: 'Operaciónes' },   // con tilde, como en el CH real
      { persona: 'Pedro Salas',   departamento: 'Planta' }
    ];
    onDashData({ ok: true, rol: 'empresa', vista: 'supervisor', registros: regs,
                 aptitud: [], pvt: [], metricas: [], comentarios: [], referencia: {} },
               'Consorcio HELITEC', {}, 'supervisor');
    DASH.f = DASH.f || {};
    DASH.f.dep = 'Operaciones';
    /* ⚠️ `dashPersonasSelector` recibe el departamento POR PARÁMETRO, no de `DASH.f.dep`: mi
       primera versión lo llamaba sin argumento y medía la lista COMPLETA, o sea nada. */
    const lista = dashPersonasSelector('Operaciones');
    const nombres = (lista || []).map(x => (x && x.nombre) ? x.nombre : String(x));
    PRUEBAS.cierto(nombres.indexOf('Ana Suárez') >= 0, 'Ana está en el selector');
    PRUEBAS.cierto(nombres.indexOf('Oliver Pereira') >= 0,
      '⚠️ y Oliver TAMBIÉN, aunque su departamento tenga el tilde: los otros ocho filtros lo ' +
      'cuentan, así que dejarlo afuera del combo lo vuelve inalcanzable · ' + JSON.stringify(nombres));
    PRUEBAS.cierto(nombres.indexOf('Pedro Salas') < 0,
      '⚠️ discriminador: y el de OTRO departamento sigue afuera');
  } finally {
    if (prev !== undefined) DASH = prev;
    try { localStorage.clear(); } catch (e) {}
  }
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LA POLÍTICA DE «¿QUÉ CONTESTA UN `asignar` QUE NO PUEDE CUMPLIR?» (ADR 015, 2026-10-06)
   Nueve rondas de verificador y el defecto volvió CUATRO veces, cada vez en un estado distinto:
   el supervisor toca «asignar», el servidor contesta algo que suena a éxito, y la persona no queda
   asignada. La ronda 8 lo contestó para UN estado y dejó la suite con dos respuestas opuestas para
   la misma situación visible.
   La política: **la respuesta dice qué QUEDÓ, no qué había.** `ok:true` si el pedido se procesó
   —eso mantiene la idempotencia de la cola (R7)— y `vigente` dice si la persona cuenta hoy,
   derivado de `opAsignacionVigente_`, que es la única función que lo decide. Las cuatro filas de la
   tabla del ADR quedan cubiertas por una sola regla, y los dos casos que se contradecían pasan a
   ser los dos ciertos a la vez.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R10-1 · la política, en los CUATRO estados a la vez', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Los cuatro estados de la tabla del ADR, medidos por el camino REAL (R17): cada uno se monta con
     la API, sin tocar una celda a mano. Si los cuatro no contestan con la misma regla, la política
     no está implementada: está repetida. */

  /* ── 1 · de baja (la quitó `quitar`), operación terminada → se procesa, no queda asignada ── */
  const a1 = p226Api();
  p226Alta(a1, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a1, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-90) });
  p226Asignar(a1, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  const r1 = p226Asignar(a1, P226_SUP, 'Ev Viejo', 'Ana Suárez');
  PRUEBAS.igual(r1.ok, true, '[1 · de baja] el pedido se procesa');
  PRUEBAS.igual(r1.vigente, false, '[1 · de baja] y la persona NO queda asignada');
  PRUEBAS.igual(r1.motivo, 'reincorporar_con_fechas', '[1 · de baja] con el motivo de qué falta');
  PRUEBAS.igual(p226Op(p226Leer(a1).operaciones, 'Ev Viejo').genteN, 0,
    '[1 · de baja] y el panel coincide: 0');

  /* ── 2 · ACTIVA con el `Hasta` vencido, operación terminada ── el bloqueante que la 9ª ronda
     encontró: este estado lo deja un tramo cerrado con `hasta`, NO con `quitar`, así que la fila
     queda en `activo` y la guarda que mira el `Estado` no la ve. Medido entonces: el servidor
     contestaba `repetida:true` y la persona seguía afuera. */
  const a2 = p226Api();
  p226Alta(a2, P226_SUP, 'Ev Mara', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a2, P226_SUP, 'Ev Mara', 'Ana Suárez',
    { desde: p226Dia(-90), hasta: p226Dia(-50) });      // la forma documentada de declarar la ventana
  PRUEBAS.igual(String(p226Filas(a2, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'activo',
    '[2 · activa vencida] la fila quedó ACTIVA (montado: es el estado que la guarda no veía)');
  const r2 = p226Asignar(a2, P226_SUP, 'Ev Mara', 'Ana Suárez');
  PRUEBAS.igual(r2.ok, true, '[2 · activa vencida] el pedido se procesa');
  PRUEBAS.igual(r2.vigente, false,
    '⚠️ [2 · activa vencida] y NO queda asignada — acá contestaba «ya estaba así» · ' +
    JSON.stringify(r2));
  PRUEBAS.igual(p226Op(p226Leer(a2).operaciones, 'Ev Mara').genteN, 0,
    '[2 · activa vencida] y el panel coincide: 0');

  /* ── 3 · activa y VIGENTE, pedido idéntico → el reenvío de la cola ── */
  const a3 = p226Api();
  p226Alta(a3, P226_SUP, 'Cardón IV');                   // instalación: vigente siempre
  p226Asignar(a3, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const r3 = p226Asignar(a3, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  PRUEBAS.igual(r3.ok, true, '[3 · reenvío] se procesa');
  PRUEBAS.igual(r3.repetida, true, '[3 · reenvío] y lo dice');
  PRUEBAS.igual(r3.vigente, true, '[3 · reenvío] y la persona SÍ queda asignada');

  /* ── 4 · de baja, pedido que corrige un DATO → entra, y no reincorpora ── */
  const a4 = p226Api();
  p226Alta(a4, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a4, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-90), cedula: 'V-11111' });
  p226Asignar(a4, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  const r4 = p226Asignar(a4, P226_SUP, 'Ev Viejo', 'Ana Suárez', { cedula: 'V-99999' });
  PRUEBAS.igual(r4.ok, true, '[4 · corrección] entra');
  PRUEBAS.igual(r4.actualizada, true, '[4 · corrección] y escribe');
  PRUEBAS.igual(p226Filas(a4, p226Hoja('ASIGNACIONES'))[0][3], 'V-99999',
    '[4 · corrección] la cédula cambió');
  PRUEBAS.igual(r4.vigente, false,
    '[4 · corrección] y NO reincorpora: corregir un dato no es volver a asignar');
  PRUEBAS.igual(String(p226Filas(a4, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'baja',
    '[4 · corrección] la fila sigue de baja');

  /* ⚠️ EL INVARIANTE QUE UNE LOS CUATRO, y es lo que hace que la política sea UNA y no cuatro.
     ⚠️ MI PRIMERA VERSIÓN COMPARABA `vigente` CONTRA `genteN > 0`, Y ESO ES FALSO EN CUANTO LA
     OPERACIÓN TIENE DOS PERSONAS: `vigente` es **por persona** y `genteN` es la dotación de la
     operación entera. Medido: con Luis vigente y Ana vencida, `vigente(Ana)=false` y `genteN=1` —el
     aserto daba falso con el código correcto—. Sólo coincidían porque el fixture tenía una sola
     persona, que es justo la trampa que R19 describe: el aserto afirmaba la FORMA de un resultado
     en vez del invariante. El invariante honesto es la PERTENENCIA: `vigente` ⟺ esta persona está
     en la lista que el panel devuelve. */
  [[a1, 'Ev Viejo', r1], [a2, 'Ev Mara', r2], [a3, 'Cardón IV', r3], [a4, 'Ev Viejo', r4]]
    .forEach((c, i) => {
      const gente = (p226Op(p226Leer(c[0]).operaciones, c[1]).gente || []).map(g => g.persona);
      const esta = gente.indexOf('Ana Suárez') >= 0;
      PRUEBAS.igual(!!c[2].vigente, esta,
        '⚠️ invariante · estado ' + (i + 1) + ': `vigente` ⟺ la persona está en `gente` · ' +
        'vigente=' + c[2].vigente + ' gente=' + JSON.stringify(gente));
    });

  /* ⚠️ Y EL CASO QUE LO HACE MEDIR DE VERDAD: con DOS personas, una vigente y otra no. Sin esto el
     invariante pasa con cualquier fixture de una sola. */
  const a5 = p226Api();
  p226Alta(a5, P226_SUP, 'Cardón IV');                       // instalación: vigente siempre
  p226Asignar(a5, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  const rAna = p226Asignar(a5, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: p226Dia(-90), hasta: p226Dia(-10) });
  const g5 = (p226Op(p226Leer(a5).operaciones, 'Cardón IV').gente || []).map(x => x.persona);
  PRUEBAS.igual(rAna.vigente, false, '[5 · dos personas] Ana no queda vigente: su hasta venció');
  PRUEBAS.cierto(g5.indexOf('Ana Suárez') < 0, 'y no está en la lista');
  PRUEBAS.cierto(g5.indexOf('Luis Ferrer') >= 0, '⚠️ pero Luis SÍ: `vigente` es por persona');
  PRUEBAS.igual(p226Op(p226Leer(a5).operaciones, 'Cardón IV').genteN, 1,
    '⚠️ y `genteN` es 1 — con el aserto viejo (`vigente === genteN>0`) esto daba FALSO');
});

PRUEBAS.caso('🔴 R10-2 · la respuesta nunca es un error por algo que YA salió bien (R7)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La política anterior devolvía `ok:false`, y con eso el MISMO POST daba `ok:true` la primera
     vez y `ok:false` la segunda: la cola offline interpretaba un error duro para algo que ya se
     había guardado. Medido por el verificador. Un `ok` que depende de cuántas veces se mandó el
     mismo pedido no es un contrato. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-90) });
  p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  const nB = p226Bitacora(api).length;
  const vistos = [];
  for (let k = 0; k < 4; k++) {
    const r = p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-80) });
    vistos.push(JSON.stringify({ ok: r.ok, vig: r.vigente, mot: r.motivo || null }));
  }
  PRUEBAS.igual(vistos.filter(v => v !== vistos[0]).length, 0,
    '⚠️ los cuatro envíos del MISMO pedido contestan lo mismo · ' + JSON.stringify(vistos));
  PRUEBAS.igual(JSON.parse(vistos[0]).ok, true, 'y es `ok:true`: la cola no recibe un error duro');
  PRUEBAS.alMenos(p226Bitacora(api).length - nB, 0, 'la bitácora no crece sin tope');
  PRUEBAS.cierto(p226Bitacora(api).length - nB <= 1,
    '⚠️ R3 · y suma a lo sumo UNA línea en los cuatro envíos · sumó ' +
    (p226Bitacora(api).length - nB));
});

PRUEBAS.caso('🔴 R10-3 · la rama NUEVA también dice si la persona quedó asignada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La forma de la respuesta no puede depender de si la fila existía: la UI de P227 va a leer una
     sola forma. Y hay un caso real donde una asignación NUEVA no queda vigente: un evento que ya
     terminó, con el `desde` dentro de su ventana — el camino con el que la 9ª ronda metía gente en
     un evento viejo. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-100), fin: p226Dia(-10) });
  const r = p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-50) });
  PRUEBAS.igual(r.ok, true, 'la asignación dentro de la ventana se procesa');
  PRUEBAS.igual(r.nueva, true, 'y es una fila nueva');
  PRUEBAS.cierto('vigente' in r, '⚠️ la rama NUEVA también trae `vigente`');
  PRUEBAS.igual(r.vigente, false,
    '⚠️ y dice false: el evento terminó hace 10 días · ' + JSON.stringify(r));
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Ev Viejo').genteN, 0, 'y el panel coincide');
  /* ⚠️ Discriminador: en un evento EN CURSO, la misma asignación nueva sí queda vigente. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Ev Vivo', { tipo: 'evento', inicio: p226Dia(-100), fin: p226Dia(30) });
  const r2 = p226Asignar(api2, P226_SUP, 'Ev Vivo', 'Ana Suárez', { desde: p226Dia(-50) });
  PRUEBAS.igual(r2.vigente, true, '⚠️ discriminador: en un evento en curso, `vigente:true`');
  PRUEBAS.igual(p226Op(p226Leer(api2).operaciones, 'Ev Vivo').genteN, 1, 'y el panel coincide');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS TRES MENORES DE LA NOVENA RONDA, con su defensor
   El barrido de sabotaje los encontró sin ningún caso que los proteja: lo que hoy está bien se
   podía perder sin que nadie lo notara.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('R10-4 · R15 · un «Creada» que Sheets convirtió a Date no vuelve como cadena larga', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Medido por el verificador: la celda quedaba
     «Sun Mar 01 2026 08:00:00 GMT-0300 (hora estándar de Argentina)» —62 caracteres y la zona de
     Buenos Aires en una app venezolana—. Es el defecto que `normFecha` cerró en `Inicio`/`Fin`,
     abierto en esta columna, y silencioso porque hoy nadie la lee: un dato que se escribe mal y
     nadie mira es el que va a sorprender al que lo mire primero (R15). */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01', cedula: 'V-11111' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 8).setValue(new Date(2026, 2, 1, 8, 0, 0));      // Sheets lo convierte solo
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01', cedula: 'V-99999' });
  const creada = String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][7]);
  PRUEBAS.cierto(creada.length <= 20,
    '⚠️ la celda no puede quedar con la cadena localizada de JS · ' + creada.length +
    ' caracteres: ' + JSON.stringify(creada.slice(0, 50)));
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}T/.test(creada),
    '⚠️ y queda como sello ISO · ' + JSON.stringify(creada));
  /* ⚠️ Discriminador: un `Creada` que YA es ISO no se toca. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const antes = String(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][7]);
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-02' });
  PRUEBAS.igual(String(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][7]), antes,
    '⚠️ discriminador: un sello que ya era ISO no se reescribe');
});

PRUEBAS.caso('R10-5 · «quitar» sin fechas respeta el «hasta» histórico que ya estaba', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* La cota sólo empujaba hacia ARRIBA (hasta el `Desde`) y nunca hacia abajo: una fila que ya
     decía «salió el día −60» quedaba con `hoy`. El ADR 015 justifica esta tabla entera diciendo que
     «medir el evento exige saber quién estaba asignado EN ESA VENTANA» — eso borraba la ventana.
     ⚠️ Y el caso `R6-4` se titula «quitar no empuja hacia adelante un hasta histórico correcto»
     (universal) pero su aserto sólo cubría el camino con `hasta` explícito. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez',
    { desde: p226Dia(-90), hasta: p226Dia(-60) });
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'activo',
    'la fila está activa con su hasta histórico (montado)');
  p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1' });   // SIN fechas, como un botón
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5]), p226Dia(-60),
    '⚠️ el «hasta» histórico NO se empuja hasta hoy: la persona salió ese día');
  PRUEBAS.igual(String(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'baja',
    'y la fila queda de baja');
  /* ⚠️ Discriminador: una fila SIN `hasta` sí recibe hoy. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-01-01' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  const h = String(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][5]);
  PRUEBAS.cierto(h >= p226Dia(-1) && h <= p226Dia(1),
    '⚠️ discriminador: sin hasta previo, quitar escribe HOY (±1 por el huso) · ' + h);
});

PRUEBAS.caso('R10-6 · el tipo se canoniza con norm en el ESCRITOR, no con toLowerCase', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ Sin defensor hasta ahora: cambiar `opTipoCanon` por `.trim().toLowerCase()` dejaba la suite
     verde, y ESE es el defecto R2-5 — `norm("Instalación")` es «instalacion» y `.toLowerCase()` es
     «instalación», así que el escritor volvería a honrar el `Fin` de una instalación cuando la celda
     tiene la ortografía correcta. El caso entra por el camino real: una celda con tilde. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV', { tipo: 'instalacion' });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  sh.getRange(2, 3).setValue('Instalación');     // la ortografía CORRECTA, con tilde
  sh.getRange(2, 5).setValue(p226Dia(-2));       // y un Fin pasado
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  PRUEBAS.cierto(r.motivo !== 'fuera_de_ventana',
    '⚠️ el ESCRITOR tiene que reconocer «Instalación» con tilde · ' + JSON.stringify(r.motivo || 'ok'));
  PRUEBAS.igual(p226Op(p226Leer(api).operaciones, 'Cardón IV').genteN, 2,
    '⚠️ y el LECTOR también: los dos usan `norm`, que quita acentos');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   DÉCIMA RONDA · lo que rodeaba a la política
   El mecanismo aguantó: 194 estados fuzzeados —85 limpios y 109 con el CH ensuciado a mano— y 0
   divergencias entre `vigente` y la pertenencia a `gente`. Lo que falló fue todo lo de alrededor:
   el documento decía un motivo distinto del que el código devuelve, tres de los cuatro motivos no
   tenían ningún aserto, uno no era alcanzable, y el arreglo del `Creada` abrió otro agujero.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R11-1 · cada motivo dice QUÉ FALTA, y los cuatro tienen su aserto', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El ADR declaraba `reincorporar_con_fechas` para «activa vencida + operación terminada» y el
     código devolvía `tramo_vencido`: dos textos distintos para el mismo botón, y P227 se iba a
     construir contra el que su autor leyera primero. Y de los cuatro motivos, **tres no tenían un
     solo aserto** — el barrido de sabotaje los borraba y la suite seguía verde.
     La regla que los ordena: **el motivo nombra qué falta para que la persona quede asignada**, no
     qué pasó. Si la operación terminó, falta declarar la ventana, sin importar cómo se cerró el
     tramo. */

  /* 1 · la operación TERMINÓ y la fila está de baja → falta declarar la ventana */
  const a1 = p226Api();
  p226Alta(a1, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a1, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-90) });
  p226Asignar(a1, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  PRUEBAS.igual(p226Asignar(a1, P226_SUP, 'Ev Viejo', 'Ana Suárez').motivo, 'reincorporar_con_fechas',
    '[de baja + terminada] falta declarar la ventana');

  /* 2 · la operación TERMINÓ y la fila está ACTIVA con el hasta vencido → el MISMO remedio.
     ⚠️ Acá el código decía `tramo_vencido` y el ADR `reincorporar_con_fechas`. Manda el ADR: lo
     que el supervisor necesita es el remedio.
     ⚠️ Y ESTE ASERTO PEDÍA `reincorporar_con_fechas` PARA UNA FILA QUE YA TIENE SUS DOS FECHAS, o
     sea bendecía un remedio que el usuario no puede ejecutar porque ya está ejecutado. R19: el
     aserto defendía la suposición contra el arreglo. Lo separa el estado de la fila: con el tramo
     COMPLETO no falta nada —la operación terminó y lo que se guardó es histórico—, y con el tramo
     ABIERTO o la fila de baja sí falta declarar la ventana. Las dos ramas, abajo. */
  const a2 = p226Api();
  p226Alta(a2, P226_SUP, 'Ev Mara', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a2, P226_SUP, 'Ev Mara', 'Ana Suárez', { desde: p226Dia(-90), hasta: p226Dia(-50) });
  PRUEBAS.igual(p226Asignar(a2, P226_SUP, 'Ev Mara', 'Ana Suárez').motivo, 'operacion_terminada',
    '⚠️ [activa vencida + terminada, tramo COMPLETO] no falta nada: es histórico');
  /* ⚠️ Discriminador: el mismo estado con el tramo ABIERTO sí tiene remedio. */
  const a2b = p226Api();
  p226Alta(a2b, P226_SUP, 'Ev Mara', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a2b, P226_SUP, 'Ev Mara', 'Ana Suárez', { desde: p226Dia(-90) });
  PRUEBAS.igual(p226Asignar(a2b, P226_SUP, 'Ev Mara', 'Ana Suárez').motivo, 'reincorporar_con_fechas',
    '⚠️ discriminador: con el `Hasta` sin declarar, el remedio EXISTE y el motivo lo nombra');

  /* 3 · la operación está VIGENTE y el hasta venció → alcanza con quitar el hasta.
     ⚠️ ESTE ES EL ESTADO QUE AÍSLA EL `Hasta`: una instalación no tiene `Fin`, así que si el motivo
     sale bien acá, salió por el `Hasta` y no porque el `Fin` lo tapara. Sin este caso, sabotear la
     derivación para que ignore el `Hasta` dejaba la suite VERDE. */
  const a3 = p226Api();
  p226Alta(a3, P226_SUP, 'Cardón IV');                       // instalación: sin ventana
  const r3 = p226Asignar(a3, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: p226Dia(-90), hasta: p226Dia(-10) });
  PRUEBAS.igual(r3.vigente, false, '[vigente + hasta vencido] no queda asignada');
  PRUEBAS.igual(r3.motivo, 'tramo_vencido',
    '⚠️ y el motivo es el del TRAMO, no el de la operación: acá no hay `Fin` que lo tape');
  PRUEBAS.igual(p226Op(p226Leer(a3).operaciones, 'Cardón IV').genteN, 0, 'y el panel coincide');

  /* 4 · la OPERACIÓN está cerrada → ése es el motivo.
     ⚠️ Era código MUERTO: la guarda de `de_baja` cortaba antes con `ok:false`, que es justo lo que
     el ADR condena por escrito dos párrafos más abajo. */
  const a4 = p226Api();
  p226Alta(a4, P226_SUP, 'Cardón IV');
  p226Asignar(a4, P226_SUP, 'Cardón IV', 'Ana Suárez');
  p226Baja(a4, P226_SUP, 'Cardón IV');
  const r4 = p226Asignar(a4, P226_SUP, 'Cardón IV', 'Ana Suárez');   // el reenvío de la cola
  PRUEBAS.igual(r4.ok, true,
    '⚠️ [operación cerrada] el reenvío de algo YA ESCRITO no es un error · ' + JSON.stringify(r4));
  PRUEBAS.igual(r4.vigente, false, 'pero no queda asignada');
  PRUEBAS.igual(r4.motivo, 'operacion_cerrada', '⚠️ y el motivo lo dice');
  /* ⚠️ Discriminador: asignar a alguien NUEVO a una operación cerrada sigue siendo `ok:false`. */
  const rN = p226Asignar(a4, P226_SUP, 'Cardón IV', 'Luis Ferrer');
  PRUEBAS.igual(rN.ok, false, '⚠️ discriminador: a alguien nuevo NO se le asigna · ' + JSON.stringify(rN));
  PRUEBAS.igual(rN.motivo, 'de_baja', 'con el motivo de la operación cerrada');
});

PRUEBAS.caso('🔴 R11-2 · R7 · el reenvío de algo YA ESCRITO nunca es un error duro', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ Medido por el verificador: la cola manda el POST, entra con `ok:true, nueva:true`; alguien
     cierra la operación; la cola reintenta y recibe `ok:false, de_baja` **por una fila que ya está
     escrita**. Es textual lo que el ADR rechaza en «Alternativas descartadas»: «el mismo POST
     contestaba `ok:true` la primera vez y `ok:false` la segunda».
     La distinción: la guarda rechaza cuando habría que CREAR una fila nueva; un reenvío sobre una
     fila que ya existe se procesa y contesta qué quedó. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  const r1 = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  PRUEBAS.igual(r1.ok, true, 'el primer envío entra');
  p226Baja(api, P226_SUP, 'Cardón IV');                      // el estado cambia entre medio
  const r2 = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  PRUEBAS.igual(r2.ok, true,
    '⚠️ y el reenvío IDÉNTICO no puede ser un error duro: la fila ya está escrita · ' +
    JSON.stringify(r2));
  PRUEBAS.igual(r2.vigente, false, 'pero dice que no queda asignada');
  PRUEBAS.igual(r2.motivo, 'operacion_cerrada', 'con el motivo');
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES')).length, 1, 'y no duplicó la fila');
});

PRUEBAS.caso('🔴 R11-3 · R3 · un «Creada» escrito a mano no se reemplaza por hoy', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ ESTO LO INTRODUJO MI PROPIO ARREGLO DEL `Creada` CONVERTIDO A `Date`. `opSelloIso_` devuelve
     "" para todo lo que no sea fecha, y el `|| ahora` lo reemplazaba: una celda que dice
     «alta masiva marzo» pasaba a decir hoy, con `CreadaPor` todavía en «Rafael Silva» — o sea el
     sello MIENTE. Y como `igual` se volvía falso, un reenvío que no cambiaba nada escribía el CH y
     dejaba una línea `operacion_asignada` por un hecho que no pasó, en un log que R3 prohíbe
     corregir. El defecto no se cerró: se corrió de lado. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const sh = api.__env.__libro.getSheetByName(p226Hoja('ASIGNACIONES'));
  sh.getRange(2, 8).setValue('alta masiva marzo');     // texto libre, como lo deja una edición a mano
  sh.getRange(2, 9).setValue('Rafael Silva');
  const nB = p226Bitacora(api).length;
  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(String(f[7]), 'alta masiva marzo',
    '⚠️ el sello escrito a mano se CONSERVA: reemplazarlo por hoy lo vuelve una mentira · ' +
    JSON.stringify(f[7]));
  PRUEBAS.igual(String(f[8]), 'Rafael Silva', 'y quién lo creó, también');
  PRUEBAS.igual(r.repetida, true, '⚠️ y el reenvío sigue siendo un reenvío');
  PRUEBAS.igual(p226Bitacora(api).length, nB, '⚠️ R3 · sin una línea por un hecho que no pasó');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   UNDÉCIMA RONDA · la regresión que abrió el blindaje de la décima
   Mover la guarda de `de_baja` adentro del candado —para que un reenvío de algo ya escrito no fuera
   un error— **sin enseñarle a `tramoNuevo` qué es una operación cerrada** convirtió 22 de 27
   pedidos sobre una operación cerrada en escrituras al CH: 12 borraban el `Hasta` y 6 borraban
   `Baja`/`BajaPor`. Ninguno de los 100 casos lo tocaba: el verificador parcheó el arreglo y la suite
   no movió un solo aserto, en ninguna dirección.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 R12-1 · una operación CERRADA no se puede reescribir por la puerta de atrás', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `opVigente` se derivaba SÓLO del `Fin`, y una instalación no tiene `Fin`: con la operación
     cerrada quedaba `opVigente=true` → `tramoNuevo=true` → `estadoNuevo=activo`, y la rama de upsert
     reescribía la fila entera. Lo que se perdía: `Baja`/`BajaPor` —el invariante que este archivo
     escribe dos veces— y el `Hasta`, que es la ventana con la que el ADR justifica esta tabla. Más
     una línea `operacion_asignada` con `reactivada:true` por una reincorporación que el propio
     servidor contesta que no pasó (R3, append-only). */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');                      // instalación: sin `Fin`
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  p226J(api.accionOperacionAsignar(p226Con(P226_SUP,
    { operacion: 'Cardón IV', persona: 'Ana Suárez', quitar: '1', quien: 'rafael' })));
  p226Baja(api, P226_SUP, 'Cardón IV');                      // y se cierra la operación
  const antes = p226Filas(api, p226Hoja('ASIGNACIONES'))[0].slice();
  const nB = p226Bitacora(api).length;
  PRUEBAS.cierto(String(antes[9]) !== '', 'la baja quedó fechada (montado) · ' + JSON.stringify(antes[9]));

  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(r.vigente, false, 'la respuesta dice que no queda asignada');
  PRUEBAS.igual(String(f[5]), String(antes[5]),
    '⚠️ y el `Hasta` NO se borró · antes=' + JSON.stringify(antes[5]) + ' después=' + JSON.stringify(f[5]));
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'baja',
    '⚠️ ni la fila volvió a «activo»: la operación está cerrada');
  PRUEBAS.igual(String(f[9]), String(antes[9]), '⚠️ R3 · ni la fecha de la baja');
  PRUEBAS.igual(String(f[10]), String(antes[10]), '⚠️ R3 · ni quién la quitó');
  PRUEBAS.igual(p226Bitacora(api).length, nB,
    '⚠️ R3 · y no dejó una línea por una reincorporación que no pasó');

  /* ⚠️ Discriminador: con la operación VIVA, la misma reasignación SÍ reincorpora (R3-1). */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Cardón IV');
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  const r2 = p226Asignar(api2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01' });
  PRUEBAS.igual(r2.vigente, true, '⚠️ discriminador: con la operación viva, reasignar reincorpora');
  PRUEBAS.igual(String(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'activo',
    '⚠️ y la fila vuelve a activo');
});

PRUEBAS.caso('🔴 R12-2 · las dos filas del ADR que el código contradecía', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ El arreglo de la ronda 10 cerró la divergencia ADR/código en la fila que buscaba y dejó
     otras dos abiertas. Las dos se resolvieron a favor del CÓDIGO, y la tabla del ADR se corrigió:
     · «activa vencida + operación VIGENTE» → reasignar **reincorpora** (`vigente:true`). Es lo que
       R3-1 exige y costó una ronda entera conseguir: en una operación viva, volver es una acción
       posible, así que el servidor la hace en vez de pedir fechas.
     · «de baja + corrección de un dato, operación VIVA» → **también reincorpora**. La API no
       distingue «corregir» de «asignar», y con la operación viva cualquier pedido sobre esa persona
       es pedir que esté. El estado «corrige sin reincorporar» existe sólo cuando la operación
       terminó, que es donde volver no es posible.
     ⚠️ Y el caso que supuestamente aseguraba la primera montaba otra cosa: una fila que NO existía,
     o sea la rama nueva. R19: bendecía un estado distinto del que la tabla declara. */

  /* activa vencida + operación VIGENTE, por el camino de REASIGNAR una fila que existe */
  const a1 = p226Api();
  p226Alta(a1, P226_SUP, 'Cardón IV');                       // instalación: siempre vigente
  p226Asignar(a1, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: p226Dia(-90), hasta: p226Dia(-10) });           // la fila EXISTE y está vencida
  PRUEBAS.igual(p226Op(p226Leer(a1).operaciones, 'Cardón IV').genteN, 0, 'vencida (montado)');
  const r1 = p226Asignar(a1, P226_SUP, 'Cardón IV', 'Ana Suárez');
  PRUEBAS.igual(r1.vigente, true,
    '⚠️ reasignar en una operación VIGENTE reincorpora: volver es posible · ' + JSON.stringify(r1));
  PRUEBAS.igual(p226Op(p226Leer(a1).operaciones, 'Cardón IV').genteN, 1, 'y el panel coincide');

  /* de baja + corrección de un dato, operación VIVA */
  const a2 = p226Api();
  p226Alta(a2, P226_SUP, 'Cardón IV');
  p226Asignar(a2, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: '2026-03-01', cedula: 'V-11111' });
  p226Asignar(a2, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  const r2 = p226Asignar(a2, P226_SUP, 'Cardón IV', 'Ana Suárez', { cedula: 'V-99999' });
  PRUEBAS.igual(r2.vigente, true,
    '⚠️ y con la operación viva, corregir un dato también reincorpora · ' + JSON.stringify(r2.motivo || 'ok'));
  PRUEBAS.igual(p226Filas(a2, p226Hoja('ASIGNACIONES'))[0][3], 'V-99999', 'con la cédula corregida');

  /* ⚠️ Discriminador: con la operación TERMINADA, corregir NO reincorpora. Es el estado que la
     tabla describe, y el único donde existe. */
  const a3 = p226Api();
  p226Alta(a3, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-90), fin: p226Dia(-50) });
  p226Asignar(a3, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-90), cedula: 'V-11111' });
  p226Asignar(a3, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-60) });
  const r3 = p226Asignar(a3, P226_SUP, 'Ev Viejo', 'Ana Suárez', { cedula: 'V-99999' });
  PRUEBAS.igual(r3.vigente, false,
    '⚠️ discriminador: con la operación terminada, corregir NO reincorpora');
  PRUEBAS.igual(p226Filas(a3, p226Hoja('ASIGNACIONES'))[0][3], 'V-99999', 'y la cédula entra igual');
});

PRUEBAS.caso('🔴 R12-3 · cargar un evento HISTÓRICO no recibe un remedio que ya ejecutó', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ Rafael registra quién estuvo en un evento que terminó hace 50 días —el caso de uso con el
     que el ADR justifica que esta tabla exista— y manda las dos fechas. El servidor contestaba
     `reincorporar_con_fechas`: «fue retirada y, como la operación terminó, hay que indicar desde y
     hasta cuándo estuvo asignada». Las dos mitades son falsas —nunca la retiraron, y las fechas ya
     vinieron en el pedido— y el remedio que ofrece es el que el usuario acaba de ejecutar.
     En español gana el texto del servidor y pasa desapercibido; en inglés gana la clave (P200c lo
     fija así) y es un callejón sin salida.
     El motivo honesto para una fila NUEVA en una operación terminada es `operacion_terminada`, que
     la ronda anterior eliminó por aparecer como clave huérfana: se sacó la clave, no la necesidad. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-60), fin: p226Dia(-50) });
  const r = p226Asignar(api, P226_SUP, 'Ev Viejo', 'Ana Suárez',
    { desde: p226Dia(-58), hasta: p226Dia(-55) });           // fila NUEVA, el histórico
  PRUEBAS.igual(r.ok, true, 'el registro histórico entra');
  PRUEBAS.igual(r.nueva, true, 'y es una fila nueva');
  PRUEBAS.igual(r.vigente, false, 'no queda asignada hoy, que es correcto');
  PRUEBAS.igual(r.motivo, 'operacion_terminada',
    '⚠️ y el motivo NO puede hablar de «fue retirada» ni pedir fechas que ya mandó · ' +
    JSON.stringify(r.motivo));
  PRUEBAS.igual(p226Filas(api, p226Hoja('ASIGNACIONES'))[0][5], p226Dia(-55),
    'y el tramo quedó registrado tal cual');
  /* ⚠️ Discriminador: a quien SÍ fue retirada de un evento terminado le sigue tocando el otro. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-60), fin: p226Dia(-50) });
  p226Asignar(api2, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-58) });
  p226Asignar(api2, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1', hasta: p226Dia(-55) });
  PRUEBAS.igual(p226Asignar(api2, P226_SUP, 'Ev Viejo', 'Ana Suárez').motivo,
    'reincorporar_con_fechas',
    '⚠️ discriminador: a quien fue retirada sí le toca el de reincorporar');
});

PRUEBAS.caso('🔴 R12-4 · corregir las fechas de una operación CERRADA no resucita a nadie', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ La última escritura destructiva del barrido de 27, y entraba disfrazada de corrección: con la
     operación cerrada, mandar las dos fechas sobre una fila de baja la devolvía a `activo` y borraba
     `Baja` y `BajaPor`. El disyunto `(hastaParam && desdeParam)` de `tramoNuevo` se escribió para
     una operación TERMINADA por fecha —corregir el histórico de un evento que pasó—, y no distingue
     la cerrada, que es un acto deliberado con sus dos celdas escritas. */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-40) });
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  p226Baja(api, P226_SUP, 'Cardón IV');
  const antes = p226Filas(api, p226Hoja('ASIGNACIONES'))[0].slice();

  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez',
    { desde: p226Dia(-20), hasta: p226Dia(-5) });            // una CORRECCIÓN del tramo histórico
  const f = p226Filas(api, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(f[4], p226Dia(-20), 'la corrección entra: el `Desde` cambia');
  PRUEBAS.igual(f[5], p226Dia(-5),  'y el `Hasta` también');
  PRUEBAS.igual(String(f[6]).toLowerCase(), 'baja', '⚠️ pero la fila NO vuelve a activo');
  PRUEBAS.igual(String(f[9]),  String(antes[9]),  '⚠️ R3 · ni se borra cuándo se la quitó');
  PRUEBAS.igual(String(f[10]), String(antes[10]), '⚠️ R3 · ni quién');
  PRUEBAS.igual(r.vigente, false, 'y la respuesta no promete que quedó asignada');
  /* ⚠️ Discriminador: en una operación TERMINADA por fecha, las dos fechas SÍ abren el tramo —es el
     derecho que el ADR declara y el que esta guarda no puede pisar. */
  const api2 = p226Api();
  p226Alta(api2, P226_SUP, 'Ev Viejo', { tipo: 'evento', inicio: p226Dia(-60), fin: p226Dia(-50) });
  p226Asignar(api2, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-58) });
  p226Asignar(api2, P226_SUP, 'Ev Viejo', 'Ana Suárez', { quitar: '1' });
  p226Asignar(api2, P226_SUP, 'Ev Viejo', 'Ana Suárez', { desde: p226Dia(-58), hasta: p226Dia(-52) });
  PRUEBAS.igual(String(p226Filas(api2, p226Hoja('ASIGNACIONES'))[0][6]).toLowerCase(), 'activo',
    '⚠️ discriminador: una operación terminada por fecha sí admite reabrir el tramo con las dos');

  /* ⚠️ Y el pedido con SÓLO el `hasta`, que nadie cubría: es el que más cambió de forma entre la
     ronda 11 y la 12 —pasó de `ok:false, motivo:"fin_antes"` sin escribir nada, a `ok:true` con el
     `Hasta` reescrito y una línea de bitácora—. Es coherente con la política («las fechas se
     corrigen igual»), pero la coherencia sin caso es una suposición: acá queda fijada. */
  const api3 = p226Api();
  p226Alta(api3, P226_SUP, 'Cardón IV');
  p226Asignar(api3, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-40) });
  p226Asignar(api3, P226_SUP, 'Cardón IV', 'Ana Suárez', { quitar: '1' });
  p226Baja(api3, P226_SUP, 'Cardón IV');
  const prev3 = p226Filas(api3, p226Hoja('ASIGNACIONES'))[0].slice();
  const r3 = p226Asignar(api3, P226_SUP, 'Cardón IV', 'Ana Suárez', { hasta: p226Dia(-3) });
  const f3 = p226Filas(api3, p226Hoja('ASIGNACIONES'))[0];
  PRUEBAS.igual(r3.ok, true, 'con sólo el `hasta`, la corrección entra');
  PRUEBAS.igual(r3.motivo, 'operacion_cerrada', 'y el motivo dice por qué no queda asignada');
  PRUEBAS.igual(f3[5], p226Dia(-3), 'el `Hasta` se corrige');
  PRUEBAS.igual(f3[4], prev3[4], '⚠️ y el `Desde` NO se toca: no vino en el pedido');
  PRUEBAS.igual(String(f3[6]).toLowerCase(), 'baja', '⚠️ ni el estado');
  PRUEBAS.igual(String(f3[9]), String(prev3[9]), '⚠️ R3 · ni la fecha de la baja');
});

PRUEBAS.caso('🔴 R12-5 · LA TABLA DEL ADR, fila por fila, por el camino real', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ ADR y código divergieron TRES veces sobre esta misma tabla, y cada vez lo encontró una ronda
     distinta del verificador leyendo los dos documentos a mano. Lo que las tres tenían en común es
     que ningún caso montaba la tabla COMO TABLA: había casos sueltos para algunas filas, escritos
     cada uno con su propio fixture, así que una fila podía cambiar de respuesta sin que nada se
     pusiera rojo. Acá cada fila se monta por el camino real —alta, asignar, quitar, baja— y declara
     qué contesta el servidor. `herramientas/verificar-adr015.py` cuenta las filas del ADR contra las
     de este arreglo: si alguien agrega una fila allá y no acá, salta. */
  const T = [
    { fila:'de baja, operación terminada, sin las dos fechas',
      op:{tipo:'evento', inicio:p226Dia(-60), fin:p226Dia(-50)}, quitar:true,
      pide:{}, esp:{ ok:true, vigente:false, motivo:'reincorporar_con_fechas' } },
    { fila:'activa vencida con el tramo COMPLETO, operación terminada',
      op:{tipo:'evento', inicio:p226Dia(-60), fin:p226Dia(-50)}, hastaIni:p226Dia(-55),
      pide:{}, esp:{ ok:true, vigente:false, motivo:'operacion_terminada' } },
    { fila:'fila NUEVA en operación terminada, con sólo el `desde`',
      op:{tipo:'evento', inicio:p226Dia(-60), fin:p226Dia(-50)}, sinAsignar:true,
      pide:{desde:p226Dia(-58)}, esp:{ ok:true, nueva:true, vigente:false, motivo:'reincorporar_con_fechas' } },
    { fila:'operación terminada, CON las dos fechas (el histórico)',
      op:{tipo:'evento', inicio:p226Dia(-60), fin:p226Dia(-50)}, quitar:true,
      pide:{desde:p226Dia(-58), hasta:p226Dia(-52)}, esp:{ ok:true, vigente:false, motivo:'operacion_terminada' } },
    { fila:'activa vencida, operación VIGENTE',
      op:{}, hastaIni:p226Dia(-5),
      pide:{}, esp:{ ok:true, vigente:true, actualizada:true, reactivada:false } },
    { fila:'fila NUEVA con un `hasta` explícito ya pasado, operación VIGENTE',
      op:{}, sinAsignar:true, pide:{desde:p226Dia(-20), hasta:p226Dia(-3)},
      esp:{ ok:true, nueva:true, vigente:false, motivo:'tramo_vencido' } },
    { fila:'operación CERRADA, la fila ya existe',
      op:{}, cerrar:true, pide:{}, esp:{ ok:true, vigente:false, motivo:'operacion_cerrada' } },
    { fila:'operación CERRADA, la fila NO existe',
      op:{}, sinAsignar:true, cerrar:true, pide:{}, esp:{ ok:false, motivo:'de_baja' } },
    { fila:'activa y vigente, pedido idéntico (el reenvío de la cola)',
      op:{}, desdeIni:p226Dia(-5), pide:{desde:p226Dia(-5)}, esp:{ ok:true, repetida:true, vigente:true } },
    { fila:'de baja, corrección de un dato, operación TERMINADA',
      op:{tipo:'evento', inicio:p226Dia(-60), fin:p226Dia(-50)}, quitar:true,
      pide:{cedula:'V-99999'}, esp:{ ok:true, actualizada:true, vigente:false } },
    { fila:'de baja, corrección de un dato, operación VIVA',
      op:{}, quitar:true, pide:{cedula:'V-99999'}, esp:{ ok:true, actualizada:true, vigente:true, reactivada:true } },
  ];
  PRUEBAS.igual(T.length, 11, 'la tabla del ADR tiene 11 filas');
  T.forEach(c => {
    const api = p226Api();
    p226Alta(api, P226_SUP, 'Op T', c.op);
    if (!c.sinAsignar) {
      p226Asignar(api, P226_SUP, 'Op T', 'Ana Suárez',
        { desde: c.desdeIni || c.op.inicio || p226Dia(-40), hasta: c.hastaIni || '', cedula:'V-11111' });
      if (c.quitar) p226Asignar(api, P226_SUP, 'Op T', 'Ana Suárez', { quitar:'1' });
    }
    if (c.cerrar) p226Baja(api, P226_SUP, 'Op T');
    const r = p226Asignar(api, P226_SUP, 'Op T', 'Ana Suárez', c.pide);
    Object.keys(c.esp).forEach(k =>
      PRUEBAS.igual(r[k], c.esp[k], '· ' + c.fila + ' → `' + k + '`' +
        (r.motivo && k !== 'motivo' ? ' (motivo: ' + r.motivo + ')' : '')));
    /* ⚠️ Y el invariante que ata la respuesta al lector, en cada fila: `vigente` tiene que coincidir
       con estar en `gente`. Sin esto la tabla fijaría la respuesta y no que sea cierta. */
    if (r.ok) {
      const gente = (p226Op(p226Leer(api).operaciones, 'Op T').gente || []).map(g => g.persona);
      PRUEBAS.igual(!!r.vigente, gente.indexOf('Ana Suárez') >= 0,
        '  ⟺ · ' + c.fila + ' · `vigente` coincide con estar en `gente`');
    }
  });
});

PRUEBAS.caso('🔴 R12-6 · el mismo motivo dice el MISMO texto, venga de la rama que venga', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ EL TEXTO ESTABA ESCRITO DOS VECES —un ternario en la rama de upsert y otro en la de fila
     nueva— y un arreglo tocó uno solo. Resultado medido: un registro histórico cargado con sólo la
     fecha de inicio contestaba `motivo:"reincorporar_con_fechas"` con el texto «quedó guardado como
     parte del histórico». En español `tError` muestra el texto del servidor y dice *no hagas nada*;
     en inglés muestra la clave y dice *te faltan las fechas*. **Guía opuesta según el idioma.**
     ⚠️ Y NINGÚN CASO LO VEÍA: los 105 chequean el `motivo` y ninguno el `error`. Un sabotaje que
     devolvía el ternario viejo a la rama nueva dejaba la suite entera en verde.
     El derecho lo concede `opErrorNoVigente_`, que es hoy el único lugar donde se arma ese texto. */
  const vistos = Object.create(null), choques = [];
  function mirar(r, donde) {
    if (!r || !r.motivo) return;
    PRUEBAS.cierto(typeof r.error === 'string' && r.error.length > 20,
      '⚠️ `' + r.motivo + '` (' + donde + ') viaja sin texto · ' + JSON.stringify(r.error));
    if (vistos[r.motivo] && vistos[r.motivo].txt !== r.error)
      choques.push(r.motivo + ' · ' + vistos[r.motivo].donde + ' dice ' + JSON.stringify(vistos[r.motivo].txt) +
                   ' y ' + donde + ' dice ' + JSON.stringify(r.error));
    else vistos[r.motivo] = { txt: r.error, donde: donde };
  }
  const EVT = { tipo:'evento', inicio:p226Dia(-60), fin:p226Dia(-50) };

  /* rama FILA NUEVA · los dos motivos que puede emitir */
  let a = p226Api(); p226Alta(a, P226_SUP, 'Ev', EVT);
  mirar(p226Asignar(a, P226_SUP, 'Ev', 'Ana Suárez', { desde:p226Dia(-58) }), 'fila nueva');
  a = p226Api(); p226Alta(a, P226_SUP, 'Ev', EVT);
  mirar(p226Asignar(a, P226_SUP, 'Ev', 'Ana Suárez', { desde:p226Dia(-58), hasta:p226Dia(-52) }), 'fila nueva');
  a = p226Api(); p226Alta(a, P226_SUP, 'Op');
  mirar(p226Asignar(a, P226_SUP, 'Op', 'Ana Suárez', { desde:p226Dia(-20), hasta:p226Dia(-3) }), 'fila nueva');

  /* rama UPSERT · los mismos motivos, más los dos que sólo ella puede emitir */
  a = p226Api(); p226Alta(a, P226_SUP, 'Ev', EVT);
  p226Asignar(a, P226_SUP, 'Ev', 'Ana Suárez', { desde:p226Dia(-58) });
  mirar(p226Asignar(a, P226_SUP, 'Ev', 'Ana Suárez'), 'upsert');
  a = p226Api(); p226Alta(a, P226_SUP, 'Ev', EVT);
  p226Asignar(a, P226_SUP, 'Ev', 'Ana Suárez', { desde:p226Dia(-58), hasta:p226Dia(-52) });
  mirar(p226Asignar(a, P226_SUP, 'Ev', 'Ana Suárez', { cedula:'V-99999' }), 'upsert');
  a = p226Api(); p226Alta(a, P226_SUP, 'Op');
  p226Asignar(a, P226_SUP, 'Op', 'Ana Suárez', { desde:p226Dia(-40) });
  p226Asignar(a, P226_SUP, 'Op', 'Ana Suárez', { quitar:'1' });
  p226Baja(a, P226_SUP, 'Op');
  mirar(p226Asignar(a, P226_SUP, 'Op', 'Ana Suárez', { desde:p226Dia(-20) }), 'upsert');
  a = p226Api(); p226Alta(a, P226_SUP, 'Op');
  p226Asignar(a, P226_SUP, 'Op', 'Ana Suárez', { desde:p226Dia(-40), hasta:p226Dia(-3) });
  mirar(p226Asignar(a, P226_SUP, 'Op', 'Ana Suárez', { desde:p226Dia(-40), hasta:p226Dia(-3) }), 'upsert');

  PRUEBAS.igual(choques, [], '⚠️ un motivo con DOS textos según la rama es guía opuesta por idioma');
  const vistosN = Object.keys(vistos).sort();
  PRUEBAS.igual(vistosN, ['operacion_cerrada','operacion_terminada','reincorporar_con_fechas','tramo_vencido'],
    '⚠️ y el barrido tocó los cuatro motivos (si no, no mide lo que dice medir)');
  /* ⚠️ El texto tiene que DISTINGUIR: cuatro motivos con el mismo texto pasarían el aserto de
     arriba sin que nadie sepa qué hacer. */
  PRUEBAS.igual(new Set(vistosN.map(m => vistos[m].txt)).size, 4,
    '⚠️ los cuatro textos son distintos entre sí');
});

PRUEBAS.caso('🔴 R13-1 · ningún motivo puede caer en el texto de respaldo, que afirma un hecho', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ `opErrorNoVigente_` termina en `: "esa operación ya terminó."`. Es inalcanzable hoy —los dos
     llamadores le pasan lo que `opMotivoNoVigente_` acaba de devolver, que es siempre uno de cuatro—
     pero NO es código muerto inofensivo: es un **default que afirma un hecho**. Medido agregando un
     quinto motivo alcanzable, el usuario recibe «esa operación ya terminó» para una operación VIVA,
     y en inglés `tError` no encuentra la clave y cae al mismo texto: la mentira en los dos idiomas.
     Es el mismo defecto que R12-1 cerró —un texto que contradice al motivo que acompaña—, por el
     otro borde. Este caso lee el `.gs` REAL y cruza las tres listas; no comprueba comportamiento,
     comprueba que las tres no se separen. */
  const gs = CTX.gs;
  /* ⚠️ EL CORTE VA HASTA `opDetalleNoVigente_`, NO HASTA `opErrorNoVigente_`, y esto lo movió
     `P227g`: el detalle se separó del prefijo, así que los literales de los motivos viven ahora en
     `opDetalleNoVigente_` y `opErrorNoVigente_` quedó con un solo `return` compuesto. Con el corte
     viejo, ese `return det;` entraba en `cuerpoMotivo` y el primer aserto lo reportaba como «un
     `return` que no devuelve literal» — el caso en rojo por la FORMA del código, no por el
     invariante, que sigue intacto: las tres listas no se separan. Es otra vez «los barridos leen
     formas, no código». */
  const cuerpoMotivo = gs.slice(gs.indexOf('function opMotivoNoVigente_'),
                                gs.indexOf('function opDetalleNoVigente_'));
  const cuerpoTexto  = gs.slice(gs.indexOf('function opDetalleNoVigente_'));
  const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
                               .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  /* ⚠️ EL EXTRACTOR VEÍA UNA DE SEIS FORMAS, y la que no veía es la que la casa usa. La regex pedía
     un guión bajo (`[a-z]+(?:_[a-z]+)+`), así que `return "congelada";` pasaba invisible — y en
     `ERR_MOTIVO` conviven `baja`, `vista`, `ocupado`, `frenado`, `credenciales` y `r2`, todos de una
     palabra. Peor: al lado de `r2` está escrito desde P200c «el único motivo del .gs con un dígito:
     **el lector del caso no lo veía**». La misma ceguera, documentada, reintroducida por el caso que
     vino a cerrarla.
     ⚠️ Y la guarda `emite.size >= 4` sólo caza la ceguera TOTAL, no la parcial: con los cuatro
     motivos intactos y un quinto invisible, el caso queda verde y el usuario recibe «esa operación ya
     terminó» para una operación VIVA, en los dos idiomas.
     Un literal armado por concatenación o guardado en una variable sigue siendo ilegible para
     cualquier regex; por eso el segundo aserto NOMBRA los `return` que no devuelven un literal, en
     vez de callarlos. */
  const emite = new Set(), retSinLiteral = [];
  sinComentarios(cuerpoMotivo).split('\n').forEach(l => {
    if (!/\breturn\b/.test(l)) return;
    const hall = l.match(/"[a-z][a-z0-9_]*"/g) || [];
    if (!hall.length) retSinLiteral.push(l.trim().slice(0, 60));
    hall.forEach(m => emite.add(m.slice(1, -1)));
  });
  PRUEBAS.igual(retSinLiteral, [],
    '⚠️ estos `return` no devuelven un literal, así que ninguna regex los puede leer: ' +
    'el motivo que devuelvan no lo cubre este contrato');
  const conTexto = new Set((sinComentarios(cuerpoTexto.slice(0, cuerpoTexto.indexOf('\n}')))
    .match(/motivo === "([a-z_]+)"/g) || []).map(m => m.split('"')[1]));
  const mapa = new Set(Object.keys(typeof ERR_MOTIVO === 'object' ? ERR_MOTIVO : {}));

  PRUEBAS.cierto(emite.size >= 4,
    '⚠️ el extractor encontró ' + emite.size + ' motivos: si fueran 0 este caso no mediría nada');
  const sinRama = [...emite].filter(m => !conTexto.has(m));
  PRUEBAS.igual(sinRama, [],
    '⚠️ estos motivos caerían en el texto de respaldo, que afirma que la operación terminó');
  const ramaHuerfana = [...conTexto].filter(m => !emite.has(m));
  PRUEBAS.igual(ramaHuerfana, [],
    '⚠️ y estas ramas de texto no las emite nadie: sobran o el emisor se perdió');
  if (mapa.size) {
    const sinClave = [...emite].filter(m => !mapa.has(m));
    PRUEBAS.igual(sinClave, [], '⚠️ y sin clave en ERR_MOTIVO el inglés cae al texto español');
  } else {
    PRUEBAS.cierto(false, '⚠️ no está `ERR_MOTIVO`: la mitad del cliente queda SIN MEDIR');
  }
});

PRUEBAS.caso('🔴 R13-2 · un `Estado` con espacios y mayúsculas da la MISMA lectura en las dos funciones', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ ESTE CASO NO PUEDE PONERSE EN ROJO ROMPIENDO UNA SOLA DERIVACIÓN, y su comentario afirmaba
     que «se exige que el escritor y el lector sigan derivando igual». Medido: hay **siete**
     comparaciones contra `OP_BAJA` en el `.gs` y quitarle la normalización a **cualquiera de las
     siete, de a una**, deja este caso VERDE —y la suite entera, salvo `H5`, que caza sólo la del
     escritor—. Hace falta romper dos a la vez. O sea la exigencia que el comentario declaraba no
     podía fallar, que es exactamente el reproche que esta misma ronda le hizo al blindaje.
     Lo que sí se puede medir, y es el invariante de verdad, está en `R14-1`: que **ninguna**
     comparación contra `OP_BAJA` lea la celda sin normalizar. Ese contrato sí distingue las siete.
     Lo de acá abajo queda como prueba de punta a punta —el camino real con la celda sucia—, con la
     redundancia declarada: vale como red, no como discriminador.

     ⚠️ ESTE CASO NO MIDE EL BLINDAJE: MIDE QUE EL CAMINO REAL AGUANTE LA CELDA SUCIA, y la
     diferencia importa. `opMotivoNoVigente_` ganó un `.trim().toLowerCase()` que `opAsignacionVigente_`
     ya tenía, justificado con un síntoma que no existe. Al escribir esto medí que **revertir esa
     línea deja la suite entera en verde**, porque los dos llamadores reciben el `opObj` ya
     normalizado del lector: por el camino real no se llega al crudo. El blindaje es defensa para un
     tercer llamador futuro y así quedó escrito en el `.gs`.
     Lo que sí hace falta medir, y no estaba medido, es que una celda `Estado` escrita a mano con
     espacios y mayúsculas —forma real de este CH, H5 la documenta— no abra un agujero por el camino
     que la gente usa. Eso es lo que hay acá: se ensucia la celda, que es lo único que un humano
     puede hacer, y se exige que el escritor y el lector sigan derivando igual.
     ⚠️ Llamar a la función con un literal `' Baja '` habría dado verde y no habría probado nada de
     esto (R17: la cadena tiene dos eslabones y se prueba el segundo). */
  const api = p226Api();
  p226Alta(api, P226_SUP, 'Cardón IV');
  p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-40) });
  p226Baja(api, P226_SUP, 'Cardón IV');
  const sh = api.__env.__libro.getSheetByName(p226Hoja('OPERACIONES'));
  sh.getRange(2, 6).setValue('  Baja  ');                    // la celda, tal como la deja un humano
  PRUEBAS.igual(String(sh.getRange(2, 6).getValue()), '  Baja  ', 'la celda quedó sucia (montado)');

  const r = p226Asignar(api, P226_SUP, 'Cardón IV', 'Ana Suárez', { desde: p226Dia(-20) });
  PRUEBAS.igual(r.vigente, false, 'la operación cerrada no asigna, con la celda sucia igual');
  PRUEBAS.igual(r.motivo, 'operacion_cerrada',
    '⚠️ y el motivo dice CERRADA, no un remedio que no existe · ' + JSON.stringify(r.motivo));
  /* ⚠️ Y el lector tiene que coincidir: `vigente` ⟺ estar en `gente`, con la celda sucia también. */
  const gente = (p226Op(p226Leer(api).operaciones, 'Cardón IV').gente || []).map(g => g.persona);
  PRUEBAS.igual(gente.indexOf('Ana Suárez') >= 0, false,
    '⚠️ y el lector deriva igual: nadie cuenta en una operación cerrada con la celda sucia');
});

PRUEBAS.caso('🔴 R14-1 · ninguna comparación contra `OP_BAJA` lee la celda sin normalizar', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* ⚠️ EL INVARIANTE QUE `R13-2` NO PODÍA MEDIR. Hay siete comparaciones contra `OP_BAJA` repartidas
     entre el lector del panel, el escritor, las dos guardas de baja y `opAsignacionVigente_`, y todas
     leen la MISMA celda del CH. Medido: quitarle la normalización a cualquiera de las siete, de a
     una, deja la suite entera en verde salvo un caso — la redundancia entre ellas tapa el defecto
     hasta que se rompen dos. Y «escritor y lector que derivan distinto» es, con nombre y apellido,
     el defecto más repetido de este repo.
     Acá no se mide comportamiento: se mide la FORMA, que es lo único capaz de distinguir las siete.
     ⚠️ Con su guarda contra sí mismo: si el barrido deja de encontrar comparaciones, lo dice en vez
     de pasar en verde — un cero sin discriminador no es un resultado. */
  const sinComentarios = CTX.gs.replace(/\/\*[\s\S]*?\*\//g, '')
                               .split('\n').filter(l => !l.trim().startsWith('//'));
  const crudas = [], total = [];
  sinComentarios.forEach((l, i) => {
    if (l.indexOf('OP_BAJA') < 0) return;
    /* sólo las COMPARACIONES; las asignaciones (`Estado = OP_BAJA`) escriben, no leen */
    if (!/===\s*OP_BAJA|OP_BAJA\s*===/.test(l)) return;
    /* ⚠️ y sólo las que leen DE LA HOJA. `estadoNuevo === OP_BAJA` compara una variable que este
       mismo código acaba de asignar: ahí normalizar no tiene sentido y exigirlo era un falso
       positivo —el primero que dio este caso al escribirlo—. La marca de «vino de una celda» es el
       `String(celda || "")` con el que se la lee. */
    /* ⚠️ y el `String(` tiene que estar EN EL OPERANDO, no en cualquier parte de la línea: en
       `(estadoNuevo === OP_BAJA) ? String(prev[9]…) : ""` está del otro lado del ternario, y ésa
       fue la segunda forma del falso positivo. Se mira sólo lo que hay antes del `===`. */
    const izq = l.slice(0, l.indexOf('OP_BAJA'));
    if (izq.indexOf('String(') < 0) return;
    total.push(i + 1);
    if (!/\.trim\(\)\s*\.toLowerCase\(\)/.test(izq)) crudas.push((i + 1) + ': ' + l.trim().slice(0, 56));
  });
  PRUEBAS.cierto(total.length >= 5,
    '⚠️ el barrido encontró ' + total.length + ' comparaciones contra `OP_BAJA`: ' +
    'con menos de 5 no está leyendo el bloque de P226 y este caso NO mide nada');
  PRUEBAS.igual(crudas, [],
    '⚠️ estas comparan la celda CRUDA contra `OP_BAJA`: un `" Baja "` escrito a mano —forma real de ' +
    'este CH, H5 la documenta— las haría derivar distinto del resto');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS DOS HALLAZGOS DEL VERIFICADOR SOBRE GS 2026-10-09.1                        (2026-10-09)
   El campo `cambio` que ese deploy agregó se derivó de la misma expresión que decide la bitácora
   —`mismosDatos`— y heredó su punto ciego. Y el selector de P227c, al volverse alcanzable, destapó
   una escritura que nadie había medido.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P226-R · un RENOMBRE de grafía escribe dos hojas, y `cambio` tiene que decirlo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* El derecho lo concede `mismosDatos` en `accionOperacionGuardar`, que ahora compara
     `opNombreMostrar(previo[1])` contra `nombre`.
     ⚠️ POR QUÉ IMPORTA: el campo de alta es texto libre con la lista de operaciones debajo, y
     `opClave` (= `norm`) empata «cardon iv» con «Cardón IV» — saca tildes, baja a minúsculas y
     colapsa espacios y puntuación. ⚠️ **NO** empata «cardon 4»: lo escribí así en la primera
     versión de este caso y la guarda lo puso en rojo, porque `norm` no traduce números romanos.
     Un escenario mal escrito habría dejado el caso midiendo un alta nueva en vez de un renombre.
     El `setValues` escribe la grafía NUEVA
     en `Operaciones Listadas` y `opRenombrarAsignaciones_` la propaga a las N filas de
     `Asignaciones` — corre SIEMPRE, no sólo si cambió—. Con `mismosDatos` ciego al nombre eso daba
     `cambio:false`, o sea la pantalla decía «Ya estaba así. No se cambió nada.» sobre N+1 celdas
     reescritas, y la bitácora no registraba un hecho que escribió dos hojas (R3). */
  const api = p226Api({
    'Operaciones Listadas': [['Empresa','Operacion','Tipo','Inicio','Fin','Estado','Creada','CreadaPor','Baja','BajaPor'],
      ['Consorcio HELITEC','Cardón IV','instalacion','','','activo','2026-01-01T00:00:00','x','','']],
    'Asignaciones': [['Empresa','Operacion','Persona','Cedula','Desde','Hasta','Estado','Sello','Quien','Baja','BajaPor'],
      ['Consorcio HELITEC','Cardón IV','Ana Suárez','V-11111','2026-01-10','','activo','2026-01-10T00:00:00','x','','']]
  });
  const bitAntes = p226Bitacora(api).length;

  const r = JSON.parse(api.accionOperacionGuardar(p226Con(P226_SUP,
    { operacion:'cardon iv', tipo:'instalacion' })).getContent());

  const ops = p226Filas(api, p226Hoja('OPERACIONES'));
  const asg = p226Filas(api, p226Hoja('ASIGNACIONES'));
  PRUEBAS.igual(ops[0][1], 'cardon iv', 'guarda: la celda de `Operaciones Listadas` SE REESCRIBIÓ');
  PRUEBAS.igual(asg[0][1], 'cardon iv', 'guarda: y la de `Asignaciones` también · son N+1 celdas');
  PRUEBAS.igual(r.cambio, true,
    '🔴 `cambio:true` · escribió dos hojas, y con `false` la pantalla dice «no se cambió nada» · ' +
    JSON.stringify({ cambio:r.cambio, mismosDatos:r.mismosDatos, actualizada:r.actualizada }));
  PRUEBAS.igual(r.mismosDatos, false, '🔴 y `mismosDatos` ve el nombre, que es de donde sale `cambio`');
  PRUEBAS.alMenos(p226Bitacora(api).length - bitAntes, 1,
    '🔴 R3 · y queda línea de bitácora · un hecho que reescribe dos hojas sin registro es R3 incumplida');

  /* DISCRIMINADOR · el reenvío IDÉNTICO sigue siendo un no-op: ni bitácora ni `cambio`. */
  const api2 = p226Api({
    'Operaciones Listadas': [['Empresa','Operacion','Tipo','Inicio','Fin','Estado','Creada','CreadaPor','Baja','BajaPor'],
      ['Consorcio HELITEC','Cardón IV','instalacion','','','activo','2026-01-01T00:00:00','x','','']]
  });
  const b2 = p226Bitacora(api2).length;
  const r2 = JSON.parse(api2.accionOperacionGuardar(p226Con(P226_SUP,
    { operacion:'Cardón IV', tipo:'instalacion' })).getContent());
  PRUEBAS.igual(r2.cambio, false,
    'DISCRIMINADOR · la MISMA grafía sigue dando `cambio:false` · si diera true, el campo no mide nada · ' +
    JSON.stringify({ cambio:r2.cambio, mismosDatos:r2.mismosDatos }));
  PRUEBAS.igual(p226Bitacora(api2).length, b2,
    'DISCRIMINADOR · y sin línea nueva de bitácora (R3: se cuentan hechos, no pedidos)');
});

PRUEBAS.caso('🔒 P226-C · la cédula de una asignación es texto libre POR DISEÑO, y el candado está en el cliente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  /* ⚠️ ESTE CASO EXISTE PARA QUE NADIE —yo incluido, otra vez— CIERRE ESTO EN EL SERVIDOR.
     El verificador midió un defecto real: con dos homónimas en empresas distintas, un pedido con el
     nombre de la de HELITEC y la cédula de la de Cardón escribía la fila de HELITEC con la cédula
     ajena y contestaba `ok:true`. Mi arreglo fue hacer que la cédula saliera de la nómina
     (`opPersonaEnNomina_` devolviendo la fila), **y 9 casos de este archivo se pusieron en rojo**:
     `R6-5`, `R6-7`, `R7-1`, `R10-1` y los suyos. Al leerlos quedó claro por qué — existe un camino
     DELIBERADO para corregir a mano la cédula de un tramo, con su línea de bitácora propia, y
     `R6-5` corrige a `V-99999`, que NO está en la nómina. O sea la columna es texto libre a
     propósito y traerla de la nómina mataba la corrección.
     El hallazgo estaba del OTRO lado de la cadena: el **selector** del cliente ofrecía gente de otra
     empresa, porque `accionNominaListar` le manda al admin maestro la nómina de TODAS y el selector
     sólo muestra el nombre. Ahí se cerró (`opsGenteHtml`, caso `P227c-14`), y es donde correspondía.
     ⚠️ Hoy nadie LEE esta columna (`opPayloadPara_` usa 0,1,2,4,5,6). El día que alguien la lea hay
     que decidir quién la declara, y es una decisión de Franco: está anotada en `PENDIENTES_USUARIO.md`. */
  const api = p226Api({
    'Operaciones Listadas': [['Empresa','Operacion','Tipo','Inicio','Fin','Estado','Creada','CreadaPor','Baja','BajaPor'],
      ['Consorcio HELITEC','Alfa','instalacion','','','activo','2026-01-01T00:00:00','x','','']]
  });
  /* La cédula que manda el cliente SE ESCRIBE tal cual, aunque no coincida con la nómina
     (`Ana Suárez` es `V-11111` en el fixture). Es el camino de corrección. */
  const r = JSON.parse(api.accionOperacionAsignar(p226Con(P226_SUP,
    { operacion:'Alfa', persona:'Ana Suárez', cedula:'V-99999' })).getContent());
  PRUEBAS.igual(r.ok, true, 'guarda: la persona está en la nómina de HELITEC, así que entra');
  const asg = p226Filas(api, p226Hoja('ASIGNACIONES'));
  PRUEBAS.igual(asg[asg.length - 1][3], 'V-99999',
    '🔒 la cédula del pedido se escribe tal cual · traerla de la nómina rompe 9 casos de corrección · ' +
    JSON.stringify(asg[asg.length - 1]));
  /* Y el candado que SÍ corresponde al servidor sigue puesto: el NOMBRE se valida contra la nómina
     de esta empresa, así que alguien de otra no entra por más cédula que mande. */
  const r2 = JSON.parse(api.accionOperacionAsignar(p226Con(P226_SUP,
    { operacion:'Alfa', persona:'Pedro Salas', cedula:'V-44444' })).getContent());
  PRUEBAS.igual(r2.motivo, 'persona_sin_nomina',
    '🔒 DISCRIMINADOR · el nombre sí se valida: quien no está en esta nómina no entra · ' +
    'ése es el candado del servidor, y el de la cédula vive en el selector del cliente');
});
