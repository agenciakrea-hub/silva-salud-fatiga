/* ── P213b · el administrador elige una empresa para trabajar, y la pantalla lo dice ─────────────
   (2026-09-30 · las cuatro piezas del CLIENTE y el filtro del servidor)

   `p213-todas-las-empresas-no-es-un-scope.js` mide el servidor de GS 2026-09-30.8: que «Todas las
   empresas» deje de ser un destino de escritura. Este archivo mide lo que vino después y **no lo
   medía nadie**: el filtro por empresa de `accionSupervisor` (30.9) y las cuatro piezas del cliente
   (6.96). La suite estuvo en 2074/2074 verde mientras los cuatro 🔴 de abajo estaban vivos, y los
   encontró un arnés escrito a mano — por eso existe este archivo.

   Los cuatro defectos que fija, todos del cliente y todos medidos:

   1. **`visorPintar()` corría un paso antes de que `DASH.f.emp` existiera.** `onDashData` la llama
      como último paso, con `DASH.f.emp` recién reseteado por su propio literal — y `visorPintar` es
      lo ÚNICO que pinta el selector y su nota. El admin elegía una empresa, el pedido salía bien,
      ESCRIBÍA sobre ella, y la pantalla decía «— Elige una empresa —» y «solo puedes mirar».
   2. **Al fallar el pedido, el `<select>` quedaba en la empresa nueva** y `DASH.f.emp` en la vieja:
      lo firmado se archivaba en una empresa y la pantalla mostraba otra.
   3. **Cuatro funciones escribían `DASH.f.emp` y sólo una avisaba al servidor.** Antes de P213 era
      un filtro local; ahora es de donde sale la empresa de CADA escritura.
   4. **La guarda estaba en el que INFORMA, no en el que ACTÚA.** El admin sin empresa firmaba, la
      cola se trababa y `cerrarSesion()` la borraba: ni la gestión ni su línea de bitácora llegaban a
      ninguna hoja. Antes de P213 quedaba mal archivada, pero EXISTÍA (R3).

   ⚠️ R17 · se entra por las funciones REALES —`dashEmpresaAdminCambiar`, `visorPintar`, `dashDrill`,
   `gestUpsert`— con `dashRequest` sustituido, nunca armando `DASH` y afirmando sobre él. El defecto
   1 es exactamente lo que un caso con el estado armado a mano no puede ver: depende del ORDEN en que
   corren dos funciones. */

PRUEBAS.grupo('P213b · el admin elige empresa, y la pantalla lo dice');

/* el payload mínimo de un panel de administrador, como lo arma el servidor */
function p213bPayload(emps) {
  return { ok: true, rol: 'admin', vista: 'medico', scope: 'Todas las empresas',
    registros: [], pvt: [], operacional: [], turnos: [], comentarios: [],
    cuentas: (emps || ['Aeropostal', 'Consorcio HELITEC']).map(e => ({ empresa: e })),
    niveles: [], config: {}, gestiones: [], bitacora: [] };
}
/* Entra como administrador y deja el DOM del visor listo. Devuelve `fin()` que restaura todo. */
function p213bEntrar(payload) {
  const prevDash = DASH, prevLS = {};
  try { Object.keys(localStorage).forEach(k => { prevLS[k] = localStorage.getItem(k); }); } catch (e) {}
  const prevReq = window.dashRequest;
  DASH = { rol: 'admin', vista: 'medico', scope: 'Todas las empresas', f: { emp: '', dep: '', per: '', nivel: '' },
    params: { usuario: '*', empresa: 'Todas las empresas', pass: 'x' }, demoMode: false,
    registros: [], cuentas: (payload && payload.cuentas) || [] };
  const ov = document.getElementById('portalOverlay'); const prevOv = ov ? ov.style.display : null;
  if (ov) ov.style.display = 'block';
  const cuerpo = document.getElementById('visorCuerpo'); const prevHid = cuerpo ? cuerpo.hidden : null;
  if (cuerpo) cuerpo.hidden = false;
  try { visorPintar(); } catch (e) {}
  return { fin: () => {
    window.dashRequest = prevReq;
    if (ov && prevOv != null) ov.style.display = prevOv;
    if (cuerpo && prevHid != null) cuerpo.hidden = prevHid;
    DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {}
    try { clearTimeout(_gestSyncT); } catch (e) {}
    try { Object.keys(_gestEnVuelo).forEach(k => delete _gestEnVuelo[k]); } catch (e) {}
  } };
}
const p213bSel = () => document.getElementById('dashEmpAdmin');
const p213bNota = () => document.getElementById('dashEmpAdminNota');
/* ⚠️ R11 · el valor MARCADO en el DOM, no `innerText`: la pestaña está oculta y da falsos negativos */
const p213bMarcada = () => { const s = p213bSel(); if (!s) return null;
  const o = Array.from(s.options).find(x => x.selected); return o ? o.value : null; };

