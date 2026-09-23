PRUEBAS.grupo('P090 · calendario de jornadas · los OCHO estados del motor tienen caso visual y rótulo, y los textos existen en los dos idiomas, sin voseo (R1) y sin término de sector (R14)');

/* ── Por qué este archivo es mitad estático y mitad vivo ────────────────────────────────────────
   Nada de lo que falla acá se ve al usar la app, y ése es el punto:
   · un estado que `cicloEstado` devuelve y `cmesCaso` no contempla no lanza — devuelve el estado
     tal cual, `cmesPeso` da 99, y la casilla queda sin color propio y al final del orden de
     «lo que pide una mirada». Sin síntoma.
   · una clave que falta en `en` tampoco lanza: `t()` cae a español (`index.html:11537`) y la app
     en inglés muestra una frase en castellano que nadie reporta.
   Por eso se mira la FORMA del código y el contenido del diccionario, no la pantalla.

   Y todo lo que se deriva se deriva del archivo REAL, nunca de una tabla copiada del plan. */

const P090I_ESTADOS_CONGELADOS = ['cerrado', 'completo', 'curso', 'descanso', 'detenido', 'excedido', 'inactivo', 'sin_cierre'];
const P090I_VOSEO = /\b(vos|tenés|podés|querés|tocá|volvé|empezá|acordate)\b/i;
/* R14 · el calendario no puede nombrar un sector: el mismo texto lo lee un piloto y un operario de
   planta. Los nombres de evento del detalle NO salen de acá (los resuelve `cicloEventoLabel`). */
const P090I_SECTOR = /\b(aeropuerto|piloto|pilotos|vuelo|vuelos|tripulaci[oó]n|aeronave|copiloto|flight|flights|airport|crew|aircraft)\b/i;

/* Los OCHO valores que `cicloEstado` puede devolver, sacados de su propio código.
   `p186-ciclo-detenido-cliente.js:165` congela la lista a mano; acá se DERIVA y se compara contra
   esa misma lista, así una se cuida de la otra: si aparece un noveno estado, la derivación lo trae
   y la comparación avisa; si la derivación deja de enganchar, la comparación también avisa.
   `[^.\w]` deja afuera `tr.estado = …`, y `st.estado === 'x'` no entra porque después del primer
   `=` viene otro `=` y no la comilla. Los `estado:'futuro'` / `'cerrado_sup'` de los TRAMOS tampoco:
   salen por `return Object.assign(…)`, no por `return { estado:`. */
