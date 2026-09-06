/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P051 · LA LÁMINA "QUIÉN VE QUÉ" DEL CARRUSEL                                    (2026-09-06)

   ⚠️ ESTO NO VIGILA UN TEXTO: VIGILA QUE EL TEXTO SIGA SIENDO CIERTO.
   La lámina 4 dejó de ser un párrafo corrido y pasó a ser un esquema de cuatro filas — tú,
   supervisor, servicio médico, dirección — con lo que recibe cada uno. Se lee justo antes de que
   la persona decida si contesta la verdad, así que una línea que prometa más privacidad de la que
   hay es peor que no decir nada (R4).

   ── LA DIFERENCIA CON X1, Y ES DELIBERADA ───────────────────────────────────────────────────
   `x1-quien-ve-que.js` prueba los HELPERS del recorte (`armarAptitudServer`, `anonimizarHseq`) con
   los datos armados a mano. Eso comprueba la pieza, no el uso: si mañana `accionSupervisor` deja
   de llamar a uno de esos helpers, o llama a uno y no al otro, o agrega un campo DESPUÉS del
   recorte, X1 sigue en verde y la fuga existe. Es exactamente la forma en que ya se perdieron
   `duty`, `ausencias` y `ausenteHoy` (R17).
   Acá se entra por `accionSupervisor(p)` y `accionEmpleado(p)` DE VERDAD, con las tres contraseñas
   de la hoja `Accesos`, y se mira la respuesta completa que sale por el cable. Es más caro de
   montar y es la única forma de que una fuga nueva se ponga roja.

   ── POR QUÉ LA FILA DE DIRECCIÓN NO PROMETE ANONIMATO ───────────────────────────────────────
   Medido corriendo el endpoint el 2026-09-06: la respuesta de la vista `hseq` reemplaza el nombre
   por P1/P2 en `registros`, `aptitud`, `operacional` y `turnos`, pero TODAVÍA se le escapan tres
   identificadores por otras puertas — la cédula en `operacional[]`/`turnos[]`, la nómina entera
   por nombre en `nominaSinDato`, y nombre+cédula en las claves de `ausencias`. Mientras eso siga
   así, escribir «sin tu nombre» en la lámina sería mentir.
   El caso «EL CANDADO» de abajo es lo que sostiene esa decisión en el tiempo: si alguien escribe
   la promesa sin haber cerrado antes la fuga, se pone rojo. Y cuando la fuga se cierre, dice en su
   mensaje que el texto ya se puede reforzar — que es la otra mitad del trabajo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P051 · quién ve qué · el contrato con el servidor');

/* Las nueve cadenas de la lámina. Vive acá arriba porque la usan cinco casos. */
const P051_CLAVES = ['car4_tit', 'car4_yo_t', 'car4_yo_d', 'car4_sup_t', 'car4_sup_d',
                     'car4_med_t', 'car4_med_d', 'car4_dir_t', 'car4_dir_d', 'car4_pie'];

function p051Texto(clave, lang) {
  const antes = idiomaActual();
  try { fijarIdioma(lang || 'es'); return String(t(clave) || ''); }
  finally { fijarIdioma(antes); }
}

/* ── El CH de prueba ────────────────────────────────────────────────────────────────────────────
   Una empresa, tres personas: dos con tests y una que sólo está en la nómina. Alcanza para que
   cada afirmación de la lámina tenga algo que comprobar y para que el recorte tenga algo que
   recortar. Las columnas salen de las constantes del `.gs` (COL_PERSONA=2, COL_DEPTO=3,
   COL_EMPRESA=73, COL_FECHA=74, COL_KSS=87 — todas 1-based; COLS_COMENTARIOS son 0-based y el de
   Fatiga es el 85). */
const P051_HOY = new Date().toISOString().substring(0, 10);

function p051Fila(persona, dep, empresa, kss, comentario) {
  const f = new Array(90).fill('');
  f[0] = P051_HOY + ' 08:00:00';   // marca temporal
  f[1] = persona;                  // COL_PERSONA
  f[2] = dep;                      // COL_DEPTO
  f[72] = empresa;                 // COL_EMPRESA
  f[73] = P051_HOY;                // COL_FECHA
  f[86] = kss;                     // COL_KSS
  if (comentario) f[85] = comentario;
  return f;
}

function p051Hojas() {
  return {
    'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq'],
                ['helitec', 'sup-051', 'empresa', 'Helitec', 'med-051', 'dir-051']],
    'Respuestas de formulario 1': [
      new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p051Fila('Ana Suárez', 'Operaciones', 'Helitec', 7, 'Dormí muy mal, tengo un problema en casa'),
      p051Fila('Luis Ferrer', 'Mantenimiento', 'Helitec', 3, '')],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Telefono',
                'Email', 'EsPiloto', 'IdPiloto', 'Rol', 'Nivel'],
               ['Helitec', 'Ana Suárez',   'V-11111', 'Operaciones',   'Piloto',  'F', '40', '', '', 'Si', '', 'empleado', '3'],
               ['Helitec', 'Luis Ferrer',  'V-22222', 'Mantenimiento', 'Técnico', 'M', '35', '', '', 'No', '', 'empleado', '2'],
               ['Helitec', 'Carmen Rojas', 'V-33333', 'Operaciones',   'Piloto',  'F', '30', '', '', 'Si', '', 'empleado', '3']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento',
                     'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
                    [P051_HOY, '06:00', P051_HOY + 'T06:00:00.000Z', 'op1', 'Ana Suárez', 'Helitec',
                     'Operaciones', 'Piloto', 'salida_casa', 'kss', 7, '']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga'],
               [P051_HOY, '06:10', 't1', 'checkin', 'Ana Suárez', 'Helitec', 'Operaciones', 'Piloto', 7, 4]],
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor'],
                  ['a1', 'Helitec', 'V-33333', 'Carmen Rojas', P051_HOY, P051_HOY, 'vacaciones', 'vigente', '', 'sup']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']]
  };
}

