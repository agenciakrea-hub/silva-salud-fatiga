PRUEBAS.grupo('P200c · lote 2 de A8: los errores del servidor en inglés, los atributos del marcado estático y las cinco huérfanas del historial');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Once hallazgos de la auditoría de cierre de tanda (P091 · A8), los que quedaban de textos e
   idioma (#21 a #26) y los de «atrás»/historial (#16 a #20). Los de historial se miden por el
   camino real con espías sobre `history`, igual que P192 — construir el estado a mano probaría la
   función y no que el llamador de verdad le pueda dar lo que pide (R17).
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p200cEspiar(){
  const oP = history.pushState.bind(history), oB = history.back.bind(history), oG = history.go.bind(history);
  const c = { pushes: 0, backs: 0, gos: [] };
  history.pushState = function(){ c.pushes++; return oP.apply(history, arguments); };
  history.back = function(){ c.backs++; return oB.apply(history, arguments); };
  history.go = function(n){ c.gos.push(n); return oG.apply(history, arguments); };
  c.fin = () => { history.pushState = oP; history.back = oB; history.go = oG; };
  /* El BALANCE es lo que cuenta: entradas apiladas menos entradas descartadas. Un balance de +1 es,
     exactamente, un toque del botón físico que no va a hacer nada. */
  c.balance = () => c.pushes - c.backs - c.gos.reduce((a, n) => a + Math.abs(n), 0);
  return c;
}
function p200cEsperarPop(ms){
  return new Promise(res => { let hecho = false; const h = () => { if (hecho) return; hecho = true; window.removeEventListener('popstate', h); res(true); }; window.addEventListener('popstate', h); setTimeout(() => { if (!hecho){ hecho = true; window.removeEventListener('popstate', h); res(false); } }, ms || 700); });
}
async function p200cQuieto(){ await PRUEBAS.historialQuieto(90, 1200); }
function p200cLimpiar(){ document.querySelectorAll('.overlay.show, .ios-modal.show').forEach(o => o.classList.remove('show')); try { syncScrollLock(); } catch(e){} }

/* Cambia el idioma por el camino de la app (el mismo que lee `idiomaActual`) y lo restaura sí o sí.
   ⚠️ R18 · la suite comparte el localStorage con la app: dejar 'en' puesto contamina la corrida
   siguiente y el rojo aparece en otro caso. */
async function p200cEnIdioma(lang, fn){
  let antes = null;
  try { antes = localStorage.getItem(K_LANG); } catch(e){}
  try { localStorage.setItem(K_LANG, lang); } catch(e){}
  try { return await fn(); }
  finally {
    try { if (antes === null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); } catch(e){}
  }
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   22 · LOS ERRORES DEL ENDPOINT LLEGABAN EN ESPAÑOL CON LA APP EN INGLÉS

   `tError` mapeaba cuatro frases por expresión regular, sobre 138 cadenas de error distintas. Pero
   el `.gs` ya manda `motivo` —una clave estable— en la mayoría de sus rechazos, así que el arreglo
   resuelve por ahí. Este caso comprueba el CONTRATO, no una traducción: lee del .gs REAL qué
   motivos manda junto a un `ok:false` y exige que cada uno tenga clave en los dos diccionarios. Un
   motivo nuevo en el endpoint pone esto en rojo el día que se agrega.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los dos motivos del .gs que NO son errores: `persistencia()` los usa para explicar POR QUÉ una
   métrica disparó (tres lecturas seguidas sobre el rojo, o una pendiente que sube). Viajan dentro
   de un objeto de datos, nunca en una respuesta de rechazo. */
const P200C_NO_SON_ERRORES = { repetido: 'motivo clínico de persistencia', tendencia: 'idem' };

function p200cMotivosDeError(fuente){
  /* El objeto literal que contiene la posición `i`, balanceando llaves hacia los dos lados. Hace
     falta porque `error:` y `motivo:` son hermanos del MISMO literal, y una ventana de N caracteres
     mezcla respuestas vecinas — medido: con ±260 caracteres, `credenciales` traía «Método no
     permitido», que es de la respuesta de al lado. */
  const obj = i => {
    let d = 0, a = i;
    while (a > 0){ const c = fuente[a]; if (c === '}') d++; else if (c === '{'){ if (!d) break; d--; } a--; }
    d = 0; let b = i;
    while (b < fuente.length){ const c = fuente[b]; if (c === '{') d++; else if (c === '}'){ if (!d) break; d--; } b++; }
    return fuente.slice(a, b + 1);
  };
  /* ⚠️ `[A-Za-z0-9_]`, NO `[a-z_]`. Con la clase cerrada a letras minúsculas el lector se saltaba en
     SILENCIO el único motivo del .gs que lleva un dígito —`r2`, el rechazo de `accionTareaGuardar`
     cuando una tarea intenta declarar aptitud (R2)— y el caso daba verde igual. Lo encontró el
     verificador. Un cero sin discriminador no es un resultado, y acá el cero venía de no mirar. */
  const out = {}, re = /motivo\s*:\s*['"]([A-Za-z0-9_]+)['"]/g;
  let m;
  while ((m = re.exec(fuente)) !== null){
    const o = obj(m.index).replace(/\s/g, '');
    if (o.indexOf('ok:false') < 0) continue;      // es dato, no un rechazo
    out[m[1]] = (out[m[1]] || 0) + 1;
  }
  return out;
}

PRUEBAS.caso('🔴 P200c · todo motivo de rechazo del .gs tiene traducción en los dos idiomas', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs servido (python pruebas/servir-gs.py)'); return; }
  const delServidor = p200cMotivosDeError(CTX.gs);
  const nombres = Object.keys(delServidor);
  PRUEBAS.alMenos(nombres.length, 30,
    'guarda: se leyeron ' + nombres.length + ' motivos de rechazo del .gs real · si esto cayera a dos o tres, el lector se rompió y el resto del caso no probaría nada');

  const sinClave = nombres.filter(k => !P200C_NO_SON_ERRORES[k] && !ERR_MOTIVO[k]);
  PRUEBAS.igual(sinClave, [],
    '🔴 ningún motivo de rechazo se queda sin clave · antes tError mapeaba 4 frases sobre 138, así que con la app en inglés el error llegaba crudo en español');

  const sinTexto = Object.keys(ERR_MOTIVO).filter(k =>
    _i18nBuscar('es', sectorActual(), ERR_MOTIVO[k]) == null || _i18nBuscar('en', sectorActual(), ERR_MOTIVO[k]) == null);
  PRUEBAS.igual(sinTexto, [],
    '⚠️ y ninguna clave de la tabla falta en alguno de los dos diccionarios · una clave sin texto devolvería la clave cruda («err_m_baja»), que es PEOR que el español que vino a reemplazar');

  const inventados = Object.keys(ERR_MOTIVO).filter(k => !delServidor[k] && CTX.gs.indexOf('"' + k + '"') < 0 && CTX.gs.indexOf("'" + k + "'") < 0);
  PRUEBAS.igual(inventados, [], '⚠️ y la tabla no tiene motivos que el servidor no manda');

  /* DISCRIMINADOR · sin esto, un lector roto (o una tabla vacía) daría «0 sin clave» y el caso
     entero pasaría sin haber comprobado nada. Se le saca un motivo a una COPIA de la tabla y se
     confirma que el mismo filtro lo encuentra. */
  const copia = Object.assign({}, ERR_MOTIVO); delete copia.baja;
  PRUEBAS.igual(nombres.filter(k => !P200C_NO_SON_ERRORES[k] && !copia[k]), ['baja'],
    'DISCRIMINADOR · con la tabla incompleta el filtro SÍ encuentra el hueco · si esto diera [] el aserto de arriba no probaría nada');
  PRUEBAS.cierto(!!delServidor.r2,
    'DISCRIMINADOR · el lector ve el motivo con dígito (`r2`) · con `[a-z_]+` lo saltaba en silencio');
});

PRUEBAS.caso('🔴 P200c · en inglés gana el motivo; en español gana el texto del servidor, que es más específico', async () => {
  /* Los tres del login, que es la pantalla donde alguien que no entiende español se queda afuera. */
  const baja = { ok: false, motivo: 'baja', error: 'Tu empresa te dio de baja en la nómina. Consulta con tu supervisor.' };
  /* `solo_lectura` es el caso que obliga al gate por idioma: el .gs lo manda con DIEZ textos
     distintos («Dirección puede consultar el ciclo, pero no cerrarlo», «…la jornada, pero no
     cambiarla»…) y la clave es una sola. En español la frase del servidor dice cuál de los diez es;
     la clave, no. */
  const lectura = { ok: false, motivo: 'solo_lectura', error: 'Dirección puede consultar el ciclo, pero no cerrarlo.' };

  await p200cEnIdioma('en', () => {
    PRUEBAS.igual(idiomaActual(), 'en', 'guarda: la app quedó en inglés');
    PRUEBAS.igual(tError(baja), t('err_m_baja'), '🔴 en inglés el motivo gana y el mensaje se traduce');
    PRUEBAS.cierto(!/nómina|empresa te dio/.test(tError(baja)), 'y no queda nada del español crudo · «' + tError(baja) + '»');
    PRUEBAS.igual(tError(lectura), t('err_m_solo_lectura'), 'también para el motivo con diez textos distintos');
  });

  await p200cEnIdioma('es', () => {
    PRUEBAS.igual(tError(lectura), lectura.error,
      '⚠️ en ESPAÑOL gana el texto del servidor · traducir por motivo acá cambiaría diez frases específicas por una genérica: sería un arreglo que empeora el idioma principal');
    /* ⚠️ CON UN TEXTO QUE NO SEA IGUAL A LA CLAVE. Con el texto copiado letra por letra de
       `err_m_baja`, el aserto pasaba por tres caminos —motivo, regex, o crudo— y no distinguía
       ninguno: no probaba lo que decía su etiqueta. Éste es el texto REAL de `accionTareasMias`,
       más corto que la clave, así que si el español se reescribiera se vería. */
    const bajaCorta = { ok: false, motivo: 'baja', error: 'Tu empresa te dio de baja en la nómina.' };
    PRUEBAS.igual(tError(bajaCorta), bajaCorta.error,
      '⚠️ el del login tampoco se reescribe en español · antes lo hacía por la regex de `ERR_SERVIDOR`, que corría sin mirar el idioma');
    /* El caso medido por el verificador: el servidor dice «un momento» y la clave decía «unos minutos». */
    const frenado = { ok: false, motivo: 'muchos_intentos', error: 'Demasiados intentos. Espera un momento y vuelve a probar.' };
    PRUEBAS.igual(tError(frenado), frenado.error,
      '⚠️ y `nominaConfirmar` sigue diciendo lo que el servidor dijo, no una versión con otro plazo');
  });

  /* Un motivo que no está en la tabla cae al texto, y un objeto sin nada cae al genérico: la
     función existe desde A1 para que NUNCA se pierda el mensaje. */
  await p200cEnIdioma('en', () => {
    PRUEBAS.igual(tError({ ok: false, motivo: 'algo_que_no_existe', error: 'Texto suelto del servidor' }), 'Texto suelto del servidor',
      '⚠️ un motivo desconocido cae al texto, no a la clave cruda');
    PRUEBAS.igual(tError({ ok: false }), t('err_generico'), 'y una respuesta sin nada cae al genérico');
    PRUEBAS.igual(tError('Contraseña incorrecta'), t('err_credenciales'),
      'los llamadores que sólo tienen el string siguen andando: quedan los patrones por texto como respaldo');
  });
});

/* Las claves que el cliente NO puede mostrar aunque el servidor mande el motivo, con la razón:
   otro mensaje más específico las intercepta ANTES de llegar a `tError`. Una clave interceptada no
   es un defecto; una clave sin nadie que la pueda mostrar, sí. */
const P200C_INTERCEPTADAS = {
  err_m_falta_empresa: 'cred_reset_empresa lo dice mejor, con el nombre del filtro',
  err_m_demo_pass:     'pg_demo_pass_pide pide la clave en el campo, no como error',
  err_m_demo_pass_mal: 'pg_demo_pass_mal, idem'
};

PRUEBAS.caso('🔴 P200c · los llamadores le pasan la RESPUESTA ENTERA, y ninguna clave queda sin quien la muestre', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const viejos = (src.match(/tError\(d\s*&&\s*d\.error\)|tError\(d\.error\)/g) || []).length;
    PRUEBAS.igual(viejos, 0,
      '⚠️ ninguno quedó pasando sólo `d.error` · con el string la tabla de motivos no se usa NUNCA, y el arreglo sería código muerto (R17: ¿se puede LLEGAR a esa función?)');
    PRUEBAS.alMenos((src.match(/tError\(d\)/g) || []).length, 18, 'y los llamadores pasan `d`');

    /* ⚠️ EL CONTROL EN LA DIRECCIÓN INVERSA, que es el que faltaba. Traducir el motivo no sirve de
       nada si quien recibe esa respuesta pinta `d.error` a mano sin pasar por `tError`: eran SEIS
       sitios, y entre ellos la pantalla de CREAR CONTRASEÑA, que es justamente la que el comentario
       de `ERR_MOTIVO` pone como razón del arreglo. Lo encontró el verificador. */
    const crudos = (src.match(/\(d && d\.error\) \|\| t\(/g) || []).length;
    PRUEBAS.igual(crudos, 0,
      '🔴 ningún sitio pinta `d.error` crudo con un respaldo · esos seis mostraban el español del servidor en inglés, `tError` o no `tError`');
  });
});

