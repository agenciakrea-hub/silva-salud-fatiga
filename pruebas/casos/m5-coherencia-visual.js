/* ── M5 · Coherencia visual del inicio ──────────────────────────────────────────────────────────
   (2026-08-27)

   Todo lo que hay acá salió de MEDIR, no de mirar. Son propiedades que no rompen nada al
   romperse: nadie ve un error, sólo una pantalla que se siente hecha por partes distintas. Por eso
   quedan como prueba: es el tipo de cosa que se vuelve a desalinear sola con el próximo cambio. */

PRUEBAS.grupo('M5 · un solo radio para las tarjetas');

PRUEBAS.caso('las tarjetas del inicio comparten radio', () => {
  /* Antes había CUATRO valores para piezas que están una debajo de la otra: 18 (tile, rbtn,
     act-card), 16 (ini-estado), 14 (cic-mio-linea) y 12 en algunos íconos. Existiendo `--radius`,
     cada número escrito a mano es una decisión que nadie tomó. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const radios = {};
  document.querySelectorAll('#viewInicio .tile, #viewInicio .rbtn, #viewInicio .act-card, #viewInicio .ini-estado, #viewInicio .cic-mio-linea, #viewInicio .install')
    .forEach(e => {
      const r = getComputedStyle(e).borderRadius;
      (radios[r] = radios[r] || []).push(String(e.className).split(' ')[0]);
    });
  PRUEBAS.igual(Object.keys(radios).length, 1,
    'tarjetas del mismo rol con radios distintos hacen que la pantalla se vea hecha por partes: ' +
    Object.keys(radios).map(r => r + ' (' + [...new Set(radios[r])].join(',') + ')').join(' · '));
});

PRUEBAS.caso('el radio de un ícono es proporcional a su tamaño', () => {
  /* Acá me equivoqué al escribir la prueba antes que al escribir el CSS: había puesto que TODOS los
     íconos cuadrados compartieran radio, y falló mostrando 13 px y 9 px. Mirado de cerca, los de
     13 miden 42-44 px y los de 9 miden 30: 13/42 = 0.31 y 9/30 = 0.30. No era una inconsistencia,
     era una escala — y una escala es justamente lo que uno quiere.
     Lo que sí estaba mal es que el 9 no tenía nombre: aparecía escrito a mano en 15 reglas. Ahora
     es `--radius-xs`. Lo que se comprueba entonces es lo correcto: que dos íconos DEL MISMO TAMAÑO
     no tengan radios distintos, y que la proporción se mantenga entre escalones. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const porTam = {};
  document.querySelectorAll('#viewInicio .ic').forEach(e => {
    const r = getComputedStyle(e).borderRadius;
    if (r.indexOf('%') >= 0) return;                 // los círculos son otro rol
    const lado = Math.round(e.getBoundingClientRect().width);
    (porTam[lado] = porTam[lado] || new Set()).add(r);
  });
  const mezclados = Object.keys(porTam)
    .filter(lado => porTam[lado].size > 1)
    .map(lado => lado + ' px con radios ' + [...porTam[lado]].join(' y '));
  PRUEBAS.igual(mezclados, [], 'dos íconos del mismo tamaño con radios distintos sí es un descuido');

  const props = Object.keys(porTam).map(lado => parseFloat([...porTam[lado]][0]) / Number(lado));
  const dif = Math.max.apply(null, props) - Math.min.apply(null, props);
  PRUEBAS.comoMucho(dif, 0.05,
    'los escalones tienen que guardar la misma proporción, o el ícono chico se ve más cuadrado que el grande');
});

PRUEBAS.caso('el escalón chico de la escala tiene nombre', () => {
  /* 9 px estaba escrito a mano en 15 reglas. Un número repetido sin nombre es un número que la
     próxima persona cambia en 3 lugares de 15. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  PRUEBAS.cierto(/--radius-xs:\s*9px/.test(fuente), 'el token tiene que existir');
  PRUEBAS.igual((fuente.match(/border-radius:\s*9px/g) || []).length, 0,
    'y no tiene que quedar ninguno escrito a mano');
});

PRUEBAS.grupo('M5 · la entrada sigue el orden de la pantalla');

PRUEBAS.caso('nada entra antes que lo que tiene arriba', () => {
  /* Las animaciones ya eran coherentes (todas `fadeUp`, con una escalera 0 → .05 → .07 → .1), pero
     `.install` estaba en el primer escalón y en pantalla va DEBAJO del saludo: el banner aparecía
     antes que lo que está arriba de él. Se lee raro sin que se pueda señalar qué está mal. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.remove('sin-animaciones');
  _iniYaEntro = false;
  renderSections();
  const orden = [];
  document.querySelectorAll('#viewInicio *').forEach(e => {
    const cs = getComputedStyle(e);
    if (cs.animationName && cs.animationName !== 'none') {
      orden.push({ el: String(e.className).split(' ')[0], d: parseFloat(cs.animationDelay), y: e.getBoundingClientRect().top });
    }
  });
  if (tenia) document.documentElement.classList.add('sin-animaciones');
  orden.sort((a, b) => a.y - b.y);
  const fuera = [];
  for (let i = 1; i < orden.length; i++) {
    if (orden[i].d < orden[i - 1].d) fuera.push(orden[i].el + ' entra antes que ' + orden[i - 1].el + ', y va debajo');
  }
  PRUEBAS.igual(fuera, [], 'la entrada tiene que seguir el orden en que se lee la pantalla');
});

PRUEBAS.caso('todas usan la misma animación', () => {
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.remove('sin-animaciones');
  _iniYaEntro = false;
  renderSections();
  const nombres = new Set();
  document.querySelectorAll('#viewInicio *').forEach(e => {
    const n = getComputedStyle(e).animationName;
    if (n && n !== 'none') nombres.add(n);
  });
  if (tenia) document.documentElement.classList.add('sin-animaciones');
  PRUEBAS.comoMucho(nombres.size, 1,
    'dos animaciones de entrada distintas en la misma pantalla se notan aunque nadie sepa decir por qué: ' + [...nombres].join(', '));
});

PRUEBAS.grupo('M5 · simetría y áreas de toque');

PRUEBAS.caso('las tarjetas de una misma fila miden lo mismo', () => {
  /* La grilla del inicio es de dos columnas. Si dos tarjetas de la misma fila tienen alturas
     distintas, la retícula se ve rota aunque cada tarjeta esté bien. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const filas = {};
  document.querySelectorAll('#sections .item').forEach(e => {
    const r = e.getBoundingClientRect();
    const y = Math.round(r.top);
    (filas[y] = filas[y] || []).push(Math.round(r.height));
  });
  const desparejas = Object.keys(filas)
    .filter(y => new Set(filas[y]).size > 1)
    .map(y => 'alturas ' + filas[y].join(' / '));
  PRUEBAS.igual(desparejas, [], 'una fila con tarjetas de distinto alto rompe la retícula');
});

PRUEBAS.caso('ningún objetivo de toque queda por debajo de 44 px', () => {
  /* Se usa con guantes, en un hangar, a veces de noche. Ya estaba bien; queda fijo para que un
     cambio de padding no lo baje sin que nadie lo note. */
  CTX.resetear({ cargo: 'Piloto', esPiloto: true });
  const chicos = [];
  document.querySelectorAll('#viewInicio button, #viewInicio a[href]').forEach(b => {
    const r = b.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.height < 44 || r.width < 44) chicos.push((String(b.className).split(' ')[0] || b.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  PRUEBAS.igual([...new Set(chicos)], [], 'con guantes, menos de 44 px es un toque que no entra');
});

PRUEBAS.grupo('M5 · lo que sólo se ve mirando');

PRUEBAS.caso('⚠️ en oscuro el mapa de actividad no está dado vuelta', () => {
  /* Esto no lo encontró ninguna medición: lo encontré MIRANDO la captura en tema oscuro, que era
     la primera vez que se miraba. Las cuatro intensidades estaban escritas a mano (R13), o sea
     iguales en los dos temas, y sobre fondo oscuro la escala quedaba invertida: l1 daba 13.02 de
     contraste y l4 daba 4.57. El día en que la persona más registró era el que MENOS se veía.
     Y el texto de ayuda, arriba de la grilla, dice "mientras más oscuro, más hiciste ese día". */
  const lum = c => { const m = (c.match(/[\d.]+/g) || [0,0,0]).map(Number);
    const f = x => { x = x/255; return x <= .03928 ? x/12.92 : Math.pow((x + .055)/1.055, 2.4); };
    return .2126*f(m[0]) + .7152*f(m[1]) + .0722*f(m[2]); };
  const ct = (a, b) => { const A = lum(a), B = lum(b);
    return (Math.max(A,B) + .05) / (Math.min(A,B) + .05); };

  const tema0 = document.documentElement.getAttribute('data-tema');
  const roto = [];
  ['claro', 'oscuro'].forEach(tema => {
    document.documentElement.setAttribute('data-tema', tema);
    const card = document.querySelector('.act-card') || document.querySelector('#viewInicio .card');
    if (!card) return;
    const fondo = getComputedStyle(card).backgroundColor;
    const d = document.createElement('div'); card.appendChild(d);
    const esc = ['', 'l1', 'l2', 'l3', 'l4'].map(cl => {
      d.className = 'act-d' + (cl ? ' ' + cl : '');
      return ct(getComputedStyle(d).backgroundColor, fondo);
    });
    d.remove();
    for (let i = 1; i < esc.length; i++) {
      if (esc[i] <= esc[i - 1]) {
        roto.push(tema + ': el escalón ' + i + ' (' + esc[i].toFixed(2) +
          ') no resalta más que el anterior (' + esc[i - 1].toFixed(2) + ')');
      }
    }
  });
  if (tema0) document.documentElement.setAttribute('data-tema', tema0);
  PRUEBAS.igual(roto, [],
    'más actividad tiene que verse MÁS, en los dos temas: si no, el gráfico dice lo contrario de lo que pasó');
});

PRUEBAS.caso('no quedan colores del mapa escritos a mano', () => {
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  const aMano = (fuente.match(/\.act-d\.l\d\s*\{[^}]*#[0-9a-fA-F]{3,6}/g) || []);
  PRUEBAS.igual(aMano, [], 'un color fijo es el mismo en los dos temas, y eso fue exactamente el bug (R13)');
});

PRUEBAS.caso('no dice "1 días seguidos"', () => {
  /* Estaba a la vista desde J4 y ninguna medición lo iba a encontrar: la cadena era correcta como
     plantilla, sólo que sin caso singular. La app ya lo resuelve así en otros seis lugares. */
  PRUEBAS.igual(t('ini_racha_v_1'), '1 día seguido', 'tiene que existir la forma singular en español');
  const fuente = rachaPintar.toString();
  PRUEBAS.cierto(/n === 1 \? 'ini_racha_v_1'/.test(fuente),
    'y hay que usarla: si no, el singular queda escrito y nadie lo llama');
});

PRUEBAS.caso('el texto de ayuda del mapa vale en los dos temas', () => {
  /* Consecuencia del arreglo anterior, y por poco se me pasa: la frase decía "mientras más oscuro,
     más hiciste ese día". En claro es cierta; en oscuro, con la rampa ya corregida, más actividad
     es más BRILLANTE, así que la frase pasó a decir exactamente lo contrario de lo que muestra el
     gráfico. Un arreglo que deja mintiendo al texto de al lado no es un arreglo. */
  const ayuda = t('act_ayuda') || '';
  PRUEBAS.falso(/más oscuro|darker/i.test(ayuda),
    'la explicación no puede hablar de claro/oscuro: eso cambia con el tema');
  PRUEBAS.cierto(/más fuerte|stronger/i.test(ayuda),
    'tiene que describir la intensidad, que es lo único cierto en los dos temas');
});

PRUEBAS.caso('⚠️ el contador de notificaciones se lee en los DOS temas', () => {
  /* Lo encontró el auditor de contraste al repasar M5, y es de los que más duelen: el globito usaba
     `--sem-rojo` de fondo, y en oscuro ese token vale #ff8a86 — un rojo CLARO, pensado para TEXTO
     sobre fondo oscuro. Usado como relleno con el número blanco encima daba 2.27:1, cuando con
     10.56 px y peso 900 hace falta 4.5. El contador que se agregó justamente para ver las tareas
     sin entrar, en tema oscuro no se leía.
     La lección es la de siempre acá: un token de TINTA no sirve como RELLENO. Por eso ahora es un
     par invariante (--badge-fill / --badge-ink), igual que --sev-fill-* y --entrada-chip. */
  const lum = c => { const m = (c.match(/[\d.]+/g) || [0,0,0]).map(Number);
    const f = x => { x = x/255; return x <= .03928 ? x/12.92 : Math.pow((x + .055)/1.055, 2.4); };
    return .2126*f(m[0]) + .7152*f(m[1]) + .0722*f(m[2]); };
  const ct = (a, b) => { const A = lum(a), B = lum(b);
    return (Math.max(A,B) + .05) / (Math.min(A,B) + .05); };

  const tema0 = document.documentElement.getAttribute('data-tema');
  const flojos = [];
  ['claro', 'oscuro'].forEach(tema => {
    document.documentElement.setAttribute('data-tema', tema);
    const b = document.getElementById('tareasBadge');
    if (!b) return;
    const cs = getComputedStyle(b);
    const c = ct(cs.color, cs.backgroundColor);
    if (c < 4.5) flojos.push(tema + ': ' + c.toFixed(2) + ':1');
  });
  if (tema0) document.documentElement.setAttribute('data-tema', tema0);
  PRUEBAS.igual(flojos, [],
    'el número tiene que leerse sobre su propio relleno en los dos temas (10.56 px y peso 900 son texto chico: mínimo 4.5)');
});

PRUEBAS.caso('el globito no tiene colores escritos a mano', () => {
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  const regla = (fuente.match(/\.hh-badge\s*\{[^}]*\}/) || [''])[0];
  PRUEBAS.falso(/#[0-9a-fA-F]{3,6}/.test(regla),
    'un color fijo vale igual en los dos temas, y eso fue exactamente el bug (R13): ' + regla.slice(0, 120));
});

PRUEBAS.grupo('N8 · tira de presentación del splash');

PRUEBAS.caso('⚠️ el arranque no rompe el script (TDZ)', () => {
  /* Esta prueba existe por un error que cometí escribiéndola: declaré el estado con `let`, y el
     arranque llama a `splashMostrar()` desde el nivel superior ANTES de llegar a esa línea. Un
     `let` leído en zona muerta tira "Cannot access before initialization", y eso **corta la
     ejecución de todo el script de ahí para abajo** — no rompe una función, rompe media app.
     Se comprueba mirando algo declarado DESPUÉS de la tira: si sigue existiendo, no se cortó. */
  PRUEBAS.igual(typeof splashAnimArrancar, 'function', 'la tira tiene que existir');
  PRUEBAS.igual(typeof splashAnimFrenar, 'function', 'y su freno también');
  PRUEBAS.igual(typeof carruselPintar, 'function',
    'esta se declara DESPUÉS: si falta, el script se cortó en el medio y media app no existe');
});

PRUEBAS.caso('la secuencia se lee del DOM, no está escrita en el código', () => {
  /* Es lo que hace que agregar la tercera pantalla sea meter un <video> en la slide vacía y nada
     más. Si las duraciones estuvieran escritas en el JS, se desincronizarían el día que se
     reexporte un clip medio segundo más largo. */
  const fuente = splashAnimArrancar.toString();
  PRUEBAS.cierto(/querySelectorAll\('\.splash-anim-slide'\)/.test(fuente),
    'las pantallas se leen del DOM');
  PRUEBAS.cierto(/onended/.test(fuente),
    'se espera a que el video TERMINE, no a una cantidad de segundos escrita a mano');
  PRUEBAS.cierto(/dataset\.espera/.test(fuente),
    'y la pantalla vacía espera lo que diga su data-espera');
});

PRUEBAS.caso('las tres pantallas tienen su animación', () => {
  /* La tercera llegó y ocupó el hueco que estaba reservado. Se comprueba que ya no quede ninguna
     slide vacía: una slide sin video y sin `data-espera` frenaría la rotación para siempre. */
  const slides = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide')];
  PRUEBAS.igual(slides.length, 3, 'las tres del recorrido');
  const huerfanas = slides
    .map((sl, i) => (!sl.querySelector('video') && !sl.dataset.espera) ? ('la ' + (i + 1)) : null)
    .filter(Boolean);
  PRUEBAS.igual(huerfanas, [],
    'una slide sin video y sin data-espera deja la tira clavada ahí para siempre');
});

PRUEBAS.caso('⚠️ los clips van en MP4, no en WebM con alfa', () => {
  /* Safari/iOS NO reproduce WebM con canal alfa, y esta app ofrece sincronizar con Apple Health:
     hay iPhones sí o sí. Con los WebM la tira quedaba en blanco en todos ellos.
     Además, medido: en los WebM el título de dos de los tres clips venía como tinta oscura sobre
     transparente, o sea navy sobre navy — ilegible. En MP4 el fondo es opaco y se leen los tres.
     Y pesan menos: 1,69 MB contra 1,93. */
  const vids = [...document.querySelectorAll('#splashAnimTrack video')];
  PRUEBAS.alMenos(vids.length, 3, 'tienen que estar los tres');
  const webm = vids.map(v => v.getAttribute('src')).filter(s => /\.webm$/i.test(s || ''));
  PRUEBAS.igual(webm, [], 'ninguno puede ser WebM: en iPhone no se vería nada');
});

PRUEBAS.caso('sólo baja el primer video al abrir', () => {
  /* Son 1,16 MB entre los dos. El splash es lo primero que ve alguien que todavía no sabe si le
     interesa la app: bajarle las dos de una es cobrarle por adelantado algo que quizá no mire. */
  const vids = document.querySelectorAll('#splashAnimTrack video');
  PRUEBAS.igual(vids[0].getAttribute('preload'), 'auto', 'la primera sí, que es la que se ve ya');
  PRUEBAS.igual(vids[1].getAttribute('preload'), 'none',
    'la segunda se pide recién cuando arranca la primera');
});

PRUEBAS.caso('los videos no quedan corriendo abajo de la app', () => {
  /* Si el splash se oculta y los videos siguen, se gasta batería y CPU justo en el arranque, que
     es donde venimos peleando cada segundo. El freno va en los DOS lugares que ocultan el splash,
     no en cada botón: así queda cubierto cualquier camino que se agregue después. */
  PRUEBAS.cierto(/splashAnimFrenar\(\)/.test(splashAbrirPortal.toString()),
    'salir por el portal / demo / admin tiene que frenarla');
  PRUEBAS.cierto(/splashAnimFrenar\(\)/.test(carruselMostrar.toString()),
    'y entrar al carrusel también');
});

PRUEBAS.caso('sin animaciones se queda quieta, pero ocupa su lugar', () => {
  /* Mismo criterio que el resto de la app: se apaga el movimiento, no el bloque. Si desapareciera,
     la pantalla se reacomodaría distinto según la preferencia de cada persona. */
  const cont = document.getElementById('splashAnim');
  /* Hay que ABRIR el splash para medirlo: con el overlay cerrado todo mide 0 y la comprobación da
     un falso rojo. Me pasó al escribir esta prueba. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');
  const alto = cont.getBoundingClientRect().height;
  const trans = getComputedStyle(document.getElementById('splashAnimTrack')).transitionDuration;
  if (!tenia) document.documentElement.classList.remove('sin-animaciones');
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.alMenos(alto, 100, 'el bloque sigue ocupando su lugar');
  PRUEBAS.igual(trans, '0s', 'pero sin deslizamiento');
});

PRUEBAS.caso('la tira entra en su lugar de la escalera', () => {
  /* El splash tiene una entrada escalonada: logo 0 → título .08 → bajada .16 → botón .24. La tira
     va entre el logo y el título, así que le toca .04. Si entrara sin retraso sería lo único que
     aparece de golpe; si entrara después del título, aparecería algo de más arriba más tarde.
     Es la misma comprobación que en el inicio, donde el banner de instalar entraba fuera de orden. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.remove('sin-animaciones');

  const orden = ['.splash-logo', '.splash-anim', '.splash-h1', '.splash-sub', '.splash-cta']
    .map(sel => { const e = document.querySelector(sel); if (!e) return null;
      return { sel, y: e.getBoundingClientRect().top,
               d: parseFloat(getComputedStyle(e).animationDelay) || 0 }; })
    .filter(Boolean);

  if (tenia) document.documentElement.classList.add('sin-animaciones');
  if (!yaAbierto) ov.classList.remove('show');

  orden.sort((a, b) => a.y - b.y);
  const fuera = [];
  for (let i = 1; i < orden.length; i++) {
    if (orden[i].d < orden[i - 1].d) fuera.push(orden[i].sel + ' (' + orden[i].d + 's) entra antes que ' + orden[i - 1].sel + ' (' + orden[i - 1].d + 's), y va debajo');
  }
  PRUEBAS.igual(fuera, [], 'la entrada del splash tiene que seguir el orden en que se lee');
  const tira = orden.find(o => o.sel === '.splash-anim');
  PRUEBAS.cierto(tira && tira.d > 0, 'la tira no puede entrar de golpe: es lo único que no tendría retraso');
});

PRUEBAS.caso('⚠️ la tira no puede empujar el pie fuera de la pantalla', () => {
  /* Regresión mía, encontrada midiendo en un 320x568 —un teléfono chico de verdad—: sin la tira el
     contenido del splash entra JUSTO (568 de 568), y con ella se pasaba 97 px. Y como el overlay
     es `overflow-y: visible`, eso no genera scroll: los tres enlaces del pie quedaban directamente
     fuera de alcance, "Soy supervisor o servicio médico" incluido.
     La lección: lo que se agota en el splash es el espacio VERTICAL, así que la tira tiene que
     ceder por ALTO de pantalla. Lo tenía por ancho, que no servía de nada. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  PRUEBAS.cierto(/@media\s*\(max-height:\s*640px\)[^}]*\{[^}]*\.splash-anim\s*\{[^}]*display:\s*none/.test(fuente.replace(/\s+/g, ' ')),
    'por debajo de cierto alto la tira tiene que desaparecer: no hay lugar y el pie es más importante');
  PRUEBAS.cierto(/max-height:\s*760px/.test(fuente),
    'y achicarse antes de desaparecer, para no pasar de golpe de 210 px a nada');

  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const wr = document.querySelector('.splash-wrap');
  const sobra = wr.scrollHeight - wr.clientHeight;
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.comoMucho(sobra, 0, 'a este tamaño el splash tiene que entrar entero, sin nada cortado abajo');
});

PRUEBAS.caso('en escritorio la tira se alinea con el logo, no al centro', () => {
  /* La columna izquierda del splash de escritorio va alineada a la izquierda (logo y titular
     arrancan en el mismo borde). La tira se centra por defecto —correcto en teléfono, donde todo
     está centrado— y en escritorio dejaba el video flotando a 195 px de ese borde. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  PRUEBAS.cierto(/\.splash-brand\s+\.splash-anim-slide\s*\{[^}]*justify-content:\s*flex-start/.test(fuente),
    'en la columna de escritorio el video arranca donde arrancan el logo y el título');
});
