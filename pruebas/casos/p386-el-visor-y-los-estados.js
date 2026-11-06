PRUEBAS.grupo('P386 · el visor del administrador y los estados que se pisan (D4 a D11, H2, H3, H7, «Ver como…»)');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   La investigación de P386 (fuera del repo: `docs/specs/P386/investigacion.md`) reprodujo en la 7.63, por el camino
   real, doce defectos del panel del administrador, con siete raíces:
     · A · «qué se está mirando» se sacaba de fuentes distintas (D4, D8, D9, D11) → `adminLente`;
     · B · el estado de los filtros se rearmaba de cero y el período eran tres campos sueltos (D7, D10) →
       `dashFiltrosDelPanelNuevo`, `dashFechasVivas`, `dashPeriodoAplica`;
     · C · la línea de rango suponía filas con fecha (D6) → `dashContextRango`;
     · D · Jornada no seguía el predicado de alcance (D5) → `jorAlcance`;
     · E · textos que afirmaban lo que la vista no sabe (H3, la ⓘ de H2) → `sinNombres`, `hlp_idc_filtro`;
     · F · la respuesta de un período escribía sobre un panel cerrado (H7) → `cicloPedidosInvalidar` y `DASH !== mio`;
     · G · `closePortal` escondía el aviso de «Ver como…» → el orden de `simEntrar`.

   Cada caso entra por donde entra la persona (R17): la entrada real del administrador, los `onchange` de los selectores,
   los chips de período, `#dashDesde`, las filas del mapa de calor, `#visorVolver`, `silvaAtras`, la ✕ y los botones de
   «Ver como…». El servidor es el `.gs` real en el emulador (`p385Banco`/`p387Banco`). Cada uno dice qué función concede
   lo que afirma (R19), tiene su CONTROL (donde el arreglo no tiene que cambiar nada) y su DISCRIMINADOR: el código de la
   7.63 vuelto a poner EN MEMORIA, que lo tiene que poner en rojo. El discriminador se arma con `p386Sabotear`, que lanza
   si el reemplazo no aparece exactamente una vez: un sabotaje que no aplica no puede pasar por una medición (memoria «el
   discriminador que mide su propio no-op»).

   AYUDANTES DE OTROS ARCHIVOS (por eso este va después de `p385` y `p387` en `casos.json`, y en `soloConGs`): de
   `p385-pantallas-con-filtro.js`, `p385Correr`, `p385EntrarAdmin`, `p385Visor`, `p385Trabajar`, `p385Filtrar`,
   `p385Hasta`, `p385SinEsqueleto`, `p385MovListo`, `p385Mov`, `p385Txt`, `p385Dia` y `p385Hojas`; de
   `p387-empresa-demo.js`, `p387Correr`, `p387AdmEntrar` y `p387Boton`. Son funciones declaradas: se ven desde acá (sus
   `const`, no).

   ⚠️ EL REPO ES PÚBLICO: las contraseñas del `Accesos` emulado son las de relleno de esos dos archivos.
   ⚠️ R18 · lo que un caso cambia (los sabotajes, la red, `showToast`, `p385Hojas`) vuelve en el `.finally()` de la
   PROMESA del caso (`p386Correr`), y se espera con CONDICIONES (`p385Hasta`), nunca con un número de milisegundos.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* ── Los sabotajes y su vuelta ────────────────────────────────────────────────────────────────── */
const P386_CAMBIOS = [];
function p386Cambiar(nombre, nueva) {
  if (typeof window[nombre] !== 'function') throw new Error('p386: no existe la función ' + nombre);
  P386_CAMBIOS.push([nombre, window[nombre]]);
  window[nombre] = nueva;
}
/* La fuente de la función con reemplazos EXACTOS, vuelta a declarar con un `eval` indirecto (queda global, como la de la
   app). Lanza si un reemplazo no aparece una sola vez, o si la función no cambió. */
function p386Sabotear(nombre, pares) {
  const orig = window[nombre];
  if (typeof orig !== 'function') throw new Error('p386: no existe la función ' + nombre);
  let src = orig.toString();
  pares.forEach(par => {
    const n = src.split(par[0]).length - 1;
    if (n !== 1) throw new Error('p386: el sabotaje de ' + nombre + ' no aplica: «' + par[0].slice(0, 80) + '» aparece ' + n + ' veces');
    src = src.replace(par[0], () => par[1]);
  });
  P386_CAMBIOS.push([nombre, orig]);
  (0, eval)(src);
  if (window[nombre] === orig) throw new Error('p386: el sabotaje de ' + nombre + ' no reemplazó la función');
}
function p386Volver() {
  while (P386_CAMBIOS.length) { const c = P386_CAMBIOS.pop(); window[c[0]] = c[1]; }
}
/* `p385Correr`/`p387Correr` con los sabotajes devueltos ANTES de su limpieza (que así corre con el código de verdad), y
   otra vez después, por si el caso no llegó a empezar. */
function p386Correr(fn, opc) {
  return p385Correr(B => Promise.resolve().then(() => fn(B)).finally(p386Volver), opc).finally(p386Volver);
}
function p386Correr387(fn, opc) {
  return p387Correr(B => Promise.resolve().then(() => fn(B)).finally(p386Volver), opc).finally(p386Volver);
}
/* El CH emulado de P385 con algo más (`mod` recibe las hojas y las devuelve). Se instala ANTES de `p386Correr`, que arma
   el banco con `p385Hojas`, y vuelve con el resto de los cambios. */
function p386Hojas(mod) {
  const orig = window.p385Hojas;
  p386Cambiar('p385Hojas', function (o) { return mod(orig(o)); });
}

/* ── Lo que se mira ───────────────────────────────────────────────────────────────────────────── */
function p386$(id) { return document.getElementById(id); }
function p386Visible(el) { return !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0; }
function p386Flecha() { const b = p386$('portalBackBtn'); return !!b && getComputedStyle(b).display !== 'none'; }
function p386Empresas() { return Array.from(new Set((DASH.registros || []).map(r => r.empresa).filter(Boolean))).sort(); }
function p386Pedidos(B, desde) { return B.pedidos.slice(desde).filter(p => p.action === 'supervisor'); }
function p386SinCredencial(p) { const q = Object.assign({}, p); delete q.pass; delete q.dispositivoId; return q; }
/* Un panel nuevo, ya pintado. */
function p386Panel(antes) { return p385Hasta(() => !!DASH && DASH !== antes && p385SinEsqueleto()); }
/* «Todas las empresas · Servicio médico»: el administrador de siempre. */
function p386EnCasa() { return !!DASH && !DASH.visor && DASH.rol === 'admin' && !(DASH.f && DASH.f.emp) && DASH.vista === 'medico'; }
/* Cambia SÓLO la vista del visor, por su `onchange` (D4). */
async function p386SoloVista(vista) {
  const v = p386$('visorVista');
  if (!v) return false;
  v.value = vista;
  if (v.value !== vista) return false;
  const antes = DASH;
  v.dispatchEvent(new Event('change'));
  return p386Panel(antes);
}
/* «← Todas las empresas», por el botón de la línea plegada. */
async function p386BotonTodas() {
  const b = p386$('visorVolver');
  if (!p386Visible(b)) return false;
  const antes = DASH;
  b.click();
  return p385Hasta(() => DASH !== antes && p386EnCasa() && p385SinEsqueleto());
}
/* Un chip de período de verdad (`#dashFilters .pchip`, su `onclick` es `dashSetPeriod`). */
function p386Chip(p) { return document.querySelector('#dashFilters .pchip[onclick*="dashSetPeriod(\'' + p + '\')"]'); }
function p386Periodo(p) { const b = p386Chip(p); if (!b) return false; b.click(); return !!DASH && DASH.f.period === p; }
/* Un campo de fecha de «Personalizado», por su `onchange` (`dashFilterChange`). */
function p386Fecha(id, valor) { const c = p386$(id); if (!c) return false; c.value = valor; c.dispatchEvent(new Event('change')); return true; }
/* «Atrás» del teléfono: el manejador real (`silvaAtras`). Si cerró el panel, la entrada que el botón físico habría sacado
   se descarta como lo hace la ✕ (`navConsumir`): llamar al manejador directo no la saca, y una huérfana desvía el «atrás»
   del caso que sigue (R18). */
async function p386Atras() {
  const consumio = silvaAtras();
  const cerro = !DASH && !p386$('portalOverlay').classList.contains('show');
  if (cerro) { try { navConsumir(); } catch (e) {} await PRUEBAS.historialQuieto(90, 1500); }
  return { consumio: consumio, cerro: cerro };
}
/* Jornada, leída del DOM: las personas de «Por persona» y del «Detalle», los tres totales y las líneas nuevas. */
function p386Jornada() {
  const s = p386$('dsec-jornada');
  if (!s) return null;
  const tablas = s.querySelectorAll('.jor-tabla');
  const col = (tabla, i) => tabla ? [...tabla.querySelectorAll('tbody tr')].map(tr => p385Txt(tr.cells[i])) : [];
  return { porPersona: col(tablas[0], 0), detalle: col(tablas[1], 1),
           kpis: [...s.querySelectorAll('.jor-kpi .jk-n')].map(x => p385Txt(x)),
           rotulo: p385Txt(s.querySelector('.jor-total-alc')), vacio: p385Txt(s.querySelector('.jor-filtro-vacio')),
           titulos: [...s.querySelectorAll('.jor-h4')].map(x => p385Txt(x)) };
}
/* Las personas de Ciclo con el filtro puesto, del lector real (`cicloArmar`, que filtra con `dashEnAlcanceDe`). */
function p386Ciclo() { return Object.keys(cicloArmar()); }
/* El texto de una clave que tiene HTML, como queda en pantalla. */
function p386Texto(clave, vars) { const d = document.createElement('div'); d.innerHTML = t(clave, vars); return p385Txt(d); }
function p386AyudaIdc() { const b = document.querySelector('#dsec-idc details.dash-help .dh-body'); return b ? p385Txt(b) : null; }
/* Los rechazos sin atrapar, con un CENTINELA para saber cuándo el navegador ya informó todo lo anterior: los rechazos
   se informan en el orden en que ocurrieron, así que cuando llega el del centinela —creado después—, el que tuviera que
   llegar ya llegó. Es una condición, no un tiempo. */
