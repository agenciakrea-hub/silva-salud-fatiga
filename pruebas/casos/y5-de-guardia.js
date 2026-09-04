
PRUEBAS.grupo('Y5 · quién no estaba de guardia');

/* ⚠️ EL PEDIDO ERA "quién está de guardia y quién no". SE IMPLEMENTÓ AL REVÉS, y la inversión es la
   decisión de diseño de todo el bloque.
   Declarar la GUARDIA obliga a cargar a las 47 personas todos los días. Un dato que hay que
   mantener a diario se degrada —en este mismo CH hay precedentes— y se degrada hacia el lado
   cómodo: nadie carga, todo el mundo figura sin guardia, y de golpe "a nadie le tocaba reportar".
   Declarar la AUSENCIA es la misma información con el trabajo invertido: son dos o tres por semana.
   Y el default queda seguro POR CONSTRUCCIÓN, que es lo que el plan exigía. */

function y5Con(idx, fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  try { DASH = Object.assign({}, prev || {}, { ausencias: idx }); return fn(); }
  finally { DASH = prev; }
}

PRUEBAS.caso('⚠️ SIN NINGUNA AUSENCIA CARGADA, no cambia un solo número', () => {
  /* EL REQUISITO DEL PLAN, textual: "el default tiene que ser sí se le muestra. Con el default
     invertido, el día que se publique todos los que hoy reportan dejan de ver sus tests."
     Con el índice vacío —que es como llega hasta que alguien marque algo— nadie es ausente. */
  const ced = 'V-12345678';
  PRUEBAS.falso(y5Con(null, () => ausenteEse(ced, '2026-09-01')), 'sin índice, nadie está ausente');
  PRUEBAS.falso(y5Con({}, () => ausenteEse(ced, '2026-09-01')), 'con índice vacío, tampoco');
  PRUEBAS.falso(y5Con({}, () => ausenteHoy({ cedula: ced })), 'ni preguntando por hoy');
});

PRUEBAS.caso('⚠️ y el caso DISCRIMINA: con la ausencia cargada, sí la reconoce', () => {
  /* Sin esto, el caso de arriba pasaría igual si `ausenteEse` devolviera false siempre — o sea si
     toda la función fuera decorativa. */
  const idx = { '12345678|2026-09-01': 'vacaciones' };
  PRUEBAS.cierto(y5Con(idx, () => ausenteEse('V-12.345.678', '2026-09-01')),
    '⚠️ la cédula se compara sólo por sus dígitos: "V-12.345.678" y "12345678" son la misma persona');
  PRUEBAS.falso(y5Con(idx, () => ausenteEse('V-12345678', '2026-09-02')),
    'pero al día siguiente ya no: la ausencia es de un día concreto');
  PRUEBAS.falso(y5Con(idx, () => ausenteEse('V-99999999', '2026-09-01')),
    'y es de esa persona, no de cualquiera');
});

