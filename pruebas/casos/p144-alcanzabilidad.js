PRUEBAS.grupo('P144 · alcanzabilidad · lo que un grep no puede contestar');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   P143 costó días: `nominaRetomar()` estuvo muerta en producción con su llamador escrito una línea
   más arriba, y su suite en verde. La causa no fue un descuido puntual — fue que **no había forma
   de preguntar si a una función se puede LLEGAR**. Un grep encuentra la llamada; la pregunta es
   otra.

   Acá vive el espejo liviano de `pruebas/alcanzabilidad.py`, que es la herramienta completa (esa
   imprime el informe y tiene la lista blanca con motivos). Este caso hace el mismo barrido sobre
   el fuente y falla si alguna función de la LISTA VIGILADA —el alta y el login, que es donde
   pasó— deja de tener camino desde una raíz real.

   La distinción que hace todo el trabajo: un `onclick` que vive dentro de un template literal no
   es una raíz, es una ARISTA desde la función que genera ese HTML. Si esa función está muerta, el
   botón no existe nunca. Ahí es donde se cayó el camino viejo del alta.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Las que TIENEN que estar vivas. Son el camino que la persona recorre para entrar. */
var P144_VIGILADAS = [
  'nominaAbrir', 'nominaRetomar', 'nominaPasoCodigoInicial', 'nominaCodigoConfirmar',
  'nominaResolverCodigo', 'nominaPasoCedula', 'nominaCedulaBuscar', 'nominaPasoConfirmar',
  'nominaPiePintar', 'nominaVolver', 'nominaManual',
  'lgnAbrir', 'lgnEntrar', 'lgnCerrar', 'lgnPintarEmpresa', 'lgnOtraEmpresaSePuede',
  'splashIngresar', 'openSetup', 'saveProfile', 'setupCamposFaltantes', 'setupModoFaltantes',
  'perfilMerge', 'loadSetupLists', 'listasCacheGuardar', 'listasCacheAplicar'
];

function p144SinComentarios(txt){
  /* Los comentarios de este archivo CITAN funciones muertas para explicar que lo están: contarlos
     como aristas sería medir la propia prosa. Y de `//` sólo se quita el que abre la línea, para
     no comerse las URLs. */
  return String(txt).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, '');
}

function p144Grafo(src){
  /* El JS son los <script> sin `src`; el resto es el HTML ESTÁTICO, de donde salen las raíces de
     verdad (los `onclick=` que ya están escritos en el archivo, no los que alguien genera). */
  const js = [], htmlPartes = [];
  let ultimo = 0;
  const re = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(src))){
    htmlPartes.push(src.slice(ultimo, m.index));
    js.push(m[1]);
    ultimo = re.lastIndex;
  }
  htmlPartes.push(src.slice(ultimo));
  const jsTxt = p144SinComentarios(js.join('\n'));
  const html = htmlPartes.join('\n');

  // Cuerpos de las funciones declaradas en columna 0, cerrando por conteo de llaves.
  const L = jsTxt.split('\n');
  const fns = {}, cubiertas = {};
  for (let i = 0; i < L.length; i++){
    const mm = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(L[i]);
    if (!mm) continue;
    let prof = 0, j = i, cuerpo = [];
    while (j < L.length){
      prof += (L[j].split('{').length - 1) - (L[j].split('}').length - 1);
      cuerpo.push(L[j]);
      cubiertas[j] = 1;
      j++;
      if (prof <= 0 && j > i) break;
    }
    fns[mm[1]] = cuerpo.join('\n');
    i = j - 1;
  }
  const nombres = Object.keys(fns);
  const esFn = {}; nombres.forEach(n => esFn[n] = 1);

  /* Aristas: CUALQUIER mención del identificador, no sólo `nombre(`. Tiene que ser así — hay
     funciones que se alcanzan por referencia (`vis.map(gestCard)`), y darlas por muertas haría
     que alguien borre código que sí se usa. */
  const llama = {};
  nombres.forEach(n => {
    const vistos = fns[n].match(/[A-Za-z_$][\w$]*/g) || [];
    const s = {};
    vistos.forEach(v => { if (esFn[v] && v !== n) s[v] = 1; });
    llama[n] = Object.keys(s);
  });

  const raices = {};
  // 1 · atributos de evento del HTML estático
  const rea = /\bon[a-z]+\s*=\s*"([^"]*)"/g;
  let ma;
  while ((ma = rea.exec(html))){
    (ma[1].match(/[A-Za-z_$][\w$]*/g) || []).forEach(v => { if (esFn[v]) raices[v] = 1; });
  }
  // 2 · todo el JS que no vive dentro de una función declarada: el arranque, y también los
  //     cuerpos de los listeners inline y las IIFE de nivel superior.
  for (let i = 0; i < L.length; i++){
    if (cubiertas[i] || !L[i].trim()) continue;
    (L[i].match(/[A-Za-z_$][\w$]*/g) || []).forEach(v => { if (esFn[v]) raices[v] = 1; });
  }
  return { llama: llama, raices: Object.keys(raices), nombres: nombres };
}