PRUEBAS.caso('🔴 al elegir empresa, el SELECTOR queda marcado y la nota dice que puede escribir', () => {
  /* ⚠️ ÉSTE ES EL DEFECTO 1, y sólo se ve entrando por el camino real: depende del ORDEN en que
     corren `onDashData` (que llama a `visorPintar` con `DASH.f.emp` vacío) y la línea que setea
     `DASH.f.emp`. Un caso que arme `DASH` a mano y llame a `visorPintar` nunca lo habría visto. */
  const est = p213bEntrar(p213bPayload());
  try {
    if (!p213bSel()) { PRUEBAS.cierto(false, '🔴 no existe `#dashEmpAdmin`: el selector no se pintó'); return; }
    PRUEBAS.igual(p213bMarcada(), '', 'guarda: al entrar no hay empresa elegida');
    PRUEBAS.cierto(String((p213bNota() || {}).innerHTML || '').length > 10, 'guarda: la nota dice algo');
    /* el camino real: elegir en el `<select>` y que el pedido salga bien */
    p213bSel().value = 'Consorcio HELITEC';
    window.dashRequest = () => Promise.resolve(p213bPayload());
    return Promise.resolve(dashEmpresaAdminCambiar()).then(() => new Promise(r => setTimeout(r, 30))).then(() => {
      PRUEBAS.igual(DASH.f.emp, 'Consorcio HELITEC', 'guarda: la empresa quedó en `DASH.f.emp`');
      PRUEBAS.igual(p213bMarcada(), 'Consorcio HELITEC',
        '🔴 el `<option>` de esa empresa quedó MARCADO: antes no lo marcaba ninguno y el navegador mostraba «— Elige una empresa —»');
      const nota = String((p213bNota() || {}).innerHTML || '');
      PRUEBAS.cierto(nota.indexOf('HELITEC') >= 0,
        '🔴 y la nota nombra la empresa: antes decía «solo puedes mirar» mientras SÍ estaba escribiendo');
      PRUEBAS.igual(gestEmpresaParaEscribir(), 'Consorcio HELITEC', '⚠️ y la empresa que viaja en cada escritura es ésa');
    }).finally(() => est.fin());
  } catch (e) { est.fin(); throw e; }
});

PRUEBAS.caso('🔴 si el pedido FALLA, el selector vuelve a la empresa que de verdad está puesta', () => {
  /* ⚠️ DEFECTO 2. `volverAlDeAntes` no repintaba el visor —`visorCambiar` sí lo hacía, la misma
     línea escrita para lo mismo—, así que el `<select>` quedaba mostrando la empresa que la persona
     eligió mientras `DASH.f.emp` seguía en la anterior. Una determinación firmada ahí se archiva en
     una empresa con la pantalla mostrando otra. */
  const est = p213bEntrar(p213bPayload());
  try {
    if (!p213bSel()) { PRUEBAS.cierto(false, 'no existe `#dashEmpAdmin`'); return; }
    p213bSel().value = 'Aeropostal';
    window.dashRequest = () => Promise.resolve(p213bPayload());
    return Promise.resolve(dashEmpresaAdminCambiar()).then(() => new Promise(r => setTimeout(r, 30))).then(() => {
      PRUEBAS.igual(DASH.f.emp, 'Aeropostal', 'guarda: quedó en Aeropostal');
      /* ahora elige otra y el pedido FALLA */
      p213bSel().value = 'Consorcio HELITEC';
      window.dashRequest = () => Promise.reject(new Error('sin red'));
      return Promise.resolve(dashEmpresaAdminCambiar()).then(() => new Promise(r => setTimeout(r, 30)));
    }).then(() => {
      PRUEBAS.igual(DASH.f.emp, 'Aeropostal', '⚠️ la empresa de trabajo NO cambió: el pedido falló');
      PRUEBAS.igual(p213bMarcada(), 'Aeropostal',
        '🔴 y el selector volvió a mostrarla: antes se quedaba en la que falló, y lo firmado se iba a la otra');
      PRUEBAS.igual(gestEmpresaParaEscribir(), 'Aeropostal', '⚠️ pantalla y escritura coinciden');
    }).finally(() => est.fin());
  } catch (e) { est.fin(); throw e; }
});

