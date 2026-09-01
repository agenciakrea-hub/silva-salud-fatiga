
PRUEBAS.grupo('T2 · la evolución de todas las métricas');

/* LO QUE SE REPORTÓ: "siete líneas casi paralelas con leyenda de siete ítems: no se entiende.
   Rediseñarlo, no retocarlo."
   Se cambió de FORMA, no de colores: de un multi-línea a un panel de miniaturas, una por métrica,
   con su nombre escrito al lado. */

function t2Rows(mets, meses){
  const REF = { kss:6, estres:5, ansiedad:5, fatiga:7.3, gastro:4, depresion:4, cansancio:6 };
  const rows = [];
  for (let mes = 0; mes < meses; mes++){
    const f = '2026-' + String(mes + 1).padStart(2, '0') + '-15';
    for (let k = 0; k < 6; k++){
      const row = { fecha: f, persona: 'P' + k };
      mets.forEach((m, mi) => { row[m] = REF[m] * (0.85 + mes * 0.04 + mi * 0.03); });
      rows.push(row);
    }
  }
  return { rows, REF };
}

/* Pinta el panel con las métricas y meses pedidos y devuelve el contenedor. Deja DASH como estaba. */
function t2Pintar(mets, meses, fn){
  const previo = (typeof DASH !== 'undefined') ? DASH : null;
  const { rows, REF } = t2Rows(mets, meses);
  DASH = { metrics: mets, ref: REF, f:{}, _cfg:{}, rol:'supervisor', vista:'supervisor', pickEvo:'__all__' };
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  try {
    caja.innerHTML = dashEvoMulti(rows);
    return fn(caja);
  } finally { caja.remove(); DASH = previo; }
}

PRUEBAS.caso('⚠️ una celda por métrica, y ninguna línea encima de otra', () => {
  /* El problema de fondo del gráfico viejo: siete series en un mismo par de ejes, moviéndose casi
     en paralelo porque todas son "promedio ÷ su referencia". Seguir una con la vista era imposible.
     Ahora cada una tiene su propio cuadro. */
  const r = t2Pintar(['kss','estres','ansiedad','fatiga','gastro','depresion','cansancio'], 8, caja => ({
    celdas: caja.querySelectorAll('.evo-cel').length,
    graficos: caja.querySelectorAll('.evo-spark').length,
    lineasPorGrafico: [...caja.querySelectorAll('.evo-spark')]
      .map(s => s.querySelectorAll('path[stroke]:not([stroke="none"])').length)
  }));
  PRUEBAS.igual(r.celdas, 7, 'siete métricas, siete celdas');
  PRUEBAS.igual(r.graficos, 7, 'cada una con su propio gráfico');
  PRUEBAS.comoMucho(Math.max.apply(null, r.lineasPorGrafico), 1,
    'y UNA sola línea de datos por gráfico: si hubiera más, volvería el solapamiento que se vino a sacar');
});

PRUEBAS.caso('⚠️ se entiende sin color: la identidad la lleva el título, no la leyenda', () => {
  /* CASO BORDE DEL PLAN: "que se distinga en blanco y negro y para alguien con daltonismo — hoy
     depende sólo del color".
     La prueba de fondo es ésta: si se quitara todo el color, ¿se sigue sabiendo qué es cada línea?
     Con la leyenda vieja, no: había que emparejar un color de la leyenda con uno del gráfico entre
     seis parecidos. Con el nombre escrito en cada celda, sí. */
  const mets = ['kss','estres','ansiedad','fatiga','gastro','depresion','cansancio'];
  const r = t2Pintar(mets, 6, caja => ({
    titulos: [...caja.querySelectorAll('.evo-cel-t')].map(e => e.textContent.trim()),
    hayLeyenda: !!caja.querySelector('.radar-legend'),
    valores: [...caja.querySelectorAll('.evo-cel-v')].map(e => e.textContent.trim())
  }));
  PRUEBAS.igual(r.titulos.length, mets.length, 'cada celda dice de qué métrica es, con todas las letras');
  PRUEBAS.cierto(r.titulos.every(x => x && x.length > 1), 'y ningún título vacío: ' + r.titulos.join(', '));
  PRUEBAS.falso(r.hayLeyenda,
    'y ya no hay leyenda que obligue a ir y volver entre dos lugares para leer una línea');
  PRUEBAS.cierto(r.valores.every(v => /\d/.test(v)),
    'el estado también se dice con NÚMERO y palabras, no sólo pintando: ' + r.valores[0]);
});

