PRUEBAS.grupo('P385 · con un filtro puesto, cada pantalla dice lo que sabe (D1, D2, D3) · privacidad de HSEQ');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   La investigación de P385 (fuera del repo: `docs/specs/P385/investigacion.md`) reprodujo tres pantallas
   que afirmaban algo falso con un filtro puesto:
     · D1 · «Actividad reciente» titulaba con la persona o el departamento filtrado y resumía la empresa
       ENTERA («Último movimiento: hoy · 4 pruebas» para alguien cuyo último test fue hace tres días), y
       su cobertura nombraba como «sin medir» a gente de otro departamento.
     · D2 · la disponibilidad de Dirección comparaba las filas filtradas contra la nómina ENTERA: con un
       departamento de una sola persona, medida, decía «33 % de la nómina medida · 2 personas sin
       registros» y que la disponibilidad no era confiable.
     · D3 · Ciclo y Jornada quedaban con «30 días» (o «90») marcado sobre 7 días traídos al cambiar de
       empresa por el visor o por «Trabajar sobre», o al cerrar con ✕ y volver a entrar.
   Y una medición de privacidad, sin arreglo: en HSEQ, con un seudónimo en «Empleado», no aparece nada
   sacado de los tests de esa persona (la promesa de `priv_hseq_1` y `priv_hseq_2`).

   TODO ENTRA POR EL CAMINO REAL (R17). El `.gs` real, cargado en el emulador, contesta cada pedido del
   panel (`p385Banco`, el patrón de `p301Banco`). Se entra como administrador por `splashAdmin` →
   `portalLoginAdmin`, y desde ahí sólo con controles reales: los `onchange` de `#dashEmpAdmin`,
   `#visorEmpresa`/`#visorVista`, `#dashDep`, `#dashPer` y `#dashNivel`, el `click()` de los botones de
   período, la ✕ (`closePortalUI`) y el reingreso por «Administrador». Lo que se espera ver sale de lo que
   contestó el servidor o de `cicloDiasTraidos()`, que es el lector real de lo traído (R21).

   SEGUNDA VUELTA (lo que encontró el verificador, `docs/specs/P385/verificador.md`):
     · H1 · con más de 10 movimientos en la empresa, las cuentas del resumen bajo una persona eran las de la
       ventana y se leían como el total de la persona («1 en total» a quien tenía 5). Con filtro, el resumen
       dice sólo el último movimiento, y los casos afirman ese INVARIANTE, no la forma del texto.
     · H2 · con filtro, el % en condiciones va atenuado, como con la cobertura floja.
     · H4 · con filtro, «Actividad reciente» dice que no se ve cuánta gente falta medir.
     · H5 · el detector de voseo entiende las tildes (`\b` sin la bandera `u` no ve «mirá»).
     · H6 · el «N de M con datos» de D2 se compara contra la gente del filtro, no contra sí mismo.
     · Y el servidor: al panel de HSEQ no le van las pruebas en la actividad (`accionActividad`).

   ⚠️ EL REPO ES PÚBLICO: las contraseñas del `Accesos` emulado son de RELLENO (`x`, `xm`, `xd`, `xh`).
   ⚠️ R18: `DASH`, `MOV`, el período del ciclo, `PORTAL_VISTA`, `localStorage` y los stubs de `fetch`,
   `fetchConReloj` y `showToast` vuelven a como estaban en el `.finally()` de la PROMESA de cada caso
   (`p385Correr`), no en un `finally` sincrónico.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* El día, en hora LOCAL y no con `toISOString`: la investigación cayó una vez en el día UTC (03-11 con la
   hora local en 02-11) y «Día» habría filtrado a cero por el fixture. */
