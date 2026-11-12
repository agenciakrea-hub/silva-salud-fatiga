PRUEBAS.grupo('P311 · la auditoría de HSEQ: la foto contra la pantalla');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Lo que el recorrido de la foto, fila por fila y a 390 px, encontró distinto, y `F097`:
   · el cartel dice que cuenta personas (`hse_n_de_m`);
   · el libro dice «Glosario» (fila 9);
   · sin ninguna línea que dibujar en el pilar, no queda un hueco en blanco (filas 17, 25 y 32);
   · el punto final de la tendencia es redondo también en el gráfico ancho (fila 32);
   · en «Actividad reciente», la acción no le tapa la hora a la fecha;
   · la demostración trae el chip de confiabilidad (filas 10, 20, 27 y 34).

   Y lo que encontró el verificador de privacidad (`docs/specs/P311/privacidad.md`):
   · `F098` · a quien no está en el padrón no se le entrega nada;
   · `F099` · a Dirección y a HSEQ no les llega qué test tocó cada seudónimo;
   · `F100` · la promesa dice lo que pasa en un grupo chico, y nadie tiene que volver a aceptar;
   · H4, H7 y H10.

   Cada caso entra por el camino real (R17): el `.gs` real en el emulador y `onDashData`, o el visor. Cada uno dice qué función
   concede lo que afirma (R19) y tiene su discriminador.

   AYUDANTES DE OTROS ARCHIVOS (por eso va al final de `casos.json` y en `soloConGs`): `p308Limpio`, `p309Pintar`, `p310Cartel`,
   `p388Mundo`, `p388Tests`, `p388Num`, `p386Legible`, `p386Correr`, `p385EntrarAdmin`, `p385Visor`, `p385Hasta`, `p393Hseq`,
   `p393SinApp`. Son funciones declaradas: se ven desde acá.

   ⚠️ EL REPO ES PÚBLICO: sólo nombres de los CH de prueba de P308 y P385, todos inventados.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La gente de la nómina del mundo de P308 (`P393_GENTE` es `const` de otro archivo). */
const P311_GENTE = ['Oscar Uno', 'Olga Dos', 'Omar Tres', 'Otto Cuatro', 'Oriana Cinco', 'Orlando Seis', 'Alma Única'];
/* Pinta el payload por `onDashData`, con el cierre de grupos al día, y devuelve lo que mide `fn` antes de limpiar.
   ⚠️ P392 · `fn` CORRE CON EL PORTAL ABIERTO. `p309Pintar` pinta en `#dashBody` pero no abre `#portalOverlay`, y con el
   overlay en `display:none` todo lo de adentro mide 0. Las alturas de las filas 17, 25 y 32 se medían porque el portal que
   otro caso había cerrado seguía pintado mientras duraba su transición de cierre; desde que el marco la termina entre
   caso y caso, su discriminador lo dijo (alturas en 0).
   Se abre ADENTRO de `fn`, no antes de `p309Pintar`: éste llama primero a `CTX.resetear()`, que cierra todos los overlays
   (`correr.js`), y abrirlo antes no sirve (medido: las tres alturas en 0, con el portal cerrado). */
function p311Ver(payload, fn) {
  const x = p308Limpio(payload);
  if (x.totalesHseq && !x.totalesHseq.error) x.totalesHseq.ultimaCorrida = new Date(Date.now() - 5 * 60000).toISOString();
  return p309Pintar(x, null, () => p311ConPortal(fn)).extra;
}
/* Abre el portal mientras corre `fn`, como `s4b`, y lo deja como estaba. */
function p311ConPortal(fn) {
  const ov = document.getElementById('portalOverlay'), dash = document.getElementById('portalDash');
  const ovTenia = !!(ov && ov.classList.contains('show')), dashTenia = dash ? dash.style.display : null;
  try {
    if (ov) ov.classList.add('show');
    if (dash) dash.style.display = '';
    return fn();
  } finally {
    if (ov) ov.classList.toggle('show', ovTenia);
    if (dash) dash.style.display = dashTenia;
  }
}
function p311EnIngles(clave, vars) {
  const prev = idiomaActual();
  try { fijarIdioma('en'); return t(clave, vars); } finally { fijarIdioma(prev); }
}
/* Una regla de CSS puesta sólo mientras corre `fn`: los discriminadores de lo que se arregló en el CSS. */
function p311ConEstilo(css, fn) {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  try { return fn(); } finally { s.remove(); }
}

/* ═════ F097 · el cartel dice que cuenta personas ════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 F097 · el cartel de HSEQ dice que cuenta personas: «3 de 7 personas», y «3 personas» si no se pudo leer la nómina', () => {
  /* R19 · `hseqEstadoPintar`: `E.personas` de los grupos «estado» sobre `DASH.nominaTotal`. Decía «3 de 7 medidos» al lado de siete
     tarjetas, y se leía como tarjetas: en una empresa con tres tarjetas con número, «4 de 7» parecía no cerrar (nos pasó a nosotros). */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const r = p393Hseq('2026-11-03'), P = p388Num('PISO_MIN_HSEQ');
  PRUEBAS.alMenos(r.nominaTotal, P + 1, 'guarda: hay más gente en la nómina que medida');
  const c = p311Ver(r, () => p310Cartel());
  PRUEBAS.igual(c.cob, t('hse_n_de_m', { n: P, m: r.nominaTotal }), '🔴 dice cuántas de cuántas');
  PRUEBAS.cierto(/personas/.test(c.cob), '🔴 y dice «personas» · ' + c.cob);
  PRUEBAS.cierto(String(c.aria).indexOf(c.cob) >= 0, 'el lector de pantalla dice lo mismo');
  const sinNomina = JSON.parse(JSON.stringify(r)); sinNomina.nominaTotal = 0;
  const s = p311Ver(sinNomina, () => p310Cartel());
  PRUEBAS.igual(s.cob, t('hse_n_medidos', { n: P }), '🔴 sin la nómina, sin el total');
  PRUEBAS.cierto(/personas/.test(s.cob), '🔴 y dice «personas» · ' + s.cob);
  PRUEBAS.igual(t('hse_n_de_m', { n: 3, m: 7 }), '3 de 7 personas', '🔴 el texto en español');
  PRUEBAS.igual(p311EnIngles('hse_n_de_m', { n: 3, m: 7 }), '3 of 7 people', '🔴 y en inglés');
  PRUEBAS.igual(p311EnIngles('hse_n_medidos', { n: 3 }), '3 people', '🔴 y sin la nómina, en inglés');
});