function p386OirRechazos() {
  const lista = [];
  const oir = e => { lista.push(String((e && e.reason && (e.reason.message || e.reason)) || '')); try { e.preventDefault(); } catch (x) {} };
  window.addEventListener('unhandledrejection', oir);
  return {
    lista: lista,
    fin: () => window.removeEventListener('unhandledrejection', oir),
    alDia: async tope => {
      const marca = 'p386-centinela-' + Date.now() + '-' + Math.random();
      Promise.reject(new Error(marca));   // sin atrapar, a propósito: es el centinela
      const ok = await PRUEBAS.esperarA(() => lista.indexOf(marca) >= 0, tope || 3000);
      const i = lista.indexOf(marca); if (i >= 0) lista.splice(i, 1);
      return ok;
    }
  };
}

/* ═════ P386-1 · D4 · cambiar sólo la VISTA del visor, trabajando sobre una empresa ══════════════════════════════════ */

PRUEBAS.caso('🔴 P386-1 · D4 · trabajando sobre una empresa, cambiar sólo la VISTA del visor la conserva (y desde «Todas», no inventa una)', () => p386Correr(async B => {
  /* R19 · qué empresa marca el selector del visor lo concede `visorPintar` con `adminLente` (la misma derivación que la
     línea plegada); qué se pide lo concede `visorCambiar`, que lee ese selector; y que el panel sea de esa empresa lo
     concede el servidor, que arma el visor de esa cuenta (`accionSupervisor`, `acc.visor`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador por el camino real');
  /* CONTROL · desde «Todas · Servicio médico», cambiar sólo la vista va sin empresa y da «Todas · Supervisor» */
  let n0 = B.pedidos.length;
  PRUEBAS.cierto(await p386SoloVista('supervisor'), 'guarda (control): llegó el panel de «Todas · Supervisor»');
  let ped = p386Pedidos(B, n0).pop() || {};
  PRUEBAS.falso('verEmpresa' in ped || 'empresa' in ped, 'CONTROL · desde «Todas», la vista sola va sin empresa · ' + JSON.stringify(p386SinCredencial(ped)));
  PRUEBAS.alMenos(p386Empresas().length, 2, 'CONTROL · y el panel es de todas las empresas · ' + p386Empresas().join(', '));
  PRUEBAS.cierto(await p386BotonTodas(), 'guarda: «← Todas las empresas» volvió a «Todas · Servicio médico»');
  /* EL CASO */
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.cierto(p385Txt(p386$('visorResumen')).indexOf('Consorcio HELITEC') >= 0, 'guarda: la línea plegada nombra a HELITEC · «' + p385Txt(p386$('visorResumen')) + '»');
  PRUEBAS.igual(p386$('visorEmpresa').value, 'Consorcio HELITEC',
    '🔴 el selector «Empresa» del visor marca la empresa que nombra la línea (en la 7.63 decía «Todas las empresas»)');
  n0 = B.pedidos.length;
  PRUEBAS.cierto(await p386SoloVista('supervisor'), 'guarda: llegó el panel nuevo');
  ped = p386Pedidos(B, n0).pop() || {};
  PRUEBAS.igual([ped.verEmpresa, ped.verVista], ['Consorcio HELITEC', 'supervisor'],
    '🔴 el pedido lleva la empresa que se estaba mirando y la vista elegida · ' + JSON.stringify(p386SinCredencial(ped)));
  const emps = p386Empresas();
  PRUEBAS.cierto(emps.length > 0 && emps.every(e => e === 'Consorcio HELITEC'), '🔴 y todo el panel es de esa empresa · ' + emps.join(', '));
  PRUEBAS.cierto(p385Txt(p386$('visorResumen')).indexOf('Consorcio HELITEC') >= 0, 'la línea plegada la sigue nombrando · «' + p385Txt(p386$('visorResumen')) + '»');
}));