function p385Dia(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  const p = x => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function p385Test(persona, dep, empresa, dia, kss, com) {
  const f = new Array(90).fill('');
  f[0] = dia + ' 08:00:00'; f[1] = persona; f[2] = dep; f[72] = empresa; f[73] = dia; f[86] = kss;
  if (com) f[85] = com;
  return f;
}
/* El CH de prueba de la investigación, recortado. Dos empresas que no comparten departamentos ni personas
   (cualquier cruce se ve) y una tercera con tests y sin cuenta:
     · Consorcio HELITEC · Ana Suárez (Operaciones · hoy y −20 d) · Luis Ferrer (Mantenimiento · −3 y −100 d)
       · Carla Díaz (Operaciones · sólo nómina).
     · Aeroambulancias Silva (cuenta combinada) · Pedro Gómez (Vuelo · hoy) · María Rojas (Enfermería · −10 y
       −250 d) · Jorge Vera (Vuelo · sólo nómina).
     · Transporte Andino (sin fila en `Accesos`) · Rosa Pérez (Logística · −5 d).
   Niveles: HELITEC/Operaciones = 4 y Silva/Vuelo = 5. La columna «Contraseña panel HSEQ» es la de P306:
   sin ella no hay entrada real al panel de HSEQ.
   OPCIONES (segunda vuelta):
     · `muchos`: 10 tests más de Ana (días −1 a −11, salteando el −3) y 3 de Luis (−15, −16 y −17), como el V1
       del verificador. HELITEC queda con 17 tests y Luis con 5, así la ventana de 10 que manda el servidor
       RECORTA: con 4 movimientos por empresa nunca recortaba, y por eso la primera vuelta no lo vio.
     · `bitacora`: dos acciones de HELITEC, con la forma real de la hoja (la de P223), para que el panel de HSEQ,
       que ya no recibe las pruebas, tenga algo que mostrar en «Actividad reciente». Silva queda sin acciones: es
       el panel de HSEQ vacío. */
const P385_BIT_CAB = ['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'NivelRiesgo',
  'UmbralAmarillo', 'UmbralRojo', 'AppVersion', 'IdEvento', 'JSON'];
function p385Bit(msAtras, empresa, accion, sujeto) {
  const ts = Date.now() - msAtras, d = new Date(ts), p = x => String(x).padStart(2, '0');
  const f = new Array(13).fill('');
  f[0] = p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  f[1] = empresa; f[2] = accion; f[3] = sujeto; f[4] = 'sistema'; f[5] = 'sistema'; f[6] = 'endpoint';
  f[11] = 'srv_' + accion + '_' + ts;
  f[12] = JSON.stringify({ id: f[11], ts: ts, empresa: empresa });
  return f;
}
function p385Hojas(opc) {
  opc = opc || {};
  const HOY = p385Dia(0), hace = p385Dia, DIA = 86400000;
  const masTests = !opc.muchos ? [] :
    [1, 2, 4, 5, 6, 7, 8, 9, 10, 11].map(n => p385Test('Ana Suárez', 'Operaciones', 'Consorcio HELITEC', hace(n), 4, ''))
      .concat([15, 16, 17].map(n => p385Test('Luis Ferrer', 'Mantenimiento', 'Consorcio HELITEC', hace(n), 4, '')));
  const bitacora = !opc.bitacora ? [['ID', 'TS', 'Empresa', 'Actor', 'Rol', 'Accion', 'Sujeto', 'Detalle', 'Origen', 'Umbral', 'App']]
    : [P385_BIT_CAB,
       p385Bit(2 * DIA, 'Consorcio HELITEC', 'nomina_sync', 'Carla Díaz'),
       p385Bit(6 * DIA, 'Consorcio HELITEC', 'credencial_creada', 'Ana Suárez')];
  return {
    'Accesos': [['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
                 'Rol (supervisor ve solo su empresa, admin ve todas)',
                 'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
                 'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)',
                 'Contraseña HSQ', 'Contraseña panel HSEQ'],
      ['*',       'x', 'admin',      '',                             '',   '',   ''],
      ['helitec', 'x', 'supervisor', 'Consorcio HELITEC, Helitec',   'xm', 'xd', 'xh'],
      ['silva',   'x', 'supervisor', 'Aeroambulancias Silva, Silva', '',   'xd', '']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta'),
      p385Test('Ana Suárez',  'Operaciones',   'Consorcio HELITEC',     HOY,       7, 'Dormí muy mal'),
      p385Test('Ana Suárez',  'Operaciones',   'Consorcio HELITEC',     hace(20),  5, ''),
      p385Test('Luis Ferrer', 'Mantenimiento', 'Consorcio HELITEC',     hace(3),   3, ''),
      p385Test('Luis Ferrer', 'Mantenimiento', 'Consorcio HELITEC',     hace(100), 6, ''),
      p385Test('Pedro Gómez', 'Vuelo',         'Aeroambulancias Silva', HOY,       5, 'Todo bien'),
      p385Test('María Rojas', 'Enfermería',    'Aeroambulancias Silva', hace(10),  8, 'Turno largo'),
      p385Test('María Rojas', 'Enfermería',    'Aeroambulancias Silva', hace(250), 4, ''),
      p385Test('Rosa Pérez',  'Logística',     'Transporte Andino',     hace(5),   6, '')].concat(masTests),
    'Nómina': [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono',
                'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
      ['Consorcio HELITEC',     'Ana Suárez',  'V-11111', 'Operaciones',   'Piloto',    'F', '40', '', '', 'Si', '', 'empleado', ''],
      ['Consorcio HELITEC',     'Luis Ferrer', 'V-22222', 'Mantenimiento', 'Mecánico',  'M', '35', '', '', 'No', '', 'empleado', ''],
      ['Consorcio HELITEC',     'Carla Díaz',  'V-44444', 'Operaciones',   'Piloto',    'F', '33', '', '', 'Si', '', 'empleado', ''],
      ['Aeroambulancias Silva', 'Pedro Gómez', 'V-33333', 'Vuelo',         'Piloto',    'M', '30', '', '', 'Si', '', 'empleado', ''],
      ['Aeroambulancias Silva', 'María Rojas', 'V-55555', 'Enfermería',    'Enfermera', 'F', '45', '', '', 'No', '', 'empleado', ''],
      ['Aeroambulancias Silva', 'Jorge Vera',  'V-66666', 'Vuelo',         'Piloto',    'M', '50', '', '', 'Si', '', 'empleado', '']],
    'Niveles Riesgo': [['Empresa', 'Departamento', 'Cargo', 'Persona', 'Nivel'],
      ['Consorcio HELITEC', 'Operaciones', '', '', '4'],
      ['Aeroambulancias Silva', 'Vuelo', '', '', '5']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']],
    'PVT': [['Fecha', 'Persona', 'Empresa', 'rt_prom', 'lapsos']],
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [HOY, '06:00', HOY + 'T10:00:00.000Z', 'op1', 'Ana Suárez',  'Consorcio HELITEC',     'Operaciones',   'Piloto',   'salida_casa', 'kss', 7, ''],
      [HOY, '06:30', HOY + 'T10:30:00.000Z', 'op2', 'Pedro Gómez', 'Aeroambulancias Silva', 'Vuelo',         'Piloto',   'salida_casa', 'kss', 5, ''],
      [HOY, '07:00', HOY + 'T11:00:00.000Z', 'op3', 'Luis Ferrer', 'Consorcio HELITEC',     'Mantenimiento', 'Mecánico', 'salida_casa', 'kss', 3, '']],
    'Turnos': [['Fecha', 'Hora', 'Id', 'Tipo', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'KSS', 'Carga']],
    'Ausencias': [['Id', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor']],
    'Marca': [['Empresa', 'Nombre', 'Color', 'Logo']],
    'Registrados Fatiga': [['Marca', 'Nombre', 'Empresa', 'Departamento', 'Cargo'],
      [HOY, 'Ana Suárez', 'Consorcio HELITEC', 'Operaciones', 'Piloto'],
      [HOY, 'Luis Ferrer', 'Consorcio HELITEC', 'Mantenimiento', 'Mecánico'],
      [HOY, 'Pedro Gómez', 'Aeroambulancias Silva', 'Vuelo', 'Piloto'],
      [HOY, 'María Rojas', 'Aeroambulancias Silva', 'Enfermería', 'Enfermera']],
    'Gestiones': [['Empresa', 'ID', 'Datos (JSON)', 'Última actualización']],
    'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada',
                  'Creada', 'UltimoUso', 'Estado', 'Cerrada', 'Panel']],
    'Reportes': [['Fecha', 'IdReporte', 'Opcion', 'Identificado', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Comentario'],
      [new Date(HOY + 'T09:00:00'), 'r1', 'cansancio', 'false', '', 'Consorcio HELITEC', 'Operaciones', '', 'anónimo de hoy'],
      [new Date(hace(4) + 'T09:00:00'), 'r2', 'sueno', 'false', '', 'Consorcio HELITEC', 'Mantenimiento', '', 'anónimo de hace 4 días'],
      [new Date(hace(40) + 'T09:00:00'), 'r3', 'cansancio', 'false', '', 'Consorcio HELITEC', 'Operaciones', '', 'anónimo de hace 40 días'],
      [new Date(hace(2) + 'T09:00:00'), 'r4', 'cansancio', 'true', 'Ana Suárez', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'identificado de hace 2 días'],
      [new Date(hace(1) + 'T09:00:00'), 'r5', 'cansancio', 'false', '', 'Aeroambulancias Silva', 'Vuelo', '', 'anónimo Silva']],
    'Bitácora': bitacora
  };
}

/* El `.gs` real en el emulador, con los pedidos del panel enrutados a su `doPost`/`doGet` (el patrón de
   `p301Banco`). Todo lo demás sigue cortado por el candado de red. `retener(cuerpo)` deja un pedido
   colgado hasta `soltar()`: con eso el caso de la carrera decide el orden de llegada, sin relojes. */
function p385Banco(opc) {
  const env = GS.crearEntorno(p385Hojas(opc));
  const api = GS.cargarGs(CTX.gs, env, ['doPost', 'doGet']);
  const B = { env: env, api: api, pedidos: [], respuestas: [], toasts: [], retener: null, retenidos: [] };
  const responder = (u, opts) => {
    if (String(u).indexOf(SHEETS_DASHBOARD_URL) !== 0) return new Promise(() => {});
    let salida, cuerpo = {};
    if (opts && String(opts.method || '').toUpperCase() === 'POST') {
      try { cuerpo = JSON.parse(String(opts.body || '{}')); } catch (e) {}
      salida = api.doPost({ postData: { contents: String(opts.body || '') }, parameter: {} });
    } else {
      new URL(String(u)).searchParams.forEach((v, k) => { cuerpo[k] = v; });
      salida = api.doGet({ parameter: cuerpo });
    }
    const txt = salida.getContent();
    let obj = null; try { obj = JSON.parse(txt); } catch (e) {}
    const anotado = Object.assign({}, cuerpo); if (anotado.pass) anotado.pass = '…';
    B.pedidos.push(anotado); B.respuestas.push(obj);
    const r = { ok: true, status: 200, json: () => Promise.resolve(JSON.parse(txt)), text: () => Promise.resolve(txt) };
    if (B.retener && B.retener(cuerpo)) return new Promise(res => { B.retenidos.push(() => res(r)); });
    return Promise.resolve(r);
  };
  B.prev = { fetchConReloj: window.fetchConReloj, fetch: window.fetch, showToast: window.showToast };
  window.fetchConReloj = (u, o) => responder(u && u.url ? u.url : u, o);
  window.fetch = function (u, o) {
    const url = String(u && u.url ? u.url : u);
    if (url.indexOf(SHEETS_DASHBOARD_URL) === 0) return responder(url, o);
    return B.prev.fetch.apply(window, arguments);
  };
  window.showToast = m => { B.toasts.push(String(m)); };
  B.restaurar = () => { window.fetchConReloj = B.prev.fetchConReloj; window.fetch = B.prev.fetch; window.showToast = B.prev.showToast; };
  B.soltar = () => { const r = B.retenidos.splice(0); r.forEach(f => f()); return r.length; };
  /* el último pedido de una acción y lo que contestó el servidor */
  B.ultima = accion => {
    for (let i = B.pedidos.length - 1; i >= 0; i--) if (B.pedidos[i].action === accion) return { pedido: B.pedidos[i], resp: B.respuestas[i] || {} };
    return null;
  };
  return B;
}

/* R18 · el estado de partida y la restauración de cada caso, en el `.finally()` de la PROMESA: un `finally`
   sincrónico corre antes que los `.then` de lo que el caso disparó. */
function p385Correr(fn, opc) {
  const prev = { dash: DASH, mov: MOV, periodo: CICLO_PERIODO, pidiendo: CICLO_PIDIENDO, vista: PORTAL_VISTA,
                 ls: Object.assign({}, localStorage) };
  let B = null;
  return Promise.resolve()
    .then(() => {
      try { closePortal(true); } catch (e) {}
      localStorage.clear();
      DASH = null; MOV = undefined; CICLO_PERIODO = undefined; CICLO_PIDIENDO = 0;
      B = p385Banco(opc);
      return fn(B);
    })
    .finally(() => {
      try { if (B) { B.retener = null; B.soltar(); B.restaurar(); } } catch (e) {}
      try { closePortalUI(); } catch (e) {}
      try { portalReponerLoDeEmpresa(); } catch (e) {}
      try { stopDashAutoRefresh(); cicloTickStop(); dashNivelesFrenar(); } catch (e) {}
      DASH = prev.dash; MOV = prev.mov; PORTAL_VISTA = prev.vista;
      CICLO_PERIODO = prev.periodo; CICLO_PIDIENDO = prev.pidiendo;
      CICLO_PIDE_N = (Number(CICLO_PIDE_N) || 0) + 1;   // ningún pedido de período de este caso decide nada después
      try { localStorage.clear(); Object.keys(prev.ls).forEach(k => localStorage.setItem(k, prev.ls[k])); } catch (e) {}
    });
}

/* Con el emulador todo contesta en microtareas: se espera girando la cola, que no se estrangula con la
   pestaña oculta (LEEME). Si no alcanza (la entrada real tiene el piso de `CARGA_MIN_MS`), se cae a
   `PRUEBAS.esperarA`, que espera la CONDICIÓN y no un número de milisegundos. */
async function p385Hasta(cond, tope) {
  for (let i = 0; i < 300; i++) {
    let ok = false; try { ok = !!cond(); } catch (e) {}
    if (ok) return true;
    await Promise.resolve();
  }
  return PRUEBAS.esperarA(cond, tope || 4000);
}
function p385SinEsqueleto() { return !document.querySelector('#dashBody .dsk'); }

/* La entrada real del administrador: «Administrador» → contraseña → «Entrar». */
async function p385EntrarAdmin() {
  splashAdmin();
  const pass = document.getElementById('pAdminPass');
  if (pass && getComputedStyle(document.getElementById('portalDash')).display === 'none') {
    pass.value = 'x';
    portalLoginAdmin(document.querySelector('#adminBox .save-btn'));
    pass.value = '';
  }
  return p385Hasta(() => !!DASH && DASH.rol === 'admin' && !DASH.visor && p385SinEsqueleto());
}
/* El visor, por los `onchange` de sus dos selectores. */
async function p385Visor(emp, vista) {
  const e = document.getElementById('visorEmpresa'), v = document.getElementById('visorVista');
  if (!e || !v) return false;
  e.value = emp; v.value = vista;
  const antes = DASH;
  e.dispatchEvent(new Event('change'));
  return p385Hasta(() => !!DASH && DASH !== antes && !!DASH.visor && (DASH.visor.empresa || '') === emp && p385SinEsqueleto());
}
/* «Trabajar sobre», por el `onchange` de `#dashEmpAdmin`. */
async function p385Trabajar(emp) {
  const s = document.getElementById('dashEmpAdmin');
  if (!s) return false;
  s.value = emp;
  const antes = DASH;
  s.dispatchEvent(new Event('change'));
  return p385Hasta(() => !!DASH && DASH !== antes && DASH.f.emp === emp && p385SinEsqueleto());
}
/* Un filtro del menú, por su `onchange` (`dashFilterChange`). Devuelve false si la opción no existe. */
function p385Filtrar(id, valor) {
  const s = document.getElementById(id);
  if (!s) return false;
  s.value = valor;
  if (s.value !== valor) return false;
  s.dispatchEvent(new Event('change'));
  return true;
}
/* «Actividad reciente» lista para el alcance que la pantalla nombra. */
function p385MovListo(alcance) {
  return p385Hasta(() => !!MOV && MOV.estado === 'listo' && String(MOV.alcanceVisto || '').indexOf(alcance + '|') === 0);
}
function p385Txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
function p385Mov() {
  const h = document.getElementById('movHueco');
  return { res: p385Txt(h && h.querySelector('.mov-res')), cob: !!(h && h.querySelector('.mov-cob')),
           todo: p385Txt(h), filas: h ? h.querySelectorAll('.mov-it').length : 0 };
}
/* El resumen SIN filtro: el del servidor, con las MISMAS claves de la pantalla. */
function p385Resumen(ultima, tests, total) {
  const c = movCuando(ultima);
  return [t('mov_resumen_ultimo', { cuando: c.dia + ' ' + c.hora }), t('mov_resumen_tests', { n: tests }),
          t('mov_resumen_total', { n: total })].join(' · ');
}
/* Los pedazos fijos de las dos cuentas del resumen, sacados de SUS claves con un número de marca: así «no hay
   cuentas» no depende de cómo esté redactado el texto ni del idioma. */
function p385PedazosDeCuentas() {
  return ['mov_resumen_tests', 'mov_resumen_total'].map(k => t(k, { n: '§' }).split('§').filter(x => x.trim()).join(''));
}
/* H1 · EL INVARIANTE de D1 con un filtro puesto, no la forma del texto: ninguna cuenta (serían de la ventana de 10
   de la EMPRESA y se leían como el total de la persona), y el «último movimiento» es el más reciente de los suyos
   DENTRO de lo que llegó, que es lo único exacto: la ventana son los más recientes del alcance.
   R19 · lo concede `movBloque` con `movDeLoVisible`. */
function p385ResumenConFiltro(donde, res, suyos) {
  p385PedazosDeCuentas().forEach(pz => PRUEBAS.falso(res.indexOf(pz) >= 0,
    '🔴 ' + donde + ' · el resumen no cuenta nada («…' + pz + '»): con filtro sería la ventana de la empresa, no lo suyo · decía «' + res + '»'));
  const c = movCuando(suyos.reduce((m, i) => Math.max(m, Number(i.ts) || 0), 0));
  PRUEBAS.cierto(res.indexOf(t('mov_resumen_ultimo', { cuando: c.dia + ' ' + c.hora })) >= 0,
    '🔴 ' + donde + ' · el último movimiento es el más reciente de los suyos entre los que llegaron (' + c.dia + ' ' + c.hora + ') · decía «' + res + '»');
}
/* La sección de disponibilidad de Dirección, sin su guía ⓘ. */
function p385Idc() {
  const s = document.getElementById('dsec-idc');
  if (!s) return null;
  const c = s.cloneNode(true);
  c.querySelectorAll('details.dash-help').forEach(x => x.remove());
  return { txt: p385Txt(c), celdas: s.querySelectorAll('.hs-duo-c').length,
           alertas: s.querySelectorAll('.hs-alerta').length, oks: s.querySelectorAll('.hs-ok').length,
           datos: p385Txt(s.querySelector('.hs-duo-c small')) };
}
/* H6 · cuánta gente cumple el filtro, contada en lo que mandó el SERVIDOR (`DASH.registros`: en Dirección, una
   fila por persona) con la definición del BANCO, no con las funciones del panel. En el banco toda persona con
   filas tiene tests, así que es también cuánta gente del filtro tiene datos. El aserto viejo comparaba el IDC
   contra las mismas filas que el IDC cuenta: era cierto por construcción y no podía fallar. */
function p385GenteDe(pred) {
  return Object.keys((DASH.registros || []).filter(r => r && pred(r)).reduce((o, r) => { if (r.persona) o[r.persona] = 1; return o; }, {})).length;
}
/* Lo que D2 decidió para Dirección con un filtro: lo de las filas filtradas sí, atenuado; la nómina entera, no.
   `esperado` · la gente del filtro con datos (`p385GenteDe`). */
function p385IdcConFiltro(donde, esperado) {
  const s = p385Idc();
  PRUEBAS.cierto(!!s, 'guarda: ' + donde + ' tiene la sección de disponibilidad (#dsec-idc)');
  if (!s) return;
  PRUEBAS.cierto(s.txt.indexOf(t('hs_en_condiciones')) >= 0,
    donde + ' · sigue el % en condiciones de las filas filtradas: D2 lo conserva');
  const m = /(\d+)\D+(\d+)/.exec(s.datos);
  PRUEBAS.cierto(!!m, 'guarda: ' + donde + ' · se lee «N de M con datos» · «' + s.datos + '»');
  PRUEBAS.cierto(esperado >= 1 && esperado < p385GenteDe(() => true),
    'guarda: ' + donde + ' · el filtro deja gente, y menos que sin filtro (si no, la comparación de abajo no distingue) · ' + esperado);
  if (m) PRUEBAS.igual(Number(m[2]), esperado,
    '🔴 ' + donde + ' · «N de M con datos» es la gente del filtro con datos, contada en lo que mandó el servidor, no la de toda la empresa · M = ' + m[2]);
  /* H2 · R19: la atenuación la concede `renderHseqIdc` (`numFlojo`) con la clase de la cobertura floja. */
  const celda = document.querySelector('#dsec-idc .hs-duo-c'), num = celda && celda.querySelector('.hs-pct-big');
  PRUEBAS.cierto(!!celda && celda.classList.contains('hs-duo-flojo'),
    '🔴 ' + donde + ' · el % va ATENUADO, como con la cobertura floja: con filtro la cobertura no se conoce y el número no es un dato confiable');
  if (num) PRUEBAS.igual(getComputedStyle(num).color, CTX.token('var(--text-muted)'),
    '🔴 ' + donde + ' · y se VE atenuado: el número toma el color de la cobertura floja (`--text-muted`)');
  PRUEBAS.igual(s.celdas, 1,
    '🔴 ' + donde + ' · un solo número: sin el «% de la nómina medida», que compara el filtro contra la nómina entera');
  PRUEBAS.falso(s.txt.indexOf(t('hs_nomina_medida')) >= 0,
    '🔴 ' + donde + ' · no dice «de la nómina medida» · la nómina por filtro no se conoce (el servidor manda sólo el total)');
  PRUEBAS.igual(s.alertas + s.oks, 0,
    '🔴 ' + donde + ' · ni «N personas sin registros», ni «cobertura completa», ni el aviso de que la disponibilidad ' +
    'no es confiable: los tres comparan contra la nómina entera · «' + s.txt.slice(0, 260) + '»');
  PRUEBAS.cierto(s.txt.indexOf(t('idc_cob_filtro')) >= 0,
    '🔴 ' + donde + ' · y una línea dice que con filtro no se sabe cuánta gente falta medir (`idc_cob_filtro`), para que su ausencia no se lea como «no falta nadie»');
}
/* Ciclo y Jornada: los botones de período marcados (`aria-pressed="true"`), por su id. */
function p385Marcado(sec) {
  return [...document.querySelectorAll('#' + sec + ' .cic-per[aria-pressed="true"]')]
    .map(b => ((b.getAttribute('onclick') || '').match(/cicloPeriodoSet\('([^']+)'/) || [])[1]);
}
function p385Boton(sec, id) { return document.querySelector('#' + sec + ' .cic-per[onclick*="\'' + id + '\'"]'); }
/* Toca un botón de período y espera a que el servidor haya traído esos días. */
async function p385Periodo(sec, id, dias) {
  const b = p385Boton(sec, id);
  if (!b) return false;
  b.click();
  return p385Hasta(() => !CICLO_PIDIENDO && cicloDiasTraidos() === dias);
}
/* D3 · lo marcado contra lo traído. R21: lo traído lo dice `cicloDiasTraidos()`, el lector que también usa
   `cicloPeriodoSet` para decidir si pide; y Jornada no recorta en el cliente (P169, `exacto`), así que su
   botón tiene que ser EXACTAMENTE lo traído, que es también lo que dice su línea «Últimos N días». */
function p385PeriodoCoincide(donde, conCiclo) {
  const traidos = cicloDiasTraidos();
  const jor = p385Marcado('dsec-jornada');
  PRUEBAS.igual(jor.length, 1, 'guarda: ' + donde + ' · Jornada tiene un botón de período marcado · ' + JSON.stringify(jor));
  PRUEBAS.igual(DASH.duty && DASH.duty.dias, traidos, 'guarda: ' + donde + ' · Jornada muestra lo traído (`duty.dias`)');
  if (jor.length) PRUEBAS.igual(cicloPeriodoDias(jor[0]), traidos,
    '🔴 ' + donde + ' · el botón marcado de Jornada es el período traído · marcado «' + jor[0] + '» con ' + traidos + ' días traídos');
  if (!conCiclo) return;
  const cic = p385Marcado('dsec-ciclo');
  PRUEBAS.igual(cic.length, 1, 'guarda: ' + donde + ' · Ciclo tiene un botón de período marcado · ' + JSON.stringify(cic));
  if (cic.length) PRUEBAS.comoMucho(cicloPeriodoDias(cic[0]), traidos,
    '🔴 ' + donde + ' · el botón marcado de Ciclo no promete más días que los traídos · marcado «' + cic[0] + '» con ' + traidos);
}

/* ── D1 · «Actividad reciente» con persona o departamento ───────────────────────────────────────────── */

PRUEBAS.caso('🔴 D1 · con una PERSONA filtrada, «Actividad reciente» no resume a la empresa ni muestra su cobertura, y dice por qué', () => p385Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador por el camino real');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.cierto(await p385MovListo('Consorcio HELITEC'), 'guarda: la actividad de HELITEC llegó');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'Luis Ferrer'), 'guarda: «Empleado» ofrece a Luis Ferrer');
  PRUEBAS.cierto(await p385MovListo('Luis Ferrer'), 'guarda: la actividad se volvió a pedir con el alcance nuevo');
  const u = B.ultima('actividad'), items = (u && u.resp && u.resp.items) || [];
  const suyos = items.filter(i => i.persona === 'Luis Ferrer');
  PRUEBAS.alMenos(suyos.length, 1, 'guarda: el servidor mandó movimientos de Luis Ferrer entre los últimos');
  PRUEBAS.cierto(items.some(i => i.persona !== 'Luis Ferrer'), 'guarda: y de otras personas (si no, resumir todo o lo visible daría lo mismo)');
  PRUEBAS.cierto((Number(u.resp.ultima) || 0) > suyos.reduce((m, i) => Math.max(m, Number(i.ts) || 0), 0),
    'guarda: el último movimiento de la EMPRESA (el de hoy, de Ana Suárez) es más reciente que el de Luis Ferrer · si no, «último movimiento» no distinguiría');
  /* R19 · el derecho a que el resumen hable de la persona filtrada lo concede `movBloque`, que lo arma con los
     ítems que deja `movItemsVisibles` (`movDeLoVisible`), y no con `ultima`/`tests`/`total` de toda la respuesta. */
  const m = p385Mov();
  PRUEBAS.igual(m.filas, suyos.length, 'guarda (F003): la lista muestra sólo los suyos');
  p385ResumenConFiltro('Luis Ferrer', m.res, suyos);
  PRUEBAS.falso(m.res.indexOf(t('mov_hoy')) >= 0, '🔴 y no dice «hoy»: su último test fue hace tres días');
  PRUEBAS.falso(m.cob, '🔴 sin el bloque «Tu gente»: la nómina por persona no se sabe y el bloque era de la empresa entera');
  PRUEBAS.falso(m.todo.indexOf('Carla Díaz') >= 0, '🔴 y no nombra a nadie fuera del filtro como «sin medir»');
  /* H4 · R19: la línea la pone `movBloque` en lugar de `movCoberturaBloque()` */
  PRUEBAS.cierto(m.todo.indexOf(t('mov_cob_filtro')) >= 0,
    '🔴 y en su lugar una línea dice que con filtro no se ve cuánta gente falta medir: sin ella, que falte el bloque se lee como «no falta nadie»');
}));

PRUEBAS.caso('🔴 D1 · con un DEPARTAMENTO filtrado, el resumen no es el de la empresa y no aparece gente de otro como «sin medir»', () => p385Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.cierto(await p385MovListo('Consorcio HELITEC'), 'guarda: la actividad de HELITEC llegó');
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Mantenimiento'), 'guarda: «Departamento» ofrece Mantenimiento');
  PRUEBAS.cierto(await p385MovListo('Mantenimiento'), 'guarda: la actividad se volvió a pedir con el alcance nuevo');
  const u = B.ultima('actividad'), items = (u && u.resp && u.resp.items) || [];
  /* el departamento se compara como lo compara el panel (`depClaveCliente`), igual que `movItemsVisibles` */
  const delDep = items.filter(i => depClaveCliente(i.dep || '') === depClaveCliente('Mantenimiento'));
  PRUEBAS.alMenos(delDep.length, 1, 'guarda: el servidor mandó movimientos de Mantenimiento');
  PRUEBAS.cierto(delDep.length < items.length, 'guarda: y de otros departamentos');
  const m = p385Mov();
  PRUEBAS.igual(m.filas, delDep.length, 'guarda (F003): la lista muestra sólo los del departamento');
  p385ResumenConFiltro('Mantenimiento', m.res, delDep);
  PRUEBAS.falso(m.res.indexOf(t('mov_hoy')) >= 0, '🔴 y no dice «hoy»: en Mantenimiento nadie se midió hoy');
  PRUEBAS.falso(m.cob, '🔴 sin el bloque «Tu gente»: la gente sin tests llega sin departamento (obs. 12 de la investigación)');
  PRUEBAS.falso(m.todo.indexOf('Carla Díaz') >= 0, '🔴 y Carla Díaz, que es de Operaciones, no aparece como «sin medir» de Mantenimiento');
  PRUEBAS.cierto(m.todo.indexOf(t('mov_cob_filtro')) >= 0,
    '🔴 y en su lugar una línea dice que con filtro no se ve cuánta gente falta medir (H4)');
}));

