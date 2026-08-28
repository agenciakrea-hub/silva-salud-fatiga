/* ── L4 · aria-live, aria-expanded, foco en overlays y semáforo sin depender sólo del color ──────
   (2026-08-27)

   Todo esto es la capa que NO se ve mirando la pantalla: nada de lo que se prueba acá cambia
   cómo se ve la app para quien usa mouse o dedo. Se rompe en silencio y se nota únicamente con
   teclado o lector de pantalla — que es justo por lo que nadie lo había notado todavía. */

PRUEBAS.grupo('L4 · toast y aria-expanded');

PRUEBAS.caso('el toast se anuncia sin depender de estar mirando la pantalla', () => {
  const toast = document.getElementById('toast');
  PRUEBAS.igual(toast.getAttribute('role'), 'status', 'un lector de pantalla necesita el role para saber que es un aviso');
  PRUEBAS.igual(toast.getAttribute('aria-live'), 'polite',
    'sin esto, "tu reporte se guardó" sólo lo sabe quien esté mirando la pantalla en ese instante exacto');
});

PRUEBAS.caso('admToggle refleja su estado real', () => {
  CTX.resetear();
  mostrarVista('mas');
  const btn = document.getElementById('admBtn');
  const antes = btn.getAttribute('aria-expanded');
  admToggle();
  const abierto = btn.getAttribute('aria-expanded');
  admToggle();
  const cerrado = btn.getAttribute('aria-expanded');
  mostrarVista('inicio');
  PRUEBAS.igual(antes, 'false', 'arranca cerrado');
  PRUEBAS.igual(abierto, 'true', 'y avisa cuando se abre');
  PRUEBAS.igual(cerrado, 'false', 'y cuando se vuelve a cerrar');
});

PRUEBAS.grupo('L4 · foco en los overlays');

function conOverlay(id, fn) {
  return new Promise(resolve => {
    document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
    document.body.setAttribute('tabindex', '-1'); document.body.focus();
    const ov = document.getElementById(id);
    ov.classList.add('show');
    setTimeout(() => {
      Promise.resolve(fn(ov)).then(() => {
        ov.classList.remove('show');
        setTimeout(() => { document.body.removeAttribute('tabindex'); resolve(); }, 30);
      });
    }, 30);
  });
}

PRUEBAS.caso('al abrir, el foco se mueve DENTRO del overlay', () => {
  return conOverlay('gestionesOverlay', ov => {
    PRUEBAS.cierto(ov.contains(document.activeElement),
      'sin esto, tabulando desde donde estaba el foco se sigue en la pantalla de ATRÁS, tapada pero alcanzable');
  });
});

PRUEBAS.caso('Tab no puede salir del overlay abierto', () => {
  return conOverlay('gestionesOverlay', ov => {
    const enf = ovFocoEnfocables(ov);
    PRUEBAS.alMenos(enf.length, 1, 'tiene que haber algo enfocable para probar el atrapado');
    enf[enf.length - 1].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    PRUEBAS.igual(document.activeElement, enf[0], 'Tab desde el último tiene que volver al primero, no salir del overlay');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    PRUEBAS.igual(document.activeElement, enf[enf.length - 1], 'y Shift+Tab desde el primero al último');
  });
});

PRUEBAS.caso('al cerrar, el foco vuelve a quien lo abrió', () => {
  const trigger = document.createElement('button');
  trigger.textContent = 'disparador de prueba';
  document.body.appendChild(trigger);
  trigger.focus();
  const ov = document.getElementById('gestionesOverlay');
  ov.classList.add('show');
  return new Promise(resolve => setTimeout(() => {
    ov.classList.remove('show');
    setTimeout(() => {
      PRUEBAS.igual(document.activeElement, trigger,
        'sin esto, después de cerrar cualquier overlay el foco queda perdido en el documento');
      trigger.remove();
      resolve();
    }, 30);
  }, 30));
});

