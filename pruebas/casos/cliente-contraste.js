/* ── Contraste en los DOS temas (R13) ───────────────────────────────────────────────────────────
   (L2c · automatiza la auditoría que hoy se corre a mano cada vez que se toca un color)

   DE DÓNDE VIENE
   El 2026-08-06 el modo oscuro estaba roto: líneas invisibles, cajas blancas, texto ilegible.
   Había ~400 colores escritos a mano. En I6 hubo que bajar de 111 textos por debajo del mínimo a
   0. Ese barrido se corría a mano, y nada impide que el próximo color escrito a mano lo vuelva a
   romper — de hecho J7 encontró uno más (el botón de idioma, a 1.94:1).

   EL DETECTOR DE FONDO ES LA PARTE DELICADA. Ya me falló dos veces:
     · miraba sólo `backgroundColor` y con un DEGRADADO veía "transparente" y seguía subiendo,
       hasta dar con un fondo que no era el real (me pasó en I6 y otra vez en J7);
     · por eso acá, si un ancestro tiene un `background-image`, el caso se SALTEA ese elemento en
       vez de inventar un número. Un salteo honesto es mejor que un verde falso. */

PRUEBAS.grupo('Cliente · contraste');

const MINIMO = 4.5;         // WCAG AA para texto normal
const MINIMO_GRANDE = 3;    // texto grande (>= 24px, o >= 18.66px en negrita)

/* Devuelve el fondo real detrás de un elemento, o `null` si no se puede saber con certeza. */
function fondoReal(e) {
  let n = e;
  while (n && n !== document.documentElement) {
    const cs = getComputedStyle(n);
    /* Un degradado o una imagen: no se puede reducir a un color. Se devuelve null y el caso
       saltea el elemento — es lo que evita el falso positivo que ya me comí dos veces. */
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
    const b = cs.backgroundColor;
    if (b && !/rgba\(0, 0, 0, 0\)/.test(b) && !/transparent/.test(b)) {
      /* Un fondo semitransparente tampoco es concluyente sin componer toda la pila. */
      const m = b.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(',').map(s => parseFloat(s));
        if (p.length > 3 && p[3] < 0.99) return null;
      }
      return b;
    }
    n = n.parentElement;
  }
  return getComputedStyle(document.documentElement).backgroundColor || 'rgb(255,255,255)';
}

function esGrande(cs) {
  const px = parseFloat(cs.fontSize);
  const peso = parseInt(cs.fontWeight, 10) || 400;
  return px >= 24 || (px >= 18.66 && peso >= 700);
}

/* Barre los textos visibles de una raíz y devuelve los que no llegan al mínimo. */
function textosFlojos(raiz) {
  const malos = [], salteados = [];
  raiz.querySelectorAll('*').forEach(e => {
    /* Sólo elementos con texto PROPIO: si no, se contaría el mismo texto una vez por ancestro. */
    const propio = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!propio) return;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.1) return;
    const fondo = fondoReal(e);
    if (!fondo) { salteados.push(String(e.className).split(' ')[0] || e.tagName); return; }
    const ratio = CTX.contraste(cs.color, fondo);
    const min = esGrande(cs) ? MINIMO_GRANDE : MINIMO;
    if (ratio < min) {
      malos.push((String(e.className).split(' ')[0] || e.tagName) + ' ' + ratio + ':1 (min ' + min + ')');
    }
  });
  return { malos, salteados: [...new Set(salteados)] };
}

['claro', 'oscuro'].forEach(tema => {
  PRUEBAS.caso('el inicio se lee en tema ' + tema, () => {
    const temaPrevio = temaGuardado();
    CTX.resetear();
    fijarTema(tema);
    const r = textosFlojos(document.getElementById('viewInicio'));
    fijarTema(temaPrevio || 'claro');
    PRUEBAS.igual(r.malos, [],
      'texto por debajo del mínimo en tema ' + tema + ': el modo oscuro ya estuvo roto una vez con ~400 colores a mano (R13)');
  });

  PRUEBAS.caso('los ajustes se leen en tema ' + tema, () => {
    const temaPrevio = temaGuardado();
    CTX.resetear();
    fijarTema(tema);
    mostrarVista('mas');
    const r = textosFlojos(document.getElementById('viewMas'));
    fijarTema(temaPrevio || 'claro');
    mostrarVista('inicio');
    PRUEBAS.igual(r.malos, [], 'texto por debajo del mínimo en Ajustes, tema ' + tema);
  });
});

PRUEBAS.caso('no quedan superficies claras en tema oscuro', () => {
  /* El síntoma más visible de cuando el modo oscuro se rompió: cajas blancas sobre fondo oscuro.
     Se detecta al revés que el contraste: buscando fondos con luminancia alta. */
  const temaPrevio = temaGuardado();
  CTX.resetear();
  fijarTema('oscuro');
  const claras = [];
  document.querySelectorAll('#viewInicio *').forEach(e => {
    const r = e.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) return;      // muy chico: es un chip o un ícono
    const b = getComputedStyle(e).backgroundColor;
    if (!b || /rgba\(0, 0, 0, 0\)/.test(b)) return;
    /* ⚠️ Un fondo SEMITRANSPARENTE no es una superficie clara aunque su color sea blanco:
       `rgba(255,255,255,.2)` sobre un fondo oscuro compone un gris oscuro, que es justo el recurso
       que usa la app para los íconos. La primera versión de este caso los marcaba a todos como
       falla — era mi detector el que estaba mal, no la app. Se saltean: para juzgarlos habría que
       componer toda la pila, y un salteo honesto es mejor que una falla inventada. */
    const m = b.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map(s => parseFloat(s));
      if (p.length > 3 && p[3] < 0.99) return;
    }
    /* Contra el negro: si el fondo OPACO contrasta muchísimo con negro, es una superficie clara. */
    if (CTX.contraste(b, 'rgb(0,0,0)') > 12) {
      claras.push((String(e.className).split(' ')[0] || e.tagName) + ' ' + b);
    }
  });
  fijarTema(temaPrevio || 'claro');
  PRUEBAS.igual(claras, [],
    'una caja clara en modo oscuro encandila de noche, que es justo cuando se usa en un turno nocturno');
});
