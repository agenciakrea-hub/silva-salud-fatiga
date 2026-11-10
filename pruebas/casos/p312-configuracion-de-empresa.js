PRUEBAS.grupo('P312 · la configuración de la empresa desde el panel');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Las tres cosas que una empresa querría cargar sobre sí misma —el sector, la marca y la escala de
   riesgo por cargo— se cargaban a mano en el CH (incidente del 2026-10-03, «cargaron información de
   la empresa y no lo veo»). Desde P312 las carga el administrador desde el panel.

   R19 · los derechos los conceden: `empCfgAcceso_` (quién: sólo el administrador, nunca el visor, y
   sólo empresas que existen y son suyas), `accionEmpresaConfigGuardar` (qué se escribe y con qué
   forma), `mantConfigSet` / la hoja `Marca` / `mantNivelSet` (dónde), `bitacoraServidor` (R3).
   Y la tarea `accesos_genericas` (F084).

   R17 · se entra por las acciones del panel con la contraseña del administrador, y lo escrito se
   lee por los lectores de siempre (`leerConfigEmpresaCanon`, `leerMarca`, `leerNivelesRiesgo`).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P312_ADMIN = 'admin-p312#';
const P312_TOKEN = () => (CTX.gs.match(/var MANT_TOKEN = "([^"]*)"/) || [])[1];
function p312Hojas() {
  return {
    'Accesos': [['Usuario', 'Contraseña', 'Rol', 'EMPRESAS', 'Contraseña Médica', 'Contraseña Dirección', 'Contraseña panel HSEQ'],
      ['*',       P312_ADMIN, 'admin',      '',                           '',        '',        ''],
      ['helitec', 'sup-312',  'supervisor', 'Consorcio HELITEC, Helitec', '',        'dir-312', ''],
      ['silva',   'sil-312',  'supervisor', 'Aeroambulancias Silva',      'med-312', '',        ''],
      ['',        '',         '',           '',                           '',        '',        '']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad','Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
      ['Consorcio HELITEC', 'Ana Suárez',  'V-1', 'Operaciones', 'Piloto',  'F', '40', '', '', 'Sí', '', 'Empleado', ''],
      ['Consorcio HELITEC', 'Luis Ferrer', 'V-2', 'Operaciones', 'Piloto',  'M', '35', '', '', 'Sí', '', 'Empleado', ''],
      ['Consorcio HELITEC', 'Beto Pérez',  'V-3', 'Taller',      'Técnico', 'M', '45', '', '', 'No', '', 'Empleado', ''],
      ['Aeroambulancias Silva', 'Carla Díaz', 'V-4', 'Vuelo', 'Piloto', 'F', '30', '', '', 'Sí', '', 'Empleado', '']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel']],
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Umbral', 'Hora', 'Nivel', 'App', 'Id', 'Detalle']],
    'Sesiones': [['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical','Combinada','Creada','UltimoUso','Estado','Cerrada','Panel']]
  };
}
function p312Api(extraFns, hojas) {
  const env = GS.crearEntorno(hojas || p312Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['manejar', 'accionEmpresaConfig', 'accionEmpresaConfigGuardar',
    'leerConfigEmpresaCanon', 'leerMarca', 'leerNivelesRiesgo'].concat(extraFns || []));
  api.__env = env;
  api.__hoja = n => env.__libro.getSheetByName(n) ? env.__libro.getSheetByName(n).__volcado() : null;
  api.__bit = () => (api.__hoja('Bitácora') || []).slice(1).filter(f => String(f[2] || '').indexOf('empresa_') === 0);
  return api;
}
const p312J = r => JSON.parse(r.getContent());
/* Los dos casos de la segunda vuelta del verificador. A: los dos pilotos con regla propia, e Iris
   («Piloto Instructor») sin regla. B: tres pilotos, uno (Luis) con regla propia, e Iris. */
function p312HojasA() {
  const h = p312Hojas();
  h['Niveles Riesgo'].push(['Consorcio HELITEC', '', '', 'Ana Suárez', '5'], ['Consorcio HELITEC', '', '', 'Luis Ferrer', '5']);
  h['Nómina'].push(['Consorcio HELITEC', 'Iris Gómez', 'V-6', 'Operaciones', 'Piloto Instructor', 'F', '41', '', '', 'Sí', '', 'Empleado', '']);
  return h;
}
function p312HojasB() {
  const h = p312Hojas();
  h['Niveles Riesgo'].push(['Consorcio HELITEC', '', '', 'Luis Ferrer', '5']);
  h['Nómina'].push(['Consorcio HELITEC', 'Mia Soto', 'V-8', 'Operaciones', 'Piloto', 'F', '29', '', '', 'Sí', '', 'Empleado', ''],
                   ['Consorcio HELITEC', 'Iris Gómez', 'V-6', 'Operaciones', 'Piloto Instructor', 'F', '41', '', '', 'Sí', '', 'Empleado', '']);
  return h;
}
const P312_ADMIN_P = { usuario: '*', pass: P312_ADMIN, dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true };
const p312Leer = (api, extra) => p312J(api.accionEmpresaConfig(Object.assign({}, P312_ADMIN_P, extra || {})));
const p312Guardar = (api, extra) => p312J(api.accionEmpresaConfigGuardar(Object.assign({}, P312_ADMIN_P, extra || {})));

PRUEBAS.caso('🔴 sólo el administrador configura la empresa: ni el supervisor, ni el visor, ni una empresa que no existe', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p312Api();
  /* R19 · `empCfgAcceso_` */
  PRUEBAS.cierto(p312Leer(api).ok, 'guarda: el administrador lee');
  const sup = { usuario: 'helitec', pass: 'sup-312', dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true };
  PRUEBAS.igual(p312J(api.accionEmpresaConfig(sup)).motivo, 'sin_permiso', '🔴 el supervisor no lee la configuración');
  PRUEBAS.igual(p312J(api.accionEmpresaConfigGuardar(Object.assign({ que: 'sector', sector: 'campo' }, sup))).motivo, 'sin_permiso',
    '🔴 ni la cambia');
  const visor = Object.assign({}, P312_ADMIN_P, { verEmpresa: 'Consorcio HELITEC', verVista: 'medico' });
  PRUEBAS.igual(p312J(api.accionEmpresaConfigGuardar(Object.assign({ que: 'sector', sector: 'campo' }, visor))).motivo, 'solo_lectura',
    '🔴 el visor no escribe (ADR 007)');
  PRUEBAS.igual(p312Leer(api, { empresa: 'No Existe SA' }).motivo, 'sin_empresa', '🔴 una empresa sin cuenta en Accesos, no');
  PRUEBAS.igual(p312Leer(api, { empresa: '' }).motivo, 'sin_empresa', 'y sin empresa elegida tampoco (ADR 014)');
  PRUEBAS.igual(api.__bit().length, 0, 'y nada de eso dejó una línea de bitácora');

  /* ADR 017 · una fila de EMPRESA con rol «admin»: `validarAcceso` les da ese rol también a sus contraseñas
     de Dirección y de HSEQ, pero la vista `hseq` no configura (`empCfgAcceso_`). Hallazgo 3 del verificador. */
  const h3 = p312Hojas();
  h3['Accesos'].splice(4, 0, ['socio', 'soc-312', 'admin', 'Consorcio HELITEC', '', 'socdir-312', 'sochseq-312']);
  const api3 = p312Api([], h3);
  const socio = pw => ({ usuario: 'socio', pass: pw, dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true });
  PRUEBAS.igual(p312J(api3.accionEmpresaConfig(socio('soc-312'))).ok, true, 'guarda: con su contraseña principal, esa fila es administradora');
  ['socdir-312', 'sochseq-312'].forEach(pw => {
    PRUEBAS.igual(p312J(api3.accionEmpresaConfig(socio(pw))).motivo, 'sin_permiso', '🔴 su contraseña ' + pw.slice(3, 6) + ' no lee la configuración');
    PRUEBAS.igual(p312J(api3.accionEmpresaConfigGuardar(Object.assign({ que: 'sector', sector: 'campo' }, socio(pw)))).motivo, 'solo_lectura',
      '🔴 ni la cambia (' + pw.slice(3, 6) + ')');
  });
  PRUEBAS.igual(api3.__bit().length, 0, 'y no quedó nada escrito');
});