/* Corre el endpoint DE VERDAD y devuelve las cuatro respuestas, una por rol. Se arma una sola vez
   por caso (no una por rol) para no leer el `.gs` de 390 KB cinco veces. */
function p051Respuestas() {
  const env = GS.crearEntorno(p051Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'accionEmpleado']);
  const como = clave => JSON.parse(
    api.accionSupervisor({ usuario: 'helitec', pass: clave, dispositivoId: 'p051' }).getContent());
  return {
    yo: JSON.parse(api.accionEmpleado({ persona: 'Ana Suárez', empresa: 'Helitec',
                                        cedula: 'V-11111', dispositivoId: 'p051' }).getContent()),
    supervisor: como('sup-051'),
    medico: como('med-051'),
    hseq: como('dir-051')
  };
}

/* Los indicadores se leen del `.gs`, no se copian: si mañana agregan uno, este archivo lo mira
   también. Mismo criterio que X1. */
function p051Metricas() {
  const m = /var METRICAS\s*=\s*\[([^\]]+)\]/.exec(CTX.gs || '');
  return m ? m[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : [];
}

PRUEBAS.caso('⚠️ GUARDA DE MEDIBILIDAD · el endpoint contesta las cuatro vistas', () => {
  /* Sin esto, cualquier error de montaje del CH falso dejaría a los casos de abajo comprobando
     sobre `undefined` — y varios de ellos son "no aparece X", que con un objeto vacío dan verde.
     Un cero sin discriminador no es un resultado (R17). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea: no está levantado servir-gs.py'); return; }
  const r = p051Respuestas();
  PRUEBAS.igual([r.yo.ok, r.supervisor.ok, r.medico.ok, r.hseq.ok], [true, true, true, true],
    '⚠️ alguna de las cuatro llamadas falló · ' + JSON.stringify({
      yo: r.yo.error || r.yo.motivo, sup: r.supervisor.error,
      med: r.medico.error, hseq: r.hseq.error }));
  PRUEBAS.igual([r.supervisor.vista, r.medico.vista, r.hseq.vista],
    ['supervisor', 'medico', 'hseq'],
    'y cada contraseña tiene que abrir SU vista: si dos abren la misma, el resto no compara nada');
  PRUEBAS.alMenos((r.medico.registros || []).length, 1,
    'el CH de prueba tiene que traer registros, o "no hay puntajes" sería cierto por vacío');
  PRUEBAS.alMenos(p051Metricas().length, 5, 'y los indicadores tienen que leerse del .gs');
});

PRUEBAS.caso('⚠️ FILA "TÚ" · tus resultados completos, con los puntajes, y 30 días de historial', () => {
  /* `car4_yo_d`. Es la única fila que promete MÁS y no menos, así que se rompe al revés: si el
     endpoint dejara de mandarle sus valores a la persona, la lámina prometería algo que la app no
     entrega, y ya pasó — hasta Y1 su ciclo vivía sólo en el teléfono. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const mio = (r.yo.registros || [])[0] || {};
  const conValor = mets.filter(m => mio[m] != null);
  PRUEBAS.alMenos(conValor.length, 1,
    '⚠️ la persona tiene que recibir SUS puntajes · llegó: ' + JSON.stringify(mio));
  PRUEBAS.igual((r.yo.operacionalPeriodo || {}).dias, 30,
    '⚠️ el texto dice "tu historial de 30 días" · si el endpoint cambia el período, cambia el texto');
  const evento = (r.yo.operacional || [])[0] || {};
  PRUEBAS.cierto(evento.resultado != null,
    'y sus propios eventos del ciclo le llegan con el valor, no con el semáforo · ' + JSON.stringify(evento));
});

PRUEBAS.caso('⚠️ FILA "SUPERVISOR" · ni un puntaje, ni un comentario', () => {
  /* `car4_sup_d`: "Ningún puntaje y ningún comentario". Es la promesa más fuerte de la lámina.
     Se mira la RESPUESTA ENTERA, no un campo: si un puntaje se cuela por `operacional`, por
     `turnos` o por un campo nuevo, la promesa está rota igual (K1a se abrió por esa puerta). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const fila = (r.supervisor.registros || [])[0] || {};
  PRUEBAS.igual(mets.filter(m => fila[m] !== undefined), [],
    '⚠️ ningún indicador puede sobrevivir en `registros` · ' + JSON.stringify(fila));
  PRUEBAS.igual(r.supervisor.pvt, [], '⚠️ ni el test de reacción');
  PRUEBAS.igual(r.supervisor.comentarios, [],
    '⚠️ ni una línea de lo que la persona escribió: el servidor ni se los manda');
  const conResultado = (r.supervisor.operacional || []).filter(o => o.resultado !== undefined);
  PRUEBAS.igual(conResultado, [],
    '⚠️ y el ciclo viaja con el NIVEL, nunca con el puntaje (K1a) · ' + JSON.stringify(conResultado));
  const conKss = (r.supervisor.turnos || []).filter(o => o.kss !== undefined);
  PRUEBAS.igual(conKss, [], '⚠️ ni el KSS del turno · ' + JSON.stringify(conKss));
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR de la fila anterior: el médico SÍ recibe todo eso', () => {
  /* Sin esto, un CH de prueba mal armado —una fila que no parsea, una empresa que no cruza— daría
     "no hay puntajes" para TODOS los roles y el caso de arriba pasaría sin comprobar nada. Con
     esto, "el supervisor no los tiene" sólo puede significar que se los recortaron. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const fila = (r.medico.registros || [])[0] || {};
  PRUEBAS.alMenos(mets.filter(m => fila[m] != null).length, 1,
    '⚠️ el servicio médico recibe los valores crudos · ' + JSON.stringify(fila));
  PRUEBAS.alMenos((r.medico.comentarios || []).length, 1,
    '⚠️ y los comentarios: `car4_med_d` se los promete a la persona');
  const conResultado = (r.medico.operacional || []).filter(o => o.resultado != null);
  PRUEBAS.alMenos(conResultado.length, 1, 'y el ciclo con el puntaje, que es lo que él necesita');
});

PRUEBAS.caso('⚠️ FILA "DIRECCIÓN" · tampoco puntajes ni comentarios, y el MISMO semáforo', () => {
  /* `car4_dir_d`: "El mismo semáforo por indicador que tu supervisor. Tampoco puntajes ni
     comentarios". Las dos mitades importan:
       · la primera es el aviso incómodo —Dirección ve el nivel de ansiedad y el de ánimo, uno por
         uno— y está a propósito, por el mismo motivo por el que X1 lo dice: suavizarlo sería
         falso;
       · la segunda es la promesa, y se comprueba igual que la del supervisor. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const mets = p051Metricas();
  const fila = (r.hseq.registros || [])[0] || {};
  PRUEBAS.igual(mets.filter(m => fila[m] !== undefined), [],
    '⚠️ ningún indicador en `registros` de Dirección · ' + JSON.stringify(fila));
  PRUEBAS.igual(r.hseq.pvt, [], '⚠️ ni el test de reacción');
  PRUEBAS.igual(r.hseq.comentarios, [], '⚠️ ni los comentarios');
  PRUEBAS.igual((r.hseq.operacional || []).filter(o => o.resultado !== undefined), [],
    '⚠️ ni un puntaje en el ciclo');

  /* "El mismo semáforo que tu supervisor": se compara nivel por nivel, no la cantidad de filas.
     Si un día a Dirección se le recortara también el nivel, el texto pasaría a decir de más. */
  const niveles = resp => (resp.aptitud || []).map(a =>
    (a.metricas || []).map(m => m.m + '=' + m.nivel).join(','));
  PRUEBAS.alMenos(niveles(r.supervisor).length, 1, 'guarda: el supervisor tiene que traer aptitud');
  PRUEBAS.igual(niveles(r.hseq), niveles(r.supervisor),
    '⚠️ Dirección recibe EL MISMO semáforo por indicador que el supervisor · sup: ' +
    JSON.stringify(niveles(r.supervisor)) + ' · hseq: ' + JSON.stringify(niveles(r.hseq)));
});

