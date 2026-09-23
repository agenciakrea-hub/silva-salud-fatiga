PRUEBAS.grupo('P090 · calendario de jornadas · cada caso sale de un token (R13), contraste ≥ 4.5 en los DOS temas, y ninguna casilla con degradado');

/* ── Qué mide este archivo, y por qué nada está copiado del plan ────────────────────────────────
   Los 13 casos (9 de ciclo + 4 de día) NO están escritos a mano: salen de las funciones reales
   —`cicloEstado` → `cmesCaso`, y `cmesCasoDia`—, el par de tokens sale del CSS real del documento,
   y el marcado de cada casilla lo arma `cmesCeldaHtml`. Una tabla copiada del plan probaría el
   plan, no el código: cuando se escribió este archivo el CSS no tenía regla para `cerrado`, `curso`
   ni `descanso` —los tres caían en el gris de `.cmes-d`—, el pin del primer caso lo dejó anclado, y
   de ahí salió el arreglo. Hoy los tres tienen regla, y no la que decía el plan: `descanso` quedó en
   `--sem-violeta-*` y no en `--sem-azul-*`, y `curso` en `--orange-legible` y no en `--orange-txt`
   (medido: el segundo da 2,91:1 sobre `--orange-bg` en oscuro). El historial completo está en el
   comentario del pin.

   ⚠️ SE LEE EL TOKEN, NUNCA `backgroundColor` DIRECTO DE LA CASILLA.
   `pruebas/LEEME.md` lo tiene medido: con la pestaña oculta Chrome no vuelve a resolver `var()` y
   sirve el color final CACHEADO del tema anterior (81 lecturas en 2.022 ms sin cambiar nunca). Un
   auditor que mide así puede estar comparando un tema consigo mismo y decir «0 defectos» sobre un
   tema que nunca miró. Acá: `PRUEBAS.enTema` comprueba que el tema llegó a la resolución de
   estilos, y `CTX.token('var(--x)')` resuelve el token en un elemento RECIÉN CREADO —que no puede
   tener caché de nada— en vez de leer la propiedad final de la casilla. */

const P090T_DIA = '2020-01-15';        // un día pasado cualquiera: así `esHoy` nunca interfiere
const P090T_VISUALES = ['completo', 'exceso', 'excedido', 'sin_cierre', 'detenido',
                        'cerrado', 'curso', 'descanso', 'parcial'];   // los 9 del ciclo, para contrastar la derivación

/* Los OCHO valores que `cicloEstado` puede devolver, sacados de su propio código (como hace
   `p186-ciclo-detenido-cliente.js:165`, que congela la lista a mano: acá se deriva y se compara
   contra esa lista, así las dos se cuidan entre sí).
   `[^.\w]` deja afuera `tr.estado = …`; y `st.estado === 'x'` no entra porque después del primer
   `=` viene otro `=` y no la comilla. Los `estado:'futuro'` / `estado:'cerrado_sup'` de los TRAMOS
   tampoco: esos salen por `return Object.assign(…)`, no por `return { estado:`. */
