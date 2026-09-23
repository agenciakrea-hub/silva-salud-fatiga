/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P090 · CASO 15 · LA GRILLA ES **UNA** PARADA DE TABULACIÓN                       (2026-09-22)

   Un mes son 28 a 31 casillas. Con `tabindex="0"` en todas, quien navega con teclado tendría que
   pasar por las treinta y pico ANTES de llegar a la nota clínica que está debajo. El patrón
   correcto para una grilla es «tabindex móvil»: una sola parada, y adentro se mueve con las
   flechas. `cmesBloqueHtml` elige cuál es (`index.html:14369`), `cmesCeldaHtml` la emite
   (`index.html:14284`) y `cmesFocoEn` la mantiene (`index.html:14511`). Esta prueba es lo que
   impide que alguien lo deshaga sin enterarse.
   (Las tres referencias se revisaron contra el archivo el 2026-09-23, por segunda vez en el día: el
   código se movió otra vez y las de la mañana —14351, 14281 y 14481, que ya habían reemplazado a
   14316 y 14447— volvían a apuntar a otra cosa. Una referencia de línea que miente hace perder más
   tiempo que no tenerla.)

   ⚠️ ACÁ `:focus` NO ENGANCHA SOLO (R11): la pestaña corre con `document.hidden = true`
   permanente, así que ni las capturas ni los estilos de foco sirven de evidencia. Se comprueba
   `document.activeElement`, que sí responde al foco programático con la pestaña oculta
   (`pruebas/LEEME.md`, P183: «el foco SÍ engancha con la pestaña oculta, a medias»), y además el
   atributo `tabindex="0"`, que es lo que `cmesFocoEn` cambia de verdad y no depende del navegador.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17). Las teclas se DESPACHAN sobre la casilla enfocada y suben
   al `onkeydown="cmesTecla(event)"` de la grilla: no se llama a `cmesTecla` a mano, porque lo que
   puede romperse es el enganche, no la función. Y la cobertura no se escribe a mano en
   `K_CICLO_SRV_PER`: se entra por `misSincronizar()` con el `fetch` estubado. Sin cobertura TODAS
   las casillas salen `fuera` y por lo tanto `disabled` — `cmesFocoEn` corta en las deshabilitadas
   y la prueba habría medido una grilla donde no se puede mover nada.
   El stub se restaura en el `.finally()` de la promesa (R18).

   ⚠️ SE MIDE EN EL MES ANTERIOR, a propósito: ahí TODOS los días son pasados y están cubiertos, o
   sea habilitados. En el mes de hoy la mitad de las casillas son `futuro` (deshabilitadas) y una
   flecha que cae en una de ellas no mueve el foco — la prueba dependería del día del calendario en
   que se corriera, que es lo peor que le puede pasar a un caso.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P090 · caso 15 · teclado: una sola parada de tabulación en la grilla');

/* Igual que en `p090-toque-y-ancho.js`: 30 h atrás deja un ciclo sin cierre que a las 24 h el motor
   da por detenido. Acá no hace falta que sea una excepción, pero sembrar algo real es lo que
   garantiza que el bloque se pinte con datos y no con el camino de «mes vacío». */
function p090TkSembrar() {
  const prevLS = Object.assign({}, localStorage);
  CTX.resetear({ nombre: 'Persona De Prueba', cargo: 'Piloto', esPiloto: true });
  const t = Date.now() - 30 * 3600000;
  const iso = new Date(t).toISOString(), f = fechaOpDe(new Date(t));
  const oFetch = window.fetch;
  window.fetch = function () {
    return Promise.resolve({
      json: function () {
        return Promise.resolve({
          ok: true, rol: 'empleado', registros: [], pvt: [], metricas: [], referencia: null,
          operacional: [{ evento: cicloEventoInicial(), iso: iso, fecha: f, test: '', resultado: null }],
          /* 400 días: alcanza para cubrir el mes anterior entero y para que la flecha ‹ quede
             habilitada. Con menos, el mes anterior saldría `fuera` y sin casillas navegables. */
          operacionalPeriodo: { dias: 400, desde: null, hasta: null }
        });
      }
    });
  };
  _misSincronizando = false;
  return misSincronizar()
    .then(function (ok) { return { ok: ok, f: f, prevLS: prevLS }; })
    .finally(function () { window.fetch = oFetch; });   // R18 · en el finally de LA PROMESA
}

function p090TkLimpiar(prevLS) {
  /* `CMES` guarda el mes y el día abiertos EN MEMORIA y `CTX.resetear` no lo toca: sin esto, el
     caso siguiente que pinte el calendario del piloto lo encontraría en el mes anterior. */
  try { CMES = null; } catch (e) {}
  try { localStorage.clear(); Object.keys(prevLS).forEach(function (k) { localStorage.setItem(k, prevLS[k]); }); } catch (e) {}
  try { renderSections(); } catch (e) {}
}

function p090TkGrilla() {
  const c = document.getElementById('cmesMio');
  return c ? c.querySelector('[role="grid"]') : null;
}
function p090TkCelda(f) {
  const g = p090TkGrilla();
  return g ? g.querySelector('.cmes-d[data-f="' + f + '"]') : null;
}
/* LA PARADA, leída por el atributo y no por el foco. `cmesFocoEn` hace dos cosas —mueve el
   `tabindex="0"` y llama a `focus()`—; el atributo es la que no depende de que el navegador quiera
   darle el foco a una pestaña oculta, así que es el instrumento más firme de los dos. Los casos que
   ya estaban miden por `document.activeElement` y funcionan (LEEME, P183): esto se suma, no
   reemplaza. */
