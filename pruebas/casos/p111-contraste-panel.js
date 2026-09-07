PRUEBAS.grupo('P111 · A7-b · la deuda R13 del panel, y el auditor que informaba 47 donde había 6');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   ── EL NÚMERO ERA EL PROBLEMA ANTES QUE LOS COLORES ─────────────────────────────────────────
   La auditoría del panel (216 corridas × 2 temas × 6 anchos) informaba «47 hallazgos únicos».
   Eran SEIS defectos de código: la clave de agrupación incluía el texto medido, así que un solo
   color mal contrastado aparecía una vez por cada número que hubiera en pantalla — 33 veces para
   uno solo de ellos. Un número inflado no exagera nada más: **esconde la forma del problema**.
   Con 47 parecía una lista larga de arreglos sueltos; con 6 se ve lo que era, un puñado de sitios
   usando el token equivocado.
   Lo mismo con «165 textos que no se pudieron medir»: el barrido recorría los `<script>` del body,
   cuyo `textContent` son los comentarios del código.

   ── LOS DEFECTOS, UNA VEZ QUE SE PODÍAN VER ─────────────────────────────────────────────────
   Todos la misma causa, y estaba diagnosticada desde antes en el CSS: «los `--sem-*` normales
   están calibrados como RELLENO y en tema claro se quedan cortos como texto». Existe la familia
   `--sem-*-txt` justamente para eso. Los sitios que fallaban no la usaban:
   · las guías ⓘ escribían «verde», «amarillo», «rojo», «Apto con condiciones» y «Pendiente de
     revisión» con el token de relleno (2,74:1 · 2,87:1 · 3,96:1 · 4,28:1);
   · `.ac-badge` y `.me-val.over` usaban `--sem-rojo-alt` sobre `--sem-rojo-bg` (4,26:1).
   NINGÚN color del semáforo cambió: lo que cambió es con qué tinta se escribe una palabra.

   ── Y UN FALSO POSITIVO QUE ERA EL MÁS RUIDOSO ──────────────────────────────────────────────
   `.db-v L=0.90` con 108 apariciones: es el selector de vista de la barra de DEMOSTRACIÓN, cuyo
   chip activo es claro en los dos temas a propósito porque la barra que lo contiene es oscura en
   los dos. No había nada que arreglar. Está documentado en `CLARAS_A_PROPOSITO`, con su motivo.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

/* Los pares (tinta, fondo) que fallaban, con el ratio que daban. Se comprueba el TOKEN, que es
   donde vive la decisión, en vez de repetir la auditoría entera acá: la auditoría son 216 corridas
   y tarda 40 s; esto corre en milisegundos y falla por el mismo motivo. */
const P111_PARES = [
  { tinta: '--sem-rojo-txt',  fondo: '--sem-rojo-bg',  antes: '4.26:1 con --sem-rojo-alt' },
  { tinta: '--sem-ambar-txt', fondo: '--sem-ambar-bg', antes: '2.87:1 con --sem-ambar' },
  { tinta: '--sem-verde-txt', fondo: '--sem-verde-bg', antes: '2.74:1 con --sem-verde' },
];

function p111Ratio(tinta, fondo){
  const cs = getComputedStyle(document.documentElement);
  const a = cs.getPropertyValue(tinta).trim(), b = cs.getPropertyValue(fondo).trim();
  if (!a || !b) return null;
  const lum = css => {
    const m = String(css).trim();
    let r, g, bl;
    if (m[0] === '#') {
      const h = m.length === 4 ? m.slice(1).split('').map(c => c + c).join('') : m.slice(1);
      r = parseInt(h.slice(0,2),16); g = parseInt(h.slice(2,4),16); bl = parseInt(h.slice(4,6),16);
    } else {
      const n = m.match(/[\d.]+/g); if (!n) return null;
      r = +n[0]; g = +n[1]; bl = +n[2];
    }
    const f = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(bl);
  };
  const la = lum(a), lb = lum(b);
  if (la == null || lb == null) return null;
  return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
}

