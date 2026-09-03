
PRUEBAS.grupo('S1 · la demo y el portal, cada uno con lo suyo');

function s1EnPortal(soloDemo, fn){
  const antes = PORTAL_SOLO_DEMO;
  try { portalDemoModo(soloDemo); portalMode('emp'); return fn(); }
  finally { portalDemoModo(antes); }
}

PRUEBAS.caso('⚠️ "Ver demostración" NO aparece en el portal con credenciales', () => {
  /* Estaba en los dos. En el portal de credenciales —donde entra un supervisor real a ver datos
     reales— no pinta nada, y encima el bloque se lleva la atención justo debajo de "Entrar".
     Ahora es el espejo exacto de `#portalCreds`: cada camino muestra lo suyo. */
  const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
  const conCred = s1EnPortal(false, () => ({ demo: vis('portalDemoBloque'), creds: vis('portalCreds') }));
  const enDemo  = s1EnPortal(true,  () => ({ demo: vis('portalDemoBloque'), creds: vis('portalCreds') }));
  PRUEBAS.falso(conCred.demo, '⚠️ con credenciales no puede verse el bloque de la demostración');
  PRUEBAS.cierto(conCred.creds, 'y sí las credenciales');
  PRUEBAS.cierto(enDemo.demo, 'en la demostración sí se ve su bloque');
  PRUEBAS.falso(enDemo.creds, '⚠️ y ahí no pueden verse las credenciales: desde la demo no se entra a datos reales');
});

PRUEBAS.caso('⚠️ en la demo SÍ está "Mis estadísticas", y con otro texto', () => {
  /* Estaba oculta porque sin perfil no hay datos propios. Cierto para el portal de credenciales y
     equivocado para la demo: ahí justamente lo que hay que enseñar es cómo se ve la pantalla de una
     persona — es la pregunta que hace cualquiera que mira el producto. */
  const tab = () => { const e = document.getElementById('ptabEmp'); return !!e && getComputedStyle(e).display !== 'none'; };
  const btn = () => document.getElementById('portalEmpBtn');
  const enDemo = s1EnPortal(true, () => ({ visible: tab(), onclick: btn().getAttribute('onclick') }));
  PRUEBAS.cierto(enDemo.visible, 'en la demostración la pestaña tiene que estar');
  PRUEBAS.cierto(/portalVerDemoEmpleado/.test(enDemo.onclick || ''),
    'y llevar a la persona de EJEMPLO, no al camino que pide los datos propios');
  const hayPerfil = perfilCompleto(getProfile());
  const conCred = s1EnPortal(false, () => ({ visible: tab(), onclick: btn().getAttribute('onclick') }));
  PRUEBAS.igual(conCred.visible, hayPerfil,
    'con credenciales sigue dependiendo de que HAYA perfil: sin perfil no hay datos propios que mostrar');
  PRUEBAS.cierto(/portalLoginEmpleado/.test(conCred.onclick || ''),
    '⚠️ y ahí tiene que volver al camino real — si quedara en el de ejemplo, alguien vería datos ' +
    'de demostración creyendo que son los suyos');
});

PRUEBAS.caso('⚠️ la persona de ejemplo sale de la DEMO, nunca de una empresa real', () => {
  /* CASO BORDE DEL PLAN. Está resuelto por construcción y no por una comprobación: el pedido que
     se manda es `action:'demo'`, cuyo alcance lo fija el SERVIDOR por código (filtra por
     `EMPRESA_DEMO` y no acepta ningún parámetro de empresa). No se llama a `action:'empleado'` con
     un nombre elegido en el cliente — que sería el camino por el que podría colarse alguien real. */
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  const i = js.indexOf('function portalVerDemoEmpleado');
  const cuerpo = i >= 0 ? js.slice(i, i + 2000) : '';
  PRUEBAS.cierto(cuerpo.length > 0, 'tiene que encontrarse la función');
  PRUEBAS.cierto(/action\s*:\s*'demo'/.test(cuerpo),
    'tiene que pedir la DEMOSTRACIÓN, que es el único pedido con alcance fijado por el servidor');
  PRUEBAS.falso(/action\s*:\s*'empleado'/.test(cuerpo),
    '⚠️ no puede pedir `empleado`: ese sí acepta empresa y persona desde el cliente, y por ahí se ' +
    'podría traer a alguien de una empresa real');
});