PRUEBAS.caso('⚠️ P200c · cada motivo que el .gs manda llega a una pantalla que sabe traducirlo', () => {
  if (!CTX.hayGs){ PRUEBAS.cierto(false, 'se necesita el .gs servido'); return; }
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    /* Las acciones cuyo rechazo pinta alguien que NO pasa por `tError` quedarían con el motivo
       traducido y nadie que lo lea. Se mide al revés: para cada clave de la tabla, o hay quien la
       pueda mostrar, o está en la lista de interceptadas CON su razón. */
    const sinSalida = Object.keys(ERR_MOTIVO)
      .map(k => ERR_MOTIVO[k])
      .filter(clave => !P200C_INTERCEPTADAS[clave] && src.indexOf(clave) < 0);
    PRUEBAS.igual(sinSalida, [], '⚠️ ninguna clave de la tabla es inalcanzable');
    Object.keys(P200C_INTERCEPTADAS).forEach(k => {
      PRUEBAS.cierto(String(P200C_INTERCEPTADAS[k]).length > 10,
        'y cada excepción trae su razón escrita (' + k + ') · una excepción sin razón es una que nadie va a revisar');
    });
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   21 · LOS ATRIBUTOS DEL MARCADO ESTÁTICO NO PASABAN POR EL DICCIONARIO

   `cliente-idioma.js` comprueba que toda clave DECLARADA exista en los dos diccionarios, y el
   barrido de P191 sólo recorre el <script> grande: el marcado estático le quedaba entero afuera.
   Así, nueve de los once ojos de contraseña decían su aria-label en español con la app en inglés.
   Esto mide al revés — que todo atributo VISIBLE tenga su declaración — que es lo que faltaba.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Exentos, con la razón escrita. Un exento sin razón es una excepción que nadie va a revisar. */
const P200C_ATTR_EXENTOS = { 'Escudo 360 · Silva Salud': 'nombre del producto: no se traduce' };

PRUEBAS.caso('🔴 P200c · todo aria-label, placeholder, title y alt del marcado estático pasa por el diccionario', () => {
  /* ⚠️ SOBRE EL FUENTE, NO SOBRE EL DOM VIVO. Primero lo escribí recorriendo `document`, y dio 20
     falsos: el `aria-label` de cada casilla del calendario de P090, los `title` de los tramos de la
     línea de jornada… todos generados por JS, o sea ya pasados por `t()` al armarse. El marcado
     ESTÁTICO es el que no tiene quien lo traduzca, y para distinguirlo hay que leer el archivo. */
  const ATRS = ['aria-label', 'placeholder', 'title', 'alt'];
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const zonas = []; let pos = 0;
    src.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, (m, _t, i) => { zonas.push([pos, i]); pos = i + m.length; return m; });
    zonas.push([pos, src.length]);
    const sin = [], conDecl = [];
    zonas.forEach(([a, b]) => {
      const frag = src.slice(a, b);
      (frag.match(/<[a-zA-Z][^>]*>/g) || []).forEach(tag => {
        ATRS.forEach(at => {
          const v = new RegExp(at + '="([^"]*)"').exec(tag);
          if (!v || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(v[1])) return;
          if (P200C_ATTR_EXENTOS[v[1]]) return;
          const decl = /data-i18n-attr="([^"]*)"/.exec(tag);
          if (decl && decl[1].split(';').some(par => par.split(':')[0].trim() === at)) { conDecl.push(at); return; }
          sin.push(at + '="' + v[1].slice(0, 40) + '"');
        });
      });
    });
    PRUEBAS.alMenos(conDecl.length, 15,
      'DISCRIMINADOR · el barrido encontró ' + conDecl.length + ' atributos YA declarados en el marcado estático: si esto diera 0, el lector se rompió y el cero de abajo no significaría nada');
    PRUEBAS.igual(sin, [],
      '🔴 ninguno sin declarar · antes: 9 de los 11 ojos de contraseña y los 2 deslizadores de tamaño de letra decían su aria-label en español con la app en inglés');
  });
});