PRUEBAS.caso('🔴 el sector se guarda en `Config Empresa`, el panel lo lee, y queda en la bitácora una sola vez', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p312Api();
  PRUEBAS.igual(p312Leer(api).sector, '', 'guarda: hoy ninguna empresa tiene sector (medido en P220)');
  const r = p312Guardar(api, { que: 'sector', sector: 'aviacion' });
  PRUEBAS.igual([r.ok, r.cambio], [true, true], '🔴 se guarda · ' + (r.error || ''));
  PRUEBAS.igual(api.leerConfigEmpresaCanon('Consorcio HELITEC').sector, 'aviacion', '🔴 y lo lee el mismo lector que arma el panel');
  PRUEBAS.igual(p312Leer(api).sector, 'aviacion', 'la pantalla lo muestra');
  const b = api.__bit();
  PRUEBAS.igual(b.length, 1, '🔴 R3 · una línea de bitácora');
  PRUEBAS.cierto(/"antes":""/.test(b[0][12]) && /"despues":"aviacion"/.test(b[0][12]), 'con el antes y el después');
  const otra = p312Guardar(api, { que: 'sector', sector: 'aviacion' });
  PRUEBAS.igual([otra.ok, otra.cambio, api.__bit().length], [true, false, 1], '🔴 reenviar lo mismo no escribe ni suma bitácora');
  PRUEBAS.igual(p312Guardar(api, { que: 'sector', sector: 'marte' }).motivo, 'sector_invalido', 'un sector que no existe, no');
});

PRUEBAS.caso('🔴 la marca se guarda en la hoja `Marca` con la forma que la app sabe usar', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p312Api();
  const r = p312Guardar(api, { que: 'marca', nombre: '=HELITEC Aviación', color: '#1a3b5c', logo: 'https://ejemplo.com/logo.png' });
  PRUEBAS.igual([r.ok, r.cambio], [true, true], '🔴 se guarda · ' + (r.error || ''));
  PRUEBAS.igual(api.leerMarca('consorcio helitec'), { nombre: 'HELITEC Aviación', color: '#1a3b5c', logo: 'https://ejemplo.com/logo.png' },
    '🔴 la lee `leerMarca`, el lector del panel · y el «=» del principio no llega a la hoja (fórmula)');
  PRUEBAS.igual(api.__bit().length, 1, 'R3 · una línea de bitácora');
  PRUEBAS.igual(p312Guardar(api, { que: 'marca', nombre: 'HELITEC Aviación', color: '#1a3b5c', logo: 'https://ejemplo.com/logo.png' }).cambio, false,
    'lo mismo otra vez no escribe');
  PRUEBAS.igual(p312Guardar(api, { que: 'marca', nombre: 'X', color: 'rojo' }).motivo, 'color_invalido', '🔴 el color va como #RRGGBB');
  PRUEBAS.igual(p312Guardar(api, { que: 'marca', nombre: 'X', logo: 'http://inseguro.com/l.png' }).motivo, 'logo_invalido', '🔴 el logo, sólo https');
  PRUEBAS.igual(p312Guardar(api, { que: 'marca', nombre: 'x'.repeat(61) }).motivo, 'nombre_largo', 'y el nombre hasta 60');
  const vacia = p312Guardar(api, { que: 'marca', nombre: '', color: '', logo: '' });
  PRUEBAS.igual([vacia.ok, api.leerMarca('consorcio helitec')], [true, null], 'vacío = sin marca propia (el panel vuelve al nombre de la empresa)');
});

PRUEBAS.caso('🔴 la escala por cargo: los cargos de la nómina, la regla de cargo, y la bitácora con a cuántas personas toca', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p312Api();
  const e0 = p312Leer(api).escala;
  PRUEBAS.igual(e0.map(x => [x.cargo, x.personas, x.regla, x.vigente]), [['Piloto', 2, null, 3], ['Técnico', 1, null, 3]],
    '🔴 un renglón por cargo de ESTA empresa (la piloto de Silva no cuenta), sin regla y con el nivel por defecto');
  const r = p312Guardar(api, { que: 'nivel', cargo: 'Piloto', nivel: '4' });
  PRUEBAS.igual([r.ok, r.cambio], [true, true], '🔴 se guarda · ' + (r.error || ''));
  PRUEBAS.cierto(api.leerNivelesRiesgo().some(f => f.empresa === 'Consorcio HELITEC' && f.cargo === 'Piloto' && !f.departamento && !f.persona && f.nivel === 4),
    '🔴 como regla de CARGO en `Niveles Riesgo`, la que lee el servidor');
  PRUEBAS.igual(p312Leer(api).escala.find(x => x.cargo === 'Piloto').vigente, 4, 'y la pantalla la muestra');
  const b = api.__bit();
  PRUEBAS.igual(b.length, 1, 'R3 · una línea');
  PRUEBAS.cierto(/"personas":2/.test(b[0][12]) && /"despues":4/.test(b[0][12]), 'que dice a cuántas personas toca y el nivel nuevo');
  PRUEBAS.igual(p312Guardar(api, { que: 'nivel', cargo: 'Piloto', nivel: '4' }).cambio, false, 'el mismo nivel otra vez, no');
  PRUEBAS.igual(p312Guardar(api, { que: 'nivel', cargo: 'Astronauta', nivel: '4' }).motivo, 'nivel_invalido', '🔴 un cargo que no está en la nómina, no');
  PRUEBAS.igual(p312Guardar(api, { que: 'nivel', cargo: 'Piloto', nivel: '6' }).motivo, 'nivel_invalido', 'ni un nivel fuera de 1 a 5');
});

PRUEBAS.caso('🔴 la escala dice el nivel que RIGE, con el lector del panel: la fila real de HELITEC, un departamento y una persona', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · el nivel lo concede `nivelRiesgoDeServer` (persona › cargo › departamento › general, y en cada
     campo la PRIMERA fila que coincide). `empCfgEscala_` lo cuenta con esa misma función, persona por
     persona, y simula la escritura de `mantNivelSet` para saber a quién le cambiaría.
     La fila es la ÚNICA regla de HELITEC en el CH (medido el 2026-10-20): «Operaciones · Piloto · 4».
     El lector la aplica a todo piloto y a todo el que esté en Operaciones. */
  const hojas = p312Hojas();
  hojas['Niveles Riesgo'].push(['Consorcio HELITEC', 'Operaciones', 'Piloto', '', '4']);
  hojas['Nómina'].push(['Consorcio HELITEC', 'Cora Ruiz', 'V-5', 'Operaciones', 'Técnico', 'F', '33', '', '', 'No', '', 'Empleado', '']);
  const api = p312Api(['nivelRiesgoDeServer'], hojas);
  const rige = (nombre, dep, cargo) => api.nivelRiesgoDeServer(api.leerNivelesRiesgo(), nombre, dep, 'Consorcio HELITEC', cargo);
  const fila = c => p312Leer(api).escala.find(x => x.cargo === c);
  const pil = fila('Piloto'), tec = fila('Técnico');
  PRUEBAS.igual([pil.vigente, pil.gobernadas], [4, 0], '🔴 los pilotos están en 4 por la fila combinada, y una regla de cargo nueva no le cambiaría el nivel a ninguno');
  PRUEBAS.igual([rige('Ana Suárez', 'Operaciones', 'Piloto'), rige('Luis Ferrer', 'Operaciones', 'Piloto')], [4, 4], 'guarda: es lo que dice el lector del panel');
  PRUEBAS.igual([tec.vigente, tec.niveles, tec.gobernadas], [null, { 3: 1, 4: 1 }, 2],
    '🔴 los técnicos VARÍAN: Cora está en Operaciones (4 por departamento), Beto no (3); la regla de cargo le ganaría a las dos');
  const filasAntes = api.__hoja('Niveles Riesgo').length;
  const r0 = p312Guardar(api, { que: 'nivel', cargo: 'Piloto', nivel: '5' });
  PRUEBAS.igual(r0.motivo, 'nivel_sin_efecto', '🔴 una regla que no le cambia el nivel a nadie no se escribe · ' + (r0.error || ''));
  PRUEBAS.igual([api.__hoja('Niveles Riesgo').length, api.__bit().length], [filasAntes, 0], 'ni en la hoja ni en la bitácora');
  const r1 = p312Guardar(api, { que: 'nivel', cargo: 'Técnico', nivel: '2' });
  PRUEBAS.igual([r1.ok, r1.cambian, r1.fila && r1.fila.vigente], [true, 2, 2], '🔴 la de técnico sí: cambia para las dos · ' + (r1.error || ''));
  PRUEBAS.igual([rige('Beto Pérez', 'Taller', 'Técnico'), rige('Cora Ruiz', 'Operaciones', 'Técnico')], [2, 2],
    '🔴 y rige: el lector del panel da 2 para los dos');
  PRUEBAS.cierto(/"cambian":2/.test(api.__bit()[0][12]) && /"antesNiveles"/.test(api.__bit()[0][12]), 'R3 · la bitácora dice a cuántas les cambió y desde qué niveles');

  /* una persona con regla propia sigue con la suya */
  const h2 = p312Hojas();
  h2['Niveles Riesgo'].push(['Consorcio HELITEC', '', '', 'Luis Ferrer', '5']);
  const api2 = p312Api(['nivelRiesgoDeServer'], h2);
  const p2 = p312Leer(api2).escala.find(x => x.cargo === 'Piloto');
  PRUEBAS.igual([p2.vigente, p2.niveles, p2.gobernadas], [null, { 3: 1, 5: 1 }, 1], 'con una regla de persona, la escala dice que varía y que la de cargo alcanza a una');
  const r2 = p312J(api2.accionEmpresaConfigGuardar(Object.assign({}, P312_ADMIN_P, { que: 'nivel', cargo: 'Piloto', nivel: '4' })));
  PRUEBAS.igual([r2.cambian, r2.fila && r2.fila.niveles], [1, { 4: 1, 5: 1 }], '🔴 cambia para una; la de Luis sigue en 5');
});