PRUEBAS.caso('⚠️ una ausencia NO le esconde la app a nadie', () => {
  /* El riesgo que el plan marca como el más alto. Alguien de franco puede querer registrar igual, y
     esconderle la app porque una planilla dice que hoy no trabaja sería el error caro.
     Lo único que cambia una ausencia es cómo se CUENTA a esa persona en los porcentajes. */
  const fuente = [...document.querySelectorAll('script')].map(x => x.textContent).join('\n');
  /* `ausenteEse`/`ausenteHoy` sólo pueden usarse en el cálculo del panel. Si aparecieran en el
     camino del empleado (renderInicio, las tarjetas, los tests), estarían filtrando su app. */
  ['renderInicio', 'iniTieneCiclo', 'aptPersona'].forEach(fn => {
    const i = fuente.indexOf('function ' + fn + '(');
    if (i < 0) return;
    const cuerpo = fuente.slice(i, i + 2500);
    PRUEBAS.falso(/ausente(Ese|Hoy)\s*\(/.test(cuerpo),
      '⚠️ `' + fn + '` no puede consultar ausencias: eso sería esconderle la app a quien está de franco');
  });
});

PRUEBAS.caso('⚠️ a quien no le tocaba sale del DENOMINADOR, no de la lista', () => {
  /* Sacarlos en silencio inflaría la cobertura sin que nadie pueda revisarlo, y una ausencia mal
     cargada se volvería invisible: nadie la corregiría nunca. Por eso se dice el número. */
  const fuente = String(renderHseqIdc);
  PRUEBAS.cierto(/const ausentes = /.test(fuente), 'los ausentes se identifican aparte');
  PRUEBAS.cierto(/hs_no_tocaba/.test(fuente), '⚠️ y se informa cuántos son, siempre');
  PRUEBAS.cierto(/cuentan\.length/.test(fuente), 'y el denominador pasa a ser quienes sí contaban');
  PRUEBAS.falso(/conDato\.length \/ gente\.length/.test(fuente),
    'ya no se divide por el total de la nómina');
});

PRUEBAS.caso('⚠️ el reparto por estado cuadra con el denominador de la cobertura', () => {
  /* Si el reparto se calculara sobre toda la nómina y la cobertura sobre los que cuentan, la suma
     de la tabla no daría con el número de arriba y el panel se contradiría solo — la clase de
     inconsistencia que hace que alguien deje de creerle a la pantalla entera. */
  const fuente = String(renderHseqIdc);
  PRUEBAS.falso(/gente\.forEach\(p => \{ porEstado/.test(fuente),
    '⚠️ el reparto no puede ir sobre `gente` si la cobertura va sobre `cuentan`');
  PRUEBAS.cierto(/cuentan\.forEach\(p => \{ porEstado/.test(fuente), 'tiene que ir sobre `cuentan`');
});

PRUEBAS.caso('los textos del bloque están en los dos idiomas (R14, R1)', () => {
  ['hs_no_tocaba'].forEach(k => { const v = t(k); PRUEBAS.cierto(!!v && v !== k, 'falta ' + k); });
  PRUEBAS.falso(/\b(estás|tenés|podés)\b/i.test(t('hs_no_tocaba')), 'español neutro (R1)');
});

PRUEBAS.grupo('Y5 · el servidor');

function y5Env(ausencias){
  const env = GS.crearEntorno({
    'Ausencias': [['IdAusencia','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado','Marcada','MarcadaPor','Anulada','AnuladaPor']]
                 .concat(ausencias || []),
    'Accesos': [['Usuario','Pass','Rol','Empresas','PassMed','PassHseq'],
                ['Helitec','clave-sup','supervisor','Helitec','','']],
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo'],['Helitec','Ana Suárez','V-111','Op','Piloto']],
  });
  const api = GS.cargarGs(CTX.gs, env, ['ausenciasDe','accionAusenciaGuardar','accionAusencias','ausMotivoValido']);
  api.filas = n => { const h = env.__libro.getSheetByName(n); return h ? h._datos : null; };
  return api;
}
const y5r = resp => JSON.parse(resp.getContent());

PRUEBAS.caso('⚠️ un rango de varios días cubre TODOS los días del medio', () => {
  /* Vacaciones del 1 al 5 tienen que cubrir el 3. Si sólo se guardara el rango sin expandirlo, cada
     consulta por un día suelto tendría que recorrerlo — y el 3 quedaría contando como "no reportó". */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y5Env([['a1','Helitec','V-111','Ana Suárez','2026-09-01','2026-09-05','vacaciones','vigente','','','','']]);
  const idx = api.ausenciasDe('Helitec', '2026-08-25', '2026-09-10');
  ['2026-09-01','2026-09-03','2026-09-05'].forEach(d =>
    PRUEBAS.cierto(!!idx['111|' + d], '⚠️ el ' + d + ' tiene que estar cubierto'));
  PRUEBAS.falso(!!idx['111|2026-09-06'], 'y el día después del rango, no');
  PRUEBAS.falso(!!idx['111|2026-08-31'], 'ni el anterior');
});

PRUEBAS.caso('⚠️ una ausencia ANULADA deja de contar (R3: no se borra, se anula)', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y5Env([['a1','Helitec','V-111','Ana Suárez','2026-09-01','2026-09-01','franco','anulada','','','2026-09-02','sup']]);
  PRUEBAS.falso(!!api.ausenciasDe('Helitec','2026-09-01','2026-09-01')['111|2026-09-01'],
    '⚠️ una anulada no puede seguir sacando a esa persona de la cobertura');
  const filas = api.filas('Ausencias');
  PRUEBAS.igual(filas.length, 2, 'y la fila SIGUE ahí: se anula, no se borra (R3)');
});

PRUEBAS.caso('⚠️ R2 · un motivo CLÍNICO se rechaza del lado del servidor', () => {
  /* Un supervisor puede marcar franco o vacaciones. NO puede marcar "reposo médico": eso es un dato
     de salud, y registrarlo acá lo pondría en una hoja que ve operaciones. Se valida en el servidor
     porque el cliente es público y cualquier validación de allá se puede saltear. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y5Env([]);
  ['reposo medico','licencia medica','enfermedad','psiquiatrico'].forEach(m =>
    PRUEBAS.igual(api.ausMotivoValido(m), '', '⚠️ "' + m + '" no puede aceptarse: es dato de salud (R2)'));
  PRUEBAS.igual(api.ausMotivoValido('franco'), 'franco', 'los operativos sí');
  PRUEBAS.igual(api.ausMotivoValido('VACACIONES'), 'vacaciones', 'sin importar mayúsculas');

  const r = y5r(api.accionAusenciaGuardar({ usuario:'Helitec', pass:'clave-sup', dispositivoId:'d',
    id:'x1', cedula:'V-111', desde:'2026-09-01', motivo:'reposo medico' }));
  PRUEBAS.falso(r.ok, '⚠️ y la acción entera lo rechaza');
  PRUEBAS.igual(r.motivo, 'motivo_invalido', 'diciendo por qué');
});

PRUEBAS.caso('⚠️ marcar una ausencia EXIGE contraseña', () => {
  /* Cambia los números que se miran sobre una persona: no puede hacerlo cualquiera con la URL. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y5Env([]);
  const sin = y5r(api.accionAusenciaGuardar({ empresa:'Helitec', id:'x1', cedula:'V-111',
    desde:'2026-09-01', motivo:'franco' }));
  PRUEBAS.falso(sin.ok, '⚠️ sin contraseña no se marca nada');
  const con = y5r(api.accionAusenciaGuardar({ usuario:'Helitec', pass:'clave-sup', dispositivoId:'d',
    id:'x1', cedula:'V-111', persona:'Ana Suárez', desde:'2026-09-01', motivo:'franco' }));
  PRUEBAS.cierto(con.ok, 'con contraseña sí');
});

PRUEBAS.caso('⚠️ un rango absurdo no cuelga el script', () => {
  /* Una fecha reinterpretada por Sheets, o un tipeo, puede dar un rango de años. Expandirlo día por
     día agotaría el tiempo de ejecución y tumbaría el panel entero para esa empresa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y5Env([['a1','Helitec','V-111','Ana','1990-01-01','2090-01-01','franco','vigente','','','','']]);
  const t0 = Date.now();
  const idx = api.ausenciasDe('Helitec', '2026-09-01', '2026-09-05');
  PRUEBAS.comoMucho(Date.now() - t0, 3000, '⚠️ tiene que cortar por el tope, no recorrer 100 años');
  PRUEBAS.comoMucho(Object.keys(idx).length, 401, 'y no devolver decenas de miles de claves');
});

PRUEBAS.caso('⚠️ no se anula la ausencia de otra empresa', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = y5Env([['a1','Cardón','V-999','Otra','2026-09-01','2026-09-01','franco','vigente','','','','']]);
  const r = y5r(api.accionAusenciaGuardar({ usuario:'Helitec', pass:'clave-sup', dispositivoId:'d',
    id:'a1', cedula:'V-999', anular:'1' }));
  PRUEBAS.falso(r.anulada, '⚠️ Helitec no puede anular una ausencia de Cardón');
  PRUEBAS.igual(String(api.filas('Ausencias')[1][7]), 'vigente', 'y la fila queda intacta');
});

PRUEBAS.grupo('Y5b · el interruptor en la nómina');

function y5bPintar(idx, gente){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  const prevDatos = NOMLIST.datos, prevTotal = NOMLIST.total, prevCarg = NOMLIST.cargando;
  const ov = document.getElementById('nominaListOv');
  const tenia = ov && ov.classList.contains('show');
  DASH = { vista:'supervisor', params:{usuario:'Helitec',empresa:'Helitec',pass:'x'}, ausencias: idx, f:{} };
  NOMLIST.datos = gente; NOMLIST.total = gente.length; NOMLIST.registrados = gente.length; NOMLIST.cargando = false;
  if (ov) ov.classList.add('show');
  nominaListFiltrar();
  return { restaurar(){ DASH = prev; NOMLIST.datos = prevDatos; NOMLIST.total = prevTotal;
             NOMLIST.cargando = prevCarg; if (ov && !tenia) ov.classList.remove('show'); } };
}
const Y5B_GENTE = [
  { persona:'Ana Suárez',  cedula:'V-111', departamento:'Op', cargo:'Piloto', registrado:true },
  { persona:"Beto O'Hara", cedula:'V-222', departamento:'Op', cargo:'Piloto', registrado:true }
];

PRUEBAS.caso('⚠️ el interruptor está en la lista que el supervisor ya usa', () => {
  /* Una pantalla aparte para un dato que se toca dos veces por semana no se abre nunca — y un dato
     que nadie carga es PEOR que no tenerlo: los porcentajes quedan iguales pero uno cree que están
     corregidos. */
  const idx = {}; idx['111|' + todayStr()] = 'franco';
  const h = y5bPintar(idx, Y5B_GENTE);
  try {
    const btns = [...document.querySelectorAll('.nomlist-aus')];
    PRUEBAS.igual(btns.length, 2, 'una por persona con cédula');
    PRUEBAS.cierto(btns[0].classList.contains('on'), '⚠️ la que está ausente hoy se ve distinta');
    PRUEBAS.falso(btns[1].classList.contains('on'), 'y la que no, no');
    PRUEBAS.igual(document.querySelectorAll('.nomlist-row.nomlist-ausente').length, 1,
      'y su fila entera queda marcada');
  } finally { h.restaurar(); }
});

PRUEBAS.caso('⚠️ un apóstrofo en el nombre no rompe la fila', () => {
  /* Ya pasó en este archivo: un nombre con comilla dentro de un `onclick` partía el HTML y dejaba
     basura en pantalla. Por eso la cédula y el nombre van por `data-`, no interpolados en el
     manejador. */
  const h = y5bPintar({}, Y5B_GENTE);
  try {
    const btns = [...document.querySelectorAll('.nomlist-aus')];
    PRUEBAS.igual(btns.length, 2, "⚠️ la fila de \"Beto O'Hara\" tiene que existir igual");
    PRUEBAS.cierto((btns[1].getAttribute('data-per') || '').indexOf("O'Hara") >= 0,
      'con su nombre entero en el atributo');
    btns.forEach(b => PRUEBAS.igual(b.getAttribute('onclick'), 'ausTocar(this)',
      '⚠️ y NADA interpolado dentro del onclick'));
  } finally { h.restaurar(); }
});

PRUEBAS.caso('⚠️ se toca con guantes: 44 px de alto', () => {
  const h = y5bPintar({}, Y5B_GENTE);
  try {
    [...document.querySelectorAll('.nomlist-aus')].forEach(b =>
      PRUEBAS.alMenos(Math.round(b.getBoundingClientRect().height), 44,
        'el mínimo para un dedo, y acá se usa en una pista con guantes'));
  } finally { h.restaurar(); }
});

PRUEBAS.caso('⚠️ si el guardado FALLA, la pantalla se revierte', () => {
  /* Se pinta antes de que conteste el servidor porque el supervisor marca a varios seguidos y
     esperar 3 s por cada uno lo haría abandonar. Pero si falla y el cambio quedara pintado, él
     creería que la ausencia está cargada y esa persona seguiría contando en el CH. */
  const prevFetch = window.fetchConReloj, prevOff = window.offHayConexion;
  const h = y5bPintar({}, Y5B_GENTE);
  try {
    window.offHayConexion = () => true;
    window.fetchConReloj = () => Promise.resolve({ json: () => Promise.resolve({ ok:false, error:'boom' }) });
    document.querySelector('.nomlist-aus').click();
    PRUEBAS.cierto(!!DASH.ausencias['111|' + todayStr()], 'se pinta al instante, sin esperar al servidor');
    return new Promise(res => setTimeout(() => {
      PRUEBAS.falso(!!DASH.ausencias['111|' + todayStr()],
        '⚠️ y al fallar se DESHACE: si quedara, el supervisor creería que está cargada y no lo está');
      window.fetchConReloj = prevFetch; window.offHayConexion = prevOff; h.restaurar(); res();
    }, 80));
  } catch(e){ window.fetchConReloj = prevFetch; window.offHayConexion = prevOff; h.restaurar(); throw e; }
});

PRUEBAS.caso('⚠️ sin conexión no se cambia nada ni se promete nada', () => {
  const prevOff = window.offHayConexion, prevFetch = window.fetchConReloj;
  const h = y5bPintar({}, Y5B_GENTE);
  let pidio = false;
  try {
    window.offHayConexion = () => false;
    window.fetchConReloj = () => { pidio = true; return Promise.resolve({ json:()=>Promise.resolve({ok:true}) }); };
    document.querySelector('.nomlist-aus').click();
    PRUEBAS.falso(pidio, 'no se intenta mandar');
    PRUEBAS.falso(!!DASH.ausencias['111|' + todayStr()],
      '⚠️ y no queda pintado como si se hubiera guardado');
  } finally { window.offHayConexion = prevOff; window.fetchConReloj = prevFetch; h.restaurar(); }
});

PRUEBAS.caso('⚠️ repintar la lista usa la función que pinta FILAS', () => {
  /* Lo encontré verificando en el navegador: `ausTocar` llamaba a `nominaListPintarDeptos`, que sólo
     rehace el desplegable de departamentos. El dato cambiaba y la fila se quedaba igual — el
     supervisor tocaba el botón y no pasaba nada visible. */
  PRUEBAS.falso(/nominaListPintarDeptos\(\)/.test(String(ausTocar)),
    '⚠️ PintarDeptos NO repinta las filas: sólo el desplegable de departamentos');
  PRUEBAS.cierto(/nominaListFiltrar\(\)/.test(String(ausTocar)), 'tiene que ser Filtrar');
});

PRUEBAS.caso('los textos del interruptor están en los dos idiomas (R14)', () => {
  ['aus_marcar','aus_marcar_corto','aus_quitar','aus_no_guardia','aus_puesta','aus_quitada',
   'aus_sin_red','aus_error'].forEach(k => {
    const v = t(k); PRUEBAS.cierto(!!v && v !== k, 'falta ' + k);
  });
});