PRUEBAS.caso('🔒 D1 · CONTROL sin filtro: el resumen es el del servidor y la cobertura de la empresa sigue, como siempre', () => p385Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.cierto(await p385MovListo('Consorcio HELITEC'), 'guarda: la actividad de HELITEC llegó');
  PRUEBAS.igual([DASH.f.dep, DASH.f.per], ['', ''], 'guarda: sin departamento ni persona');
  const u = B.ultima('actividad'), r = (u && u.resp) || {};
  const m = p385Mov();
  PRUEBAS.igual(m.res, p385Resumen(r.ultima, r.tests, r.total),
    'sin filtro el resumen sigue siendo el de TODO el alcance (`ultima`, `tests` y `total` del servidor) · «' + m.res + '»');
  PRUEBAS.cierto(m.cob, 'y el bloque «Tu gente» sigue');
  PRUEBAS.cierto(m.todo.indexOf('Carla Díaz') >= 0, 'con quien falta medir de la empresa, por su nombre (el administrador los ve)');
  PRUEBAS.falso(m.todo.indexOf(t('mov_cob_filtro')) >= 0, 'y sin la línea del filtro: sin filtro la cobertura está a la vista');
}));

PRUEBAS.caso('🔴 D1 · H1 · con MÁS de 10 movimientos en la empresa (17 tests, 5 de Luis), bajo «Luis Ferrer» no hay cuentas de la ventana', () => p385Correr(async B => {
  /* El escenario normal de producción (en Silva se miden pocas personas por día y la bitácora también suma
     movimientos): la ventana de 10 que manda el servidor cubre pocos días. Con la primera vuelta decía
     «1 pruebas contestadas · 1 en total» a quien tenía 5. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.cierto(await p385MovListo('Consorcio HELITEC'), 'guarda: la actividad de HELITEC llegó');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'Luis Ferrer'), 'guarda: «Empleado» ofrece a Luis Ferrer');
  PRUEBAS.cierto(await p385MovListo('Luis Ferrer'), 'guarda: la actividad se volvió a pedir con el alcance nuevo');
  const u = B.ultima('actividad'), items = (u && u.resp && u.resp.items) || [];
  const suyos = items.filter(i => i.persona === 'Luis Ferrer');
  /* cuántos tests tiene Luis en el CH de este caso: del banco, no de la pantalla */
  const enElCh = p385Hojas({ muchos: true })['Respuestas de formulario 1'].filter(f => f[1] === 'Luis Ferrer' && f[72] === 'Consorcio HELITEC').length;
  PRUEBAS.igual(items.length, 10, 'guarda: viajan los 10 últimos de la empresa');
  PRUEBAS.alMenos(Number(u.resp.total) || 0, 11, 'guarda: y la empresa tiene más: la ventana RECORTA · total ' + u.resp.total);
  PRUEBAS.alMenos(suyos.length, 1, 'guarda: entró algún movimiento de Luis Ferrer');
  PRUEBAS.cierto(suyos.length < enElCh, 'guarda: y menos que los suyos en el CH (' + suyos.length + ' de ' + enElCh + '): cualquier cuenta de la ventana sería falsa');
  const m = p385Mov();
  p385ResumenConFiltro('Luis Ferrer, con la ventana recortada', m.res, suyos);
}, { muchos: true }));

