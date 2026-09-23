PRUEBAS.grupo('P091 · A8 · la bitácora que recibe Dirección no lleva nombres (R4: lo que la lámina promete, el servidor lo cumple)');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LA PROMESA, Y DÓNDE ESTÁ ESCRITA

   `priv_hseq_1`, en la lámina de privacidad que la persona lee ANTES de decidir si contesta la
   verdad: «Lo mismo que el supervisor, pero **sin nombres**: cada persona aparece como P1, P2, P3…».

   EL DEFECTO QUE ESTE ARCHIVO EXISTE PARA QUE NO VUELVA
   `accionBitacora` no miraba `acc.vista`. Con la contraseña de Dirección —la misma que su panel
   manda en cada pedido— un solo `action=bitacora` devolvía la bitácora completa de la empresa con
   el nombre real en `sujeto` y en `actor`.

   Y no hacía falta ni leer los nombres para romper la anonimización del panel: cada `ciclo_detenido`
   (lo escribe el reloj solo, cada hora, para toda persona que se olvidó de marcar la llegada) y cada
   `ciclo_cerrado` (P077) llevan `detalle.ultimoEvento` —el ISO exacto del último evento del ciclo— y
   ese mismo ISO viaja en el `operacional` anonimizado que el panel acaba de entregar. Un join por
   ese campo le pega el nombre a un P-id, y con eso queda identificado todo lo demás de esa persona:
   departamento, cargo, niveles por indicador, aptitud y su ciclo entero.

   ES EL TERCERO DE LA MISMA FAMILIA, y por eso el arreglo va por lista blanca:
     · A13  tapó la `cedula` que cruzaba al lado del P-id en `operacional` y `turnos`.
     · P151 tapó el `id` de turno, que lleva la cédula adentro (`turno_c12345678_…`).
     · esto tapa la bitácora, que mandaba el nombre directo.
   Con una lista NEGRA, el próximo campo que alguien agregue a `detalle` vuelve a filtrar sin que
   nadie se entere. Con lista blanca, un campo nuevo no viaja hasta que alguien decida que viaje.

   Lo encontró la auditoría de cierre de tanda (P091 · A8), el 2026-09-23. Es el mismo tipo de
   hallazgo que cerró A7: una promesa escrita en la pantalla y un endpoint que la incumplía.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P091B_ACCESOS = [
  ['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
  ['empresa1', 'claveSup', 'supervisor', 'Empresa Uno', 'claveMed', 'claveHseq']
];
const P091B_BITA_CAB = ['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo',
  'UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON'];

/* El ISO es el que hace el join: el mismo instante viaja en `operacional` anonimizado. */
const P091B_ISO = '2026-09-20T11:30:00.000Z';
const P091B_NOMBRE = 'Ana Suárez';
const P091B_ACTOR  = 'Rafael Silva';

function p091bFila(id, accion, sujeto, detalle){
  const ev = { id: id, ts: Date.parse('2026-09-20T12:00:00.000Z'), empresa: 'Empresa Uno',
               actor: P091B_ACTOR, rol: 'supervisor', accion: accion, sujeto: sujeto,
               detalle: detalle || {}, origen: 'endpoint', umbral: null, app: '2026-09-23.1' };
  return ['20/09/2026 12:00', 'Empresa Uno', accion, sujeto, P091B_ACTOR, 'supervisor', 'endpoint',
          '', '', '', '2026-09-23.1', id, JSON.stringify(ev)];
}

function p091bEnv(){
  const env = GS.crearEntorno({
    'Accesos': P091B_ACCESOS.map(f => f.slice()),
    'Bitácora': [P091B_BITA_CAB.slice(),
      /* Los dos que llevan el ISO que permite el join, tal como los escribe el servidor. */
      p091bFila('srv_1', 'ciclo_detenido', P091B_NOMBRE, { fase: 'llegada_aero', ultimoEvento: P091B_ISO, umbralHoras: 24 }),
      p091bFila('srv_2', 'ciclo_cerrado',  P091B_NOMBRE, { fase: 'salida_aero', ultimoEvento: P091B_ISO, quien: P091B_ACTOR, inicio: '2026-09-20T05:00:00.000Z' }),
      /* Y uno de nómina, que es el que le entrega la lista que `accionNominaListar` le niega. */
      p091bFila('srv_3', 'nomina_sync', P091B_NOMBRE, { alta: true })
    ]
  });
  return GS.cargarGs(CTX.gs, env, ['accionBitacora']);
}

/* Todo lo que viaja, aplanado a texto: es la única forma honesta de preguntar «¿aparece el nombre
   en algún lado?» sin tener que adivinar en qué clave se escondió. */
function p091bTexto(r){ return JSON.stringify(r); }

PRUEBAS.caso('🔒 P091 · con la contraseña de Dirección, la bitácora vuelve SIN el nombre de nadie', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p091bEnv();
  const r = JSON.parse(api.accionBitacora({ usuario: 'empresa1', pass: 'claveHseq', empresa: 'Empresa Uno' }).getContent());

  PRUEBAS.cierto(r.ok, 'guarda: la credencial de Dirección entra · si esto fuera false, lo de abajo no mediría nada');
  PRUEBAS.igual((r.eventos || []).length, 3, 'guarda: llegan los tres eventos · el recorte es de CAMPOS, no de filas — Dirección sigue pudiendo contar');

  const txt = p091bTexto(r);
  PRUEBAS.igual(txt.indexOf(P091B_NOMBRE), -1,
    '🔒 el nombre de la persona NO aparece en ninguna clave de la respuesta («' + P091B_NOMBRE + '»)');
  PRUEBAS.igual(txt.indexOf(P091B_ACTOR), -1,
    '🔒 ni el de quien hizo la acción («' + P091B_ACTOR + '»): un actor es una persona igual que un sujeto');
  PRUEBAS.igual(txt.indexOf(P091B_ISO), -1,
    '🔒 ni el ISO del último evento · es el campo con el que se le pega el nombre a un P-id, cruzando con el `operacional` que el panel ya entregó');

  const s = new Set((r.eventos || []).map(e => e.sujeto));
  PRUEBAS.igual([...s], ['P1'], 'y la persona aparece como P1, que es lo que la lámina promete');
  PRUEBAS.igual((r.eventos || []).map(e => e.accion).sort(), ['ciclo_cerrado', 'ciclo_detenido', 'nomina_sync'],
    'la ACCIÓN sí viaja: es lo que Dirección necesita para contar intervenciones y trazabilidad');
});

