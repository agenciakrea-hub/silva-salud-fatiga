PRUEBAS.grupo('P176 · la nómina también PONE el rol, no sólo lo quita');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Reportado por Franco el 2026-09-11, entrando a la app en producción: «estoy puesto como
   supervisor en el CH y cuando voy a estadísticas sólo veo el panel personal».

   Su fila de la `Nómina` decía «Supervisor» (verificado con `volcar`), el servidor mandaba
   `rolNomina:"supervisor"` en cada arranque, y el cliente leía ese campo en UN SOLO LUGAR:

       if (d.rolNomina === 'empleado'){ ...quitar el rol... }

   Sólo sabía QUITAR. El único que escribía `p.rol` era `nominaSoyYo` —el «¿eres tú?» del alta— así
   que el dato sólo llegaba a quien se registró DESPUÉS de que esa columna existiera. Los cuatro
   supervisores de Aeroambulancias Silva ya estaban registrados: para ellos la columna «Rol en la
   app» no hizo nada nunca. Sin `p.rol`, `rolPropuesto()` devuelve '' → el arranque no ofrece →
   `esSupervisor` sigue false → `abrirDestinoEstadisticas` entra derecho al panel personal.

   Es el patrón que más veces se cobró este proyecto: un dato que se escribe, viaja, y del otro
   lado nadie lo lee (R15).

   ⚠️ LO QUE ESTE ARREGLO NO HACE, y es a propósito (ADR 002): NO da acceso. Escribe la PROPUESTA.
   Lo que abre el panel sigue siendo la contraseña de empresa.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P176_PERFIL = { nombre:'Franco Padron', empresa:'Aeroambulancias Silva', cedula:'11111111',
  departamento:'Operaciones', cargo:'Coordinador', sexo:'Masculino', edad:'35',
  telefono:'04120000000', email:'f@e.com', esPiloto:false };

function p176Guardar(){
  return { perf: localStorage.getItem(K_PROFILE), consent: localStorage.getItem(K_CONSENT),
           rolOfr: localStorage.getItem(K_ROL_OFRECIDO), texto: localStorage.getItem(K_TEXTO),
           cache: localStorage.getItem(K_TAREAS_CACHE), fetch: window.fetch,
           tareas: { lista: TAREAS.lista, pendientes: TAREAS.pendientes, cargando: TAREAS.cargando, enVuelo: TAREAS._enVuelo } };
}
function p176Restaurar(p){
  window.fetch = p.fetch;
  const set = (k, v) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); };
  set(K_PROFILE, p.perf); set(K_CONSENT, p.consent); set(K_ROL_OFRECIDO, p.rolOfr);
  set(K_TEXTO, p.texto); set(K_TAREAS_CACHE, p.cache);
  TAREAS.lista = p.tareas.lista; TAREAS.pendientes = p.tareas.pendientes;
  TAREAS.cargando = p.tareas.cargando; TAREAS._enVuelo = p.tareas.enVuelo;
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  try { syncScrollLock(); } catch(e){}
}
/* R17 · se entra por `tareasCargar()`, que es lo que corre en CADA arranque, con la respuesta real
   del endpoint stubbeada. No se toca `p.rol` a mano: eso probaría `rolPropuesto`, no que el dato
   del servidor llegue a él — que es justamente el eslabón que estaba roto.
   ⚠️ El stub se restaura en el `.finally()` de la promesa (R18): `tareasCargar` es asíncrona. */
function p176Arranque(rolNomina){
  const resp = { ok:true, tareas:[], pendientes:0 };
  if (rolNomina !== undefined) resp.rolNomina = rolNomina;
  window.fetch = () => Promise.resolve({ ok:true, json: () => Promise.resolve(resp) });
  TAREAS.lista = []; TAREAS.pendientes = 0; TAREAS.cargando = false; TAREAS._enVuelo = null;
  return tareasCargar();
}

