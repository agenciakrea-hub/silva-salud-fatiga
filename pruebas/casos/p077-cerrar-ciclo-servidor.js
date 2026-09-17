/* ═══════════════════════════════════════════════════════════════════════════════════════════
   P077 · I1-d (hallazgo 3) · EL SUPERVISOR CIERRA UN CICLO, Y «SIN CIERRE» A PREVISTO × 1,5 — SERVIDOR

   Por el camino real: `accionCicloCerrar(p)` con `Accesos` sembrado, la hoja y la bitácora que quedan,
   `dutyAgruparCiclos_`/`leerDuty` sobre lo escrito, y el reloj (`cicloDetenerVencidos`) que NO detiene
   un ciclo cerrado. Contrato con el cliente: el evento devuelto y las dos constantes.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

const P077_AHORA = Date.now();
const p077Hace = h => new Date(P077_AHORA - h * 3600000).toISOString();
const P077_PLAN = JSON.stringify({ traslado: 60, jornada: 720, regreso: 60, descanso: 600 });
const p077Fecha = iso => iso.substring(0, 10);
function p077Ev(persona, empresa, evento, iso, extra){
  return [p077Fecha(iso), iso.substring(11, 16), iso, 'op_' + persona.replace(/\s/g, '') + '_' + p077Fecha(iso) + '_' + evento,
          persona, empresa, 'Operaciones', 'Piloto', evento, (extra && extra.test) || '', (extra && extra.resultado != null) ? extra.resultado : '', P077_PLAN];
}
function p077Hojas(){
  return {
    'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
      /* Ana: en jornada desde hace 20 h (previsto 12 h): pasada de tiempo, todavía sin las 24 h del detenido */
      p077Ev('Ana Suárez',  'Consorcio HELITEC', 'salida_casa',  p077Hace(21)),
      p077Ev('Ana Suárez',  'Consorcio HELITEC', 'llegada_aero', p077Hace(20)),
      /* Luis: ciclo completo */
      p077Ev('Luis Ferrer', 'Consorcio HELITEC', 'salida_casa',  p077Hace(30)),
      p077Ev('Luis Ferrer', 'Consorcio HELITEC', 'llegada_aero', p077Hace(29)),
      p077Ev('Luis Ferrer', 'Consorcio HELITEC', 'salida_aero',  p077Hace(20)),
      p077Ev('Luis Ferrer', 'Consorcio HELITEC', 'llegada_casa', p077Hace(19))],
    'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'NivelRiesgo', 'UmbralAmarillo', 'UmbralRojo', 'AppVersion', 'IdEvento', 'JSON']],
    'Accesos': [['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)', 'Rol (supervisor ve solo su empresa, admin ve todas)',
                 'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)', 'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'],
                ['helitec', 'sup-077', 'supervisor', 'Consorcio HELITEC, Helitec', 'med-077', 'dir-077']],
    'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo']],
    'Config Empresa': [['Empresa', 'Clave', 'Valor']]
  };
}
function p077Api(hojas){
  const env = GS.crearEntorno(hojas || p077Hojas());
  const api = GS.cargarGs(CTX.gs, env, ['accionCicloCerrar', 'leerOperacional', 'dutyAgruparCiclos_', 'leerDuty', 'cicloDetenerVencidos', 'cicloAnclaDetencion_']);
  api.__env = env;
  api.__op = () => env.__libro.getSheetByName('Operacional').__volcado().slice(1);
  api.__bit = () => env.__libro.getSheetByName('Bitácora').__volcado().slice(1);
  api.__cerrar = (cred, persona, ultimoIso) => JSON.parse(api.accionCicloCerrar(Object.assign({ dispositivoId: 'p077', persona: persona, ultimoIso: ultimoIso, quien: 'Marta Supervisora' }, cred)).getContent());
  return api;
}
const P077_SUP = { usuario: 'helitec', pass: 'sup-077' };
const P077_MED = { usuario: 'helitec', pass: 'med-077' };
const P077_DIR = { usuario: 'helitec', pass: 'dir-077' };