PRUEBAS.caso('⚠️ P386-1 · DISCRIMINADOR · con el selector marcando sólo la empresa del visor (la 7.63), el pedido sale sin empresa', () => p386Correr(async B => {
  p386Sabotear('visorPintar', [["(c.empresa === L.empresa ? ' selected' : '')", "(c.empresa === empAct ? ' selected' : '')"]]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  const n0 = B.pedidos.length;
  PRUEBAS.cierto(await p386SoloVista('supervisor'), 'guarda: llegó el panel nuevo');
  const ped = p386Pedidos(B, n0).pop() || {};
  PRUEBAS.falso(!!ped.verEmpresa, 'DISCRIMINADOR · con la marca de la 7.63 el pedido sale sin empresa: el caso de arriba lo ve · ' + JSON.stringify(p386SinCredencial(ped)));
  PRUEBAS.alMenos(p386Empresas().length, 2, 'DISCRIMINADOR · y el panel pasa a todas las empresas sin avisar');
}));

/* ═════ P386-2 · D5 · Jornada filtra sus FILAS con el predicado y las filas de Ciclo ═════════════════════════════════ */

/* El invariante, no la forma: las personas de las filas de Jornada están en Ciclo con el mismo filtro (R21: el MISMO
   predicado sobre las MISMAS filas), nadie queda fuera del filtro, y los totales siguen siendo los del servidor. */
function p386JornadaSigueAlFiltro(donde, quien) {
  const j = p386Jornada();
  PRUEBAS.cierto(!!j, 'guarda: ' + donde + ' · está Jornada');
  if (!j) return;
  const filas = j.porPersona.concat(j.detalle);
  PRUEBAS.alMenos(filas.length, 1, 'guarda: ' + donde + ' · Jornada lista filas del filtro');
  const ciclo = p386Ciclo();
  PRUEBAS.igual(filas.filter(p => ciclo.indexOf(dashNorm(p)) < 0), [],
    '🔴 ' + donde + ' · las personas de Jornada están en Ciclo con el mismo filtro · Ciclo: ' + ciclo.join(', '));
  PRUEBAS.igual(filas.filter(p => p !== quien), [], '🔴 ' + donde + ' · ninguna fila de alguien fuera del filtro · ' + filas.join(', '));
  PRUEBAS.igual(j.kpis[2], String((DASH.duty.personas || []).length),
    '🔴 ' + donde + ' · «personas con registro» sigue siendo el del servidor: no se recalcula (este número tiene consecuencias laborales)');
}

PRUEBAS.caso('🔴 P386-2 · D5 · con una persona puesta, Jornada lista sólo sus filas, con los totales de la empresa rotulados (Servicio médico y HSEQ)', () => p386Correr(async B => {
  /* R19 · lo concede `jorAlcance`: el conjunto de quienes pasan `dashEnAlcanceDe(o, ALC_TODO)` sobre `DASH.operacional`
     (lo que hace `cicloArmar`), y `renderJornada` lista sólo sus filas. Los totales los manda el servidor (`leerDuty`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  const sin = p386Jornada();
  PRUEBAS.cierto(!!sin && sin.porPersona.indexOf('Ana Suárez') >= 0 && sin.porPersona.indexOf('Luis Ferrer') >= 0,
    'guarda: sin filtro, Jornada tiene a las dos personas de HELITEC · ' + (sin && sin.porPersona.join(', ')));
  PRUEBAS.falso(!!(sin && sin.rotulo), 'CONTROL · sin filtro no está la línea de «toda la empresa»');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'Luis Ferrer'), 'guarda: «Empleado» ofrece a Luis Ferrer');
  p386JornadaSigueAlFiltro('Servicio médico · Luis Ferrer', 'Luis Ferrer');
  const con = p386Jornada();
  PRUEBAS.igual(con.rotulo, t('jor_total_empresa'), '🔴 la línea dice que los totales son de toda la empresa (`jor_total_empresa`)');
  PRUEBAS.cierto(p385Filtrar('dashPer', ''), 'guarda: se quitó el filtro');
  PRUEBAS.falso(!!p386Jornada().rotulo, 'CONTROL · al quitarlo, la línea se va');
  /* el panel de HSEQ, con un seudónimo */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» ofrece P1');
  p386JornadaSigueAlFiltro('HSEQ · P1', 'P1');
  PRUEBAS.igual(p386Jornada().rotulo, t('jor_total_empresa'), '🔴 HSEQ · la misma línea');
}));

PRUEBAS.caso('🔴 P386-2 · D5 · en «Todas» con un nivel de riesgo, las filas de esas personas y los totales rotulados «de todas las empresas»', () => p386Correr(async B => {
  /* R19 · `jorAlcance` (clave persona Y empresa) y `adminLente` (sin empresa: «todas las empresas»). El nivel lo resuelve
     `nivelRiesgoDe` con la tabla que manda `niveles_riesgo` (HELITEC/Operaciones = 4). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador («Todas · Servicio médico»)');
  PRUEBAS.cierto(await p385Hasta(() => !!p386$('dashNivel')), 'guarda: llegaron los niveles y está el filtro de nivel');
  PRUEBAS.cierto(p385Filtrar('dashNivel', '4'), 'guarda: Nivel = 4');
  p386JornadaSigueAlFiltro('Todas · Nivel 4', 'Ana Suárez');
  PRUEBAS.igual(p386Jornada().rotulo, t('jor_total_todas'), '🔴 la línea dice «de todas las empresas» (`jor_total_todas`)');
}));

PRUEBAS.caso('⚠️ P386-2 · DISCRIMINADORES · sin `jorAlcance` vuelve Ana; y filtrar `duty` directo (sin `cargo`) deja afuera a quien Ciclo tiene', () => {
  /* El segundo es el porqué del diseño (R21): las filas de `duty` no traen `cargo` (`leerDuty`). Con una regla de nivel POR
     CARGO (Mecánico = 5), Ciclo —que filtra las filas de `Operacional`, con cargo— tiene a Luis, y un filtro directo sobre
     `duty` lo deja afuera: las dos pestañas del mismo dato dirían cosas distintas. */
  p386Hojas(h => { h['Niveles Riesgo'] = h['Niveles Riesgo'].concat([['Consorcio HELITEC', '', 'Mecánico', '', '5']]); return h; });
  return p386Correr(async B => {
    PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
    PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
    /* 1 · sin `jorAlcance` */
    const real = window.jorAlcance;
    p386Cambiar('jorAlcance', () => null);
    PRUEBAS.cierto(p385Filtrar('dashPer', 'Luis Ferrer'), 'guarda: «Empleado» = Luis Ferrer');
    PRUEBAS.cierto(p386Jornada().porPersona.indexOf('Ana Suárez') >= 0, 'DISCRIMINADOR · sin `jorAlcance`, Jornada vuelve a listar a Ana con Luis puesto (la 7.63)');
    window.jorAlcance = real;
    PRUEBAS.cierto(p385Filtrar('dashPer', ''), 'guarda: se quitó la persona');
    /* 2 · nivel por cargo */
    PRUEBAS.cierto(await p385Hasta(() => !!p386$('dashNivel')), 'guarda: llegaron los niveles');
    PRUEBAS.cierto(p385Filtrar('dashNivel', '5'), 'guarda: Nivel = 5');
    PRUEBAS.cierto(p386Ciclo().indexOf(dashNorm('Luis Ferrer')) >= 0, 'guarda: Ciclo tiene a Luis en el nivel 5 (por su cargo, que viaja en `Operacional`)');
    PRUEBAS.cierto(p386Jornada().porPersona.indexOf('Luis Ferrer') >= 0, '🔴 y Jornada también: el mismo predicado sobre las mismas filas');
    p386Cambiar('jorAlcance', () => ({ tiene: x => String(nivelRiesgoDe(x.persona, x.departamento, x.empresa, x.cargo)) === String(DASH.f.nivel) }));
    renderDash();
    PRUEBAS.falso(p386Jornada().porPersona.indexOf('Luis Ferrer') >= 0,
      'DISCRIMINADOR · filtrando `duty` directo (sin cargo), Luis queda afuera de Jornada aunque Ciclo lo tenga');
  });
});

/* ═════ P386-3 · D6 · la línea de rango no se contradice ═════════════════════════════════════════════════════════════ */

function p386Rango() { return p385Txt(p386$('dashRango')); }
function p386RangoContradice(txt) { return txt.indexOf(t('rng_sin_reg')) >= 0 && /\d+\s+\S/.test(txt.split(t('rng_sin_reg')).pop()); }

PRUEBAS.caso('🔴 P386-3 · D6 · en Dirección la línea es sólo el chip del período (sus filas no traen fecha); en Supervisor no hay línea ni período en el rótulo', () => p386Correr(async () => {
  /* R19 · la línea la concede `dashContextRango` y el rótulo `dfmUpdateLabel`, los dos con `dashPeriodoAplica` (P232: en
     Supervisor no hay período). Que las filas de Dirección y Supervisor no traen fecha lo decide el servidor
     (`armarAptitudServer` → `registrosSeguro`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  /* CONTROL · «Todas · Servicio médico»: tests con fecha, «Viendo … · N registros» con N el de la pantalla */
  const n = dashFiltered().length;
  PRUEBAS.alMenos(n, 1, 'guarda (control): hay registros con fecha');
  const r0 = p386Rango();
  PRUEBAS.cierto(r0.indexOf(n + ' ' + t(n === 1 ? 'n_registro' : 'n_registros')) >= 0 && r0.indexOf(t('rng_sin_reg')) < 0,
    'CONTROL · Servicio médico sigue con «Viendo … · ' + n + ' registros» · «' + r0 + '»');
  /* Dirección, en cada período que ofrecen sus chips */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(DASH.registros.length > 0 && !DASH.registros.some(r => r && r.fecha), 'guarda: las filas de Dirección no traen fecha (una por persona)');
  const periodos = DASH_PERIOD_KEYS.filter(p => !!p386Chip(p));
  PRUEBAS.alMenos(periodos.length, 5, 'guarda: Dirección ofrece sus chips de período · ' + periodos.join(','));
  const malos = [];
  periodos.forEach(p => {
    p386Periodo(p);
    const r = p386Rango();
    if (r !== periodoLabel(p) || p386RangoContradice(r)) malos.push(p + ' → «' + r + '»');
  });
  PRUEBAS.igual(malos, [], '🔴 en Dirección la línea es sólo el chip del período: ni «sin registros en este período», ni «N registros» que no son de un período');
  /* Supervisor */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.igual(p386$('dashRango').innerHTML, '', '🔴 Supervisor · sin línea de rango (no tiene período)');
  PRUEBAS.igual(getComputedStyle(p386$('dashRango')).display, 'none', 'Supervisor · y la caja vacía no deja su hueco (`.dash-rango:empty`)');
  const lbl = p385Txt(p386$('dfmToggleLabel'));
  PRUEBAS.igual(DASH_PERIOD_KEYS.filter(p => lbl.indexOf(periodoLabel(p)) >= 0), [], '🔴 Supervisor · el rótulo del menú no nombra un período · «' + lbl + '»');
  PRUEBAS.igual(lbl, tabLabel(_dashActiveTab || DASH.tab), 'Supervisor · el rótulo es la pestaña');
}));

PRUEBAS.caso('⚠️ P386-3 · DISCRIMINADOR · sin las dos ramas nuevas de `dashContextRango` (la 7.63), Dirección dice «sin registros · N registros»', () => p386Correr(async () => {
  p386Sabotear('dashContextRango', [
    ["if (!dashPeriodoAplica()) return '';", ''],
    ["if (regs.length && !regs.some(r => r && r.fecha)) return '<span class=\"ctx-chip ctx-period\">' + perLabel + '</span>';", '']]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p386RangoContradice(p386Rango()), 'DISCRIMINADOR · Dirección vuelve a contradecirse · «' + p386Rango() + '»');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.cierto(p386Rango().length > 0, 'DISCRIMINADOR · y Supervisor vuelve a tener línea · «' + p386Rango() + '»');
}));

/* ═════ P386-4 · D7 · las fechas de «Personalizado» no quedan vivas ══════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P386-4 · D7 · «Personalizado» con una fecha → «Mes»: sin fechas vivas, sin ←, y «atrás» no se gasta en nada', () => p386Correr(async () => {
  /* R19 · lo conceden `dashSetPeriod` (suelta las fechas al dejar «Personalizado») y `dashHayFiltro`/`dashClearOne`, que
     las cuentan sólo como período vigente (`dashFechasVivas`). La ← la pinta `dashUpdateBackBtn` con `dashHayFiltro`. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador, sin perfil en el dispositivo');
  PRUEBAS.falso(p386Flecha(), 'guarda: sin nada puesto, el administrador sin perfil no tiene ←');
  PRUEBAS.cierto(p386Periodo('custom'), 'guarda: el chip «Personalizado»');
  PRUEBAS.cierto(p386Fecha('dashDesde', p385Dia(30)), 'guarda: está «Desde»');
  /* CONTROL · con «Personalizado» y una fecha sí hay algo que deshacer */
  PRUEBAS.igual(DASH.f.desde, p385Dia(30), 'guarda: la fecha quedó puesta');
  PRUEBAS.cierto(dashHayFiltro(), 'CONTROL · con «Personalizado» y una fecha hay un filtro que deshacer');
  PRUEBAS.cierto(p386Flecha(), 'CONTROL · y la ← aparece');
  PRUEBAS.cierto(p386Periodo('mes'), 'guarda: el chip «Mes»');
  PRUEBAS.igual([DASH.f.desde, DASH.f.hasta], ['', ''], '🔴 al dejar «Personalizado» sus fechas se sueltan (el escritor, `dashSetPeriod`)');
  PRUEBAS.falso(dashHayFiltro(), '🔴 con «Mes» no queda ningún filtro que deshacer');
  PRUEBAS.falso(p386Flecha(), '🔴 y la ← no aparece');
  const a = await p386Atras();
  PRUEBAS.cierto(a.cerro, '🔴 el primer «atrás» hace lo que haría sin nada puesto: cierra el panel (no se gasta en una fecha escondida)');
}));

