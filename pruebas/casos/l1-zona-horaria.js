/* ── L1 · el día lo define la operación, no el teléfono ─────────────────────────────────────────
   (2026-08-27)

   EL BUG, REPRODUCIDO ANTES DE ARREGLARLO: `todayStr()` usaba la zona del DISPOSITIVO, y con ella
   se arman los ids (`turno_<persona>_<fecha>_<tipo>`). Al cruzar husos la fecha del teléfono
   salta — y volando al oeste salta HACIA ATRÁS sin que pase el tiempo. Medido: con el check-in
   guardado bajo otra fecha, `turnosHoy()` devuelve vacío y **la app le vuelve a pedir el check-in
   a alguien que ya lo hizo**.

   Es un bug que sólo le pasa a quien cruza husos, o sea al usuario central de una app de fatiga de
   aviación, y sólo a ciertas horas. Es de los que se diagnostican malísimo después: no hay error,
   no hay pantalla rota, sólo un dato que "no aparece". Por eso queda cubierto acá.

   ⚠️ AL ARREGLARLO INTRODUJE OTRO, y estos casos también lo cubren: la grilla de actividad
   caminaba fechas del dispositivo y las etiquetaba con la fecha operativa — decidía "esto es
   futuro" con un calendario y etiquetaba con otro, así que el cuadrito de HOY quedaba sin pintar.
   Mezclar dos definiciones de día es exactamente lo que este prompt viene a sacar. */

PRUEBAS.grupo('L1 · zona horaria de la operación');

function conZona(z, fn) {
  const previa = localStorage.getItem('silva_fatiga_zona_op_v1');
  zonaOpGuardar(z);
  _fopZona = null;                 // forzar que se rearme el formateador cacheado
  try { return fn(); }
  finally {
    if (previa) zonaOpGuardar(previa); else { try { localStorage.removeItem('silva_fatiga_zona_op_v1'); } catch (e) {} }
    _fopZona = null;
  }
}

PRUEBAS.caso('el día sale de la zona configurada, no del dispositivo', () => {
  const caracas = conZona('America/Caracas', () => todayStr());
  const auckland = conZona('Pacific/Auckland', () => todayStr());
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(caracas), 'el formato tiene que seguir siendo YYYY-MM-DD: es el que arma los ids');
  PRUEBAS.falso(caracas === auckland,
    'en el mismo instante, dos operaciones en husos lejanos están en días distintos — si diera igual, no estaría usando la zona');
});

PRUEBAS.caso('sin zona conocida usa la del dispositivo, no rompe', () => {
  /* La app tiene que funcionar sin conexión y antes del primer contacto con el servidor. Quedarse
     sin "hoy" sería peor que el bug original. */
  const previa = localStorage.getItem('silva_fatiga_zona_op_v1');
  try { localStorage.removeItem('silva_fatiga_zona_op_v1'); } catch (e) {}
  _fopZona = null;
  const sinZona = todayStr();
  if (previa) zonaOpGuardar(previa);
  _fopZona = null;
  const d = new Date();
  const delDispositivo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  PRUEBAS.igual(sinZona, delDispositivo,
    'sin dato se cae al comportamiento de siempre: la app nunca puede quedarse sin saber qué día es');
});

PRUEBAS.caso('una zona inválida en la config no rompe nada', () => {
  /* La zona sale de `Config Empresa`, o sea de una celda que alguien escribe a mano. Un typo no
     puede dejar la app sin poder calcular el día. */
  const r = conZona('Zona/Inventada', () => todayStr());
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}$/.test(r),
    'con una zona mal escrita en la planilla tiene que seguir devolviendo una fecha usable');
});

PRUEBAS.caso('el check-in NO desaparece: el id usa la fecha operativa', () => {
  /* El bug original, como regresión fija. */
  CTX.resetear({ nombre: 'Ana Pérez', cargo: 'Piloto', esPiloto: true });
  conZona('America/Caracas', () => {
    try { localStorage.removeItem('silva_fatiga_turnos_v1'); } catch (e) {}
    turnoGuardar('checkin', { kss: 3 });
    const ids = Object.keys(turnosAll());
    PRUEBAS.igual(ids.length, 1, 'se guardó el check-in');
    PRUEBAS.cierto(ids[0].indexOf(todayStr()) >= 0,
      'el id tiene que llevar la fecha OPERATIVA: es con la que después se lo busca');
    PRUEBAS.igual(Object.keys(turnosHoy('Ana Pérez')), ['checkin'],
      'y la pantalla tiene que encontrarlo, o le vuelve a pedir el check-in a alguien que ya lo hizo');
  });
});

PRUEBAS.caso('la aritmética de días es exacta', () => {
  /* Se usa para el "ayer" de la ventana de 14 h de los turnos nocturnos y para recorrer la racha.
     Se hace en UTC sobre la fecha ya resuelta justamente para que ninguna zona la vuelva a correr. */
  PRUEBAS.igual(fechaMasDias('2026-09-01', -1), '2026-08-31', 'cruce de mes');
  PRUEBAS.igual(fechaMasDias('2026-01-01', -1), '2025-12-31', 'cruce de año');
  PRUEBAS.igual(fechaMasDias('2028-03-01', -1), '2028-02-29', 'año bisiesto');
  PRUEBAS.igual(fechaMasDias('2026-08-27', 1), '2026-08-28', 'hacia adelante');
  PRUEBAS.igual(fechaMasDias('no-es-fecha', -1), 'no-es-fecha', 'basura entra, basura sale — sin lanzar');
});

PRUEBAS.caso('la racha y la grilla leen el MISMO calendario con el que se escribe', () => {
  /* `registrarActividad()` escribe con `todayStr()`. Si la racha o la grilla armaran la fecha por
     su cuenta con la hora del dispositivo, se desincronizarían para cualquiera en otro huso — un
     bug NUEVO introducido por el arreglo. Se prueba en zonas de los dos lados de la línea de
     fecha. */
  ['America/Caracas', 'Pacific/Auckland'].forEach(z => {
    CTX.resetear({ cargo: 'Piloto', esPiloto: true });
    conZona(z, () => {
      const act = {};
      let f = todayStr();
      for (let i = 0; i < 5; i++) { act[f] = 2; f = fechaMasDias(f, -1); }
      localStorage.setItem('silva_fatiga_actividad_v1', JSON.stringify(act));
      renderSections(); renderActividad();
      PRUEBAS.igual(iniRacha(), 5, 'la racha en ' + z + ': lee las claves que escribe todayStr()');
      const pintadas = [...document.querySelectorAll('#actGrid .act-d')]
        .filter(e => !/l0|fut/.test(e.className)).length;
      PRUEBAS.igual(pintadas, 5,
        'la grilla en ' + z + ': si camina un calendario y etiqueta con otro, el cuadrito de hoy queda como "futuro"');
    });
  });
});

PRUEBAS.caso('el día de hoy nunca cae en "futuro" en la grilla', () => {
  /* El bug que introduje al arreglar L1, aislado: el corte de futuro y la etiqueta tienen que
     salir del mismo calendario. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  conZona('Pacific/Auckland', () => {
    const act = {}; act[todayStr()] = 3;
    localStorage.setItem('silva_fatiga_actividad_v1', JSON.stringify(act));
    renderSections(); renderActividad();
    const pintadas = [...document.querySelectorAll('#actGrid .act-d')].filter(e => !/l0|fut/.test(e.className)).length;
    PRUEBAS.igual(pintadas, 1,
      'lo que se registró HOY tiene que verse hoy: marcarlo como futuro lo esconde sin ningún aviso');
  });
});
