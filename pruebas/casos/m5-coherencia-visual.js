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

/* Las cinco pantallas dejaron de ser videos y pasaron a estar hechas en CSS. Estas pruebas cuidan
   las tres razones por las que se hizo el cambio, más lo que ya se había aprendido con los videos. */

PRUEBAS.caso('⚠️ la tira no pide un solo byte a la red', () => {
  /* Era la razón más cara de los videos: 1,7 MB en la PRIMERA pantalla que ve alguien que todavía
     no sabe si le interesa la app. Hechas en CSS pesan 0. Si alguna vez alguien mete un <video> o
     una <img> acá adentro, esta prueba lo frena. */
  const cont = document.getElementById('splashAnim');
  PRUEBAS.igual(cont.querySelectorAll('video, img, iframe, object').length, 0,
    'nada que dispare un pedido de red: el splash es lo primero que se ve y tiene que ser instantáneo');
});

PRUEBAS.caso('⚠️ el arranque no rompe el script (TDZ)', () => {
  /* Esta prueba existe por un error que cometí: declaré el estado con `let`, y el arranque llama a
     `splashMostrar()` desde el nivel superior ANTES de llegar a esa línea. Un `let` leído en zona
     muerta tira "Cannot access before initialization", y eso corta la ejecución de TODO el script
     de ahí para abajo — no rompe una función, rompe media app.
     Se comprueba mirando algo declarado DESPUÉS: si sigue existiendo, no se cortó. */
  PRUEBAS.igual(typeof splashAnimArrancar, 'function', 'la tira tiene que existir');
  PRUEBAS.igual(typeof splashAnimFrenar, 'function', 'y su freno también');
  PRUEBAS.igual(typeof carruselPintar, 'function',
    'esta se declara DESPUÉS: si falta, el script se cortó en el medio y media app no existe');
});

PRUEBAS.caso('son cinco pantallas y todas tienen texto y gráfico', () => {
  const slides = [...document.querySelectorAll('#splashAnimTrack .splash-anim-slide')];
  PRUEBAS.igual(slides.length, 5, 'las cinco del recorrido');
  const flojas = slides
    .map((sl, i) => {
      const b = sl.querySelector('.spl-p-tx b'), gr = sl.querySelector('.spl-p-gr');
      if (!b || !(b.textContent || '').trim()) return 'la ' + (i + 1) + ' no tiene título';
      if (!gr) return 'la ' + (i + 1) + ' no tiene gráfico';
      if (!sl.dataset.espera) return 'la ' + (i + 1) + ' no dice cuánto durar';
      return null;
    })
    .filter(Boolean);
  PRUEBAS.igual(flojas, [], 'cada pantalla necesita título, gráfico y duración');
});

PRUEBAS.caso('⚠️ el texto de las pantallas se traduce (R14)', () => {
  /* La ventaja grande de haberlas hecho en CSS en vez de video: el texto es texto. Con los clips
     el título estaba quemado en el pixel, así que en inglés —o en otro sector— habría seguido en
     español. Acá pasa por t() como todo lo demás. */
  const sinClave = [...document.querySelectorAll('#splashAnimTrack .spl-p-tx b, #splashAnimTrack .spl-p-tx span')]
    .filter(e => !e.getAttribute('data-i18n'))
    .map(e => '"' + (e.textContent || '').trim().slice(0, 24) + '"');
  PRUEBAS.igual(sinClave, [], 'todo texto visible necesita su clave de traducción');

  const idioma0 = idiomaActual();
  fijarIdioma('en');
  const enIngles = t('spl_p1_t');
  fijarIdioma(idioma0);
  PRUEBAS.falso(enIngles === 'La fatiga se mide', 'y la traducción tiene que existir de verdad');
});

PRUEBAS.caso('⚠️ ningún color escrito a mano en las pantallas (R13)', () => {
  /* La otra ventaja sobre el video: el modo oscuro sale gratis porque todo sale de los tokens.
     Con los clips el fondo era blanco fijo y por eso dos de ellos tenían el título ilegible sobre
     el navy del splash. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  const bloque = (fuente.match(/\.spl-p \{[\s\S]*?html\.sin-animaciones \.spl-activa/) || [''])[0];
  PRUEBAS.alMenos(bloque.length, 200, 'tiene que encontrar el bloque de las pantallas');
  const aMano = (bloque.match(/#[0-9a-fA-F]{3,6}\b/g) || []);
  PRUEBAS.igual(aMano, [], 'todo tiene que salir de tokens, o el modo oscuro se rompe');
});

PRUEBAS.caso('en los dos temas el título de la pantalla se lee', () => {
  /* Es exactamente lo que fallaba en los videos: el título quedaba navy sobre navy. Acá el panel
     trae su propia superficie y el texto usa la tinta de esa superficie. */
  const lum = c => { const m = (c.match(/[\d.]+/g) || [0,0,0]).map(Number);
    const f = x => { x = x/255; return x <= .03928 ? x/12.92 : Math.pow((x + .055)/1.055, 2.4); };
    return .2126*f(m[0]) + .7152*f(m[1]) + .0722*f(m[2]); };
  const ct = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A,B) + .05) / (Math.min(A,B) + .05); };

  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const tema0 = document.documentElement.getAttribute('data-tema');
  const flojos = [];
  ['claro', 'oscuro'].forEach(tema => {
    document.documentElement.setAttribute('data-tema', tema);
    document.querySelectorAll('#splashAnimTrack .spl-p').forEach((p, i) => {
      const b = p.querySelector('.spl-p-tx b');
      const c = ct(getComputedStyle(b).color, getComputedStyle(p).backgroundColor);
      if (c < 4.5) flojos.push(tema + ' · pantalla ' + (i + 1) + ': ' + c.toFixed(2));
    });
  });
  if (tema0) document.documentElement.setAttribute('data-tema', tema0);
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual(flojos, [], 'el título sobre su propia tarjeta, en los dos temas');
});