PRUEBAS.caso('🔴 P386-4 · D7 · las fechas de un «Personalizado» que viajó a Supervisor no son un filtro: «atrás» no se gasta en ellas', () => p386Correr(async () => {
  /* La otra mitad (los LECTORES). Desde D10 el período elegido viaja, y en Supervisor no se aplica (`dashPeriodoAplica`):
     `DASH.f` guarda las fechas para cuando se salga, pero no filtran nada, así que no pueden ser «algo que deshacer».
     R19 · `dashFechasVivas`, que usan `dashHayFiltro` y `dashClearOne`. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p386Periodo('custom') && p386Fecha('dashDesde', p385Dia(20)), 'guarda: «Personalizado» desde hace 20 días');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.igual([DASH.f.period, DASH.f.desde], ['custom', p385Dia(20)], 'guarda: el período viajó con su fecha (D10)');
  PRUEBAS.falso(!!p386$('dashDesde'), '🔴 Supervisor no pinta las fechas: no filtrarían nada');
  PRUEBAS.falso(dashHayFiltro(), '🔴 y no cuentan como filtro');
  const antes = DASH;
  const a = await p386Atras();
  PRUEBAS.cierto(a.consumio && await p385Hasta(() => DASH !== antes && p386EnCasa() && p385SinEsqueleto()),
    '🔴 «atrás» vuelve a «Todas · Servicio médico» (D9), no se gasta en las fechas');
}));

PRUEBAS.caso('⚠️ P386-4 · DISCRIMINADORES · sin el escritor quedan las fechas; sin los lectores, «atrás» se gasta en Supervisor', () => p386Correr(async () => {
  p386Sabotear('dashSetPeriod', [["if (p !== 'custom'){ DASH.f.desde = ''; DASH.f.hasta = ''; }", '']]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(p386Periodo('custom') && p386Fecha('dashDesde', p385Dia(30)) && p386Periodo('mes'), 'guarda: «Personalizado», una fecha y «Mes»');
  PRUEBAS.igual(DASH.f.desde, p385Dia(30), 'DISCRIMINADOR · sin la limpieza del escritor, la fecha queda viva con «Mes» (el primer caso lo ve)');
  p386Volver();
  p386Sabotear('dashHayFiltro', [['return dashFechasVivas();', 'return !!(DASH.f.desde || DASH.f.hasta);']]);
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p386Periodo('custom') && p386Fecha('dashDesde', p385Dia(20)), 'guarda: «Personalizado» con fecha');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  const antes = DASH;
  const a = await p386Atras();
  PRUEBAS.cierto(a.consumio && DASH === antes, 'DISCRIMINADOR · contando las fechas siempre (la 7.63), «atrás» se gasta en Supervisor sin cambiar de panel');
}));

/* ═════ P386-5 · D8 · la fila del mapa de calor de una empresa sin cuenta ════════════════════════════════════════════ */

function p386FilaHeat(nombre) {
  return [...document.querySelectorAll('#dsec-comparar .heat-row')].find(tr => p385Txt(tr.querySelector('.hname')).replace(/\s*›$/, '') === nombre) || null;
}

PRUEBAS.caso('🔴 P386-5 · D8 · la fila de una empresa sin cuenta no promete «›», avisa y no recarga «Todas»; la de una con cuenta, entra', () => p386Correr(async B => {
  /* R19 · lo concede `dashEmpresaTieneCuenta` contra `DASH.cuentas` —la lista del selector, que arma `cuentasPanel_` en el
     servidor—, que usan `dashDrill` (si pide o avisa) y `renderComparar` (si la fila lleva «›»). Transporte Andino tiene
     tests y no tiene fila en `Accesos` (el CH de `p385Hojas`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador («Todas · Servicio médico»)');
  PRUEBAS.igual((DASH.cuentas || []).map(c => c.empresa).indexOf('Transporte Andino'), -1, 'guarda: Transporte Andino no tiene cuenta');
  const andino = p386FilaHeat('Transporte Andino'), helitec = p386FilaHeat('Consorcio HELITEC');
  PRUEBAS.cierto(!!andino && !!helitec, 'guarda: el mapa de calor por empresa tiene las dos filas');
  if (!andino || !helitec) return;
  PRUEBAS.falso(/›\s*$/.test(p385Txt(andino.querySelector('.hname'))), '🔴 la fila sin cuenta no promete entrar («›»)');
  PRUEBAS.cierto(/›\s*$/.test(p385Txt(helitec.querySelector('.hname'))), 'CONTROL · la de HELITEC sí');
  const n0 = B.pedidos.length, t0 = B.toasts.length, antes = DASH;
  andino.click();
  await p385Hasta(() => B.toasts.length > t0);
  PRUEBAS.igual(p386Pedidos(B, n0).length, 0, '🔴 no sale ningún pedido (en la 7.63 salía uno sin empresa: «volver a Todas»)');
  PRUEBAS.igual(B.toasts.slice(t0), [t('ts_visor_empresa_no')], '🔴 y avisa por qué, con el texto que ya existía para lo mismo');
  PRUEBAS.cierto(DASH === antes && !DASH.f.emp, 'y el panel sigue siendo el mismo, en «Todas»');
  /* CONTROL · la fila de una empresa con cuenta entra */
  const n1 = B.pedidos.length;
  p386FilaHeat('Consorcio HELITEC').click();
  PRUEBAS.cierto(await p386Panel(antes), 'guarda (control): llegó el panel de HELITEC');
  PRUEBAS.igual([(p386Pedidos(B, n1).pop() || {}).empresa, DASH.f.emp], ['Consorcio HELITEC', 'Consorcio HELITEC'], 'CONTROL · la fila de HELITEC trabaja sobre HELITEC');
}));

PRUEBAS.caso('⚠️ P386-5 · DISCRIMINADOR · sin la validación (la 7.63), tocar la fila sin cuenta pide «Todas» sin avisar', () => p386Correr(async B => {
  p386Cambiar('dashEmpresaTieneCuenta', () => true);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  const andino = p386FilaHeat('Transporte Andino');
  PRUEBAS.cierto(!!andino, 'guarda: está la fila');
  if (!andino) return;
  const n0 = B.pedidos.length, t0 = B.toasts.length, antes = DASH;
  andino.click();
  PRUEBAS.cierto(await p386Panel(antes), 'guarda: recargó');
  const ped = p386Pedidos(B, n0).pop() || {};
  PRUEBAS.falso('empresa' in ped, 'DISCRIMINADOR · el pedido sale sin empresa · ' + JSON.stringify(p386SinCredencial(ped)));
  PRUEBAS.igual(B.toasts.slice(t0).indexOf(t('ts_visor_empresa_no')), -1, 'DISCRIMINADOR · y sin el aviso');
}));

/* ═════ P386-6 · D9 · «atrás» en el visor primero vuelve a «Todas · Servicio médico» ═════════════════════════════════ */

PRUEBAS.caso('🔴 P386-6 · D9 · visor «HELITEC · Supervisor» con un departamento: «atrás» suelta el departamento, vuelve a «Todas» y recién ahí cierra', () => p386Correr(async () => {
  /* R19 · lo conceden `dashAtras` (filtros primero, después la lente) y `adminLente` (qué es «Todas · Servicio médico»);
     la ← la pinta `dashUpdateBackBtn` con la misma lente. El administrador entra sin perfil en el dispositivo
     (`p385Correr` limpia `localStorage`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.cierto(p386Flecha(), '🔴 en el visor, el administrador sin perfil tiene ← (en la 7.63 no aparecía)');
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Operaciones'), 'guarda: Departamento = Operaciones');
  const visor = DASH;
  let a = await p386Atras();
  PRUEBAS.cierto(a.consumio && DASH === visor && !DASH.f.dep && !!DASH.visor && DASH.visor.empresa === 'Consorcio HELITEC',
    '🔴 el primer «atrás» suelta el departamento y deja el visor');
  a = await p386Atras();
  PRUEBAS.cierto(a.consumio && await p385Hasta(() => DASH !== visor && p386EnCasa() && p385SinEsqueleto()),
    '🔴 el segundo vuelve a «Todas las empresas · Servicio médico» (en la 7.63 cerraba el panel)');
  PRUEBAS.falso(p386Flecha(), 'en «Todas · Servicio médico» y sin nada puesto, el administrador sin perfil ya no tiene ←');
  /* CONTROL · en «Todas · Servicio médico» sin nada puesto, «atrás» cierra */
  a = await p386Atras();
  PRUEBAS.cierto(a.cerro, 'CONTROL · el tercero cierra el panel, como siempre');
}));

PRUEBAS.caso('🔴 P386-6 · D9 · en el panel de HSEQ la ← del visor vive adentro del ☰, con la misma regla', () => p386Correr(async () => {
  /* La investigación no lo midió (§5). R19 · `dashUpdateBackBtn`: en el panel de HSEQ la ← va en `#dfmVolverBtn` (P309). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
  PRUEBAS.igual([p386$('dfmVolverBtn').hidden, p386Flecha()], [false, false], '🔴 la ← está adentro del ☰ y no en el header');
  const antes = DASH;
  const a = await p386Atras();
  PRUEBAS.cierto(a.consumio && await p385Hasta(() => DASH !== antes && p386EnCasa() && p385SinEsqueleto()), 'y «atrás» vuelve a «Todas · Servicio médico»');
}));

PRUEBAS.caso('⚠️ P386-6 · DISCRIMINADOR · sin el paso de la lente en `dashAtras` (la 7.63), «atrás» en el visor cierra el panel', () => p386Correr(async () => {
  p386Sabotear('dashAtras', [['if (L && !L.enCasa && !fallo){ visorVolverTodas(); return true; }', '']]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  const a = await p386Atras();
  PRUEBAS.cierto(a.cerro, 'DISCRIMINADOR · «atrás» cierra el panel entero: el caso de arriba lo ve');
}));

/* ═════ P386-7 · D10 · el período elegido sobrevive al panel nuevo ═══════════════════════════════════════════════════ */

function p386SinAlcance() { return ['dep', 'per', 'nivel', 'op'].filter(k => !!(DASH.f && DASH.f[k])); }

PRUEBAS.caso('🔴 P386-7 · D10 · el período elegido sobrevive a las dos puertas (con sus fechas si es «Personalizado») y lo demás se limpia', () => p386Correr(async () => {
  /* R19 · qué sobrevive lo concede `dashFiltrosDelPanelNuevo` (el período sólo si la persona lo tocó, la marca `periodoElegido`
     de `dashSetPeriod`: P393); lo aplica el quinto parámetro de `onDashData` (`fInicial`), que le pasan las dos
     puertas: `dashEmpresaAdminCambiar` («Trabajar sobre») y `visorCambiar` (el visor). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  /* puerta 1 · «Trabajar sobre» */
  PRUEBAS.cierto(await p385Trabajar('Aeroambulancias Silva'), 'guarda: «Trabajar sobre» = Aeroambulancias Silva');
  PRUEBAS.cierto(p386Periodo('mes'), 'guarda: «Mes»');
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Vuelo'), 'guarda: Departamento = Vuelo');
  PRUEBAS.cierto(await p385Hasta(() => !!p386$('dashNivel')) && p385Filtrar('dashNivel', '5'), 'guarda: Nivel = 5');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.igual(DASH.f.period, 'mes', '🔴 «Trabajar sobre» conserva el período elegido (en la 7.63 volvía a «Todo»)');
  PRUEBAS.igual(p386SinAlcance(), [], 'departamento, persona, nivel y operación se limpian (son de la empresa)');
  /* el primer render ya es el final (ya no hay un parche después de `onDashData`): el selector y su nota, de HELITEC */
  PRUEBAS.igual(p386$('dashEmpAdmin').value, 'Consorcio HELITEC', '«Trabajar sobre» marca HELITEC sin el segundo pintado de la 7.63 (P213)');
  PRUEBAS.cierto(p386$('dashEmpAdminNota').textContent.indexOf('Consorcio HELITEC') >= 0, 'y su nota dice que se escribe sobre HELITEC (P213)');
  /* puerta 2 · el visor */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'medico'), 'guarda: visor «Consorcio HELITEC · Servicio médico»');
  PRUEBAS.igual(DASH.f.period, 'mes', '🔴 el visor también lo conserva');
  PRUEBAS.cierto(p386Periodo('trimestre'), 'guarda: «Trimestre»');
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'medico'), 'guarda: visor «Aeroambulancias Silva · Servicio médico»');
  PRUEBAS.igual(DASH.f.period, 'trimestre', '🔴 al cambiar de empresa por el visor');
  /* «Personalizado» viaja con sus fechas, también al cambiar sólo la vista */
  PRUEBAS.cierto(p386Periodo('custom') && p386Fecha('dashDesde', p385Dia(20)), 'guarda: «Personalizado» desde hace 20 días');
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'direccion'), 'guarda: visor «Aeroambulancias Silva · Dirección»');
  PRUEBAS.igual([DASH.f.period, DASH.f.desde, (p386$('dashDesde') || {}).value], ['custom', p385Dia(20), p385Dia(20)],
    '🔴 «Personalizado» viaja con su fecha, y el campo la muestra');
  /* «Mes» elegido entra al panel de HSEQ (era elegido: opción (a) de Franco contra P310) */
  PRUEBAS.cierto(p386Periodo('mes'), 'guarda: «Mes»');
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'hseq'), 'guarda: visor «Aeroambulancias Silva · HSEQ»');
  PRUEBAS.igual([DASH.panel, DASH.f.period], ['hseq', 'mes'], '🔴 un período elegido entra al panel de HSEQ');
}));

