/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P077 · I1-d (hallazgo 3) · «SIN MARCAR LA SALIDA», CERRAR EL CICLO Y EL RECORDATORIO — CLIENTE

   · `cicloEstado`: un tramo abierto pasado `previsto × 1,5` es `sin_cierre` (aparte del exceso real);
     un `cerrado` del supervisor para el ciclo en su instante, sin exceso.
   · La tarjeta del supervisor ofrece «Cerrar ciclo» sólo para excedido/sin_cierre; `cicloCerrar` confirma
     (R8), manda `ciclo_cerrar` y suma el evento devuelto → la tarjeta pasa a «Cerrado por el supervisor».
   · La persona recibe UN aviso en «Tus tareas» cuando su jornada prevista pasó sin marcar la salida.
   Camino real: `onDashData`, `renderCicloOperativo()`, `cicloCerrar` con `confirm`/`dashRequest` espiados,
   `cicloDetenidoRevisarAhora()`.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P077C_AHORA = Date.now();
const p077cHace = h => new Date(P077C_AHORA - h * 3600000).toISOString();
const P077C_PLAN = JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 });
function p077cEv(evento, h, extra){
  return Object.assign({ evento, iso: p077cHace(h), persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto',
    fecha: p077cHace(h).slice(0, 10), plan: P077C_PLAN, test: '', resultado: null }, extra || {});
}
function p077cCiclo(evs){ return cicloAgruparEventos(evs, cicloTotalMin(cicloPlan('')) * 60000); }

PRUEBAS.caso('🔴 P077 · cicloEstado: pasado previsto × 1,5 sin otro evento es «sin_cierre»; hasta ahí, «excedido»', () => {
  /* jornada de 12 h abierta hace 20 h: 20 > 18 → sin cierre */
  const st = cicloEstado(p077cCiclo([p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20)]), P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'sin_cierre', '🔴 a 20 h de una jornada de 12: sin_cierre');
  const tj = st.tramos.find(x => x.k === 'jornada');
  PRUEBAS.cierto(tj && tj.sinCierre === true && tj.excedido === false, 'el tramo lo dice y NO cuenta como excedido');
  PRUEBAS.cierto(tj && tj.real > 0, 'pero el reloj sigue mostrando cuánto lleva (' + tj.real + ' min)');
  /* discriminador: a 15 h es exceso real */
  const st2 = cicloEstado(p077cCiclo([p077cEv('salida_casa', 16), p077cEv('llegada_aero', 15)]), P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st2.estado, 'excedido', 'DISCRIMINADOR · a 15 h de una jornada de 12: excedido de verdad');
  /* y a 25 h manda el detenido (P186) sobre el sin_cierre */
  const st3 = cicloEstado(p077cCiclo([p077cEv('salida_casa', 26), p077cEv('llegada_aero', 25)]), P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st3.estado, 'detenido', 'a 25 h: detenido (P186), no sin_cierre');
});