/* ═════ Fila 9 · el libro dice «Glosario» ════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P311 · fila 9 · el libro dice «Glosario» a 375, 768 y 1366 px en los dos temas, con 44 px para tocar y sin que se salga el cartel', () => {
  /* R19 · la regla `#hseqGlosBtn .dash-ir-lbl`. A 390 px `.dash-ir-lbl` estaba en `display: none` y quedaba un libro solo; la foto
     lleva el texto debajo. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  return p386Correr(async () => {
    PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
    PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'hseq'), 'guarda: visor «Consorcio HELITEC · HSEQ»');
    const b = document.getElementById('hseqGlosBtn'), l = b && b.querySelector('.dash-ir-lbl');
    PRUEBAS.cierto(!!l, 'guarda: está el texto');
    if (!l) return;
    PRUEBAS.igual(l.textContent.trim(), t('gloss_btn'), 'dice «Glosario»');
    const defectos = () => {
      const malos = [];
      [375, 390, 768, 1366].forEach(w => PRUEBAS.enVentana(w, 800, () => ['claro', 'oscuro'].forEach(tema => PRUEBAS.enTema(tema, () => {
        const cs = getComputedStyle(l), r = l.getBoundingClientRect(), donde = w + ' · ' + tema + ' · ';
        if (!(r.width > 0)) malos.push(donde + 'no se ve');
        if (parseFloat(cs.fontSize) < 12) malos.push(donde + cs.fontSize);
        if (CTX.contraste(cs.color, p386Fondo(l)) < 4.5) malos.push(donde + 'contraste');
        if (r.right > document.documentElement.clientWidth + 1) malos.push(donde + 'se sale');
      }))));
      return malos;
    };
    PRUEBAS.igual(defectos(), [], '🔴 R12 · R13 · se lee');
    const fila = document.getElementById('hseqEstadoFila');
    [320, 375, 390, 768, 1366].forEach(w => PRUEBAS.enVentana(w, 800, () => {
      const rb = b.getBoundingClientRect(), ancho = document.documentElement.clientWidth;
      /* F112 (2026-11-10) · el área de toque se mide con el tamaño de la CAJA (`offsetWidth`/`offsetHeight`), no con
         `getBoundingClientRect`: en 3 de 5 corridas enteras, con la hoja a mitad de su transición de apertura
         (`translateY` fraccionario), la primera lectura del rectángulo dio menos de 44 mientras la caja medía 44
         (`offsetHeight` 44 y alto calculado 44 en el mismo instante). La transición es pasajera; el dedo toca la caja. */
      PRUEBAS.alMenos(b.offsetWidth, 44, 'a ' + w + ' px, 44 de ancho para tocar');
      PRUEBAS.alMenos(b.offsetHeight, 44, 'a ' + w + ' px, 44 de alto para tocar');
      PRUEBAS.cierto(rb.right <= ancho + 1, 'a ' + w + ' px, el botón entra');
      PRUEBAS.cierto(fila.scrollWidth <= fila.clientWidth + 1, 'a ' + w + ' px, el cartel no se sale de su fila');
    }));
    /* DISCRIMINADOR · oculto, como estaba */
    p311ConEstilo('#hseqGlosBtn .dash-ir-lbl { display: none !important; }', () => {
      PRUEBAS.alMenos(defectos().length, 1, '⚠️ discriminador · oculto, el aserto de arriba lo ve');
    });
    /* DISCRIMINADOR · F112 · la medida por la caja sigue viendo un botón chico de verdad */
    p311ConEstilo('#hseqGlosBtn { min-height: 40px !important; height: 40px !important; }', () => {
      PRUEBAS.enVentana(375, 800, () => PRUEBAS.cierto(b.offsetHeight < 44, '⚠️ discriminador · con 40 px de alto, la medida lo ve (' + b.offsetHeight + ')'));
    });
  });
});

/* ═════ Filas 17, 25 y 32 · el hueco de la tendencia ═════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P311 · filas 17, 25 y 32 · sin ninguna línea que dibujar en el pilar no queda un hueco en blanco; si la de al lado la tiene, el hueco alinea', () => {
  /* R19 · la regla `.hsi-pilar:not(:has(svg.spark)) .spark-vacia`; `dashSpark` deja `.spark-vacia` con menos de dos puntos. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const alturas = () => [...document.querySelectorAll('#dsec-inicio .spark-vacia')].map(e => Math.round(e.getBoundingClientRect().height));
  const lineas = () => document.querySelectorAll('#dsec-inicio svg.spark').length;
  /* un solo día de tests: ninguna serie */
  p311Ver(p393Hseq('2026-11-01'), () => {
    PRUEBAS.igual(lineas(), 0, 'guarda: con un solo día no hay ninguna línea');
    const h = alturas();
    PRUEBAS.alMenos(h.length, 1, 'guarda: hay tarjetas sin línea');
    PRUEBAS.igual(h.filter(x => x > 0), [], '🔴 no reservan ningún hueco');
    /* DISCRIMINADOR · reservándolo, como estaba */
    p311ConEstilo('.spark-vacia { display: block !important; }', () => {
      PRUEBAS.alMenos(alturas().filter(x => x > 0).length, 1, '⚠️ discriminador · reservándolo, el aserto de arriba lo ve');
    });
  });
  /* dos días: hay línea; se le saca la serie a una sola tarjeta de un pilar */
  const gente = P311_GENTE.slice(0, p388Num('PISO_MIN_HSEQ'));
  const r = p388Mundo(p388Tests(gente, '2026-11-01', '09').concat(p388Tests(gente, '2026-11-02', '09'))).sellarYPedir('2026-11-03T15:00:00-04:00');
  const x = JSON.parse(JSON.stringify(r)), per = x.totalesHseq.periodos;
  per.semana.metricas = {};   // abre en «Mes», donde el KSS tiene dos días y su línea
  PRUEBAS.alMenos(((per.mes.metricas.kss || {}).serie || []).length, 2, 'guarda: el KSS tiene línea');
  per.mes.metricas.fatiga = Object.assign({}, per.mes.metricas.kss, { serie: [] });   // la de al lado, con total y sin línea
  p311Ver(x, () => {
    PRUEBAS.alMenos(lineas(), 1, 'guarda: hay líneas');
    const h = alturas();
    PRUEBAS.igual(h.length, 1, 'guarda: una sola tarjeta sin línea');
    PRUEBAS.alMenos(h[0], 20, '🔴 con líneas en el pilar, el hueco queda: alinea con la de al lado');
  });
});