function p144Vivas(g, quitar){
  const fuera = {}; (quitar || []).forEach(n => fuera[n] = 1);
  const vivas = {}, cola = [];
  g.raices.forEach(n => { if (!fuera[n]) { vivas[n] = 1; cola.push(n); } });
  while (cola.length){
    const a = cola.pop();
    (g.llama[a] || []).forEach(b => { if (!vivas[b] && !fuera[b]) { vivas[b] = 1; cola.push(b); } });
  }
  return vivas;
}

var P144_SRC = null;
function p144Fuente(){
  if (P144_SRC) return Promise.resolve(P144_SRC);
  return fetch('/index.html', { cache:'no-store' }).then(r => r.text()).then(t => (P144_SRC = t));
}

PRUEBAS.caso('🔴 el camino del alta y el login es ALCANZABLE, no sólo está escrito', async () => {
  const src = await p144Fuente();
  const g = p144Grafo(src);
  PRUEBAS.alMenos(g.nombres.length, 800, 'guarda: el grafo se armó (si el parser falla, todo daría muerto)');
  PRUEBAS.alMenos(g.raices.length, 50, 'guarda: hay raíces reales');
  const vivas = p144Vivas(g);
  const muertas = P144_VIGILADAS.filter(n => g.llama[n] !== undefined && !vivas[n]);
  PRUEBAS.igual(muertas.join(', '), '',
    '⚠️ ninguna función del alta/login quedó sin camino · así estuvo `nominaRetomar` durante días');
  const faltan = P144_VIGILADAS.filter(n => g.llama[n] === undefined);
  PRUEBAS.igual(faltan.join(', '), '',
    'y todas las vigiladas siguen existiendo con ese nombre · si se renombra una, esta lista se actualiza');
});

PRUEBAS.caso('el DISCRIMINADOR: sacando su única puerta, el retome cae', async () => {
  /* Sin esto, un barrido que diera "todo vivo" por un error de parseo pasaría verde arriba. Se
     saca `nominaAbrir` —el punto de entrada del alta— y se comprueba que `nominaRetomar` deja de
     tener camino: exactamente lo que le pasó cuando P132 dejó sin llamador a la otra puerta. */
  const g = p144Grafo(await p144Fuente());
  const vivas = p144Vivas(g, ['nominaAbrir']);
  PRUEBAS.igual(!!vivas['nominaRetomar'], false,
    'sin nominaAbrir, nominaRetomar queda sin camino · el barrido SÍ detecta el defecto de P143');
  PRUEBAS.igual(!!p144Vivas(g)['nominaRetomar'], true, 'y con ella puesta, vive');
});

PRUEBAS.caso('🔴 la caché de listas se ESCRIBE · el trío tenía dos patas', async () => {
  /* Lo encontró el barrido: `listasCacheAplicar()` leía y `listasCacheLimpiar()` borraba, pero
     `listasCacheGuardar()` no la llamaba nadie. La clave nunca se escribía, así que el lector
     devolvía false siempre y el alta pedía los departamentos a la red en cada intento, también
     sin señal (R7). Se entra por `loadSetupLists()`, que es quien recibe la respuesta. */
  const previo = Object.assign({}, localStorage);
  const prevFetch = fetchConReloj;
  const prevLoaded = SETUP_LISTS_LOADED;
  try {
    localStorage.removeItem(K_LISTAS_CACHE);
    SETUP_LISTS_LOADED = false;
    SETUP_LISTS.empresas = [];
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(
      { ok:true, empresas:['Consorcio HELITEC'], departamentos:['Operaciones','Mantenimiento'] }) });
    loadSetupLists();
    await new Promise(r => setTimeout(r, 80));
    const c = JSON.parse(localStorage.getItem(K_LISTAS_CACHE) || 'null');
    PRUEBAS.cierto(!!c, '⚠️ la caché quedó escrita · antes la clave no se creaba nunca');
    PRUEBAS.igual((c && c.departamentos || []).join(','), 'Operaciones,Mantenimiento',
      'con los departamentos adentro, que es lo que el alta necesita sin señal');
  } finally {
    fetchConReloj = prevFetch;
    SETUP_LISTS_LOADED = prevLoaded;
    try { localStorage.clear(); Object.keys(previo).forEach(k => localStorage.setItem(k, previo[k])); } catch(e){}
  }
});

PRUEBAS.caso('🔒 pero una lista VACÍA no se cachea — el discriminador', async () => {
  /* Guardar la respuesta vacía dejaría pegado el peor estado posible: el alta se abriría sin
     departamentos y sin volver a preguntar. */
  const previo = Object.assign({}, localStorage);
  const prevFetch = fetchConReloj;
  const prevLoaded = SETUP_LISTS_LOADED;
  try {
    localStorage.removeItem(K_LISTAS_CACHE);
    SETUP_LISTS_LOADED = false;
    SETUP_LISTS.empresas = [];
    fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:true, empresas:[], departamentos:[] }) });
    loadSetupLists();
    await new Promise(r => setTimeout(r, 80));
    PRUEBAS.igual(localStorage.getItem(K_LISTAS_CACHE), null,
      '🔒 la lista vacía NO se guarda · cachearla sería dejar pegado el peor estado');
  } finally {
    fetchConReloj = prevFetch;
    SETUP_LISTS_LOADED = prevLoaded;
    try { localStorage.clear(); Object.keys(previo).forEach(k => localStorage.setItem(k, previo[k])); } catch(e){}
  }
});