function p090tEstados(){
  const src = String(cicloEstado);
  const out = {};
  let m;
  const r1 = /return\s*\{\s*estado\s*:\s*'([a-z_]+)'/g;
  while ((m = r1.exec(src))) out[m[1]] = 1;
  const r2 = /(^|[^.\w])estado\s*=\s*'([a-z_]+)'/g;
  while ((m = r2.exec(src))) out[m[2]] = 1;
  return Object.keys(out).sort();
}

/* Los 13 casos VISUALES, por el camino real: cada estado pasado por `cmesCaso` (con y sin
   `huboExceso`, que es la rama que separa `completo` de `exceso`) más los literales que
   `cmesCasoDia` devuelve para los días que no son un ciclo. */
function p090tCasos(){
  const casos = {};
  p090tEstados().forEach(function(e){
    casos[cmesCaso({ estado: e })] = 1;
    casos[cmesCaso({ estado: e, huboExceso: true })] = 1;
  });
  let m;
  const r = /return\s*'([a-z_]+)'/g, src = String(cmesCasoDia);
  while ((m = r.exec(src))) casos[m[1]] = 1;
  return Object.keys(casos).sort();
}

/* El CSS de P090, SIN comentarios. Se corta entre `.cmes {` y `.cic-hist {` porque el bloque se
   insertó justo antes del historial; devuelve '' si el corte no cierra, y el caso lo comprueba
   antes de medir (un barrido sobre una cadena vacía da «0 colores a mano» sin haber mirado nada).
   Los comentarios se sacan ANTES de partir en reglas: si no, el comentario que precede a
   `.cmes-c-completo` se pega al selector y esa regla no se encuentra. Pasó escribiendo esto. */
function p090tCss(){
  const todo = [].slice.call(document.querySelectorAll('style')).map(function(s){ return s.textContent; }).join('\n');
  const i = todo.indexOf('.cmes {'), j = todo.indexOf('.cic-hist {');
  if (i < 0 || j <= i) return '';
  return todo.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/* Las declaraciones de fondo y tinta por selector. `(?:^|;)\s*color` no engancha con
   `background-color` ni con `border-color`: antes del `color` hay un guion, no un `;`. */
function p090tReglas(css){
  const reglas = {};
  let m;
  const re = /([^{}]+)\{([^{}]*)\}/g;
  while ((m = re.exec(css))){
    const decl = m[2];
    const bg = decl.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/);
    const co = decl.match(/(?:^|;)\s*color\s*:\s*([^;]+)/);
    m[1].split(',').forEach(function(sel){
      sel = sel.trim();
      if (!sel) return;
      const o = reglas[sel] || (reglas[sel] = {});
      if (bg) o.background = bg[1].trim();
      if (co) o.color = co[1].trim();
    });
  }
  return reglas;
}

/* ¿La casilla de este caso sale `disabled`? No se decide acá: se le pregunta al constructor real.
   Importa porque `.cmes-d:disabled` (0,2,0) le gana a `.cmes-c-fuera` (0,1,0) y es esa regla la
   que termina pintando los días futuros y los que están fuera de la cobertura. */
function p090tMuerta(caso){
  return / disabled/.test(cmesCeldaHtml('mio', { f: P090T_DIA, delMes: true }, caso, null, null, false, false, false));
}

/* El par de tokens con el que el navegador termina pintando la casilla de `caso`, resuelto con la
   misma cascada: `.cmes-d` de base, la regla propia del caso encima, y `.cmes-d:disabled` arriba
   de todo cuando la casilla es muerta.
   `transparent` no es un color medible: el fondo REAL de una casilla transparente es el del
   contenedor `.cmes`, que declara `background: var(--card)`. Se devuelve ése como `fondoEfectivo`
   y se deja anotado con `transparente:true` para que en el reporte se vea contra qué se midió. */
function p090tPar(reglas, caso){
  const base = reglas['.cmes-d'] || {};
  const dis = reglas['.cmes-d:disabled'] || {};
  const propia = reglas['.cmes-c-' + caso] || null;
  const muerta = p090tMuerta(caso);
  const fondo = (muerta && dis.background) || (propia && propia.background) || base.background || '';
  const tinta = (muerta && dis.color) || (propia && propia.color) || base.color || '';
  const transparente = (fondo === 'transparent');
  const contenedor = (reglas['.cmes'] || {}).background || '';
  return { caso: caso, fondo: fondo, tinta: tinta, muerta: muerta, propia: !!propia,
           transparente: transparente, fondoEfectivo: transparente ? contenedor : fondo };
}

/* La MISMA caminata que hace el auditor de contraste (`pruebas/casos/cliente-contraste.js:22-40`):
   sube por los ancestros y se RINDE —devuelve null— en cuanto encuentra un `background-image` o un
   fondo semitransparente. Se corta en `tope` (`#cmesMio`) a propósito: lo que haya más arriba es
   del resto de la app y no es lo que este archivo afirma. */
function p090tFondoAuditor(el, tope){
  let n = el;
  while (n){
    const cs = getComputedStyle(n);
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
    const b = cs.backgroundColor;
    if (b && !/rgba\(0, 0, 0, 0\)/.test(b) && !/transparent/.test(b)){
      const m = b.match(/rgba?\(([^)]+)\)/);
      if (m){
        const p = m[1].split(',').map(function(x){ return parseFloat(x); });
        if (p.length > 3 && p[3] < 0.99) return null;
      }
      return b;
    }
    if (n === tope) return null;
    n = n.parentElement;
  }
  return null;
}