PRUEBAS.caso('la secuencia se lee del DOM, no está escrita en el código', () => {
  /* Es lo que hace que agregar o reordenar una pantalla sea tocar el HTML y nada más. */
  const fuente = splashAnimArrancar.toString();
  PRUEBAS.cierto(/querySelectorAll\('\.splash-anim-slide'\)/.test(fuente), 'las pantallas se leen del DOM');
  PRUEBAS.cierto(/dataset\.espera/.test(fuente), 'y cada una dura lo que dice su data-espera');
  PRUEBAS.cierto(/onended/.test(fuente),
    'la rama de video se deja igual: si mañana vuelve un clip, espera a que TERMINE y no a un número');
});

PRUEBAS.caso('el freno sigue puesto donde el splash se oculta', () => {
  /* Va en los DOS lugares que ocultan el splash, no en cada botón: así queda cubierto cualquier
     camino que se agregue después. */
  PRUEBAS.cierto(/splashAnimFrenar\(\)/.test(splashAbrirPortal.toString()),
    'salir por el portal / demo / admin tiene que frenarla');
  PRUEBAS.cierto(/splashAnimFrenar\(\)/.test(carruselMostrar.toString()),
    'y entrar al carrusel también');
});

PRUEBAS.caso('sin animaciones se queda quieta, pero se ve', () => {
  /* Regla de oro del proyecto: el estado en reposo es VISIBLE. Si al apagar el movimiento algo
     quedara en opacidad 0, la pantalla se vería vacía en vez de quieta. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const tenia = document.documentElement.classList.contains('sin-animaciones');
  document.documentElement.classList.add('sin-animaciones');
  const invisibles = [...document.querySelectorAll('#splashAnimTrack .spl-mon span, #splashAnimTrack .spl-cola i, #splashAnimTrack .spl-barras i, #splashAnimTrack .spl-l-punto')]
    .filter(e => parseFloat(getComputedStyle(e).opacity) < 0.2)
    .map(e => (e.parentElement.className || '').split(' ')[1] || e.tagName);
  if (!tenia) document.documentElement.classList.remove('sin-animaciones');
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.igual([...new Set(invisibles)], [], 'sin movimiento las piezas siguen visibles, no en cero');
});

PRUEBAS.caso('⚠️ la regla que evita tapar el pie sigue en el CSS', () => {
  /* Regresión que encontré midiendo en un 320x568: sin la tira el splash entra JUSTO (568 de 568)
     y con ella se pasaba 97 px. Como el overlay es `overflow-y: visible`, eso no genera scroll: los
     tres enlaces del pie quedaban fuera de alcance. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('').replace(/\s+/g, ' ');
  PRUEBAS.cierto(/@media \(max-height: ?640px\)[^}]*\{[^}]*\.splash-anim \{[^}]*display: ?none/.test(fuente),
    'por debajo de cierto alto la tira desaparece: no hay lugar y el pie importa más');
  PRUEBAS.cierto(/max-height: ?760px/.test(fuente), 'y se achica antes de desaparecer');
});

PRUEBAS.caso('el splash entra entero, sin nada cortado abajo', () => {
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const wr = document.querySelector('.splash-wrap');
  const sobra = wr.scrollHeight - wr.clientHeight;
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.comoMucho(sobra, 0, 'nada del splash puede quedar fuera de la pantalla');
});

PRUEBAS.caso('entra en su lugar de la escalera', () => {
  /* El splash entra escalonado (logo 0 → título .08 → bajada .16 → botón .24) y la tira era lo
     único que aparecía de golpe. Se le dio .04, entre el logo y el título. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('').replace(/\s+/g, ' ');
  /* La tira pasó a estar ABAJO DE TODO, debajo del acceso de administrador, así que ahora tiene
     que entrar la ÚLTIMA — después del botón (.24). La regla de fondo no cambió: nada entra antes
     que lo que tiene encima. Por eso la prueba compara contra el escalón del botón en vez de fijar
     un número, que fue lo que la hizo fallar cuando el bloque se movió. */
  const dTira = parseFloat((fuente.match(/\.splash-anim \{ animation-delay: ?([\d.]+)s/) || [0,0])[1]);
  const dBoton = parseFloat((fuente.match(/\.ent-texto-entra--4 \{ animation-delay: ?([\d.]+)s/) || [0,0])[1]);
  PRUEBAS.alMenos(dTira, dBoton,
    'la tira está abajo de todo: tiene que entrar después del botón (' + dTira + 's vs ' + dBoton + 's)');

  /* ⚠️ ANTES ESTO COMPROBABA EL SELECTOR `.splash-brand .splash-anim-slide`, y ESE SELECTOR NUNCA
     TOCÓ NADA: la tira no es descendiente de `.splash-brand` en el marcado —son hermanos dentro de
     la grilla, no padre e hijo—, así que la regla quedaba viva en el CSS sin alcanzar ningún
     elemento real. La prueba pasaba igual porque comprobaba que el TEXTO existiera en la hoja de
     estilos, no que se aplicara. Es el mismo error de fondo que ya está anotado en el LEEME:
     comprobar la implementación en vez del comportamiento.
     Se corrigió el selector (P4, cuando la tira pasó a la columna azul) y ahora se comprueba el
     estilo CALCULADO sobre la tarjeta real, con el splash abierto. */
  const ov2 = document.getElementById('splashOv');
  const yaAbierto2 = ov2.classList.contains('show');
  ov2.classList.add('show');
  /* La regla vive dentro de `@media (min-width:900px)`: hay que medir a un ancho de escritorio,
     no al tamaño fijo del iframe (390px), o la comprobación da falso siempre por el ancho y no por
     el CSS. */
  const alineado = PRUEBAS.enVentana(1366, 768, () => {
    const slide = document.querySelector('#splashAnimTrack .splash-anim-slide');
    return slide && getComputedStyle(slide).justifyContent === 'flex-start';
  });
  if (!yaAbierto2) ov2.classList.remove('show');
  PRUEBAS.cierto(alineado,
    'en escritorio la tira arranca donde arrancan el logo y el título, no centrada');
});

PRUEBAS.grupo('N10 · los tres bugs que reportó el usuario');

PRUEBAS.caso('⚠️ nada del arranque depende del ORDEN de una asignación', () => {
  /* Este archivo ya mordió TRES veces en el mismo lugar, y las tres las reportó el usuario o las
     encontré midiendo, nunca leyendo:
       1) `let _splAnim` → "Cannot access before initialization" y se cortaba medio script.
       2) `var SPLASH_ANIM_ACTIVA = true` declarado DESPUÉS del arranque → al cargar valía
          `undefined` y la tira no arrancaba; recién andaba si se salía a otra pantalla y se volvía.
          El usuario lo describió exactamente así.
       3) `var _splAnim = null` declarado después del arranque → la tira arrancaba, guardaba su
          estado, y esa línea lo PISABA con null: quedaba una cadena viva que ningún freno
          alcanzaba (batería gastada abajo de la app) y la tira se moría.
     La regla: lo que use el camino de arranque va como FUNCIÓN DECLARADA (se iza entera); si tiene
     que ser variable, se declara SIN asignar, porque `var x;` no pisa un valor existente. */
  PRUEBAS.igual(typeof splashAnimActiva, 'function',
    'el interruptor tiene que ser función: una variable asignada más abajo vale undefined al arrancar');

  /* La declaracion se busca a PRINCIPIO DE RENGLON. La primera version usaba \bvar _splAnim\s*=
     y fallaba sola: el comentario que explica este mismo bug, escrito arriba de esa linea en el
     index, contiene el texto 'var _splAnim = null' y la regex lo matcheaba. */
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  PRUEBAS.cierto(/^var _splAnim;\s*$/m.test(fuente),
    'el estado se declara SIN valor: con `= null` la linea pisa lo que el arranque ya habia puesto');
  PRUEBAS.falso(/^var _splAnim\s*=/m.test(fuente), 'y no puede volver a llevar asignacion');
});

PRUEBAS.caso('⚠️ la tira sobrevive a arrancar con el movimiento apagado', () => {
  /* El síntoma reportado: "cuando cargo la página no se mueven, pero si entro a un botón y vuelvo,
     ahí sí". Al abrir una PWA desde el ícono la página suele cargar en segundo plano, la app pone
     `.sin-animaciones`, y la tira se quedaba quieta PARA SIEMPRE aunque después el movimiento
     estuviera permitido. Ahora queda marcada como parada y un observador la re-arma. */
  const fuente = splashAnimArrancar.toString();
  PRUEBAS.cierto(/const quieto = \(\) =>/.test(fuente),
    '`quieto` tiene que ser función: calculado una sola vez, congelaba la tira para siempre');
  PRUEBAS.cierto(/est\.parado = true/.test(fuente), 'sin movimiento se marca parada, no se abandona');
  PRUEBAS.cierto(/MutationObserver/.test(fuente), 'y algo la vuelve a poner en marcha sola');
  PRUEBAS.cierto(/_splAnim !== est/.test(fuente),
    'y cada paso comprueba que la cadena sea LA vigente, para que ninguna huérfana siga corriendo');
});

PRUEBAS.caso('⚠️ el alto usa dvh y no vh (el pie no se puede cortar en el teléfono)', () => {
  /* El usuario reportó que en el celular no le aparecía "Administrador", el ÚLTIMO enlace del pie.
     No era color —medido: 5.74 de contraste, pasa— sino el alto: `min-height:100dvh` estaba escrito
     ANTES de `min-height:100vh`, así que ganaba el `vh`, que en un teléfono ignora la barra del
     navegador y estira el contenido por debajo de lo visible. Gana la última que el navegador
     entienda, así que el respaldo va primero. */
  const fuente = [...document.querySelectorAll('style')].map(s => s.textContent).join('').replace(/\s+/g, ' ');
  const malas = (fuente.match(/min-height: ?100dvh; ?min-height: ?100vh/g) || []);
  PRUEBAS.igual(malas, [], 'el orden invertido hace que mande vh y el pie quede fuera de pantalla');
  PRUEBAS.alMenos((fuente.match(/min-height: ?100vh; ?min-height: ?100dvh/g) || []).length, 2,
    'y tiene que estar bien en el splash y en el carrusel');
});

PRUEBAS.grupo('N10 · "Ver una demostración" deja elegir');

PRUEBAS.caso('⚠️ la demo no dispara el pedido sola', () => {
  /* Reportado: "le doy y me abre sí o sí dirección, no me deja seleccionar". Pasaba porque
     `splashVerDemo` llamaba a `portalVerDemo` en la misma línea que abría el portal: la persona
     nunca llegaba a tocar una pestaña. */
  const fuente = splashVerDemo.toString();
  PRUEBAS.falso(/portalVerDemo/.test(fuente),
    'abrir la demo no puede pedir los datos: primero hay que poder elegir qué vista mirar');
  PRUEBAS.cierto(/portalDemoModo\(true\)/.test(fuente), 'tiene que entrar en modo sólo demostración');
});

PRUEBAS.caso('en modo demostración no se puede entrar con credenciales', () => {
  /* "Ver demostración sólo debería dejar ver con datos simulados". Desde ahí no se entra a datos
     reales: no hay usuario ni contraseña, ni el acceso de administrador. */
  splashVerDemo();
  const vis = id => { const e = document.getElementById(id); return e && getComputedStyle(e).display !== 'none'; };
  const r = { creds: vis('portalCreds'), admin: vis('adminSep'), tabEmp: vis('ptabEmp'),
              sup: vis('ptabSup'), med: vis('ptabMed'), dir: vis('ptabHseq') };
  /* Antes esto miraba el largo de `dashBody` y daba falso positivo: quedaba contenido de una
     prueba anterior que si habia cargado la demo. Lo que importa es otra cosa: que siga a la vista
     la pantalla de eleccion y no el panel. */
  const gate = document.getElementById('portalGate');
  const panel = document.getElementById('portalDash');
  const pidio = !(gate && getComputedStyle(gate).display !== 'none')
             || !!(panel && getComputedStyle(panel).display !== 'none');
  closePortal();

  PRUEBAS.falso(r.creds, 'sin usuario ni contraseña');
  PRUEBAS.falso(r.admin, 'sin acceso de administrador');
  PRUEBAS.falso(r.tabEmp, '"Mis estadísticas" no aplica: necesita un perfil cargado en el dispositivo');
  PRUEBAS.cierto(r.sup && r.med && r.dir, 'pero SÍ se puede elegir entre las tres vistas');
  PRUEBAS.falso(pidio, 'y no se pide nada hasta que la persona elija');
});

PRUEBAS.caso('cada pestaña cambia la vista que se va a demostrar', () => {
  splashVerDemo();
  const vistas = [];
  ['sup', 'med', 'hseq'].forEach(m => { portalMode(m); vistas.push(PORTAL_VISTA); });
  const etiqueta = (document.getElementById('portalDemoBtn') || {}).textContent || '';
  closePortal();
  PRUEBAS.igual(vistas, ['supervisor', 'medico', 'hseq'], 'la pestaña elegida manda');
  PRUEBAS.cierto(/dirección|HSEQ/i.test(etiqueta),
    'y el botón dice para qué vista es, así nadie toca a ciegas: "' + etiqueta + '"');
});

PRUEBAS.caso('al cerrar, el portal vuelve a la normalidad', () => {
  /* Si el modo demo quedara pegado, alguien que después quiere entrar de verdad no encontraría
     dónde poner su contraseña. */
  splashVerDemo();
  closePortal();
  PRUEBAS.falso(PORTAL_SOLO_DEMO, 'el modo se apaga al cerrar');
  portalMode('sup');
  PRUEBAS.cierto(getComputedStyle(document.getElementById('portalCreds')).display !== 'none',
    'y las credenciales vuelven a estar disponibles');
});

PRUEBAS.grupo('N11 · orden de declaración y app de atrás');

PRUEBAS.caso('⚠️ el script llega entero hasta el final', () => {
  /* Es la red de seguridad de toda esta familia de bugs. Un `let`/`const` leído en zona muerta
     lanza y CORTA la ejecución del resto del archivo: no se rompe una función, se rompen todas las
     que venían después. Se comprueba con lo último que se declara. */
  PRUEBAS.igual(typeof appRevelar, 'function', 'una función declarada al final tiene que existir');
  PRUEBAS.igual(typeof splashAnimActiva, 'function', 'y las del arranque también');
  PRUEBAS.igual(typeof carruselPintar, 'function', 'y las del medio');
});

PRUEBAS.caso('⚠️ las dos lecturas riesgosas siguen protegidas', () => {
  /* Salieron de barrer el archivo entero buscando variables de nivel superior que se usen antes de
     su asignación, siguiendo las llamadas desde el arranque hasta tres niveles. De 226 variables
     quedaron dos alcanzables, y las dos ya estaban cubiertas. Esta prueba es para que sigan así.
     `typeof` NO sirve para esto: con `let`/`const` en zona muerta, `typeof` también lanza. La única
     protección es el try/catch. */
  PRUEBAS.cierto(/try \{ return TAREAS\.determinacion/.test(renderInicio.toString()),
    'renderInicio corre en el arranque y TAREAS es un const declarado mucho más abajo: va envuelto');
  PRUEBAS.cierto(/try \{[\s\S]*nominaListPintarDeptos\(\)/.test(aplicarIdioma.toString()),
    'aplicarIdioma alcanza NOMLIST; sólo pasa con el panel abierto, pero va protegido igual');
});

PRUEBAS.caso('⚠️ la app de atrás no se ve mientras no haya perfil', () => {
  /* Reportado: "cualquier botón que toco deja ver el panel de inicio unos microsegundos". Los
     overlays son translúcidos (86 % y desenfoque) y se cruzan con una transición de 220 ms: durante
     ese cruce los dos quedan a media opacidad. Si la app está pintada atrás, asoma.
     Era además el agujero del "empleado fantasma": la app quedaba TOCABLE detrás del splash de
     alguien que nunca completó su alta. */
  const fuente = appRevelar.toString();
  PRUEBAS.cierto(/getElementById\('app'\)/.test(fuente) && /bottomNav/.test(fuente),
    'tiene que ocultar la app y la barra inferior juntas');

  const app = document.getElementById('app');
  const antes = app.style.display;
  appRevelar(false);
  PRUEBAS.igual(getComputedStyle(app).display, 'none', 'sin perfil, nada que asome por atrás');
  appRevelar(true);
  PRUEBAS.falso(getComputedStyle(app).display === 'none', 'y con el alta hecha vuelve a estar');
  app.style.display = antes;
});

PRUEBAS.caso('las animaciones cuelgan de la clase, no del elemento suelto', () => {
  /* Reportado: "están medio flojas". Corrían todas en bucle a la vez, así que al llegar una
     pantalla su animación ya venía por la mitad.
     ⚠️ ESTE CASO SE ACHICÓ. Antes también exigía que el JS tuviera una constante llamada
     `DESLIZ_MS`, y falló cuando la espera se mudó al CSS — o sea, falló por una MEJORA. Es el
     síntoma clásico de una prueba atada a CÓMO está escrito algo en vez de a qué tiene que pasar.
     Lo que importa —que ninguna animación arranque antes de que la pantalla llegue— se comprueba
     midiendo, en el grupo P2, sobre las animaciones que de verdad hay puestas. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  PRUEBAS.cierto(/\.spl-activa \.spl-barras i \{[^}]*animation:/.test(css),
    'las animaciones tienen que colgar de la clase que se pone y se saca: es lo que las reinicia');
});

PRUEBAS.caso('⚠️ ninguna pantalla puede quedar en blanco', () => {
  /* La versión anterior ponía `opacity: 0` en la regla base y dejaba que la animación lo trajera.
     Cuando las reglas de "sin movimiento" quedaron desactualizadas, dos paneles enteros quedaron
     invisibles. Ahora el estado en reposo ES el visible y lo que oculta es el `from` del keyframe,
     que sólo rige mientras la animación está puesta. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('');
  const bloque = (css.match(/\.spl-p \{[\s\S]*?html\.sin-animaciones \.spl-activa/) || [''])[0];
  const baseOculta = (bloque.match(/^\s*\.spl-(mon span|ojo|chip|cola i|l-punto)[^{]*\{[^}]*opacity: ?0;/gm) || []);
  PRUEBAS.igual(baseOculta, [],
    'ninguna pieza puede arrancar invisible: si la clase nunca llega, la pantalla queda vacía');

  const tira = document.getElementById('splashAnimTrack');
  const apagadas = [...tira.querySelectorAll('.spl-mon span, .spl-ojo, .spl-chip, .spl-cola i, .spl-l-punto')]
    .filter(e => !e.closest('.spl-activa'))
    .filter(e => parseFloat(getComputedStyle(e).opacity) < 0.2).length;
  PRUEBAS.igual(apagadas, 0, 'y medido: fuera de la pantalla activa tampoco hay nada invisible');
});

PRUEBAS.caso('"Mis estadísticas" sólo aparece si hay perfil', () => {
  /* Muestra los registros DE ESTA PERSONA: sin perfil no tiene nada que mostrar y lleva a un error.
     Se ocultaba sólo en modo demo, así que por el camino de "Soy supervisor…" —donde tampoco hay
     perfil— quedaba visible y roto. La condición correcta no es "estoy en demo" sino "hay perfil". */
  PRUEBAS.cierto(/perfilCompleto\(getProfile\(\)\)/.test(portalMode.toString()),
    'la pestaña depende de tener perfil, no del modo');
});

PRUEBAS.caso('el acceso con credenciales ofrece las tres vistas', () => {
  /* El enlace del splash nombra dirección, pero la pestaña de Dirección / HSEQ no se mostraba:
     no había forma de llegar. */
  splashPortal();
  const vis = id => { const e = document.getElementById(id); return !!e && getComputedStyle(e).display !== 'none'; };
  const r = { sup: vis('ptabSup'), med: vis('ptabMed'), dir: vis('ptabHseq'), creds: vis('portalCreds') };
  closePortal();
  PRUEBAS.cierto(r.sup && r.med && r.dir, 'supervisor, servicio médico y dirección');
  PRUEBAS.cierto(r.creds, 'y acá SÍ se puede entrar con credenciales, a diferencia de la demo');
});

PRUEBAS.caso('⚠️ los controles del panel se pueden tocar con guantes', () => {
  /* Medidos en el panel abierto: las pestañas daban 35 px de alto, los filtros 33 y el botón de
     refrescar 34x34 — veintiún objetivos por debajo del mínimo de 44. Y la regla de pantallas
     chicas los bajaba a 30, justo donde más importa. Un toque de 35 px falla y se corrige tocando
     de nuevo: esa es exactamente la sensación de "apretado" que se reportó.
     Se comprueba sobre el CSS porque el panel necesita datos para dibujarse. */
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('').replace(/\s+/g, ' ');
  const flojos = [];
  [['.dtab', 'las pestañas'], ['.pchip', 'los filtros']].forEach(([sel, que]) => {
    /* Se recorta con indexOf y no con `new RegExp`: armar la expresión desde una cadena obliga a
       escapar barras, y al escribir este archivo una de esas barras se perdió y dejó la cadena sin
       cerrar — se rompió el archivo ENTERO y la suite no cargó ni un caso. Sin escapes no pasa. */
    const desde = css.indexOf(sel + ' {');
    const regla = desde < 0 ? '' : css.slice(desde, css.indexOf('}', desde) + 1);
    if (!/min-height: ?44px/.test(regla)) flojos.push(que + ': ' + regla.slice(0, 70));
  });
  if (!/\.dash-refresh \{ width: ?44px; height: ?44px/.test(css)) flojos.push('el botón de refrescar');
  PRUEBAS.igual(flojos, [], 'todo control del panel necesita 44 px de área, aunque el dibujo sea menor');

  PRUEBAS.falso(/\.portal-back, \.dash-refresh[^{]*\{ width: ?30px/.test(css),
    'y la regla de pantallas chicas no puede volver a bajarlos: ahí es donde más importa');
});

PRUEBAS.grupo('P1 · los paneles del splash no se encima nada');

/* LO QUE SE REPORTÓ, con captura: en "Enfoque científico y analítico" la bajada quedaba encimada
   con las cuatro filas y el chip "Analizando…" pisaba SOMNOLENCIA.
   LA CAUSA: la tarjeta tiene alto FIJO y tres piezas adentro (texto, gráfico, chip). Si el texto
   crecía más de lo previsto, no cedía nada y el contenido se salía de la tarjeta.
   Reproducido a 320x800 con el tamaño de letra en "muy grande" —que la app deja elegir—: la
   pantalla 2 se pasaba 30 px y la 3, sesenta y nueve. */

/* ⚠️ Sin `setTimeout`: con la pestaña oculta el navegador los estrangula hasta uno por minuto y
   la suite se clava. `fijarTamanoTexto` cambia el tipo de la raíz en el acto; leer una medida
   fuerza el recálculo. Comprobado: mismos números que esperando 260 ms. */
function p1ConTexto(nivel, fn){
  const antes = (typeof nivelTextoActual === 'function') ? nivelTextoActual() : 1;
  fijarTamanoTexto(nivel);
  void document.body.offsetWidth;
  try { return fn(); } finally { fijarTamanoTexto(antes); void document.body.offsetWidth; }
}

PRUEBAS.caso('⚠️ ningún panel del splash se sale de su tarjeta, a NINGÚN tamaño', async () => {
  /* LO QUE SE REPORTÓ, con captura: en "Enfoque científico y analítico" la bajada quedaba encimada
     con las cuatro filas y el chip "Analizando…" pisaba SOMNOLENCIA.
     LA CAUSA: la tarjeta tiene alto FIJO y tres piezas adentro (texto, gráfico, chip). Si el texto
     crecía más de lo previsto, no cedía nada y el contenido se salía de la tarjeta.

     ⚠️ POR QUÉ ESTE CASO RECORRE TAMAÑOS, y es la lección cara del bloque.
     La primera versión medía al único tamaño del iframe (390x844). El arreglo se dio por terminado
     y quedó pusheado… pero el CSS tiene una rama para pantallas de menos de 760 px de alto que
     REDECLARA varias de esas mismas propiedades, y esa rama se quedó con los DOS errores originales:
     el título sin tope y un piso en el gráfico. A 375x667 con la letra al máximo se salían LAS CINCO
     pantallas, hasta 43 px. Se descubrió mirando a mano, que es justo lo que no hay que depender de
     que alguien se acuerde de hacer.
     Un arreglo que tapa un agujero y deja el de al lado abierto no es distracción: es que nada lo
     comprobaba. Esto lo comprueba. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  const nivelAntes = (typeof nivelTextoActual === 'function') ? nivelTextoActual() : 1;
  ov.classList.add('show');

  const desbordan = [], mudos = [], vistos = [];
  for (const v of PRUEBAS.VENTANAS) {
    PRUEBAS.enVentana(v.w, v.h, () => {
      for (const n of [0, 1, 2, 3]) {
        fijarTamanoTexto(n);
        void document.body.offsetWidth;
        const tira = document.getElementById('splashAnim');
        /* Que la tira NO se muestre es una respuesta válida y a veces la correcta: con la letra al
           máximo se saca entera, porque aplastada rompía el pie del splash (ver P2). */
        if (!tira || getComputedStyle(tira).display === 'none') continue;
        vistos.push(v.w + 'x' + v.h + ' letra ' + n);
        document.querySelectorAll('#splashAnimTrack .spl-p').forEach((c, i) => {
          const sobra = c.scrollHeight - c.clientHeight;
          if (sobra > 1) desbordan.push(v.w + 'x' + v.h + ' letra ' + n + ' n' + (i + 1) + ': ' + sobra + 'px');
        });
        document.querySelectorAll('#splashAnimTrack .spl-p-tx b').forEach((b, i) => {
          if (b.getBoundingClientRect().height < 10) mudos.push(v.w + 'x' + v.h + ' letra ' + n + ' n' + (i + 1));
        });
      }
    });
  }

  fijarTamanoTexto(nivelAntes);
  void document.body.offsetWidth;
  if (!yaAbierto) ov.classList.remove('show');

  PRUEBAS.alMenos(vistos.length, 8,
    'control: si la tira casi nunca se muestra, este barrido no está mirando nada');
  PRUEBAS.igual(desbordan, [],
    'un panel que se pasa de su tarjeta se ve encimado, que es lo que se reportó — y hay que ' +
    'comprobarlo a TODOS los tamaños, porque el CSS tiene ramas que redeclaran lo mismo');
  PRUEBAS.igual(mudos, [],
    'y el título nunca cede: si se aplasta a cero, la tarjeta ocupa lugar y no dice nada. El orden ' +
    'es gráfico, bajada, y el título último');
});

PRUEBAS.caso('⚠️ el gráfico es el primero en ceder, y puede llegar a cero', () => {
  /* Dos errores propios viven acá, y los dos costaron una medición:
     1) Le puse un piso de 26 px "para que el gráfico no desaparezca" y conseguí lo contrario: ese
        piso le quitaba justo la capacidad de encogerse que evitaba el desborde, y pasaron a salirse
        CUATRO pantallas en vez de dos.
     2) Después "arreglé" el reparto con `flex: 1 999 44px`, convencido de que el gráfico necesitaba
        una base distinta de cero para absorber el recorte antes que el texto. Medido a siete
        alturas contra `flex: 1 1 0`: idéntico en las siete. No hacía nada. Lo que de verdad
        protege al título es su propio `flex-shrink: 0`, y por eso es lo que se comprueba acá.
     ⚠️ Y ESTE CASO TAMBÉN ESTABA MAL ESCRITO: comparába la regla CSS letra por letra, así que dio
     rojo cuando la regla MEJORÓ. Ahora mira lo que el navegador aplica de verdad. La comprobación
     de que el orden se cumple al apretar está en el grupo P2, midiendo. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const gr = document.querySelector('#splashAnimTrack .spl-p-gr');
  const card = document.querySelector('#splashAnimTrack .spl-p');
  const tit = document.querySelector('#splashAnimTrack .spl-p-tx b');
  const cg = getComputedStyle(gr), cc = getComputedStyle(card);
  if (!yaAbierto) ov.classList.remove('show');

  PRUEBAS.igual(cg.minHeight, '0px',
    'el gráfico tiene que poder encogerse hasta cero: es lo que evita que el texto se encime');
  PRUEBAS.igual(getComputedStyle(tit).flexShrink, '0',
    'y el TÍTULO no puede encoger: ahí —y no en el gráfico— es donde se protege de verdad. Sin ' +
    'esto cae de 23 px a entre 0 y 20, medido');
  PRUEBAS.igual(cc.overflow, 'hidden',
    'y la tarjeta recorta como última red: mejor recortado que encimado');
});

PRUEBAS.caso('el tipo de la tira tiene tope, para que la tarjeta no reviente', async () => {
  /* La app deja elegir el tamaño de letra y todo lo demás lo respeta. Acá no, y es a propósito: el
     alto de la tarjeta es fijo, la tira es ILUSTRACIÓN de portada, y el texto que sí importa —el
     titular y la bajada del splash— sigue escalando entero.
     ⚠️ Antes esto comparaba la regla CSS letra por letra y se rompió al agregarle una propiedad
     delante. Ahora mide el tamaño que el navegador aplica, que es lo que de verdad importa. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  const medido = await p1ConTexto(2, () => {
    const b = document.querySelector('#splashAnimTrack .spl-p-tx b');
    const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return { tit: parseFloat(getComputedStyle(b).fontSize), raiz: raiz };
  });
  if (!yaAbierto) ov.classList.remove('show');
  PRUEBAS.alMenos(medido.raiz, 17,
    'control: en "Grande" la letra base tiene que haber crecido, o esta prueba no prueba nada');
  PRUEBAS.comoMucho(medido.tit, 17,
    'y aun así el título de la tira no puede pasar de 17 px: sin tope no entra en la tarjeta');
});

PRUEBAS.caso('⚠️ el punto de la línea cae sobre el final de la línea', async () => {
  /* Estaba en `right:-3px; top:2%`, o sea "cerca del borde" y no sobre el trazo: quedaba
     descoordinado y se salía de la caja. Ahora se ancla al último vértice de la polilínea.
     ⚠️ Son dos números que tienen que decir lo mismo y nada los ata: si se cambian los puntos de la
     polilínea hay que mover el `top` del punto al mismo porcentaje. Por eso esto se comprueba. */
  const ov = document.getElementById('splashOv');
  const yaAbierto = ov.classList.contains('show');
  ov.classList.add('show');
  void document.body.offsetWidth;   // forzar el recalculo, no esperar: los temporizadores estan estrangulados

  const gr = document.querySelector('.spl-linea');
  const pt = document.querySelector('.spl-l-punto');
  const poly = document.querySelector('.spl-l-viva');
  const svg = document.querySelector('.spl-linea svg');
  PRUEBAS.cierto(!!(gr && pt && poly && svg), 'tiene que existir el gráfico de línea con su punto');

  const gb = gr.getBoundingClientRect(), pb = pt.getBoundingClientRect();
  const pts = poly.getAttribute('points').trim().split(/\s+/);
  const ult = pts[pts.length - 1].split(',').map(Number);
  const vb = svg.viewBox.baseVal;
  const finX = gb.left + (ult[0] / vb.width) * gb.width;
  const finY = gb.top + (ult[1] / vb.height) * gb.height;
  const dx = Math.abs(finX - (pb.left + pb.width / 2));
  const dy = Math.abs(finY - (pb.top + pb.height / 2));

  const card = pt.closest('.spl-p');
  const cb = card.getBoundingClientRect();
  const dentro = pb.left >= cb.left && pb.right <= cb.right && pb.top >= cb.top && pb.bottom <= cb.bottom;
  if (!yaAbierto) ov.classList.remove('show');

  PRUEBAS.comoMucho(dx, 2, 'el punto tiene que caer sobre el final de la línea en horizontal');
  PRUEBAS.comoMucho(dy, 2, 'y en vertical (' + dy.toFixed(1) + ' px de desfase)');
  PRUEBAS.cierto(dentro, 'y no puede salirse de la tarjeta');
});