PRUEBAS.caso('⚠️ P200c · y los atributos declarados se traducen de verdad al barrer', async () => {
  await p200cEnIdioma('en', () => {
    const ojo = document.querySelector('#loginOv .pw-eye') || document.querySelector('.pw-eye');
    PRUEBAS.cierto(!!ojo, 'guarda: hay un botón de ojo en el DOM');
    i18nBarrer(document);
    PRUEBAS.igual(ojo.getAttribute('aria-label'), t('ver_contrasena'), '⚠️ el ojo dice su etiqueta en el idioma de pantalla · «' + ojo.getAttribute('aria-label') + '»');
    const sld = document.getElementById('sldTexto');
    if (sld) PRUEBAS.igual(sld.getAttribute('aria-label'), t('tamano_texto'), 'y el deslizador de tamaño de letra también');
  });
  i18nBarrer(document);   // R18 · devolver el DOM al idioma que estaba
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   23 a 26 · LOS CUATRO DE TEXTO
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('⚠️ P200c · el detalle del día del calendario no muestra la misma fecha dos veces en dos formatos', () => {
  /* `fmtDia` es un `const` DENTRO de la función que pinta el historial del ciclo: no es global y no
     se puede llamar desde acá. Lo que importa es de quién deriva, y eso se lee. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    const m = /const fmtDia = t0 => ([^;\n]+)/.exec(src);
    PRUEBAS.cierto(!!m, 'guarda: `fmtDia` sigue existiendo y con la forma esperada');
    PRUEBAS.cierto(/cmesFechaLarga/.test(m ? m[1] : ''),
      '⚠️ deriva de la MISMA función que el título del detalle · «' + (m ? m[1].trim() : '') + '» · antes decía «14 de marzo de 2026» arriba y «14/03/2026» tres píxeles abajo, sin localizar');
    PRUEBAS.cierto(!/toLocaleDateString|padStart\(2, ?'0'\).*\/|\/' \+/.test(m ? m[1] : ''),
      'DISCRIMINADOR · y ya no arma la fecha a mano con barras');
    /* La que sí es global: se comprueba que produzca un texto largo y localizado. */
    const largo = cmesFechaLarga(fechaOpDe(new Date(2026, 2, 14, 9, 0, 0)));
    PRUEBAS.cierto(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(largo) && largo.length > 8,
      'y `cmesFechaLarga` devuelve fecha larga · «' + largo + '»');
  });
});