/* ═════ Fila 32 · el punto final de la tendencia ═════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('P311 · fila 32 · el punto final de la tendencia es redondo a cualquier ancho', () => {
  /* R19 · `dashSpark` dibuja con `preserveAspectRatio="none"`: un `<circle>` se estiraba con el ancho, y en el gráfico grande era un
     óvalo. Una línea de largo cero con punta redonda y trazo que no escala no se deforma. El dibujo no se puede medir en píxeles acá
     (el marco de la suite está oculto): se mira en la captura de `docs/specs/P311/inventario.md`. */
  if (typeof dashSpark !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  const d = document.createElement('div');
  d.innerHTML = dashSpark([1, 2, 3], 2, { alto: true, semaforo: true });
  const svg = d.firstChild, fin = svg.querySelector('.spark-fin'), linea = svg.querySelector('path[fill="none"]');
  PRUEBAS.igual(svg.getAttribute('preserveAspectRatio'), 'none', 'guarda: el dibujo se estira');
  PRUEBAS.igual(svg.querySelectorAll('circle').length, 0, '🔴 sin `<circle>`');
  PRUEBAS.cierto(!!fin, '🔴 lleva su punto final');
  if (!fin) return;
  PRUEBAS.igual(fin.getAttribute('vector-effect'), 'non-scaling-stroke', '🔴 con un trazo que no escala');
  PRUEBAS.igual(fin.getAttribute('stroke-linecap'), 'round', '🔴 y punta redonda');
  PRUEBAS.igual([fin.getAttribute('x1'), fin.getAttribute('y1')], [fin.getAttribute('x2'), fin.getAttribute('y2')], '🔴 de largo cero');
  PRUEBAS.igual(fin.getAttribute('stroke'), linea.getAttribute('stroke'), 'del color de la línea');
});

/* ═════ «Actividad reciente» · la hora ═══════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P311 · «Actividad reciente»: la acción no le tapa la hora a la fecha más larga, a 320, 375 y 1366 px', () => p386Correr(async () => {
  /* R19 · `movBloque` y la columna de `.mov-it`. Con 5.6rem «20 Oct 2026 09:01» se salía y se leía «09:0» (medido en producción). Sobre
     una fila de verdad, con la fecha más larga que da `movCuando`. */
  PRUEBAS.cierto(await p385EntrarAdmin(), 'guarda: entró como administrador');
  PRUEBAS.cierto(await p385Visor('Consorcio HELITEC', 'medico'), 'guarda: visor «Consorcio HELITEC · Servicio médico»');
  PRUEBAS.cierto(await p385Hasta(() => !!document.querySelector('#movHueco .mov-it .mov-cuando')), 'guarda: hay filas en «Actividad reciente»');
  const it = document.querySelector('#movHueco .mov-it');
  if (!it) return;
  const c = it.querySelector('.mov-cuando');
  c.innerHTML = '<b>28 Sep 2026</b> <span class="mov-hora">08:48</span>';
  const seSale = () => c.scrollWidth - c.clientWidth;
  [320, 375, 390, 1366].forEach(w => PRUEBAS.enVentana(w, 800, () => {
    PRUEBAS.cierto(seSale() <= 1, '🔴 a ' + w + ' px la fecha y la hora entran en su columna · sobran ' + seSale() + ' px');
  }));
  /* DISCRIMINADOR · con la columna de antes */
  p311ConEstilo('.mov-it { grid-template-columns: 5.6rem minmax(0, 1fr) !important; }', () => {
    PRUEBAS.enVentana(390, 800, () => PRUEBAS.alMenos(seSale(), 5, '⚠️ discriminador · con 5.6rem se sale: el aserto de arriba lo ve'));
  });
}));

/* ═════ El mundo de las acciones que no pasan por el panel ═══════════════════════════════════════════════════════════ */