PRUEBAS.caso('🔴 P077 · un «cerrado» del supervisor para el ciclo en su instante: estado cerrado, tramo «—», sin exceso, y no se detiene después', () => {
  const cerradoEn = P077C_AHORA - 2 * 3600000;
  const evs = [p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20),
               p077cEv('cerrado', 20, { iso: new Date(Date.parse(p077cHace(20)) + 2000).toISOString(), test: 'llegada_aero', resultado: cerradoEn })];
  const c = p077cCiclo(evs);
  PRUEBAS.cierto(!!c.ev.cerrado && !!c.ev.llegada_aero, 'guarda: el cerrado se pegó al ciclo (no abrió otro)');
  const st = cicloEstado(c, P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'cerrado', '🔴 estado cerrado');
  PRUEBAS.igual(st.cerradoEn, cerradoEn, 'el instante sale de `resultado` (epoch ms)');
  const tj = st.tramos.find(x => x.k === 'jornada');
  PRUEBAS.cierto(tj && tj.estado === 'cerrado_sup' && tj.real === 0 && tj.fin === cerradoEn, 'el tramo queda cerrado por el supervisor, sin duración');
  PRUEBAS.falso(st.huboExceso, 'y sin exceso');
  const st30 = cicloEstado(c, P077C_AHORA + 30 * 3600000, cicloPlan(''));
  PRUEBAS.igual(st30.estado, 'cerrado', '🔴 30 h después sigue cerrado: NO pasa a detenido');
  PRUEBAS.igual(cicloDetenidoEn(c, P077C_AHORA + 30 * 3600000), null, 'porque sobre un ciclo cerrado no se deriva detención (el servidor tampoco)');
  /* la pantalla: chip y tramo */
  const html = cicloTramosHtml(st, cicloPlan(''));
  PRUEBAS.cierto(html.indexOf('—') >= 0 && html.indexOf(esc(t('cic_cerrado_detalle', { h: cicloHora(cerradoEn) }))) >= 0, 'el tramo dice «—» y «lo cerró el supervisor a las hh:mm»');
  /* lo que viene después del cerrado es OTRO ciclo */
  const c2 = cicloAgruparTodos(evs.concat([p077cEv('salida_casa', 1)]), cicloTotalMin(cicloPlan('')) * 60000);
  PRUEBAS.igual(c2.length, 2, 'una salida de casa posterior abre un ciclo nuevo');
});