/* ── EL CANDADO ────────────────────────────────────────────────────────────────────────────────
   Busca cualquier identificador real de las personas de prueba en el JSON que sale para Dirección.
   Se busca por PEDAZOS (nombre, apellido, cédula sin prefijo) y sobre el JSON entero: un campo
   nuevo que se olviden de anonimizar cae acá aunque nadie lo nombre. */
const P051_IDENTIFICADORES = ['Ana', 'Suárez', 'Suarez', 'Luis', 'Ferrer', 'Carmen', 'Rojas',
                              '11111', '22222', '33333'];
function p051FugasEn(objeto) {
  const texto = JSON.stringify(objeto || {});
  return P051_IDENTIFICADORES.filter(x => texto.indexOf(x) >= 0);
}
/* Palabras con las que se escribiría la promesa de anonimato, en los dos idiomas. */
const P051_PROMESA = /sin (tu |el )?nombre|an[óo]nim|\bP1\b|without (your |the )?name|anonym/i;

PRUEBAS.caso('🔴 EL CANDADO · la fila de Dirección no promete anonimato mientras el payload lo rompa', () => {
  /* ⚠️ ESTE ES EL CASO POR EL QUE EXISTE EL ARCHIVO.
     La versión honesta de la lámina sería «y sin tu nombre: apareces como P1, P2…», que es lo que
     `anonimizarHseq` hace con `registros`, `aptitud`, `operacional` y `turnos`. Medido el
     2026-09-06 corriendo `accionSupervisor`, esa frase HOY sería falsa: en la misma respuesta
     viajan la cédula (en `operacional[]` y `turnos[]`, que `anonimizarHseq` no toca), la nómina
     entera por nombre en `nominaSinDato` —el bloque se calcula DESPUÉS de anonimizar, así que
     ningún nombre cruza y caen todos— y nombre+cédula en las claves de `ausencias`.
     Así que la regla que este caso sostiene es una sola: **la promesa y la fuga no pueden convivir**.
     · Si alguien cierra la fuga en el `.gs`, el caso pasa igual y el mensaje dice que el texto ya
       se puede reforzar.
     · Si alguien escribe la promesa sin cerrarla, se pone rojo.
     Lo que NO hace es fallar hoy: la fuga es un cambio de seguridad del endpoint y lo decide
     Franco, no esta suite. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p051Respuestas();
  const fugas = p051FugasEn(r.hseq);
  const promete = P051_PROMESA.test(p051Texto('car4_dir_d', 'es') + ' ' + p051Texto('car4_dir_d', 'en'));

  if (fugas.length) {
    PRUEBAS.falso(promete,
      '🔴 el payload de Dirección todavía lleva identificadores (' + fugas.join(', ') + '), ' +
      'así que la lámina NO puede prometer anonimato · decía: «' + p051Texto('car4_dir_d', 'es') + '»');
  } else {
    PRUEBAS.cierto(true,
      '✔ la fuga está cerrada: `car4_dir_d` YA SE PUEDE reforzar con «y sin tu nombre: apareces ' +
      'como P1, P2…», que es lo que la persona necesita leer. Al hacerlo, este caso pasa a exigirlo.');
  }
  /* Y que el buscador de fugas encuentre algo cuando lo hay: sin esto, el día que `p051FugasEn`
     se rompa (un JSON.stringify que falla, una lista vacía) la rama de arriba diría "fuga cerrada"
     sin haber mirado nada. */
  PRUEBAS.igual(p051FugasEn({ x: 'Ana Suárez', y: { z: 'V-11111' } }).sort(),
    ['11111', 'Ana', 'Suárez'].sort(),
    '⚠️ discriminador: el buscador de fugas tiene que encontrar un nombre y una cédula puestos a mano');
  PRUEBAS.igual(p051FugasEn({ persona: 'P1', dep: 'Operaciones' }), [],
    'y no marcar un payload ya anonimizado');
});

