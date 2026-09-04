
PRUEBAS.grupo('U1 · dos homónimos ya no se pisan el registro');

/* ⚠️ POR QUÉ EXISTE. Los ids de turno, operacional y consentimiento los armaba el cliente con el
   nombre normalizado y nada más (`turno_<nombre>_<fecha>_<tipo>`), y el servidor los buscaba en TODA
   la hoja. Dos "José Rodríguez" —de la misma empresa o de dos clientes distintos— generaban el MISMO
   id, y el `setValues` del upsert le reemplazaba la fila al otro: el check-in del primero
   desaparecía del CH, en el panel figuraba como "no registró hoy", y la aptitud se evaluaba sin ese
   dato. Todos los días, en silencio, y sin pasar por la bitácora.
   Que hay homónimos no es hipótesis: el endpoint mantiene un índice de nombres ambiguos para eso. */

PRUEBAS.caso('⚠️ el id lleva la cédula, así que dos homónimos generan ids DISTINTOS', () => {
  const previo = getProfile();
  try {
    setProfile({ nombre:'José Rodríguez', empresa:'Helitec', cedula:'V-111' });
    const a = turnoHoyId('José Rodríguez', 'checkin');
    setProfile({ nombre:'José Rodríguez', empresa:'Aeroambulancias Silva', cedula:'V-222' });
    const b = turnoHoyId('José Rodríguez', 'checkin');
    PRUEBAS.falso(a === b,
      '⚠️ mismo nombre, cédulas distintas: los ids NO pueden coincidir (' + a + ' / ' + b + ')');

    /* Y el discriminador, que es lo que hace que el caso signifique algo: con el formato VIEJO los
       dos daban lo mismo. Si esta comprobación fallara, el caso de arriba estaría verde por alguna
       otra razón y no por haber arreglado el defecto. */
    PRUEBAS.igual(turnoHoyIdPrevio('José Rodríguez', 'checkin'), turnoHoyIdPrevio('José Rodríguez', 'checkin'),
      'el formato viejo era determinista por nombre…');
    setProfile({ nombre:'José Rodríguez', empresa:'Helitec', cedula:'V-111' });
    const viejoA = turnoHoyIdPrevio('José Rodríguez', 'checkin');
    setProfile({ nombre:'José Rodríguez', empresa:'Aeroambulancias Silva', cedula:'V-222' });
    PRUEBAS.igual(turnoHoyIdPrevio('José Rodríguez', 'checkin'), viejoA,
      '⚠️ …y por eso COLISIONABA: con el id viejo los dos homónimos son indistinguibles');
  } finally { if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} } }
});

PRUEBAS.caso('⚠️ sin cédula el id NO se rompe: cae al nombre, como antes', () => {
  /* Los perfiles anteriores a que la cédula fuera obligatoria no la tienen. Cambiar el id no puede
     dejarlos sin poder registrar: ese caso simplemente sigue sin desambiguar, que es como estaba. */
  const previo = getProfile();
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec' });     // sin cédula
    const id = turnoHoyId('Ana Suárez', 'checkin');
    PRUEBAS.cierto(!!id && id.indexOf('turno_') === 0, 'tiene que seguir generando un id válido: ' + id);
    PRUEBAS.igual(id, turnoHoyIdPrevio('Ana Suárez', 'checkin'),
      'sin cédula, el id nuevo y el viejo son el mismo: nada cambia para quien no la tiene');
  } finally { if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} } }
});

PRUEBAS.caso('⚠️ el check-in de hoy sigue apareciendo tras el cambio de formato', () => {
  /* La trampa de este arreglo. `turnosHoy` lee lo guardado LOCALMENTE por id: si sólo buscara el id
     nuevo, quien hizo su check-in por la mañana abría la app por la tarde y la tarjeta se lo volvía
     a pedir como si no lo hubiera hecho. Es el mismo síntoma que I4 ya había corregido para los
     turnos de noche, reintroducido por otra puerta. */
  const previo = getProfile(), prevTurnos = turnosAll();
  try {
    setProfile({ nombre:'Ana Suárez', empresa:'Helitec', cedula:'V-111' });
    const idViejo = turnoHoyIdPrevio('Ana Suárez', 'checkin');
    turnosSave({ [idViejo]: { id:idViejo, tipo:'checkin', fecha:todayStr(), persona:'Ana Suárez', creada:Date.now() } });
    const hoy = turnosHoy('Ana Suárez');
    PRUEBAS.cierto(!!(hoy && hoy.checkin),
      '⚠️ un check-in guardado con el id anterior TIENE que seguir encontrándose');
  } finally {
    turnosSave(prevTurnos);
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
  }
});

