/* ══════════════════════════════════════════════════════════════════════════════════════════════
   F001 · F002 · F003 — LOS REPORTES DE FRANCO DEL 2026-10-12
   Registro literal de los pedidos en `PEDIDOS.md`, fuera del repo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 F001 · un texto corto NO hereda la marquesina del texto largo anterior', () => {
  if (typeof dashSetMq !== 'function' || typeof dashMedirMq !== 'function'){
    PRUEBAS.cierto(false, '⚠️ no están `dashSetMq`/`dashMedirMq`: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `dashSetMq`, que ahora llama a `dashMedirMq` al cambiar el texto.
     ⚠️ LO QUE REPORTÓ FRANCO: «cuando en admin le di a trabajando sobre aeroambulancias, el coso
     de "cargando" se desplazaba raro como que se iba de pantalla». Las 13 llamadas a `dashSetMq`
     cambiaban el contenido y NINGUNA volvía a medir, así que el chip conservaba la clase
     `.marquee` y la `--marquee-dist` del texto ANTERIOR: «Cargando…» —que entra de sobra— se
     desplazaba lo que medía «Aeroambulancias Silva, C.A.». La animación no estaba rota; estaba
     midiendo un texto que ya no estaba.
     ⚠️ El host cuelga de `document.body`: `#dashScope` vive dentro de `#app`, que está en
     `display:none` sin sesión, y ahí `clientWidth` es 0 y la medición no mide nada. */
  const host = document.createElement('div');
  host.id = 'f001Host';
  host.className = 'dash-scope';
  host.style.cssText = 'width:120px;max-width:120px;overflow:hidden;font-size:.8rem';
  document.body.appendChild(host);
  try {
    const paso = (txt) => { dashSetMq('f001Host', txt);
      return { marquee: host.classList.contains('marquee'),
               dist: host.style.getPropertyValue('--marquee-dist') || '' }; };
    const largo = paso('Aeroambulancias Silva, C.A.');
    PRUEBAS.cierto(largo.marquee,
      'guarda: un texto que NO entra sí activa la marquesina · si no, el caso no mide nada');
    PRUEBAS.cierto(largo.dist !== '', 'guarda: y deja su distancia · ' + JSON.stringify(largo.dist));
    const corto = paso('Cargando…');
    PRUEBAS.falso(corto.marquee,
      '🔴 el texto CORTO no queda con la marquesina del largo · es lo que se iba de pantalla');
    PRUEBAS.igual(corto.dist, '',
      '🔴 y la distancia vieja se borra · si quedara, el texto corto se desplazaría lo que medía el largo');
    /* DISCRIMINADOR · y el largo la recupera: el arreglo no es «apagar la marquesina siempre». */
    PRUEBAS.cierto(paso('Aeroambulancias Silva, C.A.').marquee,
      'DISCRIMINADOR · un texto largo la vuelve a activar · la marquesina sigue existiendo');
  } finally { host.remove(); }
});