PRUEBAS.caso('🔴 la escala lee la hoja FRESCA, cuenta a los otros cargos que la regla alcanza, y simula donde escribe `mantNivelSet`', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `empCfgEscala_` lee `Niveles Riesgo` sin la caché de diez minutos de `leerNivelesRiesgo`;
     `mantNivelSet` escribe en la PRIMERA fila con su clave (`nivelClave_`), aunque su nivel sea inválido;
     `nivelRiesgoDeServer` compara el cargo por palabra contenida. Hallazgos 1, 2 y 7 del verificador. */
  const api = p312Api(['nivelRiesgoDeServer']);
  api.leerNivelesRiesgo();   // la caché queda con la tabla de ahora (vacía)
  api.__env.__libro.getSheetByName('Niveles Riesgo').appendRow(['Consorcio HELITEC', 'Operaciones', 'Piloto', '', '4']);   // a mano
  const p1 = p312Leer(api).escala.find(x => x.cargo === 'Piloto');
  PRUEBAS.igual([p1.vigente, p1.gobernadas], [4, 0], '🔴 la escala ve la fila puesta a mano aunque la caché del lector no');
  PRUEBAS.igual(p312Guardar(api, { que: 'nivel', cargo: 'Piloto', nivel: '5' }).motivo, 'nivel_sin_efecto', '🔴 y no guarda una regla que quedaría debajo');

  const h2 = p312Hojas();
  h2['Nómina'].push(['Consorcio HELITEC', 'Iris Gómez', 'V-6', 'Operaciones', 'Piloto Instructor', 'F', '41', '', '', 'Sí', '', 'Empleado', ''],
                    ['Consorcio HELITEC', 'Pedro Ruiz', 'V-7', 'Taller', 'Primer Piloto', 'M', '38', '', '', 'Sí', '', 'Empleado', '']);
  const api2 = p312Api(['nivelRiesgoDeServer'], h2);
  const p2 = p312Leer(api2).escala.find(x => x.cargo === 'Piloto');
  PRUEBAS.igual([p2.personas, p2.gobernadas, p2.gobernadasTotal, p2.alcanza.map(a => a.cargo)], [2, 2, 4, ['Piloto Instructor', 'Primer Piloto']],
    '🔴 «Piloto» son dos personas (y la regla las gobernaría a las dos), pero alcanza a cuatro');
  const r2 = p312J(api2.accionEmpresaConfigGuardar(Object.assign({}, P312_ADMIN_P, { que: 'nivel', cargo: 'Piloto', nivel: '5' })));
  PRUEBAS.igual(r2.cambian, 4, '🔴 y la respuesta dice cuatro · ' + (r2.error || ''));
  const rige2 = (n, d, c) => api2.nivelRiesgoDeServer(api2.leerNivelesRiesgo(), n, d, 'Consorcio HELITEC', c);
  PRUEBAS.igual([rige2('Iris Gómez', 'Operaciones', 'Piloto Instructor'), rige2('Pedro Ruiz', 'Taller', 'Primer Piloto')], [5, 5], 'guarda: es lo que hace el lector');
  PRUEBAS.cierto(/"alcanza":\[\{"cargo":"Piloto Instructor"/.test(api2.__bit()[0][12]), 'R3 · la bitácora dice a qué otros cargos alcanzó');

  const h7 = p312Hojas();
  h7['Niveles Riesgo'].push(['Consorcio HELITEC', '', 'Piloto', '', ''], ['Consorcio HELITEC', 'Operaciones', 'Piloto', '', '4']);
  const api7 = p312Api(['nivelRiesgoDeServer'], h7);
  const p7 = p312Leer(api7).escala.find(x => x.cargo === 'Piloto');
  PRUEBAS.igual([p7.vigente, p7.gobernadas], [4, 2], '🔴 hoy rige la combinada, pero la regla iría a la fila de arriba (nivel vacío) y le ganaría');
  const r7 = p312J(api7.accionEmpresaConfigGuardar(Object.assign({}, P312_ADMIN_P, { que: 'nivel', cargo: 'Piloto', nivel: '5' })));
  PRUEBAS.igual([r7.ok, r7.cambian], [true, 2], '🔴 así que se guarda · ' + (r7.error || ''));
  PRUEBAS.igual(api7.nivelRiesgoDeServer(api7.leerNivelesRiesgo(), 'Ana Suárez', 'Operaciones', 'Consorcio HELITEC', 'Piloto'), 5, 'y rige');
});

PRUEBAS.caso('🔴 la escala no mezcla las dos cuentas: las de ESTE cargo deciden; las de otros cargos sólo suman a cuántas les cambia', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `empCfgEscala_`: `gobernadas` = las de este cargo que seguirían a la regla, `gobernadasTotal` = todas;
     `accionEmpresaConfigGuardar` rechaza con `nivel_sin_efecto` mirando las del cargo. Regresión de la
     segunda vuelta del verificador: con una sola cuenta se guardaba una regla «Piloto» que no le cambiaba
     el nivel a ningún piloto, sólo a otro cargo. */
  const apiA = p312Api(['nivelRiesgoDeServer'], p312HojasA());
  const pA = p312Leer(apiA).escala.find(x => x.cargo === 'Piloto');
  PRUEBAS.igual([pA.personas, pA.gobernadas, pA.gobernadasTotal], [2, 0, 1], '🔴 A: a los dos pilotos los gobierna su regla; la de cargo sólo alcanzaría a Iris');
  const filasA = apiA.__hoja('Niveles Riesgo').length;
  PRUEBAS.igual(p312Guardar(apiA, { que: 'nivel', cargo: 'Piloto', nivel: '4' }).motivo, 'nivel_sin_efecto',
    '🔴 una regla «Piloto» que no le cambia el nivel a ningún piloto no se escribe');
  PRUEBAS.igual(apiA.__hoja('Niveles Riesgo').length, filasA, 'ni toca la hoja');
  const apiB = p312Api(['nivelRiesgoDeServer'], p312HojasB());
  const pB = p312Leer(apiB).escala.find(x => x.cargo === 'Piloto');
  PRUEBAS.igual([pB.personas, pB.gobernadas, pB.gobernadasTotal, pB.alcanza.map(a => a.cargo)], [3, 2, 3, ['Piloto Instructor']],
    '🔴 B: de los tres pilotos la regla gobernaría a dos (Luis tiene la suya), y además a Iris');
  const rB = p312Guardar(apiB, { que: 'nivel', cargo: 'Piloto', nivel: '4' });
  PRUEBAS.igual(rB.cambian, 3, '🔴 cambia para tres: Ana, Mia e Iris · ' + (rB.error || ''));
  const rigeB = (n, c) => apiB.nivelRiesgoDeServer(apiB.leerNivelesRiesgo(), n, 'Operaciones', 'Consorcio HELITEC', c);
  PRUEBAS.igual([rigeB('Ana Suárez', 'Piloto'), rigeB('Mia Soto', 'Piloto'), rigeB('Iris Gómez', 'Piloto Instructor'), rigeB('Luis Ferrer', 'Piloto')],
    [4, 4, 4, 5], 'guarda: es lo que hace el lector');
});