['claro', 'oscuro'].forEach(tema => {
  PRUEBAS.caso('⚠️ R13 · la tinta semántica llega a 4,5:1 sobre su fondo · tema ' + tema, () => {
    const previo = document.documentElement.getAttribute('data-tema');
    document.documentElement.setAttribute('data-tema', tema);
    try {
      P111_PARES.forEach(p => {
        const r = p111Ratio(p.tinta, p.fondo);
        /* Guarda de medibilidad: un token que no resuelve devuelve '' y `p111Ratio` da null. Sin
           esto, borrar un token dejaría el caso en verde — que es como se cuela un `var()` roto,
           porque no da error en consola: computa a `inherit`. */
        PRUEBAS.cierto(r != null,
          'guarda: `' + p.tinta + '` y `' + p.fondo + '` existen en el tema ' + tema);
        if (r == null) return;
        PRUEBAS.alMenos(Math.round(r * 100), 450,
          '⚠️ ' + p.tinta + ' sobre ' + p.fondo + ' = ' + r.toFixed(2) + ':1 · antes: ' + p.antes);
      });
    } finally {
      if (previo) document.documentElement.setAttribute('data-tema', previo);
      else document.documentElement.removeAttribute('data-tema');
    }
  });
});

PRUEBAS.caso('⚠️ las guías escriben el nombre del color con la tinta, no con el relleno', () => {
  /* El defecto vivía en las CADENAS de ayuda (`hlp_aptitud`, `hlp_heatmap`, `hlp_res_grupo`), en
     los dos idiomas. Se comprueban las cadenas y no el DOM porque una guía cerrada no se puede
     medir, y son exactamente las que nadie mira hasta que las necesita. */
  const claves = ['hlp_aptitud', 'hlp_heatmap', 'hlp_res_grupo'];
  let revisadas = 0, malas = [];
  /* ⚠️ EL IDIOMA SE RESTAURA EN UN `finally`, Y SE LEE CON `idiomaActual()`. La primera versión
     leía `IDIOMA`, que es una variable del ámbito del script y desde acá da `undefined`: la guarda
     `if (previo)` no restauraba nada y la app quedaba EN INGLÉS para todo lo que corriera
     después. Lo destapó el auditor del panel, que busca el botón «Ver demostración con datos
     simulados» por su texto y tiró «no se encontró». Una prueba que ensucia el estado global rompe
     a las que vienen detrás y el síntoma aparece lejos de la causa. */
  const idiomaPrevio = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  try {
    ['es', 'en'].forEach(idioma => {
      fijarIdioma(idioma);
      claves.forEach(k => {
        let txt = ''; try { txt = t(k) || ''; } catch (e) {}
        if (!txt) return;
        revisadas++;
        /* Los de RELLENO como color de texto. `-int` queda fuera a propósito: da de sobra y es el
           que marca «No apto», que tiene que pesar más que el resto. */
        const m = txt.match(/color:var\(--sem-(?:verde|ambar|rojo|rojo-alt)\)/g);
        if (m) malas.push(idioma + '/' + k + ': ' + m.join(', '));
      });
    });
  } finally {
    fijarIdioma(idiomaPrevio);
  }
  PRUEBAS.alMenos(revisadas, 4, 'guarda de medibilidad: se leyeron las guías en los dos idiomas');
  /* Y que el caso devolvió la app como la encontró. Sin esto, romper el `finally` no se nota acá:
     se nota tres archivos más adelante, en un caso que no tiene nada que ver. */
  PRUEBAS.igual(idiomaActual(), idiomaPrevio,
    '⚠️ el caso deja el idioma como estaba · cambiarlo y no restaurarlo rompe a los que siguen');
  PRUEBAS.igual(malas.join(' | '), '',
    '⚠️ un token de relleno como tinta da entre 2,74:1 y 4,28:1 · va el `-txt` correspondiente');
});

