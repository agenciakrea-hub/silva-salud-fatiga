PRUEBAS.grupo('Demo · la jornada de ejemplo no puede mostrar horas que todavía no pasaron');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   `dutyDemo()` dibujaba la jornada de «hoy» desde un arranque FIJO —`fecha + 'T06:10:00'`— sin
   mirar el reloj. Medido a las 00:31: DIEZ de los veinticuatro eventos del día estaban en el
   FUTURO (salida de casa 06:10, vuelta a casa 18:55), y la fila abierta decía «lleva 14 h adentro»
   a las doce y media de la noche. `turnosDemo()` tenía el mismo defecto con sus seis horas fijas.

   Y no es sólo raro: `cicloDemo()` SÍ es relativo a `ahora`, así que las dos pestañas que cuentan
   la misma operación —Ciclo y Jornada— se contradecían delante del cliente.

   ⚠️ Hay un segundo límite que el arreglo tiene que respetar y que no es obvio: el check-in de hoy
   tiene que caer dentro de `TURNO_VENTANA_MS` (14 h) o `cicloTurnoDe()` lo descarta y la tarjeta
   vuelve a «pendiente» — el estado que S7 vino a sacar de la demostración. Empujar los eventos
   hacia atrás para escapar del futuro puede meterlos acá: se mide en la misma pasada.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

// Cuántos eventos caen después de `ref`, y cuántos check-in se salen de la ventana de traspaso.
function jorDefectos(duty, turnos, ref){
  let futuros = 0;
  ((duty && duty.diario) || []).forEach(f => (f.eventos || []).forEach(e => {
    if (new Date(e.iso).getTime() > ref) futuros++;
  }));
  const inst = r => new Date(r.fecha + 'T' + r.hora + ':00').getTime();
  return { futuros: futuros,
           turnosFuturos: (turnos || []).filter(r => inst(r) > ref).length,
           fueraVentana: (turnos || []).filter(r => (ref - inst(r)) > TURNO_VENTANA_MS).length };
}

/* Se corre a SIETE horas del día, no a la que toque cuando alguien mire la suite: el defecto sólo
   se veía fuera de la franja de la tarde, que es justo cuando nadie estaba probando. */
const JOR_HORAS = [6, 9, 12, 14, 17, 20, 23];

PRUEBAS.caso('🔴 Demo · a ninguna hora del día la jornada muestra eventos futuros', () => {
  const real = Date.now;
  try {
    JOR_HORAS.forEach(h => {
      const base = new Date(); base.setHours(h, 0, 0, 0);
      Date.now = () => base.getTime();
      const d = jorDefectos(dutyDemo(), turnosDemo(), base.getTime());
      PRUEBAS.igual(d.futuros, 0, '🔴 ' + h + ':00 · ningún evento de jornada en el futuro');
      PRUEBAS.igual(d.turnosFuturos, 0, '🔴 ' + h + ':00 · ningún turno en el futuro');
      PRUEBAS.igual(d.fueraVentana, 0,
        '⚠️ ' + h + ':00 · y ninguno se pasó de las 14 h · fuera de la ventana la tarjeta vuelve a «pendiente»');
    });
  } finally { Date.now = real; }
});

PRUEBAS.caso('⚠️ Demo · DISCRIMINADOR · con el arranque fijo de las 06:10, la medición SÍ se pone en rojo', () => {
  const real = Date.now;
  try {
    const base = new Date(); base.setHours(6, 0, 0, 0);
    Date.now = () => base.getTime();
    /* El `dutyDemo()` de antes, reducido a lo que importa: arranque fijo a las 06:10 de hoy. */
    const hoy = todayStr();
    const t0 = new Date(hoy + 'T06:10:00').getTime();
    const viejo = { diario: [ { persona:'X', fecha:hoy, eventos: [
      { evento:'salida_casa',  iso: new Date(t0).toISOString() },
      { evento:'llegada_aero', iso: new Date(t0 + 55*60000).toISOString() },
      { evento:'salida_aero',  iso: new Date(t0 + 715*60000).toISOString() },
      { evento:'llegada_casa', iso: new Date(t0 + 765*60000).toISOString() } ] } ] };
    PRUEBAS.alMenos(jorDefectos(viejo, [], base.getTime()).futuros, 3,
      '⚠️ con el código viejo a las 6:00 hay al menos tres eventos futuros · sin esto, el cero de arriba no significaría nada');
  } finally { Date.now = real; }
});

PRUEBAS.caso('⚠️ Demo · Jornada y Ciclo cuentan la misma operación: las dos relativas a ahora', () => {
  const real = Date.now;
  try {
    const base = new Date(); base.setHours(10, 0, 0, 0);
    Date.now = () => base.getTime();
    const duty = dutyDemo();
    const abierta = (duty.diario || []).filter(f => f.abierto);
    PRUEBAS.igual(abierta.length, 1, 'guarda: hay exactamente una jornada abierta');
    /* «Todavía adentro» significa que el último instante es AHORA. Con el arranque fijo, la fila
       abierta decía 14 h de jornada aunque el reloj marcara las diez de la mañana. */
    const ultimo = abierta[0].eventos[abierta[0].eventos.length - 1];
    const minDesde = Math.round((base.getTime() - new Date(ultimo.iso).getTime()) / 60000);
    PRUEBAS.igual(minDesde, abierta[0].jornadaMin,
      '🔴 la jornada abierta lleva EXACTAMENTE lo que dice llevar desde su última marca · ' + minDesde + ' min');
    PRUEBAS.cierto(abierta[0].excesoMin > 0, 'y sigue siendo la excedida, que es lo que la demo enseña');
  } finally { Date.now = real; }
});