PRUEBAS.caso('⚠️ P200c · «Avisos» sin soporte del navegador no promete lo que no puede dar, y el diccionario no mezcla ortografías', () => {
  ['es', 'en'].forEach(l => {
    PRUEBAS.cierto(_i18nBuscar(l, sectorActual(), 'avisos_nota_sin_soporte') != null,
      '⚠️ la nota de «sin soporte» existe en ' + l + ' · antes se mostraba igual la que promete los avisos');
  });
  const en = JSON.stringify(I18N.en);
  /* ⚠️ «analysis» y «analyses» (sustantivo) son correctas en las DOS variantes: la forma británica
     es el VERBO —analyse, analysed, analysing—. Y `\borganis` casa con «organismo», que es español
     y vive en una clave del bloque en. Una regex de más deja el caso en rojo por algo que no es un
     defecto, y un rojo así se termina desactivando. */
  const brit = (en.match(/\bcolour\w*|\bbehaviour\w*|\bfavourite\w*|\bgrey\b|\bjudgement\b|\bauthoris(e|ed|es|ing|ation)|\bsummaris(e|ed|es|ing|ation)|\borganis(e|ed|es|ing|ation)|\brecognis(e|ed|es|ing)|\bcentre[sd]?\b|\banalys(e|ed|es|ing)\b|\bcancelled|\blicence\b|\bdefence\b|\bprogramme[s]?\b/gi) || []);
  PRUEBAS.igual(brit, [], '⚠️ el diccionario en inglés no mezcla ortografía británica y americana · tres veces dentro de la MISMA clave');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   16, 17, 18, 19 y 20 · LAS CINCO HUÉRFANAS DEL HISTORIAL

   Una entrada huérfana es un toque del botón físico «atrás» que no hace nada. Se miden por el
   camino real: los abridores de la app y los botones que la persona toca.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200c · la clave de la demostración: entrar con la clave correcta no deja una entrada de más', async () => {
  p200cLimpiar(); await p200cQuieto();
  const c = p200cEspiar();
  const prevPayload = typeof DEMO_PAYLOAD !== 'undefined' ? DEMO_PAYLOAD : null;
  try {
    demoClaveAbrir();
    PRUEBAS.igual(c.pushes, 1, 'guarda: la hoja de la clave apiló su entrada');
    /* La rama de éxito de `demoClaveEnviar`, sin viajar al servidor: es exactamente lo que corre
       cuando el endpoint contesta ok (la respuesta se guarda y se abre el gate). */
    DEMO_PAYLOAD = { d: { ok: true }, params: {}, scope: 'Empresa Demo', lang: idiomaActual() };
    demoClaveCerrarUI();
    demoAbrirGate();
    PRUEBAS.igual(c.balance(), 1, '🔴 balance +1 y UNA pantalla a la vista: la entrada se REUSÓ, no se apiló otra · antes quedaban dos entradas para una pantalla');
    PRUEBAS.igual(c.pushes, 1, 'y no hubo un segundo pushState (P192: `navPush` en la misma tarea cancela el descarte pendiente)');
    await p200cEsperarPop(400);
    PRUEBAS.igual(c.backs + c.gos.length, 0, 'ni un descarte ejecutado: los dos se anularon dentro de la misma tarea');
  } finally {
    c.fin();
    try { DEMO_PAYLOAD = prevPayload; } catch(e){}
    p200cLimpiar(); await p200cQuieto();
  }
});

