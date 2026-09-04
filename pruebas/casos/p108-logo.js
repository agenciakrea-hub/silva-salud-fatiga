
PRUEBAS.grupo('P108 · el logo se tiene que VER, no sólo medir');

/* ⚠️ EL DEFECTO NO ERA EL TAMAÑO DE LA CAJA, Y POR ESO AGRANDARLA NO ALCANZABA.
   `escudo360.svg` venía con `viewBox="0 0 160 160"` y el dibujo real ocupaba 96×95 centrado: el
   39,7% del archivo era aire vacío. Una caja de 92px dibujaba 55px de escudo, y una de 138px
   dibujaba 83. El dueño lo reportó como "no se ve y está como muy chico" — y tenía razón aunque
   la caja midiera el 36,8% del ancho de la pantalla.
   Se recortó el viewBox a `30 30 100 100`, medido con `getBBox()`, no a ojo.
   Este archivo fija las dos mitades: que el SVG no vuelva a traer aire, y que las cajas no se
   achiquen. La primera es la que importa: es invisible en cualquier revisión de CSS. */

const P108_AIRE_MAX = 8;   // % del viewBox que puede quedar sin dibujo

async function p108Svg(){
  const img = document.querySelector('.mas-hero .logo-box img');
  if (!img) return null;
  const txt = await fetch(img.src.split('?')[0] + '?p108=' + Date.now()).then(r => r.text());
  const cont = document.createElement('div');
  cont.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px;height:200px';
  cont.innerHTML = txt;
  document.body.appendChild(cont);
  const svg = cont.querySelector('svg');
  svg.setAttribute('width', '200'); svg.setAttribute('height', '200');
  await new Promise(r => setTimeout(r, 120));
  let bb = null; try { bb = svg.getBBox(); } catch(e){}
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  cont.remove();
  return (bb && vb.length === 4) ? { bb: bb, vb: vb } : null;
}

PRUEBAS.caso('⚠️ el SVG no trae aire vacío adentro', async () => {
  const d = await p108Svg();
  if (!d){ PRUEBAS.cierto(false, 'no se pudo medir el SVG — revisar a mano'); return; }
  const aire = 100 - (d.bb.width / d.vb[2] * 100);
  PRUEBAS.comoMucho(Math.round(aire), P108_AIRE_MAX,
    '⚠️ % del viewBox sin dibujo. Con 39,7% el logo se veía a la mitad de su caja');
});

PRUEBAS.caso('el dibujo está centrado en su viewBox', async () => {
  /* Recortar mal el viewBox descentra el escudo, y eso se nota más que el tamaño. */
  const d = await p108Svg();
  if (!d){ PRUEBAS.cierto(false, 'no se pudo medir'); return; }
  const cx = d.bb.x + d.bb.width / 2, cy = d.bb.y + d.bb.height / 2;
  PRUEBAS.comoMucho(Math.abs(cx - (d.vb[0] + d.vb[2] / 2)), 3, 'centrado horizontal');
  PRUEBAS.comoMucho(Math.abs(cy - (d.vb[1] + d.vb[3] / 2)), 3, 'centrado vertical');
});

PRUEBAS.caso('el logo de Ajustes no se achicó', () => {
  CTX.resetear({ esPiloto: true });
  mostrarVista('mas');
  const b = document.querySelector('.mas-hero .logo-box').getBoundingClientRect();
  PRUEBAS.alMenos(Math.round(b.width), 180, 'caja del logo en Ajustes');
  PRUEBAS.comoMucho(Math.round(b.width), Math.round(innerWidth - 16), 'y no se desborda de la pantalla');
});

PRUEBAS.caso('el logo del inicio no se achicó', () => {
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  try {
    ov.classList.add('show');
    const b = document.querySelector('.splash-logo').getBoundingClientRect();
    PRUEBAS.alMenos(Math.round(b.width), 110, 'caja del logo en la portada');
    PRUEBAS.comoMucho(Math.round(b.right), innerWidth, 'y no se sale por el costado');
  } finally { if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('el DISCRIMINADOR: la medición del aire detecta de verdad', async () => {
  /* R17: se arma el caso viejo —el viewBox de 160 con el dibujo de 96— y se confirma que la
     cuenta lo habría puesto en rojo. Sin esto, un "0% de aire" podría ser que no se midió nada. */
  const aireViejo = 100 - (96.4 / 160 * 100);
  PRUEBAS.cierto(Math.round(aireViejo) > P108_AIRE_MAX,
    '⚠️ con el viewBox viejo la prueba habría fallado (' + Math.round(aireViejo) + '% de aire)');
  const d = await p108Svg();
  if (!d){ PRUEBAS.cierto(false, 'no se pudo medir'); return; }
  PRUEBAS.comoMucho(Math.round(100 - (d.bb.width / d.vb[2] * 100)), P108_AIRE_MAX,
    'y con el actual pasa — o sea que discrimina, no da verde siempre');
});