/* ¿La caminata de arriba tiene que SUBIR desde esta casilla, o se resuelve en el primer paso?
   Es la pregunta que decide a quién puede afectar un degradado en el contenedor: la casilla con
   fondo propio opaco devuelve su color sin mirar un solo ancestro. Mismo criterio que la primera
   vuelta de `p090tFondoAuditor`. No hace falta contemplar acá el `background-image` ni el fondo
   semitransparente de la casilla: el caso ya afirma, antes de usar esto, que no existe ninguno. */
function p090tSube(el){
  const b = getComputedStyle(el).backgroundColor;
  return !b || /rgba\(0, 0, 0, 0\)/.test(b) || /transparent/.test(b);
}

/* El caso visual de una casilla, leído de su clase real (`cmes-c-<caso>`, la que pone
   `cmesCeldaHtml`). Sirve para cruzar lo que dice el CSS contra lo que quedó en el DOM. */
function p090tCasoDeCelda(el){
  const m = String(el.className).match(/cmes-c-([a-z_]+)/);
  return m ? m[1] : '(sin clase de caso)';
}

PRUEBAS.caso('R13 · los 13 casos del calendario se pintan con tokens y el bloque CSS nuevo no tiene un solo color escrito a mano', () => {
  const css = p090tCss();
  /* Guardas del instrumento ANTES de medir: un barrido sobre una cadena vacía da «0 hallazgos» y
     parece verde. Esto es exactamente lo que dejó a A4 diciendo «0 defectos» sin medir nada. */
  PRUEBAS.alMenos(css.length, 2000, 'guarda: el corte del CSS entre «.cmes {» y «.cic-hist {» trajo el bloque entero');
  PRUEBAS.cierto(css.indexOf('.cmes-c-completo') >= 0, 'guarda: el corte incluye las reglas de caso');
  PRUEBAS.cierto(css.indexOf('.cmes-ley-c') >= 0, 'guarda: el corte llega hasta el final del bloque (la leyenda es la última regla)');

  const RE_MANO = /#[0-9a-fA-F]{3,8}\b|rgba?\(/g;
  PRUEBAS.cierto(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test('color: #1d4ea8'), 'DISCRIMINADOR · el barrido de R13 sí engancha un hexadecimal cuando lo hay');
  PRUEBAS.igual(css.match(RE_MANO) || [], [], 'R13 · ni un color escrito a mano en el CSS de P090: todo por var(--…)');

  const reglas = p090tReglas(css);
  PRUEBAS.alMenos(Object.keys(reglas).length, 30, 'guarda: el analizador partió el bloque en reglas de verdad');
  PRUEBAS.cierto(!!(reglas['.cmes-d'] && reglas['.cmes-d'].background), 'guarda: `.cmes-d` declara el fondo de base, que es el respaldo de `p090tPar` cuando un caso no tiene regla propia');

  const casos = p090tCasos();
  PRUEBAS.igual(casos.length, 13, 'guarda: se derivaron los 13 casos (9 de ciclo + 4 de día); si la derivación no engancha nada, todo lo de abajo mide cero');
  P090T_VISUALES.forEach(function(c){ PRUEBAS.cierto(casos.indexOf(c) >= 0, 'el caso de ciclo «' + c + '» salió de cicloEstado → cmesCaso'); });
  ['sin_jornada', 'franco', 'fuera', 'futuro'].forEach(function(c){ PRUEBAS.cierto(casos.indexOf(c) >= 0, 'el caso de día «' + c + '» salió de cmesCasoDia'); });

  /* Todo par tiene que ser un token o `transparent`. Un `var()` que no resuelve computa a `inherit`
     SIN error en consola (R17), así que «tiene la forma var(--x)» no alcanza — eso lo comprueba el
     caso de contraste, que mide el color que sale de verdad. */
  const malos = [];
  casos.forEach(function(c){
    const p = p090tPar(reglas, c);
    if (!/^var\(--[a-z0-9-]+\)$/.test(p.fondo) && p.fondo !== 'transparent') malos.push(c + ' fondo=' + p.fondo);
    if (!/^var\(--[a-z0-9-]+\)$/.test(p.tinta)) malos.push(c + ' tinta=' + p.tinta);
  });
  PRUEBAS.igual(malos, [], 'R13 · los 13 casos declaran fondo y tinta con un token (o `transparent`, que hereda el `var(--card)` de `.cmes`)');

  /* ⚠️ EL PIN CUMPLIÓ SU FUNCIÓN — ACÁ QUEDA EL HISTORIAL, QUE ES LO ÚNICO QUE NO SE PUEDE LEER
     DEL CÓDIGO. Cuando se escribió este archivo, `cerrado`, `curso` y `descanso` NO tenían regla
     propia: los tres caían en el `.cmes-d` de base, el mismo par que `sin_jornada`, y `cmesGlifo`
     tampoco les daba marca. «Cerrada por el supervisor», «En curso», «En descanso» y «Sin jornada
     registrada» eran CUATRO hechos distintos que en la grilla se veían idénticos. El pin se escribió
     en verde anclando ese defecto en vez de en rojo, porque revertir una decisión de diseño no me
     tocaba; el aviso llegó y se arreglaron los tres:
       · `.cmes-c-cerrado`  → `--sem-gris-bg` / `--sem-gris-txt`   + marca `cmes_m_cerrado`  (✕)
       · `.cmes-c-curso`    → `--orange-bg`   / `--orange-legible` + marca `cmes_m_curso`    (▸)
       · `.cmes-c-descanso` → `--sem-violeta-bg` / `--sem-violeta` + marca `cmes_m_descanso` (~)
     y `curso` entró además en la leyenda del bloque.
     El pin sigue, dado vuelta: hoy los 13 casos tienen regla propia, y si alguno la vuelve a
     perder esto se pone rojo. */
  PRUEBAS.igual(['completo', 'p090_caso_inventado'].filter(function(c){ return !reglas['.cmes-c-' + c]; }),
    ['p090_caso_inventado'],
    'DISCRIMINADOR · el filtro de «sin regla propia» sí devuelve algo cuando la regla falta de verdad');
  const sinRegla = casos.filter(function(c){ return !reglas['.cmes-c-' + c]; }).sort();
  PRUEBAS.igual(sinRegla, [],
    'PIN · los 13 casos tienen regla `.cmes-c-<caso>` propia: ninguno hereda el par de `.cmes-d` (el historial, en el comentario)');

  const grupos = {};
  casos.forEach(function(c){
    const p = p090tPar(reglas, c);
    const k = p.fondoEfectivo + '|' + p.tinta + '|' + cmesGlifo(c);
    (grupos[k] || (grupos[k] = [])).push(c);
  });
  const juntos = Object.keys(grupos).map(function(k){ return grupos[k].sort(); })
    .filter(function(g){ return g.length > 1; })
    .sort(function(a, b){ return a[0] < b[0] ? -1 : 1; });
  /* `exceso`/`excedido` y `fuera`/`futuro` comparten par Y marca a propósito (así está en el plan):
     el primero porque los dos son «se pasó» y el detalle los separa; el segundo porque los dos son
     «acá no hay nada que mirar» y los dos salen `disabled`.
     ⚠️ ACÁ HABÍA UN TERCER GRUPO, `['cerrado','curso','descanso','sin_jornada']`, que era la
     consecuencia del pin de arriba y NO una decisión. Desapareció solo al agregarse las tres reglas.
     `franco` y `sin_jornada` comparten el par `--chip-bg`/`--text-soft` pero NO la marca (`franco`
     lleva «–» y `sin_jornada` no lleva ninguna), así que no se ven iguales y no forman grupo. */
  PRUEBAS.igual(juntos, [['excedido', 'exceso'], ['fuera', 'futuro']],
    'PIN · qué casos se ven EXACTAMENTE igual (mismo fondo, misma tinta, misma marca): sólo los dos grupos deliberados');
});