PRUEBAS.caso('🔴 P386-7 · D10 · sin tocar el período cada panel abre en el suyo (HSEQ en «Semana», P310); Supervisor lo guarda sin aplicarlo', () => p386Correr(async () => {
  /* R19 · `dashPeriodoPorDefecto` (el de cada panel; HSEQ, `hseqPeriodoDeApertura`: este banco no sella nada, así que no tiene
     ningún total y cae a «Semana») y `dashEffectiveRange` con `dashPeriodoAplica` (en Supervisor el período no filtra: no tiene
     selector, P232). La bandeja de reportes del supervisor la manda el servidor (`reportes`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador («Todo», sin tocar)');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
  PRUEBAS.igual(DASH.f.period, 'semana', 'CONTROL · sin tocar el período, el panel de HSEQ abre en «Semana» (P310)');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.igual(DASH.f.period, 'all', 'CONTROL · y de HSEQ sin tocar, Dirección abre en «Todo»');
  /* Supervisor: guarda el período elegido, no lo aplica */
  PRUEBAS.cierto(p386Periodo('dia'), 'guarda: «Día»');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.igual(DASH.f.period, 'dia', 'guarda: el período viajó');
  PRUEBAS.cierto(await p385Hasta(() => Array.isArray(DASH._reportes)), 'guarda: llegó la bandeja de reportes');
  const hoy = (dashPeriodRange('dia') || {}).desde;
  PRUEBAS.alMenos(DASH._reportes.filter(r => r.creada && dashIsoDeEpoch(r.creada) < hoy).length, 1,
    'guarda: hay reportes de antes de hoy (si no, «Día» no escondería ninguno y esto no mediría nada)');
  PRUEBAS.igual(reportesFiltrados().length, DASH._reportes.length,
    '🔴 en Supervisor el período no esconde reportes de la bandeja: no hay ningún control a la vista para verlos');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.igual(DASH.f.period, 'dia', 'y al salir de Supervisor el período elegido vuelve');
}));

PRUEBAS.caso('⚠️ P386-7 · DISCRIMINADORES · sin `fInicial` en el visor vuelve a «Todo»; sin la guarda de Supervisor, «Día» esconde reportes', () => p386Correr(async () => {
  p386Sabotear('visorCambiar', [['onDashData(d, label, params, d.vista || vis, fIni);', 'onDashData(d, label, params, d.vista || vis);']]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'medico') && p386Periodo('mes'), 'guarda: visor HELITEC con «Mes»');
  PRUEBAS.cierto(await p385Visor('Aeroambulancias Silva', 'medico'), 'guarda: visor Silva');
  PRUEBAS.igual(DASH.f.period, 'all', 'DISCRIMINADOR · sin `fInicial` en una puerta, esa puerta vuelve a «Todo» (el caso de arriba lo ve)');
  p386Volver();
  p386Sabotear('dashEffectiveRange', [["if (!dashPeriodoAplica()) return { desde:'', hasta:'' };", '']]);
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion') && p386Periodo('dia'), 'guarda: Dirección con «Día»');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.cierto(await p385Hasta(() => Array.isArray(DASH._reportes)), 'guarda: llegó la bandeja');
  PRUEBAS.comoMucho(reportesFiltrados().length, DASH._reportes.length - 1, 'DISCRIMINADOR · sin la guarda, «Día» le esconde reportes al supervisor');
}));

/* ═════ P386-8 · D11 · «← Todas las empresas» trabajando sobre una empresa ═══════════════════════════════════════════ */

PRUEBAS.caso('🔴 P386-8 · D11 · trabajando sobre una empresa está «← Todas las empresas», y vuelve al administrador de siempre (con el período)', () => p386Correr(async B => {
  /* R19 · lo concede `visorPintar` con `adminLente().enCasa`; el botón llama a `visorVolverTodas` → `visorCambiar`, que borra
     `empresa`, `verEmpresa` y `verVista` del pedido. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.falso(p386Visible(p386$('visorVolver')), 'CONTROL · en «Todas · Servicio médico» no hace falta: no está');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.cierto(p386Visible(p386$('visorVolver')), '🔴 trabajando sobre HELITEC, «← Todas las empresas» está en la línea que la nombra');
  PRUEBAS.cierto(p386Periodo('mes'), 'guarda: «Mes»');
  const n0 = B.pedidos.length;
  PRUEBAS.cierto(await p386BotonTodas(), '🔴 y lleva a «Todas las empresas · Servicio médico»');
  const ped = p386Pedidos(B, n0).pop() || {};
  PRUEBAS.igual(['empresa', 'verEmpresa', 'verVista'].filter(k => k in ped), [], 'el pedido es el del administrador de siempre · ' + JSON.stringify(p386SinCredencial(ped)));
  PRUEBAS.igual(DASH.f.period, 'mes', 'conservando el período elegido (D10)');
}));

PRUEBAS.caso('⚠️ P386-8 · DISCRIMINADOR · con la regla de la 7.63 (sólo la empresa del visor), trabajando sobre una empresa no está', () => p386Correr(async () => {
  p386Sabotear('visorPintar', [['const enCasa = L.enCasa;', "const enCasa = !empAct && visAct === 'medico';"]]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC'), 'guarda: «Trabajar sobre» = Consorcio HELITEC');
  PRUEBAS.falso(p386Visible(p386$('visorVolver')), 'DISCRIMINADOR · «← Todas las empresas» no está: el caso de arriba lo ve');
}));

/* ═════ P386-9 · H3 · Dirección con un seudónimo ═════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P386-9 · H3 · Dirección con «Empleado = P1» no dice «No hay movimientos de P1»: dice que la actividad no se separa por persona', () => p386Correr(async B => {
  /* R19 · lo concede `movCargar` leyendo el `sinNombres` que pone `accionActividad` (`acc.vista === "hseq"` sin ser el
     administrador maestro); `movBloque` elige el vacío con eso. Privacidad: sólo cambia un texto, no se muestra nada. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(await p385MovListo(movAlcanceTexto()), 'guarda: llegó la actividad');
  const p1 = (DASH.registros || []).find(r => r.persona === 'P1');
  PRUEBAS.cierto(!!p1 && !!p1.departamento, 'guarda: P1 existe y tiene departamento');
  if (!p1) return;
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» = P1');
  PRUEBAS.cierto(await p385MovListo('P1'), 'guarda: la actividad se volvió a pedir con el filtro');
  const u = B.ultima('actividad') || { resp: {} };
  PRUEBAS.igual(u.resp.sinNombres, true, 'guarda: el servidor dijo que mandó la actividad sin nombres');
  PRUEBAS.alMenos((u.resp.items || []).filter(i => i.dep === p1.departamento).length, 1, 'guarda: en la ventana HAY movimientos del departamento de P1');
  const m = p385Mov();
  PRUEBAS.falso(m.todo.indexOf(t('mov_vacio_per', { p: 'P1' })) >= 0, '🔴 no afirma «No hay movimientos de P1»: no los puede atribuir, que no es lo mismo');
  PRUEBAS.cierto(m.todo.indexOf(t('mov_sin_atribuir_per')) >= 0, '🔴 dice por qué está vacía y dónde mirar (`mov_sin_atribuir_per`)');
  /* CONTROL 1 · con el departamento de P1, la lista los muestra */
  PRUEBAS.cierto(p385Filtrar('dashPer', '') && p385Filtrar('dashDep', p1.departamento), 'guarda: Departamento = el de P1');
  PRUEBAS.cierto(await p385MovListo(p1.departamento), 'guarda: la actividad del departamento');
  PRUEBAS.alMenos(p385Mov().filas, 1, 'CONTROL · con un departamento, sí se listan');
  /* Verificador de P386, H5 · con el departamento ya puesto y P1 encima se lee el mismo texto: no puede mandar a elegir un
     departamento que ya está elegido. */
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: además del departamento, «Empleado» = P1');
  PRUEBAS.cierto(await p385MovListo('P1'), 'guarda: la actividad, con los dos filtros');
  PRUEBAS.cierto(p385Mov().todo.indexOf(t('mov_sin_atribuir_per')) >= 0, '🔴 con departamento y P1 dice lo mismo que sólo con P1');
  PRUEBAS.falso(/departamento/i.test(t('mov_sin_atribuir_per')), '🔴 el texto no manda a elegir un departamento · «' + t('mov_sin_atribuir_per') + '»');
  PRUEBAS.cierto(/departamento/i.test('En este panel la actividad no se separa por persona: con un departamento elegido, sí.'), 'DISCRIMINADOR · ese detector ve el texto anterior');
  /* CONTROL 2 · Supervisor (con nombres), con alguien sin movimientos: el vacío de siempre */
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'supervisor'), 'guarda: visor «Consorcio HELITEC · Supervisor»');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'Carla Díaz'), 'guarda: «Empleado» = Carla Díaz (sólo en la nómina, sin movimientos)');
  PRUEBAS.cierto(await p385MovListo('Carla Díaz'), 'guarda: la actividad');
  PRUEBAS.igual((B.ultima('actividad') || { resp: {} }).resp.sinNombres, false, 'guarda: al supervisor le llegan los nombres');
  PRUEBAS.cierto(p385Mov().todo.indexOf(t('mov_vacio_per', { p: 'Carla Díaz' })) >= 0, 'CONTROL · con nombres, el vacío por persona sigue siendo el de siempre');
}));

