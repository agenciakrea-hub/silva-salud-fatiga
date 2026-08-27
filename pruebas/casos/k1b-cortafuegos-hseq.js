/* ── K1b · el cortafuegos de Dirección/HSEQ ─────────────────────────────────────────────────────
   (2026-08-27)

   EL CONTRATO, escrito en la propia app: "agregados de la organización, trazabilidad y costos.
   No muestra datos clínicos ni valores individuales." Seis de sus siete pestañas lo cumplían; la
   de Ciclo operativo mostraba nombres y dejaba entrar al detalle de cada persona.

   Estos casos existen porque **así es como se rompe**: alguien agrega un campo al payload, o un
   dato nuevo a la pestaña del ciclo, y los nombres vuelven. No falla nada, no hay error en
   consola, y en pantalla se ve bien — la fuga está en la respuesta de red.

   Se prueban las DOS mitades, porque una sola no alcanza:
     · que el nombre no se ENVÍE (servidor), y
     · que la pantalla no dependa de él (cliente).
   Con sólo la primera, el cliente pintaría "P1" y quedaría feo pero seguro. Con sólo la segunda,
   el nombre viajaría igual y se leería desde las herramientas del navegador. */

PRUEBAS.grupo('K1b · HSEQ no recibe nombres');

const NOMBRES_REALES = ['Ana Pérez', 'Luis Gómez'];
function payloadDePrueba() {
  return {
    registros: [
      { persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto' },
      { persona: 'Luis Gómez', empresa: 'Helitec', departamento: 'Mantenimiento', cargo: 'Técnico' },
      { persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto' }
    ],
    aptitud: [{ nombre: 'Ana Pérez', dep: 'Operaciones', n: 3 }, { nombre: 'Luis Gómez', dep: 'Mantenimiento', n: 1 }],
    operacional: [{ persona: 'Ana Pérez', test: 'KSS', nivel: 'medio' }, { persona: 'Luis Gómez', test: 'KSS', nivel: 'ok' }],
    turnos: [{ persona: 'Ana Pérez', tipo: 'checkin', kssNivel: 'ok', carga: null }]
  };
}
function anonimizado() {
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['anonimizarHseq']);
  const p = payloadDePrueba();
  return api.anonimizarHseq(p.registros, p.aptitud, p.operacional, p.turnos);
}

PRUEBAS.caso('ningún nombre real sobrevive en el payload', () => {
  /* Se busca en el JSON entero y por PEDAZOS del nombre, no por el nombre completo: si mañana
     alguien deja el apellido suelto en un campo nuevo, esto también lo agarra. */
  const texto = JSON.stringify(anonimizado());
  const fuga = ['Ana', 'Pérez', 'Perez', 'Luis', 'Gómez', 'Gomez'].filter(n => texto.indexOf(n) >= 0);
  PRUEBAS.igual(fuga, [],
    'con la contraseña de Dirección se leería la nómina entera desde las herramientas del navegador');
});

PRUEBAS.caso('el cruce entre los arreglos se mantiene', () => {
  /* Si el id no fuera consistente entre `registros` y `aptitud`, los agregados de HSEQ se
     quedarían en cero y la consola diría que no hay datos. Anonimizar no puede romper el join. */
  const r = anonimizado();
  PRUEBAS.cierto(r.aptitud.every(a => r.registros.some(x => x.persona === a.nombre)),
    'aptitud y registros se cruzan por este campo: sin eso los agregados dan cero');
  PRUEBAS.igual(r.registros[0].persona, r.registros[2].persona,
    'las dos filas de la misma persona tienen que compartir id, o se contaría dos veces');
  PRUEBAS.falso(r.registros[0].persona === r.registros[1].persona,
    'y dos personas distintas no pueden compartirlo, o se contarían como una');
});

PRUEBAS.caso('lo que NO identifica se conserva', () => {
  /* El recorte tiene que ser quirúrgico: si se llevara puesto el nivel o el departamento, los
     agregados perderían justamente la información que Dirección sí tiene que ver. */
  const r = anonimizado();
  PRUEBAS.igual(r.operacional[0].nivel, 'medio', 'el semáforo de K1a tiene que seguir viajando');
  PRUEBAS.igual(r.registros[0].departamento, 'Operaciones', 'el departamento no es un identificador directo');
  PRUEBAS.igual(r.turnos[0].kssNivel, 'ok', 'y el nivel del turno también sigue');
});

PRUEBAS.grupo('K1b · la pantalla del ciclo por rol');

function ciclePara(vista) {
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  DASH = {
    vista: vista, rol: 'empresa', tabs: ['ciclo'], tab: 'ciclo', f: {}, _cfg: {}, empresa: 'Helitec',
    referencia: { kss: 6, fatiga: 7.3 }, metricas: ['kss'], config: {}, marca: null,
    comentarios: [], pvt: [], aptitud: [], turnos: [],
    operacional: [
      { persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto',
        fecha: '2026-08-27', hora: '06:00', campo: 'salida_casa' },
      { persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto',
        fecha: '2026-08-27', hora: '07:00', campo: 'llegada_aero', test: 'KSS', nivel: 'medio' }
    ],
    registros: [{ persona: 'Ana Pérez', empresa: 'Helitec', departamento: 'Operaciones', cargo: 'Piloto' }]
  };
  let html = '';
  try { html = renderCicloOperativo(); } catch (e) { html = 'ERROR: ' + e.message; }
  const cicNames = DASH._cicNames;
  DASH = previo;
  return { html: html, cicNames: cicNames };
}

PRUEBAS.caso('HSEQ ve el agregado, no las personas', () => {
  const r = ciclePara('hseq');
  PRUEBAS.falso(/Ana P/.test(r.html), 'no puede aparecer ningún nombre');
  PRUEBAS.falso(/cic-card/.test(r.html), 'ni una tarjeta por persona');
  PRUEBAS.cierto(/hs-row/.test(r.html), 'sí las filas agregadas, con la misma forma que sus otras pestañas');
  PRUEBAS.falso(/dashGoPerson/.test(r.html),
    'y no puede haber forma de entrar al detalle de nadie: el nombre no está, pero el camino tampoco');
  PRUEBAS.falso(!!(r.cicNames && r.cicNames.length),
    '_cicNames guarda la lista de nombres para los clics; en esta vista no debe ni armarse');
});

PRUEBAS.caso('el supervisor NO pierde nada', () => {
  /* El contrapeso. Un cortafuegos que además rompe la pantalla del supervisor no sirve: él
     necesita el nombre justamente para saber a quién reasignar. */
  const r = ciclePara('supervisor');
  PRUEBAS.cierto(/Ana P/.test(r.html), 'el supervisor sí ve el nombre: lo necesita para reasignar tareas');
  PRUEBAS.cierto(/cic-card/.test(r.html), 'y sus tarjetas por persona');
  PRUEBAS.cierto(/dashGoPerson/.test(r.html), 'y poder entrar al detalle');
});

PRUEBAS.caso('el texto del agregado está traducido en los dos idiomas', () => {
  const previo = idiomaActual();
  const vistas = {};
  ['es', 'en'].forEach(l => { fijarIdioma(l); vistas[l] = ciclePara('hseq').html; });
  fijarIdioma(previo);
  PRUEBAS.falso(/cic_hseq_/.test(vistas.es + vistas.en),
    'una clave sin traducir se imprime cruda en pantalla (R14)');
  PRUEBAS.falso(vistas.es === vistas.en,
    'los dos idiomas no pueden dar el mismo HTML: querría decir que el texto está escrito a mano');
});