PRUEBAS.caso('🔴 P077 · el supervisor cierra el ciclo de Ana: fila «cerrado» pegada al ciclo, Resultado = instante del cierre, bitácora firmada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p077Api();
  const antes = api.__op().length;
  const r = api.__cerrar(P077_SUP, 'Ana Suárez', p077Hace(20));
  PRUEBAS.igual(r.ok, true, 'cerró · ' + JSON.stringify(r).slice(0, 160));
  PRUEBAS.cierto(!!r.evento && r.evento.evento === 'cerrado', '🔴 devuelve el evento «cerrado» (lo que leerOperacional daría por esa fila)');
  const filas = api.__op();
  PRUEBAS.igual(filas.length, antes + 1, 'una fila más en Operacional');
  const f = filas.find(x => String(x[8]) === 'cerrado');
  PRUEBAS.cierto(!!f, 'la fila «cerrado» existe');
  PRUEBAS.igual(String(f[2]), new Date(Date.parse(p077Hace(20)) + 2000).toISOString(), '🔴 ISO = último evento + 2 s (pegada a SU ciclo, no a «ahora»)');
  PRUEBAS.cierto(/^cie_consorcio_helitec_ana_suarez_/.test(String(f[3])), 'id determinista cie_<empresa>_<persona>_<isoAncla> · ' + f[3]);
  PRUEBAS.igual(String(f[9]), 'llegada_aero', 'Test = la fase en la que quedó');
  const cerradoEn = Number(f[10]);
  PRUEBAS.cierto(isFinite(cerradoEn) && Math.abs(cerradoEn - Date.now()) < 60000, '🔴 Resultado = el instante del cierre en epoch ms (ahora)');
  PRUEBAS.igual(String(f[11]), P077_PLAN, 'Plan = el congelado del inicio');
  const bit = api.__bit();
  PRUEBAS.igual(bit.length, 1, '🔴 UNA línea de bitácora');
  PRUEBAS.igual([String(bit[0][2]), String(bit[0][3]), String(bit[0][4]), String(bit[0][5])], ['ciclo_cerrado', 'Ana Suárez', 'helitec', 'supervisor'], 'ciclo_cerrado · sujeto Ana · actor la cuenta · rol supervisor');
  const ev = JSON.parse(bit[0][12]);
  PRUEBAS.igual([ev.detalle.fase, ev.detalle.quien], ['llegada_aero', 'Marta Supervisora'], 'con la fase y el nombre del perfil de quien cerró');
  /* y el mismo ciclo, leído de nuevo: cerrado, sin exceso */
  const g = api.dutyAgruparCiclos_(api.leerOperacional(4)).filter(x => x.evs[0].persona === 'Ana Suárez');
  PRUEBAS.igual(g.length, 1, 'sigue siendo UN ciclo (el cerrado no abre otro)');
  PRUEBAS.igual(api.cicloAnclaDetencion_(g[0].evs), null, '🔴 y ya no tiene ancla: el reloj no lo va a detener');
  const jor = (api.leerDuty(api.leerOperacional(4), 4).diario || []).find(x => x.persona === 'Ana Suárez');
  PRUEBAS.cierto(!!jor && jor.cerrado === true && jor.excesoMin === 0 && jor.abierto === false, '🔴 Jornada: cerrado, sin exceso, no «está adentro» · ' + JSON.stringify(jor && { cerrado: jor.cerrado, excesoMin: jor.excesoMin, abierto: jor.abierto }));
  /* segundo cierre: ya está cerrado */
  const r2 = api.__cerrar(P077_SUP, 'Ana Suárez', p077Hace(20));
  PRUEBAS.igual([r2.ok, r2.motivo], [false, 'ya_cerrado'], 'cerrar de nuevo: ya_cerrado, sin otra fila');
  PRUEBAS.igual(api.__op().length, antes + 1, 'y la hoja no cambió');
});