PRUEBAS.caso('🔴 P386-9 · H3 · en la demostración, Dirección ve la actividad como la del servidor: sin seudónimos ni horas por persona', () => p386Correr387(async B => {
  /* La investigación lo midió: la demo armaba la actividad de Dirección desde sus registros (seudónimo y fecha) y con
     «Empleado = P1» decía «Último movimiento: ayer · P1». El servidor real nunca le manda eso a Dirección. R19 · lo concede
     la rama demo de `movCargar`, con la regla de `accionActividad` (`sinNombres` para la vista `hseq`). Son datos
     ficticios: el arreglo sólo restringe lo que muestra la demo. */
  PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: Más → «Ver como administrador» → contraseña (la de relleno de p387)');
  const b = p387Boton('hseq');
  PRUEBAS.cierto(!!b, 'guarda: está el botón «Dirección»');
  if (!b) return;
  b.click();
  PRUEBAS.cierto(await p385Hasta(() => !!DASH && DASH.demoMode && DASH.vista === 'hseq' && p385SinEsqueleto()), 'guarda: abrió la demo como Dirección');
  PRUEBAS.cierto(await p385Hasta(() => !!MOV && MOV.estado === 'listo'), 'guarda: la actividad de la demo está lista');
  PRUEBAS.alMenos((MOV.items || []).length, 1, 'guarda: la demo tiene movimientos para Dirección');
  PRUEBAS.igual((MOV.items || []).filter(i => i.persona).length, 0, '🔴 ningún movimiento trae persona (el servidor manda `persona: ""` a Dirección)');
  PRUEBAS.igual(MOV.sinNombres, true, '🔴 y queda dicho que vino sin nombres, como lo dice el servidor');
  const per = [...((p386$('dashPer') || {}).options || [])].map(o => o.value).filter(Boolean)[0];
  PRUEBAS.cierto(!!per && /^P\d+$/.test(per), 'guarda: «Empleado» ofrece un seudónimo · ' + per);
  PRUEBAS.cierto(p385Filtrar('dashPer', per), 'guarda: «Empleado» = ' + per);
  PRUEBAS.cierto(await p385Hasta(() => MOV.estado === 'listo' && String(MOV.alcanceVisto || '').indexOf(per + '|') === 0), 'guarda: la actividad con el filtro');
  const m = p385Mov();
  PRUEBAS.cierto(m.todo.indexOf(t('mov_sin_atribuir_per')) >= 0 && m.filas === 0, '🔴 con ' + per + ' dice lo mismo que el panel real · «' + m.todo.slice(0, 160) + '»');
}));

PRUEBAS.caso('⚠️ P386-9 · DISCRIMINADOR · sin leer `sinNombres` (la 7.63) vuelve «No hay movimientos de P1»', () => p386Correr(async () => {
  p386Sabotear('movCargar', [['A.sinNombres = !!d.sinNombres;', 'A.sinNombres = false;']]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p385Filtrar('dashPer', 'P1'), 'guarda: «Empleado» = P1');
  PRUEBAS.cierto(await p385MovListo('P1'), 'guarda: la actividad');
  PRUEBAS.cierto(p385Mov().todo.indexOf(t('mov_vacio_per', { p: 'P1' })) >= 0, 'DISCRIMINADOR · sin `sinNombres`, la pantalla vuelve a afirmar que P1 no tuvo movimientos');
}));

PRUEBAS.caso('⚠️ P386-9 · DISCRIMINADOR · con la rama demo de la 7.63, la Dirección de la demostración vuelve a ver cada prueba con su seudónimo', () => p386Correr387(async () => {
  p386Sabotear('movCargar', [["const sinNombres = DASH.vista === 'hseq';", 'const sinNombres = false;']]);
  PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: Más → «Ver como administrador» → contraseña');
  const b = p387Boton('hseq');
  PRUEBAS.cierto(!!b, 'guarda: está el botón «Dirección»');
  if (!b) return;
  b.click();
  PRUEBAS.cierto(await p385Hasta(() => !!DASH && DASH.demoMode && DASH.vista === 'hseq' && p385SinEsqueleto() && !!MOV && MOV.estado === 'listo'), 'guarda: la demo como Dirección, con la actividad lista');
  PRUEBAS.alMenos((MOV.items || []).filter(i => /^P\d+$/.test(String(i.persona || ''))).length, 1,
    'DISCRIMINADOR · los movimientos vuelven a traer el seudónimo (el caso de arriba lo ve)');
}));

/* ═════ P386-10 · H7 · la ✕ con un período en vuelo ══════════════════════════════════════════════════════════════════ */

function p386Boton30() { return p385Boton('dsec-ciclo', '30') || p385Boton('dsec-jornada', '30'); }
/* Visor «HELITEC · Dirección» → «30 días» con la respuesta RETENIDA (`B.retener`, de `p385Banco`) → la ✕ → se suelta la
   respuesta. Devuelve la promesa de `dashRefresh` que hizo el pedido, para esperar a que se resuelva (y con ella las
   continuaciones de `cicloPeriodoSet`). */
async function p386CerrarConPeriodoEnVuelo(B) {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  let prom = null;
  const real = window.dashRefresh;
  p386Cambiar('dashRefresh', function () { prom = real.apply(this, arguments); return prom; });
  B.retener = c => c.action === 'supervisor' && c.opDias === '30';
  const b = p386Boton30();
  PRUEBAS.cierto(!!b, 'guarda: está el botón «30 días»');
  if (!b) return null;
  b.click();
  PRUEBAS.cierto(CICLO_PIDIENDO === 30 && B.retenidos.length === 1 && !!prom, 'guarda: el pedido de 30 días quedó en vuelo');
  closePortalUI();
  PRUEBAS.igual(DASH, null, 'guarda: la ✕ cerró el panel');
  B.retener = null;
  B.soltar();
  await Promise.resolve(prom).then(() => {}, () => {});
  await null; await null;   // las dos continuaciones de `cicloPeriodoSet` ya estaban en la cola antes que éstas
  return prom;
}

PRUEBAS.caso('🔴 P386-10 · H7 · la ✕ con «30 días» en vuelo: cuando llega la respuesta, ningún rechazo sin atrapar', () => {
  /* R19 · lo conceden `cicloPedidosInvalidar` (que desde P386 llama también `closePortal`, como `onDashData`) y la guarda
     `DASH !== mio` de `cicloPeriodoSet`, que cubre además los otros seis `DASH = null`. En la 7.63 la continuación hacía
     `DASH.params = paramsAntes` sobre `DASH = null` y quedaba un `TypeError` sin atrapar. */
  const R = p386OirRechazos();
  return p386Correr(async B => {
    await p386CerrarConPeriodoEnVuelo(B);
    PRUEBAS.cierto(await R.alDia(), 'guarda: el navegador ya informó todo lo rechazado hasta acá (llegó el centinela)');
    PRUEBAS.igual(R.lista, [], '🔴 ningún rechazo sin atrapar al llegar la respuesta de un panel cerrado');
    PRUEBAS.igual(B.toasts.indexOf(t('per_no_cargo')), -1, 'y ningún «no se pudo traer» de un panel que ya no está');
  }).finally(R.fin);
});

PRUEBAS.caso('🔒 P386-10 · CONTROL · sin la ✕, la misma respuesta retenida llega y se aplica (P089)', () => p386Correr(async B => {
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  B.retener = c => c.action === 'supervisor' && c.opDias === '30';
  const b = p386Boton30();
  PRUEBAS.cierto(!!b, 'guarda: está el botón «30 días»');
  if (!b) return;
  b.click();
  PRUEBAS.igual(B.retenidos.length, 1, 'guarda: quedó en vuelo');
  B.retener = null;
  B.soltar();
  PRUEBAS.cierto(await p385Hasta(() => !CICLO_PIDIENDO && cicloDiasTraidos() === 30), 'CONTROL · la respuesta se aplicó: 30 días traídos');
}));

PRUEBAS.caso('⚠️ P386-10 · DISCRIMINADOR · la guarda sola alcanza; sin ninguna de las dos mitades (la 7.63) vuelve el `TypeError`', () => {
  const R = p386OirRechazos();
  return p386Correr(async B => {
    /* 1 · sin la invalidación de `closePortal`: la guarda `DASH !== mio` sola ya lo corta */
    p386Sabotear('closePortal', [['cicloPedidosInvalidar();', '']]);
    await p386CerrarConPeriodoEnVuelo(B);
    PRUEBAS.cierto(await R.alDia(), 'guarda: llegó el centinela');
    PRUEBAS.igual(R.lista, [], 'la guarda de `cicloPeriodoSet`, sola, también lo corta (cubre los `DASH = null` que no pasan por `closePortal`)');
    /* 2 · sin las dos */
    p386Sabotear('cicloPeriodoSet', [
      ['if (DASH !== mio){ CICLO_PIDIENDO = 0; soltar(); return; }   // P386 · H7 · su panel ya no está: no se le devuelve nada', ''],
      ['if (DASH !== mio){ CICLO_PIDIENDO = 0; soltar(); return; }   // P386 · H7 · ídem', '']]);
    await p386CerrarConPeriodoEnVuelo(B);
    PRUEBAS.cierto(await R.alDia(), 'guarda: llegó el centinela');
    PRUEBAS.alMenos(R.lista.length, 1, 'DISCRIMINADOR · sin las dos mitades vuelve el rechazo sin atrapar: el caso de arriba lo ve · ' + R.lista.join(' | '));
    R.lista.splice(0);
  }).finally(R.fin);
});

/* ═════ P386-11 · H2 · la ⓘ de la disponibilidad con un filtro ═══════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P386-11 · H2 · la ⓘ de la disponibilidad dice lo que la pantalla hace con un filtro, y vuelve a la de siempre al quitarlo', () => p386Correr(async () => {
  /* R19 · `renderHseqIdc` elige `hlp_idc_filtro` con `hseqFiltroDeAlcance()`, la misma pregunta que decide qué se pinta
     debajo (P385 · D2: con un filtro no hay cobertura). La última frase es una promesa, vigilada en `p051`
     (`P051_PROMESA_CLAVES`). */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.igual(p386AyudaIdc(), p386Texto('hlp_idc'), 'CONTROL · sin filtro, la ⓘ de siempre («las que no hicieron tests se informan aparte»)');
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Mantenimiento'), 'guarda: Departamento = Mantenimiento');
  PRUEBAS.igual(p386AyudaIdc(), p386Texto('hlp_idc_filtro'), '🔴 con el departamento, la ⓘ dice que con un filtro no se sabe cuánta gente falta medir');
  PRUEBAS.cierto(p385Filtrar('dashDep', ''), 'guarda: se quitó el filtro');
  PRUEBAS.igual(p386AyudaIdc(), p386Texto('hlp_idc'), 'al quitarlo, vuelve la de siempre');
}));