PRUEBAS.caso('🔴 P200c · «Salir de la demostración» descarta las DOS entradas: la del panel y la de la hoja del ojo', async () => {
  p200cLimpiar(); await p200cQuieto();
  const c = p200cEspiar();
  const prevDash = DASH, prevPayload = typeof DEMO_PAYLOAD !== 'undefined' ? DEMO_PAYLOAD : null;
  try {
    splashAbrirPortal();                       // el panel apila (P150)
    demoVistasAbrir();                         // la hoja del ojo apila la suya
    PRUEBAS.igual(c.pushes, 2, 'guarda: dos pantallas, dos entradas');
    PRUEBAS.igual(navPantallasAbiertas().sort().join(','), 'demoVistasOv,portalOverlay', 'guarda: las dos abiertas');
    demoSalirUI();                             // el botón vive DENTRO de la hoja del ojo
    await p200cEsperarPop(900);
    PRUEBAS.igual(navPantallasAbiertas().join(','), '', 'guarda: se cerraron las dos');
    PRUEBAS.igual(c.balance(), 0,
      '🔴 balance 0 · antes quedaba +1: `closePortal` cerraba la hoja del ojo PELADA y `demoSalirUI` descartaba una sola entrada');
    PRUEBAS.igual(c.gos.join(','), '-2', 'y los dos descartes de la misma tarea salen como UN solo go(-2) (P192)');
  } finally {
    c.fin();
    try { DASH = prevDash; DEMO_PAYLOAD = prevPayload; } catch(e){}
    p200cLimpiar(); await p200cQuieto();
  }
});