PRUEBAS.caso('🔴 P077 · el reloj NO detiene un ciclo cerrado; un ciclo completo no se puede cerrar; Dirección y el médico no cierran', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p077Api();
  api.__cerrar(P077_SUP, 'Ana Suárez', p077Hace(20));
  const inf = api.cicloDetenerVencidos(true, P077_AHORA + 10 * 3600000, P077_AHORA - 10 * 86400000);   // 30 h después del último evento de Ana
  PRUEBAS.igual((inf.filas || []).filter(f => f.persona === 'Ana Suárez').length, 0, '🔴 el reloj (simulado a +30 h) no detiene el ciclo cerrado');
  const rL = api.__cerrar(P077_SUP, 'Luis Ferrer', p077Hace(19));
  PRUEBAS.igual([rL.ok, rL.motivo], [false, 'ya_cerrado'], 'un ciclo completo (llegó a casa) no se cierra');
  const rD = api.__cerrar(P077_DIR, 'Ana Suárez', p077Hace(20));
  PRUEBAS.igual([rD.ok, rD.motivo], [false, 'solo_lectura'], 'Dirección: solo_lectura');
  const rM = api.__cerrar(P077_MED, 'Ana Suárez', p077Hace(20));
  PRUEBAS.igual([rM.ok, rM.motivo], [false, 'solo_lectura'], 'médico con clave propia: solo_lectura');
  const rX = api.__cerrar(P077_SUP, 'Ana Suárez', p077Hace(99));
  PRUEBAS.igual([rX.ok, rX.motivo], [false, 'sin_ciclo'], 'un ultimoIso que no es de ningún ciclo: sin_ciclo');
});