PRUEBAS.caso('🔴 F002 · el visor dice la empresa que DE VERDAD se está viendo', () => {
  if (typeof visorPintar !== 'function'){
    PRUEBAS.cierto(false, '⚠️ no está `visorPintar`: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo concede `visorPintar`, que pasó a mirar `DASH.f.emp` además de `DASH.visor`.
     ⚠️ LO QUE REPORTÓ FRANCO: «puse aeroambulancias en trabajar sobre, pero dice todas las
     empresas». Era cierto y el mensaje afirmaba algo FALSO: la empresa de trabajo también recorta
     la LECTURA —`dashEmpresaAdminCambiar` la manda como `params.empresa` y `ausScope` se la
     devuelve al admin como alcance único—, así que el panel mostraba una empresa mientras el
     cartel decía que las mostraba todas.
     ⚠️ Los dos controles siguen siendo dos cosas (ADR 014 el de trabajo, ADR 007 el visor): con el
     visor puesto el texto agrega «sin escribir nada», que es su diferencia real. */
  const prevD = DASH;
  const app = document.getElementById('app');
  const prevDisp = app ? app.style.display : null;
  try {
    if (app) app.style.display = '';
    const base = { rol:'admin', vista:'medico', demoMode:false, params:{usuario:'*',pass:'x'},
                   cuentas:[{empresa:'Aeroambulancias Silva'},{empresa:'Consorcio HELITEC'}],
                   tabs:['resumen'], tab:'resumen' };
    const txt = () => { visorPintar();
      return (document.getElementById('visorViendo').textContent || '').trim(); };

    DASH = Object.assign({}, base, { f:{emp:'Aeroambulancias Silva'}, scope:'Aeroambulancias Silva', visor:null });
    const conTrabajo = txt();
    PRUEBAS.cierto(conTrabajo.indexOf('Aeroambulancias Silva') >= 0,
      '🔴 con «trabajar sobre» puesto, nombra ESA empresa · ' + JSON.stringify(conTrabajo));
    PRUEBAS.falso(/todas las empresas/i.test(conTrabajo),
      '🔴 y NO dice «todas las empresas» · es falso: el servidor recorta la lectura a esa empresa');
    PRUEBAS.falso(/sin escribir nada/i.test(conTrabajo),
      '🔴 ni «sin escribir nada» · con el visor apagado SÍ se escribe, y eso es lo que distingue al visor');

    DASH = Object.assign({}, base, { f:{emp:''}, scope:'Todas las empresas', visor:null });
    PRUEBAS.cierto(/todas las empresas/i.test(txt()),
      'DISCRIMINADOR · sin empresa de trabajo SÍ dice «todas las empresas»');

    DASH = Object.assign({}, base, { f:{emp:'Aeroambulancias Silva'}, scope:'X',
                                     visor:{empresa:'Consorcio HELITEC', vista:'supervisor'} });
    const conVisor = txt();
    PRUEBAS.cierto(conVisor.indexOf('Consorcio HELITEC') >= 0 && /sin escribir nada/i.test(conVisor),
      '🔒 y con el VISOR puesto gana el visor, con su «sin escribir nada» · ' + JSON.stringify(conVisor));
  } finally { try { DASH = prevD; } catch(e){} if (app && prevDisp !== null) app.style.display = prevDisp; }
});

PRUEBAS.caso('🔴 F002b · el naranja va en el VALOR, no en la frase', () => {
  if (typeof visorPintar !== 'function'){
    PRUEBAS.cierto(false, '⚠️ no está `visorPintar`: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ Palabras de Franco: «todas las empresas debería ser naranja y estás viendo negro debería
     ser, o sea está al contrario». Tenía razón: `.visor-viendo` pintaba la frase entera de acento
     y el `<b>` —la empresa y la vista, lo único que cambia— en texto normal.
     Se mide el COLOR COMPUTADO, no la regla: una regla más específica podría pisarla. */
  const prevD = DASH;
  const app = document.getElementById('app');
  const prevDisp = app ? app.style.display : null;
  try {
    if (app) app.style.display = '';
    DASH = { rol:'admin', vista:'medico', demoMode:false, params:{usuario:'*',pass:'x'},
             cuentas:[{empresa:'Aeroambulancias Silva'}], f:{emp:'Aeroambulancias Silva'},
             scope:'Aeroambulancias Silva', visor:null, tabs:['resumen'], tab:'resumen' };
    visorPintar();
    const el = document.getElementById('visorViendo'), b = el.querySelector('b');
    PRUEBAS.cierto(!!b, 'guarda: el mensaje tiene un <b> con el valor');
    const cFrase = getComputedStyle(el).color, cValor = getComputedStyle(b).color;
    PRUEBAS.falso(cFrase === cValor,
      '🔴 la frase y el valor NO son del mismo color · si coinciden, no destaca nada · ' + cFrase);
    /* El naranja de la marca, resuelto desde el token para no escribirlo a mano (R13). */
    const sonda = document.createElement('span');
    sonda.style.color = 'var(--orange-legible)';
    document.body.appendChild(sonda);
    const naranja = getComputedStyle(sonda).color;
    sonda.remove();
    PRUEBAS.igual(cValor, naranja,
      '🔴 el VALOR va en naranja · es lo que hay que notar de un vistazo · ' + cValor + ' vs ' + naranja);
    PRUEBAS.falso(cFrase === naranja,
      '🔴 y la frase NO · pintarla entera de acento le quita el acento al valor');
  } finally { try { DASH = prevD; } catch(e){} if (app && prevDisp !== null) app.style.display = prevDisp; }
});

PRUEBAS.caso('🔴 F003 · «Actividad reciente» respeta la persona filtrada', () => {
  if (typeof movBloque !== 'function' || typeof movItemsVisibles !== 'function'){
    PRUEBAS.cierto(false, '⚠️ no está `movBloque`/`movItemsVisibles`: este contrato queda SIN MEDIR'); return; }
  /* El derecho lo conceden `movItemsVisibles` (filtra por `DASH.f.per` con `dashNorm`) y
     `movAlcanceTexto` (lo nombra en el rótulo).
     ⚠️ LO QUE REPORTÓ FRANCO: «lo veo en todos los paneles a pesar de que estoy viendo
     particularmente el perfil de un empleado». El bloque vive en el encabezado —por eso está en
     todas las pestañas, y eso es a propósito— pero sus filas ignoraban el filtro por persona.
     ⚠️ `dashNorm` y no comparación exacta: `registros[].persona` conserva la grafía del formulario
     cuando la identidad no se resolvió al padrón, así que «Ana Suárez» y «Ana Suarez» son la misma. */
  const prevD = DASH, prevM = (typeof MOV !== 'undefined') ? MOV : null;
  const cuantas = (h) => (h.match(/class="mov-it"/g) || []).length;
  try {
    MOV = { estado:'listo', total:4, tests:3, ultima: Date.now(), alcance:null, err:'', pedido:'',
            alcanceVisto:'', intentos:0, items: [
      { ts: Date.now()-1000, persona:'Ana Suárez', empresa:'Aeroambulancias Silva', que:'test', tipo:'test' },
      { ts: Date.now()-2000, persona:'Beto Ruiz',  empresa:'Aeroambulancias Silva', que:'test', tipo:'test' },
      { ts: Date.now()-3000, persona:'Ana Suarez', empresa:'Aeroambulancias Silva', que:'nomina_sync', tipo:'sys' },
      { ts: Date.now()-4000, persona:'Carla Díaz', empresa:'Consorcio HELITEC',     que:'test', tipo:'test' }] };
    const base = { rol:'admin', vista:'medico', demoMode:false, params:{},
                   scope:'Aeroambulancias Silva', tabs:['resumen'], tab:'resumen' };

    DASH = Object.assign({}, base, { f:{ emp:'Aeroambulancias Silva', per:'' } });
    PRUEBAS.igual(cuantas(movBloque()), 4, 'guarda: sin filtro por persona se ven los cuatro');

    DASH = Object.assign({}, base, { f:{ emp:'Aeroambulancias Silva', per:'Ana Suárez' } });
    const conPer = movBloque();
    PRUEBAS.igual(cuantas(conPer), 2,
      '🔴 con una persona filtrada, sólo sus movimientos · ' + cuantas(conPer));
    PRUEBAS.falso(/Beto Ruiz|Carla D/.test(conPer),
      '🔴 y no los de nadie más · ' + (conPer.match(/Beto Ruiz|Carla D[íi]az/g) || []).join(','));
    PRUEBAS.cierto(conPer.indexOf('Ana Suarez') >= 0,
      '🔴 incluida la misma persona escrita SIN tilde · es como la deja el formulario');
    PRUEBAS.cierto((movAlcanceTexto() || '').indexOf('Ana Suárez') >= 0,
      '🔴 y el rótulo la nombra · si no, la lista dice una cosa y el encabezado otra');

    /* ⚠️ Y POR DEPARTAMENTO, que no estaba en mi primera versión: supuse que el movimiento no traía
       `dep` y el barrido de `P227b-7` me obligó a mirar al productor — el servidor manda
       `{ts, tipo, que, persona, empresa, dep}`. Si el filtro de departamento está puesto y la
       actividad muestra gente de otro, es el mismo defecto que Franco reportó, en otra dimensión. */
    MOV.items = MOV.items.map(function (i, k) {
      return Object.assign({}, i, { dep: k < 2 ? 'Operaciones' : 'Mantenimiento' });
    });
    DASH = Object.assign({}, base, { f:{ emp:'Aeroambulancias Silva', per:'', dep:'Operaciones' } });
    const conDep = movBloque();
    PRUEBAS.igual(cuantas(conDep), 2,
      '🔴 con un departamento filtrado, sólo sus movimientos · ' + cuantas(conDep));
    PRUEBAS.falso(/Ana Suarez|Carla D/.test(conDep),
      '🔴 y no los de Mantenimiento · ' + (conDep.match(/Ana Suarez|Carla D[íi]az/g) || []).join(','));
    /* DISCRIMINADOR · el departamento se compara con la misma regla que el resto del panel, que
       colapsa tildes: un tilde ya partió un departamento en dos en este repo (P231). */
    DASH = Object.assign({}, base, { f:{ emp:'Aeroambulancias Silva', per:'', dep:'Operaciónes' } });
    PRUEBAS.igual(cuantas(movBloque()), 2,
      'DISCRIMINADOR · «Operaciónes» con tilde empata igual · si no, sería `dashNorm` en vez de ' +
      '`depClaveCliente`, que es la que replica `norm()` del servidor');

    DASH = Object.assign({}, base, { f:{ emp:'Aeroambulancias Silva', per:'Nadie Existe' } });
    const vacio = movBloque();
    PRUEBAS.igual(cuantas(vacio), 0, 'guarda: una persona sin movimientos no muestra filas');
    PRUEBAS.cierto(/entre los últimos registrados/.test(vacio),
      '🔴 y el vacío NO afirma que no tuvo actividad · lo que llega son los ÚLTIMOS movimientos del ' +
      'alcance, así que la suya puede existir fuera de esa ventana (R2)');
  } finally { try { DASH = prevD; } catch(e){} if (prevM) MOV = prevM; }
});

PRUEBAS.caso('🔴 F005 · en escritorio las hojas no se estiran a todo el ancho', () => {
  /* Lo reportó Franco de la Nómina: «en admin se ve feo, o sea muy espaciado, todo apretado, se
     sale de la pantalla». Medido en 1280 px: `.gest-sheet` tenía `width:100%` y `max-width:100%`,
     así que la hoja medía **1280 px** y cada fila se estiraba a lo ancho completo.
     ⚠️ Son las TRES que comparten `.gest-sheet` —Nómina, Departamentos y Operaciones—, no sólo la
     que él nombró: arreglar una sola las dejaría distintas entre sí.
     ⚠️ Se mide la REGLA y no el ancho renderizado: el pane de pruebas no tiene 1280 px y un
     `getBoundingClientRect` acá daría el ancho del pane, no el del breakpoint. El invariante es que
     exista el tope para `min-width:900px` y que NO exista fuera de esa media (en teléfono la hoja
     va a pantalla completa a propósito). */
  /* ⚠️ `.gest-sheet {` CON LA LLAVE, y mi primera versión buscaba `.gest-sheet` a secas: la PRIMERA
     aparición en el archivo es `.gest-sheet, .dash-scroll, #portalDash, …` dentro de `@media print`,
     así que el caso leía las reglas de impresión y fallaba sin que hubiera nada roto. Un barrido que
     corta por un texto que aparece en varios lugares lee el equivocado. */
  const src = document.documentElement.outerHTML;
  const i = src.indexOf('.gest-sheet {');
  PRUEBAS.alMenos(i, 0, 'guarda: la regla propia de `.gest-sheet` está en el CSS');
  const tramo = src.slice(i, i + 2600);
  PRUEBAS.cierto(/@media \(min-width: 900px\)[^}]*\{[^}]*\.gest-sheet\s*\{[^}]*max-width:\s*960px/.test(tramo.replace(/\s+/g, ' ')),
    '🔴 hay tope de 960 px para escritorio · sin él la hoja mide lo que mida la pantalla');
  PRUEBAS.cierto(/margin-inline:\s*auto/.test(tramo),
    '🔴 y queda centrada · con el tope pero sin centrar, la hoja se pega a la izquierda');
  /* DISCRIMINADOR · la regla base sigue siendo pantalla completa: el tope vive SÓLO en la media. */
  const base = tramo.slice(0, tramo.indexOf('@media'));
  PRUEBAS.cierto(/max-width:\s*100%/.test(base),
    'DISCRIMINADOR · la regla base sigue en 100% · en teléfono la hoja ocupa la pantalla a propósito');
});

PRUEBAS.caso('🔴 F007 · la pista del idioma se lee y se alinea con el TEXTO del chip', () => {
  const hint = document.getElementById('splashLangHint');
  const btn  = document.getElementById('splashLangBtn');
  if (!hint || !btn) { PRUEBAS.cierto(false, '⚠️ no está el chip de idioma: este contrato queda SIN MEDIR'); return; }
  /* Lo reportó Franco: «el texto de abajo está desalineado con el botón, y además gris sobre
     naranja, no se lee».
     ⚠️ LAS DOS COSAS ESTABAN MEDIDAS Y ERAN CIERTAS:
       · alineación: la pista se alineaba con el BORDE del chip, no con su TEXTO — 15 px de
         diferencia, que es exactamente el padding lateral del botón (14,4 px);
       · contraste: una regla dentro de `@media (min-width: 900px)` le ponía `--text-muted` sobre el
         navy del splash → **2,80**, muy por debajo de 4,5:1. Su comentario afirmaba que «la pista
         cae sobre la tarjeta clara acá» y la medición dijo lo contrario: el chip vive en
         `.splash-der`, que sigue sobre el navy. La regla se quitó. */
  const src = document.documentElement.outerHTML;
  PRUEBAS.falso(/\.splash-lang-hint\s*\{\s*color:\s*var\(--text-muted\)/.test(src),
    '🔴 ninguna regla le pone `--text-muted` · ese token mide 2,80 sobre el navy del splash');
  const reglas = (src.match(/\.splash-lang-hint\s*\{[^}]*color[^}]*\}/g) || []);
  PRUEBAS.igual(reglas.length, 1,
    '🔴 UNA sola regla fija su color · dos reglas es cómo volvió el defecto · ' + reglas.length);
  PRUEBAS.cierto(/--entrada-tenue/.test(reglas[0] || ''),
    '🔴 y es el token medido sobre navy (6,76) · ' + (reglas[0] || '').slice(0, 80));
  PRUEBAS.cierto(/\.splash-lang-hint\s*\{[^}]*padding-right:\s*\.9rem/.test(src.replace(/\s+/g, ' ')),
    '🔴 y lleva el padding del chip · sin él su texto queda 15 px corrido del de «ES»');
  /* El contraste se calcula de verdad, con los tokens resueltos: si alguien cambia el valor de
     `--entrada-tenue` en el futuro, esto cae. */
  const probe = (tok) => { const s = document.createElement('span'); s.style.color = 'var(' + tok + ')';
    document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
  const rgb = (c) => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const lum = (c) => { const [r, g, b] = rgb(c).map(v => { v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); };
  const navy = probe('--navy');
  const c = ratio(probe('--entrada-tenue'), navy);
  PRUEBAS.cierto(c >= 4.5,
    '🔴 el contraste real pasa 4,5:1 sobre el navy del splash · ' + c.toFixed(2));
  /* DISCRIMINADOR · el token que se quitó NO lo pasa: si pasara, el arreglo no medía nada. */
  const malo = ratio(probe('--text-muted'), navy);
  PRUEBAS.falso(malo >= 4.5,
    'DISCRIMINADOR · `--text-muted` sobre ese navy NO llega a 4,5:1 · ' + malo.toFixed(2));
});
