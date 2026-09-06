PRUEBAS.grupo('P085b · el alcance lo decide la cuenta, no el POST');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Tercera fuga de la misma familia que P085, encontrada mientras se arreglaba aquélla.
   `accionAusencias`, `accionOpiniones` y `accionAusenciaGuardar` derivaban la empresa como
   `p.empresa || acc.canonical`. Las tres piden contraseña y por eso pasaron todas las revisiones:
   autenticar dice QUIÉN sos, autorizar dice QUÉ podés ver, y lo segundo salía de un campo que
   manda el cliente. Un supervisor de la empresa A cambiaba `empresa` en el POST y leía las de B.

   ⚠️ LAS OPINIONES SON EL BUZÓN ANÓNIMO. La hoja no guarda nombre, ni cédula, ni departamento, ni
   fecha exacta, todo a propósito para que nadie pueda deducir quién escribió. Pero eso protege
   contra quien MIRA LA HOJA; contra quien pide por la puerta lo único que protegía era el filtro
   por empresa, y ese filtro lo elegía el cliente.

   ⚠️ Y ADEMÁS HABÍA UN BUG FUNCIONAL, que es lo que llevó a mirar acá. El LECTOR del panel usa
   `acc.canonical || acc.empresas[0]`; el ESCRITOR usaba `p.empresa`, que el cliente llena con
   `DASH.params.empresa` — y eso es el **nombre de usuario**, no la empresa (index.html arma
   `{ action:'supervisor', usuario:c.usuario, empresa:c.usuario, … }`). Si el usuario de una cuenta
   no se llama igual que su empresa, la ausencia se guardaba bajo una empresa inexistente y el
   lector no la encontraba nunca: el supervisor marca el franco, lo ve, refresca, y desapareció.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). Se llama a las acciones con el payload que arma el cliente
   —incluido `empresa: <usuario>`, que es lo que manda hoy— y la lectura se hace con `ausenciasDe`,
   que es la función que alimenta el panel de verdad. Los dos eslabones, no uno.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P085B_ACCESOS = [
  ['Usuario', 'Contraseña', 'Rol', 'Empresas', 'Contraseña Médica', 'Contraseña HSEQ'],
  /* ⚠️ El usuario NO se llama igual que la empresa. Es el caso que destapa el bug funcional, y es
     el caso normal: nadie pone de usuario el nombre completo del cliente. */
  ['rafael',  'claveDeRafael', 'supervisor', 'Consorcio HELITEC', '', ''],
  ['cardon',  'claveDeCardon', 'supervisor', 'Cardón',            '', ''],
  ['*',       'claveDelAdmin', 'admin',      '',                  '', '']
];

const P085B_AUS_CAB = ['IdAusencia', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo',
                       'Estado', 'Marcada', 'MarcadaPor', 'Anulada', 'AnuladaPor'];
const P085B_OPI_CAB = ['IdOpinion', 'Empresa', 'Mes', 'Texto'];

function p085bEnv(extra) {
  const env = GS.crearEntorno(Object.assign({
    'Accesos':   P085B_ACCESOS.map(f => f.slice()),
    'Ausencias': [P085B_AUS_CAB.slice()],
    'Opiniones': [P085B_OPI_CAB.slice(),
                  ['o1', 'Consorcio HELITEC', '2026-09', 'Acá se trabaja con miedo.'],
                  ['o2', 'Cardón',            '2026-09', 'La planta no para nunca.']],
    'Nómina':    [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo',
                   'Edad', 'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app',
                   'Nivel de riesgo'],
                  ['Consorcio HELITEC', 'Ana Suárez', 'V-111', 'Operaciones', 'Piloto', 'F', '34',
                   '', '', 'Sí', '', '', '4']]
  }, extra || {}));
  const api = GS.cargarGs(CTX.gs, env,
    ['accionAusencias', 'accionOpiniones', 'accionAusenciaGuardar', 'ausenciasDe', 'ausScope',
     'validarAcceso', 'construirAlias']);
  api.__env = env;
  api.__filas = () => {
    const sh = env.__libro.getSheetByName('Ausencias');
    return sh.getRange(1, 1, sh.getLastRow(), 12).getValues().slice(1);
  };
  return api;
}

/* El POST tal cual lo arma el cliente hoy: `empresa` lleva el USUARIO. */
function p085bPost(usuario, pass, extra) {
  return Object.assign({ usuario: usuario, empresa: usuario, pass: pass,
                         dispositivoId: 'disp-prueba' }, extra || {});
}
function p085bJson(r) { return JSON.parse(r.getContent ? r.getContent() : r); }

PRUEBAS.caso('🔒 un supervisor NO puede pedir las opiniones de otra empresa', () => {
  const api = p085bEnv();
  const r = p085bJson(api.accionOpiniones(
    p085bPost('rafael', 'claveDeRafael', { empresa: 'Cardón' })));
  PRUEBAS.igual(r.ok, true, 'la acción responde');
  const textos = (r.opiniones || []).map(o => o.texto).join(' | ');
  PRUEBAS.igual(textos.indexOf('La planta no para nunca') < 0, true,
    'no llegó ninguna opinión de Cardón · llegó «' + textos + '»');
  PRUEBAS.igual(textos.indexOf('Acá se trabaja con miedo') >= 0, true,
    'y sí llegan las suyas · el discriminador de que el filtro no quedó rompiendo todo');
});

