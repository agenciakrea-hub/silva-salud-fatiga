PRUEBAS.grupo('P162 · el buzón anónimo, con lector y sin línea de tiempo');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   `accionOpiniones` existe en el endpoint desde el principio y NADIE la llamaba. Consecuencia: la
   única lectura posible era abrir la pestaña `Opiniones` del CH a mano, y ahí las filas están en
   orden de llegada porque `upsertPorId` termina en `appendRow`. El barajado que protege el
   anonimato vivía entero en el camino que nadie usaba, y faltaba en el único que se usaba.

   Medido antes del arreglo: la correlación entre la posición en la hoja y el orden de envío daba
   1,000 exacto — la hoja ERA la marca de tiempo. Con siete personas, "la tercera fila la escribió
   alguien la tarde del martes" alcanza para señalar a una.

   ⚠️ LO QUE ESTE ARREGLO NO HACE, y hay que decirlo: con cinco opiniones ninguna forma de barajar
   garantiza nada (una permutación al azar de 5 sale ordenada 1 de cada 120 veces). El límite lo
   pone la cantidad de opiniones, no el algoritmo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p162Env(fns){
  const env = GS.crearEntorno({
    'Opiniones': [['IdOpinion','Empresa','Mes','Texto']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula'], ['Consorcio HELITEC','Ana Suárez','12345678']],
    'Accesos': [['Usuario (puede ser el que quieras)','Contraseña (puede ser la que quieras)',
                 'Rol (supervisor ve solo su empresa, admin ve todas)',
                 'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)'],
                ['helitec','clave-sup','supervisor','Consorcio HELITEC']]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
const p162Hoja = api => api.__env.__libro.getSheetByName('Opiniones').getDataRange().getValues();

PRUEBAS.caso('🔴 la hoja deja de ser una línea de tiempo · la última en llegar no queda última', () => {
  /* El discriminador es el propio caso: si `opiDesordenar` no hiciera nada, la fila recién escrita
     quedaría SIEMPRE al final y `siempreUltima` daría 10 de 10. Con el desordenador puesto tiene
     que fallar al menos una vez — la probabilidad de que no lo haga con 10 escrituras sobre una
     hoja que crece es despreciable. */
  const api = p162Env(['accionOpinionGuardar','opiDesordenar','obtenerHojaOpiniones']);
  let siempreUltima = 0;
  const N = 10;
  for (let i = 0; i < N; i++){
    api.accionOpinionGuardar({ id:'op-' + i, empresa:'Consorcio HELITEC', mes:'2026-09', texto:'texto ' + i });
    const filas = p162Hoja(api);
    if (String(filas[filas.length - 1][0]) === 'op-' + i) siempreUltima++;
  }
  PRUEBAS.igual(p162Hoja(api).length, N + 1, 'guarda: se escribieron las ' + N + ' opiniones más el encabezado');
  PRUEBAS.cierto(siempreUltima < N,
    '🔴 la fila nueva no puede quedar SIEMPRE al final: eso es lo que hace de la hoja un reloj ' +
    '(quedó última ' + siempreUltima + ' de ' + N + ')');
});

PRUEBAS.caso('⚠️ el encabezado nunca se toca, y no se pierde ni se duplica ninguna opinión', () => {
  /* Un desordenador que se lleve puesta la fila 1, o que pise una opinión con otra, sería mucho
     peor que el defecto que viene a arreglar. */
  const api = p162Env(['accionOpinionGuardar','opiDesordenar','obtenerHojaOpiniones']);
  for (let i = 0; i < 12; i++)
    api.accionOpinionGuardar({ id:'op-' + i, empresa:'Consorcio HELITEC', mes:'2026-09', texto:'t' + i });
  const filas = p162Hoja(api);
  PRUEBAS.igual(String(filas[0][0]), 'IdOpinion', '⚠️ la fila de encabezados sigue siendo la fila 1');
  const ids = filas.slice(1).map(f => String(f[0])).sort();
  const esperados = Array.from({length:12}, (_,i) => 'op-' + i).sort();
  PRUEBAS.igual(ids, esperados, '⚠️ están las 12, una sola vez cada una · ninguna pisada, ninguna perdida');
  filas.slice(1).forEach(f => PRUEBAS.igual(String(f[3]), 't' + String(f[0]).slice(3),
    'y cada texto sigue con SU id: intercambiar filas no puede mezclar columnas'));
});

PRUEBAS.caso('⚠️ un reintento de la cola offline NO revuelve la hoja', () => {
  /* El upsert existe para que la cola pueda reintentar sin duplicar (R15). Si cada reintento
     moviera filas, dos envíos del mismo texto revolverían la hoja sin agregar nada — y una app
     sin señal reintenta muchas veces. */
  const api = p162Env(['accionOpinionGuardar','opiDesordenar','obtenerHojaOpiniones']);
  for (let i = 0; i < 6; i++)
    api.accionOpinionGuardar({ id:'op-' + i, empresa:'Consorcio HELITEC', mes:'2026-09', texto:'t' + i });
  const antes = JSON.stringify(p162Hoja(api));
  for (let k = 0; k < 5; k++)
    api.accionOpinionGuardar({ id:'op-3', empresa:'Consorcio HELITEC', mes:'2026-09', texto:'t3' });
  PRUEBAS.igual(JSON.stringify(p162Hoja(api)), antes,
    '⚠️ cinco reintentos del mismo id dejan la hoja exactamente igual');
});

PRUEBAS.caso('🔒 lo que viaja al cliente no trae el id ni la posición', () => {
  const api = p162Env(['accionOpinionGuardar','accionOpiniones','validarAcceso','opiDesordenar','obtenerHojaOpiniones']);
  for (let i = 0; i < 5; i++)
    api.accionOpinionGuardar({ id:'op-' + i, empresa:'Consorcio HELITEC', mes:'2026-09', texto:'t' + i });
  const r = JSON.parse(api.accionOpiniones({ usuario:'helitec', pass:'clave-sup', dispositivoId:'d1',
                                             empresa:'Consorcio HELITEC' }).getContent());
  PRUEBAS.cierto(r.ok, 'guarda: el supervisor puede leerlas');
  PRUEBAS.igual(r.opiniones.length, 5, 'y le llegan las cinco');
  const claves = [...new Set(r.opiniones.flatMap(o => Object.keys(o)))].sort();
  PRUEBAS.igual(claves, ['mes','texto'],
    '🔒 sólo mes y texto · el `IdOpinion` es lo único que permitiría seguir una opinión entre dos ' +
    'cargas, y ni la fila ni un índice pueden volver por la puerta de atrás');
});

PRUEBAS.caso('🔴 EL CLIENTE NO PUEDE REORDENAR, NUMERAR NI MARCAR «NUEVAS»', () => {
  /* R17 · se mira el CÓDIGO REAL, porque lo que este caso vigila es una tentación, no un valor:
     las tres cosas parecen mejoras de presentación y las tres reconstruyen la marca de tiempo que
     el barajado del servidor destruye. La bandeja de REPORTES sí marca las nuevas, y está bien
     ahí — los reportes llevan nombre. Acá no. */
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  const i = js.indexOf('function renderOpiniones');
  const cuerpo = i >= 0 ? js.slice(i, js.indexOf('\n}', i) + 2) : '';
  PRUEBAS.cierto(cuerpo.length > 0, 'tiene que encontrarse la función');
  PRUEBAS.falso(/\.sort\s*\(/.test(cuerpo),
    '🔴 ningún `sort()`: el servidor baraja en CADA pedido, y cualquier criterio estable vuelve a ' +
    'fijar un orden entre dos cargas');
  PRUEBAS.falso(/reverse\s*\(/.test(cuerpo), '🔴 ni `reverse()`, que es un orden igual de estable');
  PRUEBAS.falso(/Vistos|vistos|nuevo|nuevas|Nuevo/.test(cuerpo),
    '🔴 ni «nuevas desde tu última visita»: la diferencia entre dos cargas es una marca de tiempo ' +
    'con la resolución de cada cuánto entra el supervisor');
  PRUEBAS.falso(/\bindex\b|\(o,\s*i\)|\[i\s*\+\s*1\]/.test(cuerpo),
    '🔴 ni numerarlas: «opinión #3» es una posición, y una posición es un reloj');
  PRUEBAS.falso(/departamento|cedula|persona|nombre/i.test(cuerpo),
    '🔒 y nada que cruce con quién es quién');
});

PRUEBAS.caso('⚠️ la pestaña la tienen supervisor y dirección · nunca el servicio médico', () => {
  /* Entra por `dashTabsFor`, que es lo que arma la barra de verdad.
     ⚠️ DECISIÓN DE FRANCO (2026-09-09): la dirección SÍ lo ve — tiene un motivo legítimo para
     saber qué piensa el equipo. El servicio médico NO, y ésa es la línea que importa: su vista
     trabaja con nombres al lado de cada dato, que es exactamente lo que este canal existe para
     no tener. Poner el buzón ahí sería juntar, en una sola pantalla, textos anónimos y la lista
     de quién es quién. */
  PRUEBAS.cierto(dashTabsFor('supervisor', false, 'supervisor').indexOf('opiniones') >= 0,
    'el supervisor la tiene');
  PRUEBAS.cierto(dashTabsFor('supervisor', true, 'hseq', { activo:true }).indexOf('opiniones') >= 0,
    'y la dirección también');
  ['medico','empleado'].forEach(v =>
    PRUEBAS.falso(dashTabsFor('supervisor', true, v, { activo:true }).indexOf('opiniones') >= 0,
      '🔒 la vista ' + v + ' no'));
  PRUEBAS.cierto(TAB_KEYS.indexOf('opiniones') >= 0,
    '⚠️ y está en TAB_KEYS · sin eso la pestaña aparece sin etiqueta traducida');
  ['es','en'].forEach(l => {
    const antes = localStorage.getItem(K_LANG);
    try { localStorage.setItem(K_LANG, l);
      PRUEBAS.cierto(t('tab_opiniones') !== 'tab_opiniones', 'la etiqueta existe en ' + l + ' (R14)');
      PRUEBAS.cierto(t('hlp_opiniones') !== 'hlp_opiniones', 'y su guía ⓘ también (R5)');
    } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
  });
});

PRUEBAS.caso('⚠️ el contrato: lo que manda el servidor es lo que consume el cliente', () => {
  /* R17 · el defecto de siempre en este proyecto es un dato derivado por dos caminos que nadie
     compara. Acá se comparan: las claves que arma `accionOpiniones` en el `.gs` REAL contra las
     que lee `renderOpiniones` en el cliente. */
  const gs = CTX.gs;
  const i = gs.indexOf('function accionOpiniones');
  /* Se corta en el cierre de la función, no a los N caracteres: una ventana fija se rompe sola
     el día que alguien agrega un comentario arriba (le pasó a `x2-opinion-anonima.js`). */
  const finGs = gs.indexOf('\n}', i);
  const cuerpoGs = i >= 0 ? gs.slice(i, finGs > 0 ? finGs + 2 : i + 3000) : '';
  PRUEBAS.cierto(/opiniones:\s*out/.test(cuerpoGs), 'el servidor manda la lista en `opiniones`');
  PRUEBAS.cierto(/mes:\s*String/.test(cuerpoGs) && /texto:\s*String/.test(cuerpoGs),
    'con `mes` y `texto` en cada elemento');
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  const j = js.indexOf('function dashCargarOpiniones');
  const cuerpoCli = j >= 0 ? js.slice(j, j + 700) : '';
  PRUEBAS.cierto(/d\.opiniones/.test(cuerpoCli), '⚠️ y el cliente lee exactamente esa clave');
  PRUEBAS.cierto(/action:\s*'opiniones'/.test(cuerpoCli),
    '⚠️ llamando a la acción que el endpoint enruta · éste es el eslabón que faltaba desde siempre');
  PRUEBAS.cierto(/gestAuth/.test(cuerpoCli),
    '⚠️ y con `gestAuth()`: leer el buzón exige contraseña de supervisor, aunque escribir no la pida');
});