/* ── D2 · la disponibilidad de Dirección con un filtro ─────────────────────────────────────────────── */

PRUEBAS.caso('🔴 D2 · Dirección con un DEPARTAMENTO: no compara contra la nómina entera ni inventa «sin registros»; y entra a 375, 768 y 1366', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.igual([DASH.vista, DASH.panel], ['hseq', 'direccion'], 'guarda: es la vista de Dirección');
  PRUEBAS.alMenos(Number(DASH.nominaTotal) || 0, 2, 'guarda: el servidor mandó la nómina de la empresa (el total que D2 deja de usar con filtro)');
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Mantenimiento'), 'guarda: «Departamento» ofrece Mantenimiento');
  /* R19 · lo que se muestra con el filtro lo concede `renderHseqIdc` con `hseqFiltroDeAlcance()`, la misma
     pregunta que ya usaban los totales de HSEQ para avisar que no siguen al filtro. */
  p385IdcConFiltro('Mantenimiento', p385GenteDe(r => r.departamento === 'Mantenimiento'));
  /* R12 · el número que queda ocupa todo el ancho del bloque, sin desbordar, en los tres anchos del proyecto. */
  [375, 768, 1366].forEach(ancho => PRUEBAS.enVentana(ancho, 800, () => {
    const duo = document.querySelector('#dsec-idc .hs-duo'), c = duo && duo.querySelector('.hs-duo-c');
    const sec = document.getElementById('dsec-idc');
    PRUEBAS.cierto(!!(duo && c), 'guarda: ' + ancho + ' px · está el número');
    if (!duo || !c) return;
    PRUEBAS.alMenos(c.getBoundingClientRect().width, duo.getBoundingClientRect().width * 0.95,
      '🔴 ' + ancho + ' px · el número ocupa el ancho del bloque, no media columna con un hueco al lado');
    PRUEBAS.comoMucho(sec.scrollWidth, sec.clientWidth + 1, ancho + ' px · la sección no desborda');
  }));
}));

