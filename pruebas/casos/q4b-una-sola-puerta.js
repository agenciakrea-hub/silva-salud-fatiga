
PRUEBAS.grupo('Q4b · una sola puerta');

/* ⚠️ EL PROBLEMA QUE ESTO RESUELVE. La portada tenía un enlace "Soy supervisor, servicio médico o
   dirección" del mismo tamaño que los otros: le pedía a la persona QUE SE CLASIFICARA ANTES DE
   IDENTIFICARSE. Y esa clasificación es falsa — un supervisor de Helitec es además alguien que
   reporta su propia fatiga, y al hacerlo elegir en la puerta la app lo empujaba a un rol y le
   escondía el otro.

   ⚠️ Y EL RIESGO QUE HABÍA QUE MEDIR. Sacar el enlace, a secas, le llevaba el recorrido a quien
   SÓLO usa el panel de 4 acciones a unas 19: carrusel de 5 pantallas obligatorias + los 9 campos
   del formulario de perfil, para alguien que no es empleado de nadie. Por eso la puerta única no es
   sólo sacar un enlace: son cuatro cambios que se sostienen entre sí, y cada uno tiene su caso. */

PRUEBAS.caso('⚠️ la portada ya no pide clasificarse: quedan Ingresar y dos accesos de excepción', () => {
  const ov = document.getElementById('splashOv');
  const tenia = ov.classList.contains('show');
  ov.classList.add('show');
  try {
    const acc = [...document.querySelectorAll('.splash-acciones button, .splash-pie button')]
      .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const txt = acc.map(b => (b.textContent || '').trim().toLowerCase()).join(' | ');
    PRUEBAS.igual(acc.length, 3, '⚠️ Ingresar, la demostración y Administrador — quedaron: ' + txt);
    PRUEBAS.falso(/supervisor|servicio médico|dirección/.test(txt),
      '⚠️ no puede volver a haber un acceso por ROL en la puerta: es lo que este prompt sacó');
    PRUEBAS.cierto(/ingresar/.test(txt), 'y el principal sigue siendo Ingresar');
  } finally { if (!tenia) ov.classList.remove('show'); }
});

PRUEBAS.caso('⚠️ quien SÓLO viene al panel tiene su salida en el primer paso del alta', () => {
  /* Y en el PRIMER paso, no al final: el servicio médico de la empresa cliente no es empleado de
     nadie y no tiene por qué llenar departamento, cargo y edad para ver un tablero. */
  const b = document.querySelector('.nom-link--panel');
  PRUEBAS.cierto(!!b, '⚠️ tiene que existir la salida hacia el panel dentro del alta');
  if (!b) return;
  PRUEBAS.cierto(/nominaSoyGestor/.test(b.getAttribute('onclick') || ''), 'y llevar al gate');
  const v = t('nom_soy_gestor');
  PRUEBAS.cierto(!!v && v !== 'nom_soy_gestor', 'con su texto traducido (R14)');
  PRUEBAS.cierto(/portalMode|splashAbrirPortal/.test(String(nominaSoyGestor)),
    'abriendo el portal, no otra cosa');
});

PRUEBAS.caso('⚠️ el carrusel se puede SALTAR, y saltar CONTINÚA (no vuelve atrás)', () => {
  /* Eran 5 toques obligatorios: la única salida era la ✕, que devuelve a la portada. Con la puerta
     única esos 5 los heredaba también quien viene sólo al panel, y ahí ya no son una presentación:
     son un peaje. */
  const b = document.querySelector('.car-saltar');
  PRUEBAS.cierto(!!b, '⚠️ tiene que haber forma de saltar la presentación');
  if (!b) return;
  const on = b.getAttribute('onclick') || '';
  PRUEBAS.cierto(/carruselTerminar/.test(on),
    '⚠️ tiene que CONTINUAR al alta — con `carruselCerrar` volvería a la portada y no serviría de nada');
  PRUEBAS.alMenos(Math.round(b.getBoundingClientRect().height) || 44, 44,
    'y ser tocable con guantes (44 px)');
});

