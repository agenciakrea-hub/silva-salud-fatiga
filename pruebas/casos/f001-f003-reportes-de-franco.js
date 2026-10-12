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

PRUEBAS.caso('🔴 F004 · Operaciones tiene puerta propia en la barra, y con el MISMO permiso que la Nómina', () => {
  if (typeof opsActualizarBoton !== 'function' || typeof dashUpdateNomFab !== 'function'){
    PRUEBAS.cierto(false, '⚠️ faltan `opsActualizarBoton`/`dashUpdateNomFab`: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ QUÉ DERECHO SE AFIRMA Y QUIÉN LO CONCEDE (R19). El derecho a ver cada puerta lo conceden
     dos funciones distintas: `dashUpdateNomFab()` para `#nomFabBtn` y `opsActualizarBoton()` para
     `#opsFabTop` y `#opsFabBtn`. Eso es lo que hace que este caso valga la pena: hasta F004 el
     botón de operaciones vivía ADENTRO de la hoja de Nómina y su comentario se escudaba en eso
     («la puerta de la nómina ya lo esconde, esto es el segundo cerrojo»). Sacarlo a la barra del
     panel le quita ese primer cerrojo, así que el único invariante que queda en pie es: **nadie
     ve la puerta de Operaciones sin ver la de Nómina.**
     ⚠️ NO se afirma la FORMA del criterio («vista !== hseq»): se afirma el invariante entre los
     dos, que es lo que se rompe si alguien toca uno solo. Un aserto sobre la forma sobrevive a la
     divergencia justamente en el caso que importa.
     ⚠️ Los dos botones viven dentro de `#app`, que está en `display:none` sin sesión (R11), así
     que acá NO se mide `offsetParent` ni visibilidad real: se mide el `style.display` que estas
     dos funciones escriben, que es el dato que ellas producen. */
  const ids = ['nomFabBtn', 'opsFabTop', 'opsFabBtn'];
  const els = {}; ids.forEach(function (id) { els[id] = document.getElementById(id); });
  const faltan = ids.filter(function (id) { return !els[id]; });
  PRUEBAS.igual(faltan.join(','), '',
    '🔴 los tres botones existen en el HTML · `#opsFabTop` es la puerta nueva de F004 · faltan: ' + faltan.join(','));
  if (faltan.length) return;

  const previos = {}; ids.forEach(function (id) { previos[id] = els[id].style.display; });
  const dashPrevio = (typeof DASH !== 'undefined') ? DASH : undefined;
  const mostrado = function (id) { return els[id].style.display !== 'none'; };
  const corrida = function (vista) {
    DASH = vista === null ? null : { vista: vista };
    dashUpdateNomFab(); opsActualizarBoton();
    return { nom: mostrado('nomFabBtn'), top: mostrado('opsFabTop'), dentro: mostrado('opsFabBtn') };
  };
  try {
    /* Las cinco vistas que el servidor puede mandar, más el estado sin panel. */
    const vistas = [null, 'empleado', 'hseq', 'medico', 'supervisor', 'admin'];
    let abiertas = 0, cerradas = 0, fugas = [];
    vistas.forEach(function (v) {
      const r = corrida(v);
      if (r.nom) abiertas++; else cerradas++;
      /* EL INVARIANTE: la puerta nueva no puede estar abierta donde la de la nómina está cerrada. */
      if (!r.nom && (r.top || r.dentro)) fugas.push(String(v) + ' → nom:no ops:' + (r.top ? 'top ' : '') + (r.dentro ? 'dentro' : ''));
      /* Y las dos puertas a la MISMA pantalla no pueden discrepar entre ellas. */
      if (r.top !== r.dentro) fugas.push(String(v) + ' → las dos puertas de Operaciones discrepan');
    });
    PRUEBAS.igual(fugas.join(' · '), '',
      '🔴 nadie ve Operaciones sin ver la Nómina, y las dos puertas de Operaciones dicen lo mismo · ' + fugas.join(' · '));
    /* DISCRIMINADORES · sin estos dos, un criterio que devolviera siempre lo mismo pasaría. */
    PRUEBAS.cierto(abiertas > 0, 'DISCRIMINADOR · alguna vista SÍ ve la nómina · si no, el invariante se cumple vacío');
    PRUEBAS.cierto(cerradas > 0, 'DISCRIMINADOR · alguna vista NO la ve · si no, no hay nada que proteger');
    /* DISCRIMINADOR 3 · romper el criterio de operaciones a propósito tiene que dar fuga. */
    DASH = { vista: 'hseq' };
    dashUpdateNomFab();
    els.opsFabTop.style.display = ''; els.opsFabBtn.style.display = '';
    PRUEBAS.cierto(!mostrado('nomFabBtn') && mostrado('opsFabTop'),
      'DISCRIMINADOR · forzada a mano, la fuga que este caso busca SÍ se puede producir · el aserto de arriba no es decorativo');
  } finally {
    DASH = dashPrevio;
    ids.forEach(function (id) { els[id].style.display = previos[id]; });
  }
});

PRUEBAS.caso('🔴 F004 · la puerta nueva NO le come el ancho a la barra del celular', () => {
  const btn = document.getElementById('opsFabTop');
  const scope = document.getElementById('dashScope');
  if (!btn || !scope){
    PRUEBAS.cierto(false, '⚠️ faltan `#opsFabTop`/`#dashScope`: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ ESTE CASO EXISTE PORQUE EL DE T3 SE PUSO EN ROJO, y el rojo decía la verdad. La suite
     corre la app en un iframe de 390 px. Con el botón nuevo en la barra, `#dashScope` —que es un
     ítem flex sin `flex-shrink: 0`— pasó de los 90 px que T3 le fuerza a **33 px medidos**, y el
     texto de una letra activó la marquesina. O sea: la barra de 390 px no tiene lugar para un
     séptimo elemento, que es la misma queja de `F005` («se sale de la pantalla») una franja más
     arriba. El derecho a ocupar ancho lo concede ahora el CSS —`@media (max-width: 899px)
     { #opsFabTop { display: none !important } }`—, no `opsActualizarBoton()`, que sigue
     decidiendo sólo el permiso por rol.
     ⚠️ Por eso NO se mide `style.display` acá: esa propiedad la escribe la función de permiso y
     diría «visible» igual. Se mide lo que de verdad decide el ancho, que es el `display`
     COMPUTADO bajo el ancho real de esta ventana. */
  const ancho = window.innerWidth;
  const computado = getComputedStyle(btn).display;
  if (ancho < 900){
    PRUEBAS.igual(computado, 'none',
      '🔴 bajo 900px la puerta nueva no ocupa la barra · ancho=' + ancho + ' display=' + computado);
  } else {
    PRUEBAS.cierto(computado !== 'none',
      '🔴 de 900px para arriba la puerta nueva SÍ está · ancho=' + ancho + ' display=' + computado);
  }
  /* ⚠️ EL OTRO LADO DEL CORTE NO LO PUEDE EJECUTAR ESTA SUITE: `panel.html` fija el iframe en
     390 px, así que `window.innerWidth` es siempre 390 y la rama de escritorio de arriba nunca
     corre. Un caso que PARECE cubrir los dos lados y cubre uno es peor que uno que declara su
     límite, así que acá se mide lo que sí se puede medir sin redimensionar: que **las dos** reglas
     del corte existan y que sus condiciones sean complementarias. Lo pidió el verificador con un
     escenario concreto: con el discriminador anterior —que sólo miraba el bloque de celular—
     alguien podía escribir `min-width: 9000px` en el otro, el botón no existiría en NINGÚN ancho y
     el caso seguía en verde. La rama de escritorio queda verificada A MANO (375/768/899/900/1366). */
  const corte = { ocultaEnCelular: null, muestraEtiquetaEnEscritorio: null };
  for (const hoja of document.styleSheets){
    let reglas; try { reglas = hoja.cssRules; } catch (e) { continue; }
    for (const r of (reglas || [])){
      if (r.type !== CSSRule.MEDIA_RULE) continue;
      const cond = r.conditionText || '';
      for (const sub of (r.cssRules || [])){
        const sel = sub.selectorText || '';
        if (sel.indexOf('#opsFabTop') >= 0 && /max-width/.test(cond)) corte.ocultaEnCelular = cond;
        if (sel.indexOf('.dash-ir-lbl') >= 0 && /min-width/.test(cond)) corte.muestraEtiquetaEnEscritorio = cond;
      }
    }
  }
  PRUEBAS.cierto(!!corte.ocultaEnCelular,
    'DISCRIMINADOR 1 · existe la regla que la esconde en celular · ' + corte.ocultaEnCelular);
  PRUEBAS.cierto(!!corte.muestraEtiquetaEnEscritorio,
    'DISCRIMINADOR 2 · existe la regla que la muestra con su nombre en escritorio · si alguien pone un ancho imposible acá, el botón no existe en ninguna pantalla · ' + corte.muestraEtiquetaEnEscritorio);
  /* Y que los dos números sean el MISMO corte: un `max-width: 400px` contra un `min-width: 900px`
     dejaría 500 px de tierra de nadie, que es el hueco fraccionario que este cambio ya cerró una
     vez (`899px` contra `900px`). Se comparan redondeados al entero de arriba. */
  const num = (c) => { const m = /(\d+(?:\.\d+)?)px/.exec(c || ''); return m ? Math.ceil(parseFloat(m[1])) : null; };
  PRUEBAS.igual(num(corte.ocultaEnCelular), num(corte.muestraEtiquetaEnEscritorio),
    '🔴 los dos lados del corte usan el MISMO ancho · sin esto queda una franja sin ninguna de las dos reglas');
});

PRUEBAS.caso('🔒 F004 · la nómina de OTRA empresa no arma el selector ni la frase «ya está asignada»', () => {
  if (typeof opsCargar !== 'function' || typeof nominaListSirve !== 'function'){
    PRUEBAS.cierto(false, '⚠️ faltan `opsCargar`/`nominaListSirve`: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ QUÉ DERECHO SE AFIRMA Y QUIÉN LO CONCEDE (R19). El derecho a reusar lo que hay cargado lo
     concede `nominaListSirve()`, que compara `NOMLIST.empresa` —el sello que pone
     `nominaListCargar()`— contra `nominaListEmpresaPedido()`. Los dos lados salen de la MISMA
     expresión, `dashAuth({}).empresa`, a propósito: sellar con una derivación y comparar con otra
     (`gestEmpresaActual()`) es el defecto que este repo pagó más veces.
     ⚠️ POR QUÉ EXISTE ESTE CASO. Lo encontró el verificador de `F004`: `NOMLIST.datos` no se
     invalida NUNCA al cambiar de empresa, y hasta `F004` eso no se notaba porque la única puerta a
     Operaciones vivía dentro de la hoja de Nómina, que se recarga al abrirse. La puerta nueva de la
     barra saltea ese refresco. Admin mirando A, pasa a B, toca Operaciones: el selector se armaba
     contra la gente de A, el filtro por empresa lo dejaba vacío, y como había datos se pintaba
     «Toda la nómina ya está asignada a esta operación» sobre una operación vacía. No transitorio.
     ⚠️ Entra por `opsCargar`, no montando `NOMLIST` a mano (R17): lo que se mide es que el
     LLAMADOR real vuelva a pedir la nómina, no que la función sepa comparar dos cadenas. */
  const prevD = DASH, prevR = window.dashRequest;
  const prevN = NOMLIST.datos, prevC = NOMLIST.cargando, prevE = NOMLIST.empresa;
  const restaurar = () => {
    try { DASH = prevD; } catch(e){}
    window.dashRequest = prevR;
    NOMLIST.datos = prevN; NOMLIST.cargando = prevC; NOMLIST.empresa = prevE;
  };
  const pedidos = [];
  try {
    window.dashRequest = function (params) {
      pedidos.push(String((params && params.action) || ''));
      return Promise.resolve({ ok:false, error:'cortado por el caso' });
    };
    /* La nómina quedó cargada mirando la empresa A. */
    NOMLIST.cargando = false;
    NOMLIST.datos = [{ persona:'Ana de la A', empresa:'Empresa A', cedula:'1' }];
    NOMLIST.empresa = 'Empresa A';
    /* Y ahora se está mirando la B — el estado real tras `dashEmpresaAdminCambiar()`. */
    DASH = { rol:'supervisor', vista:'supervisor', demoMode:false, scope:'Empresa B',
             f:{ emp:'Empresa B' }, params:{ usuario:'u', pass:'p', empresa:'Empresa B' } };
    PRUEBAS.falso(nominaListSirve(),
      '🔴 lo cargado NO sirve para la empresa que se mira ahora · sello=' + JSON.stringify(NOMLIST.empresa) +
      ' pedido=' + JSON.stringify(nominaListEmpresaPedido()));
    const r = opsCargar();
    return Promise.resolve(r).then(() => {
      PRUEBAS.cierto(pedidos.indexOf('nomina_listar') >= 0,
        '🔴 se vuelve a PEDIR la nómina · antes no, porque la condición miraba `.length` · pedidos: ' + JSON.stringify(pedidos));
      /* DISCRIMINADOR · con el sello correcto NO se vuelve a pedir: el arreglo no es «pedir siempre»,
         que convertiría cada apertura de la hoja en un pedido de más. */
      pedidos.length = 0;
      NOMLIST.empresa = nominaListEmpresaPedido();
      PRUEBAS.cierto(nominaListSirve(), 'DISCRIMINADOR · con el sello de ESTA empresa, lo cargado sí sirve');
      const r2 = opsCargar();
      return Promise.resolve(r2).then(() => {
        PRUEBAS.igual(pedidos.indexOf('nomina_listar'), -1,
          'DISCRIMINADOR · y entonces NO se pide de nuevo · pedidos: ' + JSON.stringify(pedidos));
      });
    }).finally(restaurar);
  } catch (e) { restaurar(); throw e; }
});

PRUEBAS.caso('🔒 F004 · mientras una carga está en vuelo, las puertas de la barra están cerradas', () => {
  if (typeof cargaIniciar !== 'function' || typeof dashPuertasCerrar !== 'function'){
    PRUEBAS.cierto(false, '⚠️ faltan `cargaIniciar`/`dashPuertasCerrar`: este contrato queda SIN MEDIR'); return; }
  /* ⚠️ QUÉ DERECHO SE AFIRMA Y QUIÉN LO CONCEDE (R19). Abrir las puertas lo deciden
     `dashUpdateNomFab()` y `opsActualizarBoton()`, con el dato en la mano, al final de
     `renderDash()`. CERRARLAS lo concede `dashPuertasCerrar()`, llamada desde `cargaIniciar()`.
     ⚠️ POR QUÉ. Las dos funciones que deciden tienen un solo llamador, y el `style.display` que
     escriben queda en línea y **sobrevive a la sesión**: medido, con el panel de un supervisor
     abierto un `portalBackToGate()` deja `#nomFabBtn` y `#opsFabTop` visibles, y las cuatro rutas
     que muestran `#portalDash` lo hacen ANTES del primer `renderDash` de la sesión nueva. Quien
     entra después como Dirección veía durante 2-5 s —y podía tocar, porque `cargaZona()` deja la
     barra fuera del `inert`— las dos puertas que el criterio existe para esconderle.
     ⚠️ El aserto es sobre el INVARIANTE («ninguna puerta abierta durante una carga»), no sobre la
     forma del criterio: el criterio por rol ya tiene su propio caso, y éste cubre la ventana en la
     que ese criterio no corrió todavía. */
  const ids = ['nomFabBtn', 'opsFabTop', 'opsFabBtn'];
  const els = {}; ids.forEach(id => { els[id] = document.getElementById(id); });
  if (ids.some(id => !els[id])){
    PRUEBAS.cierto(false, '⚠️ faltan botones en el HTML: este contrato queda SIN MEDIR'); return; }
  const previos = {}; ids.forEach(id => { previos[id] = els[id].style.display; });
  const prevD = DASH;
  const abiertas = () => ids.filter(id => els[id].style.display !== 'none');
  try {
    /* Una sesión anterior dejó las tres puertas abiertas. */
    ids.forEach(id => { els[id].style.display = ''; });
    PRUEBAS.igual(abiertas().length, 3, 'guarda: arrancan abiertas · si no, el caso no mide nada');
    /* Arranca CUALQUIER carga — un login, el visor, un cambio de empresa: todas pasan por acá. */
    cargaIniciar({ gate: document.getElementById('portalDash') });
    PRUEBAS.igual(abiertas().join(','), '',
      '🔴 ninguna puerta queda abierta mientras la carga viaja · abiertas: ' + abiertas().join(','));
    /* DISCRIMINADOR · y se vuelven a abrir con el dato en la mano, o el arreglo sería «apagarlas
       para siempre», que rompe la pantalla en vez de protegerla. */
    DASH = { vista:'supervisor', f:{ emp:'Empresa Uno' } };
    dashUpdateNomFab(); opsActualizarBoton();
    PRUEBAS.igual(abiertas().length, 3,
      'DISCRIMINADOR · con una sesión de supervisor vuelven las tres · abiertas: ' + abiertas().join(','));
    /* DISCRIMINADOR 2 · y para Dirección no vuelve ninguna, que es a quién protege todo esto. */
    DASH = { vista:'hseq', f:{ emp:'Empresa Uno' } };
    dashUpdateNomFab(); opsActualizarBoton();
    PRUEBAS.igual(abiertas().join(','), '',
      'DISCRIMINADOR 2 · Dirección no recupera ninguna · abiertas: ' + abiertas().join(','));
  } finally {
    try { DASH = prevD; } catch(e){}
    ids.forEach(id => { els[id].style.display = previos[id]; });
  }
});
