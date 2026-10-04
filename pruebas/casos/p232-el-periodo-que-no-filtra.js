PRUEBAS.grupo('P232 · el período que no filtraba, y el rótulo que lo afirmaba');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Rafael, sobre el panel: «**no me parece que están todos los del evento de ayer**». Tenía razón
   en desconfiar, y la causa no era la que parecía.

   LO MEDIDO: el servidor le manda al supervisor `registrosSeguro`, que es **una fila por persona
   SIN FECHA** — `{persona, empresa, departamento, cargo}`. Su estado lo calcula `aptAutoServer`
   sobre TODOS los registros de cada quien, no sobre una ventana. Sin fecha, `dashFiltrdoEn` no
   puede filtrar nada: con el selector en `all`, `dia`, `semana`, `mes` o `trimestre`, el panel
   devolvía **las mismas 18 personas**. Y el rótulo decía «18 personas con registros **en el
   período seleccionado**» — afirmando un filtro que nunca se aplicó (R2), en la pantalla principal
   del supervisor, con las ocho opciones a la vista invitando a tocarlas.

   ⚠️ ANTES DE OCULTAR EL CONTROL SE VERIFICÓ QUE NO SIRVIERA EN NINGUNA PARTE de esa vista:
   con `all`, `dia` y `mes`, las CUATRO secciones del supervisor —aptitud, reportes, ciclo y
   opiniones— devuelven exactamente el mismo HTML. Ocultar un control que sí funciona en otro lado
   habría sido peor que el defecto.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p232Payload(vista){
  const reg = ['ANA UNO','BETO DOS','ZOE TRES'].map(n => ({
    persona:n, empresa:'Alfa', departamento:'Operaciones', cargo:'Op. Cardon' }));   // SIN fecha, como el real
  return { ok:true, rol:'supervisor', vista:vista, referencia:{}, metricas:['kss'],
    registros:reg, comentarios:[], pvt:[], turnos:[], ausencias:{}, duty:null,
    operacional:[], operacionalPeriodo:null, config:{}, marca:null, combinada:false, zonaOp:null,
    nominaTotal:3, nominaSinDato:[], nominaSinDatoN:0, nominaError:null,
    cicloPlanPersona:null, cicloPlanPersonaError:null, cuentas:null, visor:null, visorError:null,
    atajosAdmin:null,
    aptitud: reg.map(r => ({ nombre:r.persona, dep:r.departamento, cargo:r.cargo, n:1,
      metricas:[{m:'kss',nivel:'ok'}], pvt:null, auto:'ok', empeoro:false, persist:null, nivel:3,
      pocoConfiable:0, ultimoPocoConfiable:false, dias:1, viejo:false,
      ultimaFecha:'2026-10-03', ultimaFechaConfiable:'2026-10-03' })) };
}
function p232Con(vista, fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  return Promise.resolve()
    .then(() => { onDashData(p232Payload(vista), 'Alfa',
                    { usuario:'Alfa', empresa:'Alfa' }, vista); return fn(); })
    /* R18 · en el `.finally()` de la PROMESA, no en uno sincrónico. */
    .finally(() => { try { DASH = prev; } catch(e){} });
}

PRUEBAS.caso('🔴 los registros del supervisor NO traen fecha: por eso el período no podía filtrar', () => {
  /* EL HECHO que explica todo, y se mide sobre el payload REAL del servidor, no sobre mi idea:
     `registrosSeguro` (`armarAptitudServer`) empuja sólo cuatro campos y ninguno es la fecha. */
  return p232Con('supervisor', () => {
    const r0 = DASH.registros[0];
    PRUEBAS.cierto(!!r0, 'guarda: llegaron registros');
    PRUEBAS.falso(!!r0.fecha,
      '🔴 el registro del supervisor NO tiene fecha: es una fila por persona, no un test');
    /* Y la consecuencia, medida por el camino real: ningún período cambia a cuánta gente se ve. */
    const porPeriodo = {};
    ['all','dia','semana','mes','trimestre'].forEach(p => {
      DASH.f.period = p; porPeriodo[p] = aptGente(dashFiltered()).length; });
    DASH.f.period = 'all';
    const distintos = Object.keys(porPeriodo).map(k => porPeriodo[k]).filter((v,i,a) => a.indexOf(v) === i);
    PRUEBAS.igual(distintos.length, 1,
      '🔴 los cinco períodos devuelven la MISMA cantidad de gente · ' + JSON.stringify(porPeriodo));
  });
});

PRUEBAS.caso('🔴 el selector de período NO se pinta donde no hace nada, y SÍ donde sirve', () => {
  /* EL DERECHO, y quién lo concede: `buildDashFilters` con `periodoSirve = DASH.vista !==
     "supervisor"`. R19 · el derecho que se afirma es «el médico conserva su selector», y lo
     concede esa misma línea por el otro lado. */
  const cont = document.createElement('div');
  cont.style.cssText = 'position:fixed;left:-9999px;top:0;width:390px';
  document.body.appendChild(cont);
  const chips = () => { const f = document.getElementById('dashFilters');
    return f ? f.querySelectorAll('.pchip').length : -1; };
  return p232Con('supervisor', () => {
    buildDashFilters();
    /* LO QUE TIENE QUE CAMBIAR */
    PRUEBAS.igual(chips(), 0,
      '🔴 en la vista del supervisor NO hay chips de período: las ocho opciones no hacían nada');
  }).then(() => p232Con('medico', () => {
    buildDashFilters();
    /* LO QUE NO PUEDE CAMBIAR · el médico sí recibe registros con fecha y ahí el período manda */
    PRUEBAS.alMenos(chips(), 5,
      '🔴 NO PUEDE CAMBIAR · el médico conserva su selector: ocultarlo ahí sería el defecto al revés');
  })).finally(() => cont.remove());
});

PRUEBAS.caso('🔴 el rótulo ya no afirma un período que nunca se aplicó', () => {
  /* R2 · la pantalla no puede afirmar lo que no midió. Decía «N personas con registros **en el
     período seleccionado**» con las ocho opciones a la vista y ninguna aplicándose. */
  const txt = t('apt_n_con_registros', { n: 3 });
  PRUEBAS.falso(/per[ií]odo|period/i.test(txt),
    '🔴 el texto NO menciona un período · ' + txt);
  PRUEBAS.cierto(/3/.test(txt), '🔴 NO PUEDE CAMBIAR · sigue diciendo cuántas personas son · ' + txt);
  /* Y en inglés también: una regresión de idioma acá es invisible desde el español. */
  const prev = idiomaActual();
  try {
    fijarIdioma('en');
    const en = t('apt_n_con_registros', { n: 3 });
    PRUEBAS.falso(/period/i.test(en), '🔴 ni en inglés · ' + en);
  } finally { fijarIdioma(prev); }
});
