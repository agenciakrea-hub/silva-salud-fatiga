
PRUEBAS.grupo('Lo que no tiene datos va abajo, en todos los paneles');

/* ⚠️ PEDIDO DE FRANCO, y la razón es de lectura, no de gusto: el panel de HSEQ abría con tres
   secciones en "todavía no hay datos" y la información real quedaba a tres pantallazos de scroll.
   La persona concluye que la app no tiene nada que mostrarle y deja de bajar.
   Sus palabras: "si algo no tiene data, para cualquier panel te digo, debe ir debajo, las cosas
   activas van siempre primero" y "lo que está como pendiente, y como spoiler de lo que se viene,
   debería estar abajo". */

function n5Hseq(conDatos){
  const prev = DASH;
  const base = { ok:true, rol:'empresa', vista:'hseq', referencia:{}, metricas:[],
    registros:[{ persona:'Ana Suárez', empresa:'E', departamento:'Op', cargo:'Piloto',
                 fecha: todayStr(), kss:5 }],
    comentarios:[], pvt:[], aptitud:[{ nombre:'Ana Suárez', dep:'Op', n:1, metricas:[], estado:'ok' }],
    operacional:[], turnos:[], config:{}, marca:null, duty:null, ausencias:{} };
  if (conDatos) base.duty = { dias:7, sinUmbralCongelado:0, personas:[], historico:[],
    diario:[{ persona:'Ana Suárez', empresa:'E', departamento:'Op', fecha: todayStr(),
              jornadaMin:800, previstoMin:720, excesoMin:80, abierto:false, umbralCongelado:true, tramos:[] }] };
  onDashData(base, 'E', {}, 'hseq');
  renderDash();
  const secs = [...document.querySelectorAll('#dashBody .dash-sec')]
    .map(s => ({ tab: s.dataset.tab, vacia: s.classList.contains('dash-sec--vacia') }));
  DASH = prev;
  return secs;
}

PRUEBAS.caso('⚠️ las secciones sin datos quedan TODAS al final, sin mezclarse', () => {
  const secs = n5Hseq(false);
  PRUEBAS.alMenos(secs.length, 6, 'guarda de medibilidad: tiene que pintar las secciones de HSEQ');
  const i = secs.findIndex(s => s.vacia);
  PRUEBAS.alMenos(i, 0,
    '⚠️ con este payload TIENE que haber alguna sin datos, o el caso no está midiendo nada');
  PRUEBAS.cierto(secs.slice(i).every(s => s.vacia),
    '⚠️ una vez que empiezan las vacías, no puede volver a aparecer una con datos — el orden es: ' +
    secs.map(s => s.tab + (s.vacia ? '(vacía)' : '')).join(' · '));
});

PRUEBAS.caso('⚠️ el "spoiler de lo que se viene" va abajo aunque tenga mucho HTML', () => {
  /* `predictivo` emite 6.213 caracteres y ninguno es un dato: es el anticipo de lo que va a hacer
     la función. Por largo parecería la sección más llena de todas, así que va en una lista
     explícita — no hay forma de deducirlo del HTML, y fingir que sí la habría es peor. */
  const secs = n5Hseq(false);
  const i = secs.findIndex(s => s.tab === 'predictivo');
  PRUEBAS.alMenos(i, 0, 'la sección tiene que existir');
  if (i < 0) return;
  PRUEBAS.cierto(secs[i].vacia, '⚠️ el predictivo va marcado como anticipo, no como contenido');
  const conDatos = secs.filter(s => !s.vacia).length;
  PRUEBAS.cierto(i >= conDatos, '⚠️ y queda por debajo de todo lo que sí tiene datos');
});

PRUEBAS.caso('⚠️ una sección que RECIBE datos sube (discriminador)', () => {
  /* Sin esto, "todo va abajo" pasaría el caso de arriba y la regla no probaría nada. */
  const sin = n5Hseq(false), con = n5Hseq(true);
  const jSin = sin.find(s => s.tab === 'jornada'), jCon = con.find(s => s.tab === 'jornada');
  PRUEBAS.cierto(!!jSin && !!jCon, 'la sección de jornada tiene que existir en los dos casos');
  if (!jSin || !jCon) return;
  PRUEBAS.cierto(jSin.vacia, 'sin `duty` está vacía');
  PRUEBAS.falso(jCon.vacia, '⚠️ y CON `duty` sube: la regla sigue al dato, no al nombre de la sección');
});

PRUEBAS.caso('⚠️ el orden entre las que sí tienen datos NO cambia entre refrescos', () => {
  /* `sort` es estable desde ES2019, así que dentro de cada grupo se conserva el orden que decidió
     `dashOrderedTabs()`. Sin eso, las secciones se reordenarían solas en cada refresco y nadie
     encontraría dos veces lo mismo en el mismo lugar. */
  const a = n5Hseq(false).map(s => s.tab).join(',');
  const b = n5Hseq(false).map(s => s.tab).join(',');
  PRUEBAS.igual(a, b, '⚠️ dos renders del mismo estado tienen que dar el mismo orden');
});

PRUEBAS.caso('⚠️ el detector busca la clase que EXISTE', () => {
  /* Escribí primero `dash-vacio`, que suena razonable y no existe en el CSS: el detector habría
     devuelto false siempre, ninguna sección se habría movido, y la regla habría quedado como código
     muerto que parece andar. Es el patrón de R17, y por eso el caso comprueba la clase real. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/class="dv"/.test(String(dashVacio)),
    '⚠️ `dashVacio()` tiene que seguir emitiendo `class="dv"` — si cambia, el detector deja de ver');
  /* ⚠️ SIN LOS COMENTARIOS, y esto ya me pasó con un hex hace dos horas: el comentario que explica
     que `dash-vacio` NO existe contiene la palabra `dash-vacio`, así que el caso se ponía en rojo
     por su propia explicación. La salida fácil sería borrar el comentario; la correcta es que el
     caso mire CÓDIGO. */
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  PRUEBAS.falso(/dash-vacio/.test(sinComentarios),
    '⚠️ y no puede volver a aparecer `dash-vacio` EN EL CÓDIGO: es la clase que no existe');
  PRUEBAS.alMenos(sinComentarios.length, 10000, 'guarda: tras sacar comentarios tiene que quedar código');
});