PRUEBAS.caso('⚠️ P386-11 · DISCRIMINADOR · con la ⓘ de la 7.63, con un filtro sigue diciendo «se informan aparte»', () => p386Correr(async () => {
  p386Sabotear('renderHseqIdc', [["dashHelp(t(conFiltro ? 'hlp_idc_filtro' : 'hlp_idc'))", "dashHelp(t('hlp_idc'))"]]);
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion'), 'guarda: visor «Consorcio HELITEC · Dirección»');
  PRUEBAS.cierto(p385Filtrar('dashDep', 'Mantenimiento'), 'guarda: Departamento = Mantenimiento');
  PRUEBAS.igual(p386AyudaIdc(), p386Texto('hlp_idc'), 'DISCRIMINADOR · la ⓘ de siempre con el filtro puesto: el caso de arriba lo ve');
}));

/* ═════ P386-12 · «Ver como…» · el aviso de un error queda a la vista ════════════════════════════════════════════════ */

/* El toast de verdad, leído del DOM: lo que ve la persona. */
function p386Toast() { const el = p386$('toast'); return { show: !!el && el.classList.contains('show'), msg: p385Txt(p386$('toastMsg')) }; }
/* La respuesta de `action:'demo'` cambiada en el borde de la red (`fetchConReloj`); lo demás sigue yendo al `.gs`
   emulado. `C.falla` decide qué contesta el pedido de la demo. */
function p386DemoContesta() {
  const C = { falla: null };
  const red = window.fetchConReloj;
  p386Cambiar('fetchConReloj', function (u, o) {
    let c = {}; try { c = JSON.parse(String((o && o.body) || '{}')); } catch (e) {}
    if (c.action === 'demo' && C.falla) return C.falla(c);
    return red.apply(this, arguments);
  });
  return C;
}
function p386Responde(obj) { return () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(obj), text: () => Promise.resolve(JSON.stringify(obj)) }); }
/* Toca el botón de un rol (el `onclick` real, `simEntrar`) y espera a que la simulación se haya cerrado. */
async function p386RolQueNoAbre(k) {
  const b = p387Boton(k);
  if (!b) return false;
  hideToast();
  b.click();
  return p385Hasta(() => !SIMUL && !p386$('portalOverlay').classList.contains('show'));
}

PRUEBAS.caso('🔴 P386-12 · «Ver como…» · si la simulación no abre, el aviso queda a la vista; y «sin conexión» sólo cuando es la red', () => p386Correr387(async B => {
  /* R19 · el orden lo concede `simEntrar`: sale con `simSalir(true)` y DESPUÉS avisa, porque `closePortal` esconde el toast
     que haya (`hideToast`, P189). Qué aviso, también `simEntrar`: el segundo argumento del `.then` es la red; el `.catch`
     de abajo, lo que falla al abrir lo que llegó (§6 n.º 2 de la investigación). */
  p386Cambiar('showToast', B.prev.showToast);   // el toast de verdad: `p387Banco` lo cambia por un espía
  const C = p386DemoContesta();
  PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: Más → «Ver como administrador» → contraseña (la de relleno de p387)');
  C.falla = p386Responde({ ok: false, error: 'algo falló' });
  PRUEBAS.cierto(await p386RolQueNoAbre('supervisor'), 'guarda: el servidor contestó un error y la simulación se cerró');
  PRUEBAS.igual(p386Toast(), { show: true, msg: t('ts_sim_no_abre') }, '🔴 el aviso «No se pudo abrir la simulación» queda a la vista (en la 7.63 se escondía en el mismo instante)');
  PRUEBAS.cierto(getComputedStyle(p386$('viewMas')).display !== 'none', 'y la persona vuelve a Más, donde estaba');
  C.falla = () => Promise.reject(new TypeError('Failed to fetch'));
  PRUEBAS.cierto(await p386RolQueNoAbre('medico'), 'guarda: la red falló y la simulación se cerró');
  PRUEBAS.igual(p386Toast(), { show: true, msg: t('sin_conexion') }, '🔴 con la red caída, «No se pudo conectar», a la vista');
  C.falla = p386Responde({ ok: true, registros: [] });
  PRUEBAS.cierto(await p386RolQueNoAbre('supervisor'), 'guarda: llegó una respuesta que no se puede abrir y la simulación se cerró');
  PRUEBAS.igual(p386Toast(), { show: true, msg: t('ts_sim_no_abre') }, '🔴 lo que no se puede abrir no se cuenta como falta de conexión');
  /* CONTROL · la rama de la clave vencida (P387) ya tenía este orden */
  C.falla = p386Responde({ ok: false, motivo: 'demo_pass_mal', error: 'x' });
  PRUEBAS.cierto(await p386RolQueNoAbre('supervisor'), 'guarda: la clave vencida cerró la simulación');
  PRUEBAS.igual(p386Toast(), { show: true, msg: t('ts_sim_reingresar') }, 'CONTROL · el aviso de P387 queda a la vista, como antes');
}));

PRUEBAS.caso('⚠️ P386-12 · DISCRIMINADOR · con el orden de la 7.63 los dos avisos se esconden; y con su `.catch`, lo roto es «sin conexión»', () => p386Correr387(async B => {
  p386Sabotear('simEntrar', [
    ["simSalir(true); showToast(t('ts_sim_no_abre')); return;", "showToast(t('ts_sim_no_abre')); simSalir(true); return;"],
    ["simSalir(true); showToast(t('sin_conexion'));", "showToast(t('sin_conexion')); simSalir(true);"],
    [".catch(() => { simSalir(true); showToast(t('ts_sim_no_abre')); });", ".catch(() => { simSalir(true); showToast(t('sin_conexion')); });"]]);
  p386Cambiar('showToast', B.prev.showToast);
  const C = p386DemoContesta();
  PRUEBAS.cierto(await p387AdmEntrar(), 'guarda: Más → «Ver como administrador» → contraseña');
  C.falla = p386Responde({ ok: false, error: 'algo falló' });
  PRUEBAS.cierto(await p386RolQueNoAbre('supervisor'), 'guarda: se cerró la simulación');
  PRUEBAS.falso(p386Toast().show, 'DISCRIMINADOR · el aviso del error no se ve: el caso de arriba lo ve');
  C.falla = () => Promise.reject(new TypeError('Failed to fetch'));
  PRUEBAS.cierto(await p386RolQueNoAbre('medico'), 'guarda: se cerró la simulación');
  PRUEBAS.falso(p386Toast().show, 'DISCRIMINADOR · el de la red tampoco');
  C.falla = p386Responde({ ok: true, registros: [] });
  PRUEBAS.cierto(await p386RolQueNoAbre('supervisor'), 'guarda: se cerró la simulación');
  PRUEBAS.igual(p386Toast().msg, t('sin_conexion'), 'DISCRIMINADOR · y lo que no se pudo abrir se dice «sin conexión»');
}));

/* ═════ R1 · R14 · los textos nuevos ═════════════════════════════════════════════════════════════════════════════════ */

const P386_CLAVES = ['jor_total_empresa', 'jor_total_todas', 'jor_hist_empresa', 'jor_hist_todas', 'jor_filtro_vacio',
                     'mov_sin_atribuir_per', 'hlp_idc_filtro'];
/* El de P385 (H5 de su verificador: sin `\b`, que no ve una palabra que termina en vocal con tilde). */
const P386_VOSEO = /(^|[^a-záéíóúüñ])(vos|sos|podés|tenés|querés|sabés|necesitás|debés|hacés|filtrás|elegís|mirá|quitá|sacá|elegí|tocá|andá|fijate|acordate|probá|revisá|escribí|entrá|salí|pedí|vení|volvé|empezá|esperá|cambiá|anotá|registrate)(?![a-záéíóúüñ])/i;
const P386_SECTOR = /aeropuerto|piloto|vuelo|tripulaci[óo]n|hangar|aeronave|airport|flight|crew|pilot/i;

PRUEBAS.caso('R14 · R1 · los textos nuevos de P386 están en los dos idiomas, distintos, en español neutro y sin términos de sector (con sus discriminadores)', () => {
  const previo = idiomaActual(), es = {}, en = {};
  try {
    fijarIdioma('es'); P386_CLAVES.forEach(k => { es[k] = String(t(k)); });
    fijarIdioma('en'); P386_CLAVES.forEach(k => { en[k] = String(t(k)); });
  } finally { fijarIdioma(previo); }
  PRUEBAS.igual(P386_CLAVES.filter(k => !es[k] || es[k] === k || !en[k] || en[k] === k), [], 'R14 · todas existen en español y en inglés');
  PRUEBAS.igual(P386_CLAVES.filter(k => es[k] === en[k]), [], 'R14 · y el inglés no es una copia del español');
  PRUEBAS.igual(P386_CLAVES.filter(k => P386_VOSEO.test(es[k])), [], 'R1 · nunca voseo');
  PRUEBAS.igual(P386_CLAVES.filter(k => P386_SECTOR.test(es[k]) || P386_SECTOR.test(en[k])), [], 'R14 · ningún término de sector escrito a mano');
  PRUEBAS.cierto(P386_VOSEO.test('Quitá el filtro') && P386_VOSEO.test('Elegí otra vista') && !P386_VOSEO.test('Elige otra vista'),
    'discriminador del detector de voseo (con tilde final) y su control');
  PRUEBAS.cierto(P386_SECTOR.test('el piloto') && P386_SECTOR.test('flight crew') && !P386_SECTOR.test('la jornada'), 'discriminador del detector de sector y su control');
});

/* ═════ R12 · R13 · las líneas nuevas, a tres anchos y en los dos temas ══════════════════════════════════════════════ */

/* El fondo que de verdad queda detrás del texto: el del nodo o el del primer ancestro opaco. */
function p386Fondo(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(n).backgroundColor);
    if (!m) continue;
    const p = m[1].split(',').map(x => parseFloat(x));
    if (p.length < 4 || p[3] > 0.99) return 'rgb(' + p.slice(0, 3).join(',') + ')';
  }
  return getComputedStyle(document.body).backgroundColor;
}
/* 12 px o más (con la letra Normal), contraste de 4,5:1 o más contra su fondo real y sin salirse de la pantalla ni de su
   caja, a 375, 768 y 1366, en los dos temas (`PRUEBAS.enTema` con el propio nodo como sonda: si el tema no le llega,
   lanza). Devuelve los problemas. */