PRUEBAS.caso('🔴 D2 · Dirección con una PERSONA (seudónimo): sólo lo de esa fila, sin la nómina entera', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» ofrece el seudónimo P1');
  p385IdcConFiltro('P1', p385GenteDe(r => r.persona === 'P1'));
}));

PRUEBAS.caso('🔴 D2 · «Todas · Dirección» con un NIVEL: no compara contra la nómina de todas las empresas', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('', 'direccion'), 'guarda: visor «Todas las empresas · Dirección»');
  PRUEBAS.cierto(await p385Hasta(() => !!document.getElementById('dashNivel')), 'guarda: llegaron los niveles y está el filtro «Nivel de riesgo»');
  PRUEBAS.cierto(p385Filtrar('dashNivel', '4'), 'guarda: «Nivel de riesgo» ofrece el 4');
  /* en el banco, el nivel 4 es HELITEC/Operaciones (`Niveles Riesgo`): la regla del banco, no `nivelRiesgoDe` */
  p385IdcConFiltro('Nivel 4', p385GenteDe(r => /HELITEC/i.test(r.empresa || '') && r.departamento === 'Operaciones'));
}));

PRUEBAS.caso('🔒 D2 · CONTROL sin filtro: la cobertura contra la nómina, con «sin registros», como siempre', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.falso(hseqFiltroDeAlcance(), 'guarda: sin filtro de alcance');
  const s = p385Idc();
  PRUEBAS.cierto(!!s, 'guarda: está la sección de disponibilidad');
  if (!s) return;
  const m = /(\d+)\D+(\d+)/.exec(s.datos), conDato = m ? Number(m[2]) : -1;
  PRUEBAS.igual(s.celdas, 2, 'sin filtro van los DOS números juntos, como siempre');
  PRUEBAS.cierto(s.txt.indexOf(t('hs_nomina_medida')) >= 0, 'con el «% de la nómina medida»');
  PRUEBAS.cierto(s.txt.indexOf(t('hs_n_de_m_pers', { n: conDato, m: DASH.nominaTotal })) >= 0,
    'y los medidos contra la nómina que mandó el servidor (' + conDato + ' de ' + DASH.nominaTotal + ')');
  PRUEBAS.cierto(conDato < DASH.nominaTotal, 'guarda: en el banco falta medir a alguien (Carla Díaz)');
  PRUEBAS.alMenos(s.alertas, 1, 'y el aviso de quién falta, como siempre');
  PRUEBAS.falso(s.txt.indexOf(t('idc_cob_filtro')) >= 0, 'sin la línea del filtro: sin filtro la cobertura está a la vista');
}));

/* ── D3 · el período de Ciclo y Jornada contra lo traído ──────────────────────────────────────────── */

PRUEBAS.caso('🔴 D3 · puerta 1, el visor: «30 días» en HELITEC · Dirección y cambiar a Silva · Dirección', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(cicloPuedeHistorico(), 'guarda: el servidor le concede histórico (sin eso no hay botones)');
  PRUEBAS.cierto(await p385Periodo('dsec-ciclo', '30', 30), 'guarda: tocar «30 días» en Ciclo trajo 30 días');
  p385PeriodoCoincide('con 30 días traídos', true);
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'direccion'), 'guarda: visor «Aeroambulancias Silva · Dirección»');
  PRUEBAS.igual(cicloDiasTraidos(), 7, 'guarda: el panel nuevo trae 7 días (`visorCambiar` no arrastra `opDias`)');
  p385PeriodoCoincide('tras cambiar el visor', true);
}));

PRUEBAS.caso('🔴 D3 · puerta 2, «Trabajar sobre»: «90 días» en Jornada y elegir HELITEC', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador («Todas · Servicio médico»)');
  PRUEBAS.cierto(await p385Periodo('dsec-jornada', '90', 90), 'guarda: tocar «90 días» en Jornada trajo 90 días');
  p385PeriodoCoincide('con 90 días traídos', false);
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.igual(cicloDiasTraidos(), 7, 'guarda: el panel nuevo trae 7 días (`dashEmpresaAdminCambiar` no arrastra `opDias`)');
  p385PeriodoCoincide('tras «Trabajar sobre»', false);
}));

PRUEBAS.caso('🔴 D3 · puerta 3, cerrar con ✕ y volver a entrar como administrador', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Periodo('dsec-jornada', '30', 30), 'guarda: tocar «30 días» en Jornada trajo 30 días');
  closePortalUI();
  PRUEBAS.igual(DASH, null, 'guarda: la ✕ cerró el panel');
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: volvió a entrar por «Administrador»');
  PRUEBAS.igual(cicloDiasTraidos(), 7, 'guarda: el panel nuevo trae 7 días');
  p385PeriodoCoincide('tras la ✕ y el reingreso', false);
}));

PRUEBAS.caso('🔴 D3 · con «30 días» EN VUELO, cambiar de empresa: el panel nuevo no hereda los parámetros ni el aviso del pedido viejo', () => p385Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  B.retener = c => !!(c && c.opDias);
  const b30 = p385Boton('dsec-ciclo', '30');
  PRUEBAS.cierto(!!b30, 'guarda: está el botón de 30 días');
  if (!b30) return;
  b30.click();
  PRUEBAS.cierto(await p385Hasta(() => B.retenidos.length === 1), 'guarda: el pedido de 30 días salió y quedó en vuelo');
  PRUEBAS.igual(CICLO_PIDIENDO, 30, 'guarda: el panel lo sabe en vuelo (P089: el botón ya se ve elegido)');
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'direccion'), 'guarda: el visor cambió a Silva mientras tanto');
  B.retener = null;
  PRUEBAS.igual(B.soltar(), 1, 'guarda: llega, tarde, la respuesta del pedido viejo');
  for (let i = 0; i < 80; i++) await Promise.resolve();
  /* R19 · que el panel nuevo conserve SUS parámetros lo concede `onDashData`, el único lugar donde nace un
     panel: invalida el pedido de período del anterior (`CICLO_PIDE_N`), así que su `.then` no decide nada. */
  PRUEBAS.igual(DASH.visor && DASH.visor.empresa, 'Aeroambulancias Silva', 'guarda: el panel es el de Silva');
  PRUEBAS.igual(DASH.params.verEmpresa, 'Aeroambulancias Silva',
    '🔴 sus parámetros siguen siendo los de Silva · el pedido viejo le ponía los de HELITEC, y el próximo refresco traía otra empresa bajo este rótulo');
  PRUEBAS.falso('opDias' in DASH.params, '🔴 y sin `opDias`: el panel nuevo arranca con lo que pidió el visor');
  PRUEBAS.igual(B.toasts.filter(x => x === t('per_no_cargo')).length, 0,
    '🔴 y sin el aviso «no se pudo traer»: ese pedido era de otro panel, no falló el de éste');
  PRUEBAS.falso(!!CICLO_PIDIENDO, 'y no queda nada marcado como en vuelo');
  PRUEBAS.falso(!!document.querySelector('#dsec-ciclo .cic-cargando'), 'ni el esqueleto en Ciclo');
  p385PeriodoCoincide('tras la respuesta tardía', true);
  await dashRefresh(true);
  const ref = B.ultima('supervisor');
  PRUEBAS.igual(ref && ref.pedido.verEmpresa, 'Aeroambulancias Silva', '🔴 y el ↻ pide Silva, no HELITEC');
}));

PRUEBAS.caso('🔴 D3 · Jornada marca lo que muestra: con 30 días traídos y «En curso» en Ciclo, Jornada sigue en 30', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(await p385Periodo('dsec-jornada', '30', 30), 'guarda: tocar «30 días» en Jornada trajo 30 días');
  const hoy = p385Boton('dsec-ciclo', 'hoy');
  PRUEBAS.cierto(!!hoy, 'guarda: está «En curso» en Ciclo');
  if (hoy) hoy.click();
  PRUEBAS.igual(p385Marcado('dsec-ciclo'), ['hoy'], 'guarda: Ciclo quedó en «En curso» (no pide: 7 entran en 30)');
  PRUEBAS.igual(cicloDiasTraidos(), 30, 'guarda: siguen los 30 días traídos');
  PRUEBAS.cierto(p385Txt(document.getElementById('dsec-jornada')).indexOf(t('jor_lead', { dias: 30 })) >= 0,
    'guarda: Jornada dice «Últimos 30 días»');
  p385PeriodoCoincide('con «En curso» en Ciclo', true);
}));

/* ── Privacidad · HSEQ con un seudónimo en «Empleado» (sólo se mide) ─────────────────────────────────── */