/* El auditor no vive en esta suite sino en las páginas `auditar-*.html`, así que hay que traerlo.
   Se carga UNA vez y se reusa. Saltear el caso cuando no está sería un verde falso: justamente los
   dos casos de abajo existen para que el instrumento no vuelva a informar mal. */
let P111_AUD = null;
function p111Auditor(){
  if (P111_AUD) return Promise.resolve(P111_AUD);
  if (typeof AUDITOR !== 'undefined' && AUDITOR.causaDe) return Promise.resolve(P111_AUD = AUDITOR);
  /* ⚠️ CON `<script>` Y CON PLAZO, no con `fetch` + `eval`. La primera versión hacía
     `eval(await fetch(...))` y cuando el pedido no resolvía la suite quedaba COLGADA en
     «corriendo…» — peor que fallar, porque no dice nada y hay que ir a buscarlo a la consola.
     Acá, si no carga en 5 s el caso se pone en rojo y la suite sigue. */
  return new Promise(res => {
    const el = document.createElement('script');
    let listo = false;
    const fin = () => { if (listo) return; listo = true;
      res(P111_AUD = (typeof AUDITOR !== 'undefined' && AUDITOR.causaDe) ? AUDITOR : null); };
    el.onload = fin;
    el.onerror = fin;
    setTimeout(fin, 5000);
    el.src = '/pruebas/auditor.js?v=' + Date.now();
    document.head.appendChild(el);
  });
}

PRUEBAS.caso('⚠️ el auditor agrupa por CAUSA y no por el texto que la ejemplifica', async () => {
  /* Sin esto vuelve el «47 donde había 6». La causa lleva el selector y los dos colores; el
     contenido va aparte, entre ⟨⟩. */
  const AUDITOR = await p111Auditor();
  PRUEBAS.cierto(!!(AUDITOR && AUDITOR.causaDe),
    'guarda: el auditor se pudo cargar y expone `causaDe` · un criterio de agrupación, no dos');
  if (!AUDITOR || !AUDITOR.causaDe) return;
  const a = 'b rgb(1, 2, 3) sobre rgb(4, 5, 6) = 4.26:1 (mín 4.5) ⟨13.0⟩';
  const b = 'b rgb(1, 2, 3) sobre rgb(4, 5, 6) = 4.26:1 (mín 4.5) ⟨19.8⟩';
  PRUEBAS.igual(AUDITOR.causaDe(a), AUDITOR.causaDe(b),
    '⚠️ dos textos distintos con el MISMO defecto son UNA causa');
  const c = 'b rgb(9, 9, 9) sobre rgb(4, 5, 6) = 3.10:1 (mín 4.5) ⟨13.0⟩';
  PRUEBAS.falso(AUDITOR.causaDe(a) === AUDITOR.causaDe(c),
    '⚠️ y dos colores distintos son DOS causas · son dos arreglos, no uno');
});

PRUEBAS.caso('⚠️ el barrido no cuenta el código como texto de pantalla', async () => {
  /* `body *` incluye los `<script>` del body y su `textContent` son los comentarios del código.
     Inflaban el contador de «no se pudo medir» hasta 165. */
  const AUDITOR = await p111Auditor();
  PRUEBAS.cierto(!!(AUDITOR && AUDITOR.contraste), 'guarda: el auditor se pudo cargar');
  if (!AUDITOR || !AUDITOR.contraste) return;
  const s = document.createElement('script');
  s.type = 'text/plain';
  s.textContent = 'un comentario larguísimo que no es texto de pantalla y no debe contarse';
  document.body.appendChild(s);
  const con = AUDITOR.contraste().sinMedir;
  s.remove();
  const sin = AUDITOR.contraste().sinMedir;
  PRUEBAS.igual(con, sin,
    '⚠️ agregar un <script> con texto adentro no puede mover el contador de cobertura');
});