PRUEBAS.caso('🔴 EL DEFECTO · la nómina dice «Supervisor» y el perfil se entera', async () => {
  const prev = p176Guardar();
  try {
    setProfile(P176_PERFIL);   // registrado ANTES de que existiera la columna: sin `rol`
    PRUEBAS.igual(String((getProfile() || {}).rol || ''), '', 'precondición · el perfil no trae rol');
    PRUEBAS.igual(rolPropuesto(), '', 'precondición · y no hay nada que ofrecer');

    await p176Arranque('supervisor');

    PRUEBAS.igual(String((getProfile() || {}).rol || ''), 'supervisor',
      '🔴 el arranque lo escribe · antes el cliente leía `rolNomina` SÓLO para quitar');
    PRUEBAS.igual(String((getProfile() || {}).rolOrigen || ''), 'nomina', 'y deja dicho de dónde salió');
    PRUEBAS.igual(rolPropuesto(), 'supervisor', '🔴 y ahora sí hay algo que ofrecerle');
    PRUEBAS.falso(!!(getProfile() || {}).esSupervisor,
      '🔒 ADR 002 · pero NO le da acceso: la nómina PROPONE, la contraseña de empresa AUTORIZA');
  } finally { p176Restaurar(prev); }
});

PRUEBAS.caso('🔴 y con eso el arranque le ofrece activar su panel', async () => {
  const prev = p176Guardar();
  try {
    setProfile(P176_PERFIL);
    try { localStorage.removeItem(K_ROL_OFRECIDO); } catch(e){}
    await p176Arranque('supervisor');
    consentSync(); acceptConsent();
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    fijarTamanoTexto(nivelTextoActual());
    avanzarAlta();   // R17 · el paso 4 del arranque real
    PRUEBAS.cierto(document.getElementById('rolOv').classList.contains('show'),
      '🔴 se abre el ofrecimiento del rol · es lo que no pasaba: la app entraba derecho al panel personal');
    PRUEBAS.cierto((document.getElementById('rolTitulo').textContent || '').indexOf(t('rol_supervisor')) >= 0,
      'y dice qué rol · «Tu empresa te registró como Supervisor»');
  } finally { p176Restaurar(prev); }
});

PRUEBAS.caso('🔒 EL DISCRIMINADOR · «empleado» sigue QUITANDO, y una celda vacía no toca nada', async () => {
  const prev = p176Guardar();
  try {
    /* (a) quitar: la rama que ya existía no se rompió. */
    setProfile(Object.assign({}, P176_PERFIL, { rol:'supervisor', esSupervisor:true }));
    await p176Arranque('empleado');
    PRUEBAS.falso(!!(getProfile() || {}).esSupervisor,
      '🔒 la nómina sigue pudiendo sacar el rol · es lo único que puede sacarlo (ADR 002)');
    PRUEBAS.igual(String((getProfile() || {}).rol || ''), 'empleado', 'y lo deja escrito');

    /* (b) celda vacía: `rolNomina` no viaja y el cliente no toca nada. Decisión de Franco del
       2026-09-06 — «vacío» y «Empleado» eran indistinguibles, y quitar sin distinguirlos le sacaba
       el panel a todos los supervisores de golpe. */
    setProfile(Object.assign({}, P176_PERFIL, { rol:'supervisor', esSupervisor:true }));
    await p176Arranque(undefined);
    PRUEBAS.igual(String((getProfile() || {}).rol || ''), 'supervisor', '🔒 sin `rolNomina` no se toca el rol');
    PRUEBAS.cierto(!!(getProfile() || {}).esSupervisor, 'ni el acceso');
  } finally { p176Restaurar(prev); }
});

PRUEBAS.caso('⚠️ un rol que el servidor no manda normalizado no se escribe', async () => {
  const prev = p176Guardar();
  try {
    setProfile(P176_PERFIL);
    await p176Arranque('Superviosr');   // el servidor ya filtra esto, pero el cliente no confía
    PRUEBAS.igual(String((getProfile() || {}).rol || ''), '',
      '⚠️ sólo entran los tres valores ofrecibles · el conjunto cerrado es lo que impide que un pegado corrido proponga un rol');
    await p176Arranque('hseq');
    PRUEBAS.igual(String((getProfile() || {}).rol || ''), 'hseq', 'EL DISCRIMINADOR · los que sí, entran');
  } finally { p176Restaurar(prev); }
});
