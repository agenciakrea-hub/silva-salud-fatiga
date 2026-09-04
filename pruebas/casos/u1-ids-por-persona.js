
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