PRUEBAS.caso('🔴 P200c · el toque en una notificación no abre «Tus tareas» DEBAJO de lo que ya estaba abierto', async () => {
  p200cLimpiar(); await p200cQuieto();
  const c = p200cEspiar();
  const prevDash = DASH;
  try {
    splashAbrirPortal();
    PRUEBAS.igual(navPantallasAbiertas().join(','), 'portalOverlay', 'guarda: el panel está abierto, como cuando alguien deja la app en segundo plano');
    /* El camino REAL del aviso: es literalmente lo que ejecuta el oyente de mensajes del SW. */
    pushAbrir('tareas');
    await p200cEsperarPop(900);
    const abiertas = navPantallasAbiertas();
    PRUEBAS.falso(abiertas.indexOf('tareasOv') >= 0 && abiertas.indexOf('portalOverlay') >= 0,
      '🔴 no quedan las dos a la vez · antes: `tareasOv` va antes que `portalOverlay` en el DOM y con el mismo z-index, así que la hoja se abría TAPADA — el aviso no mostraba nada y el «atrás» siguiente cerraba la hoja invisible');
    PRUEBAS.igual(abiertas.join(','), 'tareasOv', 'la hoja queda sola y a la vista');
    PRUEBAS.igual(c.balance(), 1, 'y con UNA sola entrada apilada: el panel descartó la suya al cerrarse por interfaz');
  } finally {
    c.fin();
    try { DASH = prevDash; } catch(e){}
    p200cLimpiar(); await p200cQuieto();
  }
});