/* ── EL SUPERVISOR ───────────────────────────────────────────────────────────────────────── */
function p077cEntrar(operacional, extra){
  const prevDash = DASH, prevLS = Object.assign({}, localStorage);
  const oFetch = window.fetch, oReloj = window.fetchConReloj, oPost = window.gestPost;
  window.fetch = () => new Promise(() => {}); window.fetchConReloj = () => new Promise(() => {}); window.gestPost = () => Promise.resolve({ ok: true });
  const payload = Object.assign({
    ok: true, rol: 'supervisor', vista: 'supervisor', combinada: false, referencia: {}, metricas: ['kss'],
    registros: [{ persona: 'Ana Suárez', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', fecha: p077cHace(20).slice(0, 10), kss: 4 }],
    comentarios: [], pvt: [], aptitud: [], turnos: [], marca: null, duty: null, ausencias: {}, config: {}, visor: null, visorError: null,
    operacional: operacional
  }, extra || {});
  try {
    onDashData(payload, 'Consorcio HELITEC', { action: 'supervisor', usuario: 'usuario-p077', empresa: 'Consorcio HELITEC', pass: 'x', dispositivoId: 'p077' }, 'supervisor');
  } finally { window.fetch = oFetch; window.fetchConReloj = oReloj; }
  return function fin(){ window.gestPost = oPost; DASH = prevDash;
    try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch (e) {} };
}
function p077cTarjeta(persona){
  const cont = document.createElement('div'); cont.innerHTML = renderCicloOperativo();
  return [...cont.querySelectorAll('.cic-card')].find(c => (c.querySelector('.cic-nom') || {}).textContent === persona) || null;
}

PRUEBAS.caso('🔴 P077 · la tarjeta ofrece «Cerrar ciclo» sólo cuando está pasado de tiempo o sin cierre; el chip y el orden lo dicen', () => {
  const fin = p077cEntrar([p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20)]);
  try {
    const card = p077cTarjeta('Ana Suárez');
    PRUEBAS.cierto(!!card, 'guarda: la tarjeta de Ana');
    PRUEBAS.cierto(card.classList.contains('cic-est-sin_cierre'), '🔴 la tarjeta está en «sin cierre»');
    PRUEBAS.igual(card.querySelector('.cic-chip').textContent, t('cic_e_sin_cierre'), 'chip «Sin marcar la salida»');
    const btn = card.querySelector('.apt-act-cerrar');
    PRUEBAS.cierto(!!btn && btn.textContent === t('cic_act_cerrar'), '🔴 con el botón «Cerrar ciclo»');
    PRUEBAS.cierto(/cicloCerrar\(/.test(btn.getAttribute('onclick')) && btn.getAttribute('onclick').indexOf(p077cHace(20)) >= 0, 'que lleva el último evento del ciclo como firma');
  } finally { fin(); }
  /* en curso normal: sin el botón */
  const fin2 = p077cEntrar([p077cEv('salida_casa', 3), p077cEv('llegada_aero', 2)]);
  try {
    const card = p077cTarjeta('Ana Suárez');
    PRUEBAS.igual(card.querySelector('.apt-act-cerrar'), null, 'DISCRIMINADOR · en curso: sin «Cerrar ciclo»');
    PRUEBAS.cierto(!!card.querySelector('.apt-acciones'), 'pero con las otras acciones (P076)');
  } finally { fin2(); }
});

PRUEBAS.caso('🔴 P077 · cicloCerrar por el camino real: confirma (R8), manda ciclo_cerrar con quien, suma el evento devuelto y la tarjeta pasa a «Cerrado por el supervisor»', async () => {
  const fin = p077cEntrar([p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20)]);
  const oC = window.confirm, oR = window.dashRequest, oH = window.haptic, oT = window.showToast;
  let pregunta = null, pedido = null, hapticos = 0, toasts = [], responder = false;
  const cerradoEn = Date.now();
  window.confirm = m => { pregunta = String(m); return responder; };
  window.dashRequest = params => { pedido = params; return Promise.resolve({ ok: true, cerradoEn: new Date(cerradoEn).toISOString(), bitacora: 'srv_1',
    evento: p077cEv('cerrado', 20, { iso: new Date(Date.parse(p077cHace(20)) + 2000).toISOString(), test: 'llegada_aero', resultado: cerradoEn }) }); };
  window.haptic = () => { hapticos++; }; window.showToast = m => { toasts.push(String(m)); };
  try {
    setProfile({ nombre: 'Marta Supervisora', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Supervisora' });
    cicloCerrar('Ana Suárez', p077cHace(20));
    PRUEBAS.cierto(!!pregunta && pregunta === t('cic_cerrar_q', { p: 'Ana Suárez' }), '🔴 pregunta antes (R8) · «' + String(pregunta).slice(0, 80) + '»');
    PRUEBAS.igual(pedido, null, 'sin confirmar no manda');
    responder = true;
    cicloCerrar('Ana Suárez', p077cHace(20));
    PRUEBAS.cierto(!!pedido && pedido.action === 'ciclo_cerrar', '🔴 manda ciclo_cerrar');
    PRUEBAS.igual([pedido.persona, pedido.ultimoIso, pedido.quien], ['Ana Suárez', p077cHace(20), 'Marta Supervisora'], 'con la persona, la firma del ciclo y quién');
    PRUEBAS.igual(hapticos, 1, 'háptico');
    await PRUEBAS.esperarA(() => toasts.length > 0, 3000);
    PRUEBAS.igual(toasts[toasts.length - 1], t('ts_ciclo_cerrado'), 'avisa que cerró y registró');
    PRUEBAS.cierto(DASH.operacional.some(o => o.evento === 'cerrado'), '🔴 el evento devuelto quedó en DASH.operacional');
    const card = p077cTarjeta('Ana Suárez');
    PRUEBAS.cierto(card.classList.contains('cic-est-cerrado') && card.querySelector('.cic-chip').textContent === t('cic_e_cerrado'), '🔴 la tarjeta pasa a «Cerrado por el supervisor»');
    PRUEBAS.igual(card.querySelector('.apt-act-cerrar'), null, 'y ya no ofrece cerrar');
    PRUEBAS.cierto(card.textContent.indexOf(t('cic_cerrado_detalle', { h: cicloHora(cerradoEn) })) >= 0, 'con la hora del cierre');
  } finally { window.confirm = oC; window.dashRequest = oR; window.haptic = oH; window.showToast = oT; fin(); }
});

PRUEBAS.caso('P077 · Dirección, el médico, el visor y la demo no ofrecen «Cerrar ciclo»', () => {
  const evs = [p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20)];
  const d = p077cEntrar(evs, { demo: true });
  try { PRUEBAS.cierto(DASH.demoMode, 'guarda: demo'); const c = p077cTarjeta('Ana Suárez'); PRUEBAS.igual(c && c.querySelector('.apt-act-cerrar'), null, 'demo: sin el botón (no hay servidor que lo registre)'); }
  finally { d(); }
  const v = p077cEntrar(evs, { rol: 'admin', visor: { empresa: 'Consorcio HELITEC', vista: 'supervisor' } });
  try { PRUEBAS.cierto(visorSoloLectura(), 'guarda: visor'); const c = p077cTarjeta('Ana Suárez'); PRUEBAS.igual(c && c.querySelector('.apt-acciones'), null, 'visor: sin acciones'); }
  finally { v(); }
});

/* ── LA PERSONA ──────────────────────────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 P077 · la persona recibe UN aviso en «Tus tareas» cuando su jornada prevista pasó sin marcar la salida', () => {
  const origToast = window.showToast; const toasts = []; window.showToast = m => { toasts.push(String(m)); };
  const prevLS = Object.assign({}, localStorage);
  return PRUEBAS.conOculto(false, async () => {
    try {
      setProfile({ nombre: 'Yo', cedula: '12345678', empresa: 'Consorcio HELITEC', departamento: 'Operaciones', cargo: 'Piloto', sexo: 'F', edad: '34' });
      localStorage.removeItem(K_CICLO_MIO); localStorage.removeItem(K_NOTIF_LOCAL); localStorage.removeItem(K_CICLO_DETENIDO_VISTO);
      /* jornada de 12 h abierta hace 19 h: sin cierre (techo 18 h) y dentro de la ventana del recordatorio (hasta 20 h) */
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p077cEv('salida_casa', 20), p077cEv('llegada_aero', 19)]));
      PRUEBAS.igual(cicloEstado(cicloMio(), Date.now(), cicloPlan('')).estado, 'sin_cierre', 'guarda: su ciclo está «sin cierre»');
      cicloDetenidoRevisarAhora();
      const lista = notifLocalLeer();
      PRUEBAS.igual(lista.length, 1, '🔴 queda UNA entrada');
      PRUEBAS.igual(lista[0] && lista[0].tipo, 'jornada_vencida', 'del tipo jornada_vencida');
      PRUEBAS.igual(lista[0] && lista[0].ev, 'salida_aero', 'con el botón que falta (salida del aeropuerto)');
      PRUEBAS.cierto(lista[0] && /_jornada$/.test(lista[0].id), 'el id es por ciclo Y tramo · ' + (lista[0] && lista[0].id));
      const item = notifLocalItems()[0];
      PRUEBAS.cierto(item && item.titulo === t('notif_exc_titulo', { f: cicloFechaDe(lista[0].t0), ev: cicloEventoLabel('salida_aero') }), 'el título nombra el botón · ' + (item && item.titulo));
      PRUEBAS.igual(item && item.detalle, t('notif_exc_detalle', { ev: cicloEventoLabel('salida_aero') }), 'dentro de la ventana el detalle dice «márcalo ahora»');
      PRUEBAS.igual(toasts.filter(x => x === t('ts_jornada_vencida', { ev: cicloEventoLabel('salida_aero') })).length, 1, 'y un toast, una vez');
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(notifLocalLeer().length, 1, 'otra revisión no la duplica');
      PRUEBAS.igual(toasts.length, 1, 'ni repite el toast');
      /* pasada la ventana, la MISMA entrada cambia de instrucción: no marcar, avisar al supervisor (Y4: marcar a la
         mañana siguiente escribiría el evento con la hora de ahora y fabricaría 11 h de exceso) */
      const guardada = notifLocalLeer(); guardada[0].hasta = Date.now() - 1000; notifLocalGuardar(guardada);
      PRUEBAS.igual(notifLocalItems()[0].detalle, t('notif_exc_detalle_tarde', { ev: cicloEventoLabel('salida_aero') }), '🔴 pasada la ventana: «no lo marques ahora, avísale a tu supervisor»');
      /* a la mañana siguiente (23 h): el aviso se crea directamente en «tarde», y el toast lo dice */
      localStorage.removeItem(K_NOTIF_LOCAL); toasts.length = 0;
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p077cEv('salida_casa', 24), p077cEv('llegada_aero', 23)]));
      PRUEBAS.igual(cicloEstado(cicloMio(), Date.now(), cicloPlan('')).estado, 'sin_cierre', 'guarda: a 23 h sigue «sin cierre» (el detenido es a las 24 h)');
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(toasts[0], t('ts_jornada_vencida_tarde', { ev: cicloEventoLabel('salida_aero') }), '🔴 a las 23 h el toast ya no dice «márcalo»');
      PRUEBAS.igual(notifLocalItems()[0] && notifLocalItems()[0].detalle, t('notif_exc_detalle_tarde', { ev: cicloEventoLabel('salida_aero') }), 'ni la tarea');
      /* DISCRIMINADORES: pasado de tiempo (sin llegar al techo) no avisa; en curso tampoco; un traslado de 65 min tampoco */
      localStorage.removeItem(K_NOTIF_LOCAL); toasts.length = 0;
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p077cEv('salida_casa', 15), p077cEv('llegada_aero', 14)]));
      PRUEBAS.igual(cicloEstado(cicloMio(), Date.now(), cicloPlan('')).estado, 'excedido', 'guarda: a 14 h está pasado de tiempo, no sin cierre');
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(notifLocalLeer().length, 0, 'DISCRIMINADOR · pasado de tiempo (todavía no «sin cierre») no avisa: no es un olvido');
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p077cEv('salida_casa', 65 / 60)]));
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(notifLocalLeer().length, 0, 'DISCRIMINADOR · un traslado de 65 min (previsto 60) no avisa «tu jornada terminó»');
      localStorage.setItem(K_CICLO_SRV, JSON.stringify([p077cEv('salida_casa', 3), p077cEv('llegada_aero', 2)]));
      cicloDetenidoRevisarAhora();
      PRUEBAS.igual(notifLocalLeer().length, 0, 'DISCRIMINADOR · una jornada en curso no avisa');
    } finally {
      window.showToast = origToast;
      try { localStorage.clear(); Object.keys(prevLS).forEach(k => localStorage.setItem(k, prevLS[k])); } catch(e){}
    }
  });
});