PRUEBAS.caso('🔒 tampoco las ausencias de otra empresa', () => {
  const api = p085bEnv({ 'Ausencias': [P085B_AUS_CAB.slice(),
    ['a1', 'Cardón', 'V-222', 'Bruno Lara', '2026-09-06', '2026-09-06', 'franco', 'vigente',
     '', '', '', '']] });
  const r = p085bJson(api.accionAusencias(
    p085bPost('rafael', 'claveDeRafael', { empresa: 'Cardón' })));
  PRUEBAS.igual((r.ausencias || []).length, 0,
    'cero ausencias ajenas · llegaron ' + JSON.stringify(r.ausencias));
});

PRUEBAS.caso('🔒 y no puede marcarle un franco a alguien de otra empresa', () => {
  const api = p085bEnv();
  api.accionAusenciaGuardar(p085bPost('rafael', 'claveDeRafael',
    { empresa: 'Cardón', id: 'a9', cedula: 'V-222', persona: 'Bruno Lara',
      desde: '2026-09-06', hasta: '2026-09-06', motivo: 'franco', quien: 'Rafael' }));
  const filas = api.__filas();
  PRUEBAS.igual(filas.length, 1, 'se escribió una fila');
  PRUEBAS.igual(String(filas[0][1]), 'Consorcio HELITEC',
    'y quedó bajo SU empresa, no bajo la que pidió · quedó «' + filas[0][1] + '»');
});

PRUEBAS.caso('el admin SÍ puede elegir empresa · si no, no vería ninguna', () => {
  const api = p085bEnv();
  const r = p085bJson(api.accionOpiniones(
    { usuario: '*', empresa: 'Cardón', pass: 'claveDelAdmin', dispositivoId: 'd' }));
  PRUEBAS.igual((r.opiniones || []).map(o => o.texto).join('').indexOf('La planta') >= 0, true,
    'el admin pidió Cardón y recibió Cardón');
});

PRUEBAS.caso('el admin sin empresa NO escribe una fila huérfana', () => {
  const api = p085bEnv();
  const r = p085bJson(api.accionAusenciaGuardar(
    { usuario: '*', pass: 'claveDelAdmin', dispositivoId: 'd', id: 'a1', cedula: 'V-111',
      persona: 'Ana Suárez', desde: '2026-09-06', hasta: '2026-09-06', motivo: 'franco' }));
  PRUEBAS.igual(r.ok, false, 'lo rechaza');
  PRUEBAS.igual(api.__filas().length, 0,
    'y no deja una fila con la columna Empresa vacía · nadie la leería y R3 no deja borrarla');
});

PRUEBAS.caso('⚠️ el bug funcional: lo que se escribe es lo que después se lee', () => {
  /* La cadena completa: el supervisor marca el franco con el payload REAL (donde `empresa` es el
     usuario "rafael") y después se lee con `ausenciasDe`, que es lo que alimenta el panel. Antes
     la fila caía bajo "rafael" y el lector buscaba "Consorcio HELITEC": no la encontraba nunca. */
  const api = p085bEnv();
  api.accionAusenciaGuardar(p085bPost('rafael', 'claveDeRafael',
    { id: 'a1', cedula: 'V-111', persona: 'Ana Suárez', desde: '2026-09-06',
      hasta: '2026-09-06', motivo: 'franco', quien: 'Rafael' }));
  const idx = api.ausenciasDe('Consorcio HELITEC', '2026-09-01', '2026-09-30');
  PRUEBAS.igual(Object.keys(idx).length > 0, true,
    'el panel encuentra la ausencia que el panel acababa de escribir · índice ' +
    JSON.stringify(idx));
});

PRUEBAS.caso('el discriminador: con el alcance viejo, ese caso tiene que fallar', () => {
  /* Se reproduce a mano lo que hacía la versión anterior —`p.empresa || acc.canonical`— y se
     comprueba que da distinto. Sin esto, "el lector la encuentra" podría estar dando verde por
     cualquier otra razón. */
  const api = p085bEnv();
  const alias = api.construirAlias();
  const acc = api.validarAcceso('rafael', 'claveDeRafael', 'disp-prueba');
  PRUEBAS.igual(!!acc, true, 'la cuenta valida');
  const viejo = String('rafael' || acc.canonical || '');            // lo que hacía antes
  const nuevo = api.ausScope(acc, alias, 'rafael');                 // lo que hace ahora
  PRUEBAS.igual(viejo !== nuevo, true,
    'los dos alcances DIFIEREN · viejo «' + viejo + '» · nuevo «' + nuevo + '»');
  PRUEBAS.igual(nuevo, 'Consorcio HELITEC', 'y el nuevo es la empresa de la cuenta');
});

PRUEBAS.caso('un supervisor con DOS empresas queda en la primera, igual que el lector', () => {
  /* No es lo ideal —debería poder elegir entre las suyas— pero es EXACTAMENTE lo que ya hace el
     lector del panel (`acc.canonical || acc.empresas[0]`). Lo que este caso protege es que los dos
     lados sigan coincidiendo: un escritor y un lector con alcances distintos es el bug de arriba. */
  const api = p085bEnv({ 'Accesos': [
    P085B_ACCESOS[0].slice(),
    ['multi', 'claveMulti', 'supervisor', 'Consorcio HELITEC, Cardón', '', '']] });
  const alias = api.construirAlias();
  const acc = api.validarAcceso('multi', 'claveMulti', 'd');
  PRUEBAS.igual(api.ausScope(acc, alias, 'Cardón'), 'Consorcio HELITEC',
    'pedir la segunda no la da · el alcance sigue siendo el mismo que usa el lector');
});