/* Las acciones del `.gs` real sobre el CH de prueba de P391, con el `.gs` saboteado si hace falta. */
function p311Api(opc, cambios) {
  const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
  if (g.faltan.length) return { faltan: g.faltan };
  const env = GS.crearEntorno(Object.assign(p391Hojas(opc), opc.hojas || {}));
  env.Date = GS.relojFijo(opc.reloj || '2026-11-04T15:00:00Z');
  const a = GS.cargarGs(g.gs, env, ['accionEmpleado', 'accionTareasMias', 'accionSupervisor', 'accionDepartamentos', 'validarAcceso']);
  const pedir = (fn, x) => JSON.parse(a[fn](x).getContent());
  return { env: env, a: a, faltan: undefined, emp: x => pedir('accionEmpleado', Object.assign({ dispositivoId: 'p311-e' }, x)),
           tareas: x => pedir('accionTareasMias', Object.assign({ dispositivoId: 'p311-t' }, x)),
           sup: x => pedir('accionSupervisor', Object.assign({ dispositivoId: 'p311-s' }, x)),
           dep: x => pedir('accionDepartamentos', Object.assign({ dispositivoId: 'p311-d' }, x)) };
}
const P311_CED = '12345678';
function p311Nomina(nombre, ced) { return ['Helitec', nombre, ced, 'Operaciones', 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']; }

/* ═════ F098 · `empleado`: sin padrón no se entrega nada ═════════════════════════════════════════════════════════════ */

/* Un mundo con una persona fuera del padrón y otra en la nómina, con tests, PVT y ciclo de verdad en Helitec. */
function p311MundoEmpleado(cambios, nomina) {
  const OPC = { tests: [['2026-07-15', '10:40', 'Fuera Delpadron', 7, 2, '', 'Helitec'], ['2026-07-15', '10:41', 'Rosa Mena', 6, 2, '', 'Helitec']],
                nomina: nomina || [p311Nomina('Rosa Mena', P311_CED)] };
  const w = p311Api(OPC, cambios);
  if (w.faltan) return w;
  const hoja = n => w.env.SpreadsheetApp.openById('maestro').getSheetByName(n);
  ['Fuera Delpadron', 'Rosa Mena'].forEach((nombre, i) => {
    hoja('PVT').appendRow(p391Pvt(['2026-07-15', '10:4' + (2 + i), nombre]).map((c, k) => (k === 2 ? 'Helitec' : c)));
    hoja('Operacional').appendRow(['2026-11-01', '08:0' + i, '2026-11-01T08:0' + i + ':00-04:00', 'op-' + i, nombre, 'Helitec', 'Operaciones', 'Piloto', 'llegada_aero', 'kss', 7, '']);
  });
  return w;
}

PRUEBAS.caso('🔒 F098 · `empleado` no le entrega nada a quien no está en el padrón: ni con su nombre, ni con una cédula inventada, ni probando la cédula de otro', () => {
  /* R19 · `accionEmpleado`: el padrón es lo único contra lo que se verifica. Con quien está en el padrón no cambia nada: la cédula, y Z2
     si ya tiene contraseña. Franco, 2026-11-06: «Cerrar lo del nombre ya (Recomendado)». */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p311MundoEmpleado();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const lee = r => [r.ok, (r.registros || []).length, (r.pvt || []).length, (r.operacional || []).length];
  PRUEBAS.igual(lee(w.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec' })), [true, 0, 0, 0], '🔒 con el nombre solo, nada');
  PRUEBAS.igual(lee(w.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec', cedula: '99887766' })), [true, 0, 0, 0], '🔒 con una cédula inventada, nada');
  PRUEBAS.igual(lee(w.emp({ persona: 'Nombre Inventado', empresa: 'Helitec', cedula: P311_CED })), [true, 0, 0, 0], '🔒 y con un nombre inventado no sirve para probar cédulas: no salen las filas de esa cédula');
  const vacia = w.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec' });
  PRUEBAS.igual(vacia.sinPadron, true, 'V7 · lo dice, para que «Mis estadísticas» no afirme que no hay tests');
  PRUEBAS.igual(['operacional' in vacia, 'operacionalPeriodo' in vacia], [false, false], '🔴 V3 · sin esas dos claves: con ellas, el teléfono perdía su historial de jornadas');
  const r = w.emp({ persona: 'Rosa Mena', empresa: 'Helitec', cedula: P311_CED });
  PRUEBAS.igual(lee(r), [true, 1, 1, 1], 'CONTROL · con el padrón y su cédula, sus tests, su PVT y su ciclo, como siempre');
  PRUEBAS.alMenos((r.registros[0] || {}).kss, 1, 'CONTROL · con su valor');
  PRUEBAS.falso(!!r.sinPadron, 'CONTROL · sin la marca');
  PRUEBAS.igual(w.emp({ persona: 'Rosa Mena', empresa: 'Helitec' }).motivo, 'falta_cedula', 'CONTROL · sin la cédula, la pide');
  PRUEBAS.igual(w.emp({ persona: 'Rosa Mena', empresa: 'Helitec', cedula: '11112222' }).motivo, 'cedula_mal', 'CONTROL · con otra cédula, no entra');
  /* DISCRIMINADOR · como estaba hasta la 7.65 */
  const s = p311MundoEmpleado([['    if (!padronSabe) return json(empleadoVacio_());\n', ''],
    ['    if (!cedPedida) {\n      return json({ ok:false, motivo:"falta_cedula",', '    if (!cedPedida && padronSabe) {\n      return json({ ok:false, motivo:"falta_cedula",'],
    ['    } else if (cedulaNorm(quien.cedula) !== cedPedida) {', '    } else if (cedPedida && padronSabe && cedulaNorm(quien.cedula) !== cedPedida) {']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    PRUEBAS.igual(lee(s.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec' })), [true, 1, 1, 1], '⚠️ discriminador · así salían sus tests, su PVT y su ciclo con el nombre solo: el aserto de arriba lo ve');
    PRUEBAS.igual((s.emp({ persona: 'Nombre Inventado', empresa: 'Helitec', cedula: P311_CED }).registros || []).map(x => x.persona), ['Rosa Mena'], '⚠️ discriminador · y así se probaban cédulas');
  }
});

PRUEBAS.caso('🔒 P311 · V2 · no resolver no es estar fuera del padrón: el homónimo de la nómina entra con su cédula, y nadie entra con la del otro', () => {
  /* R19 · `accionEmpleado`, par exacto de nombre, cédula y empresa de la `Nómina`. `construirPadron` borra del índice el nombre con dos cédulas, y sin esto
     esas personas recibían vacío con su cédula correcta, sin ningún aviso. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const OTRA = '77776666';
  const NOM = [p311Nomina('Jose Rodriguez', P311_CED), ['Otra SA', 'Jose Rodriguez', OTRA, 'Operaciones', 'Piloto', '', '', '', '', 'No', '', 'empleado', '3']];
  const armar = cambios => {
    const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
    if (g.faltan.length) return { faltan: g.faltan };
    const real = CTX.gs;
    CTX.gs = g.gs;
    try { return p311Api({ tests: [['2026-07-15', '10:40', 'Jose Rodriguez', 6, 2, '', 'Helitec']], nomina: NOM }); } finally { CTX.gs = real; }
  };
  const w = armar();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const kss = r => (r.registros || []).map(x => x.kss);
  PRUEBAS.igual(kss(w.emp({ persona: 'Jose Rodriguez', empresa: 'Helitec', cedula: P311_CED })), [6], '🔴 el homónimo, con su cédula, ve lo suyo');
  PRUEBAS.igual(kss(w.emp({ persona: 'Jose Rodriguez', empresa: 'Helitec', cedula: OTRA })), [], '🔒 con la cédula del otro, nada');
  PRUEBAS.igual(kss(w.emp({ persona: 'Nombre Inventado', empresa: 'Helitec', cedula: P311_CED })), [], '🔒 con un nombre inventado y su cédula, nada');
  /* DISCRIMINADOR · sin el par */
  const s = armar([['    if (!padronSabe && cedPedida) {\n      var empPar', '    if (false) {\n      var empPar']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) PRUEBAS.igual(kss(s.emp({ persona: 'Jose Rodriguez', empresa: 'Helitec', cedula: P311_CED })), [], '⚠️ discriminador · sin el par, recibía vacío: el aserto de arriba lo ve');
});

PRUEBAS.caso('🔴 F098 · V3 · la respuesta vacía no le borra nada del teléfono: ni sus tests, ni su PVT, ni el ciclo que ya tenía', async () => {
  /* R19 · `misSincronizar` funde `registros` y `pvt`, y reemplaza `K_CICLO_SRV` sólo si viene `operacional`. Se usa la respuesta real del `.gs`. R7. */
  if (typeof misSincronizar !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const real = p311MundoEmpleado().emp({ persona: 'Fuera Delpadron', empresa: 'Helitec' });
  const prevPerfil = getProfile(), prevFetch = window.fetchConReloj, prevDatos = misDatos(), prevSrv = localStorage.getItem(K_CICLO_SRV), prevPer = localStorage.getItem(K_CICLO_SRV_PER);
  const correr = async resp => {
    setProfile({ nombre: 'Fuera Delpadron', empresa: 'Helitec', cedula: '' });
    _misSincronizando = false;
    misDatosSave(Object.assign({}, misDatos(), { registros: [{ fecha: '2026-07-15', kss: 7 }, { fecha: '2026-07-16', kss: 5 }], pvt: [{ fecha: '2026-07-15', rt_prom: 300 }] }));
    localStorage.setItem(K_CICLO_SRV, JSON.stringify([{ iso: '2026-07-15T08:00:00Z', evento: 'salida_casa' }, { iso: '2026-07-15T09:00:00Z', evento: 'llegada_aero' }]));
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve(resp) });
    await misSincronizar();
    const d = misDatos();
    return { tests: (d.registros || []).length, pvt: (d.pvt || []).length, ciclo: cicloMioServidor().length };
  };
  try {
    PRUEBAS.igual(await correr(real), { tests: 2, pvt: 1, ciclo: 2 }, '🔴 todo sigue en el teléfono');
    /* DISCRIMINADOR · con las dos claves, como salió la primera versión de este arreglo */
    const conClaves = Object.assign({}, real, { operacional: [], operacionalPeriodo: { dias: 30, desde: null, hasta: null, puedeVerHistorico: true } });
    PRUEBAS.igual((await correr(conClaves)).ciclo, 0, '⚠️ discriminador · con `operacional:[]` se borraba el ciclo: el aserto de arriba lo ve');
  } finally {
    window.fetchConReloj = prevFetch; _misSincronizando = false;
    misDatosSave(prevDatos);
    if (prevSrv === null) localStorage.removeItem(K_CICLO_SRV); else localStorage.setItem(K_CICLO_SRV, prevSrv);
    if (prevPer === null) localStorage.removeItem(K_CICLO_SRV_PER); else localStorage.setItem(K_CICLO_SRV_PER, prevPer);
    if (prevPerfil) setProfile(prevPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
  }
});

PRUEBAS.caso('🔴 P311 · V7 · «Mis estadísticas» no le dice «Todavía no hay tests» a quien no está en el padrón, y dice qué hacer', () => {
  /* R19 · `dashCamposDelServidor` copia `sinPadron` y `renderDash` elige el texto. Entra por `onDashData`, con la respuesta real del `.gs`. */
  if (typeof onDashData !== 'function' || !CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const real = p311MundoEmpleado().emp({ persona: 'Fuera Delpadron', empresa: 'Helitec' });
  const prev = DASH;
  const texto = resp => {
    CTX.resetear(); localStorage.clear();
    onDashData(JSON.parse(JSON.stringify(resp)), 'Helitec', { persona: 'Fuera Delpadron' }, 'empleado');
    return (document.getElementById('dashBody') || {}).textContent || '';
  };
  try {
    const con = texto(real);
    PRUEBAS.cierto(con.indexOf(t('vac_sin_padron_t')) >= 0, '🔴 dice que el historial no está disponible · ' + con.slice(0, 120));
    PRUEBAS.igual(con.indexOf(t('vac_tests_t')), -1, '🔴 y no que no hay tests');
    const sin = Object.assign({}, real); delete sin.sinPadron;
    PRUEBAS.cierto(texto(sin).indexOf(t('vac_tests_t')) >= 0, '⚠️ discriminador · sin la marca, dice que no hay tests: el aserto de arriba lo ve');
  } finally {
    try { DASH = prev; dashApplyMarca(null); dashUpdateHseqUI(); localStorage.clear(); } catch (e) {}
  }
});

PRUEBAS.caso('🔒 F098 · `tareas_mias`: en una empresa sin nómina, la determinación médica pide una identidad verificada; con cualquier número no sale', () => {
  /* R19 · `accionTareasMias` con `verificada`: la nómina o, si la empresa no tiene, el padrón. Por acá viaja el nivel de aptitud y el médico. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const fut = Date.parse('2026-12-01T00:00:00Z');
  const gest = (emp, per) => [emp, 'id-' + per, JSON.stringify({ tipo: 'anotacion_aptitud', persona: per, nivel: 'alto', medico: 'Doctora Prueba', creada: 1, vigenciaHasta: fut, nota: 'NOTA-CLINICA' })];
  const OPC = { hojas: {
    'Gestiones': [['Empresa', 'Id', 'Datos'], gest('Sin Nomina SA', 'Fuera Delpadron'), gest('Sin Nomina SA', 'Ana Registrada')],
    'Registrados Fatiga': [['Al registrarse', 'Fecha y hora', 'Nombre', 'Email', 'Cedula', 'Id Piloto', '¿Es piloto?', '¿Es supervisor?', 'Empresa', 'Departamento', 'Cargo', 'Sexo'],
      ['', '', 'Ana Registrada', '', P311_CED, '', 'No', 'No', 'Sin Nomina SA', 'Operaciones', 'Piloto', '']]
  } };
  const w = p311Api(OPC);
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  const det = r => r.determinacion || r.det || r.determinacionMedica || null;
  const claves = r => Object.keys(r).filter(k => /deter/i.test(k));
  const sin = w.tareas({ persona: 'Fuera Delpadron', empresa: 'Sin Nomina SA', cedula: '99887766' });
  PRUEBAS.igual(sin.ok, true, 'guarda: las tareas siguen contestando · ' + (sin.error || ''));
  PRUEBAS.igual(det(sin), null, '🔒 con cualquier número, sin determinación');
  const con = w.tareas({ persona: 'Ana Registrada', empresa: 'Sin Nomina SA', cedula: P311_CED });
  PRUEBAS.alMenos(claves(con).length, 1, 'guarda: la respuesta nombra la determinación · ' + Object.keys(con).join(','));
  PRUEBAS.igual((det(con) || {}).nivel, 'alto', 'CONTROL · con la cédula que el padrón conoce, la ve');
  PRUEBAS.igual(JSON.stringify(con).indexOf('NOTA-CLINICA'), -1, 'CONTROL · y sin la nota clínica');
  const mal = w.tareas({ persona: 'Ana Registrada', empresa: 'Sin Nomina SA', cedula: '99887766' });
  PRUEBAS.igual(det(mal), null, '🔒 con otra cédula, tampoco');
  /* V5 · las tareas del médico, sólo con la identidad verificada; las demás siguen saliendo por nombre (`P394`) */
  const hojaT = w.env.SpreadsheetApp.openById('maestro').getSheetByName('Tareas');
  hojaT.appendRow(['Sin Nomina SA', 't1', '', 'Fuera Delpadron', 'medico', 'Control', 'DETALLE-CLINICO', '', 'pendiente', '2026-11-01', '', 'Doctora Prueba']);
  hojaT.appendRow(['Sin Nomina SA', 't2', '', 'Fuera Delpadron', 'supervisor', 'Traer casco', 'detalle-comun', '', 'pendiente', '2026-11-01', '', 'Jefa']);
  hojaT.appendRow(['Sin Nomina SA', 't3', P311_CED, 'Ana Registrada', 'medico', 'Control', 'DETALLE-DE-ANA', '', 'pendiente', '2026-11-01', '', 'Doctora Prueba']);
  const delNombre = w.tareas({ persona: 'Fuera Delpadron', empresa: 'Sin Nomina SA' });
  PRUEBAS.igual((delNombre.tareas || []).map(x => x.id), ['t2'], '🔒 V5 · con el nombre solo, la tarea del médico no sale; la otra, sí (`P394`)');
  PRUEBAS.igual(JSON.stringify(delNombre).indexOf('DETALLE-CLINICO'), -1, '🔒 V5 · ni su texto');
  PRUEBAS.igual((w.tareas({ persona: 'Ana Registrada', empresa: 'Sin Nomina SA', cedula: P311_CED }).tareas || []).map(x => x.id), ['t3'], 'CONTROL · con la cédula que el padrón conoce, la ve');
  /* DISCRIMINADOR · como estaba */
  const sV5 = p311Api(OPC, [['    if (!verificada && filaTarea.origen === "medico") continue;\n', '']]);
  PRUEBAS.igual(sV5.faltan, undefined, 'guarda: el sabotaje entró');
  if (!sV5.faltan) {
    sV5.tareas({ persona: 'Fuera Delpadron', empresa: 'Sin Nomina SA' });   // la hoja se crea al primer pedido
    sV5.env.SpreadsheetApp.openById('maestro').getSheetByName('Tareas').appendRow(['Sin Nomina SA', 't1', '', 'Fuera Delpadron', 'medico', 'Control', 'DETALLE-CLINICO', '', 'pendiente', '2026-11-01', '', 'Doctora Prueba']);
    PRUEBAS.cierto(JSON.stringify(sV5.tareas({ persona: 'Fuera Delpadron', empresa: 'Sin Nomina SA' })).indexOf('DETALLE-CLINICO') >= 0, '⚠️ discriminador · así salía con el nombre solo: el aserto de arriba lo ve');
  }
  const s = p311Api(OPC, [['    var vig = verificada ? casoAnotacionesVigentes()', '    var vig = ced ? casoAnotacionesVigentes()']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) PRUEBAS.igual((det(s.tareas({ persona: 'Fuera Delpadron', empresa: 'Sin Nomina SA', cedula: '99887766' })) || {}).nivel, 'alto', '⚠️ discriminador · así salía con cualquier número: el aserto de arriba lo ve');
});

/* ═════ F099 · qué test tocó cada seudónimo ══════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 F099 · a Dirección y a HSEQ no les llega la clave `test`, y `__descartadas` no lo delata; al supervisor sí', () => {
  /* R19 · `anonimizarHseq`, lista `CAMPOS_HSEQ.operacional`. ⚠️ ESTO NO CIERRA LA ESTIMACIÓN: el verificador de P311 (V1) midió que `evento` dice lo mismo
     (`llegada_aero` es KSS, `salida_aero` es Perelli), y sigue en 0,92 si todos los tests pasan por el ciclo. Este caso mide la clave, nada más. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const hoy = '2026-11-03', iso = (h, m) => hoy + 'T' + h + ':' + m + ':00-04:00';
  const fila = (p, id, ev, test, h) => [hoy, h + ':00', iso(h, '00'), id, p, 'Helitec', 'Operaciones', 'Piloto', ev, test, '', ''];
  /* como las escribe la app en la forma `estandar`: dos eventos llevan test y los otros, no */
  const op = [fila('Oscar Uno', 'o1', 'llegada_aero', 'kss', '08'), fila('Olga Dos', 'o2', 'salida_casa', '', '08'), fila('Omar Tres', 'o3', 'salida_aero', 'perelli', '09')];
  const armar = sab => p388Mundo(p388Tests(P311_GENTE.slice(0, 5), hoy, '07'), { operacional: op, sabotaje: sab });
  const w = armar();
  const hseq = w.sellarYPedir('2026-11-03T15:00:00-04:00', {}, 'hseq-308'), dir = w.pedir({}, 'dir-308'), sup = w.pedir({}, 'sup-308');
  [['HSEQ', hseq], ['Dirección', dir]].forEach(c => {
    const filas = c[1].operacional || [];
    PRUEBAS.alMenos(filas.length, 3, 'guarda: a ' + c[0] + ' le llega el ciclo');
    PRUEBAS.igual(filas.filter(o => 'test' in o).length, 0, '🔒 ' + c[0] + ' · ninguna fila dice qué test');
    PRUEBAS.igual(Array.from(new Set(filas.map(o => String(o.__descartadas || '').split(',').filter(k => k !== 'cedula').sort().join(',')))).length, 1, '🔒 ' + c[0] + ' · lo descartado se nombra igual en toda fila: no delata cuál tenía test');
    PRUEBAS.igual(filas.filter(o => /kss|perelli/i.test(JSON.stringify(Object.assign({}, o, { __descartadas: '' })))).length, 0, '🔒 ' + c[0] + ' · ni el nombre del test en otra clave');
  });
  PRUEBAS.cierto((sup.operacional || []).some(o => o.test === 'kss'), 'CONTROL · el supervisor sigue viendo qué test tocaba');
  /* DISCRIMINADOR · como estaba */
  const s = p388Mundo(p388Tests(P311_GENTE.slice(0, 5), hoy, '07'), { operacional: op, gs: p391Parchar(CTX.gs, [['"iso", "evento",\n                  "resultado", "plan"],', '"iso", "evento",\n                  "test", "resultado", "plan"],']]).gs });
  PRUEBAS.alMenos((s.pedir({}, 'hseq-308').operacional || []).filter(o => o.test).length, 1, '⚠️ discriminador · con la clave en la lista blanca llega: el aserto de arriba lo ve');
});

/* ═════ F100 · la promesa ════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 F100 · la lámina y el consentimiento dicen lo que pasa en un grupo pequeño, en los dos idiomas, y nadie vuelve a aceptar', () => {
  /* R19 · `priv_hseq_1` y `consent_roles_html`. Medido por el verificador de P311: un grupo de 3 dice el color de cada uno hasta el 42 % de las
     veces, y el consentimiento prometía «ni a tu color». Franco: «las promesas actualizadas no piden cofirmar aceptacion de nuevo jamas». */
  if (typeof t !== 'function') { PRUEBAS.cierto(true, 'se saltea (sin app)'); return; }
  const prev = idiomaActual();
  try {
    fijarIdioma('es');
    PRUEBAS.cierto(/grupo tan pequeño/.test(t('priv_hseq_1')), '🔴 la lámina lo dice');
    PRUEBAS.cierto(/grupo tan pequeño/.test(t('consent_roles_html')), '🔴 el consentimiento lo dice');
    PRUEBAS.igual(/ni a tu color/.test(t('consent_roles_html')), false, '🔴 y ya no promete «ni a tu color»');
    PRUEBAS.cierto(/Nunca tu resultado/.test(t('priv_hseq_1')), 'CONTROL · sigue diciendo que el resultado no le llega');
    const VOS = /\b(vos|tenés|podés|querés|sabés|mirá|tocá)\b/i;
    ['priv_sup_2', 'priv_sup_3', 'priv_dir_1', 'priv_dir_2', 'priv_dir_3', 'priv_dir_4', 'priv_hseq_1', 'priv_hseq_2', 'priv_pie'].forEach(k => PRUEBAS.falso(VOS.test(t(k)), 'R1 · ' + k + ' sin voseo'));
    fijarIdioma('en');
    PRUEBAS.cierto(/group that small/.test(t('priv_hseq_1')), '🔴 en inglés, la lámina');
    PRUEBAS.cierto(/group that small/.test(t('consent_roles_html')), '🔴 en inglés, el consentimiento');
    PRUEBAS.igual(/or your color/.test(t('consent_roles_html')), false, '🔴 en inglés ya no lo promete');
  } finally { fijarIdioma(prev); }
  /* el HTML fijo dice lo mismo que el diccionario: es lo primero que se pinta */
  ['priv_sup_2', 'priv_dir_4', 'priv_hseq_1', 'priv_hseq_3', 'priv_pie'].forEach(k => {
    const el = document.querySelector('[data-i18n="' + k + '"],[data-i18n-html="' + k + '"]');
    PRUEBAS.cierto(!!el, 'guarda: está ' + k);
    if (el) PRUEBAS.igual(el.innerHTML, t(k), 'el HTML de ' + k + ' coincide con el diccionario');
  });
  /* nadie vuelve a aceptar: la marca del consentimiento es la misma, y con ella no se vuelve a pedir */
  PRUEBAS.igual(K_CONSENT, 'silva_fatiga_consent_v1', '🔴 F100 · la marca de aceptación no cambió: nadie vuelve a ver el consentimiento');
});

/* ═════ H4 · la contraseña de Dirección o de HSEQ en una fila `admin` ════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P311 · H4 · en una fila `admin`, la contraseña de Dirección o de HSEQ no da ese rol: sin comentarios con nombre y sin la vista médica', () => {
  /* R19 · `validarAcceso` da el rol de la fila; `accesoPanel_` deja mirar como otro sólo con `admin`. La contraseña principal de la fila sigue
     siendo administrador: es la única que tiene que serlo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const OPC = { tests: [['2026-07-15', '10:40', 'Rosa Mena', 6, 2, 'COMENTARIO-RESERVADO', 'Helitec']], nomina: [p311Nomina('Rosa Mena', P311_CED)],
    hojas: { 'Accesos': [['Usuario', 'Clave', 'Rol', 'Empresas', 'ClaveMedica', 'ClaveHseq', 'Clave panel HSEQ'],
                         ['filaadmin', 'pw-fila', 'admin', 'Helitec', 'pw-med', 'pw-dir', 'pw-hseq']] } };
  const w = p311Api(OPC);
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  const pide = (pass, extra) => w.sup(Object.assign({ usuario: 'filaadmin', pass: pass }, extra || {}));
  ['pw-dir', 'pw-hseq'].forEach(pw => {
    const r = pide(pw), v = pide(pw, { verVista: 'medico' });
    PRUEBAS.igual([r.ok, r.vista], [true, 'hseq'], 'guarda: ' + pw + ' entra a su vista');
    PRUEBAS.igual((r.comentarios || []).length, 0, '🔒 ' + pw + ' · sin comentarios');
    PRUEBAS.igual(v.vista, 'hseq', '🔒 ' + pw + ' · `verVista` no abre la vista médica');
    PRUEBAS.igual(JSON.stringify(v).indexOf('COMENTARIO-RESERVADO'), -1, '🔒 ' + pw + ' · y no llega el comentario');
  });
  PRUEBAS.igual(pide('pw-fila', { verVista: 'medico', verEmpresa: 'Helitec' }).vista, 'medico', 'CONTROL · la contraseña principal de la fila sigue siendo administrador');
  /* DISCRIMINADOR · como estaba */
  const s = p311Api(OPC, [['return { rol:(rol === "admin" ? "supervisor" : rol), empresas:emps, canonical:emps[0], vista:"hseq" };', 'return { rol:rol, empresas:emps, canonical:emps[0], vista:"hseq" };']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) PRUEBAS.igual(s.sup({ usuario: 'filaadmin', pass: 'pw-dir', verVista: 'medico', verEmpresa: 'Helitec' }).vista, 'medico', '⚠️ discriminador · así abría la vista médica: el aserto de arriba lo ve');
});

PRUEBAS.caso('🔒 P311 · V10 · una sesión de Dirección o de HSEQ ya emitida con `rol:"admin"` tampoco da ese rol', () => {
  /* R19 · `sesResolver`. Las sesiones no caducan: las emitidas antes de H4 siguen en la hoja con el rol de la fila. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const armar = cambios => {
    const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
    if (g.faltan.length) return { faltan: g.faltan };
    const env = GS.crearEntorno(p391Hojas({}));
    env.Date = GS.relojFijo('2026-11-04T15:00:00Z');
    return { faltan: undefined, a: GS.cargarGs(g.gs, env, ['sesEmitir', 'sesResolver']) };
  };
  const rolCon = (w, vista) => {
    const tok = w.a.sesEmitir('filaadmin', 'disp-v10', { rol: 'admin', vista: vista, empresas: ['Helitec'], canonical: 'Helitec' });
    return (w.a.sesResolver(tok, 'disp-v10') || {}).rol;
  };
  const w = armar();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  PRUEBAS.igual(rolCon(w, 'hseq'), 'supervisor', '🔒 con la vista de Dirección o HSEQ, no da `admin`');
  PRUEBAS.igual(rolCon(w, 'medico'), 'admin', 'CONTROL · una sesión de administrador sigue siéndolo');
  const s = armar([['    if (rolSesion === "admin" && vistaSesion === "hseq") rolSesion = "supervisor";\n', '']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) PRUEBAS.igual(rolCon(s, 'hseq'), 'admin', '⚠️ discriminador · así seguía abriendo la vista médica: el aserto de arriba lo ve');
});

/* ═════ H7 · `departamentos` ═════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P311 · H7 · `departamentos` no le da a Dirección ni a HSEQ quién creó o dio de baja un área; al supervisor sí', () => {
  /* R19 · `accionDepartamentos`: `creadoPor` y `bajaPor` son el nombre de quien tocó el botón. Lo hacía falso a `priv_hseq_3` («un solo lugar»). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const OPC = { hojas: { 'Departamentos': [['Empresa', 'Departamento', 'Estado', 'Creado', 'CreadoPor', 'Baja', 'BajaPor'],
    ['Helitec', 'Rampa', 'activo', '2026-10-01', 'Zulma Beta', '', ''], ['Helitec', 'Hangar', 'baja', '2026-09-01', 'Zulma Beta', '2026-10-02', 'Yago Gama']] } };
  const w = p311Api(OPC);
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  const nombres = r => JSON.stringify(r).match(/Zulma Beta|Yago Gama/g) || [];
  const hseq = w.dep({ usuario: 'helitec', pass: 'hseq-h391' }), dir = w.dep({ usuario: 'helitec', pass: 'dir-h391' }), sup = w.dep({ usuario: 'helitec', pass: 'sup-h391' });
  PRUEBAS.igual([hseq.ok, dir.ok, sup.ok], [true, true, true], 'guarda: las tres cuentas contestan · ' + [hseq.error, dir.error, sup.error].join('|'));
  PRUEBAS.igual(nombres(hseq), [], '🔒 HSEQ, sin nombres');
  PRUEBAS.igual(nombres(dir), [], '🔒 Dirección, sin nombres');
  PRUEBAS.alMenos(nombres(sup).length, 2, 'CONTROL · el supervisor los ve');
  /* DISCRIMINADOR · como estaba */
  const s = p311Api(OPC, [['    var sinNombres = acc.vista === "hseq";', '    var sinNombres = false;']]);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) PRUEBAS.alMenos(nombres(s.dep({ usuario: 'helitec', pass: 'hseq-h391' })).length, 2, '⚠️ discriminador · así llegaban: el aserto de arriba lo ve');
});

/* ═════ H10 · `personas` bajo el piso ════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔒 P311 · H10 · un grupo que quedó bajo el piso conserva su color pero no dice cuántas personas, y el cartel no inventa un «0 de N»', () => {
  /* R19 · `estadoPeriodoHseq_` y `hseqEstadoPintar`. Gente dada de baja de la nómina deja menos personas vigentes en un grupo que se selló con
     el piso: leído suelto, «POCO SEGURO · 1 persona» parecía el color de esa persona. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const P = p388Num('PISO_MIN_HSEQ'), gente = P311_GENTE.slice(0, P), w = p388Mundo(p388Tests(gente, '2026-11-03', '09'));
  const r0 = w.sellarYPedir('2026-11-03T15:00:00-04:00');
  PRUEBAS.igual(((r0.totalesHseq.periodos.semana || {}).estado || {}).personas, P, 'guarda: con toda la gente en la nómina dice cuántas');
  /* dos personas dadas de baja de la nómina */
  const nom = w.hoja('Nómina'), v = nom.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (gente.slice(1).indexOf(String(v[i][1])) >= 0) nom.deleteRow(i + 1);
  w.env.CacheService.getScriptCache().removeAll && w.env.CacheService.getScriptCache().removeAll([]);
  const r1 = w.pedir();
  const E = (r1.totalesHseq.periodos.semana || {}).estado || {};
  PRUEBAS.cierto(!!E.etapa, 'guarda: el grupo sigue con su color · ' + JSON.stringify(E));
  PRUEBAS.igual(E.personas, undefined, '🔒 sin el número de personas');
  /* la pantalla */
  const c = p311Ver(r1, () => p310Cartel());
  PRUEBAS.igual([c.etapa, c.cob], [E.etapa, ''], '🔴 el cartel dice el color, sin «N de M personas»');
  PRUEBAS.falso(/\b0 de\b/.test(c.texto), '🔴 y no inventa un «0 de N» · ' + c.texto);
  /* DISCRIMINADOR · como estaba */
  const s = p388Mundo(p388Tests(gente, '2026-11-03', '09'), { gs: p391Parchar(CTX.gs, [['  return distintas >= piso ? { etapa: etapa, personas: distintas } : { etapa: etapa };', '  return { etapa: etapa, personas: distintas };']]).gs });
  s.sellar('2026-11-03T15:00:00-04:00');
  const nomS = s.hoja('Nómina'), vS = nomS.getDataRange().getValues();
  for (let i = vS.length - 1; i >= 1; i--) if (gente.slice(1).indexOf(String(vS[i][1])) >= 0) nomS.deleteRow(i + 1);
  PRUEBAS.igual(((s.pedir().totalesHseq.periodos.semana || {}).estado || {}).personas, 1, '⚠️ discriminador · así llegaba: el aserto de arriba lo ve');
});

/* ═════ Filas 10, 20, 27 y 34 · la confiabilidad en la demostración ══════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P311 · filas 10, 20, 27 y 34 · la demostración de HSEQ muestra el chip de confiabilidad y los «poco confiables», iguales todos los días y por todos los caminos', () => {
  /* R19 · `confDemoHseq_`, que usa `unidadesDemoHseq_`; la llaman la demostración y la cuenta (ADR 020). R21: los dos ven lo mismo. */
  if (p393SinApp()) { PRUEBAS.cierto(true, 'se saltea (sin app o sin .gs)'); return; }
  const w = p391Mundo({});
  const ver = d => p311Ver(demoPayloadDeVista(d, 'hseqPanel'), () => {
    const c = p310Cartel();
    return { chip: c.chip, n: c.chipN };
  });
  const hoy = w.demo();
  const a = ver(hoy);
  PRUEBAS.igual(a.chip, true, '🔴 lleva el chip');
  PRUEBAS.cierto(/^\d+(\.\d)? %$/.test(a.n), '🔴 con un porcentaje · ' + a.n);
  const num = parseFloat(a.n);
  PRUEBAS.cierto(num > 50 && num < 100, 'un número creíble: ni todo ni nada · ' + a.n);
  PRUEBAS.igual(ver(w.demo()).n, a.n, '🔴 dos pedidos, el mismo número');
  PRUEBAS.igual(ver(p391Mundo({ reloj: '2026-11-18T15:00:00Z' }).demo()).n, a.n, '🔴 otro día (las fechas se corren), el mismo número');
  const T = (hoy.totalesHseq.periodos.semana || {}).metricas || {};
  PRUEBAS.alMenos(Object.keys(T).reduce((s, m) => s + (Number((T[m] || {}).pocoConfiables) || 0), 0), 1, '🔴 y hay «poco confiables» en alguna tarjeta');
  /* R21 · la cuenta Empresa Demo, por el visor */
  const v = w.visor('hseq');
  const tv = (v.totalesHseq.periodos.semana || {}).metricas || {};
  PRUEBAS.igual(Object.keys(tv).map(m => (tv[m] || {}).evaluados), Object.keys(T).map(m => (T[m] || {}).evaluados), '🔴 R21 · la cuenta y la demostración, lo mismo');
  /* DISCRIMINADOR · sin la cuenta (la 7.65) */
  const g = p391Parchar(CTX.gs, [['var a = agregarUnidadHseq_(u, m, confDemo); a.sellada = a.hasta; return a; });', 'var a = agregarUnidadHseq_(u, m, null); a.sellada = a.hasta; return a; });']]);
  PRUEBAS.igual(g.faltan, [], 'guarda: el sabotaje entró');
  const real = CTX.gs;
  let sinChip;
  try { CTX.gs = g.gs; sinChip = ver(p391Mundo({}).demo()); } finally { CTX.gs = real; }
  PRUEBAS.igual(sinChip.chip, false, '⚠️ discriminador · sin la cuenta no hay chip: el aserto de arriba lo ve');
});