/* Lo que HSEQ NO puede mostrar de una persona (`priv_hseq_1`, `priv_hseq_2`): un estado o un color de su
   semáforo, «en condiciones», un valor o un IDC propio. Se busca en TODO el panel (`#portalDash`, header
   incluido), sin las guías ⓘ y sin «Lo que viene», que son texto fijo. */
function p385Privacidad() {
  const pd = document.getElementById('portalDash');
  const c = pd.cloneNode(true);
  c.querySelectorAll('details.dash-help, .dash-help, .hseq-que-viene').forEach(x => x.remove());
  const txt = p385Txt(c);
  const estados = Object.keys(APT_ESTADOS).filter(k => k !== 'sindato').map(k => aptEstadoInfo(k).t);
  return {
    duo: pd.querySelectorAll('.hs-duo').length,            // el IDC (disponibilidad y cobertura)
    dot: pd.querySelectorAll('.hs-dot').length,            // el punto de color de un estado
    enCondiciones: txt.toLowerCase().indexOf(t('hs_en_condiciones').toLowerCase()) >= 0,
    estados: estados.filter(e => txt.indexOf(e) >= 0),
    turno: pd.querySelectorAll('.cic-turno-chip').length,  // el chip del KSS del check-in
    tarjetas: [...pd.querySelectorAll('#dsec-inicio .kpi')].map(k => k.dataset.m + '|' + k.className + '|' + p385Txt(k.querySelector('.kv'))),
    estado: p385Txt(document.getElementById('dashEstado')) + '|' + (document.getElementById('dashEstado') || {}).className
  };
}
/* Lo que llegó del servidor: HSEQ no recibe nada de los tests de una persona. R19 · ese derecho lo concede el
   `.gs` (`aptitudPayload = esPanelHseq_(acc) ? null : …` y la lista blanca `CAMPOS_HSEQ` de `anonimizarHseq`). */
function p385PayloadSinTests(donde) {
  const MET = ['kss', 'estres', 'ansiedad', 'fatiga', 'gastro', 'depresion', 'cansancio'];
  const conValor = (o, ks) => ks.some(k => o && o[k] != null && o[k] !== '');
  PRUEBAS.igual(DASH.aptitud, null, donde + ' · no llegó la aptitud por persona');
  PRUEBAS.igual((DASH.registros || []).filter(r => conValor(r, MET)).length, 0, donde + ' · ninguna fila trae el valor de un test');
  PRUEBAS.igual((DASH.operacional || []).filter(o => o && o.test && o.resultado != null && o.resultado !== '').length, 0,
    donde + ' · ningún evento del ciclo trae el resultado de su test');
  PRUEBAS.igual((DASH.turnos || []).filter(x => conValor(x, ['kss', 'kssNivel', 'nivel'])).length, 0, donde + ' · ningún turno trae su KSS');
}
function p385SinNadaDeP1(donde, sinFiltro, conP1) {
  PRUEBAS.igual(conP1.duo + conP1.dot, 0, '🔒 ' + donde + ' · con P1 no hay IDC ni punto de estado de nadie');
  PRUEBAS.falso(conP1.enCondiciones, '🔒 ' + donde + ' · ni «en condiciones»');
  PRUEBAS.igual(conP1.estados, [], '🔒 ' + donde + ' · ni la etiqueta de un estado (apto, seguimiento…)');
  PRUEBAS.igual(conP1.turno, 0, '🔒 ' + donde + ' · ni el chip del KSS de un turno');
  PRUEBAS.igual(conP1.tarjetas, sinFiltro.tarjetas, '🔒 ' + donde + ' · las tarjetas de los tests son las de la empresa: P1 no cambia ninguna');
  PRUEBAS.igual(conP1.estado, sinFiltro.estado, '🔒 ' + donde + ' · ni el estado global del header');
}

PRUEBAS.caso('🔒 Privacidad · HSEQ con P1 en «Empleado», por el visor y por la entrada real: nada sacado de sus tests (y Dirección, el discriminador, sí lo muestra)', () => p385Correr(async () => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  /* 1 · el visor «Consorcio HELITEC · HSEQ» */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
  PRUEBAS.igual(DASH.panel, 'hseq', 'guarda: es el panel de HSEQ (no Dirección)');
  p385PayloadSinTests('visor HSEQ');
  const v0 = p385Privacidad();
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» ofrece el seudónimo P1');
  p385SinNadaDeP1('visor HSEQ', v0, p385Privacidad());
  /* 2 · el DISCRIMINADOR: el mismo detector, en Dirección con P1, tiene que ver su estado (Dirección lo
     tiene permitido por `priv_dir_1`). Si no lo ve, los ceros de arriba no midieron nada. */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: P1 en Dirección');
  const d1 = p385Privacidad();
  PRUEBAS.cierto(d1.duo > 0 && d1.enCondiciones, 'DISCRIMINADOR · en Dirección el detector SÍ ve el estado de P1 (IDC y «en condiciones»)');
  /* 3 · la entrada real al panel de HSEQ: usuario y contraseña del panel (columna «Contraseña panel HSEQ») */
  closePortalUI();
  splashPortal(); portalMode('hseq');
  document.getElementById('pEmpresa').value = 'helitec';
  document.getElementById('pPass').value = 'xh';
  portalLoginSupervisor(document.querySelector('#portalSup .save-btn'));
  document.getElementById('pPass').value = '';
  PRUEBAS.cierto(await p385Hasta(() => !!DASH && DASH.panel === 'hseq' && !DASH.visor && p385SinEsqueleto(), CARGA_MIN_MS + 4000),
    'guarda: entró al panel de HSEQ con su contraseña');
  if (!DASH || DASH.panel !== 'hseq') return;
  p385PayloadSinTests('panel HSEQ');
  const h0 = p385Privacidad();
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» ofrece P1 también acá');
  p385SinNadaDeP1('panel HSEQ', h0, p385Privacidad());
}));

PRUEBAS.caso('🔒 Privacidad · panel de HSEQ con totales POR ENCIMA del piso: con P1, las tarjetas no cambian y no aparece nada suyo', () => p385Correr(async () => {
  /* El banco de arriba tiene dos personas medidas por empresa: los totales quedan debajo del piso y las tarjetas
     no muestran ningún número, así que «P1 no cambia ninguna» se cumpliría sin medir nada. Acá se usa el mundo
     de P308/P309 (`p309Datos`: grupos sellados de 5 o más, con la contraseña del panel de HSEQ y la de
     Dirección), que corre antes en `casos.json`. */
  if (typeof p309Datos !== 'function' || typeof p308Mundo !== 'function') {
    PRUEBAS.cierto(false, '⚠️ no está `p309Datos` (p308/p309 no corrieron antes): esta medición queda SIN MEDIR'); return; }
  const D = p309Datos();
  if (D.faltan) { PRUEBAS.igual(D.faltan, [], 'guarda: el mundo de P308'); return; }
  onDashData(JSON.parse(JSON.stringify(D.hseq)), 'Helitec', { usuario: 'helitec' }, 'hseq');
  PRUEBAS.igual(DASH.panel, 'hseq', 'guarda: el panel de HSEQ');
  p385PayloadSinTests('panel HSEQ con totales');
  const s0 = p385Privacidad();
  PRUEBAS.alMenos(s0.tarjetas.filter(x => x.indexOf('kpi-bajo-piso') < 0).length, 1,
    'guarda: hay tarjetas con un total a la vista (si no, «no cambian» no mide nada) · ' + JSON.stringify(s0.tarjetas));
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» ofrece el seudónimo P1');
  p385SinNadaDeP1('panel HSEQ con totales', s0, p385Privacidad());
  /* DISCRIMINADOR · el mismo mundo con la contraseña de Dirección, P1 puesto: el detector lo ve */
  onDashData(JSON.parse(JSON.stringify(D.dir)), 'Helitec', { usuario: 'helitec' }, 'hseq');
  PRUEBAS.igual(DASH.panel, 'direccion', 'guarda: Dirección');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: P1 en Dirección');
  const d1 = p385Privacidad();
  PRUEBAS.cierto(d1.duo > 0 && d1.enCondiciones, 'DISCRIMINADOR · en Dirección el detector SÍ ve el estado de P1');
}));

/* ── Privacidad de HSEQ en el SERVIDOR · «Actividad reciente» sin las pruebas ────────────────────────── */

/* La lámina de HSEQ (`priv_hseq_1`) promete «de tus tests, sólo totales de 5 o más… con menos de 5 personas, nada»,
   y cada movimiento `test` de la actividad era una prueba de UNA persona, con su hora y su departamento (con un
   departamento chico, el departamento es un seudónimo). La acción real, `accionActividad`, sobre el CH del banco con
   acciones de bitácora, con la credencial de cada panel, como llega el pedido del teléfono (R17: el punto de
   entrada de esa capa, como en `p223`). `n: 50` para ver todo lo de HELITEC, no sólo la ventana. */
/* Devuelve la respuesta y, del MISMO CH (las acciones llevan la hora de cuando se arma el banco), lo que hay de
   HELITEC: del banco y no de la respuesta, así la respuesta no se mide consigo misma. */
function p385Actividad(credencial) {
  const h = p385Hojas({ bitacora: true });
  const acciones = h['Bitácora'].slice(1).filter(f => f[1] === 'Consorcio HELITEC');
  const ch = { tests: h['Respuestas de formulario 1'].filter(f => f[72] === 'Consorcio HELITEC').length,
               acciones: acciones.length, ultimaAccion: Math.max.apply(null, acciones.map(f => JSON.parse(f[12]).ts)) };
  const api = GS.cargarGs(CTX.gs, GS.crearEntorno(h), ['accionActividad']);
  let r;
  try { r = JSON.parse(api.accionActividad(Object.assign({ dispositivoId: 'p385', n: '50' }, credencial)).getContent()); }
  catch (e) { r = { ok: false, error: String(e && e.message || e) }; }
  return { r: r, ch: ch };
}