PRUEBAS.caso('elige a la persona con más registros, y siempre la misma', () => {
  /* Determinista para que dos personas mirando la demostración vean lo mismo, y con más datos para
     que la pantalla no quede casi vacía y dé una impresión equivocada del producto. */
  const d = { registros: [
    { persona:'Poca', kss:5 },
    { persona:'Mucha', kss:5 }, { persona:'Mucha', kss:6 }, { persona:'Mucha', kss:4 },
    { persona:'Media', kss:5 }, { persona:'Media', kss:6 } ] };
  PRUEBAS.igual(demoPersonaEjemplo(d), 'Mucha', 'la de más registros');
  PRUEBAS.igual(demoPersonaEjemplo(d), 'Mucha', 'y la misma si se pregunta otra vez');
  PRUEBAS.igual(demoPersonaEjemplo({ registros: [] }), null, 'sin registros no inventa a nadie');
  /* Empate: se desempata alfabéticamente. Sin eso, el orden dependería de cómo el navegador ordena
     las claves de un objeto y podría cambiar entre dispositivos. */
  PRUEBAS.igual(demoPersonaEjemplo({ registros:[{persona:'Zoe'},{persona:'Ana'}] }), 'Ana',
    'con empate, la primera alfabéticamente: si no, dos teléfonos podrían mostrar personas distintas');
});

PRUEBAS.caso('⚠️ desde la demostración NO se puede escribir nada', () => {
  /* Lo encontré probando lo que acababa de abrir: al mostrar "Mis estadísticas" en la demo quedó
     alcanzable la pantalla del empleado CON SUS BOTONES. Tocar "Registrar" pasaba la cola de envíos
     de 3 a 4 — medido, `empPendientes()` de 0 a 1. Un registro fantasma que se habría sincronizado
     al CH de un cliente real, firmado por una persona de ejemplo.
     El guardián va en `simulBloquea`, que es el que los seis caminos de escritura ya consultan. */
  const ov = document.getElementById('portalOverlay');
  const teniaShow = ov.classList.contains('show');
  const dashPrev = (typeof DASH !== 'undefined') ? DASH : null;
  try {
    DASH = { demoMode: true, vista:'empleado', f:{}, _cfg:{} };
    ov.classList.add('show');
    PRUEBAS.cierto(demoBloqueaEscritura(), 'con la demostración abierta, escribir tiene que estar bloqueado');
    PRUEBAS.cierto(simulBloquea('prueba'), 'y el guardián que usan los caminos de escritura tiene que decir que sí');
    /* El control: cerrada la demo, una persona real registra con normalidad. Si esto también
       bloqueara, habríamos dejado a los pilotos sin poder reportar — mucho peor que el defecto. */
    ov.classList.remove('show');
    PRUEBAS.falso(demoBloqueaEscritura(),
      '⚠️ con la demostración cerrada NO puede bloquear: quien miró la demo y volvió a su inicio ' +
      'tiene que poder registrar lo suyo');
  } finally {
    DASH = dashPrev;
    if (teniaShow) ov.classList.add('show'); else ov.classList.remove('show');
  }
});

PRUEBAS.caso('los textos nuevos pasan por t(), en los dos idiomas (R14)', () => {
  const faltan = [];
  ['pg_propios_demo','pg_ver_ejemplo','pg_demo_error','pg_demo_sin_persona','ts_demo_no_guarda']
    .forEach(k => { const v = t(k); if (!v || v === k) faltan.push(k); });
  PRUEBAS.igual(faltan, [], 'toda clave nueva tiene que resolver a texto de verdad');
  PRUEBAS.falso(/\b(tenés|podés|vas a ver tus|sabés)\b/i.test(t('pg_propios_demo')),
    'sin voseo: español neutro (R1)');
});