PRUEBAS.caso('los 13 casos pasan 4.5:1 entre la tinta del número y su relleno, en los DOS temas (leyendo el TOKEN, no el color cacheado de la casilla)', () => {
  /* Los 13 casos se derivan, así que `cerrado`, `curso` y `descanso` YA estaban en esta medición
     desde el primer día: lo que cambió es CONTRA QUÉ se miden. Antes los tres caían en
     `--chip-bg`/`--text-soft` (el par de `.cmes-d`) y acá pasaban midiendo el gris ajeno; ahora cada
     uno mide su propio par. El más ajustado es `curso` en el tema claro: `--orange-legible` sobre
     `--orange-bg` da 4,53:1, o sea que pasa por 0,03 — si alguien toca cualquiera de esos dos
     tokens, este caso es el que avisa. */
  const reglas = p090tReglas(p090tCss());
  const casos = p090tCasos();
  PRUEBAS.igual(casos.length, 13, 'guarda: hay 13 casos que medir');
  ['cerrado', 'curso', 'descanso'].forEach(function(c){
    PRUEBAS.cierto(!!reglas['.cmes-c-' + c], 'guarda: «' + c + '» se mide contra su par propio, no contra el `.cmes-d` heredado');
  });

  let medidas = 0;
  ['claro', 'oscuro'].forEach(function(tema){
    /* `PRUEBAS.enTema` LANZA si el tema no llegó a la resolución de estilos. Es la protección
       contra medir un tema contra sí mismo y anunciar «0 defectos» (P182/P184). */
    PRUEBAS.enTema(tema, function(){
      casos.forEach(function(c){
        const p = p090tPar(reglas, c);
        const fondo = CTX.token(p.fondoEfectivo);
        const tinta = CTX.token(p.tinta);
        medidas++;
        PRUEBAS.alMenos(CTX.contraste(tinta, fondo), 4.5,
          tema + ' · «' + c + '» · el número del día (' + p.tinta + ' → ' + tinta + ') sobre su relleno (' +
          p.fondoEfectivo + ' → ' + fondo + ')' + (p.transparente ? ' [relleno transparente: se mide contra el fondo de `.cmes`]' : ''));
      });
    });
  });
  PRUEBAS.igual(medidas, 26, 'guarda: se midieron los 13 casos en los dos temas, no uno solo');

  /* DISCRIMINADOR · se rompe un token A PROPÓSITO, por la misma cadena de medición (CSS → CTX.token
     → CTX.contraste), y el contraste tiene que desplomarse. Sin esto, un `alMenos` que siempre da
     el mismo número no prueba que la medición reaccione a nada. */
  const st = document.createElement('style');
  st.textContent = ':root, html[data-tema="claro"], html[data-tema="oscuro"] { --sem-verde-txt: var(--sem-verde-bg); }';
  try {
    document.head.appendChild(st);
    void document.body.offsetWidth;
    PRUEBAS.enTema('claro', function(){
      const p = p090tPar(reglas, 'completo');
      PRUEBAS.comoMucho(CTX.contraste(CTX.token(p.tinta), CTX.token(p.fondoEfectivo)), 1.5,
        'DISCRIMINADOR · con la tinta de «completo» puesta al valor de su propio relleno, la medición se cae: la cadena mide de verdad');
    });
  } finally { st.remove(); void document.body.offsetWidth; }

  /* Y al sacar el parche vuelve a estar bien: si `st.remove()` no surtiera efecto, las 26 medidas
     de arriba habrían sido las últimas buenas y el próximo caso mediría con el token roto. */
  PRUEBAS.enTema('claro', function(){
    const p = p090tPar(reglas, 'completo');
    PRUEBAS.alMenos(CTX.contraste(CTX.token(p.tinta), CTX.token(p.fondoEfectivo)), 4.5, 'guarda: sacado el parche, «completo» vuelve a contrastar');
  });
});