PRUEBAS.caso('⚠️ y viaja `idPrevio`, para que el servidor actualice la fila en vez de duplicarla', () => {
  /* Sin esto, el día del cambio cada persona duplicaría su check-in en el CH: el servidor no
     encontraría el id nuevo, haría append, y quedarían dos filas del mismo evento —que además
     vuelven a contar en los promedios. */
  const fuente = String(turnoGuardar);
  PRUEBAS.cierto(/idPrevio/.test(fuente),
    '⚠️ el registro de turno tiene que mandar el id anterior junto con el nuevo');
  const fuenteOp = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/action:'operacional_guardar'[\s\S]{0,400}idPrevio/.test(fuenteOp),
    'y el operacional también');
  PRUEBAS.cierto(/consentimiento_guardar'[\s\S]{0,200}idPrevio/.test(fuenteOp),
    'y el consentimiento, que es la evidencia legal de que se informó');
});

PRUEBAS.grupo('U2 · el arranque no muestra una pantalla azul vacía');

/* ⚠️ POR QUÉ EXISTE. Franco lo reportó mirando la app: "aparece el logo, y desaparece el logo,
   mientras hay fondo azul se ve el link de la web arriba, luego aparece el splash intro; un detalle
   feo que antes no estaba."
   El navegador muestra SU pantalla de arranque (ícono sobre el `background_color` del manifest) y la
   quita en cuanto la página hace su primer pintado. Ese primer pintado era `html { background }`:
   azul y VACÍO, porque el splash de la app lo muestra `splashMostrar()`, que corre recién después de
   parsear ~21.000 líneas. En ese hueco Chrome aprovecha para mostrar la dirección del sitio.
   Antes no se notaba porque el service worker no instalaba y el arranque era otro. */

PRUEBAS.caso('⚠️ hay algo pintado antes de que corra una línea de JavaScript', () => {
  const pc = document.getElementById('preCarga');
  PRUEBAS.cierto(!!pc, 'tiene que existir el elemento de pre-arranque');
  if (!pc) return;
  /* Que esté ANTES del script es lo que hace que entre en el primer pintado. Si alguien lo mueve
     más abajo, o lo pinta con JS, vuelve el hueco. */
  const cuerpo = document.body;
  PRUEBAS.igual(cuerpo.firstElementChild && cuerpo.firstElementChild.id, 'preCarga',
    '⚠️ tiene que ser el PRIMER hijo del body: más abajo ya no llega al primer pintado');
  PRUEBAS.cierto(/#preCarga\s*{/.test([...document.querySelectorAll('style')].map(x=>x.textContent).join('')),
    'y estar resuelto por CSS, no por JavaScript');
});

PRUEBAS.caso('⚠️ su fondo es EXACTAMENTE el del manifest, o se ve un salto de color', () => {
  /* El navegador pinta su pantalla de arranque con `background_color` del manifest. Si el
     pre-arranque usara otro azul, la transición entre las dos sería un parpadeo de color —el mismo
     tipo de detalle que se vino a sacar. */
  const pc = document.getElementById('preCarga');
  if (!pc) { PRUEBAS.cierto(false, 'no existe el pre-arranque'); return; }
  const fondo = getComputedStyle(pc).backgroundColor;
  const m = String(fondo).match(/\d+/g) || [];
  const hex = '#' + m.slice(0,3).map(n => Number(n).toString(16).padStart(2,'0')).join('');
  PRUEBAS.igual(hex, '#0a1f40',
    '⚠️ tiene que coincidir con background_color y theme_color del manifest (dio ' + fondo + ')');
});

PRUEBAS.caso('⚠️ y se apaga cuando la app ya decidió qué mostrar', () => {
  /* Si no se apagara, taparía la app para siempre. Y tiene que apagarse DESPUÉS de que se decida
     entre splash y app, o se vería el estado intermedio que este arreglo vino a esconder. */
  PRUEBAS.cierto(document.body.classList.contains('listo'),
    'al terminar el arranque, el body tiene que quedar marcado como listo');
  const pc = document.getElementById('preCarga');
  if (pc) PRUEBAS.igual(getComputedStyle(pc).opacity, '0', 'y el pre-arranque, invisible');

  /* La red de seguridad: si el script se corta —que en este archivo ya pasó tres veces por orden de
     declaración (R16)— el pre-arranque tiene que apagarse solo igual. Es preferible ver la app rota
     que una pantalla tapada para siempre sin ninguna explicación. */
  const css = [...document.querySelectorAll('style')].map(x=>x.textContent).join('');
  PRUEBAS.cierto(/animation:\s*preCargaRed/.test(css),
    '⚠️ tiene que tener el apagado automático por CSS, para el caso de que el JS no llegue nunca');
});
