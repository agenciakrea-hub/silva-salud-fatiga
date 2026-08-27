/* Prueba que la vía CLIENTE funciona: que la suite alcanza las funciones reales de la app y el
   DOM vivo. No pretende cubrir el cliente — eso es L2c. Es la demostración de que la vía sirve.

   Los dos casos que se eligieron son los dos bugs REALES de la auditoría del bloque J, para que
   desde el primer día la suite esté protegiendo algo que ya se rompió una vez. */

PRUEBAS.grupo('Cliente (vía viva)');

PRUEBAS.caso('la suite ve las funciones reales de la app', () => {
  PRUEBAS.cierto(typeof APP_VERSION !== 'undefined', 'si esto falla, la app no arrancó y el resto del reporte no significa nada');
  PRUEBAS.cierto(typeof cicloPlan === 'function', 'cicloPlan es el motor del ciclo operativo');
  PRUEBAS.cierto(typeof iniRacha === 'function', 'iniRacha cuenta los días seguidos');
});

PRUEBAS.caso('el empleado ve el MISMO plan de ciclo que el supervisor', () => {
  /* Regresión de J3. El bug: `cicloPlan()` sacaba la config de `DASH._cfg`, que el empleado no
     tiene, así que caía al default del sector. Con una empresa con jornada de 8 h, el supervisor
     la veía excedida a las 8 y la persona se veía en hora hasta las 12. */
  CTX.resetear();
  const configurado = { traslado: 45, jornada: 480, regreso: 45, descanso: 600 };

  const dashPrevio = (typeof DASH !== 'undefined') ? DASH : null;
  DASH = { _cfg: { cicloPlan: configurado } };
  const comoSupervisor = cicloPlan();
  DASH = null;                                  // el empleado no tiene panel
  cicloPlanGuardar(configurado);                // lo que llega por tareas_mias
  const comoEmpleado = cicloPlan();
  DASH = dashPrevio;

  PRUEBAS.igual(comoEmpleado, comoSupervisor,
    'si no coinciden, el supervisor ve a la persona excedida y la persona se ve en hora');
  PRUEBAS.igual(comoEmpleado.jornada, 480,
    'tiene que ser la jornada configurada por la empresa, no el default del sector (720)');
});

PRUEBAS.caso('completar un evento deja "lo que te toca ahora" al día', () => {
  /* Regresión de J3. El bug: al mover el bloque a #sections quedó fuera del alcance de
     renderInicio(), que sólo repinta #inicio — y mark() llama a renderInicio(). Resultado: la
     persona completaba un paso y la app le seguía pidiendo el mismo. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const leer = () => (document.querySelector('.cic-mio .ini-ahora-t') || {}).textContent || '';

  const antes = leer();
  mark('op_salir_casa');
  const despues = leer();

  PRUEBAS.cierto(antes && despues, 'el bloque del ciclo tiene que estar en pantalla para un piloto');
  PRUEBAS.falso(antes === despues,
    'tras completar un paso, el bloque debe pedir el SIGUIENTE — si no, la app pide dos veces lo mismo');
});