PRUEBAS.caso('🔴 la marca: sólo cambia lo que llega, el color sin mayúsculas, y la hoja vacía recibe su encabezado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `accionEmpresaConfigGuardar` (que: marca) y `obtenerHojaMarca` (`asegurarEncabezado_`).
     Hallazgos 5 y 6 del verificador: la hoja `Marca` se edita también a mano. */
  const h = p312Hojas();
  h['Marca'] = [['Empresa', 'Nombre', 'Color', 'Logo'], ['Consorcio HELITEC', '-Helitec', '#036', '']];
  const api = p312Api([], h);
  const r1 = p312Guardar(api, { que: 'marca', logo: 'https://ejemplo.com/l.png' });
  PRUEBAS.igual([r1.ok, r1.cambio], [true, true], 'guarda: el logo se guarda · ' + (r1.error || ''));
  PRUEBAS.igual(api.leerMarca('consorcio helitec'), { nombre: '-Helitec', color: '#036', logo: 'https://ejemplo.com/l.png' },
    '🔴 el color y el nombre puestos a mano quedan como estaban: sólo cambió el logo');
  const h2 = p312Hojas();
  h2['Marca'] = [['Empresa', 'Nombre', 'Color', 'Logo'], ['Consorcio HELITEC', 'Helitec', '#1A3B5C', '']];
  const api2 = p312Api([], h2);
  PRUEBAS.igual(p312Guardar(api2, { que: 'marca', color: '#1a3b5c' }).cambio, false, '🔴 el mismo color en minúsculas no es un cambio');
  PRUEBAS.igual(api2.__bit().length, 0, 'ni deja línea de bitácora');
  const h3 = p312Hojas();
  h3['Marca'] = [];
  const api3 = p312Api([], h3);
  const r3 = p312Guardar(api3, { que: 'marca', nombre: 'HELITEC' });
  PRUEBAS.igual(api3.leerMarca('consorcio helitec'), { nombre: 'HELITEC', color: '', logo: '' }, '🔴 con la hoja vacía, el dato queda donde lo lee `leerMarca` · ' + (r3.error || ''));
  PRUEBAS.igual(p312Guardar(api3, { que: 'marca', nombre: 'HELITEC' }).cambio, false, 'y el reenvío no duplica');
  PRUEBAS.igual((api3.__hoja('Marca') || []).length, 2, 'encabezado y una fila');
});

PRUEBAS.caso('🔴 sin el candado no se escribe: «ocupado»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · `conCandado` le pasa `tomado`; `accionEmpresaConfigGuardar` no escribe sin él (hallazgo 10). */
  const api = p312Api();
  const lk = api.__env.LockService.getScriptLock;
  api.__env.LockService.getScriptLock = () => ({ tryLock: () => false, waitLock: () => false, releaseLock: () => {}, hasLock: () => false });
  try {
    PRUEBAS.igual(p312Guardar(api, { que: 'sector', sector: 'campo' }).motivo, 'ocupado', '🔴 otra operación en curso: no escribe');
    PRUEBAS.igual([api.leerConfigEmpresaCanon('Consorcio HELITEC').sector || '', api.__bit().length], ['', 0], 'ni el sector ni la bitácora');
  } finally { api.__env.LockService.getScriptLock = lk; }
});

PRUEBAS.caso('🔴 F084 · las genéricas llenan Dirección y HSEQ donde faltan, nunca la médica, y no vuelven en la respuesta', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* R19 · la tarea `accesos_genericas` de `accionMantenimiento`. La fila «socio» es de empresa pero con rol
     admin (ve todas): una contraseña de panel ahí no es «una que falta» (hallazgo 3 del verificador). */
  const hF = p312Hojas();
  hF['Accesos'].splice(4, 0, ['socio', 'soc-312', 'admin', 'Consorcio HELITEC', '', '', '']);
  const api = p312Api([], hF);
  const mant = extra => JSON.parse(api.manejar(Object.assign({ action: 'mantenimiento', token: P312_TOKEN(), tarea: 'accesos_genericas', _post: true }, extra || {})).getContent());
  const antes = api.__hoja('Accesos');
  const sim = mant();
  PRUEBAS.igual(sim.r && sim.r.llenas.map(x => [x.fila, x.columna]),
    [[3, 'Contraseña panel HSEQ'], [4, 'Contraseña Dirección'], [4, 'Contraseña panel HSEQ']],
    '🔴 helitec sólo le falta HSEQ; silva, Dirección y HSEQ; el admin, la fila admin de empresa y la vacía, no');
  PRUEBAS.igual(api.__hoja('Accesos'), antes, 'sin confirmar no toca nada');
  const r = mant({ confirmar: '1' });
  const v = api.__hoja('Accesos');
  PRUEBAS.igual([v[2][5], v[3][4]], ['dir-312', 'med-312'], '🔴 lo que ya había no se toca');
  PRUEBAS.igual([v[2][4], v[1][4], v[1][5], v[1][6]], ['', '', '', ''], '🔴 la médica vacía queda vacía (es la cuenta combinada) y el admin, igual');
  const nuevas = [v[2][6], v[3][5], v[3][6]];
  PRUEBAS.cierto(nuevas.every(x => /^(Dir|HSEQ)-[0-9A-Za-z]{6}$/.test(x)), 'las tres nuevas tienen la forma genérica · ' + nuevas.map(x => x.slice(0, 4)).join(','));
  PRUEBAS.cierto(new Set([v[3][1], v[3][4], v[3][5], v[3][6]]).size === 4 && new Set([v[2][1], v[2][5], v[2][6]]).size === 3,
    '🔴 y cada una distinta de las otras de su fila (si no, le cambiaría el panel a quien entra)');
  PRUEBAS.cierto(nuevas.every(x => JSON.stringify(r).indexOf(x) < 0), '🔴 y la respuesta no trae ninguna');
  PRUEBAS.igual([v[4][5], v[4][6]], ['', ''], '🔴 la fila admin de empresa queda sin contraseñas de panel');
  const bitF = (api.__hoja('Bitácora') || []).slice(1).filter(f => f[2] === 'acceso_panel_creado');
  PRUEBAS.igual(bitF.length, 3, '🔴 R3 · una línea de bitácora por contraseña creada (hallazgo 4 del verificador)');
  PRUEBAS.cierto(nuevas.every(x => JSON.stringify(bitF).indexOf(x) < 0), '🔴 y ninguna trae el valor');
  PRUEBAS.igual(mant({ confirmar: '1' }).r.llenas, [], 'la segunda vez no hay nada que llenar');
});

/* ── la app ────────────────────────────────────────────────────────────────────────────────────── */
function p312Dash(extra) {
  return Object.assign({ rol: 'admin', vista: 'medico', f: { emp: 'Consorcio HELITEC' }, params: { usuario: '*', pass: 'x' } }, extra || {});
}