PRUEBAS.caso('R13 · todos los tokens que usa el CSS de P090 están definidos en los DOS temas (un var() que no resuelve computa a `inherit` sin error en consola)', () => {
  const css = p090tCss();
  const usados = [];
  const vistos = {};
  let m;
  const re = /var\(\s*(--[a-z0-9-]+)/g;
  while ((m = re.exec(css))) if (!vistos[m[1]]){ vistos[m[1]] = 1; usados.push(m[1]); }
  PRUEBAS.alMenos(usados.length, 8, 'guarda: se encontraron los tokens que usa el bloque (si no, lo de abajo mide cero)');

  /* ⚠️ El token se lee sobre un ELEMENTO, no sobre la raíz: así también se prueba que llega por
     herencia hasta donde se pinta la casilla. Es lo que dice `pruebas/LEEME.md` sobre la trampa del
     `var()` cacheado. */
  const sonda = document.createElement('div');
  document.body.appendChild(sonda);
  try {
    ['claro', 'oscuro'].forEach(function(tema){
      PRUEBAS.enTema(tema, function(){
        const faltan = usados.filter(function(k){ return !getComputedStyle(sonda).getPropertyValue(k).trim(); });
        PRUEBAS.igual(faltan, [], tema + ' · los ' + usados.length + ' tokens del calendario resuelven a un valor');
      });
    });
    PRUEBAS.igual(getComputedStyle(sonda).getPropertyValue('--p090-token-que-no-existe').trim(), '',
      'DISCRIMINADOR · un token inventado devuelve cadena vacía, o sea que la comprobación de arriba puede fallar');
  } finally { sonda.remove(); }
});

PRUEBAS.caso('ninguna casilla del calendario lleva background-image: el auditor de contraste saltea todo lo que la tenga y daría «0 defectos» sin haber mirado', () => {
  const prevLS = Object.assign({}, localStorage);
  let fila = null;
  /* Sincrónico de punta a punta: acá el `finally` del `try` es correcto. La advertencia de R18 es
     para los casos que disparan una promesa —ahí el `finally` sincrónico corre ANTES del `.then` y
     deja los estubos puestos para la prueba siguiente—, y este caso no dispara ninguna. */
  try {
    CTX.resetear();          // perfil de piloto: `renderSections()` emite el bloque del calendario
    const cont = document.getElementById('cmesMio');
    PRUEBAS.cierto(!!cont, 'guarda: el calendario del piloto está en el DOM (sin esto no hay nada que medir)');
    if (!cont) return;
    const grid = cont.querySelector('.cmes-grid');
    PRUEBAS.cierto(!!grid, 'guarda: la grilla existe');
    if (!grid) return;

    /* Los 13 casos no aparecen todos en un mes cualquiera, así que se agregan sembrando el marcado
       con el CONSTRUCTOR REAL (`cmesCeldaHtml`), no con una cadena de clases escrita a mano: si
       mañana la clase deja de ser `cmes-c-<caso>`, esta prueba lo sigue midiendo bien. */
    const casos = p090tCasos();
    fila = document.createElement('div');
    fila.setAttribute('role', 'row');
    fila.className = 'cmes-fila';
    fila.innerHTML = casos.map(function(c){
      return cmesCeldaHtml('mio', { f: P090T_DIA, delMes: true }, c, null, null, false, false, false);
    }).join('');
    grid.appendChild(fila);
    void document.body.offsetWidth;

    const celdas = [].slice.call(cont.querySelectorAll('.cmes-d'));
    PRUEBAS.alMenos(celdas.length, 28 + casos.length,
      'guarda: hay casillas medidas de verdad (el mes más corto son 28 días, más las ' + casos.length + ' sembradas)');

    const conImagen = celdas.filter(function(b){ return getComputedStyle(b).backgroundImage !== 'none'; });
    PRUEBAS.igual(conImagen.length, 0, 'ninguna casilla declara background-image (ni degradado ni imagen)');
    const otros = [].slice.call(cont.querySelectorAll('.cmes-ficha, .cmes-ley-c, .cmes-flecha'));
    PRUEBAS.alMenos(otros.length, 5, 'guarda: la leyenda y las flechas también se miden');
    PRUEBAS.igual(otros.filter(function(e){ return getComputedStyle(e).backgroundImage !== 'none'; }).length, 0,
      'ni las fichas de excepción, ni los cuadraditos de la leyenda, ni las flechas del mes');

    /* Lo que realmente importa no es el atributo: es que el auditor PUEDA medir la casilla. Se
       recorre su misma caminata y se exige que devuelva un color, no null. */
    const sinFondo = celdas.filter(function(b){ return p090tFondoAuditor(b, cont) === null; });
    PRUEBAS.igual(sinFondo.length, 0, 'el auditor de contraste consigue un fondo opaco para TODAS las casillas: ninguna se le saltea');

    /* DISCRIMINADOR · se le pone un degradado al contenedor y la caminata tiene que romperse.
       ⚠️ ESTE ASERTO ESTABA MAL Y SE CORRIGIÓ, no se ablandó. Exigía que se rompieran las
       `celdas.length` (43 en la corrida que lo cazó) y se rompían 32. La razón no es un defecto del
       código: la caminata arranca EN la casilla, y la que tiene fondo propio opaco devuelve su color
       en el primer paso sin mirar un solo ancestro — el degradado del contenedor no la puede tocar
       ni tiene por qué. Pedir que se rompieran todas era afirmar algo falso, y un aserto falso no es
       uno estricto. Suben sólo las casillas de relleno transparente, y cuáles son eso se saca del
       CSS (`p090tPar().transparente`, que ya contempla `.cmes-d:disabled`), no de una lista escrita
       a mano acá. */
    const reglas = p090tReglas(p090tCss());
    const transparentes = casos.filter(function(c){ return p090tPar(reglas, c).transparente; }).sort();
    PRUEBAS.igual(transparentes, ['fuera', 'futuro'],
      'del CSS: los únicos casos de relleno transparente —los que obligan al auditor a subir— son `fuera` y `futuro`');

    const celdasT = celdas.filter(p090tSube);
    const celdasO = celdas.filter(function(b){ return !p090tSube(b); });
    /* Guardas de cantidad · los dos grupos tienen que existir, o el discriminador de abajo compara
       dos ceros. La fila sembrada trae los 13 casos, así que los dos están garantizados mida lo que
       mida el mes real (que según el día y los datos cargados puede salir entero `fuera`). */
    PRUEBAS.alMenos(celdasT.length, transparentes.length,
      'guarda: hay casillas de relleno transparente que medir (al menos las sembradas de `fuera` y `futuro`)');
    PRUEBAS.alMenos(celdasO.length, casos.length - transparentes.length,
      'guarda: y casillas con fondo propio opaco, que son las que el degradado NO tiene que poder tapar');
    /* Y el CSS y el DOM tienen que estar diciendo lo mismo: sin esto, «se saltea justo a las
       transparentes» podría estar contando las casillas equivocadas y dar el número correcto. */
    PRUEBAS.igual(celdasT.map(p090tCasoDeCelda).filter(function(c){ return transparentes.indexOf(c) < 0; }), [],
      'ninguna casilla transparente en el DOM lleva un caso que el CSS pinta con fondo propio');
    PRUEBAS.igual(celdasO.map(p090tCasoDeCelda).filter(function(c){ return transparentes.indexOf(c) >= 0; }), [],
      'ni al revés: ninguna casilla opaca lleva un caso que el CSS declara `background: transparent`');

    cont.style.backgroundImage = 'linear-gradient(var(--card), var(--chip-bg))';
    void document.body.offsetWidth;
    const rotas = celdas.filter(function(b){ return p090tFondoAuditor(b, cont) === null; });
    const rotasOpacas = rotas.filter(function(b){ return !p090tSube(b); });
    cont.style.backgroundImage = '';
    void document.body.offsetWidth;
    /* Las dos juntas son igualdad de conjuntos, no sólo de cantidad: `rotas` sale de `celdas`, todas
       las rotas son transparentes, y son tantas como transparentes hay. */
    PRUEBAS.igual(rotas.length, celdasT.length,
      'DISCRIMINADOR · con un degradado en el contenedor, el auditor se saltea las ' + celdasT.length +
      ' casillas de relleno transparente: la caminata detecta de verdad');
    PRUEBAS.igual(rotasOpacas.map(p090tCasoDeCelda), [],
      'y no se saltea ninguna de las ' + celdasO.length + ' con fondo propio: ésas las resuelve en el primer paso y el ancestro no las alcanza');
    PRUEBAS.igual(celdas.filter(function(b){ return p090tFondoAuditor(b, cont) === null; }).length, 0,
      'y sacado el degradado vuelve a medirlas todas');
  } finally {
    if (fila && fila.parentNode) fila.parentNode.removeChild(fila);
    try { localStorage.clear(); Object.keys(prevLS).forEach(function(k){ localStorage.setItem(k, prevLS[k]); }); } catch(e){}
    try { renderSections(); } catch(e){}
  }
});