/* ── CONTRATO ─────────────────────────────────────────────────────────────────────────────── */
PRUEBAS.caso('🔴 CONTRATO P077 · el evento que devuelve el .gs REAL al cerrar deja al ciclo del panel como «cerrado»', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const env = GS.crearEntorno({
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      [p077cHace(21).slice(0, 10), '', p077cHace(21), 'op1', 'Ana Suárez', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'salida_casa', '', '', P077C_PLAN],
      [p077cHace(20).slice(0, 10), '', p077cHace(20), 'op2', 'Ana Suárez', 'Consorcio HELITEC', 'Operaciones', 'Piloto', 'llegada_aero', 'kss', 4, P077C_PLAN]],
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'NivelRiesgo', 'UmbralAmarillo', 'UmbralRojo', 'AppVersion', 'IdEvento', 'JSON']],
    'Accesos': [['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)', 'Rol (supervisor ve solo su empresa, admin ve todas)', 'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)', 'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'],
                ['helitec', 'sup-077', 'supervisor', 'Consorcio HELITEC', '', '']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo']], 'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionCicloCerrar', 'leerOperacional']);
  const r = JSON.parse(api.accionCicloCerrar({ usuario: 'helitec', pass: 'sup-077', dispositivoId: 'p077', persona: 'Ana Suárez', ultimoIso: p077cHace(20), quien: 'Marta' }).getContent());
  PRUEBAS.igual(r.ok, true, 'guarda: el .gs cerró · ' + JSON.stringify(r).slice(0, 100));
  /* lo que el panel haría: sumar `r.evento` a lo que ya tenía */
  const evs = [p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20), r.evento];
  const st = cicloEstado(p077cCiclo(evs), Date.now(), cicloPlan(''));
  PRUEBAS.igual(st.estado, 'cerrado', '🔴 con el evento real, el ciclo está cerrado');
  PRUEBAS.cierto(Math.abs(st.cerradoEn - Date.now()) < 60000, 'en el instante que puso el servidor');
  /* y lo que `leerOperacional` devuelve después también */
  const evs2 = api.leerOperacional(4).filter(o => o.persona === 'Ana Suárez');
  PRUEBAS.igual(cicloEstado(p077cCiclo(evs2), Date.now(), cicloPlan('')).estado, 'cerrado', 'y leído de la hoja, igual');
});