function p090TkParada() {
  const g = p090TkGrilla();
  const b = g ? g.querySelector('.cmes-d[tabindex="0"]') : null;
  return b ? b.getAttribute('data-f') : '(ninguna casilla tiene tabindex="0")';
}
/* La tecla entra por donde entra de verdad: se despacha sobre el elemento con el foco y burbujea
   hasta el `onkeydown` de la grilla. Devuelve el `data-f` de la casilla que quedó enfocada, o una
   descripción de lo que haya, para que una falla se lea sin abrir nada. */
function p090TkTecla(key) {
  const el = document.activeElement;
  if (!el || !el.closest || !el.closest('.cmes-d')) return '(el foco no estaba en una casilla: ' + (el && el.tagName) + ')';
  el.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
  const d = document.activeElement;
  if (!d || d === document.body) return '(document.body)';
  return d.getAttribute('data-f') || ('(' + d.tagName + '.' + d.className + ')');
}
/* Cuántos días tiene el mes, calculado APARTE de como lo calcula la app: el día 0 del mes que
   sigue es el último del mes. Si se usara la misma expresión que `cmesTecla`, Fin se estaría
   comparando consigo mismo y no mediría nada. */
function p090TkUltimoDia(ym) {
  const n = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  return ym + '-' + (n < 10 ? '0' + n : String(n));
}