PRUEBAS.caso('🔴 un SOLO escritor de `DASH.f.emp`: `dashDrill` y `dashClear` piden el panel', () => {
  /* ⚠️ DEFECTO 3. Cuatro funciones escribían `DASH.f.emp` y sólo `dashEmpresaAdminCambiar` le avisaba
     al servidor. Tocar el mapa de calor de «Comparar» o quitar el filtro dejaba el panel filtrado en
     el CLIENTE —el defecto que P185 documentó al sacar el selector viejo— y las escrituras yéndose a
     una empresa distinta de la que se ve. */
  const est = p213bEntrar(p213bPayload());
  try {
    if (!p213bSel()) { PRUEBAS.cierto(false, 'no existe `#dashEmpAdmin`'); return; }
    let pedidos = 0;
    window.dashRequest = (p) => { pedidos++; return Promise.resolve(Object.assign(p213bPayload(), { _emp: p && p.empresa })); };
    /* el camino del mapa de calor */
    return Promise.resolve(dashDrill('emp', 'Aeropostal')).then(() => new Promise(r => setTimeout(r, 30))).then(() => {
      PRUEBAS.alMenos(pedidos, 1, '🔴 `dashDrill(\'emp\')` PIDIÓ el panel al servidor: antes filtraba local');
      PRUEBAS.igual(DASH.f.emp, 'Aeropostal', 'y la empresa quedó puesta');
      PRUEBAS.igual(p213bMarcada(), 'Aeropostal', '⚠️ y el selector lo refleja');
      const antes = pedidos;
      return Promise.resolve(dashClear('emp')).then(() => new Promise(r => setTimeout(r, 30))).then(() => {
        PRUEBAS.alMenos(pedidos, antes + 1, '🔴 y quitar el filtro también PIDE: antes dejaba `params.empresa` pegado');
        PRUEBAS.igual(DASH.f.emp, '', 'sin empresa de trabajo');
        PRUEBAS.igual(gestEmpresaParaEscribir(), '', '⚠️ y entonces no se puede escribir, que es coherente con lo que se ve');
      });
    }).finally(() => est.fin());
  } catch (e) { est.fin(); throw e; }
});

PRUEBAS.caso('🔴 sin empresa elegida NO SE CREA la gestión: la guarda está en el que ACTÚA', () => {
  /* ⚠️ DEFECTO 4, el peor. La guarda vivía sólo en `gestTiposMandables` —el que INFORMA— así que el
     administrador sin empresa firmaba igual: el ítem entraba a la cola, el servidor contestaba
     `sin_empresa` diez veces, quedaba trabado y `cerrarSesion()` lo borraba. Antes de P213 la
     determinación quedaba MAL archivada pero EXISTÍA en el CH; con la guarda a medias no llegaba a
     ninguna hoja — ni la gestión ni su línea de bitácora, que es append-only (R3). */
  const est = p213bEntrar(p213bPayload());
  try {
    const antes = Object.keys(gestStore().up || {}).length;
    gestUpsert({ id: 'g_p213b', tipo: GEST_TIPO_ANOTACION, persona: 'PEDRO GOMEZ', nivel: 'alto', creada: Date.now() });
    PRUEBAS.igual(Object.keys(gestStore().up || {}).length, antes,
      '🔴 no entró NADA a la cola: sin empresa elegida la gestión ni se crea');
    PRUEBAS.falso((gestStore().items || []).some(x => x && x.id === 'g_p213b'), 'ni al almacén local');
    /* DISCRIMINADOR · con empresa elegida sí se crea */
    DASH.f.emp = 'Aeropostal';
    gestUpsert({ id: 'g_p213b_ok', tipo: GEST_TIPO_ANOTACION, persona: 'PEDRO GOMEZ', nivel: 'alto', creada: Date.now() });
    PRUEBAS.cierto((gestStore().items || []).some(x => x && x.id === 'g_p213b_ok'),
      'DISCRIMINADOR · con empresa elegida SÍ se crea');
    /* y un SUPERVISOR nunca se ve afectado: su empresa sale de su propio alcance */
    DASH.rol = 'supervisor'; DASH.vista = 'supervisor'; DASH.scope = 'Aeropostal'; DASH.f.emp = '';
    gestUpsert({ id: 'g_p213b_sup', tipo: GEST_TIPO_ANOTACION, persona: 'ANA', nivel: 'alto', creada: Date.now() });
    PRUEBAS.cierto((gestStore().items || []).some(x => x && x.id === 'g_p213b_sup'),
      '⚠️ y un SUPERVISOR crea siempre: la guarda sólo alcanza al administrador');
  } finally { est.fin(); }
});