PRUEBAS.caso('🔒 HSEQ · servidor · al panel de HSEQ no le llega ninguna prueba en la actividad, ni contada: por su contraseña y por el visor', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* R19 · el derecho a NO recibirlas lo concede `accionActividad` con `esPanelHseq_(acc)` (`sinTests`). */
  [['contraseña del panel de HSEQ', { usuario: 'helitec', pass: 'xh' }],
   ['visor «HELITEC · HSEQ»', { usuario: '*', pass: 'x', verEmpresa: 'Consorcio HELITEC', verVista: 'hseq' }]].forEach(([donde, cred]) => {
    const { r, ch } = p385Actividad(cred);
    PRUEBAS.alMenos(ch.tests, 1, 'guarda: ' + donde + ' · HELITEC tiene pruebas en el CH (si no, «no llega ninguna» no mediría nada)');
    PRUEBAS.alMenos(ch.acciones, 1, 'guarda: ' + donde + ' · y acciones de bitácora');
    PRUEBAS.igual(r.ok, true, 'guarda: ' + donde + ' · la acción contesta · ' + (r.error || ''));
    const items = r.items || [];
    PRUEBAS.igual(items.filter(i => i.tipo === 'test').length, 0, '🔒 ' + donde + ' · ningún movimiento de tipo prueba');
    PRUEBAS.igual(items.length, ch.acciones, donde + ' · y sí las acciones de bitácora de HELITEC');
    PRUEBAS.igual(r.total, ch.acciones, '🔒 ' + donde + ' · el total cuenta sólo acciones, no pruebas');
    PRUEBAS.igual(r.tests, null, '🔒 ' + donde + ' · las pruebas no se cuentan: `null`, no 0 (un 0 diría que nadie contestó)');
    PRUEBAS.igual(r.ultima, ch.ultimaAccion, '🔒 ' + donde + ' · y el último movimiento es la última acción, no la última prueba');
    PRUEBAS.igual(r.sinTests, true, '🔒 ' + donde + ' · y lo dice (`sinTests`), para que la pantalla no tenga que adivinarlo');
  });
});

PRUEBAS.caso('🔒 HSEQ · servidor · Dirección sigue recibiendo las pruebas, sin nombres: su lámina sólo le saca los puntajes', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  /* R19 · `esPanelHseq_` separa a HSEQ de Dirección (P306); `sinNombres` les saca el nombre a los dos. */
  [['contraseña de Dirección', { usuario: 'helitec', pass: 'xd' }],
   ['visor «HELITEC · Dirección»', { usuario: '*', pass: 'x', verEmpresa: 'Consorcio HELITEC', verVista: 'direccion' }]].forEach(([donde, cred]) => {
    const { r, ch } = p385Actividad(cred);
    PRUEBAS.igual(r.ok, true, 'guarda: ' + donde + ' · la acción contesta · ' + (r.error || ''));
    const pruebas = (r.items || []).filter(i => i.tipo === 'test');
    PRUEBAS.igual(pruebas.length, ch.tests, '🔒 ' + donde + ' · recibe las pruebas de HELITEC');
    PRUEBAS.igual(r.tests, ch.tests, '🔒 ' + donde + ' · y contadas');
    PRUEBAS.igual(r.sinTests, false, donde + ' · sin la marca de HSEQ');
    PRUEBAS.igual(pruebas.filter(i => i.persona).length, 0, donde + ' · sin nombre (K1b, como siempre)');
  });
});

PRUEBAS.caso('🔒 HSEQ · servidor · CONTROL: el supervisor recibe las pruebas, contadas y con nombre', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  const { r, ch } = p385Actividad({ usuario: 'helitec', pass: 'x' });
  PRUEBAS.igual(r.ok, true, 'guarda: la acción contesta · ' + (r.error || ''));
  const pruebas = (r.items || []).filter(i => i.tipo === 'test');
  PRUEBAS.igual(pruebas.length, ch.tests, 'el supervisor recibe las pruebas de HELITEC');
  PRUEBAS.igual(r.tests, ch.tests, 'contadas');
  PRUEBAS.igual(r.total, ch.tests + ch.acciones, 'y el total suma pruebas y acciones, como siempre');
  PRUEBAS.cierto(pruebas.length > 0 && pruebas.every(i => !!i.persona), 'con el nombre de cada persona');
  PRUEBAS.igual(r.sinTests, false, 'sin la marca de HSEQ');
});