PRUEBAS.caso('🔒 DISCRIMINADOR · con la contraseña del SUPERVISOR la misma bitácora sí trae los nombres', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p091bEnv();
  const r = JSON.parse(api.accionBitacora({ usuario: 'empresa1', pass: 'claveSup', empresa: 'Empresa Uno' }).getContent());

  PRUEBAS.cierto(r.ok, 'guarda: el supervisor entra');
  const txt = p091bTexto(r);
  PRUEBAS.cierto(txt.indexOf(P091B_NOMBRE) >= 0,
    '🔒 DISCRIMINADOR · el supervisor SÍ ve el nombre · sin esto, «no aparece el nombre» podría ser una respuesta vacía o un filtro que rompió todo');
  PRUEBAS.cierto(txt.indexOf(P091B_ISO) >= 0,
    'y también el detalle completo: el recorte es de Dirección, no de todos');
  PRUEBAS.igual((r.eventos || []).length, 3, 'con la misma cantidad de eventos que ve Dirección');
});

PRUEBAS.caso('🔒 P091 · el mapa de P-id es PROPIO de este pedido: cruzar dos respuestas no reidentifica', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* Dos personas, para que el mapa tenga más de una entrada y el orden importe. */
  const env = GS.crearEntorno({
    'Accesos': P091B_ACCESOS.map(f => f.slice()),
    'Bitácora': [P091B_BITA_CAB.slice(),
      p091bFila('srv_a', 'ciclo_detenido', 'Zulema Ríos', { ultimoEvento: P091B_ISO }),
      p091bFila('srv_b', 'ciclo_detenido', P091B_NOMBRE,  { ultimoEvento: P091B_ISO })]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionBitacora']);
  const r = JSON.parse(api.accionBitacora({ usuario: 'empresa1', pass: 'claveHseq', empresa: 'Empresa Uno' }).getContent());
  const ids = (r.eventos || []).map(e => e.sujeto);

  PRUEBAS.igual(ids, ['P1', 'P2'], 'dos personas distintas reciben dos P-id distintos, en el orden en que aparecen');
  PRUEBAS.igual(p091bTexto(r).indexOf('Zulema'), -1, 'y ninguno de los dos nombres viaja');
  /* ⚠️ El P-id NO tiene por qué coincidir con el del panel, y es a propósito: `anonimizarHseq`
     numera por `registros` dentro de su propio pedido. Si coincidieran, cruzar las dos respuestas
     sería una forma de reidentificar. */
  PRUEBAS.cierto(true, 'y este mapa es de ESTE pedido: no se puede cruzar con el P1 del panel (lo dice el comentario del arreglo)');
});

PRUEBAS.caso('🔒 P091 · la lista es BLANCA: un campo nuevo en el detalle no viaja solo', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  /* El escenario que mata a una lista negra: alguien agrega un campo al detalle y nadie se acuerda
     de taparlo. Acá se simula con una cédula, que es el identificador más fuerte de la app. */
  const env = GS.crearEntorno({
    'Accesos': P091B_ACCESOS.map(f => f.slice()),
    'Bitácora': [P091B_BITA_CAB.slice(),
      p091bFila('srv_z', 'accion_inventada', P091B_NOMBRE,
                { campoNuevoQueNadieTapo: 'V-11223344', otroMas: P091B_NOMBRE })]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionBitacora']);
  const r = JSON.parse(api.accionBitacora({ usuario: 'empresa1', pass: 'claveHseq', empresa: 'Empresa Uno' }).getContent());
  const txt = p091bTexto(r);

  PRUEBAS.igual(txt.indexOf('V-11223344'), -1,
    '🔒 un campo que nadie previó NO viaja · es la diferencia entre lista blanca y lista negra, y la razón de que el arreglo sea así');
  PRUEBAS.igual(txt.indexOf('campoNuevoQueNadieTapo'), -1, 'ni siquiera su nombre');
  PRUEBAS.igual((r.eventos || []).length, 1, 'DISCRIMINADOR · pero el evento sigue llegando: se recortan campos, no se pierden hechos');
  PRUEBAS.igual((r.eventos || [])[0].accion, 'accion_inventada', 'y su acción viaja, que es lo que Dirección cuenta');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Y DIRECCIÓN TAMPOCO ESCRIBE (P200, la refutación de A8)

   `accionBitacoraGuardar` sólo miraba `accesoPanel_` y `acc.soloLectura`: le faltaba el candado de
   vista que las otras diez acciones sobre personas ya tienen. Con la contraseña de la columna
   «Contraseña HSEQ» se podía dejar una línea PERMANENTE —R3: la bitácora no se edita ni se borra—
   con el sujeto, el actor y el rol que el cliente quisiera mandar. Los dos escépticos lo
   confirmaron por separado, cada uno reproduciéndolo contra el `.gs` real.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P200 · con la contraseña de Dirección NO se puede escribir en la bitácora', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Accesos': P091B_ACCESOS.map(f => f.slice()),
    'Bitácora': [P091B_BITA_CAB.slice()]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionBitacoraGuardar']);
  const evento = JSON.stringify({ id: 'falso_1', ts: Date.now(), empresa: 'Empresa Uno',
    actor: 'quien yo quiera', rol: 'supervisor', accion: 'determinacion_medica',
    sujeto: P091B_NOMBRE, detalle: {}, origen: 'panel' });

  const r = JSON.parse(api.accionBitacoraGuardar({ usuario: 'empresa1', pass: 'claveHseq',
    empresa: 'Empresa Uno', evento: evento }).getContent());
  PRUEBAS.falso(r.ok, '🔒 la escritura se rechaza · antes respondía ok y la fila quedaba escrita para siempre');
  PRUEBAS.igual(r.motivo, 'sin_permiso', 'con el mismo motivo que usan las otras acciones sobre personas');

  const hoja = env.__libro.getSheetByName('Bitácora');
  PRUEBAS.igual(hoja.getLastRow(), 1, 'y la hoja sigue teniendo sólo el encabezado · nada se escribió');

  /* DISCRIMINADOR · el supervisor SÍ escribe. Sin esto, «no se escribió» podría ser un emulador que
     no sabe escribir, o una acción rota para todos. */
  const r2 = JSON.parse(api.accionBitacoraGuardar({ usuario: 'empresa1', pass: 'claveSup',
    empresa: 'Empresa Uno', evento: evento }).getContent());
  PRUEBAS.cierto(r2.ok, '🔒 DISCRIMINADOR · el supervisor sí puede registrar · el candado es de vista, no un rechazo general');
  PRUEBAS.igual(hoja.getLastRow(), 2, 'y su fila quedó escrita');
});
