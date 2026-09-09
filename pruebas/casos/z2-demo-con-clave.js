PRUEBAS.grupo('Z2 · la demostración con clave, y quién no tiene que escribirla');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El 2026-09-09 se cargó `demo_pass` en `Config Empresa` (fila con Empresa VACÍA, o sea general)
   para que la demostración pública deje de estar abierta. En el mismo movimiento se rompió, en
   silencio, la simulación de rol del administrador: `simEntrar()` pide `action=demo` para armar la
   pantalla de ejemplo, se encontró con la clave, y quedó en un aviso genérico. Nadie de adentro
   tiene por qué enterarse de una clave que existe para los de afuera.

   La regla, entonces: la clave de la demostración es para quien NO tiene acceso. Quien ya trae una
   sesión que `validarAcceso` reconoce —el administrador, un supervisor, el servicio médico— entra
   sin escribirla. Y quien no trae nada sigue teniendo que escribirla: eso es lo que este archivo
   comprueba en los dos sentidos, porque un arreglo que abriera la demo para cualquiera cumpliría
   la primera mitad y sería el defecto opuesto.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const Z2_CAB = ['Usuario (puede ser el que quieras)',
                  'Contraseña (puede ser la que quieras)',
                  'Rol (supervisor ve solo su empresa, admin ve todas)',
                  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
                  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)',
                  'Contraseña HSQ'];

