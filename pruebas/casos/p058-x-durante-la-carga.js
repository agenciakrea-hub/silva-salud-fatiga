/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P058 · N12 · LA ✕ DEL PORTAL, ALCANZABLE MIENTRAS EL LOGIN CARGA           (2026-09-06)

   ── EL DEFECTO, MEDIDO ──────────────────────────────────────────────────────────────────────
   `cargaBloquear()` ponía `inert` en `#portalGate`, y la ✕ vive ADENTRO. `inert` alcanza a todos
   los descendientes y **no se puede revertir en uno**: no existe un `inert="false"` que rescate a
   un hijo. Así que mientras el login carga —2,5 a 5 s normales, y hasta `DASH_TIMEOUT_MS` =
   **120 000 ms** si el servidor no contesta— la única forma de cancelar era el botón físico del
   teléfono. En escritorio, ninguna.

   Dos minutos mirando una pantalla que no responde, sin saber si se colgó o está trabajando, es
   de las peores cosas que puede hacer una app — y la reacción natural es recargar, que pierde lo
   que se estuviera haciendo.

   ── EL ARREGLO ──────────────────────────────────────────────────────────────────────────────
   Se bloquea `.portal-gate-card` —donde vive TODO lo interactivo del formulario— y no el marco
   que contiene la ✕. La ✕ ya hacía lo correcto: `closePortal()` llama a `cargaCancelar()`, así que
   cancela la carga en curso además de cerrar. Lo único que faltaba era poder tocarla.
   La decisión de QUÉ se bloquea vive en una sola función (`cargaZona`) y no en los cuatro
   llamadores: cuatro criterios sobre lo mismo terminan siendo cuatro criterios distintos.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.grupo('P058 · la ✕ del portal durante la carga');

/* Alcanzable = no está dentro de NINGÚN ancestro con `inert`. Se mira el ancestro y no el
   elemento: `inert` se hereda, así que preguntar sólo por el propio da falsos verdes. */
function p058Alcanzable(el){ return !!(el && !el.closest('[inert]')); }

PRUEBAS.caso('⚠️ con el formulario bloqueado, la ✕ SIGUE siendo tocable', () => {
  const gate = document.getElementById('portalGate');
  PRUEBAS.cierto(!!gate, 'guarda de medibilidad: existe `#portalGate`');
  const x = gate && gate.querySelector('.portal-x');
  const card = gate && gate.querySelector('.portal-gate-card');
  const campo = card && card.querySelector('input, button');
  PRUEBAS.cierto(!!x, 'guarda: existe la ✕');
  PRUEBAS.cierto(!!campo, 'guarda: hay algo interactivo en el formulario · sin eso no se mide nada');
  const eraInert = gate.hasAttribute('inert') || (card && card.hasAttribute('inert'));
  try {
    cargaBloquear(gate, true);
    PRUEBAS.cierto(p058Alcanzable(x),
      '⚠️ la ✕ NO puede quedar dentro de lo bloqueado · era la única salida durante hasta 120 s');
    PRUEBAS.falso(p058Alcanzable(campo),
      '⚠️ y el formulario SÍ tiene que estar bloqueado · si no, esto no protege de nada y el caso ' +
      'de arriba pasaría por la razón equivocada');
  } finally {
    cargaBloquear(gate, false);
    if (!eraInert) { gate.removeAttribute('inert'); if (card) card.removeAttribute('inert'); }
  }
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · con `inert` en el marco, la ✕ queda atrapada', () => {
  /* Sin esto, «la ✕ es alcanzable» podría estar pasando porque nada se bloquea. Se repone el
     comportamiento anterior —`inert` sobre `#portalGate` entero— y se comprueba que atrapa. */
  const gate = document.getElementById('portalGate');
  const x = gate && gate.querySelector('.portal-x');
  PRUEBAS.cierto(!!(gate && x), 'guarda de medibilidad: están los dos elementos');
  const eraInert = gate.hasAttribute('inert');
  try {
    gate.setAttribute('inert', '');
    PRUEBAS.falso(p058Alcanzable(x),
      '⚠️ con el marco inerte la ✕ SÍ queda atrapada · si esto falla, el detector no detecta');
  } finally { if (!eraInert) gate.removeAttribute('inert'); }
});

PRUEBAS.caso('⚠️ tocar la ✕ durante una carga la CANCELA, no sólo cierra', () => {
  /* Que se pueda tocar no alcanza: si cerrara sin cancelar, la respuesta tardía llegaría después y
     se aplicaría sobre una pantalla que la persona ya abandonó. `cargaCancelar()` invalida la
     carga en vuelo y restaura la interfaz. */
  const f = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  PRUEBAS.alMenos(f.length, 100000, 'guarda de medibilidad: se leyó la fuente');
  const cp = (f.match(/function closePortal\(\)[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cp.length, 100, 'guarda: se encontró `closePortal`');
  PRUEBAS.cierto(/cargaCancelar\(\)/.test(cp),
    '⚠️ `closePortal` cancela la carga en curso · sin eso, la respuesta tardía se aplicaría sola');
  /* ⚠️ Se mira el DOM, no la fuente. Mi primera versión buscaba con una regex sobre el texto de
     los `<script>` — pero ese botón está en el HTML, no en el JS, así que no encontraba nada y el
     caso daba rojo sobre código correcto. Preguntarle al elemento es exacto y no depende del orden
     en que estén escritos sus atributos. */
  const btnX = document.querySelector('#portalGate .portal-x');
  PRUEBAS.cierto(!!btnX, 'guarda de medibilidad: la ✕ del portal está en el DOM');
  const cx = (btnX && btnX.getAttribute('onclick')) || '';
  PRUEBAS.cierto(/closePortal/.test(cx),
    '⚠️ y la ✕ del portal llama a esa función · encontré «' + cx + '»');
});

PRUEBAS.caso('⚠️ la decisión de QUÉ se bloquea vive en un solo lugar', () => {
  /* Hay cuatro llamadores que bloquean el portal. Si cada uno eligiera su elemento, el día que
     alguien agregue un quinto lo elegiría distinto — y el síntoma sería este mismo defecto, otra
     vez, en un solo camino de los cinco. */
  const f = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n');
  PRUEBAS.cierto(/function cargaZona\(/.test(f), 'guarda de medibilidad: existe `cargaZona`');
  const cb = (f.match(/function cargaBloquear\([\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(cb.length, 100, 'guarda: se encontró `cargaBloquear`');
  PRUEBAS.cierto(/cargaZona\(/.test(cb),
    '⚠️ `cargaBloquear` resuelve la zona por sí misma · así los cuatro llamadores quedan cubiertos ' +
    'sin que ninguno tenga que acordarse');
});