PRUEBAS.caso('⚠️ el que ya guardó su sesión de empresa NI VE la portada', () => {
  /* Es lo que hace que la puerta única no le salga cara a nadie: paga los toques una vez y desde la
     segunda apertura entra en CERO acciones, contra las 4 que le costaba antes.
     Se comprueba sobre el arranque, que es donde se decide. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  PRUEBAS.cierto(/portalTieneSesionDeEmpresa\(\)\)\{\s*\n?\s*portalAbrirDirecto\(\)/.test(fuente),
    '⚠️ el arranque tiene que tener el camino "sin perfil pero con sesión de empresa"');
  /* ⚠️ Se mira EL BLOQUE DEL ARRANQUE, no todo el archivo: `portalTieneSesionDeEmpresa` está
     DECLARADA mucho más arriba, así que un `indexOf` global encuentra la declaración y no la
     llamada, y el caso daba rojo con el código correcto. */
  const i = fuente.indexOf('if (_complete){');
  PRUEBAS.alMenos(i, 0, 'el arranque tiene que decidir con `_complete`');
  if (i < 0) return;
  const bloque = fuente.slice(i, i + 260);
  PRUEBAS.cierto(bloque.indexOf('continuarAlta()') < bloque.indexOf('portalTieneSesionDeEmpresa()'),
    '⚠️ `_complete` va PRIMERO: quien es empleado y además gestiona tiene que ver su app, ' +
    'no el panel — el panel lo abre desde Estadísticas cuando quiera');
  PRUEBAS.cierto(/splashMostrar\(\);/.test(bloque),
    'y la portada queda como último recurso, para quien no tiene ni perfil ni sesión');
});

PRUEBAS.caso('⚠️ y sin sesión guardada sigue viendo la portada (discriminador)', () => {
  const prev = { c: localStorage.getItem(K_DASH_CREDS), m: localStorage.getItem(K_DASH_CREDS_MED) };
  try {
    localStorage.removeItem(K_DASH_CREDS); localStorage.removeItem(K_DASH_CREDS_MED);
    PRUEBAS.falso(portalTieneSesionDeEmpresa(), '⚠️ sin credenciales no puede dar por buena una sesión');
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec', token:'t' }));
    PRUEBAS.cierto(portalTieneSesionDeEmpresa(), 'y con credenciales sí');
    localStorage.setItem(K_DASH_CREDS, JSON.stringify({ usuario:'Helitec' }));
    PRUEBAS.falso(portalTieneSesionDeEmpresa(),
      '⚠️ un usuario SIN token ni contraseña no alcanza: entraría a una pantalla que no puede cargar');
  } finally {
    if (prev.c) localStorage.setItem(K_DASH_CREDS, prev.c); else localStorage.removeItem(K_DASH_CREDS);
    if (prev.m) localStorage.setItem(K_DASH_CREDS_MED, prev.m); else localStorage.removeItem(K_DASH_CREDS_MED);
  }
});

PRUEBAS.caso('⚠️ NINGÚN recorrido empeoró — el número sale del inventario de Q4a', () => {
  /* `INVENTARIO_INICIO.md`, medido antes de tocar nada. Este caso es la razón por la que 5.1 existió:
     sin esos números, "quedó más simple" no se puede sostener. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  // Empleado nuevo: 11 antes. Ahora 11 sin saltar y 7 salteando — el carrusel no puede crecer.
  PRUEBAS.igual(document.querySelectorAll('#carTrack > *').length, 5,
    '⚠️ el carrusel no puede sumar pantallas: cada una es un toque en el recorrido más largo');
  // Empleado que vuelve: 1. Sigue entrando derecho a sus datos.
  PRUEBAS.cierto(/portalAutoLoginEmpleado\(\); return;/.test(String(abrirDestinoEstadisticas)),
    '⚠️ quien sólo reporta sigue entrando directo a sus datos, sin selector');
  // Y con perfil completo, el arranque sigue yendo a la app.
  PRUEBAS.cierto(/if \(_complete\)\{?\s*\n?\s*continuarAlta\(\);/.test(fuente),
    '⚠️ Helitec entra todos los días por acá: con perfil completo, derecho a la app');
});

PRUEBAS.caso('los textos nuevos están en los dos idiomas y en neutro (R1, R14)', () => {
  ['nom_soy_gestor','car_saltar'].forEach(k => {
    const v = t(k);
    PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
    PRUEBAS.falso(/\bvos\b|tenés|querés|podés|andá/.test(String(v)), '⚠️ R1: nunca voseo — ' + k);
  });
});