PRUEBAS.caso('🔴 P200c · lo que cuesta interrumpir no se cierra: el aviso se queda en «Tus tareas» del inicio', async () => {
  p200cLimpiar(); await p200cQuieto();
  const c = p200cEspiar();
  try {
    CTX.resetear();
    try { cerrarTest(); } catch(e){}
    abrirTest({ id: 'p200c', testFlow: 'kss', label: 'Prueba' });
    kssAdvance(5);                            // una respuesta dada: interrumpir acá cuesta
    PRUEBAS.igual(navPantallasAbiertas().join(','), 'testOverlay', 'guarda: sólo el test abierto, con una respuesta puesta');
    pushAbrir('tareas');
    await p200cEsperarPop(400);
    PRUEBAS.igual(navPantallasAbiertas().join(','), 'testOverlay',
      '🔴 el test sigue abierto y «Tus tareas» NO se abrió encima · un aviso no puede costarle a nadie un test contestado a medias');
    PRUEBAS.cierto(kssState && kssState.stepIdx === 1, 'y la respuesta sigue puesta');
  } finally { c.fin(); try { cerrarTest(); } catch(e){} p200cLimpiar(); await p200cQuieto(); }
});

PRUEBAS.caso('⚠️ P200c · las cuatro salidas de la hoja de contraseña consumen, y el «Cancelar» del formulario también', () => {
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    /* #19 · la rama de éxito de `clvEntrarConClaveRecien` era la única de las cuatro que cerraba
       con un `classList.remove` pelado. No se puede medir por el camino real sin que el servidor
       conteste `ya_tiene`, así que se lee del fuente — y se lee el ARREGLO, no su ausencia. */
    const i = src.indexOf('function clvEntrarConClaveRecien');
    const cuerpo = src.slice(i, src.indexOf('\nfunction ', i + 10));
    PRUEBAS.alMenos((cuerpo.match(/cerrarClave\(\)/g) || []).length, 4,
      '⚠️ las cuatro salidas usan `cerrarClave()` · la del ÉXITO no lo hacía, y es la que corre al terminar el registro: el primer «atrás» después no hacía nada');
    PRUEBAS.igual((cuerpo.match(/getElementById\('claveOv'\)\.classList\.remove\('show'\)/g) || []).length, 1,
      'DISCRIMINADOR · y queda un solo `remove(\'show\')` pelado en la función: el de dentro de `cerrarClave`, que sí descarta');
    /* #20 · la rama de edición del formulario, que hoy no corre pero nace escrita. */
    PRUEBAS.cierto(/isEdit \? 'closeSetupUI\(\)' : 'altaAbandonar\(\)'/.test(src),
      '⚠️ el «Cancelar» del formulario apunta a la versión que consume · con `closeSetup()` la edición de perfil nacería con una huérfana el día que se conecte');
    /* ⚠️ SIN LOS COMENTARIOS: el propio comentario que documenta este defecto nombra
       `openSetup(true)` dos veces, así que contarlos a secas daba 2 y el discriminador se
       autodestruía — medido en la primera corrida de este caso. */
    const codigo = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/[^\n]*/gm, ' ');
    PRUEBAS.igual((codigo.match(/openSetup\(true\)/g) || []).length, 0,
      'DISCRIMINADOR · y sigue sin haber ningún `openSetup(true)` en el CÓDIGO: la rama es alcanzable sólo en el papel, y por eso el comentario ahora lo dice');
    PRUEBAS.alMenos((src.match(/openSetup\(true\)/g) || []).length, 1,
      'guarda del discriminador · el comentario que lo explica sigue nombrándola');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS TRES ESTADOS PREVIOS QUE EL PRIMER ARREGLO DE #18 ROMPÍA

   Los encontró el verificador sobre mi propio arreglo, y los tres son peores que el defecto que
   venía a corregir: dejar sin tarea a quien acababa de activar los avisos, cerrarle las Gestiones a
   un supervisor sin descartar su entrada, y dejar una hoja flotando sobre un panel ya destruido.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 P200c · el aviso abre la tarea aunque la persona estuviera en la pestaña «Más»', async () => {
  p200cLimpiar(); await p200cQuieto();
  const c = p200cEspiar();
  try {
    CTX.resetear();
    mostrarVista('mas');
    PRUEBAS.cierto(navPantallasAbiertas().indexOf('viewMas') >= 0,
      'guarda: `navPantallasAbiertas()` cuenta `viewMas`, que NO es un overlay sino una pestaña de la barra de abajo');
    pushAbrir('tareas');
    await p200cEsperarPop(400);
    PRUEBAS.igual(navPantallasAbiertas().join(','), 'tareasOv',
      '🔴 la hoja se abre · «Más» es donde vive el bloque de Avisos, o sea donde está parado quien acaba de activarlos: midiendo antes de `mostrarVista(\'inicio\')`, el primer aviso que recibía esa persona no hacía nada');
  } finally { c.fin(); p200cLimpiar(); await p200cQuieto(); }
});