function p386Legible(nombre, el) {
  const malos = [];
  [375, 768, 1366].forEach(w => PRUEBAS.enVentana(w, 800, () => ['claro', 'oscuro'].forEach(tema => PRUEBAS.enTema(tema, () => {
    const cs = getComputedStyle(el), px = parseFloat(cs.fontSize), k = CTX.contraste(cs.color, p386Fondo(el));
    const r = el.getBoundingClientRect(), ancho = document.documentElement.clientWidth;
    if (!(r.width > 0)) malos.push(nombre + ' · ' + w + ' · ' + tema + ' · no se ve');
    if (px < 12) malos.push(nombre + ' · ' + w + ' · ' + tema + ' · ' + px + ' px');
    if (k < 4.5) malos.push(nombre + ' · ' + w + ' · ' + tema + ' · contraste ' + k);
    if (r.left < -1 || r.right > ancho + 1 || el.scrollWidth > el.clientWidth + 1) malos.push(nombre + ' · ' + w + ' · ' + tema + ' · se sale');
  }, el))));
  return malos;
}

PRUEBAS.caso('R12 · R13 · las líneas nuevas se leen a 375, 768 y 1366 px en los dos temas: 12 px o más, 4,5:1 o más, sin salirse', () => {
  /* Un día más de `Operacional` para Ana, así «Día por día» tiene dos días y se pinta (con su título nuevo). */
  const ayer = p385Dia(1);
  p386Hojas(h => { h['Operacional'] = h['Operacional'].concat([[ayer, '06:00', ayer + 'T10:00:00.000Z', 'op9', 'Ana Suárez', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'salida_casa', 'kss', 6, '']]); return h; });
  return p386Correr(async () => {
    const malos = [];
    PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
    PRUEBAS.cierto(await p385Trabajar('Consorcio HELITEC') && p385Filtrar('dashPer', 'Luis Ferrer'), 'guarda: HELITEC con Luis Ferrer');
    const rot = document.querySelector('#dsec-jornada .jor-total-alc');
    const tit = [...document.querySelectorAll('#dsec-jornada .jor-h4')].find(h => p385Txt(h).indexOf(t('jor_hist_empresa')) >= 0);
    PRUEBAS.cierto(!!rot && !!tit, 'guarda: están la línea de los totales y el título de «Día por día» con su alcance');
    if (rot) malos.push.apply(malos, p386Legible('jor_total_empresa', rot));
    if (tit) malos.push.apply(malos, p386Legible('jor_hist_empresa', tit));
    PRUEBAS.cierto(p385Filtrar('dashPer', 'Carla Díaz'), 'guarda: Carla Díaz (sin jornadas)');
    const vac = document.querySelector('#dsec-jornada .jor-filtro-vacio');
    PRUEBAS.cierto(!!vac, 'guarda: está la línea de «nadie del filtro»');
    if (vac) malos.push.apply(malos, p386Legible('jor_filtro_vacio', vac));
    PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'direccion') && p385Filtrar('dashPer', 'P1') && await p385MovListo('P1'), 'guarda: Dirección con P1');
    const nota = [...document.querySelectorAll('#movHueco .mov-nota')].find(n => p385Txt(n) === t('mov_sin_atribuir_per'));
    PRUEBAS.cierto(!!nota, 'guarda: está la línea de H3');
    if (nota) malos.push.apply(malos, p386Legible('mov_sin_atribuir_per', nota));
    PRUEBAS.cierto(p385Filtrar('dashPer', '') && p385Filtrar('dashDep', 'Mantenimiento'), 'guarda: Dirección con Mantenimiento');
    const det = document.querySelector('#dsec-idc details.dash-help'), cuerpo = det && det.querySelector('.dh-body');
    PRUEBAS.cierto(!!cuerpo, 'guarda: está la ⓘ de la disponibilidad');
    if (cuerpo) { det.open = true; try { malos.push.apply(malos, p386Legible('hlp_idc_filtro', cuerpo)); } finally { det.open = false; } }
    PRUEBAS.igual(malos, [], 'R12 · R13 · ninguna línea nueva por debajo de 12 px o de 4,5:1, ni saliéndose');
  });
});

/* ═════ Lo que encontró la pasada corta del verificador de P386: H1 y H4 ═════════════════════════════════════════════ */
/* La entrada real de una cuenta con contraseña: `portalLoginSupervisor`, la misma que toca la persona. Las contraseñas son
   las de relleno del `Accesos` emulado (`p385Hojas`). */
async function p386EntrarCon(modo, usuario, pass) {
  splashPortal(); portalMode(modo);
  p386$('pEmpresa').value = usuario; p386$('pPass').value = pass;
  portalLoginSupervisor(document.querySelector('#portalSup .save-btn'));
  p386$('pPass').value = '';
  return p385Hasta(() => !!DASH && p385SinEsqueleto(), CARGA_MIN_MS + 5000);
}
/* Una persona fuera de la nómina, escrita distinto en los tests y en el ciclo. Nada une las dos grafías en el servidor. */
function p386DosGrafias() {
  p386Hojas(h => {
    const HOY = p385Dia(0);
    h['Respuestas de formulario 1'].push(p385Test('Rosa María Mena', 'Operaciones', 'Consorcio HELITEC', HOY, 5, ''));
    h['Operacional'].push([HOY, '08:00', HOY + 'T12:00:00.000Z', 'op9', 'ROSA MARIA MENA', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'salida_casa', 'kss', 4, '']);
    return h;
  });
}
PRUEBAS.caso('🔴 P386-2 · D5 · quien está escrita distinto en los tests y en el ciclo: Jornada la muestra con cualquiera de las dos grafías', () => {
  /* R19 · lo concede `jorAlcance`: la persona se compara con `dashNorm`, como en `movItemsVisibles`. Es una cuenta real, no
     el administrador: el servicio médico de HELITEC. */
  p386DosGrafias();
  return p386Correr(async () => {
    PRUEBAS.cierto(await p386EntrarCon('medico', 'helitec', 'xm'), 'guarda: entró el servicio médico de HELITEC');
    const opc = [...p386$('dashPer').options].map(o => o.value);
    PRUEBAS.igual(opc.filter(x => x && dashNorm(x) === dashNorm('Rosa María Mena')).sort(), ['ROSA MARIA MENA', 'Rosa María Mena'], 'guarda: «Empleado» ofrece las dos grafías');
    ['Rosa María Mena', 'ROSA MARIA MENA'].forEach(p => {
      PRUEBAS.cierto(p385Filtrar('dashPer', p), 'guarda: «Empleado» = ' + p);
      const j = p386Jornada();
      PRUEBAS.falso(!!j.vacio, '🔴 con «' + p + '» no dice que nadie tiene jornadas');
      PRUEBAS.igual(j.porPersona.map(x => dashNorm(x)), [dashNorm('Rosa María Mena')], '🔴 con «' + p + '» lista su fila, y sólo la suya');
    });
    /* CONTROL · con otra persona, ella no está */
    PRUEBAS.cierto(p385Filtrar('dashPer', 'Luis Ferrer'), 'guarda: «Empleado» = Luis Ferrer');
    PRUEBAS.igual(p386Jornada().porPersona.filter(x => dashNorm(x) === dashNorm('Rosa María Mena')), [], 'CONTROL · con otra persona, ella no aparece');
  });
});
PRUEBAS.caso('⚠️ P386-2 · DISCRIMINADOR · comparando a la persona tal cual, con la grafía de los tests Jornada diría «nadie»', () => {
  p386DosGrafias();
  return p386Correr(async () => {
    PRUEBAS.cierto(await p386EntrarCon('medico', 'helitec', 'xm'), 'guarda: entró el servicio médico de HELITEC');
    p386Sabotear('jorAlcance', [["(!kp || dashNorm(o.persona || '') === kp) && dashEnAlcanceDe(o, ALC_SIN_PER)", "dashEnAlcanceDe(o, ALC_TODO)"]]);
    PRUEBAS.cierto(p385Filtrar('dashPer', 'Rosa María Mena'), 'guarda: «Empleado» = Rosa María Mena');
    PRUEBAS.igual(p386Jornada().vacio, t('jor_filtro_vacio'), '⚠️ discriminador · sin normalizar, dice que nadie tiene jornadas');
  });
});

/* Una fila de `Accesos` con rol admin que no es la del `*`. Es latente: el 2026-10-02 sólo estaba la del `*`. */
function p386FilaAdmin() {
  p386Hojas(h => {
    h['Accesos'].push(['grupo', 'x', 'admin', 'Consorcio HELITEC, Helitec', 'xm', 'xd', 'xh']);
    h['Accesos'][2][0] = 'helitec2';
    return h;
  });
}
PRUEBAS.caso('🔴 P386-6 · D9 · una fila con rol admin que entra con su contraseña de supervisor: «atrás» cierra al primer toque, sin pedir nada', () => {
  /* R19 · lo concede `adminLente`: `enCasa` es «sin visor y sin empresa de trabajo». El visor siempre trae `DASH.visor`,
     también en «Todas · Supervisor» (`out.visor` en `accesoPanel_`); eso lo sigue midiendo el caso de Supervisor de P386-4. */
  p386FilaAdmin();
  return p386Correr(async B => {
    PRUEBAS.cierto(await p386EntrarCon('supervisor', 'grupo', 'x'), 'guarda: entró con la contraseña de supervisor de la fila');
    PRUEBAS.igual([DASH.rol, DASH.vista, !!DASH.visor], ['admin', 'supervisor', false], 'guarda: es una sesión de admin, en Supervisor, sin visor');
    PRUEBAS.falso(p386Flecha(), '🔴 no aparece una ← que no lleva a ningún lado');
    const n = B.pedidos.length;
    const a = await p386Atras();
    PRUEBAS.cierto(a.cerro, '🔴 el primer «atrás» cierra el panel');
    PRUEBAS.igual(p386Pedidos(B, n).length, 0, '🔴 y no vuelve a pedir el panel');
  });
});
PRUEBAS.caso('⚠️ P386-6 · DISCRIMINADOR · con la vista en la condición de «en casa», esa fila nunca cierra con «atrás»', () => {
  p386FilaAdmin();
  return p386Correr(async () => {
    PRUEBAS.cierto(await p386EntrarCon('supervisor', 'grupo', 'x'), 'guarda: entró con la contraseña de supervisor de la fila');
    p386Sabotear('adminLente', [["enCasa: modo === 'casa' }", "enCasa: modo === 'casa' && vista === 'medico' }"]]);
    const a = await p386Atras();
    PRUEBAS.falso(a.cerro, '⚠️ discriminador · «atrás» no cierra');
    await p385Hasta(() => !!DASH && p385SinEsqueleto());
  });
});