PRUEBAS.caso('🔴 la puerta: sólo el administrador, con una empresa de trabajo, fuera del visor y de la demostración', () => {
  if (typeof cfgActualizarBoton !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app cargada'); return; }
  /* R19 · `cfgPuede` (y el servidor decide lo mismo en `empCfgAcceso_`) */
  const b = document.getElementById('cfgFabBtn');
  PRUEBAS.cierto(!!b, 'guarda: el botón está en el bloque del administrador');
  const prev = DASH;
  const ve = d => { DASH = d; cfgActualizarBoton(); return b.style.display !== 'none'; };
  try {
    PRUEBAS.igual(ve(p312Dash()), true, '🔴 el administrador con una empresa elegida lo ve');
    PRUEBAS.cierto(b.textContent.indexOf('Consorcio HELITEC') >= 0, 'y dice qué empresa va a configurar');
    PRUEBAS.igual(ve(p312Dash({ rol: 'supervisor' })), false, '🔴 un supervisor, no');
    PRUEBAS.igual(ve(p312Dash({ vista: 'hseq' })), false, '🔴 Dirección y HSEQ, no (ADR 017), aunque su fila diga «admin»');
    PRUEBAS.igual(ve(p312Dash({ visor: { empresa: 'Consorcio HELITEC', vista: 'medico' } })), false, '🔴 en el visor, no (ADR 007)');
    PRUEBAS.igual(ve(p312Dash({ f: { emp: '' } })), false, 'sin empresa de trabajo, no (ADR 014)');
    PRUEBAS.igual(ve(p312Dash({ demoMode: true })), false, 'en la demostración, no');
  } finally { DASH = prev; try { cfgActualizarBoton(); } catch (e) {} }
});

PRUEBAS.caso('🔴 abrir la pantalla: la guía ⓘ, el pedido con la empresa de trabajo, y lo que contesta el .gs real', () => {
  if (typeof cfgAbrir !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app y el .gs'); return; }
  /* R17 · la respuesta sale del `.gs` real (`accionEmpresaConfig`), no de un literal: si el servidor
     cambia una clave, la pantalla se rompe acá. */
  const api = p312Api();
  p312Guardar(api, { que: 'sector', sector: 'aviacion' });
  p312Guardar(api, { que: 'marca', nombre: 'HELITEC', color: '#1a3b5c', logo: '' });
  const d = p312Leer(api);
  const oReq = window.dashRequest, prevD = DASH, oPush = history.pushState, oNav = window.navConsumir;
  let pedido = null;
  window.dashRequest = p => { pedido = p; return Promise.resolve(d); };
  history.pushState = () => {}; window.navConsumir = () => {};   // R18 · abrir empuja historial: no se deja una entrada por corrida
  DASH = p312Dash();
  cfgAbrir();
  return new Promise(r => setTimeout(r, 0)).then(() => {
    PRUEBAS.igual(pedido && [pedido.action, pedido.empresa], ['empresa_config', 'Consorcio HELITEC'],
      '🔴 pide la configuración de la empresa de TRABAJO (ADR 014)');
    PRUEBAS.cierto(!!document.querySelector('#cfgAyuda details.dash-help'), '🔴 R5 · la guía ⓘ, cerrada por defecto');
    PRUEBAS.cierto(_i18nBuscar('en', '', 'hlp_cfg') != null, 'y existe también en inglés');
    PRUEBAS.igual(document.getElementById('cfgSector').value, 'aviacion', '🔴 el sector guardado viene elegido');
    PRUEBAS.igual(document.getElementById('cfgSector').options.length, 5, 'sin sector + los cuatro del servidor');
    PRUEBAS.igual([document.getElementById('cfgMarcaNombre').value, document.getElementById('cfgMarcaColor').value,
                   document.getElementById('cfgMarcaSinColor').checked], ['HELITEC', '#1a3b5c', false], 'la marca, con su color');
    const sels = document.querySelectorAll('#cfgBody .cfg-esc select');
    PRUEBAS.igual(Array.from(sels).map(s => s.value), ['3', '3'], '🔴 un selector por cargo de la nómina, con su nivel vigente');
  }).finally(() => { window.dashRequest = oReq; cfgCerrar(); history.pushState = oPush; window.navConsumir = oNav; DASH = prevD; CFG = undefined; });
});

PRUEBAS.caso('🔴 R8 · el sector y el nivel piden confirmación; cancelar no manda nada; confirmar escribe por el .gs real', () => {
  if (typeof cfgGuardarSector !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app y el .gs'); return; }
  /* R17 · lo que se guarda pasa por `accionEmpresaConfigGuardar` del .gs real con la contraseña del
     administrador, y lo que la pantalla muestra después es la fila que el servidor RECALCULA, no lo elegido. */
  const api = p312Api(['nivelRiesgoDeServer', 'accionNivelesRiesgo']);
  const oReq = window.dashRequest, oConf = window.confirm, oRef = window.dashRefresh, oGP = window.gestPost, prevD = DASH;
  const pedidos = [], gp = [];
  const comoAdmin = p => Object.assign({}, p, { usuario: '*', pass: P312_ADMIN, dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true });
  /* la tabla de niveles del panel también por el .gs real (`accionNivelesRiesgo`) */
  window.gestPost = b => { gp.push(b); return Promise.resolve(b && b.action === 'niveles_riesgo' ? p312J(api.accionNivelesRiesgo(comoAdmin(b))) : { ok: false }); };
  let responde = true;
  window.dashRequest = p => {
    pedidos.push(p);
    const q = comoAdmin(p);
    return Promise.resolve(p312J(p.action === 'empresa_config' ? api.accionEmpresaConfig(q) : api.accionEmpresaConfigGuardar(q)));
  };
  window.dashRefresh = () => Promise.resolve(true);
  window.confirm = () => responde;
  DASH = p312Dash();
  CFG = p312Leer(api);
  cfgPintar();
  const sel = document.getElementById('cfgSector'), niv = document.getElementById('cfgNivel0');
  responde = false;
  sel.value = 'campo'; cfgGuardarSector(document.querySelector('#cfgBody .cfg-guardar'));
  niv.value = '5'; cfgGuardarNivel(0, niv);
  PRUEBAS.igual(pedidos.length + gp.length, 0, '🔴 cancelado: no sale ningún pedido');
  PRUEBAS.igual([sel.value, niv.value], ['', '3'], 'y los dos selectores vuelven a lo que había');
  responde = true;
  sel.value = 'campo'; cfgGuardarSector(document.querySelector('#cfgBody .cfg-guardar'));
  return new Promise(r => setTimeout(r, 0)).then(() => {
    const n = document.getElementById('cfgNivel0'); n.value = '5'; cfgGuardarNivel(0, n);
    return new Promise(r => setTimeout(r, 0));
  }).then(() => {
    PRUEBAS.igual(pedidos.map(p => [p.action, p.que, p.sector || p.cargo, p.nivel || '']),
      [['empresa_config_guardar', 'sector', 'campo', ''], ['empresa_config_guardar', 'nivel', 'Piloto', 5]],
      '🔴 confirmado: un pedido por cambio, con lo elegido');
    PRUEBAS.igual(api.leerConfigEmpresaCanon('Consorcio HELITEC').sector, 'campo', '🔴 el sector quedó donde lo lee el panel');
    PRUEBAS.igual(api.nivelRiesgoDeServer(api.leerNivelesRiesgo(), 'Ana Suárez', 'Operaciones', 'Consorcio HELITEC', 'Piloto'), 5,
      '🔴 y el nivel rige para la piloto, según el lector del panel');
    PRUEBAS.igual([CFG.escala[0].cargo, CFG.escala[0].vigente, CFG.escala[0].regla], ['Piloto', 5, 5], 'la pantalla queda con la fila que recalculó el servidor');
    PRUEBAS.cierto((document.getElementById('cfgNivelNota0') || {}).textContent.indexOf('5') >= 0, 'y la nota lo dice');
    return new Promise(r => setTimeout(r, 0));
  }).then(() => {
    PRUEBAS.igual(gp.filter(b => b && b.action === 'niveles_riesgo').length, 1,
      '🔴 el panel vuelve a pedir la tabla de niveles: la lee una vez por sesión y sin esto juzgaría con el nivel viejo');
    PRUEBAS.cierto((DASH._niveles || []).some(f => f.cargo === 'Piloto' && !f.departamento && !f.persona && +f.nivel === 5),
      '🔴 y la que queda puesta trae el nivel nuevo');
    /* el reintento de un guardado cuya respuesta se perdió: el servidor contesta «ya estaba así» (cambio:false),
       y el panel, que no recibió la primera, igual tiene que volver a pedir la tabla (hallazgo 8) */
    const n2 = document.getElementById('cfgNivel0'); n2.value = '5';
    CFG.escala[0].vigente = 4;   // la pantalla no se enteró del primer guardado
    cfgGuardarNivel(0, n2);
    return new Promise(r => setTimeout(r, 0)).then(() => new Promise(r => setTimeout(r, 0)));
  }).then(() => {
    PRUEBAS.igual([pedidos[pedidos.length - 1].nivel, gp.filter(b => b && b.action === 'niveles_riesgo').length], [5, 2],
      '🔴 un reintento que vuelve con «ya estaba así» también hace que el panel vuelva a pedir la tabla');
  }).finally(() => { window.dashRequest = oReq; window.confirm = oConf; window.dashRefresh = oRef; window.gestPost = oGP; DASH = prevD; CFG = undefined;
                     const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; });
});

PRUEBAS.caso('🔴 la marca desde la pantalla: manda sólo lo que la persona tocó, y el «#036» puesto a mano sobrevive', () => {
  if (typeof cfgGuardarMarca !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app y el .gs'); return; }
  /* R17 · por el .gs real (`accionEmpresaConfigGuardar`); R19 · lo que se manda lo decide `cfgGuardarMarca`. */
  const h = p312Hojas();
  h['Marca'] = [['Empresa', 'Nombre', 'Color', 'Logo'], ['Consorcio HELITEC', '-Helitec', '#036', '']];
  const api = p312Api([], h);
  const oReq = window.dashRequest, oRef = window.dashRefresh, prevD = DASH;
  const pedidos = [];
  window.dashRequest = p => {
    pedidos.push(p);
    const q = Object.assign({}, p, { usuario: '*', pass: P312_ADMIN, dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true });
    return Promise.resolve(p312J(p.action === 'empresa_config' ? api.accionEmpresaConfig(q) : api.accionEmpresaConfigGuardar(q)));
  };
  window.dashRefresh = () => Promise.resolve(true);
  DASH = p312Dash();
  CFG = p312Leer(api);
  cfgPintar();
  PRUEBAS.igual([document.getElementById('cfgMarcaColor').value, document.getElementById('cfgMarcaSinColor').checked], ['#003366', false],
    '🔴 el selector muestra el color de la hoja («#036»), no el de la app');
  const btn = () => document.querySelectorAll('#cfgBody .cfg-guardar')[1];
  cfgGuardarMarca(btn());
  PRUEBAS.igual(pedidos.length, 0, 'sin tocar nada no sale ningún pedido');
  document.getElementById('cfgMarcaLogo').value = 'https://ejemplo.com/l.png';
  cfgGuardarMarca(btn());
  return new Promise(r => setTimeout(r, 0)).then(() => {
    PRUEBAS.igual(pedidos.map(p => ['nombre', 'color', 'logo'].filter(k => k in p)), [['logo']], '🔴 manda sólo el logo');
    PRUEBAS.igual(api.leerMarca('consorcio helitec'), { nombre: '-Helitec', color: '#036', logo: 'https://ejemplo.com/l.png' },
      '🔴 y el color y el nombre de la hoja quedan como estaban');
  }).finally(() => { window.dashRequest = oReq; window.dashRefresh = oRef; DASH = prevD; CFG = undefined;
                     const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; });
});

PRUEBAS.caso('la respuesta de un nivel que llega con la pantalla ya recargada no la pisa, pero el panel igual vuelve a pedir los niveles', () => {
  if (typeof cfgGuardarNivel !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app y el .gs'); return; }
  /* R19 · `cfgGuardarNivel` compara `CFG` con el que tenía al mandar (hallazgos 8 y 9 del verificador). */
  const api = p312Api(['nivelRiesgoDeServer', 'accionNivelesRiesgo']);
  const oReq = window.dashRequest, oConf = window.confirm, oGP = window.gestPost, prevD = DASH;
  const gp = [];
  const comoAdmin = p => Object.assign({}, p, { usuario: '*', pass: P312_ADMIN, dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true });
  window.dashRequest = p => Promise.resolve(p312J(p.action === 'empresa_config' ? api.accionEmpresaConfig(comoAdmin(p)) : api.accionEmpresaConfigGuardar(comoAdmin(p))));
  window.gestPost = b => { gp.push(b); return Promise.resolve(b && b.action === 'niveles_riesgo' ? p312J(api.accionNivelesRiesgo(comoAdmin(b))) : { ok: false }); };
  window.confirm = () => true;
  DASH = p312Dash();
  CFG = p312Leer(api);
  cfgPintar();
  /* ⚠️ la «pantalla recargada» se arma ANTES de guardar: el emulador escribe en el momento en que sale el
     pedido, así que leerla después ya traería el nivel nuevo y el caso no distinguiría nada (me pasó) */
  const otra = p312Leer(api);
  const n = document.getElementById('cfgNivel0'); n.value = '4'; cfgGuardarNivel(0, n);
  CFG = otra;   // la pantalla se volvió a cargar mientras el pedido viajaba
  return new Promise(r => setTimeout(r, 0)).then(() => new Promise(r => setTimeout(r, 0))).then(() => {
    PRUEBAS.igual([CFG === otra, CFG.escala[0].vigente], [true, 3], '🔴 la pantalla nueva no se pisa con la fila de la respuesta vieja');
    PRUEBAS.igual(gp.filter(b => b && b.action === 'niveles_riesgo').length, 1, '🔴 pero el panel igual vuelve a pedir la tabla de niveles');
  }).finally(() => { window.dashRequest = oReq; window.confirm = oConf; window.gestPost = oGP; DASH = prevD; CFG = undefined;
                     const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; });
});

PRUEBAS.caso('🔴 la pantalla no mezcla las dos cuentas: la nota, el selector y la confirmación (con su singular)', () => {
  if (typeof cfgPintar !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app y el .gs'); return; }
  /* R19 · `cfgEscalaNota`, `cfgGobernadas` y `cfgGuardarNivel`; R17 · las filas salen del .gs real (`p312Leer`) */
  const prevD = DASH, oConf = window.confirm;
  let msg = '';
  try {
    DASH = p312Dash();
    CFG = p312Leer(p312Api(['nivelRiesgoDeServer'], p312HojasA()));
    cfgPintar();
    const iA = CFG.escala.findIndex(x => x.cargo === 'Piloto');
    PRUEBAS.cierto(document.getElementById('cfgNivel' + iA).disabled, '🔴 A: el selector de Piloto queda deshabilitado');
    PRUEBAS.cierto(document.getElementById('cfgNivelNota' + iA).textContent.indexOf(t('cfg_escala_sombra_todas')) >= 0, 'y la nota dice por qué');
    CFG = p312Leer(p312Api(['nivelRiesgoDeServer'], p312HojasB()));
    cfgPintar();
    const iB = CFG.escala.findIndex(x => x.cargo === 'Piloto');
    const notaB = document.getElementById('cfgNivelNota' + iB).textContent;
    PRUEBAS.cierto(notaB.indexOf(t('cfg_escala_sombra', { n: 1 })) >= 0 && notaB.indexOf('Piloto Instructor') >= 0,
      '🔴 B: la nota dice que a uno lo gobierna otra regla y que también alcanza a Piloto Instructor · ' + notaB);
    window.confirm = m => { msg = m; return false; };
    const sel = document.getElementById('cfgNivel' + iB); sel.value = '4'; cfgGuardarNivel(iB, sel);
    PRUEBAS.cierto(msg.indexOf(t('cfg_nivel_conf', { cargo: 'Piloto', despues: 4, n: 3 })) === 0, '🔴 la confirmación dice tres · ' + msg);
    PRUEBAS.cierto(msg.indexOf(t('cfg_nivel_conf_sombra', { s: 1, total: 3 })) > 0, 'y que a uno de los tres no le cambia');
    CFG = p312Leer(p312Api(['nivelRiesgoDeServer']));
    cfgPintar();
    const iT = CFG.escala.findIndex(x => x.cargo === 'Técnico');
    const selT = document.getElementById('cfgNivel' + iT); selT.value = '4'; cfgGuardarNivel(iT, selT);
    PRUEBAS.cierto(msg.indexOf(t('cfg_nivel_conf_uno', { cargo: 'Técnico', despues: 4 })) === 0, 'con una persona, en singular · ' + msg);
  } finally { DASH = prevD; window.confirm = oConf; CFG = undefined; const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; }
});

PRUEBAS.caso('🔴 un logo «http://» cargado a mano no traba un cambio de nombre', () => {
  if (typeof cfgGuardarMarca !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app y el .gs'); return; }
  /* R19 · `cfgGuardarMarca` controla el logo sólo si lo manda; R17 · por el .gs real */
  const h = p312Hojas();
  h['Marca'] = [['Empresa', 'Nombre', 'Color', 'Logo'], ['Consorcio HELITEC', 'Helitec', '', 'http://viejo.ejemplo.com/l.png']];
  const api = p312Api([], h);
  const oReq = window.dashRequest, oRef = window.dashRefresh, prevD = DASH;
  const pedidos = [];
  window.dashRequest = p => {
    pedidos.push(p);
    const q = Object.assign({}, p, { usuario: '*', pass: P312_ADMIN, dispositivoId: 'p312', empresa: 'Consorcio HELITEC', _post: true });
    return Promise.resolve(p312J(p.action === 'empresa_config' ? api.accionEmpresaConfig(q) : api.accionEmpresaConfigGuardar(q)));
  };
  window.dashRefresh = () => Promise.resolve(true);
  DASH = p312Dash();
  CFG = p312Leer(api);
  cfgPintar();
  document.getElementById('cfgMarcaNombre').value = 'HELITEC';
  cfgGuardarMarca(document.querySelectorAll('#cfgBody .cfg-guardar')[1]);
  PRUEBAS.igual((document.getElementById('cfgErrMarca') || {}).textContent, '', '🔴 sin error del logo, que no se tocó');
  return new Promise(r => setTimeout(r, 0)).then(() => {
    PRUEBAS.igual(pedidos.map(p => ['nombre', 'color', 'logo'].filter(k => k in p)), [['nombre']], '🔴 manda sólo el nombre');
    PRUEBAS.igual(api.leerMarca('consorcio helitec'), { nombre: 'HELITEC', color: '', logo: 'http://viejo.ejemplo.com/l.png' }, 'y el logo de la hoja queda');
  }).finally(() => { window.dashRequest = oReq; window.dashRefresh = oRef; DASH = prevD; CFG = undefined;
                     const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; });
});

/* ══ P346a · F109 · LA VISTA PREVIA DEL SECTOR (2026-11-10) ══════════════════════════════════════════
   Rafael quería ver cómo cambian los botones sin cambiarle el sector a una empresa con gente adentro.
   La previa vive en «Configurar esta empresa» y la arma `cicloItemsDe(sector)`, la MISMA función que
   dibuja el inicio (R21). Estos casos prueban el contrato de punta a punta: lo que se guarda por el `.gs`
   real, lo que el teléfono lee por `empresa_perfil` y lo que dibuja el inicio, contra lo que mostró la
   previa. Y que en «campo» la descripción diga el test que el botón abre de verdad. */
const P346A_SECTORES = ['aviacion', 'planta', 'campo', 'generico'];
function p346aPrevia() {
  return Array.from(document.querySelectorAll('#cfgSectorPrevia li.cfg-previa-it')).map(li => ({
    label: (li.querySelector('b') || {}).textContent || '',
    desc: (li.querySelector('.cfg-previa-tx > span') || {}).textContent || '',
    icon: ((li.querySelector('.cfg-previa-ic svg') || {}).innerHTML || '').replace(/\s+/g, ' ').trim()
  }));
}
function p346aInicio() {
  const sec = document.querySelector('#sections section');
  if (!sec) return [];
  return Array.from(sec.querySelectorAll('.item')).map(it => ({
    label: (it.querySelector('.tt') || {}).textContent || '',
    desc: (it.querySelector('.ds') || {}).textContent || '',
    icon: ((it.querySelector('.ic svg') || {}).innerHTML || '').replace(/\s+/g, ' ').trim()
  }));
}

PRUEBAS.caso('🔴 P346a · la vista previa muestra los MISMOS botones que va a dibujar el teléfono, en los cuatro sectores', async () => {
  if (typeof cfgSectorPreviaHtml !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app (7.67) y el .gs'); return; }
  /* R21 · la previa predice una escritura: se guarda con el ESCRITOR real (`accionEmpresaConfigGuardar`), el teléfono
     lo lee con el LECTOR real (`accionEmpresaPerfil` → `sectorRefrescar` → `renderSections`), y las dos pantallas se
     comparan. R19 · el derecho a ver la pantalla sale de `cfgPuede()` (admin, empresa de trabajo, fuera del visor). */
  const api = p312Api(['accionEmpresaPerfil', 'perfilPublicoEmpresa', 'algunaAltaCerrada']);
  const g = { perfil: getProfile(), sec: localStorage.getItem(K_SECTOR), emp: localStorage.getItem(K_EMPRESA_PERFIL),
              fcr: window.fetchConReloj, dash: DASH, cfg: CFG };
  try {
    for (const s of P346A_SECTORES) {
      p312Guardar(api, { que: 'sector', sector: s });
      DASH = p312Dash();
      CFG = p312Leer(api);
      cfgPintar();
      const previa = p346aPrevia();
      PRUEBAS.igual(previa.length, 4, s + ' · la previa dibuja los cuatro botones');
      /* el teléfono: alguien que registra su ciclo, con la app en otro sector, abre la app */
      setProfile({ nombre: 'Prueba P346a', empresa: 'Consorcio HELITEC', esPiloto: true, sector: 'xx' });
      localStorage.setItem(K_SECTOR, 'xx');
      const resp = p312J(api.accionEmpresaPerfil({ empresa: 'Consorcio HELITEC' }));
      PRUEBAS.igual(resp.perfil && resp.perfil.sector, s, s + ' · el .gs real le contesta al teléfono el sector que se guardó');
      window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(resp) });
      sectorRefrescar();
      for (let i = 0; i < 24; i++) await Promise.resolve();
      renderSections();
      PRUEBAS.igual(sectorActual(), s, s + ' · el teléfono quedó en ese sector');
      PRUEBAS.igual(p346aInicio(), previa, '🔴 ' + s + ' · el inicio del teléfono es exactamente lo que mostró la previa (texto, descripción e ícono)');
    }
  } finally {
    window.fetchConReloj = g.fcr; DASH = g.dash; CFG = g.cfg;
    if (g.perfil) setProfile(g.perfil); else localStorage.removeItem(K_PROFILE);
    if (g.sec == null) localStorage.removeItem(K_SECTOR); else localStorage.setItem(K_SECTOR, g.sec);
    if (g.emp == null) localStorage.removeItem(K_EMPRESA_PERFIL); else localStorage.setItem(K_EMPRESA_PERFIL, g.emp);
    const b = document.getElementById('cfgBody'); if (b) b.innerHTML = '';
    try { aplicarIdioma(); } catch (e) {}
  }
});

PRUEBAS.caso('🔴 P346a · la descripción dice el test que el botón abre de verdad, también en «campo»', () => {
  if (typeof cicloItemsDe !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.67)'); return; }
  P346A_SECTORES.forEach(s => {
    cicloItemsDe(s).forEach(it => {
      PRUEBAS.igual(/KSS/.test(it.desc), it.testFlow === 'kss', s + ' · «' + it.label + '» nombra el KSS sólo si lo abre (dice «' + it.desc + '»)');
      PRUEBAS.igual(/Perelli/.test(it.desc), it.testFlow === 'perelli', s + ' · «' + it.label + '» nombra el Perelli sólo si lo abre');
    });
  });
  /* el discriminador: el defecto de la 7.66, por su nombre */
  const campo = cicloItemsDe('campo');
  const llega = campo.filter(it => it.operacionalCampo === 'llegada_aero')[0] || {};
  const sale = campo.filter(it => it.operacionalCampo === 'salida_casa')[0] || {};
  PRUEBAS.falso(/KSS/.test(llega.desc || ''), '🔴 en campo, «llegar al sitio» no abre test y ya no dice «Test KSS» (7.66 lo decía)');
  PRUEBAS.igual(sale.testFlow, 'kss', 'guarda: en campo el KSS es al salir de casa (la forma no cambió)');
  PRUEBAS.cierto(/KSS/.test(sale.desc || ''), '🔴 y «salir de casa» lo dice');
});

PRUEBAS.caso('P346a · el ícono del sitio sigue al sector, y aviación queda exactamente como estaba', () => {
  if (typeof cicloItemIcono !== 'function') { PRUEBAS.cierto(false, '🔴 se necesita la app (7.67)'); return; }
  PRUEBAS.igual([cicloItemIcono('aviacion', 'llegada_aero'), cicloItemIcono('aviacion', 'salida_aero')], [I.planeIn, I.planeOut],
    '🔴 aviación: los mismos aviones de siempre (es el padrón instalado: no puede cambiarle nada)');
  const sitio = s => cicloItemIcono(s, 'llegada_aero') + '|' + cicloItemIcono(s, 'salida_aero');
  const distintos = new Set(P346A_SECTORES.map(sitio));
  PRUEBAS.igual(distintos.size, 4, '🔴 cada sector dibuja su propio sitio: ninguno repite el avión de otro');
  PRUEBAS.cierto(['planta', 'campo', 'generico'].every(s => sitio(s).indexOf(I.planeIn) < 0 && sitio(s).indexOf(I.planeOut) < 0),
    '🔴 fuera de aviación no queda ningún avión');
  PRUEBAS.igual(sitio('industria-nueva'), sitio('generico'), 'un sector desconocido cae al genérico, como el motor de textos');
  PRUEBAS.cierto(P346A_SECTORES.every(s => cicloItemIcono(s, 'salida_casa') === I.homeOut && cicloItemIcono(s, 'llegada_casa') === I.homeIn),
    'la casa es la misma en todos los sectores');
});

PRUEBAS.caso('🔴 P346a · la vista previa sólo lee: sigue al selector, no le pide nada al servidor y no cambia el sector de nadie', () => {
  if (typeof cfgSectorPreviaPintar !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app (7.67) y el .gs'); return; }
  const api = p312Api();
  const oReq = window.dashRequest, prevD = DASH, prevC = CFG;
  const antes = { sec: sectorActual(), k: localStorage.getItem(K_SECTOR), perfil: JSON.stringify(getProfile()) };
  let pedidos = 0;
  window.dashRequest = () => { pedidos++; return Promise.resolve({ ok: true }); };
  try {
    DASH = p312Dash();
    CFG = p312Leer(api);   // la empresa todavía sin sector
    PRUEBAS.igual(CFG.sector || '', '', 'guarda: la empresa empieza sin sector, como todas en producción hoy');
    cfgPintar();
    const box = document.getElementById('cfgSectorPrevia');
    PRUEBAS.cierto(!!box && /Sin sector configurado/.test(box.textContent), 'sin sector, la previa dice que hoy se usa el de fábrica');
    const sinSector = p346aPrevia().map(f => f.label);
    PRUEBAS.igual(sinSector, cicloItemsDe(SECTOR_DEFAULT).map(it => it.label), 'y muestra lo que ven hoy: el sector de fábrica');
    const sel = document.getElementById('cfgSector');
    sel.value = 'planta'; sel.dispatchEvent(new Event('change'));
    PRUEBAS.cierto(p346aPrevia().some(f => /planta/i.test(f.label)), '🔴 al elegir «planta», la previa pasa a la planta sin guardar');
    PRUEBAS.falso(/Sin sector configurado/.test(box.textContent), 'y deja de decir «sin sector»');
    sel.value = 'campo'; sel.dispatchEvent(new Event('change'));
    PRUEBAS.cierto(p346aPrevia().some(f => /sitio de trabajo/i.test(f.label)), 'al elegir «campo», el sitio de trabajo');
    PRUEBAS.igual(pedidos, 0, '🔴 mirar la previa no le pide nada al servidor');
    PRUEBAS.igual([sectorActual(), localStorage.getItem(K_SECTOR), JSON.stringify(getProfile())], [antes.sec, antes.k, antes.perfil],
      '🔴 ni cambia el sector de esta app, ni el guardado, ni el perfil');
    PRUEBAS.igual(document.querySelectorAll('#cfgBody .cfg-guardar').length, 2, 'la previa no agrega botones de guardar: siguen el del sector y el de la marca');
  } finally { window.dashRequest = oReq; DASH = prevD; CFG = prevC; const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; }
});

PRUEBAS.caso('R1 · R14 · R5 · los textos nuevos de P346a: en los dos idiomas, neutros, sin términos de sector, y la guía lo cuenta', () => {
  const claves = ['cfg_sector_previa_t', 'cfg_sector_previa_d', 'cfg_sector_previa_sin', 'cfg_sector_previa_rol',
                  'op_test_kss_d', 'op_test_perelli_d', 'op_lleg_sitio_sin_test_d', 'op_salir_sitio_sin_test_d'];
  claves.forEach(k => {
    const es = _i18nBuscar('es', '', k), en = _i18nBuscar('en', '', k);
    PRUEBAS.cierto(es != null && en != null, k + ' existe en español y en inglés');
    PRUEBAS.falso(/\b(tocá|elegí|guardá|mirá|podés|tenés|querés|sabés)\b/i.test(es || ''), k + ' · R1 · sin voseo');
    PRUEBAS.falso(/aeropuerto|piloto|vuelo|tripulaci/i.test(es || ''), k + ' · R14 · sin términos de sector escritos a mano');
  });
  PRUEBAS.cierto(/cómo quedarán los botones/.test(_i18nBuscar('es', '', 'hlp_cfg') || ''), 'R5 · la guía ⓘ de la pantalla cuenta la previa');
  PRUEBAS.igual(_i18nBuscar('es', '', 'op_lleg_sitio_d'), null, 'las claves viejas, por evento, ya no existen (nadie puede volver a usarlas)');
});

PRUEBAS.caso('🔴 P346a · cancelar la confirmación devuelve el selector Y la vista previa al sector guardado (verificador, 2026-11-10)', () => {
  if (typeof cfgSectorPreviaPintar !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(false, '🔴 se necesita la app (7.67) y el .gs'); return; }
  /* El defecto: `sel.value = antes` por código no dispara `change`, así que la previa quedaba mostrando el sector que se
     acababa de descartar. Se entra como Rafael: un `change` de verdad, «Guardar», y cancelar la confirmación (R8). */
  const api = p312Api();
  p312Guardar(api, { que: 'sector', sector: 'aviacion' });
  const oReq = window.dashRequest, oConf = window.confirm, prevD = DASH, prevC = CFG;
  let pedidos = 0;
  window.dashRequest = () => { pedidos++; return Promise.resolve({ ok: true }); };
  window.confirm = () => false;   // cancela
  try {
    DASH = p312Dash();
    CFG = p312Leer(api);
    cfgPintar();
    const sel = document.getElementById('cfgSector');
    const vacia = sel.querySelector('option[value=""]');
    PRUEBAS.cierto(!!vacia && vacia.textContent.indexOf(t('cfg_sector_' + SECTOR_DEFAULT)) >= 0 && !/generales/.test(vacia.textContent),
      'la opción vacía dice qué rige sin sector (el de fábrica), como la previa: «' + (vacia && vacia.textContent) + '»');
    sel.value = 'planta'; sel.dispatchEvent(new Event('change'));
    PRUEBAS.cierto(p346aPrevia().some(f => /planta/i.test(f.label)), 'guarda: la previa pasó a la planta');
    cfgGuardarSector(document.querySelectorAll('#cfgBody .cfg-guardar')[0]);
    PRUEBAS.igual(sel.value, 'aviacion', 'al cancelar, el selector vuelve al sector guardado');
    PRUEBAS.igual(p346aPrevia().map(f => f.label), cicloItemsDe('aviacion').map(it => it.label),
      '🔴 y la previa también: no queda mostrando el sector que se descartó');
    PRUEBAS.igual(pedidos, 0, 'cancelar no le pide nada al servidor');
  } finally { window.dashRequest = oReq; window.confirm = oConf; DASH = prevD; CFG = prevC; const b = document.getElementById('cfgBody'); if (b) b.innerHTML = ''; }
});
