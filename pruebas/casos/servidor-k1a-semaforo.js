/* ── K1a · que el puntaje clínico NO viaje a supervisor ni a Dirección/HSEQ ─────────────────────
   (2026-08-27)

   Esta es la clase de regla que se rompe callada. Nada falla, nadie ve un error: simplemente
   alguien agrega un campo nuevo al payload, o toca el recorte, y los puntajes vuelven a viajar.
   No se nota mirando la pantalla —el supervisor sigue viendo su semáforo— porque la fuga está en
   la respuesta de red, no en lo que se pinta. Se descubriría abriendo las herramientas del
   navegador, que es exactamente como se descubrió la de E2a.

   Por eso el caso central no comprueba que el semáforo esté bien: comprueba que **el número no
   esté en ningún lado**. */

PRUEBAS.grupo('Servidor · K1a, el puntaje no viaja');

function apiK1a() {
  const env = GS.crearEntorno({});
  return GS.cargarGs(CTX.gs, env,
    ['recortarCicloServer', 'nivelTestServer', 'refDeTestServer', 'casoNivelMetrica', 'margenDe']);
}
function filaOp(extra) {
  return Object.assign({ persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones',
    cargo: 'Piloto', fecha: '2026-08-27', hora: '07:00', campo: 'llegada_aero' }, extra);
}
function filaTurno(extra) {
  return Object.assign({ persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones',
    cargo: 'Piloto', hora: '06:00', kss: null, carga: null }, extra);
}