/* ── LO QUE ENCONTRÓ LA REVISIÓN ADVERSARIAL DE P077 ──────────────────────────────────────── */
PRUEBAS.caso('🔴 P077 · el descanso (sin botón que marcar) nunca es «sin cierre»: un ciclo completo se lee completo', () => {
  /* llegó a casa hace 16 h con un descanso previsto de 10 h (techo 15 h): antes salía «Pasó de largo lo previsto sin «—»» en ámbar */
  const c = p077cCiclo([p077cEv('salida_casa', 30), p077cEv('llegada_aero', 29), p077cEv('salida_aero', 17), p077cEv('llegada_casa', 16)]);
  const st = cicloEstado(c, P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual(st.estado, 'completo', 'guarda: completo');
  const td = st.tramos.find(x => x.k === 'descanso');
  PRUEBAS.cierto(!!td && td.estado === 'curso' && td.sinCierre === false, '🔴 el descanso no es «sin cierre»');
  const html = cicloTramosHtml(st, cicloPlan(''));
  PRUEBAS.falso(/cic-tr-sincierre/.test(html), 'ni se pinta en ámbar');
  PRUEBAS.falso(html.indexOf('«—»') >= 0, 'ni nombra un botón que no existe');
  /* DISCRIMINADOR: la jornada, con botón, sí */
  const st2 = cicloEstado(p077cCiclo([p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20)]), P077C_AHORA, cicloPlan(''));
  PRUEBAS.cierto(/cic-tr-sincierre/.test(cicloTramosHtml(st2, cicloPlan(''))), 'DISCRIMINADOR · la jornada abierta 20 h sí');
});