PRUEBAS.caso('con dos overlays abiertos a la vez, cada cierre vuelve al disparador correcto', () => {
  /* El caso real: `recuperarAbrir()` abre su overlay SIN cerrar `setup` primero. Es la razón por
     la que esto tiene que ser una PILA. Encontré un bug propio acá: mi primera versión devolvía
     el foco al disparador del overlay de ABAJO en vez de al del que se estaba cerrando — cerrar
     "recuperar" mandaba el foco al body en vez de al botón dentro de "setup". */
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  document.body.setAttribute('tabindex', '-1'); document.body.focus();
  const setup = document.getElementById('setup'), rec = document.getElementById('recuperarOv');
  setup.classList.add('show');
  return new Promise(resolve => setTimeout(() => {
    const disparadorDeRec = ovFocoEnfocables(setup)[0];
    disparadorDeRec.focus();
    rec.classList.add('show');
    setTimeout(() => {
      PRUEBAS.cierto(rec.contains(document.activeElement), 'con los dos abiertos, el foco tiene que estar en el de ARRIBA');
      rec.classList.remove('show');
      setTimeout(() => {
        PRUEBAS.igual(document.activeElement, disparadorDeRec,
          'al cerrar el de arriba, el foco vuelve al botón que lo abrió — no al body, no a otro disparador');
        setup.classList.remove('show');
        setTimeout(() => {
          PRUEBAS.igual(document.activeElement, document.body, 'y al cerrar el último, vuelve a donde estaba antes de todo');
          document.body.removeAttribute('tabindex');
          resolve();
        }, 30);
      }, 30);
    }, 30);
  }, 30));
});

PRUEBAS.grupo('L4 · el semáforo no depende sólo del color');

PRUEBAS.caso('cada nivel tiene un glyph, no sólo un color de fondo', () => {
  const cont = document.createElement('div');
  cont.innerHTML = ['ok', 'medio', 'alto', 'sin'].map(n => '<span class="apt-box apt-' + n + '"><i></i></span>').join('');
  document.body.appendChild(cont);
  const vacios = [];
  [...cont.querySelectorAll('.apt-box')].forEach(box => {
    const contenido = getComputedStyle(box.querySelector('i'), '::before').content;
    if (!contenido || contenido === 'none' || contenido === '""') vacios.push(box.className);
  });
  cont.remove();
  PRUEBAS.igual(vacios, [],
    'sin un glyph, alguien con daltonismo no distingue "cerca del límite" de "por encima" si el color no le alcanza');
});

PRUEBAS.caso('el glyph se lee contra su fondo, en los dos temas — incluido "sin"', () => {
  /* "sin" (sin datos) es el caso delicado: usa opacity en el punto de la leyenda, y ese mismo
     mecanismo atenuaría también el glyph si se reusara tal cual. Se verifica con un muestreo de
     píxeles reales (canvas), porque el fondo sale de un color-mix() que un parser de texto no
     puede leer de forma confiable. */
  const L = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
  const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
  const temaPrevio = temaGuardado();
  const flojos = [];
  ['claro', 'oscuro'].forEach(tema => {
    fijarTema(tema);
    ['ok', 'medio', 'alto', 'sin'].forEach(niv => {
      const cont = document.createElement('div');
      cont.style.cssText = 'position:fixed;left:-9999px;top:0';
      cont.innerHTML = '<span class="apt-box apt-' + niv + '"><i></i></span>';
      document.body.appendChild(cont);
      const box = cont.querySelector('.apt-box'), i = cont.querySelector('i');
      const r = i.getBoundingClientRect();
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(r.width)); cv.height = Math.max(1, Math.ceil(r.height));
      const ctx = cv.getContext('2d');
      ctx.fillStyle = getComputedStyle(box).backgroundColor; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = getComputedStyle(i).backgroundColor; ctx.fillRect(0, 0, cv.width, cv.height);
      const p = ctx.getImageData(Math.floor(cv.width / 2), Math.floor(cv.height / 2), 1, 1).data;
      cont.remove();
      const c = ratio([26, 26, 26], [p[0], p[1], p[2]]);
      if (c < 3) flojos.push(tema + ' ' + niv + ' = ' + c);
    });
  });
  fijarTema(temaPrevio || 'claro');
  PRUEBAS.igual(flojos, [], 'WCAG 1.4.11 pide 3:1 para un elemento gráfico (no es texto, el piso es más bajo que 4.5)');
});