PRUEBAS.caso('🔒 HSEQ · cliente · «Actividad reciente» sin pruebas: no dice «0 pruebas», no las promete, y con un filtro dice por qué está vacía', () => p385Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
  PRUEBAS.cierto(await p385MovListo('Consorcio HELITEC'), 'guarda: la actividad llegó');
  const r = (B.ultima('actividad') || {}).resp || {};
  PRUEBAS.igual(r.sinTests, true, 'guarda: el servidor contestó sin pruebas');
  PRUEBAS.alMenos((r.items || []).length, 1, 'guarda: y con acciones del sistema');
  /* R19 · la pantalla lo resuelve en `movBloque` con lo que dijo el servidor (`MOV.sinTests`), no con el panel */
  const h = document.getElementById('movHueco');
  const m = p385Mov(), ayuda = p385Txt(h && h.querySelector('details.dash-help'));
  PRUEBAS.igual(h ? h.querySelectorAll('.mov-q-test').length : -1, 0, 'ninguna fila de prueba');
  p385PedazosDeCuentas().slice(0, 1).forEach(pz => PRUEBAS.falso(m.res.indexOf(pz) >= 0,
    '🔒 el resumen no cuenta pruebas: un «0 pruebas contestadas» diría que nadie contestó · «' + m.res + '»'));
  PRUEBAS.cierto(m.res.indexOf(t('mov_resumen_total', { n: r.total })) >= 0,
    'y sí el total de lo que se lista (las acciones), como lo contó el servidor · «' + m.res + '»');
  /* V2-1 del verificador (vuelta 2): con «Último movimiento: 1 Nov 09:11» HSEQ leía la última actividad de la empresa,
     mientras Dirección decía «hoy 12:00» por una prueba. R19 · lo concede `movBloque`, que elige la etiqueta con
     `A.sinTests` (lo que contestó el servidor). El CONTROL de Dirección, más abajo, afirma la etiqueta de siempre. */
  const pre = (k) => t(k, { cuando: '§' }).split('§')[0];
  PRUEBAS.cierto(m.res.indexOf(pre('mov_resumen_ultimo_hseq')) >= 0,
    '🔒 el resumen dice «Última acción del sistema»: lo último que llega a este panel es una acción, no una prueba · «' + m.res + '»');
  PRUEBAS.falso(m.res.indexOf(pre('mov_resumen_ultimo')) >= 0,
    '🔒 y no «Último movimiento», que se lee como la última actividad de la empresa · «' + m.res + '»');
  /* V3-2 · la ⓘ dice para qué sirve la lista EN ESTE PANEL. «Confirmar que la aplicación está recibiendo información»
     llevaba a HSEQ a concluir que todo anda con el envío de tests caído. R19 · lo concede `movBloque` (primer párrafo
     de `dashHelp`, con `A.sinTests`). El CONTROL de Dirección, más abajo, afirma el párrafo de siempre. */
  PRUEBAS.cierto(ayuda.indexOf(t('mov_ayuda_hseq')) >= 0, '🔒 V3-2 · la ⓘ dice que la lista confirma los cambios del sistema, no que lleguen las pruebas');
  PRUEBAS.falso(ayuda.indexOf(t('mov_ayuda')) >= 0, '🔒 V3-2 · y no «confirmar que la aplicación está recibiendo información»');
  /* V3-1 · en el celular ningún pedazo del resumen se parte: la fecha con su hora, y cada cuenta, en un renglón.
     R19 · lo concede `.mov-res-pz { white-space: nowrap }`. La guarda exige que se vean (sin cajas, el «ninguno
     partido» pasaría en vacío). */
  [320, 375].forEach(w => PRUEBAS.enVentana(w, 700, () => {
    const pzs = Array.from(document.querySelectorAll('#movHueco .mov-res .mov-res-pz'));
    PRUEBAS.cierto(pzs.length >= 2 && pzs.every(e => e.getClientRects().length >= 1),
      'guarda · ' + w + ' px · el resumen trae su fecha y su total, y se ven (' + pzs.length + ')');
    PRUEBAS.igual(pzs.filter(e => e.getClientRects().length > 1).map(e => e.textContent), [],
      'V3-1 · ' + w + ' px · ningún pedazo partido en dos renglones');
  }));
  PRUEBAS.cierto(ayuda.indexOf(t('mov_ayuda_fuente_hseq', { s: tabLabel('inicio') })) >= 0,
    '🔒 la ⓘ dice que en este panel las pruebas no se listan');
  PRUEBAS.falso(ayuda.indexOf(t('mov_ayuda_fuente')) >= 0, '🔒 y no la de los otros paneles, que promete «las pruebas que contesta cada persona»');
  /* con un departamento: las acciones no tienen persona ni departamento, así que no queda ninguna */
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Mantenimiento'), 'guarda: «Departamento» ofrece Mantenimiento');
  PRUEBAS.cierto(await p385MovListo('Mantenimiento'), 'guarda: la actividad se volvió a pedir');
  const f = p385Mov();
  PRUEBAS.cierto(f.todo.indexOf(t('mov_sin_atribuir')) >= 0, '🔒 con filtro dice que en este panel la actividad no se separa por persona ni departamento');
  PRUEBAS.falso(f.todo.indexOf(t('mov_vacio')) >= 0, '🔒 y no «todavía no hay actividad», que es falso');
  PRUEBAS.cierto(f.todo.indexOf(t('mov_cob_filtro')) >= 0, 'y la línea de la cobertura con filtro (H4)');
  /* V2-2 · la línea se lee: 12 px o más y contraste holgado en los DOS temas (gente de 40 para arriba). R19 · lo
     concede la regla `.hs-nota-aus, .hs-nota-filtro`. Se mide el nodo real, con su fondo real (`--chip-bg`). */
  const nota = document.querySelector('#movHueco .hs-nota-filtro');
  PRUEBAS.cierto(!!nota, 'guarda: la línea de la cobertura con filtro está en el DOM');
  if (nota) ['claro', 'oscuro'].forEach(tema => PRUEBAS.enTema(tema, () => {
    const cs = getComputedStyle(nota), px = parseFloat(cs.fontSize), k = CTX.contraste(cs.color, cs.backgroundColor);
    PRUEBAS.alMenos(px, 12, 'V2-2 · ' + tema + ' · la línea mide ' + px + ' px');
    PRUEBAS.alMenos(Math.round(k * 100) / 100, 5.5, 'V2-2 · ' + tema + ' · contraste holgado: ' + k.toFixed(2) + ':1');
  }, nota));
  /* el panel de HSEQ de una empresa sin acciones: el vacío no promete que una prueba aparecerá */
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'hseq'), 'guarda: visor «Aeroambulancias Silva · HSEQ»');
  PRUEBAS.cierto(await p385MovListo('Aeroambulancias Silva'), 'guarda: la actividad de Silva llegó');
  const v = p385Mov();
  PRUEBAS.igual(v.filas, 0, 'guarda: Silva no tiene acciones y sus pruebas no le llegan a HSEQ');
  PRUEBAS.cierto(v.todo.indexOf(t('mov_vacio_pista_hseq')) >= 0, '🔒 el vacío dice qué puede aparecer en este panel');
  /* V2-1 · Silva tiene pruebas; lo que no tiene son acciones del sistema. «Todavía no hay actividad registrada» era
     falso (el verificador lo midió con este mismo banco). Con o sin empresa en el texto, según el filtro de trabajo. */
  const suf = (k) => t(k, { emp: '§' }).split('§')[1];
  PRUEBAS.cierto(v.todo.indexOf(t('mov_vacio_hseq')) >= 0 || v.todo.indexOf(suf('mov_vacio_emp_hseq')) >= 0,
    '🔒 el vacío dice que no hay ACCIONES del sistema · «' + v.todo.slice(0, 160) + '»');
  PRUEBAS.falso(v.todo.indexOf(t('mov_vacio')) >= 0 || v.todo.indexOf(suf('mov_vacio_emp')) >= 0,
    '🔒 y no «todavía no hay actividad», con pruebas contestadas que no le llegan a este panel');
  PRUEBAS.falso(v.todo.indexOf(t('mov_vacio_pista')) >= 0, '🔒 y no «cuando alguien contesta una prueba… aparece aquí»');
  /* CONTROL · Dirección, en el mismo banco: las pruebas se cuentan como siempre */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(await p385MovListo('Consorcio HELITEC'), 'guarda: la actividad de Dirección llegó');
  const rd = (B.ultima('actividad') || {}).resp || {};
  PRUEBAS.cierto(p385Mov().res.indexOf(t('mov_resumen_tests', { n: rd.tests })) >= 0,
    'CONTROL · Dirección sigue viendo «N pruebas contestadas» (' + rd.tests + ')');
  PRUEBAS.cierto(p385Mov().res.indexOf(pre('mov_resumen_ultimo')) >= 0 && p385Mov().res.indexOf(pre('mov_resumen_ultimo_hseq')) < 0,
    'CONTROL · y «Último movimiento», porque a Dirección sí le llegan las pruebas');
  const ayudaDir = p385Txt(document.querySelector('#movHueco details.dash-help'));
  PRUEBAS.cierto(ayudaDir.indexOf(t('mov_ayuda')) >= 0 && ayudaDir.indexOf(t('mov_ayuda_hseq')) < 0,
    'CONTROL · y la ⓘ de siempre, la que dice que confirma que llega información');
  PRUEBAS.alMenos(document.querySelectorAll('#movHueco .mov-q-test').length, 1, 'CONTROL · y sus filas de prueba');
  /* Y de vuelta a HSEQ, MISMA empresa y misma vista `hseq`: la actividad se vuelve a pedir. R19 · lo concede la
     clave de `movCargarSiHaceFalta`, que desde P385 incluye el panel; con la vieja, HSEQ mostraba las pruebas que
     llegaron para Dirección. */
  const pedidosAntes = B.pedidos.filter(x => x.action === 'actividad').length;
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: de vuelta al visor «Consorcio HELITEC · HSEQ»');
  PRUEBAS.cierto(await p385Hasta(() => B.pedidos.filter(x => x.action === 'actividad').length > pedidosAntes && MOV.estado === 'listo'),
    '🔒 la actividad se volvió a pedir al pasar de Dirección a HSEQ en la misma empresa');
  PRUEBAS.igual(document.querySelectorAll('#movHueco .mov-q-test').length, 0,
    '🔒 y el panel de HSEQ no muestra las pruebas que habían llegado para Dirección');
}, { bitacora: true }));

/* ── R14 · R1 · los textos nuevos ──────────────────────────────────────────────────────────────── */

/* H5 · EL DETECTOR DE VOSEO, con límites de palabra que entienden las tildes. El de la primera vuelta usaba `\b`
   sin la bandera `u`: ahí `\b` es ASCII, y una palabra que termina en vocal con tilde nunca tiene límite después,
   así que «mirá», «quitá», «sacá», «elegí» y «tocá» pasaban en verde (lo midió el verificador). En `pruebas/` no
   hay un detector compartido: cada archivo tiene el suyo, local a su caso. Éste toma la forma del de
   `p051-quien-ve-que.js`, que es el que resuelve las tildes, con la lista de lo más probable en un texto de pantalla. */
const P385_VOSEO = /(^|[^a-záéíóúüñ])(vos|sos|podés|tenés|querés|sabés|necesitás|debés|hacés|filtrás|elegís|mirá|quitá|sacá|elegí|tocá|andá|fijate|acordate|probá|revisá|escribí|entrá|salí|pedí|vení|volvé|empezá|esperá|cambiá|anotá|registrate)(?![a-záéíóúüñ])/i;
/* V3-3 · y las de la vuelta 3: sin ellas, borrar la inglesa de `mov_vacio_hseq` dejaba el español en inglés con la suite en verde. */
const P385_CLAVES_NUEVAS = ['idc_cob_filtro', 'mov_cob_filtro', 'mov_sin_atribuir', 'mov_vacio_pista_hseq', 'mov_ayuda_fuente_hseq',
                            'mov_resumen_ultimo_hseq', 'mov_vacio_hseq', 'mov_vacio_emp_hseq', 'mov_ayuda_hseq'];

PRUEBAS.caso('R14 · R1 · los textos nuevos de P385 están en los dos idiomas, distintos, y en español neutro (con su discriminador)', () => {
  const prev = idiomaActual();
  const es = {}, en = {};
  try {
    fijarIdioma('es'); P385_CLAVES_NUEVAS.forEach(k => { es[k] = t(k, { s: 'Inicio' }); });
    fijarIdioma('en'); P385_CLAVES_NUEVAS.forEach(k => { en[k] = t(k, { s: 'Home' }); });
  } finally { fijarIdioma(prev); }
  P385_CLAVES_NUEVAS.forEach(k => {
    PRUEBAS.cierto(!!es[k] && es[k] !== k, k + ' · existe en español · «' + es[k] + '»');
    PRUEBAS.cierto(!!en[k] && en[k] !== k, k + ' · existe en inglés · «' + en[k] + '»');
    PRUEBAS.cierto(es[k] !== en[k], k + ' · y son dos textos, no el español repetido');
    PRUEBAS.falso(P385_VOSEO.test(es[k]), k + ' · en español neutro: los clientes son de Venezuela (R1) · «' + es[k] + '»');
  });
  /* El texto que decidió Franco para Dirección, letra por letra: es lo que se publica. */
  PRUEBAS.igual(es.idc_cob_filtro, 'Con un filtro no se sabe cuánta gente falta medir: el porcentaje es sólo de quienes tienen datos.',
    'idc_cob_filtro · el texto decidido');
  PRUEBAS.igual(es.mov_cob_filtro, 'Con un filtro no se ve cuánta gente falta medir.', 'mov_cob_filtro · el texto decidido');
  /* DISCRIMINADOR · el detector tiene que ver un voseo puesto en el MISMO texto, también los que terminan en tilde,
     y no inventar uno en el texto neutro. */
  ['Mirá', 'Quitá los filtros.', 'Sacá', 'Elegí otra vista.', 'Tocá ↻', 'Si tenés dudas'].forEach(v =>
    PRUEBAS.cierto(P385_VOSEO.test(es.idc_cob_filtro + ' ' + v), 'DISCRIMINADOR · el detector ve «' + v + '» agregado al texto'));
  PRUEBAS.falso(P385_VOSEO.test('Puedes ver la cobertura sin filtros; elige otra vista o toca ↻.'),
    'DISCRIMINADOR · y no confunde el tuteo neutro («puedes», «elige», «toca») con voseo');
});
