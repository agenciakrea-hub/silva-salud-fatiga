
PRUEBAS.grupo('Q4a · el inicio: los números contra los que se compara la reforma');

/* ⚠️ ESTE ARCHIVO NO ARREGLA NADA. Fija lo que hay HOY (app 5.09), medido, para que la reforma del
   inicio (Q4b/Q4c) no pueda empeorar un recorrido sin que se note. El detalle está en
   `INVENTARIO_INICIO.md`, fuera del repo.

   ⚠️ SI UN CASO DE ACÁ SE PONE EN ROJO DESPUÉS DE Q4b, no se "arregla" cambiando el número: se mira
   si el recorrido empeoró. Un caso que sube su propio techo no mide nada. Los que se esperan MEJORES
   están escritos con `comoMucho`, así que bajar el número los deja en verde; subirlo, no. */

PRUEBAS.caso('⚠️ la portada tiene CUATRO accesos, no más', () => {
  /* El problema que Q4b viene a resolver: se le pide a la persona que se clasifique antes de
     identificarse. Si aparece un quinto acceso, la portada empeoró en la dirección contraria. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  try {
    const acc = [...document.querySelectorAll('.splash-acciones button, .splash-pie button')]
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    PRUEBAS.comoMucho(acc.length, 4,
      '⚠️ no puede haber más de cuatro caminos en la puerta — hay ' +
      acc.map(b => (b.textContent||'').trim().slice(0,22)).join(' · '));
    PRUEBAS.alMenos(acc.length, 1, 'y tiene que haber al menos uno (guarda de medibilidad)');
  } finally { if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ el carrusel de bienvenida son 5 pantallas, y hoy NO se puede saltar', () => {
  /* Son 5 toques obligatorios antes de poder empezar el alta. Se fija el número porque el recorrido
     del empleado nuevo (11 acciones) se apoya en él: si el carrusel crece, crece el alta entera.
     Y se deja escrito que la ✕ vuelve a la portada en vez de continuar — es la razón por la que no
     hay forma de saltearlo, y es candidato a cambiar en Q4b. */
  PRUEBAS.igual(document.querySelectorAll('#carTrack > *').length, 5, 'cinco pantallas');
  PRUEBAS.cierto(/splashOv.*add\('show'\)/.test(String(carruselCerrar)),
    '⚠️ hoy la ✕ devuelve a la portada: NO es un "saltar". Si Q4b lo cambia, este caso lo va a decir');
});

PRUEBAS.caso('⚠️ el empleado con perfil completo NO ve la portada al abrir', () => {
  /* Es el recorrido B, de 1 acción, y el que más gente hace: Helitec entra todos los días. La
     portada aparece SÓLO para quien nunca completó su perfil. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/if \(_complete\)\{?\s*\n?\s*continuarAlta\(\);/.test(fuente),
    '⚠️ con perfil completo el arranque va directo a la app, sin pasar por la portada');
});

PRUEBAS.caso('⚠️ y entra a sus estadísticas de UN toque, sin selector', () => {
  PRUEBAS.cierto(/portalAutoLoginEmpleado\(\); return;/.test(String(abrirDestinoEstadisticas)),
    '⚠️ quien no es supervisor ni servicio médico no tiene otra vista posible: entra directo');
});

/* ⚠️ ACÁ ESTABA EL CASO QUE AFIRMABA EL DEFECTO —`openPortal()` con cero usos—, escrito al revés a
   propósito para que se pusiera en rojo el día que se arreglara. Q4c lo arregló el 2026-09-04 y el
   caso se cumplió: sonó, y se reemplazó por su inverso, que ahora vive en
   `q4c-sin-perfil-de-empleado.js` ("el auto-login del panel SE LLAMA desde el camino real").
   Se deja escrito para que quede el rastro de por qué el techo del recorrido D bajó de 3 a 1. */

PRUEBAS.caso('⚠️ el supervisor que ya usó la app llega al panel en 3 acciones o menos', () => {
  /* Recorrido D, el que el riesgo nº1 de Q4 dice que no se puede empeorar: tocar Estadísticas,
     escribir la contraseña, tocar Entrar. El usuario sí viene precargado.
     `comoMucho`, no `igual`: bajarlo a 1 (arreglando el auto-login) tiene que dejarlo en verde. */
  const prev = { perfil: localStorage.getItem(K_PROFILE), creds: localStorage.getItem(K_DASH_CREDS) };
  try {
    localStorage.setItem(K_PROFILE, JSON.stringify({ nombre:'Ana Suárez', cedula:'V-9001',
      empresa:'Helitec', departamento:'Op', cargo:'Piloto', sexo:'F', edad:'38',
      telefono:'+58 412', email:'a@x.com', esSupervisor:true }));
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec', token:'tok-123' }));
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    openPortalGate();
    document.getElementById('portalOverlay').classList.add('show');
    const u = document.getElementById('pEmpresa'), p = document.getElementById('pPass');
    const entroDirecto = document.getElementById('portalDash').style.display !== 'none';
    const acciones = entroDirecto ? 1 : (1 + (u.value ? 0 : 1) + (p.value ? 0 : 1) + 1);
    /* ⚠️ EL TECHO BAJÓ DE 3 A 1 con Q4c. Con el auto-login conectado, quien guardó su sesión entra
       de un toque: tocar Estadísticas y ya está adentro. Este caso mide el camino de quien NO la
       guardó (llama a `openPortalGate()` directo), que sigue siendo 3 y no puede empeorar. */
    PRUEBAS.comoMucho(acciones, 3,
      '⚠️ sin sesión guardada el recorrido son 3 (Estadísticas · contraseña · Entrar) y no puede crecer');
    PRUEBAS.cierto(!!u.value,
      '⚠️ el usuario tiene que venir precargado, o son 4');
  } finally {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    if (prev.perfil) localStorage.setItem(K_PROFILE, prev.perfil); else localStorage.removeItem(K_PROFILE);
    if (prev.creds) localStorage.setItem(K_DASH_CREDS, prev.creds); else localStorage.removeItem(K_DASH_CREDS);
  }
});

PRUEBAS.caso('⚠️ el botón no puede prometer "un toque" si falta escribir la contraseña', () => {
  /* `openPortalGate` pone "Entrar a Helitec" con el comentario "ya está todo cargado: un solo
     toque". Dejó de ser cierto cuando S4 dejó de guardar la contraseña (a propósito, para que la
     maneje el gestor del sistema): hoy el botón dice que está todo listo con el campo vacío.
     Lo que se fija es que si alguna vez se rellena la contraseña, el texto siga teniendo sentido —
     y que si no se rellena, alguien lo mire. */
  PRUEBAS.cierto(/la contraseña ya NO se rellena/.test(String(openPortalGate)),
    'la razón tiene que seguir escrita al lado del código que la promete');
});

PRUEBAS.caso('⚠️ la demostración se abre en 2 toques', () => {
  /* Es el camino comercial: cada toque de más es alguien que no llega a ver el producto. */
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  try {
    splashVerDemo();
    const btn = document.getElementById('portalDemoBtn');
    PRUEBAS.cierto(!!btn && btn.getBoundingClientRect().width > 0,
      '⚠️ tras tocar "Ver una demostración" tiene que quedar UN botón para entrar');
    PRUEBAS.cierto(/portalMode\('sup'\)/.test(String(splashVerDemo)),
      'y abrir ya en una vista elegida, para no sumar un toque de selección');
  } finally {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    if (tenia) ov.classList.add('show');
  }
});