PRUEBAS.caso('⚠️ la tendencia lleva flecha, no sólo color', () => {
  /* Una flecha se ve en blanco y negro y no depende de poder distinguir verde de rojo. El color
     refuerza; nunca es lo único que informa. Es la misma regla del semáforo de la app, que siempre
     lleva su etiqueta. */
  const r = t2Pintar(['kss','estres','fatiga'], 6, caja =>
    [...caja.querySelectorAll('.evo-tend')].map(e => e.textContent.trim()));
  PRUEBAS.alMenos(r.length, 1, 'con varios meses tiene que haber tendencia');
  PRUEBAS.cierto(r.every(x => /[↑↓→]/.test(x)),
    'y cada una tiene que traer su flecha: ' + r.join(' · '));
});

PRUEBAS.caso('cada celda dibuja SU línea de referencia', () => {
  /* La referencia es lo que le da sentido al número: "1,00" es estar justo en ella. La escala de
     cada celda incluye siempre el 1 — si no, una métrica que está toda por debajo dibujaría su
     referencia fuera del cuadro y parecería que no tiene. */
  const r = t2Pintar(['kss','estres','fatiga'], 5, caja =>
    [...caja.querySelectorAll('.evo-spark')].filter(s => s.querySelector('line')).length);
  PRUEBAS.igual(r, 3, 'las tres celdas tienen que mostrar su línea de referencia');
});

PRUEBAS.caso('con UNA sola métrica no se rompe', () => {
  /* CASO BORDE DEL PLAN. */
  const r = t2Pintar(['kss'], 6, caja => ({
    celdas: caja.querySelectorAll('.evo-cel').length,
    titulo: (caja.querySelector('.evo-cel-t') || {}).textContent,
    valor: (caja.querySelector('.evo-cel-v') || {}).textContent
  }));
  PRUEBAS.igual(r.celdas, 1, 'una métrica, una celda');
  PRUEBAS.cierto(!!r.titulo && !!r.valor, 'con su nombre y su valor, como cualquier otra');
});

PRUEBAS.caso('⚠️ con UN SOLO mes no se inventa una tendencia', () => {
  /* CASO BORDE DEL PLAN. Con un punto no hay "viene subiendo": decirlo igual sería inventar una
     lectura que el dato no soporta, que es peor que no decir nada. */
  const r = t2Pintar(['kss','estres','fatiga'], 1, caja => ({
    celdas: caja.querySelectorAll('.evo-cel').length,
    tendencias: caja.querySelectorAll('.evo-tend').length,
    valor: (caja.querySelector('.evo-cel-v') || {}).textContent
  }));
  PRUEBAS.igual(r.celdas, 3, 'las celdas se dibujan igual');
  PRUEBAS.igual(r.tendencias, 0, 'pero sin flecha de tendencia: con un punto no hay tendencia');
  PRUEBAS.cierto(/\d/.test(r.valor || ''), 'y el valor contra la referencia sí se puede decir');
});

PRUEBAS.caso('⚠️ los textos del panel pasan por t(), en los dos idiomas', () => {
  const faltan = [];
  ['evo_sobre_ref','evo_bajo_ref','evo_en_ref','evo_estable','evo_nota_ref'].forEach(k => {
    const v = t(k); if (!v || v === k) faltan.push(k);
  });
  PRUEBAS.igual(faltan, [], 'toda clave del panel tiene que resolver a texto de verdad (R14)');
  PRUEBAS.cierto(/\{p\}/.test(t('evo_sobre_ref')) || /%/.test(t('evo_sobre_ref')),
    'y el texto del valor tiene que poder llevar el número adentro');
});

PRUEBAS.caso('⚠️ ningún color escrito a mano en el panel', () => {
  /* R13. Los gráficos son el lugar donde más se cuela un color fijo, y es donde peor se nota: en
     tema oscuro una línea escrita a mano queda invisible o deslumbra. */
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  const i = js.indexOf('function dashEvoMini');
  const cuerpo = i >= 0 ? js.slice(i, i + 3200).replace(/\/\*[\s\S]*?\*\//g, '') : '';
  PRUEBAS.cierto(cuerpo.length > 0, 'tiene que encontrarse el cuerpo de la miniatura');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}/.test(cuerpo),
    'ningún color en crudo: todo por token, que es lo que hace que el modo oscuro salga solo');
});
