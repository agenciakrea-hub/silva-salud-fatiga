PRUEBAS.grupo('P091 · A8 · los tres arreglos del cierre de la tanda 6c que no son del endpoint');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Cada bloque de acá abajo ancla UN defecto que encontró la auditoría de cierre de tanda del
   2026-09-23 y que ya está arreglado. Los tres tienen la misma forma: algo que la app afirmaba o
   mostraba y que el dato no sostenía.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p091cEntorno(fn){
  const prev = Object.assign({}, localStorage);
  try {
    CTX.resetear({ cargo: 'Piloto', esPiloto: true });
    return fn();
  } finally {
    /* R18 · lo que ensucie este caso es la precondición del siguiente. */
    try { localStorage.clear(); Object.keys(prev).forEach(k => localStorage.setItem(k, prev[k])); } catch(e){}
    try { renderSections(); } catch(e){}
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   1 · LA JORNADA REGISTRADA MANDA SOBRE LA COBERTURA

   `cmesCasoDia` preguntaba por la cobertura ANTES de mirar si el día tenía ciclos, así que un día
   con su jornada ya armada salía «Sin datos cargados de este día» y su casilla quedaba `disabled`.
   La etiqueta accesible se contradecía sola —medido: «Sin datos cargados de este día. Pendiente de
   enviar.»— y las 30 casillas del mes quedaban muertas: ni se podía abrir el detalle.

   Dos caminos reales, los dos del uso normal:
     A · el piloto registra sin señal, o en el PRIMER pintado de cada arranque (`renderSections`
         corre antes de que resuelva `misSincronizar`), o después de volver a entrar, porque
         `sesionClavesBorrar` borra `K_CICLO_SRV_PER`.
     B · el médico con el período por defecto (7 días): el servidor recorta por un instante en SU
         zona y el cliente ubica la casilla en la de la operación, así que una jornada de noche del
         día del corte llega entera y cae «fuera».

   La cobertura existe para no afirmar de más sobre lo que no se pidió. Usarla para negar un dato
   que está en la mano es afirmar de menos, y eso también es R2.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P091 · un día CON jornada registrada no puede decir «sin datos cargados», aunque no haya cobertura', () => {
  p091cEntorno(() => {
    /* Camino real: los dos eventos los escribe `cicloMioGuardar`, que es lo que llama
       `enviarOperacional`. Nada armado a mano (R17). */
    cicloMioGuardar('salida_casa');
    cicloMioGuardar('llegada_aero');
    localStorage.removeItem(K_CICLO_SRV_PER);      // la sincronización todavía no volvió

    PRUEBAS.igual(cmesCobertura('mio'), null, 'guarda: sin la clave del período no hay cobertura · es la precondición del defecto');
    const fuente = cmesFuente('mio', cicloYo(), todayStr().slice(0, 7));
    PRUEBAS.igual((fuente.ciclos || []).length, 1, 'guarda: el motor SÍ armó la jornada · si no la armara, el caso no estaría midiendo nada');

    const cont = document.createElement('div');
    cont.innerHTML = cmesBloqueHtml('mio', cicloYo(), todayStr().slice(0, 7));
    const celda = cont.querySelector('.cmes-d[data-f="' + todayStr() + '"]');
    PRUEBAS.cierto(!!celda, 'guarda: la casilla de hoy está en la grilla');
    PRUEBAS.falso(celda.classList.contains('cmes-c-fuera'),
      '🔴 la casilla NO dice «sin datos cargados» sobre un día del que sí hay jornada');
    PRUEBAS.falso(celda.disabled,
      '🔴 y se puede abrir · con `disabled` no hay forma de ver el detalle de lo que uno acaba de registrar');
    const aria = celda.getAttribute('aria-label') || '';
    PRUEBAS.igual(aria.indexOf(t('cmes_e_fuera')), -1,
      'ni el nombre accesible lo dice · antes la misma cadena decía «Sin datos cargados» y «Pendiente de enviar» juntas');

    /* DISCRIMINADOR · un día SIN jornada y sin cobertura SIGUE siendo «fuera». El arreglo mueve una
       guarda de lugar; si hubiera roto la cobertura entera, esto se pondría rojo. */
    const ayer = fechaMasDias(todayStr(), -1);
    const cAyer = cont.querySelector('.cmes-d[data-f="' + ayer + '"]');
    PRUEBAS.cierto(cAyer && cAyer.classList.contains('cmes-c-fuera'),
      'DISCRIMINADOR · un día sin jornada y sin cobertura sigue diciendo «sin datos cargados»');
    PRUEBAS.cierto(cAyer && cAyer.disabled, 'y sigue sin poder abrirse, que es lo correcto: no hay nada que mostrar');

    const frase = cont.querySelector('.cmes-frase').textContent;
    PRUEBAS.cierto(frase.indexOf('1') >= 0 && frase.indexOf(t('cmes_res_sin_datos', { mes: '' }).slice(0, 12)) < 0,
      'y la frase de arriba cuenta el día en vez de decir que el mes no tiene datos · «' + frase + '»');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   2 · LOS CAMPOS DE «DETERMINAR APTITUD» EN TEMA OSCURO

   `.an-medico`, `.an-dur-num` y `.an-nota` declaraban `color: var(--text)` y ningún `background`,
   así que heredaban el blanco del navegador: en tema oscuro quedaba tinta casi blanca sobre blanco,
   **1,18:1**. Es el formulario donde el médico escribe la vigencia, quién determina y la nota
   clínica — la firma que después queda en la bitácora (R3).

   Sus dos hermanos (`.an-dur-unidad` y `.fm-nota`) sí declaran `background: var(--card)` y daban
   13,94:1. Esa diferencia es el discriminador: el medidor distingue, no marca todo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P091C_CAMPOS = ['an-medico', 'an-dur-num', 'an-nota'];
const P091C_HERMANOS = ['an-dur-unidad', 'fm-nota'];

function p091cMedirCampo(cls){
  const el = document.createElement(cls === 'an-nota' || cls === 'fm-nota' ? 'textarea' : 'input');
  el.className = cls;
  document.body.appendChild(el);
  try {
    const cs = getComputedStyle(el);
    return { fondo: cs.backgroundColor, tinta: cs.color,
             contraste: CTX.contraste(cs.color, cs.backgroundColor),
             lumFondo: p091cLum(cs.backgroundColor) };
  } finally { el.remove(); }
}
function p091cLum(c){
  const v = (String(c).match(/\d+(\.\d+)?/g) || [0,0,0]).slice(0,3).map(Number)
    .map(x => { x /= 255; return x <= 0.03928 ? x/12.92 : Math.pow((x+0.055)/1.055, 2.4); });
  return +(0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2]).toFixed(3);
}

PRUEBAS.caso('🔴 P091 · tema oscuro: los tres campos de «Determinar aptitud» tienen fondo propio y son legibles', () => {
  PRUEBAS.enTema('oscuro', () => {
    const malos = [], claras = [];
    P091C_CAMPOS.forEach(cls => {
      const m = p091cMedirCampo(cls);
      if (m.contraste < 4.5) malos.push(cls + ' ' + m.contraste + ':1');
      if (m.lumFondo > 0.5) claras.push(cls + ' L=' + m.lumFondo);
    });
    PRUEBAS.igual(malos, [], '🔴 los tres pasan 4.5:1 en oscuro · antes los tres daban 1,18:1 (tinta casi blanca sobre el blanco del navegador)');
    PRUEBAS.igual(claras, [], 'y ninguno es una superficie clara en tema oscuro (R13)');

    /* DISCRIMINADOR · los hermanos que YA tenían fondo siguen bien: si el medidor diera verde para
       todo, esto no probaría nada. Y un campo sin la clase, que hereda el blanco, tiene que salir
       mal — es la prueba de que el medidor reacciona. */
    P091C_HERMANOS.forEach(cls => {
      PRUEBAS.alMenos(p091cMedirCampo(cls).contraste, 4.5, 'DISCRIMINADOR · `.' + cls + '` ya estaba bien y sigue bien');
    });
    const suelto = document.createElement('input');
    suelto.style.background = '#ffffff'; suelto.style.color = 'var(--text)';
    document.body.appendChild(suelto);
    const cs = getComputedStyle(suelto);
    const malo = CTX.contraste(cs.color, cs.backgroundColor);
    suelto.remove();
    PRUEBAS.comoMucho(malo, 4.5,
      'DISCRIMINADOR · un campo con fondo blanco forzado SÍ sale mal (' + malo + ':1) · el medidor reacciona, no da verde a todo');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   3 · UNA ZONA VACÍA DEL SERVIDOR TIENE QUE PODER BORRAR LA QUE YA ESTABA

   El endpoint devolvía la zona del script (`America/Argentina/Buenos_Aires`, UTC−3) cuando la
   empresa no declaraba `zonaHoraria`, y el teléfono la guardaba en `K_ZONA_OP`. GS 2026-09-23.1 lo
   arregló del lado del servidor —pasó a devolver vacío— pero `if (d.zonaOp)` hacía que el vacío no
   pisara nada, y `zonaOpGuardar` también cortaba con vacío: la clave sólo se borraba al cerrar
   sesión, y el piloto no cierra sesión nunca. **El arreglo del servidor no llegaba a ningún
   dispositivo ya usado.**

   Lo que distingue los dos casos es `'zonaOp' in d`: un endpoint VIEJO no manda la clave (y no hay
   que tocar nada), uno NUEVO la manda vacía (y hay que borrar). `accionTareasMias` la nombra
   siempre en su rama `ok:true`, así que el `in` distingue de verdad.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* La línea REAL del manejador, copiada para poder ejercitarla sin disparar un pedido de red. Si
   alguien cambia la del archivo y no ésta, el caso deja de proteger nada — por eso el último aserto
   compara las dos. */
function p091cAplicarZona(d){
  if ('zonaOp' in d){ if (d.zonaOp) zonaOpGuardar(d.zonaOp); else zonaOpBorrar(); }
}

PRUEBAS.caso('🔴 P091 · el servidor que deja de declarar zona BORRA la que el teléfono tenía guardada', () => {
  p091cEntorno(() => {
    zonaOpGuardar('America/Argentina/Buenos_Aires');
    PRUEBAS.igual(localStorage.getItem(K_ZONA_OP), 'America/Argentina/Buenos_Aires',
      'guarda: el teléfono tiene guardada la zona que le dio el endpoint viejo');

    p091cAplicarZona({ ok: true, zonaOp: '' });
    PRUEBAS.igual(localStorage.getItem(K_ZONA_OP), null,
      '🔴 una respuesta con `zonaOp: ""` borra la clave · antes la dejaba clavada para siempre');
    PRUEBAS.igual(zonaOperacion(), null,
      'y `zonaOperacion()` cae a null, o sea a la zona del DISPOSITIVO, que es el comportamiento seguro');

    /* DISCRIMINADOR 1 · un endpoint VIEJO no manda la clave: no se toca nada. */
    zonaOpGuardar('America/Caracas');
    p091cAplicarZona({ ok: true });
    PRUEBAS.igual(localStorage.getItem(K_ZONA_OP), 'America/Caracas',
      'DISCRIMINADOR · un endpoint viejo (sin la clave) NO borra: se distingue «no mandó» de «mandó vacío»');

    /* DISCRIMINADOR 2 · una zona declarada sigue pisando lo que había. */
    p091cAplicarZona({ ok: true, zonaOp: 'America/Bogota' });
    PRUEBAS.igual(localStorage.getItem(K_ZONA_OP), 'America/Bogota',
      'DISCRIMINADOR · y una zona declarada sigue pisando · el arreglo no rompió el camino que sí funcionaba');

    PRUEBAS.igual(typeof zonaOpBorrar, 'function', 'guarda: `zonaOpBorrar` existe · sin ella el manejador tiraría y el pedido entero se caería');
  });
});

PRUEBAS.caso('⚠️ P091 · el manejador del archivo usa la MISMA regla que este caso ejercita', () => {
  /* Sin esto, el caso de arriba probaría una copia y no el código: si alguien vuelve a poner
     `if (d.zonaOp)` en el manejador real, este aserto es el único que se entera. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    PRUEBAS.cierto(/if\s*\(\s*'zonaOp'\s+in\s+d\s*\)/.test(src),
      '⚠️ el manejador real distingue con `\'zonaOp\' in d`, no por el valor');
    PRUEBAS.cierto(/else\s+zonaOpBorrar\(\)/.test(src),
      'y llama a `zonaOpBorrar()` cuando viene vacío');
    /* ⚠️ El lookahead NO es cosmético: la guarda nueva contiene a la vieja como subcadena
       (`if ('zonaOp' in d){ if (d.zonaOp) zonaOpGuardar(d.zonaOp); else zonaOpBorrar(); }`), así que
       sin él este aserto se marca a sí mismo. Lo que busca es una copia SIN el `else`, que es la
       forma que dejaba la zona clavada. */
    PRUEBAS.igual((src.match(/if\s*\(d\.zonaOp\)\s*zonaOpGuardar\(d\.zonaOp\);(?!\s*else\s+zonaOpBorrar)/g) || []).length, 0,
      'DISCRIMINADOR · y no quedó ninguna copia de la guarda vieja por valor (sin su `else`)');
  });
});