function p090iEstados(){
  const src = String(cicloEstado);
  const out = {};
  let m;
  const r1 = /return\s*\{\s*estado\s*:\s*'([a-z_]+)'/g;
  while ((m = r1.exec(src))) out[m[1]] = 1;
  const r2 = /(^|[^.\w])estado\s*=\s*'([a-z_]+)'/g;
  while ((m = r2.exec(src))) out[m[2]] = 1;
  return Object.keys(out).sort();
}

/* Los casos de DÍA que no son un ciclo, sacados de los literales que devuelve `cmesCasoDia`. */
function p090iCasosDia(){
  const out = {};
  let m;
  const r = /return\s*'([a-z_]+)'/g, src = String(cmesCasoDia);
  while ((m = r.exec(src))) out[m[1]] = 1;
  return Object.keys(out).sort();
}

/* Las claves `cmes_*` / `hlp_cmes_*` que hay REALMENTE en el diccionario de un idioma, mirando el
   objeto `I18N` y no el texto del archivo.
   ⚠️ A propósito: el diccionario `es` arranca en `index.html:7489` y el `en` en `:9504`, y un
   chequeo que corte el texto entre los dos por índice y se pase de largo da falso verde (encuentra
   las claves de `es` creyendo que son las de `en`). Recorriendo el objeto no hay dónde cortar mal.
   Se recorren TODOS los bloques del idioma (`_`, `aviacion`, `planta`, `campo`, `generico`) porque
   una clave puesta en el bloque equivocado también es un defecto que se vería como si no estuviera. */
function p090iClavesDic(lang){
  const L = (typeof I18N !== 'undefined' && I18N) ? I18N[lang] : null;
  const out = {};
  if (!L) return out;
  Object.keys(L).forEach(function(bloque){
    const d = L[bloque];
    if (!d || typeof d !== 'object') return;
    Object.keys(d).forEach(function(k){ if (/^(hlp_)?cmes_/.test(k)) out[k] = bloque; });
  });
  return out;
}

/* Las claves que el CÓDIGO pide, no las que el diccionario tiene: los literales `'cmes_…'` que hay
   en los scripts de la página. Se descarta lo que termina en `_` porque es media clave —
   `cmesRotulo` arma `t('cmes_e_' + caso)`, y esos se agregan aparte con los casos reales. */
function p090iClavesUsadas(){
  const src = [].slice.call(document.querySelectorAll('script')).map(function(s){ return s.textContent; }).join('\n');
  const out = {};
  let m;
  const r = /'((?:hlp_)?cmes_[a-z0-9_]+)'/g;
  while ((m = r.exec(src))) if (!/_$/.test(m[1])) out[m[1]] = 1;
  return Object.keys(out).sort();
}

PRUEBAS.caso('cmesCaso cubre los OCHO estados que cicloEstado puede devolver, y cada caso tiene peso y rótulo', () => {
  const estados = p090iEstados();
  PRUEBAS.igual(estados, P090I_ESTADOS_CONGELADOS,
    'los estados derivados de `cicloEstado` son los mismos ocho que congeló p186 (si no coinciden, uno de los dos quedó viejo)');

  const sinCaso = [], sinPeso = [], sinRotulo = [];
  estados.forEach(function(e){
    const caso = cmesCaso({ estado: e });
    if (!caso || typeof caso !== 'string') { sinCaso.push(e); return; }
    if (cmesPeso(caso) >= 99) sinPeso.push(e + '→' + caso);
    /* `t()` devuelve la CLAVE cuando no encuentra nada: es la forma de saber que falta el rótulo
       sin que haya excepción (`index.html:11538`). */
    if (cmesRotulo(caso) === 'cmes_e_' + caso) sinRotulo.push(e + '→' + caso);
  });
  PRUEBAS.igual(sinCaso, [], 'los ocho estados tienen caso visual en `cmesCaso`');
  PRUEBAS.igual(sinPeso, [], 'los ocho casos tienen peso en `cmesPesos` (sin peso, 99: el día queda último en «lo que pide una mirada»)');
  PRUEBAS.igual(sinRotulo, [], 'los ocho casos tienen rótulo `cmes_e_*` que resuelve');

  /* LAS DOS LÍNEAS QUE IMPORTAN (§4.2 del plan). Un ciclo PASADO que se pasó de tiempo devuelve
     `completo`, no `excedido`: la bandera del ciclo sólo se prende en la rama del tramo EN CURSO, y
     el único sobreviviente es `huboExceso`. Con la regla ingenua (`st.estado === 'excedido'`) todos
     los días pasados con exceso salían VERDES. El caso 3 del plan lo prueba con un ciclo real
     sembrado; acá se fija el mapeo, que es lo que aquel caso da por sentado. */
  PRUEBAS.igual(cmesCaso({ estado: 'completo', huboExceso: true }), 'exceso', 'completo + huboExceso → «exceso» (rojo), no «completo»');
  PRUEBAS.igual(cmesCaso({ estado: 'completo', huboExceso: false }), 'completo', 'completo sin exceso → «completo»');
  PRUEBAS.igual(cmesCaso({ estado: 'completo' }), 'completo', 'sin la bandera (ciclos viejos) → «completo»: sólo `true` cuenta');
  /* ⚠️ RENOMBRADO en P200 (2026-09-23): era «parcial», con el rótulo «Registró sin marcar la salida
     de casa». La auditoría de cierre de tanda mostró que el caso más común de `inactivo` no es un
     descuido de la persona sino el PRIMER día del período traído, cuya jornada empezó antes del
     corte — así que el calendario le atribuía a alguien, todos los meses, un olvido que no cometió,
     y lo subía a las fichas de excepción. El caso ahora se llama `sin_apertura` y nombra el hecho. */
  PRUEBAS.igual(cmesCaso({ estado: 'inactivo' }), 'sin_apertura', 'inactivo (falta el evento inicial) → «sin_apertura»: nombra el hecho, no a la persona');
  PRUEBAS.igual(cmesCaso(null), 'sin_apertura', 'sin estado → «sin_apertura», nunca `undefined` en la clase de la casilla');

  /* DISCRIMINADOR · un estado inventado tiene que caerse por los tres lados. Si `cmesPeso` diera un
     número para cualquier cosa, o `t()` inventara un rótulo, las tres listas vacías de arriba serían
     un cero que no mide nada. */
  const falso = cmesCaso({ estado: 'p090_estado_inventado' });
  PRUEBAS.igual(falso, 'p090_estado_inventado', 'DISCRIMINADOR · `cmesCaso` deja pasar tal cual lo que no conoce (por eso hay que comprobar la cobertura)');
  PRUEBAS.igual(cmesPeso(falso), 99, 'DISCRIMINADOR · un caso sin peso da 99, o sea que la comprobación de peso puede fallar');
  PRUEBAS.igual(cmesRotulo(falso), 'cmes_e_p090_estado_inventado', 'DISCRIMINADOR · un caso sin rótulo devuelve la clave, o sea que la comprobación de rótulo puede fallar');

  /* Guardarraíl de p186:167 · los cuatro `const ETIQ` del ciclo no se tocaron. P090 agregó un mapa
     nuevo (`cmesPesos`) y no debía sumar un quinto ETIQ ni sacar ninguno. */
  const src = [].slice.call(document.querySelectorAll('script')).map(function(s){ return s.textContent; }).join('\n');
  PRUEBAS.igual((src.match(/const ETIQ = \{[\s\S]*?\};/g) || []).length, 4,
    'guarda: siguen siendo cuatro los `const ETIQ` (piloto, supervisor, pantalla completa, tarjeta de Aptitud)');
});

PRUEBAS.caso('los cuatro casos de DÍA que no son un ciclo también tienen peso o rótulo, y los 13 en total están cubiertos', () => {
  const dia = p090iCasosDia();
  PRUEBAS.igual(dia, ['fuera', 'franco', 'futuro', 'sin_jornada'].sort(), 'los casos de día salen de los literales de `cmesCasoDia`');

  const todos = {};
  p090iEstados().forEach(function(e){
    todos[cmesCaso({ estado: e })] = 1;
    todos[cmesCaso({ estado: e, huboExceso: true })] = 1;
  });
  dia.forEach(function(c){ todos[c] = 1; });
  const casos = Object.keys(todos).sort();
  PRUEBAS.igual(casos.length, 13, 'guarda: 9 casos de ciclo + 4 de día = 13 (si la derivación no engancha, lo de abajo mide cero)');

  const sinRotulo = casos.filter(function(c){ return cmesRotulo(c) === 'cmes_e_' + c; });
  PRUEBAS.igual(sinRotulo, [], 'los 13 casos tienen rótulo `cmes_e_*` que resuelve');
  /* `cmesGlifo` devuelve '' para los casos sin marca: eso es correcto y no se exige lo contrario.
     Lo que sí se exige es que no devuelva la CLAVE, que sería una marca «cmes_m_exceso» en la casilla. */
  const glifoCrudo = casos.filter(function(c){ return /^cmes_m_/.test(cmesGlifo(c)); });
  PRUEBAS.igual(glifoCrudo, [], 'ninguna marca sale como la clave cruda (`cmes_m_…`) en la casilla');
});

PRUEBAS.caso('R14 · toda clave `cmes_*` / `hlp_cmes_*` existe en `es` Y en `en` (si falta en `en`, t() cae a español sin error ni síntoma)', () => {
  const es = p090iClavesDic('es'), en = p090iClavesDic('en');
  const kEs = Object.keys(es).sort(), kEn = Object.keys(en).sort();
  PRUEBAS.alMenos(kEs.length, 40, 'guarda: el recorrido del diccionario encontró las claves del calendario (si da 0, todo lo de abajo es un cero vacío)');
  PRUEBAS.igual(kEs.filter(function(k){ return !en[k]; }), [], 'ninguna clave del calendario está sólo en español');
  PRUEBAS.igual(kEn.filter(function(k){ return !es[k]; }), [], 'ninguna clave del calendario está sólo en inglés');

  /* Las que el CÓDIGO pide, que es lo que de verdad se ve en pantalla. Se suman las dinámicas:
     `cmesRotulo` arma `cmes_e_<caso>` y `cmesGlifo` arma `cmes_m_<caso>` en tiempo de ejecución, y
     un barrido de literales NO las encuentra. */
  const usadas = p090iClavesUsadas();
  PRUEBAS.alMenos(usadas.length, 35, 'guarda: el barrido de literales encontró las claves que pide el código');
  const dia = p090iCasosDia();
  const todos = {};
  p090iEstados().forEach(function(e){ todos[cmesCaso({ estado: e })] = 1; todos[cmesCaso({ estado: e, huboExceso: true })] = 1; });
  dia.forEach(function(c){ todos[c] = 1; });
  const pedidas = usadas.concat(Object.keys(todos).map(function(c){ return 'cmes_e_' + c; }));

  const faltan = [];
  ['es', 'en'].forEach(function(lang){
    pedidas.forEach(function(k){
      const v = _i18nBuscar(lang, SECTOR_FALLBACK, k);
      if (v == null || v === k) faltan.push(lang + ':' + k);
    });
  });
  PRUEBAS.igual(faltan, [], 'todas las claves que el calendario pide resuelven en los dos idiomas por `_i18nBuscar`');

  PRUEBAS.igual(_i18nBuscar('en', SECTOR_FALLBACK, 'cmes_clave_inventada_p090'), null,
    'DISCRIMINADOR · una clave inventada devuelve null, o sea que la comprobación de arriba puede fallar');

  /* DISCRIMINADOR del que más cuesta darse cuenta: que el diccionario `en` que se está leyendo sea
     de verdad el inglés. Si la lectura cayera en `es` (por un corte mal hecho entre los dos, o
     porque el respaldo a español se dispara siempre), TODAS las comprobaciones de arriba darían
     verde igual. Las 5 claves que coinciden a propósito son las marcas («+», «○», «■», «·», «–»). */
  const distintas = kEs.filter(function(k){
    const a = _i18nBuscar('es', SECTOR_FALLBACK, k), b = _i18nBuscar('en', SECTOR_FALLBACK, k);
    return a != null && b != null && a !== b;
  });
  PRUEBAS.alMenos(distintas.length, 40,
    'DISCRIMINADOR · ' + distintas.length + ' de ' + kEs.length + ' claves dicen algo DISTINTO en inglés: se está leyendo el diccionario `en`, no el `es` dos veces');
});

PRUEBAS.caso("tLista('meses') devuelve 12 entradas en los dos idiomas, y `cmesMesLabel` arma el título con ellas", () => {
  /* Se guarda el valor CRUDO de la clave para devolver el `localStorage` exactamente como estaba
     (R18): `fijarIdioma(previo)` dejaría escrita una clave que antes podía no existir. */
  let crudo = null;
  try { crudo = localStorage.getItem(K_LANG); } catch(e){}
  try {
    fijarIdioma('es');
    const mesesEs = tLista('meses'), diasEs = tLista('dias_abr'), etEs = cmesMesLabel('2026-09');
    fijarIdioma('en');
    const mesesEn = tLista('meses'), diasEn = tLista('dias_abr'), etEn = cmesMesLabel('2026-09');

    PRUEBAS.igual(mesesEs.length, 12, 'español: 12 meses');
    PRUEBAS.igual(mesesEn.length, 12, 'inglés: 12 meses');
    PRUEBAS.igual(new Set(mesesEs).size, 12, 'español: los 12 son distintos (un espacio de más partiría uno en dos y dejaría repetidos)');
    PRUEBAS.igual(new Set(mesesEn).size, 12, 'inglés: los 12 son distintos');
    PRUEBAS.igual(mesesEs.filter(function(m){ return !m.trim(); }), [], 'español: ninguno vacío');
    PRUEBAS.igual(mesesEn.filter(function(m){ return !m.trim(); }), [], 'inglés: ninguno vacío');
    PRUEBAS.igual(diasEs.length, 7, 'español: 7 días en el encabezado de la grilla');
    PRUEBAS.igual(diasEn.length, 7, 'inglés: 7 días en el encabezado de la grilla');

    /* El título del mes NO se concatena en el código: sale de `cmes_mes_anio`, que en español es
       «{m} de {a}» y en inglés «{m} {a}». Se comprueba que use el nombre del mes y el año, sin
       exigir un orden — el orden es del idioma. */
    PRUEBAS.cierto(etEs.indexOf(mesesEs[8]) >= 0 && etEs.indexOf('2026') >= 0, 'español: el título de septiembre 2026 es «' + etEs + '»');
    PRUEBAS.cierto(etEn.indexOf(mesesEn[8]) >= 0 && etEn.indexOf('2026') >= 0, 'inglés: el título de septiembre 2026 es «' + etEn + '»');

    /* DISCRIMINADOR · si `fijarIdioma('en')` no hubiera llegado a `tLista`, las dos listas serían la
       misma y «12 en los dos idiomas» sería un verde sobre una sola medición hecha dos veces. */
    PRUEBAS.cierto(mesesEs.join(' ') !== mesesEn.join(' '), 'DISCRIMINADOR · las dos listas dicen cosas distintas: el cambio de idioma llegó de verdad hasta `tLista`');
    PRUEBAS.cierto(etEs !== etEn, 'DISCRIMINADOR · y el título del mes también cambia con el idioma');
  } finally {
    try { if (crudo === null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, crudo); } catch(e){}
    try { aplicarIdioma(); } catch(e){}
  }
});

PRUEBAS.caso('R1 · español NEUTRO en todos los rótulos del calendario (tú / impersonal, nunca voseo) · R14 · sin un solo término de sector', () => {
  const es = p090iClavesDic('es'), en = p090iClavesDic('en');
  const kEs = Object.keys(es).sort();
  PRUEBAS.alMenos(kEs.length, 40, 'guarda: hay rótulos que barrer');

  PRUEBAS.cierto(P090I_VOSEO.test('Si vos querés, tocá el botón y volvé'),
    'DISCRIMINADOR · el barrido antivoseo sí engancha cuando hay voseo');
  const conVoseo = kEs.filter(function(k){ return P090I_VOSEO.test(String(_i18nBuscar('es', SECTOR_FALLBACK, k))); });
  PRUEBAS.igual(conVoseo, [], 'R1 · ningún rótulo del calendario está en rioplatense');

  PRUEBAS.cierto(P090I_SECTOR.test('La tripulación del vuelo'), 'DISCRIMINADOR · el barrido de R14 sí engancha un término de sector');
  const conSector = [];
  kEs.forEach(function(k){ if (P090I_SECTOR.test(String(_i18nBuscar('es', SECTOR_FALLBACK, k)))) conSector.push('es:' + k); });
  Object.keys(en).forEach(function(k){ if (P090I_SECTOR.test(String(_i18nBuscar('en', SECTOR_FALLBACK, k)))) conSector.push('en:' + k); });
  PRUEBAS.igual(conSector, [],
    'R14 · el calendario no nombra un sector en ninguno de los dos idiomas: el mismo texto lo lee un piloto y un operario de planta');

  /* Los rótulos van al bloque `_` (común a todos los sectores) a propósito: no hay terminología que
     cambie por industria en esta pantalla. Si alguno aparece en un bloque de sector, es que se
     coló un término y R14 dejó de estar garantizada por construcción. */
  const fueraDelComun = kEs.filter(function(k){ return es[k] !== '_'; });
  PRUEBAS.igual(fueraDelComun, [], 'todos los rótulos viven en el bloque común `_`, no en un bloque de sector');
});