PRUEBAS.caso('no queda NINGÚN puntaje crudo en lo que se recorta', () => {
  /* El caso más importante del archivo. Busca el número en el JSON entero, no campo por campo:
     un campo nuevo que alguien agregue mañana con el puntaje adentro también lo agarra. */
  const api = apiK1a();
  const r = api.recortarCicloServer(
    [filaOp({ test: 'KSS', resultado: 8 }), filaOp({ test: 'Perelli', resultado: 9 })],
    [filaTurno({ tipo: 'checkin', kss: 7 })],
    []);
  const texto = JSON.stringify(r);
  PRUEBAS.falso(/"resultado"/.test(texto),
    'el puntaje del test no puede viajar: con la contraseña de supervisor se lee desde las herramientas del navegador');
  PRUEBAS.falso(/"kss"\s*:\s*\d/.test(texto),
    'el KSS del turno tampoco');
  PRUEBAS.falso(/\b(8|9|7)\b/.test(texto.replace(/"(fecha|hora)":"[^"]*"/g, '')),
    'ni siquiera suelto en otro campo: se busca el número en todo el JSON, no campo por campo');
});

PRUEBAS.caso('en su lugar viaja el nivel', () => {
  const api = apiK1a();
  const r = api.recortarCicloServer(
    [filaOp({ test: 'KSS', resultado: 8 }), filaOp({ test: 'Perelli', resultado: 3 })],
    [filaTurno({ tipo: 'checkin', kss: 9 })],
    []);
  PRUEBAS.igual(r.operacional[0].nivel, 'medio', 'un KSS de 8 sobre una referencia de 6 está por encima del margen');
  PRUEBAS.igual(r.operacional[1].nivel, 'ok', 'un Perelli de 3 sobre una referencia de 7.3 está bien');
  PRUEBAS.igual(r.turnos[0].kssNivel, 'medio', 'el KSS del check-in también se clasifica');
});

PRUEBAS.caso('con UNA sola medición nunca dice "alto"', () => {
  /* Sale gratis por reusar `casoNivelMetrica` en vez de escribir otra clasificación: esa función
     exige dos lecturas altas seguidas para "alto". Es lo correcto —un valor elevado aislado es
     "cerca del límite", no "por encima"— y es lo que evita que el semáforo del supervisor sea más
     duro que el que ve la persona en su propia app. */
  const api = apiK1a();
  const r = api.recortarCicloServer([filaOp({ test: 'KSS', resultado: 9 })], [], []);
  PRUEBAS.igual(r.operacional[0].nivel, 'medio',
    'el máximo posible de una sola lectura: si diera "alto", el supervisor vería algo más grave que la persona');
});

PRUEBAS.caso('la percepción de CARGA no se toca', () => {
  /* No es una medida clínica de la persona sino de cómo se siente el trabajo, y no tiene
     referencia en el sistema. Inventarle un corte para "que quede parejo" sería justamente lo que
     el proyecto marca como médicamente incorrecto. Además es lo que el supervisor necesita ver
     para redistribuir tareas. */
  const api = apiK1a();
  const r = api.recortarCicloServer([], [filaTurno({ tipo: 'carga', carga: 4 })], []);
  PRUEBAS.igual(r.turnos[0].carga, 4,
    'la carga de trabajo es información operativa sobre el turno, no un puntaje clínico de la persona');
});

PRUEBAS.caso('un test sin referencia no inventa un nivel', () => {
  const api = apiK1a();
  PRUEBAS.igual(api.refDeTestServer('LoQueSea'), null, 'no hay referencia: no hay corte');
  const r = api.recortarCicloServer([filaOp({ test: 'LoQueSea', resultado: 99 })], [], []);
  PRUEBAS.igual(r.operacional[0].nivel, null,
    'sin referencia el nivel es null, no un valor inventado — pero el puntaje TAMPOCO viaja');
  PRUEBAS.falso(/"resultado"/.test(JSON.stringify(r)),
    'que no se pueda clasificar no es excusa para dejar pasar el número');
});

PRUEBAS.caso('un evento sin test se recorta sin romperse', () => {
  /* La mitad de los eventos del ciclo no tienen test (salir de casa, llegar a casa). */
  const api = apiK1a();
  const r = api.recortarCicloServer(
    [filaOp({ campo: 'salida_casa', test: '', resultado: null })], [], []);
  PRUEBAS.igual(r.operacional[0].nivel, null, 'sin test no hay nivel, y no tiene que lanzar');
  PRUEBAS.igual(r.operacional[0].campo, 'salida_casa', 'el resto de los campos sigue intacto');
});

PRUEBAS.caso('el nivel de riesgo del puesto cambia el semáforo, no la referencia', () => {
  /* Es uno de los dos conceptos que el proyecto marca como "no confundir nunca": la referencia
     clínica NO se mueve por el puesto; lo que cambia es la tolerancia operativa. Un mismo KSS
     puede dar "ok" en un puesto de nivel bajo y "medio" en uno de nivel alto. */
  const api = apiK1a();
  const filasNivel = [
    { empresa: 'Helitec', persona: '', cargo: 'Piloto', departamento: '', nivel: '5' },
    { empresa: 'Otra',    persona: '', cargo: 'Piloto', departamento: '', nivel: '1' }
  ];
  /* ⚠️ El valor 5 no es casual, y la primera versión de este caso usaba 7 y fallaba.
     Con UNA sola lectura sólo se pueden alcanzar dos resultados ("ok" o "medio"), así que para
     que el nivel del puesto se note hay que elegir un puntaje que caiga ENTRE los dos umbrales
     amarillos. Con la referencia del KSS en 6: nivel 5 → 6×0.70 = 4.2 ; nivel 1 → 6×0.95 = 5.7.
     Un 5 queda arriba del primero y abajo del segundo. Un 7 supera los dos y da "medio" en ambos,
     que es por qué el caso fallaba: estaba mal el caso, no el código. */
  const alto = api.recortarCicloServer([filaOp({ test: 'KSS', resultado: 5 })], [], filasNivel);
  const bajo = api.recortarCicloServer(
    [filaOp({ empresa: 'Otra', test: 'KSS', resultado: 5 })], [], filasNivel);
  PRUEBAS.igual(alto.operacional[0].nivel, 'medio',
    'en un puesto de nivel 5 la tolerancia es más estrecha: el mismo 5 ya está cerca del límite');
  PRUEBAS.igual(bajo.operacional[0].nivel, 'ok',
    'y en uno de nivel 1 el mismo 5 está bien — la referencia clínica NO se movió, la tolerancia sí');
});
