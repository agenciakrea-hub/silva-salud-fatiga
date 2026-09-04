
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

PRUEBAS.caso('⚠️ EL AUTO-LOGIN DEL SUPERVISOR ESTÁ ESCRITO Y NO SE LLAMA DESDE NINGÚN LADO', () => {
  /* El hallazgo de Q4a. `openPortal()` tiene exactamente la lógica que haría falta —con token o
     contraseña guardada, entra directo sin pasar por el gate— y tiene CERO usos. El botón
     Estadísticas va a `openPortalGate()`, que no autologuea.
     Efecto: el token que S4 guarda (3.11, potencia máxima) no se usa para entrar. La persona toca
     "Sí, recordar" y en la siguiente entrada escribe la contraseña igual.

     ⚠️ ESTE CASO ESTÁ ESCRITO AL REVÉS A PROPÓSITO: afirma el DEFECTO, no la solución. Cuando
     Q4c lo arregle se va a poner en rojo, y eso es exactamente lo que tiene que pasar — ahí se
     invierte la condición. Es la única forma de que un defecto conocido no se olvide. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  const usos = (fuente.match(/\bopenPortal\s*\(/g) || []).length
             - (fuente.match(/function\s+openPortal\s*\(/g) || []).length;
  PRUEBAS.cierto(/portalAutoLoginSupervisor/.test(String(openPortal)),
    'guarda de medibilidad: `openPortal` tiene que ser la que autologuea');
  PRUEBAS.igual(usos, 0,
    '⚠️ SI ESTO SE PUSO EN ROJO, alguien conectó `openPortal()` — invertí este caso y bajá el ' +
    'techo del recorrido D de 3 acciones a 1 en INVENTARIO_INICIO.md');
});

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
    PRUEBAS.comoMucho(acciones, 3,
      '⚠️ el recorrido del supervisor no puede empeorar: hoy son 3 (Estadísticas · contraseña · Entrar)');
    PRUEBAS.cierto(!!u.value,
      '⚠️ el usuario tiene que venir precargado, o son 4 — es lo único que hoy ahorra un paso');
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