PRUEBAS.caso('🔴 P077 · con `detenido` registrado y `cerrado` en el mismo ciclo manda el más temprano, igual que el servidor; Jornada rotula «cerrado»', () => {
  const ancla = Date.parse(p077cHace(30));
  const det = p077cEv('detenido', 30, { iso: new Date(ancla + 1000).toISOString(), test: 'llegada_aero' });
  /* cerrado DESPUÉS del detenido de las 24 h (a las 26 h): manda el detenido */
  const c1 = p077cCiclo([p077cEv('salida_casa', 31), p077cEv('llegada_aero', 30), det,
                         p077cEv('cerrado', 30, { iso: new Date(ancla + 2000).toISOString(), test: 'llegada_aero', resultado: ancla + 26 * 3600000 })]);
  const s1 = cicloEstado(c1, P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual(s1.estado, 'detenido', '🔴 cerrado a las 26 h con detenido registrado a las 24: detenido');
  PRUEBAS.igual(s1.detenidoEn, ancla + 24 * 3600000, 'en ancla + 24 h');
  /* cerrado ANTES (a las 20 h): manda el cerrado aunque el detenido esté escrito */
  const c2 = p077cCiclo([p077cEv('salida_casa', 31), p077cEv('llegada_aero', 30), det,
                         p077cEv('cerrado', 30, { iso: new Date(ancla + 2000).toISOString(), test: 'llegada_aero', resultado: ancla + 20 * 3600000 })]);
  const s2 = cicloEstado(c2, P077C_AHORA, cicloPlan(''));
  PRUEBAS.igual([s2.estado, s2.cerradoEn], ['cerrado', ancla + 20 * 3600000], 'DISCRIMINADOR · cerrado a las 20 h: cerrado');
  /* Resultado corrupto: nunca antes que su propio ISO */
  PRUEBAS.igual(cicloCerradoEn({ ev: { cerrado: { iso: new Date(ancla + 2000).toISOString(), resultado: '1' } } }), ancla + 2000, 'un Resultado «1» no manda el cierre a 1970: cae al ISO');
  /* la etiqueta del evento (Jornada lista los eventos del ciclo) */
  PRUEBAS.igual(cicloEventoLabel(CICLO_EVENTO_CERRADO), t('cic_e_cerrado'), '🔴 «cerrado» tiene etiqueta traducida, no la clave cruda');
});

PRUEBAS.caso('P077 · los contadores de arriba cuentan «sin marcar la salida» y «cerrados»; un rechazo del servidor vuelve a pedir el panel', async () => {
  const cerradoEn = P077C_AHORA - 3600000;
  const fin = p077cEntrar([p077cEv('salida_casa', 21), p077cEv('llegada_aero', 20),
    p077cEv('salida_casa', 21, { persona: 'Luis Ferrer' }), p077cEv('llegada_aero', 20, { persona: 'Luis Ferrer' }),
    p077cEv('cerrado', 20, { persona: 'Luis Ferrer', iso: new Date(Date.parse(p077cHace(20)) + 2000).toISOString(), test: 'llegada_aero', resultado: cerradoEn })]);
  const oR = window.dashRequest, oRef = window.dashRefresh, oC = window.confirm, oT = window.showToast, oH = window.haptic;
  let refrescos = 0; const toasts = [];
  try {
    const cont = document.createElement('div'); cont.innerHTML = renderCicloOperativo();
    const kpi = cls => { const e = cont.querySelector('.cic-kpi-' + cls + ' b'); return e ? Number(e.textContent) : null; };
    PRUEBAS.igual(kpi('sinc'), 1, 'KPI «sin marcar la salida»: 1 (Ana)');
    PRUEBAS.igual(kpi('cerr'), 1, 'KPI «cerrados por el supervisor»: 1 (Luis)');
    const tarjetas = cont.querySelectorAll('.cic-card').length;
    const suma = ['curso', 'venc', 'desc', 'comp', 'sinc', 'det', 'cerr', 'sin'].reduce((a, k) => a + (kpi(k) || 0), 0);
    PRUEBAS.igual(suma, tarjetas, 'los KPIs suman la cantidad de tarjetas (' + tarjetas + ')');
    /* el servidor rechaza porque el panel está viejo: toast del error y se vuelve a pedir el panel */
    window.confirm = () => true; window.haptic = () => {}; window.showToast = m => { toasts.push(String(m)); };
    window.dashRefresh = () => { refrescos++; return Promise.resolve(true); };
    window.dashRequest = () => Promise.resolve({ ok: false, motivo: 'panel_viejo', error: 'Ese ciclo cambió desde que se cargó el panel.' });
    cicloCerrar('Ana Suárez', p077cHace(20));
    await PRUEBAS.esperarA(() => toasts.length > 0, 3000);
    PRUEBAS.igual(refrescos, 1, 'tras «panel_viejo» se vuelve a pedir el panel (la tarjeta no puede quedarse con el botón)');
    PRUEBAS.falso(DASH.operacional.some(o => o.evento === 'cerrado' && o.persona === 'Ana Suárez'), 'y no se sumó ningún evento');
    window.dashRequest = () => Promise.resolve({ ok: false, error: 'Usuario o contraseña incorrecta' });
    toasts.length = 0; cicloCerrar('Ana Suárez', p077cHace(20));
    await PRUEBAS.esperarA(() => toasts.length > 0, 3000);
    PRUEBAS.igual(refrescos, 1, 'DISCRIMINADOR · otro error (credenciales) no refresca');
  } finally { window.dashRequest = oR; window.dashRefresh = oRef; window.confirm = oC; window.showToast = oT; window.haptic = oH; fin(); }
});