PRUEBAS.caso('🔴 P200c · el aviso NO cierra el panel si hay una hoja apilada encima, y no deja huérfanas', async () => {
  p200cLimpiar(); await p200cQuieto();
  const c = p200cEspiar();
  const prevDash = DASH;
  try {
    /* R17 · por el camino real: `DASH` lo arma `onDashData`, no un literal. Escrito a mano, la
       primera versión de este caso reventó en `gestEmpresaActual()` —lee `DASH.f.emp`, y `f` lo
       crea la capa de arriba—, que es exactamente el error que R17 describe. */
    CTX.resetear();
    splashAbrirPortal();
    onDashData({
      ok: true, rol: 'supervisor', vista: 'supervisor', referencia: {}, metricas: ['kss'],
      registros: [], comentarios: [], pvt: [], aptitud: [], turnos: [], ausencias: {},
      duty: null, operacional: [], operacionalPeriodo: null, config: { sector: 'aviacion' }
    }, 'Empresa Uno', { usuario: 'Empresa Uno', pass: 'x' }, 'supervisor');
    openGestiones();
    PRUEBAS.igual(c.pushes, 2, 'guarda: el panel y Gestiones apilaron una entrada cada uno');
    PRUEBAS.igual(navPantallasAbiertas().sort().join(','), 'gestionesOverlay,portalOverlay', 'guarda: las dos abiertas');
    pushAbrir('tareas');
    await p200cEsperarPop(400);
    PRUEBAS.cierto(document.getElementById('gestionesOverlay').classList.contains('show'),
      '🔴 Gestiones sigue abierta · `closePortal()` la cerraba de paso con un `remove(\'show\')` PELADO, sin descartar su entrada y salteando el borrado de las tarjetas en blanco');
    PRUEBAS.cierto(document.getElementById('portalOverlay').classList.contains('show'),
      'y el panel también · cerrarlo dejaba la hoja de arriba flotando sobre el inicio con `DASH = null`, o sea sin poder ni guardar');
    PRUEBAS.igual(c.balance(), 2, 'balance intacto: no se descartó ninguna entrada ajena');
    PRUEBAS.falso(navPantallasAbiertas().indexOf('tareasOv') >= 0, 'y la hoja de tareas no se abrió: el aviso queda en «Tus tareas» del inicio');
  } finally {
    c.fin();
    try { DASH = prevDash; } catch(e){}
    p200cLimpiar(); await p200cQuieto();
  }
});