PRUEBAS.caso('🔴 P090 · la grilla es UNA sola parada de tabulación: exactamente un [tabindex="0"] dentro de [role="grid"]', function () {
  return p090TkSembrar().then(function (s) {
    try {
      PRUEBAS.cierto(s.ok, 'guarda de medibilidad: la sincronización estubada entró · sin cobertura todas las casillas salen `fuera` y deshabilitadas');
      const cont = document.getElementById('cmesMio');
      PRUEBAS.cierto(!!cont, 'guarda: el calendario del piloto está en el DOM');
      if (!cont) return;

      /* Al mes anterior por el camino real: la flecha ‹, que es lo que toca la persona. */
      const ant = cont.querySelectorAll('.cmes-flecha')[0];
      PRUEBAS.falso(ant.disabled, 'guarda: con 400 días de cobertura la flecha ‹ está habilitada');
      ant.click();
      const ym = cmesMes('mio');
      PRUEBAS.igual(ym, fechaMasDias(todayStr().slice(0, 8) + '01', -1).slice(0, 7),
        'guarda: la flecha llevó al mes anterior');

      const g = p090TkGrilla();
      const celdas = g.querySelectorAll('.cmes-d');
      const paradas = g.querySelectorAll('[tabindex="0"]');
      PRUEBAS.alMenos(celdas.length, 28, 'guarda de medibilidad: el mes tiene sus días dibujados (' + celdas.length + ')');
      PRUEBAS.igual(paradas.length, 1,
        '🔴 UNA sola parada de tabulación · DISCRIMINADOR: con tabindex="0" en todas serían ' +
        celdas.length + ', y quien usa teclado tendría que pasar por las ' + celdas.length +
        ' antes de llegar a la nota clínica que está debajo');
      PRUEBAS.igual(g.querySelectorAll('[tabindex]').length, celdas.length,
        'y TODAS las casillas declaran su tabindex: las demás en -1, no sin atributo (sin atributo un <button> es parada igual)');
      PRUEBAS.igual(g.querySelectorAll('[tabindex="-1"]').length, celdas.length - 1,
        'las otras ' + (celdas.length - 1) + ' quedan fuera del recorrido de Tab');

      /* Con el mes anterior a la vista y sin día abierto, el día PREFERIDO es el 1
         (`index.html:14369`), y acá el 1 está alcanzable porque el período cubre 400 días hacia
         atrás: el preferido gana. Cuando NO está alcanzable la parada se corre al primer día del mes
         que sí se pueda enfocar — eso lo mide el caso 18, al final del archivo. */
      PRUEBAS.igual(paradas[0].getAttribute('data-f'), ym + '-01',
        'la parada es el primer día del mes cuando no hay día abierto, no es el mes de hoy y ese día se puede enfocar');
      PRUEBAS.falso(paradas[0].disabled, 'y esa casilla está habilitada: una parada deshabilitada no recibe el foco');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});

PRUEBAS.caso('🔴 P090 · ←/→ mueven un día, ↑/↓ siete, Inicio/Fin van a los bordes del mes · y el foco viaja con el tabindex', function () {
  return p090TkSembrar().then(function (s) {
    try {
      const cont = document.getElementById('cmesMio');
      if (!cont) { PRUEBAS.cierto(false, 'guarda: no se pintó el calendario del piloto'); return; }
      cont.querySelectorAll('.cmes-flecha')[0].click();          // al mes anterior: todos los días navegables
      const ym = cmesMes('mio');
      const d1 = ym + '-01';

      const inicio = p090TkCelda(d1);
      PRUEBAS.cierto(!!inicio, 'guarda: existe la casilla del día 1 (' + d1 + ')');
      if (!inicio) return;
      inicio.focus();
      PRUEBAS.igual(document.activeElement, inicio,
        'guarda: con la pestaña oculta `:focus` no engancha solo, pero el foco programático sí mueve document.activeElement');

      /* Las fechas esperadas salen de `fechaMasDias`, que es aritmética sobre TEXTO (L1): ni un
         `getMonth()` local, que al oeste de Greenwich devuelve el día anterior. */
      PRUEBAS.igual(p090TkTecla('ArrowRight'), fechaMasDias(d1, 1), '🔴 → avanza un día');
      PRUEBAS.igual(p090TkTecla('ArrowDown'), fechaMasDias(d1, 8), '🔴 ↓ avanza una semana (siete días)');
      PRUEBAS.igual(p090TkTecla('ArrowUp'), fechaMasDias(d1, 1), '🔴 ↑ retrocede una semana');
      PRUEBAS.igual(p090TkTecla('ArrowLeft'), d1, '🔴 ← retrocede un día');

      const ultimo = p090TkUltimoDia(ym);
      PRUEBAS.igual(p090TkTecla('End'), ultimo, '🔴 Fin va al último día del mes (' + ultimo + ')');
      PRUEBAS.igual(p090TkTecla('Home'), d1, '🔴 Inicio vuelve al primero');

      /* Y el tabindex móvil se movió CON el foco: si no, Tab volvería a entrar por el día 1 y la
         persona perdería el lugar donde estaba. */
      p090TkTecla('ArrowRight');
      const g = p090TkGrilla();
      const paradas = g.querySelectorAll('[tabindex="0"]');
      PRUEBAS.igual(paradas.length, 1, 'después de moverse sigue habiendo UNA sola parada');
      PRUEBAS.igual(paradas[0], document.activeElement,
        'y la parada es la casilla enfocada · DISCRIMINADOR: si el tabindex no siguiera al foco, Tab reentraría por el día 1');

      /* CONTROL · una tecla que la grilla NO maneja no mueve nada. Sin esto, un manejador que
         moviera el foco con cualquier tecla pasaría todas las comprobaciones de arriba. */
      const antes = document.activeElement.getAttribute('data-f');
      PRUEBAS.igual(p090TkTecla('a'), antes, 'CONTROL · una tecla cualquiera no mueve el foco');
      PRUEBAS.igual(p090TkTecla('Tab'), antes, 'CONTROL · Tab tampoco lo maneja la grilla: lo maneja el navegador');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});

PRUEBAS.caso('🔴 P090 · Escape cierra el detalle y el repintado NO deja el foco en document.body', function () {
  return p090TkSembrar().then(function (s) {
    try {
      const cont = document.getElementById('cmesMio');
      if (!cont) { PRUEBAS.cierto(false, 'guarda: no se pintó el calendario del piloto'); return; }
      cont.querySelectorAll('.cmes-flecha')[0].click();
      const ym = cmesMes('mio');
      /* Después de la flecha el foco queda en la flecha: `cmesRepintar(ambito,'flecha')`. Es la
         primera evidencia de que un repintado no tira el foco al principio del documento. */
      PRUEBAS.cierto(document.activeElement && document.activeElement.classList.contains('cmes-flecha'),
        'cambiar de mes deja el foco en la flecha, no en document.body (activeElement: ' +
        (document.activeElement && (document.activeElement.className || document.activeElement.tagName)) + ')');

      /* Se abre el detalle por el camino real: un toque en la casilla (`onclick` → cmesSeleccionar). */
      const d10 = ym + '-10';
      const celda = p090TkCelda(d10);
      PRUEBAS.cierto(!!celda && !celda.disabled, 'guarda: el día 10 del mes anterior está habilitado');
      if (!celda || celda.disabled) return;
      celda.click();

      PRUEBAS.existe('#cmesMio .cmes-det', 'tocar el día abre su detalle EN EL LUGAR (no es un overlay: `silvaAtras` no lo conoce)');
      PRUEBAS.igual(cmesDia('mio'), d10, 'y queda registrado como el día abierto');
      PRUEBAS.cierto(document.activeElement && document.activeElement.classList.contains('cmes-det-t'),
        'el repintado lleva el foco al título del detalle · quien navega con teclado tiene que aterrizar en lo que acaba de abrir');

      /* Escape sale de la grilla, así que hay que estar parado en una casilla: `cmesTecla` arranca
         con `ev.target.closest('.cmes-d')`. */
      const sel = p090TkGrilla().querySelector('.cmes-d[tabindex="0"]');
      PRUEBAS.igual(sel && sel.getAttribute('data-f'), d10,
        'con un día abierto, la parada de tabulación es ESE día');
      sel.focus();
      sel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

      PRUEBAS.igual(document.querySelector('#cmesMio .cmes-det'), null, '🔴 Escape cierra el detalle');
      PRUEBAS.igual(cmesDia('mio'), null, 'y suelta el día abierto');
      const act = document.activeElement;
      PRUEBAS.cierto(!!act && act !== document.body && !!act.closest && !!act.closest('#cmesMio'),
        '🔴 DISCRIMINADOR · después del repintado el foco sigue DENTRO del bloque, no en document.body ' +
        '(reemplazar innerHTML sin reponer el foco deja a quien usa teclado tirado al principio del documento) · ' +
        'quedó en: ' + (act === document.body ? 'document.body' : (act && (act.className || act.tagName))));

      /* ✅ 2026-09-23 · ESTA LÍNEA PINEABA UN BUG Y EL BUG SE FUE; el aserto quedó al día.
         Hasta el 22 de septiembre `cmesTecla` soltaba el día y repintaba, y nada más: con el día
         ya en null `cmesBloqueHtml` recalculaba la parada como «el primero del mes», así que quien
         cerraba con Escape el detalle del 10 aparecía de golpe en el 1. El caso afirmaba ESE
         síntoma (`ym + '-01'`) justamente para que el arreglo lo pusiera en rojo en vez de pasar
         inadvertido. Se puso en rojo, y acá está la actualización: hoy `cmesTecla` termina en
         `cmesFocoEn(ambito, f)` con la fecha de la casilla donde se pulsó (index.html:14490) y
         `cmesSeleccionar` hace lo mismo al cerrar con la ✕ (index.html:14473). El aserto pasa a
         decir lo que el plan pedía —«Escape devuelve el foco a SU celda»— y no lo que el código
         hacía mal. */
      PRUEBAS.igual(act && act.getAttribute && act.getAttribute('data-f'), d10,
        '🔴 Escape devuelve el foco a SU celda (' + d10 + ') · DISCRIMINADOR: el bug viejo dejaba el foco ' +
        'en ' + ym + '-01, el primer día del mes, y quien cerraba el detalle perdía el lugar donde estaba');
      PRUEBAS.igual(p090TkParada(), d10,
        'y la parada de tabulación viajó con el foco: es lo que `cmesFocoEn` cambia de verdad ' +
        '(index.html:14511), así que Tab vuelve a entrar por el día que se estaba mirando y no por el 1');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});

PRUEBAS.caso('P090 · con un día abierto el detalle también se cierra tocando la ✕, y Escape sin detalle abierto no hace nada', function () {
  return p090TkSembrar().then(function (s) {
    try {
      const cont = document.getElementById('cmesMio');
      if (!cont) { PRUEBAS.cierto(false, 'guarda: no se pintó el calendario del piloto'); return; }
      cont.querySelectorAll('.cmes-flecha')[0].click();
      const ym = cmesMes('mio'), d5 = ym + '-05';

      /* CONTROL · Escape con el detalle CERRADO no puede tener efecto: sin esto, un manejador que
         repintara siempre pasaría el caso de arriba sin haber cerrado nada. */
      const celda = p090TkCelda(d5);
      PRUEBAS.cierto(!!celda, 'guarda: existe la casilla del día 5');
      if (!celda) return;
      celda.focus();
      celda.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      PRUEBAS.igual(cmesDia('mio'), null, 'CONTROL · Escape sin día abierto no cambia nada');
      PRUEBAS.igual(document.activeElement, celda, 'y no mueve el foco');

      celda.click();
      PRUEBAS.igual(cmesDia('mio'), d5, 'guarda: el día quedó abierto');
      const x = document.querySelector('#cmesMio .cmes-det-x');
      PRUEBAS.cierto(!!x, 'el detalle trae su ✕ con nombre accesible');
      PRUEBAS.cierto(!!x && (x.getAttribute('aria-label') || '').length > 0, 'la ✕ se anuncia: el glifo solo no dice nada a un lector de pantalla');
      x.click();
      PRUEBAS.igual(document.querySelector('#cmesMio .cmes-det'), null, 'la ✕ cierra el detalle');
      PRUEBAS.igual(cmesDia('mio'), null, 'y suelta el día');
      const act = document.activeElement;
      PRUEBAS.cierto(!!act && act !== document.body, 'y tampoco deja el foco en document.body');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   CASOS 16 A 18 · EL TOPE Y LAS CASILLAS QUE NO RECIBEN FOCO                       (2026-09-23)

   Los casos de arriba miden el mes ANTERIOR entero cubierto, donde no hay una sola casilla
   deshabilitada. Eso deja fuera de la medición justo lo que se arregló el 23 de septiembre:

   · `cmesFocoEn(ambito, f, retroceso)` (index.html:14511). Los días que no se pueden abrir —los
     futuros y los que caen fuera del período traído del servidor— se dibujan `disabled`, y un
     `<button disabled>` no recibe foco. Sin el tercer argumento, bajar una semana desde un día
     cuya semana siguiente ya no existe dejaba el foco CLAVADO, sin nada visible: la tecla parecía
     rota. Ahora retrocede hasta el último día alcanzable (el bucle está en index.html:14525, y lo
     mide el caso 16: ↓, Fin e Inicio contra los dos bordes del período).
   · `cmesVecino` / `cmesPuedeIr` (index.html:14240 y 14244) como ÚNICA derivación del tope de
     navegación, para las flechas ‹ ›, para PageUp/PageDown y —desde el 23 de septiembre— también
     para el cruce de mes de `cmesFocoEn`. Antes PageUp se iba a julio con la flecha ‹ deshabilitada:
     dos derivaciones del mismo límite, diciendo cosas distintas.

   ⚠️ POR QUÉ EL BORDE SE FIJA CON LA COBERTURA Y NO CON LOS DÍAS FUTUROS. `cmesCasoDia` deshabilita
   por DOS razones —`futuro` y `fuera` (index.html:14178)— y `cmesFocoEn` no las distingue: mira
   `b.disabled`. Medir con los días futuros ataría el resultado al día del mes en que corra la
   suite: el 1 no hay ningún día pasado antes del cual retroceder, y el último día del mes el
   destino de ↓ cae SIEMPRE en el mes siguiente. Fijando `desde` y `hasta` del período, el borde
   queda donde lo pone el caso y el resultado es el mismo todos los días del año.

   Los tres sirven el payload por el camino real (R17): `misSincronizar()` con el `fetch` estubado,
   que es quien escribe `K_CICLO_SRV_PER` —de donde `cmesCobertura` saca el período—, y el stub se
   restaura en el `.finally()` de la promesa (R18).

   ✅ 2026-09-23 · LOS DOS ASERTOS QUE ESTABAN EN ROJO A PROPÓSITO YA NO LO ESTÁN. Eran defectos del
   código —no casos viejos—, el código se arregló, y entonces el pin dejó de describir lo que pasa:

   · el último del caso 17 · ↑ desde la primera semana se llevaba el calendario a un mes que la
     flecha ‹ declara inalcanzable. Hoy el cruce de mes de `cmesFocoEn` pregunta a `cmesPuedeIr`,
     la misma función que deshabilita la flecha (index.html:14519).
   · el último del caso 18 · la única parada de tabulación de la grilla podía caer en una casilla
     deshabilitada, y entonces Tab salteaba la grilla entera. Hoy `cmesBloqueHtml` recorre
     `cmesMatriz(ym)` y elige el primer día alcanzable del mes (index.html:14371).

   Los dos asertos siguen acá: el que antes pineaba el síntoma ahora afirma el comportamiento
   correcto, con el defecto viejo escrito al lado como discriminador. Ninguno se ablandó para llegar
   al verde — el del caso 18 pasó de esperar `-01` a esperar `-15`, que es una afirmación MÁS fuerte:
   antes decía «cae en el 1 sea alcanzable o no», ahora dice «cae exactamente en el primero que se
   puede enfocar».
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Igual que `p090TkSembrar`, pero con el período cubierto DICHO por el caso. `desde` y `hasta`
   viajan tal cual hasta `K_CICLO_SRV_PER` (index.html:14995) y `cmesCobertura` los usa en vez de
   derivarlos de `dias`, así que el borde entre casillas vivas y muertas queda donde el caso lo
   pone. `hasta: null` significa «hasta hoy», que es el caso normal. */
function p090TkSembrarCob(desde, hasta) {
  const prevLS = Object.assign({}, localStorage);
  CTX.resetear({ nombre: 'Persona De Prueba', cargo: 'Piloto', esPiloto: true });
  const t = Date.now() - 30 * 3600000;
  const iso = new Date(t).toISOString(), f = fechaOpDe(new Date(t));
  const oFetch = window.fetch;
  window.fetch = function () {
    return Promise.resolve({
      json: function () {
        return Promise.resolve({
          ok: true, rol: 'empleado', registros: [], pvt: [], metricas: [], referencia: null,
          operacional: [{ evento: cicloEventoInicial(), iso: iso, fecha: f, test: '', resultado: null }],
          operacionalPeriodo: { dias: 400, desde: desde, hasta: hasta }
        });
      }
    });
  };
  _misSincronizando = false;
  return misSincronizar()
    .then(function (ok) { return { ok: ok, prevLS: prevLS }; })
    .finally(function () { window.fetch = oFetch; });   // R18 · en el finally de LA PROMESA
}

function p090TkMesAnt() { return fechaMasDias(todayStr().slice(0, 8) + '01', -1).slice(0, 7); }
function p090TkDia(ym, n) { return ym + '-' + (n < 10 ? '0' + n : String(n)); }

/* Pulsa `key` PARADO en la casilla `f`. Devuelve '' si se pudo, o el motivo por el que no —una
   casilla que no existe o que está deshabilitada no es un punto de partida válido y el caso tiene
   que enterarse, no medir desde otro lado sin darse cuenta. Los casos que miden el MES leen
   `cmesMes` después; los que miden el FOCO usan `p090TkTecla`, que encadena desde donde quedó. */
function p090TkTeclaEn(f, key) {
  const c = p090TkCelda(f);
  if (!c) return '(no existe la casilla ' + f + ')';
  if (c.disabled) return '(la casilla ' + f + ' está deshabilitada: no se puede partir de ahí)';
  c.focus();
  c.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
  return '';
}

PRUEBAS.grupo('P090 · casos 16 a 18 · teclado: el tope de navegación y las casillas que no reciben foco');

PRUEBAS.caso('🔴 P090 · caso 16 · una casilla deshabilitada no se traga la tecla: ↓ y Fin caen en el último día alcanzable, ↑ e Inicio en el primero', function () {
  const ym = p090TkMesAnt();
  const d = function (n) { return p090TkDia(ym, n); };
  /* Cubierto del 5 al 20 del mes anterior: 1-4 y 21-fin salen `fuera` y se dibujan deshabilitados,
     y los de en medio están todos en el pasado, así que ninguno es `futuro`. */
  return p090TkSembrarCob(d(5), d(20)).then(function (s) {
    try {
      PRUEBAS.cierto(s.ok, 'guarda de medibilidad: la sincronización estubada entró · sin ella no hay período y TODO el mes sale `fuera`');
      const cont = document.getElementById('cmesMio');
      PRUEBAS.cierto(!!cont, 'guarda: el calendario del piloto está en el DOM');
      if (!cont) return;
      const ant = cont.querySelectorAll('.cmes-flecha')[0];
      PRUEBAS.falso(ant.disabled, 'guarda: el período empieza en el mes anterior, así que la flecha ‹ está habilitada');
      ant.click();
      PRUEBAS.igual(cmesMes('mio'), ym, 'guarda: la flecha llevó al mes anterior');

      /* GUARDAS DEL BORDE. Si el período no cayera donde el caso cree, todo lo de abajo estaría
         midiendo un mes sin bordes y saldría verde sin haber probado nada. */
      const c4 = p090TkCelda(d(4)), c5 = p090TkCelda(d(5)), c20 = p090TkCelda(d(20)), c21 = p090TkCelda(d(21));
      PRUEBAS.cierto(!!c4 && !!c5 && !!c20 && !!c21, 'guarda: existen las cuatro casillas del borde (4, 5, 20 y 21)');
      if (!c4 || !c5 || !c20 || !c21) return;
      PRUEBAS.cierto(c4.disabled, 'guarda: el 4 quedó fuera del período y su casilla está deshabilitada');
      PRUEBAS.falso(c5.disabled, 'guarda: el 5 es el primer día alcanzable');
      PRUEBAS.falso(c20.disabled, 'guarda: el 20 es el último alcanzable');
      PRUEBAS.cierto(c21.disabled, 'guarda: el 21 ya está fuera y su casilla está deshabilitada');

      /* SE ENTRA A LA GRILLA COMO SE ENTRA DE VERDAD (R17): un toque abre el detalle del 12 y
         Escape lo cierra devolviendo el foco a ESA casilla. De ahí en adelante, teclas encadenadas
         —que es exactamente lo que hace la persona. */
      const c12 = p090TkCelda(d(12));
      PRUEBAS.cierto(!!c12 && !c12.disabled, 'guarda: el 12 está habilitado y se puede tocar');
      if (!c12 || c12.disabled) return;
      c12.click();
      PRUEBAS.igual(cmesDia('mio'), d(12), 'guarda: el toque abrió el detalle del 12');
      const sel = p090TkGrilla().querySelector('.cmes-d[tabindex="0"]');
      PRUEBAS.igual(sel && sel.getAttribute('data-f'), d(12), 'guarda: con el 12 abierto la parada de tabulación es el 12');
      if (!sel) return;
      sel.focus();
      sel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      PRUEBAS.igual(p090TkParada(), d(12), 'guarda: Escape cerró el detalle y dejó el foco en el 12 · desde ahí miden las flechas');

      /* CONTRAFÁCTICO PRIMERO. Con el destino dentro del período, ↓ avanza los siete días enteros.
         Sin esta línea, un `cmesFocoEn` que pegara todo contra el borde pasaría las dos mediciones
         de abajo sin hacer nada de lo que dicen. */
      PRUEBAS.igual(p090TkTecla('ArrowDown'), d(19), '↓ con el destino alcanzable avanza la semana completa (12 → 19)');
      PRUEBAS.igual(p090TkTecla('ArrowDown'), d(20),
        '🔴 ↓ hacia el 26 —deshabilitado— cae en el 20, el último alcanzable · DISCRIMINADOR: no es el 19, ' +
        'donde estaba (sin el retroceso la tecla no hacía NADA visible), ni el 26, que no puede recibir foco');
      PRUEBAS.igual(p090TkParada(), d(20), 'y la parada de tabulación acompañó al foco: Tab reentra por el 20');
      PRUEBAS.igual(p090TkTecla('ArrowUp'), d(13), 'guarda: ↑ vuelve a un día alcanzable (20 → 13), así Fin no mide desde el 20 mismo');
      PRUEBAS.igual(p090TkTecla('End'), d(20),
        '🔴 Fin apunta al último día del MES, que está fuera del período: retrocede hasta el 20 · ' +
        'DISCRIMINADOR: arrancó en el 13, así que «no se movió» y «llegó al 20» no se confunden');
      PRUEBAS.igual(p090TkTecla('Home'), d(5),
        '🔴 Inicio apunta al 1, que está fuera: avanza hasta el 5, el primero alcanzable · el retroceso va ' +
        'en la dirección contraria y `cmesTecla` se la pasa distinta a cada tecla (index.html:14497)');
      PRUEBAS.igual(p090TkParada(), d(5), 'y la parada volvió a acompañar al foco');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});

PRUEBAS.caso('🔴 P090 · caso 17 · el teclado respeta el MISMO tope que las flechas ‹ ›: PageUp, PageDown y también ↑', function () {
  const ym = p090TkMesAnt();
  /* Cubierto desde el 1 del mes anterior: ese mes es el más viejo que se puede ver —la flecha ‹ se
     deshabilita ahí— y el mes de hoy es el más nuevo. Dos topes, uno de cada lado. */
  return p090TkSembrarCob(ym + '-01', null).then(function (s) {
    try {
      PRUEBAS.cierto(s.ok, 'guarda de medibilidad: la sincronización estubada entró');
      const cont = document.getElementById('cmesMio');
      PRUEBAS.cierto(!!cont, 'guarda: el calendario del piloto está en el DOM');
      if (!cont) return;
      const hoyYm = todayStr().slice(0, 7);
      PRUEBAS.igual(cmesMes('mio'), hoyYm, 'guarda: se arranca en el mes de hoy');
      PRUEBAS.cierto(cont.querySelectorAll('.cmes-flecha')[1].disabled,
        'guarda: la flecha › está deshabilitada en el mes de hoy · el calendario no muestra el futuro');

      PRUEBAS.igual(p090TkTeclaEn(todayStr(), 'PageDown'), '', 'guarda: se pudo pulsar PageDown parado en la casilla de hoy');
      PRUEBAS.igual(cmesMes('mio'), hoyYm,
        '🔴 PageDown no pasa del mes de hoy · mismo tope que la flecha › porque los dos preguntan a `cmesPuedeIr` (index.html:14244)');

      /* DISCRIMINADOR · que la tecla esté MANEJADA. Sin esto, un `cmesTecla` que no conociera
         PageDown pasaría la línea de arriba sin haber comprobado ningún tope. */
      PRUEBAS.igual(p090TkTeclaEn(todayStr(), 'PageUp'), '', 'guarda: se pudo pulsar PageUp parado en la casilla de hoy');
      PRUEBAS.igual(cmesMes('mio'), ym, 'DISCRIMINADOR · PageUp sí mueve: del mes de hoy al anterior, que está cubierto');

      PRUEBAS.cierto(cont.querySelectorAll('.cmes-flecha')[0].disabled,
        'guarda: en el mes anterior la flecha ‹ ya está deshabilitada · el período empieza el 1 de ese mes');
      PRUEBAS.igual(p090TkTeclaEn(ym + '-10', 'PageUp'), '', 'guarda: se pudo pulsar PageUp parado en el 10');
      PRUEBAS.igual(cmesMes('mio'), ym,
        '🔴 PageUp NO se va más atrás del tope · el defecto medido: con la regla sólo en el render, PageUp ' +
        'entraba en un mes que la flecha ‹ declaraba inalcanzable y que sale entero «fuera del período»');

      /* ✅ 2026-09-23 · ESTA LÍNEA PINEABA UN AGUJERO Y EL AGUJERO SE CERRÓ; el aserto quedó al día.
         `cmesFocoEn` se muda de mes en cuanto el destino cae en otro y hasta el 22 NO le preguntaba a
         `cmesPuedeIr`: el tope que PageUp ya respetaba lo salteaba ↑ desde la primera semana —y ↓
         desde la última, cuando el mes de hoy se termina a menos de siete días. Lo que se veía: un mes
         entero vacío al que las dos flechas dicen que no se puede ir, y el foco perdido, porque ahí no
         hay una sola casilla que lo reciba. Hoy el cruce pasa por la MISMA función que deshabilita la
         flecha (index.html:14519), así que el aserto afirma el tope en vez de denunciar el hueco. */
      PRUEBAS.igual(p090TkTeclaEn(ym + '-03', 'ArrowUp'), '', 'guarda: se pudo pulsar ↑ parado en el 3, que está dentro de la primera semana');
      PRUEBAS.igual(cmesMes('mio'), ym,
        '🔴 ↑ desde la primera semana NO salta a un mes que la flecha ‹ declara inalcanzable · ' +
        'DISCRIMINADOR: las dos líneas de PageUp de arriba prueban que el tope existe y que la tecla está ' +
        'manejada, así que un rojo acá es de `cmesFocoEn` y de nada más');
      /* Y la tecla bloqueada no puede tirar el foco afuera: `cmesFocoEn` corta ANTES de repintar. */
      const actArr = document.activeElement;
      PRUEBAS.igual(actArr && actArr.getAttribute && actArr.getAttribute('data-f'), ym + '-03',
        'y el foco se queda en el 3, donde estaba · un `return` que repintara primero lo dejaría en document.body');

      /* CONTRAFÁCTICO · el tope NO es «`cmesFocoEn` nunca cambia de mes». Parado en el último día del
         mes anterior, ↓ apunta al mes de hoy, que desde acá la flecha › SÍ declara alcanzable: tiene
         que cruzar. Sin esta línea, un `cmesFocoEn` que se negara a salir del mes pasaría el aserto de
         arriba sin respetar ningún tope. Es día-independiente: el mes se fija ANTES de buscar la
         casilla, así que da igual si el destino cae en el futuro y el retroceso lo corre hacia atrás. */
      const ultimoAnt = p090TkUltimoDia(ym);
      PRUEBAS.igual(p090TkTeclaEn(ultimoAnt, 'ArrowDown'), '',
        'guarda: se pudo pulsar ↓ parado en el último día del mes anterior (' + ultimoAnt + ')');
      PRUEBAS.igual(cmesMes('mio'), hoyYm,
        'CONTRAFÁCTICO · ↓ desde el último día SÍ cruza al mes de hoy, que es alcanzable · el tope es ' +
        '`cmesPuedeIr`, no «no cruzar nunca»');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});

PRUEBAS.caso('🔴 P090 · caso 18 · la única parada de tabulación de la grilla tiene que poder recibir el foco', function () {
  const ym = p090TkMesAnt();
  /* El período arranca el 15 del mes anterior. No es un montaje raro: es EL caso normal. El arranque
     pide 30 días y el servidor manda `desde: null`, así que `cmesCobertura` lo deriva con `hoy − 30`
     (index.html:14149) y eso cae siempre a mitad del mes anterior. Acá se fija el 15 para que el
     resultado no dependa de qué día corra la suite. */
  return p090TkSembrarCob(ym + '-15', null).then(function (s) {
    try {
      PRUEBAS.cierto(s.ok, 'guarda de medibilidad: la sincronización estubada entró');
      const cont = document.getElementById('cmesMio');
      PRUEBAS.cierto(!!cont, 'guarda: el calendario del piloto está en el DOM');
      if (!cont) return;

      /* DISCRIMINADOR · en el mes de hoy la parada es hoy y está habilitada, o sea que esta medición
         PUEDE dar verde. Un rojo abajo es un rojo de la app, no un instrumento trabado. */
      let parada = p090TkGrilla().querySelector('.cmes-d[tabindex="0"]');
      PRUEBAS.igual(p090TkParada(), todayStr(), 'guarda: en el mes de hoy la parada de tabulación es la casilla de hoy');
      PRUEBAS.cierto(!!parada && !parada.disabled,
        'DISCRIMINADOR · ahí la parada está habilitada: la misma comprobación da verde cuando el día elegido se puede enfocar');

      const ant = cont.querySelectorAll('.cmes-flecha')[0];
      PRUEBAS.falso(ant.disabled, 'guarda: la flecha ‹ está habilitada · el período empieza dentro del mes anterior');
      ant.click();
      PRUEBAS.igual(cmesMes('mio'), ym, 'guarda: la flecha llevó al mes anterior');
      /* EL BORDE, fijado antes de afirmar nada sobre la parada: sin estas tres guardas, «la parada es
         el 15» podría estar verde por casualidad en un mes cuyo borde cayó en otro lado. */
      const uno = p090TkCelda(ym + '-01'), c14 = p090TkCelda(ym + '-14'), c15 = p090TkCelda(ym + '-15');
      PRUEBAS.cierto(!!uno && uno.disabled,
        'guarda: con el período empezando el 15, el 1 quedó fuera y su casilla se dibuja deshabilitada');
      PRUEBAS.cierto(!!c14 && c14.disabled, 'guarda: el 14 también quedó fuera');
      PRUEBAS.cierto(!!c15 && !c15.disabled, 'guarda: el 15 es el PRIMER día alcanzable del mes');

      /* ✅ 2026-09-23 · ESTA LÍNEA PINEABA UN DEFECTO Y EL DEFECTO SE FUE; el aserto quedó al día.
         Hasta el 22 `cmesBloqueHtml` elegía la parada sin mirar si ese día se podía enfocar: el día
         preferido es el 1 y, con el período empezando a mitad de mes, el 1 se dibuja
         `<button disabled>`. Un botón deshabilitado NO entra en el recorrido de Tab, así que la grilla
         ENTERA quedaba inalcanzable —con el teclado no se podía abrir ningún día de ese mes— y
         `cmesRepintar` tampoco podía reponer el foco después de repintar, porque enfoca exactamente
         esa casilla (index.html:14459). No era un montaje raro: el arranque pide 30 días, el servidor
         manda `desde: null` y el corte cae SIEMPRE a mitad del mes anterior.
         El caso afirmaba ESE síntoma (`ym + '-01'`) para que el arreglo lo pusiera en rojo en vez de
         pasar inadvertido. Se puso en rojo, y acá está la actualización: hoy `cmesBloqueHtml` recorre
         `cmesMatriz(ym)` y toma el primer día del mes que no sea `futuro` ni `fuera`
         (index.html:14371), y sólo se queda con el preferido —el día abierto, o hoy, o el 1— cuando
         ese preferido es alcanzable (index.html:14378). Con el período empezando el 15, cae en el 15.
         El aserto quedó MÁS exigente que antes, no menos: `-01` era compatible con «elige el 1 siempre
         y sin mirar»; `-15` sólo se cumple si de verdad busca el primero que puede recibir el foco. */
      PRUEBAS.igual(p090TkParada(), ym + '-15',
        '🔴 la parada de tabulación se corre al primer día ALCANZABLE del mes (el 15) · DISCRIMINADOR: ' +
        'el preferido es el 1 y está deshabilitado, y las guardas de arriba fijan que el borde cayó ahí');
      parada = p090TkGrilla().querySelector('.cmes-d[tabindex="0"]');
      if (!parada) { PRUEBAS.cierto(false, 'guarda: la grilla tiene que tener su parada'); return; }

      PRUEBAS.falso(parada.disabled,
        '🔴 y la parada es una casilla que recibe el foco · con ella deshabilitada Tab saltea la grilla ' +
        'completa y con el teclado no se puede abrir ningún día de ese mes');
      /* El efecto, no sólo la condición: `disabled === false` es lo que se lee, tomar el foco es lo que
         importa. Con la pestaña oculta el foco programático sí mueve `activeElement` (LEEME, P183). */
      parada.focus();
      PRUEBAS.igual(document.activeElement, parada,
        'y lo toma de verdad: la grilla es alcanzable con el teclado en un mes que empieza a la mitad');
    } finally {
      p090TkLimpiar(s.prevLS);
    }
  });
});