PRUEBAS.caso('el DISCRIMINADOR del detector de promesa: reconoce cómo se escribiría', () => {
  /* El candado de arriba se apoya en una expresión regular. Si estuviera mal escrita diría
     "no promete nada" sobre un texto que promete, y el candado quedaría abierto sin que se note. */
  ['Ve todo sin tu nombre', 'Los datos le llegan anónimos', 'Apareces como P1, P2, P3…',
   'They see it without your name', 'Fully anonymised'].forEach(s =>
    PRUEBAS.cierto(P051_PROMESA.test(s), 'tiene que detectar «' + s + '»'));
  ['El mismo semáforo por indicador que tu supervisor. Tampoco puntajes ni comentarios.',
   'The same per-indicator status your supervisor sees. No scores and no comments either.']
    .forEach(s => PRUEBAS.falso(P051_PROMESA.test(s), 'y no marcar el texto vigente: «' + s + '»'));
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LA PANTALLA
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P051 · quién ve qué · la pantalla');

/* Abre el carrusel en la lámina 4 y lo deja como estaba. Mismo patrón que `p041Con`. */
function p051Con(fn) {
  const ov = document.getElementById('carruselOv');
  const ya = ov.classList.contains('show');
  const idx = (typeof CAR_IDX !== 'undefined') ? CAR_IDX : 0;
  ov.classList.add('show');
  if (typeof CAR_IDX !== 'undefined') { CAR_IDX = 3; try { carruselPintar(); } catch (e) {} }
  void document.body.offsetWidth;
  try { return fn(document.querySelector('.car-slide--esquema')); }
  finally {
    CAR_IDX = idx; try { carruselPintar(); } catch (e) {}
    if (!ya) ov.classList.remove('show');
  }
}

PRUEBAS.caso('son CUATRO filas, una por rol, y las cuatro se están midiendo', () => {
  const m = p051Con(sl => {
    if (!sl) return null;
    const filas = [...sl.querySelectorAll('.car-quien li')];
    return {
      n: filas.length,
      altos: filas.map(li => Math.round(li.getBoundingClientRect().height)),
      roles: filas.map(li => (li.querySelector('.cq-rol') || {}).textContent || ''),
      hayParrafo: !!sl.querySelector('.car-cuerpo')
    };
  });
  PRUEBAS.cierto(!!m, '⚠️ no existe la lámina del esquema (`.car-slide--esquema`)');
  if (!m) return;
  PRUEBAS.igual(m.n, 4, 'cuatro filas: tú, supervisor, servicio médico, dirección');
  PRUEBAS.igual(m.altos.filter(h => h <= 0), [],
    '⚠️ una fila que mide 0 no se ve · alturas: ' + m.altos.join(', '));
  PRUEBAS.igual(m.roles, [t('car4_yo_t'), t('car4_sup_t'), t('car4_med_t'), t('car4_dir_t')],
    'y los cuatro rótulos salen de `t()`, en ese orden');
  PRUEBAS.falso(m.hayParrafo,
    'el párrafo corrido se fue: si conviven, quedan dos textos diciendo lo mismo y uno se queda viejo');
});

/* Mide dónde arranca y dónde termina el contenido de la lámina, en coordenadas del contenido
   (no de la pantalla): sumar `scrollTop` es lo que hace que el número no dependa de dónde esté
   parado el scroll. Se ignoran los hijos de alto 0 — el ícono se esconde con la letra grande y en
   pantalla baja, y contarlo hacía que "el contenido arranca en 0" pareciera un recorte. */
function p051Extension(sl) {
  const rs = sl.getBoundingClientRect();
  const vis = [...sl.children].filter(e => e.getBoundingClientRect().height > 0);
  if (!vis.length) return null;
  const tops = vis.map(e => e.getBoundingClientRect().top - rs.top + sl.scrollTop);
  const bots = vis.map(e => e.getBoundingClientRect().bottom - rs.top + sl.scrollTop);
  return { arriba: Math.round(Math.min(...tops)), fondo: Math.round(Math.max(...bots)),
           client: sl.clientHeight,
           scrollea: ['auto', 'scroll'].indexOf(getComputedStyle(sl).overflowY) >= 0 };
}

PRUEBAS.caso('⚠️ el esquema ENTRA en la lámina a los cinco tamaños de referencia', () => {
  /* `.car-viewport` tiene `overflow:hidden`, así que lo que no entra desaparece SIN barra que lo
     delate — en la pantalla donde se hace una promesa de privacidad. Con la letra en su tamaño
     normal el esquema tiene que ENTRAR, no scrollear: el scroll es la red de abajo para la letra
     grande, no el comportamiento esperado.
     ⚠️ `scrollHeight` NO sirve para detectar el recorte: crece con el contenido aunque el
     `overflow` sea `hidden`, así que compararse contra él da verde siempre. Se compara contra
     `clientHeight`, que es lo que de verdad se ve. */
  const malos = [];
  PRUEBAS.VENTANAS.forEach(v => {
    const m = PRUEBAS.enVentana(v.w, v.h, () => p051Con(sl => sl ? p051Extension(sl) : null));
    if (!m) { malos.push(v.w + 'x' + v.h + ': no se encontró la lámina'); return; }
    if (m.arriba < -1) malos.push(v.w + 'x' + v.h + ': arranca ' + m.arriba + ' px por encima del borde');
    if (m.fondo > m.client + 1) malos.push(v.w + 'x' + v.h + ': se pasa ' + (m.fondo - m.client) + ' px por abajo');
  });
  PRUEBAS.igual(malos, [],
    '⚠️ cuatro filas ocupan más que un párrafo · ' + malos.join(' | '));

  /* DISCRIMINADOR: se hincha el texto a propósito y la misma medición tiene que ver el desborde.
     Sin esto, la comprobación de arriba daría verde midiendo cualquier cosa — ya pasó cuatro veces
     en este proyecto. */
  /* ⚠️ EL TAMAÑO SE FUERZA EN CADA RENGLÓN, no en el `<ul>`. Primero lo puse en el `<ul>` y el
     discriminador daba FALSO: `.cq-rol` y `.cq-ve` declaran su propio `font-size` en `rem`, así
     que la cascada nunca les llegaba y el texto no crecía ni un píxel. O sea que el discriminador
     estaba tan roto como lo que venía a detectar — y sin él, el caso de arriba habría quedado como
     un verde sin medición. */
  const roto = p051Con(sl => {
    const tx = [...sl.querySelectorAll('.cq-rol, .cq-ve')];
    const antes = tx.map(e => e.style.fontSize);
    tx.forEach(e => { e.style.fontSize = '40px'; });
    void document.body.offsetWidth;
    const m = p051Extension(sl);
    tx.forEach((e, i) => { e.style.fontSize = antes[i]; });
    void document.body.offsetWidth;
    return m.fondo > m.client + 1;
  });
  PRUEBAS.cierto(roto,
    '⚠️ discriminador: con el texto a 40 px la medición TIENE que ver el desborde · ' +
    'si no lo ve, el caso de arriba no está midiendo nada');
});

PRUEBAS.caso('⚠️ y con la letra al MÁXIMO no se pierde ni una línea: se puede llegar scrolleando', () => {
  /* Con la letra en "Muy grande" (135 %) no hay forma de que cuatro filas entren en una lámina de
     teléfono, y encogerlas hasta que entren sería la decisión equivocada: quien sube la letra está
     pidiendo lugar para LEER. Lo que no puede pasar es que el texto quede recortado en silencio.
     Se comprueban las dos condiciones que hacen que TODO sea alcanzable: que la lámina scrollee y
     que el contenido no arranque por encima del origen del scroll — que es el defecto clásico de
     un flex centrado que desborda, y por el que la regla usa `safe center`. */
  const previo = document.documentElement.style.fontSize;
  const malos = [];
  try {
    document.documentElement.style.fontSize = '135%';
    document.documentElement.classList.add('texto-grande', 'texto-maximo');
    [[375, 667], [360, 640], [320, 800]].forEach(([w, h]) => {
      const m = PRUEBAS.enVentana(w, h, () => p051Con(sl => sl ? p051Extension(sl) : null));
      if (!m) { malos.push(w + 'x' + h + ': no se encontró la lámina'); return; }
      if (m.arriba < -1) malos.push(w + 'x' + h + ': arranca ' + m.arriba + ' px por encima del origen — no hay forma de subir');
      if (m.fondo > m.client + 1 && !m.scrollea) malos.push(w + 'x' + h + ': se pasa ' + (m.fondo - m.client) + ' px y la lámina no scrollea');
    });
  } finally {
    document.documentElement.style.fontSize = previo;
    document.documentElement.classList.remove('texto-grande', 'texto-maximo');
    void document.body.offsetWidth;
  }
  PRUEBAS.igual(malos, [], '⚠️ con la letra al máximo hay texto fuera de alcance · ' + malos.join(' | '));
});

PRUEBAS.caso('⚠️ el pie arranca donde arrancan las filas, en los cinco tamaños', () => {
  /* Salió MIRANDO la captura a 768, no midiendo: el pie quedaba 78 px a la derecha del borde
     izquierdo del esquema, y a 375 casi no se notaba porque el texto ocupa todo el ancho.
     La causa: `.car-slide` centra sus hijos, y un `<p>` sin `width` se encoge al texto. El `<ul>`
     no lo sufría porque ya declaraba `width:100%`.
     Se vigila porque es de las cosas que se rompen sin dar error y sólo se ven al mirar. */
  const malos = [];
  PRUEBAS.VENTANAS.forEach(v => {
    const d = PRUEBAS.enVentana(v.w, v.h, () => p051Con(sl => {
      if (!sl) return null;
      const ul = sl.querySelector('.car-quien'), pie = sl.querySelector('.car-pie');
      if (!ul || !pie) return null;
      return Math.round(pie.getBoundingClientRect().left - ul.getBoundingClientRect().left);
    }));
    if (d === null) { malos.push(v.w + 'x' + v.h + ': faltan el esquema o el pie'); return; }
    if (Math.abs(d) > 1) malos.push(v.w + 'x' + v.h + ': ' + d + ' px de desfase');
  });
  PRUEBAS.igual(malos, [], '⚠️ el pie y las filas comparten borde izquierdo · ' + malos.join(' | '));

  /* DISCRIMINADOR: se reproduce la forma del defecto —el pie centrado y más angosto que las
     filas— y la medición tiene que verlo. Sin esto, el caso daría verde con el defecto puesto.
     ⚠️ Dos cosas que no alcanzan, y las dos las descubrí viendo el discriminador en 0:
     · tocar sólo el `width` del pie: la caja lo estira igual (`align-items:stretch` por defecto);
     · dejarlo en `auto`: a 390 px de ancho el texto ya ocupa toda la línea, así que el borde
       izquierdo no se mueve ni un píxel. Se le da un ancho chico y explícito para que el desfase
       exista sí o sí, sea cual sea el tamaño de la ventana en la que corra la suite. */
  const ve = p051Con(sl => {
    const caja = sl.querySelector('.car-quien-caja');
    const pie = sl.querySelector('.car-pie'), ul = sl.querySelector('.car-quien');
    const antesCaja = caja.style.alignItems, antesPie = pie.style.width;
    caja.style.alignItems = 'center';
    pie.style.width = '40px';
    void document.body.offsetWidth;
    const d = Math.round(pie.getBoundingClientRect().left - ul.getBoundingClientRect().left);
    caja.style.alignItems = antesCaja; pie.style.width = antesPie;
    void document.body.offsetWidth;
    return d;
  });
  PRUEBAS.alMenos(Math.abs(ve), 2,
    '⚠️ discriminador: con el pie centrado y angosto, la medición tiene que ver el desfase · vio ' + ve);
});

PRUEBAS.caso('R13 · las tres tintas del esquema pasan 4.5:1 en los DOS temas', () => {
  /* El fondo real es el del overlay (`background: var(--card)`), no el de `body`: medirlo contra
     `body` es el error que ya hizo reportar títulos "ilegibles" que tenían 16:1. */
  const previo = temaGuardado();
  const malos = [];
  let medidos = 0;
  try {
    ['claro', 'oscuro'].forEach(tema => {
      fijarTema(tema);
      p051Con(sl => {
        if (!sl) return;
        const fondo = getComputedStyle(document.getElementById('carruselOv')).backgroundColor;
        [['.cq-rol', 'el rol'], ['.cq-ve', 'lo que ve'], ['.car-pie', 'el pie']].forEach(([sel, q]) => {
          const el = sl.querySelector(sel);
          if (!el) { malos.push(tema + ' · falta ' + sel); return; }
          medidos++;
          const c = CTX.contraste(getComputedStyle(el).color, fondo);
          if (c < 4.5) malos.push(tema + ' · ' + q + ' (' + sel + '): ' + c + ':1');
        });
      });
    });
  } finally { fijarTema(previo || 'claro'); }
  PRUEBAS.igual(medidos, 6, 'guarda de medibilidad: tres tintas × dos temas · medidos ' + medidos);
  PRUEBAS.igual(malos, [],
    '⚠️ el modo oscuro ya estuvo roto una vez con ~400 colores a mano (R13) · ' + malos.join(' | '));
});

PRUEBAS.caso('R13 · ningún color escrito a mano en el esquema', () => {
  /* Se mira la hoja de estilo, no el color calculado: un `#fff` y un `var(--card)` computan igual
     en tema claro, así que medir el resultado no distingue el defecto que R13 prohíbe. */
  const css = [...document.querySelectorAll('style')].map(x => x.textContent).join('\n');
  const bloques = css.split(/(?=\n\s*[.#@])/)
    .filter(b => /\.(car-quien|cq-rol|cq-ve|car-pie|car-slide--esquema)\b/.test(b));
  PRUEBAS.alMenos(bloques.length, 4,
    'guarda: tienen que encontrarse las reglas del esquema · encontradas ' + bloques.length);
  const aMano = bloques.filter(b => /:\s*(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(b.replace(/\/\*[\s\S]*?\*\//g, '')));
  PRUEBAS.igual(aMano.map(b => b.trim().split('\n')[0].trim()), [],
    '⚠️ R13: siempre un token, y si falta se agrega en los DOS temas a la vez');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS TEXTOS
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P051 · quién ve qué · los textos');

PRUEBAS.caso('R14 · las diez cadenas existen en español y en inglés', () => {
  const previo = idiomaActual();
  const faltan = { es: [], en: [] };
  try {
    ['es', 'en'].forEach(l => { fijarIdioma(l); P051_CLAVES.forEach(k => { if (t(k) === k) faltan[l].push(k); }); });
  } finally { fijarIdioma(previo); }
  PRUEBAS.igual(faltan.es, [], 'falta en español');
  PRUEBAS.igual(faltan.en, [],
    'falta en inglés · la cadena de respaldo devolvería el español y nadie se entera');
});

PRUEBAS.caso('R1 · español NEUTRO, y R14 · sin ningún término de sector', () => {
  /* R14: la app va a Cardón y a operarios de planta. Una lámina que hable de vuelos o de
     tripulación deja de ser cierta ahí, y no hay `if` por empresa que lo arregle. */
  const VOSEO = /(^|[^a-záéíóúüñ])(vos|podés|tenés|querés|mirá|tocá|sabés|necesitás|elegí|andá|reportás|registrás|hacés|debés|sos|contás|llegás|cambiás|acordate|fijate|registrate|anotá|probá|pedí|vení|entrá|salí|revisá|escribí)(?![a-záéíóúüñ])/i;
  const SECTOR = /aeropuerto|piloto|vuelo|tripulaci[óo]n|hangar|aeronave|airport|flight|crew/i;
  const conVoseo = [], conSector = [];
  P051_CLAVES.forEach(k => {
    const es = p051Texto(k, 'es'), en = p051Texto(k, 'en');
    if (VOSEO.test(es)) conVoseo.push(k + ': «' + es + '»');
    if (SECTOR.test(es) || SECTOR.test(en)) conSector.push(k);
  });
  PRUEBAS.igual(conVoseo, [], '⚠️ R1 · nunca voseo · ' + conVoseo.join(' | '));
  PRUEBAS.igual(conSector, [], '⚠️ R14 · término de sector escrito a mano en ' + conSector.join(', '));
  /* Discriminadores: los dos detectores tienen que encontrar lo que buscan. */
  PRUEBAS.cierto(VOSEO.test('Vos podés ver tus resultados'), 'discriminador del detector de voseo');
  PRUEBAS.cierto(SECTOR.test('Tu supervisor de vuelo'), 'discriminador del detector de sector');
});

PRUEBAS.caso('🔴 R2 · la lámina no declara a nadie apto ni no apto', () => {
  /* La regla más cara del proyecto, y una pantalla que explica lo que el supervisor "ve" de la
     persona es justo donde se cuela un "no apto" por descuido. */
  const todo = P051_CLAVES.map(k => p051Texto(k, 'es') + ' ' + p051Texto(k, 'en')).join(' | ').toLowerCase();
  ['no apto', 'apto para trabajar', 'inhabilitado', 'no puedes trabajar', 'unfit', 'not fit']
    .forEach(mala => PRUEBAS.falso(todo.indexOf(mala) >= 0, '⚠️ no puede aparecer «' + mala + '»'));
  PRUEBAS.cierto(/determinaci[óo]n de aptitud/i.test(p051Texto('car4_med_d', 'es')),
    '⚠️ y sí decir que sólo el servicio médico firma una determinación: es la doctrina del producto');
  PRUEBAS.cierto(/fitness determination/i.test(p051Texto('car4_med_d', 'en')),
    'lo mismo en inglés · «' + p051Texto('car4_med_d', 'en') + '»');
});

PRUEBAS.caso('⚠️ la fila del supervisor NO se suaviza: nombra el semáforo por indicador', () => {
  /* El riesgo real de esta lámina no es que mienta prometiendo de menos: es que "mejore" hacia
     algo más tranquilizador. "Tu supervisor sólo ve si estás en condiciones" suena mejor y es
     FALSO — ve el nivel de cada indicador, ansiedad y ánimo incluidos. Es la misma advertencia que
     X1 dejó escrita, y acá se sostiene contra el texto de la lámina. */
  const es = p051Texto('car4_sup_d', 'es'), en = p051Texto('car4_sup_d', 'en');
  PRUEBAS.cierto(/indicador/i.test(es) && /indicator/i.test(en),
    '⚠️ tiene que decir que ve CADA indicador, no un estado global · «' + es + '»');
  PRUEBAS.cierto(/verde|amarillo|rojo/i.test(es) && /green|amber|red/i.test(en),
    'y con qué granularidad · «' + en + '»');
  PRUEBAS.cierto(/nombre/i.test(es) && /name/i.test(en),
    '⚠️ y que ve tu NOMBRE: es lo que lo separa de Dirección, y esconderlo sería lo contrario de R4');
});

/* ── A13 · las TRES fugas que destapó este prompt, ya cerradas ─────────────────────────────────
   Escribir la lámina "Quién ve qué" obligó a verificar cada línea contra el servidor. Ahí apareció
   que el cortafuegos de Dirección estaba abierto por tres puertas distintas, y que el caso que lo
   vigilaba (`k1b-cortafuegos-hseq.js`) no las veía porque arma su payload A MANO y nunca pasa por
   `accionSupervisor` — R17 otra vez, en el caso que existe justamente para esto.

   1 · `nominaSinDato` viajaba con **la nómina entera, con nombre y apellido**. Y era doble daño:
       el bloque se calcula DESPUÉS de anonimizar, así que comparaba los nombres de la nómina
       contra `P1`, `P2`… — ninguno matcheaba, todos caían en "nunca medidos", y el panel de
       Dirección imprime hasta cuatro de esos nombres en pantalla. Fuga Y número falso.
   2 · La **cédula** sobrevivía en `operacional` y `turnos`: `copiarCon` copiaba todas las claves y
       sólo reemplazaba el nombre. Una cédula al lado de "P1" anula la anonimización entera.
   3 · Las **claves** del índice de ausencias son `cedula|fecha` y `n:nombre|fecha`: el dato está
       en la clave, no en el valor.

   Se entra por `accionSupervisor(p)` con la contraseña de Dirección y se mira el JSON completo,
   que es lo único que prueba que la fuga está cerrada. */

PRUEBAS.caso('🔴 A13 · el payload de Dirección no lleva NINGÚN nombre de la nómina', () => {
  const r = p051Respuestas().hseq;
  PRUEBAS.igual(r.ok, true, 'el panel responde · si no, este caso no mide nada');
  PRUEBAS.alMenos(Number(r.nominaTotal) || 0, 1,
    'y el CONTEO sí llega · es su indicador de cobertura y no identifica a nadie');
  PRUEBAS.igual(r.nominaSinDato, [],
    '⚠️ pero la LISTA de nombres no · viajaba entera y el panel imprime hasta 4 en pantalla');
});

PRUEBAS.caso('🔴 A13 · ninguna cédula sobrevive a la anonimización', () => {
  const r = p051Respuestas().hseq;
  const conCedula = [];
  ['registros', 'aptitud', 'operacional', 'turnos', 'pvt'].forEach(k => {
    (r[k] || []).forEach((f, i) => {
      if (f && (f.cedula != null && String(f.cedula) !== '')) conCedula.push(k + '[' + i + ']=' + f.cedula);
    });
  });
  PRUEBAS.igual(conCedula, [],
    '⚠️ una cédula al lado de "P1" anula la anonimización entera — ' + conCedula.join(', '));
});

PRUEBAS.caso('🔴 A13 · las claves de ausencias tampoco entregan cédulas ni nombres', () => {
  const r = p051Respuestas().hseq;
  PRUEBAS.igual(Object.keys(r.ausencias || {}), [],
    '⚠️ el dato está en la CLAVE (`cedula|fecha`, `n:nombre|fecha`), no en el valor — ' +
    Object.keys(r.ausencias || {}).join(', '));
});

PRUEBAS.caso('el DISCRIMINADOR: al supervisor SÍ le llega todo eso', () => {
  /* Sin esto, un arreglo que vaciara los campos para todo el mundo daría verde en los tres de
     arriba y le rompería el panel al supervisor, que necesita los nombres para asignar tareas. */
  const r = p051Respuestas().supervisor;
  PRUEBAS.igual(r.ok, true, 'el supervisor entra');
  PRUEBAS.alMenos((r.nominaSinDato || []).length, 1,
    'y SÍ recibe la lista de quiénes no se midieron · es su trabajo');
  const hayNombreReal = (r.registros || []).some(x => x.persona && !/^P\d+$/.test(x.persona));
  PRUEBAS.igual(hayNombreReal, true, 'con nombres de verdad, no P1/P2');
});