PRUEBAS.caso('⚠️ el cartel no cuenta como enviable lo que el servidor va a rechazar', () => {
  /* `gestTiposMandables` devuelve `[]` sin empresa concreta, así que `colasRetenidas` cuenta esos
     pendientes como RETENIDOS. Sin esto el cartel pintaba «Enviando N registros…» indefinidamente y
     a los diez intentos ofrecía un botón que reintenta en bucle. */
  const est = p213bEntrar(p213bPayload());
  try {
    DASH.f.emp = 'Aeropostal';
    gestUpsert({ id: 'g_ret', tipo: GEST_TIPO_ANOTACION, persona: 'ANA', nivel: 'alto', creada: Date.now() });
    PRUEBAS.igual(colasRetenidas(), 0, 'guarda: con empresa elegida no hay nada retenido');
    DASH.f.emp = '';
    PRUEBAS.alMenos(colasRetenidas(), 1,
      '⚠️ sin empresa, lo pendiente cuenta como RETENIDO: el cartel deja de prometer un envío imposible');
    PRUEBAS.igual(JSON.stringify(gestTiposMandables()), '[]', 'y no hay ningún tipo mandable');
  } finally { est.fin(); }
});

PRUEBAS.caso('⚠️ el nombre de la empresa se ESCAPA antes de ir a `innerHTML`', () => {
  /* `t()` no escapa (hace `split('{e}').join(String(v))`) y la nota va a `innerHTML`. El nombre sale
     de la columna EMPRESAS del CH, que —dice la memoria del proyecto— no es sólo nuestro. La línea
     de al lado (`visorViendo`) ya pasaba `esc()`; ésta no. */
  const est = p213bEntrar(p213bPayload(['Helitec <img src=x onerror=alert(1)>']));
  try {
    DASH.f.emp = 'Helitec <img src=x onerror=alert(1)>';
    visorPintar();
    const html = String((p213bNota() || {}).innerHTML || '');
    PRUEBAS.falso(html.indexOf('<img') >= 0, '⚠️ la etiqueta NO entró como HTML');
    PRUEBAS.cierto(html.indexOf('&lt;img') >= 0 || html.indexOf('Helitec') < 0,
      'quedó escapada, como en la línea de al lado');
    PRUEBAS.igual((p213bNota() || {}).querySelectorAll('img').length, 0, '⚠️ y no hay ningún `<img>` en el DOM');
  } finally { est.fin(); }
});

PRUEBAS.caso('⚠️ el aviso del motivo se repite si la persona vuelve a chocar con la misma pared', () => {
  /* `_ultimoMotivoCola` no se reiniciaba nunca: 20 pedidos rechazados con un reintento manual en el
     medio daban UN solo aviso. `colaMotivoOk()` lo limpia cuando algo sí entra. */
  const est = p213bEntrar(p213bPayload());
  const oToast = window.showToast; let avisos = 0;
  window.showToast = () => { avisos++; };
  try {
    colaAvisarMotivo({ ok: false, motivo: 'sin_empresa' });
    PRUEBAS.igual(avisos, 1, 'avisa la primera vez');
    colaAvisarMotivo({ ok: false, motivo: 'sin_empresa' });
    PRUEBAS.igual(avisos, 1, '⚠️ y NO repite en cada reintento: las colas corren cada 60 s');
    colaMotivoOk();                       // algo entró
    colaAvisarMotivo({ ok: false, motivo: 'sin_empresa' });
    PRUEBAS.igual(avisos, 2, '⚠️ pero si vuelve a fallar después de un envío bueno, avisa otra vez');
  } finally { window.showToast = oToast; est.fin(); }
});