PRUEBAS.caso('P077 · Jornada SIGUE contando el exceso de quien no cerró (regla de Y4), aunque la tarjeta del supervisor lo lea como «sin cierre»', () => {
  /* Dos preguntas, dos reglas, a propósito: la tarjeta del ciclo dice «probablemente no marcó la salida»
     a partir de previsto × 1,5 (cliente); Jornada registra las horas y el exceso hasta el `detenido` de
     24 h (o `abandonado` a 2 × total), porque «el que no cerró tiene que seguir visible: es justo por
     quien hay que preguntar» (Y4, con sus propios casos). Si alguien unifica esto sin decidirlo, este
     caso y los de Y4 lo dicen. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = p077Api();
  const jor = (api.leerDuty(api.leerOperacional(4), 4).diario || []).find(x => x.persona === 'Ana Suárez');
  const tj = (jor.tramos || []).find(x => x.tramo === 'jornada');
  PRUEBAS.cierto(!!tj && !tj.abandonado && tj.exceso >= 470 && tj.exceso <= 490, 'a 20 h de una jornada de 12, Jornada cuenta ~8 h de exceso (Y4) · ' + JSON.stringify(tj && { abandonado: tj.abandonado, exceso: tj.exceso }));
  PRUEBAS.falso(/CICLO_SIN_CIERRE_FACTOR/.test(CTX.gs), 'y el factor 1,5 NO está en el servidor: es una lectura del cliente');
});

PRUEBAS.caso('⚠️ CONTRATO P077 · las dos capas nombran igual el evento «cerrado»; el factor 1,5 es sólo del cliente', () => {
  PRUEBAS.igual(CICLO_EVENTO_CERRADO, 'cerrado', 'el cliente dice «cerrado»');
  PRUEBAS.igual(CICLO_SIN_CIERRE_FACTOR, 1.5, 'el cliente dice 1,5');
  PRUEBAS.igual(cicloTechoSinCierreMin(720), 1080, 'y su techo de 12 h es 18 h');
  PRUEBAS.igual(cicloTechoSinCierreMin(20), 60, 'mínimo 60');
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs se saltea la otra mitad'); return; }
  const mEv = /var CICLO_EVENTO_CERRADO = "([a-z_]+)";/.exec(CTX.gs);
  PRUEBAS.cierto(!!mEv, 'guarda: el .gs declara el evento');
  PRUEBAS.igual(mEv && mEv[1], CICLO_EVENTO_CERRADO, '⚠️ mismo evento');
});

/* ── LO QUE ENCONTRÓ LA REVISIÓN ADVERSARIAL DE P077 ──────────────────────────────────────── */
PRUEBAS.caso('🔴 P077 · el ciclo se busca con la identidad que VE el panel (empresa canónica, nombre de la Nómina) y la fila se escribe con la de la hoja', () => {
  /* El teléfono escribió «Ana Suárez» en «Helitec» (alias); la Nómina dice «Ana María Suárez Pérez» (misma cédula) y la
     cuenta ve «Consorcio HELITEC». El panel muestra lo resuelto; el botón manda eso; comparar contra lo crudo
     respondía «No se encontró ese ciclo» para siempre. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p077Hojas();
  hojas['Operacional'] = [hojas['Operacional'][0], p077Ev('Ana Suárez', 'Helitec', 'salida_casa', p077Hace(21)), p077Ev('Ana Suárez', 'Helitec', 'llegada_aero', p077Hace(20))];
  hojas['Nómina'] = [['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo'],
                     ['Consorcio HELITEC', 'Ana María Suárez Pérez', '123', 'Operaciones', 'Piloto', 'F', '30', '', '', 'Sí', '', 'Empleado', '3']];
  hojas['Registrados Fatiga'] = [['x', 'Fecha y hora', 'Nombre', 'Email', 'Cedula', 'Id Piloto', '¿Es piloto?', '¿Es supervisor?', 'Empresa', 'Departamento', 'Cargo'],
                                 ['', '2026-09-01 10:00', 'Ana Suárez', 'a@b.c', '123', '', 'Sí', 'No', 'Consorcio HELITEC', 'Operaciones', 'Piloto']];
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['accionCicloCerrar', 'accionSupervisor', 'leerOperacional', 'dutyAgruparCiclos_', 'cicloDetenerVencidos']);
  const sup = JSON.parse(api.accionSupervisor({ usuario: 'helitec', pass: 'sup-077', dispositivoId: 'p077', pedida: 'supervisor' }).getContent());
  const fila = (sup.operacional || []).find(o => o.evento === 'llegada_aero');
  PRUEBAS.cierto(!!fila && fila.persona === 'Ana María Suárez Pérez' && fila.empresa === 'Consorcio HELITEC', 'guarda: el panel muestra la identidad RESUELTA · ' + JSON.stringify(fila && [fila.persona, fila.empresa]));
  const cerrar = (persona, iso) => JSON.parse(api.accionCicloCerrar(Object.assign({ dispositivoId: 'p077', persona, ultimoIso: iso, quien: 'Marta' }, P077_SUP)).getContent());
  const r = cerrar(fila.persona, fila.iso);
  PRUEBAS.igual(r.ok, true, '🔴 cerrar con lo que el panel muestra: ok · ' + JSON.stringify(r).slice(0, 120));
  PRUEBAS.igual([r.evento && r.evento.persona, r.evento && r.evento.empresa], ['Ana María Suárez Pérez', 'Consorcio HELITEC'], '🔴 el evento devuelto lleva la identidad resuelta (el filtro por persona del panel lo reconoce)');
  const f = env.__libro.getSheetByName('Operacional').__volcado().find(x => String(x[8]) === 'cerrado');
  PRUEBAS.igual([String(f[4]), String(f[5])], ['Ana Suárez', 'Helitec'], '🔴 pero la fila se escribió con la identidad CRUDA de la hoja: el reloj agrupa sin resolver');
  const g = api.dutyAgruparCiclos_(api.leerOperacional(4));
  PRUEBAS.igual(g.length, 1, 'y sin resolver sigue siendo UN ciclo (no un «cerrado» suelto en otro grupo)');
  const inf = api.cicloDetenerVencidos(true, P077_AHORA + 10 * 3600000, P077_AHORA - 10 * 86400000);
  PRUEBAS.igual((inf.filas || []).length, 0, 'el reloj a +30 h no lo detiene');
  PRUEBAS.igual(cerrar(fila.persona, fila.iso).motivo, 'ya_cerrado', 'segundo cierre con el nombre del panel: ya_cerrado');
  PRUEBAS.igual(cerrar('Ana Suárez', fila.iso).motivo, 'ya_cerrado', 'y con el nombre crudo, lo mismo: es la misma persona');
});

PRUEBAS.caso('🔴 P077 · `ultimoIso` es el estado que el supervisor confirmó: si la persona tocó otro botón después, «panel_viejo» y no se escribe nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p077Hojas();
  hojas['Operacional'].push(p077Ev('Ana Suárez', 'Consorcio HELITEC', 'salida_aero', p077Hace(1)));   // salió hace 1 h: el regreso está en curso
  const api = p077Api(hojas);
  const antes = api.__op().length;
  const r = api.__cerrar(P077_SUP, 'Ana Suárez', p077Hace(20));   // el panel todavía mostraba la jornada
  PRUEBAS.igual([r.ok, r.motivo], [false, 'panel_viejo'], '🔴 no cierra un tramo que el supervisor nunca vio · ' + (r.error || ''));
  PRUEBAS.igual(api.__op().length, antes, 'la hoja no cambió');
  PRUEBAS.igual(api.__bit().length, 0, 'ni la bitácora');
  const r2 = api.__cerrar(P077_SUP, 'Ana Suárez', p077Hace(1));   // con el panel actualizado, el regreso (61 min: excedido) sí
  PRUEBAS.igual([r2.ok, r2.evento && r2.evento.test], [true, 'salida_aero'], 'DISCRIMINADOR · con el último evento real, cierra el regreso');
});

PRUEBAS.caso('🔴 CONTRATO P077 · el supervisor recibe `resultado` en la fila «cerrado» (es el instante del cierre, no un puntaje): mismo cierre para el supervisor y el médico', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const hojas = p077Hojas();
  hojas['Operacional'][2] = p077Ev('Ana Suárez', 'Consorcio HELITEC', 'llegada_aero', p077Hace(20), { test: 'kss', resultado: 4 });
  const env = GS.crearEntorno(hojas);
  const api = GS.cargarGs(CTX.gs, env, ['accionCicloCerrar', 'accionSupervisor']);
  const r = JSON.parse(api.accionCicloCerrar(Object.assign({ dispositivoId: 'p077', persona: 'Ana Suárez', ultimoIso: p077Hace(20), quien: 'Marta' }, P077_SUP)).getContent());
  PRUEBAS.igual(r.ok, true, 'guarda: cerró');
  const sup = JSON.parse(api.accionSupervisor({ usuario: 'helitec', pass: 'sup-077', dispositivoId: 'p077', pedida: 'supervisor' }).getContent());
  const med = JSON.parse(api.accionSupervisor({ usuario: 'helitec', pass: 'med-077', dispositivoId: 'p077' }).getContent());
  PRUEBAS.igual([sup.vista, med.vista], ['supervisor', 'medico'], 'guarda: dos vistas');
  const cS = (sup.operacional || []).find(o => o.evento === 'cerrado'), cM = (med.operacional || []).find(o => o.evento === 'cerrado');
  PRUEBAS.cierto(!!cS && Number(cS.resultado) === r.evento.resultado, '🔴 el supervisor recibe el instante del cierre · ' + (cS && cS.resultado));
  PRUEBAS.cierto(!!cM && Number(cM.resultado) === r.evento.resultado, 'y el médico el mismo');
  PRUEBAS.igual(cS && cS.nivel, null, 'sin semáforo inventado sobre una parada');
  /* lo que el cliente hace con cada uno: el mismo instante */
  const ciclo = evs => cicloAgruparEventos(evs.filter(o => o.persona === 'Ana Suárez'), cicloTotalMin(cicloPlan('')) * 60000);
  const stS = cicloEstado(ciclo(sup.operacional), Date.now(), cicloPlan('')), stM = cicloEstado(ciclo(med.operacional), Date.now(), cicloPlan(''));
  PRUEBAS.igual([stS.estado, stM.estado], ['cerrado', 'cerrado'], 'los dos leen «cerrado»');
  PRUEBAS.igual(stS.cerradoEn, stM.cerradoEn, '🔴 y a la MISMA hora (antes el supervisor veía ancla + 2 s: la de ayer)');
  const kS = (sup.operacional || []).find(o => o.evento === 'llegada_aero');
  PRUEBAS.cierto(!!kS && kS.resultado === undefined && kS.nivel != null, 'DISCRIMINADOR · el puntaje del test sigue sin viajar al supervisor (K1a)');
});