function z2Env(fns, o){
  o = o || {};
  const config = [['Empresa','Clave','Valor']];
  /* La fila general lleva la columna Empresa VACÍA: así está en el CH y así la lee
     `leerConfigEmpresa("")`. Si el caso la escribiera con una empresa, probaría otra cosa. */
  if (o.conClave !== false) config.push(['', 'demo_pass', 'la-clave-de-afuera']);
  const env = GS.crearEntorno({
    'Accesos': [Z2_CAB.slice(),
                ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','clave-med','clave-hseq']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Empresa Demo','Ana Suárez','12345678','Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Config Empresa': config,
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
const z2Json = r => JSON.parse(r && r.getContent ? r.getContent() : r);

PRUEBAS.caso('🔴 sin credenciales, la demostración PIDE la clave', () => {
  /* La guarda de medibilidad de todo el archivo: si esto no diera `demo_pass`, los casos de abajo
     pasarían por la razón equivocada — la demo estaría abierta y nadie tendría que escribir nada. */
  const api = z2Env(['accionDemo','validarAcceso']);
  const r = z2Json(api.accionDemo({ dispositivoId:'d-afuera' }));
  PRUEBAS.igual(r.ok, false, 'no abre');
  PRUEBAS.igual(r.motivo, 'demo_pass', '⚠️ y dice POR QUÉ, para que el cliente sepa mostrar el campo');
});

PRUEBAS.caso('🔴 con una clave equivocada tampoco entra', () => {
  const api = z2Env(['accionDemo','validarAcceso']);
  const r = z2Json(api.accionDemo({ pass:'probando', dispositivoId:'d-afuera-2' }));
  PRUEBAS.igual(r.ok, false, 'no abre');
  PRUEBAS.igual(r.motivo, 'demo_pass_mal', 'y se distingue de «falta la clave», que no es un error de nadie');
});

PRUEBAS.caso('⚠️ con la clave correcta SÍ entra · el discriminador de los dos de arriba', () => {
  const api = z2Env(['accionDemo','validarAcceso']);
  const r = z2Json(api.accionDemo({ pass:'la-clave-de-afuera', dispositivoId:'d-afuera-3' }));
  PRUEBAS.falso(r.motivo === 'demo_pass' || r.motivo === 'demo_pass_mal',
    '⚠️ la clave correcta no puede quedar frenada por la guarda — sin esto, «no abre» daría verde ' +
    'aunque la demostración estuviera rota para todos');
});

PRUEBAS.caso('🔴 QUIEN YA TIENE SESIÓN NO ESCRIBE LA CLAVE DE LOS DE AFUERA', () => {
  /* EL DEFECTO QUE ESTE CASO EXISTE PARA QUE NO VUELVA: Ajustes → Administrador → ver como…
     dejó de abrir el día que se cargó la clave, con un «No se pudo abrir la simulación» que no
     dice nada. La credencial viaja en el MISMO campo `pass` que la clave de la demostración, así
     que el orden importa — primero se prueba como sesión, y sólo si no lo es sigue el camino
     público. */
  const api = z2Env(['accionDemo','validarAcceso']);
  const acc = api.validarAcceso('helitec', 'clave-sup', 'd-adentro');
  PRUEBAS.cierto(!!acc, 'guarda: la credencial que usa el caso tiene que ser válida de verdad');
  const r = z2Json(api.accionDemo({ usuario:'helitec', pass:'clave-sup', dispositivoId:'d-adentro' }));
  PRUEBAS.falso(r.motivo === 'demo_pass',
    '🔴 a quien ya entró no se le puede pedir la clave que existe para los de afuera');
  PRUEBAS.falso(r.motivo === 'demo_pass_mal',
    '⚠️ ni tratarle la contraseña de su empresa como una clave de demostración equivocada — eso ' +
    'además le gastaría los intentos del freno de fuerza bruta');
});

PRUEBAS.caso('🔒 pero una sesión INVENTADA no abre nada', () => {
  /* El otro sentido. Si «traer usuario» alcanzara para saltarse la clave, cualquiera escribiría
     un usuario cualquiera y la demostración volvería a estar abierta. */
  const api = z2Env(['accionDemo','validarAcceso']);
  const r = z2Json(api.accionDemo({ usuario:'helitec', pass:'no-es-la-suya', dispositivoId:'d-falso' }));
  PRUEBAS.igual(r.ok, false, 'no abre');
  PRUEBAS.igual(r.motivo, 'demo_pass_mal',
    '🔒 una credencial que no valida cae al camino público, donde tampoco coincide con la clave');
});

PRUEBAS.caso('⚠️ sin `demo_pass` cargada, la demostración sigue abierta para todos', () => {
  /* La compatibilidad hacia atrás: la guarda entera vive dentro de `if (claveDemo)`. Si alguien
     borra la fila del CH, la demostración vuelve a estar abierta sin tocar una línea de código. */
  const api = z2Env(['accionDemo','validarAcceso'], { conClave:false });
  const r = z2Json(api.accionDemo({ dispositivoId:'d-sin-clave' }));
  PRUEBAS.falso(r.motivo === 'demo_pass' || r.motivo === 'demo_pass_mal',
    'sin clave en `Config Empresa` no se pide ninguna');
});

PRUEBAS.caso('⚠️ `simEntrar` manda la credencial · A15, por sexta vez', () => {
  /* R17 · se mira el CÓDIGO REAL, porque lo que este caso vigila es justamente que nadie vuelva a
     armar los params a mano. `dashAuth()` es lo que agrega `usuario`, `pass` y `dispositivoId`;
     escribir `{action:'demo'}` a pulso es lo que dejó la simulación sin credencial. */
  const js = [...document.querySelectorAll('script')].map(s => s.textContent).join('');
  const i = js.indexOf('function simEntrar');
  const cuerpo = i >= 0 ? js.slice(i, i + 2600) : '';
  PRUEBAS.cierto(cuerpo.length > 0, 'tiene que encontrarse la función');
  PRUEBAS.cierto(/dashAuth\(\s*\{\s*action\s*:\s*'demo'/.test(cuerpo),
    '⚠️ los params tienen que salir de `dashAuth()`, que es quien sabe poner el token y el dispositivo');
  PRUEBAS.falso(/dashRequest\(\s*\{\s*action\s*:\s*'demo'\s*\}\s*\)/.test(cuerpo),
    '⚠️ y no puede quedar ningún `dashRequest({action:\'demo\'})` escrito a mano');
  PRUEBAS.cierto(/demo_pass/.test(cuerpo),
    'y si aun así el servidor pidiera la clave, hay que decir QUÉ pasó y no un aviso genérico');
});

PRUEBAS.caso('⚠️ Z2 · cada panel de la demostración dice QUÉ HACE, y el inicio es otra pantalla', () => {
  /* Pedido de Franco: "en cada panel de ver demostración, pone una descripción de que hace ese
     panel, aclarando que es la parte estadística y de accionar, que por otro lado también hay un
     panel de inicio con otras cosas".
     Se entra por `demoDescBloque()`, que es lo que llama `renderDash()` de verdad — no se arma el
     HTML a mano (R17). El discriminador está en el último caso del archivo. */
  const antes = (typeof DASH !== 'undefined') ? DASH : undefined;
  try {
    const vistas = ['empleado','supervisor','medico','hseq'];
    const html = vistas.map(v => { DASH = { demoMode:true, vista:v }; return demoDescBloque(); });
    html.forEach((h, i) => {
      PRUEBAS.cierto(h.indexOf('demo-desc') >= 0, 'la vista ' + vistas[i] + ' tiene su bloque');
      PRUEBAS.cierto(h.indexOf('dd-n') >= 0,
        '⚠️ y la aclaración del panel de inicio, que va en las CUATRO — es lo que evita que alguien ' +
        'confunda el panel con la app entera');
    });
    PRUEBAS.igual(new Set(html).size, 4,
      '⚠️ cuatro descripciones DISTINTAS: si dos vistas dijeran lo mismo, el bloque no informaría nada');
    DASH = { demoMode:false, vista:'hseq' };
    PRUEBAS.igual(demoDescBloque(), '',
      '⚠️ y fuera de la demostración no va: a quien trabaja de verdad no se le explica dónde está parado');
  } finally { DASH = antes; }
});

PRUEBAS.caso('⚠️ Z2 · el gate y el panel leen LA MISMA descripción', () => {
  /* Dos juegos de textos que dicen lo mismo es el defecto que este proyecto viene persiguiendo:
     se corrige uno, el otro queda viejo, y nadie los compara. El puente entre las dos formas de
     nombrar las vistas es `demoDescClave()`, y está en un solo lugar. */
  PRUEBAS.igual(demoDescClave('emp'), demoDescClave('empleado'), 'la pestaña «emp» y la vista «empleado»');
  PRUEBAS.igual(demoDescClave('sup'), demoDescClave('supervisor'), 'la pestaña «sup» y la vista «supervisor»');
  PRUEBAS.igual(demoDescClave('med'), demoDescClave('medico'), 'la pestaña «med» y la vista «medico»');
  PRUEBAS.igual(demoDescClave('hseq'), demoDescClave('hseq'), 'y hseq, que se llama igual de los dos lados');
  PRUEBAS.igual(new Set(['emp','sup','med','hseq'].map(demoDescClave)).size, 4,
    '⚠️ y las cuatro resuelven a claves distintas · sin esto, todas podrían caer en el respaldo');
  ['emp','sup','med','hseq','inicio'].forEach(k => {
    const es = t('pg_desc_' + k);
    PRUEBAS.cierto(es && es.indexOf('pg_desc_') < 0, 'pg_desc_' + k + ' tiene texto en español');
  });
});

PRUEBAS.caso('⚠️ Z2 · los textos de la demostración están en los dos idiomas (R14)', () => {
  /* Se guarda y repone el idioma REAL del navegador, igual que P040: `idiomaActual()` lo lee de
     `localStorage`, así que cambiarlo con `fijarIdioma` es el camino de verdad. */
  const antes = localStorage.getItem(K_LANG);
  try {
    const faltan = [];
    ['es','en'].forEach(l => {
      localStorage.setItem(K_LANG, l);
      ['pg_desc_emp','pg_desc_sup','pg_desc_med','pg_desc_hseq','pg_desc_inicio',
       'pg_ver_ejemplo','pg_demo_para','ts_sim_demo_pass'].forEach(k => {
        const v = t(k, { rol:'x' });
        if (!v || v === k) faltan.push(l + '/' + k);
      });
    });
    PRUEBAS.igual(faltan, [], '⚠️ toda cadena nueva pasa por t() y existe en los dos idiomas — ' + faltan.join(' · '));
  } finally {
    if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes);
  }
});
