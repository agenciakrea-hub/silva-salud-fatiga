/* ── P208 · el contrato del buzón anónimo, contra el .gs REAL ───────────────────────────────────
   (2026-09-29)

   Vive en su PROPIO archivo, y en la lista `soloConGs` de `casos.json`, por una razón que ya se
   cobró un caso en este mismo prompt: si el único caso que mide un contrato se saltea solo cuando
   `servir-gs.py` no está levantado, la suite entera devuelve VERDE Y COMPLETA mientras el contrato
   no se verificó. `correr.js` marca los archivos de `soloConGs` como salteados y anota
   `motivoIncompleta`, que es la diferencia entre «pasó» y «no se midió». */

PRUEBAS.grupo('P208 · el contrato del buzón anónimo');

PRUEBAS.caso('🔴 CONTRATO · el `id` que `accionOpinionGuardar` exige viaja en el payload del cliente', () => {
  /* R17 · se prueba el CONTRATO entre los dos lados, no cada lado por separado. El caso viejo de X2
     fijaba `['empresa','mes','texto']` y estaba verde mientras el servidor rechazaba TODAS las
     opiniones con «Faltan datos». */
  /* ⚠️ Esto NO es el «se saltea» de siempre, y la diferencia importa: este archivo está en
     `soloConGs`, así que `correr.js` ni lo carga cuando `servir-gs.py` está apagado (lo anota en
     `salteados` y marca la corrida como incompleta). Si alguien lo saca de esa lista, esta línea
     tiene que PONERSE EN ROJO, no sumar un verde: un caso de contrato que pasa sin haber leído el
     contrato es exactamente el «cero sin discriminador» que la cabecera viene a evitar. */
  PRUEBAS.cierto(!!CTX.hayGs, '⚠️ este caso NECESITA la fuente del endpoint; si llegó hasta acá sin ella, alguien lo sacó de `soloConGs`');
  if (!CTX.hayGs) return;
  const m = /function accionOpinionGuardar\s*\([\s\S]*?\n\}/.exec(CTX.gs);
  PRUEBAS.cierto(!!m, '⚠️ se encontró `accionOpinionGuardar` en el .gs (si no, lo de abajo daría verde en falso)');
  if (!m) return;
  const cuerpo = m[0];
  /* Lo que el servidor rechaza si falta, leído de su propio `if (…) return "Faltan datos"`. */
  const exigidas = /if\s*\(\s*!id\s*\|\|\s*!texto\s*\)/.test(cuerpo) ? ['id', 'texto'] : [];
  PRUEBAS.cierto(exigidas.indexOf('id') >= 0, 'el servidor sigue exigiendo `id` (si esto cambiara, este caso hay que revisarlo)');
  /* Y lo que el cliente manda, por el camino REAL: se toca «Enviar» y se mira lo que quedó encolado. */
  const oEnc = window.empEncolar, oPerfil = getProfile(), oToast = window.showToast, oCerrar = window.opinionCerrarUI;
  let payload = null;
  try {
    window.empEncolar = (id, accion, p) => { if (accion === 'opinion_guardar') payload = p; };
    window.showToast = () => {};
    window.opinionCerrarUI = () => {};   // R18 · sin tocar el historial: el tope de 50 entradas cuelga la pestaña
    setProfile({ nombre: 'ANA SUAREZ', empresa: 'Consorcio HELITEC', cedula: '99999999' });
    const ta = document.getElementById('opinionTxt');
    const prevTxt = ta ? ta.value : '';
    if (ta) ta.value = 'la guardia de la noche se hace larga';
    opinionEnviar(null);
    if (ta) ta.value = prevTxt;
    PRUEBAS.cierto(!!payload, '⚠️ «Enviar» encoló algo (si no, lo de abajo pasaría en falso)');
    exigidas.forEach(k => PRUEBAS.cierto(!!(payload && String(payload[k] || '').trim()),
      '🔴 el payload del cliente manda `' + k + '` con valor — sin eso el servidor contesta «Faltan datos» y TODA opinión anónima se rechaza'));
  } finally {
    window.empEncolar = oEnc; window.showToast = oToast; window.opinionCerrarUI = oCerrar;
    if (oPerfil) setProfile(oPerfil); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    try { document.getElementById('opinionOv').classList.remove('show'); } catch (e) {}
  }
});
