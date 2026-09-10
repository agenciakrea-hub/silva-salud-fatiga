PRUEBAS.grupo('P165 · una fila nueva de Registrados sólo entra por la Nómina');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El 2026-09-10 se recorrieron contra producción las dos salidas del alta para quien NO está en
   la nómina. «Mi empresa no me dio código» resultó correcta: un texto, sin red, sin alta. Pero
   «No estoy en la lista» → `nominaManual()` → formulario con los nueve campos vacíos, la persona
   escribía la empresa que quisiera y `accionRegistro` lo guardaba: quedó registrada «Persona
   Ajena Prueba» en «Empresa Inventada SA». Y como esa acción no exige código ni contraseña, un
   POST desde afuera hacía lo mismo — la UI «cerrada» por P133 no cerraba nada del lado servidor.

   Decisión de Franco: la nómina manda, en el servidor (ADR 003, «todo por nómina cargada»).
   · Una fila NUEVA de `Registrados Fatiga` sólo entra si la cédula está en la Nómina, y con la
     empresa DE LA NÓMINA, no la del POST.
   · Quien ya está registrado sigue actualizándose igual: 39 filas de 16 personas de varias
     empresas sin nómina no pueden empezar a fallar.
   · «No estoy en la lista» deja de mostrarse. El código se conserva inactivo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P165_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];
function p165Reg(nombre, ced, empresa){
  const f = new Array(P165_CAB_REG.length).fill('');
  f[2] = nombre; f[4] = ced; f[8] = empresa; f[3] = 'x@x.com';
  return f;
}
function p165Env(o){
  o = o || {};
  const reg = [P165_CAB_REG.slice()];
  if (o.yaRegistrada) reg.push(p165Reg('Vieja Sin Nomina', '55555555', 'Aeropostal'));
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec'], ['demo','c2','supervisor','Empresa Demo']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Helitec','Ana Suárez','11111111','Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Registrados Fatiga': reg,
    'Config Empresa': [['Empresa','Clave','Valor']]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionRegistro','registroEnNomina_']);
  api.__env = env;
  return api;
}
const p165Filas = api => api.__env.__libro.getSheetByName('Registrados Fatiga').getDataRange().getValues();
const p165r = r => JSON.parse(r.getContent());

PRUEBAS.caso('🔴 una cédula que NO está en la nómina no se registra', () => {
  /* Es el POST que hizo el alta libre, y el mismo que se puede hacer desde afuera. */
  const api = p165Env();
  const r = p165r(api.accionRegistro({ nombre:'Persona Ajena', cedula:'99999998', empresa:'Empresa Inventada SA',
                                      email:'a@b.c', dispositivoId:'d1' }));
  PRUEBAS.igual(r.ok, false, '🔴 no entra');
  PRUEBAS.igual(r.motivo, 'no_en_nomina', 'y dice POR QUÉ, para que el cliente lo distinga de un error de red');
  PRUEBAS.igual(p165Filas(api).length, 1, '🔴 y la hoja sigue con sólo el encabezado · nada se escribió');
});

PRUEBAS.caso('⚠️ DISCRIMINADOR · la que SÍ está en la nómina entra, y con la empresa de la nómina', () => {
  /* Sin esto, lo de arriba pasaría por la razón equivocada: si `registro` rechazara a todos, nadie
     nuevo podría entrar nunca. Y la empresa: viene «Helitec» del POST y sale «Consorcio HELITEC»,
     la canónica, porque la manda la nómina y no lo que la persona escribió. */
  const api = p165Env();
  const r = p165r(api.accionRegistro({ nombre:'Ana Suárez', cedula:'11111111', empresa:'Helitec',
                                      email:'a@b.c', dispositivoId:'d1' }));
  PRUEBAS.cierto(r.ok && r.nuevo, 'entra como fila nueva · ' + JSON.stringify(r));
  const v = p165Filas(api); const cab = v[0].map(String); const fila = v[1];
  PRUEBAS.igual(String(fila[cab.indexOf('Empresa')]), 'Consorcio HELITEC',
    '⚠️ la empresa es la CANÓNICA de la nómina, no el texto del POST');
  PRUEBAS.igual(String(fila[cab.indexOf('Cédula')]), '11111111', 'con su cédula');
});

PRUEBAS.caso('🔴 la cédula está, pero en OTRA empresa: tampoco entra', () => {
  /* Escribir la empresa de al lado con una cédula real de la propia es la forma de colarse en el
     panel de otro cliente. La nómina se consulta con la empresa que vino: si no coincide, no hay
     fila. */
  const api = p165Env();
  const r = p165r(api.accionRegistro({ nombre:'Ana Suárez', cedula:'11111111', empresa:'Empresa Demo',
                                      email:'a@b.c', dispositivoId:'d1' }));
  PRUEBAS.igual(r.ok, false, '🔴 Ana está en Helitec, no en Empresa Demo');
  PRUEBAS.igual(r.motivo, 'no_en_nomina', 'mismo motivo');
});

PRUEBAS.caso('⚠️ quien YA está registrado sigue actualizándose, aunque su empresa no tenga nómina', () => {
  /* Las 39 filas reales son de 16 personas de varias empresas, y casi ninguna tiene nómina
     cargada. La guarda es para quien ENTRA; el backfill del perfil de quien ya está no puede
     empezar a fallar por esto. */
  const api = p165Env({ yaRegistrada: true });
  const antes = p165Filas(api).length;
  const r = p165r(api.accionRegistro({ nombre:'Vieja Sin Nomina', cedula:'55555555', empresa:'Aeropostal',
                                      email:'v@x.com', telefono:'0412111', dispositivoId:'d1' }));
  PRUEBAS.cierto(r.ok && r.actualizado, '⚠️ se actualiza · ' + JSON.stringify(r));
  const v = p165Filas(api); const cab = v[0].map(String);
  PRUEBAS.igual(v.length, antes, 'sin fila nueva');
  PRUEBAS.igual(String(v[1][cab.indexOf('Teléfono')]), '0412111', 'y el dato nuevo llegó a su fila');
});

PRUEBAS.caso('🔒 sin cédula no hay fila nueva · Z0b sigue valiendo', () => {
  const api = p165Env();
  const r = p165r(api.accionRegistro({ nombre:'Alguien', empresa:'Helitec', email:'a@b.c', dispositivoId:'d1' }));
  PRUEBAS.igual(r.ok, false, '🔒 sin cédula no se puede buscar en la nómina, así que no entra');
});

PRUEBAS.caso('⚠️ «No estoy en la lista» ya no se muestra en ningún paso', () => {
  /* Se entra por `nominaPiePintar()`, que es quien decide el pie de verdad, con el estado exacto
     que antes lo mostraba: paso cédula y el servidor diciendo que no figura. */
  const antesFig = NOM.noFigura, antesPaso = NOM.paso;
  const vis = id => { const e = document.getElementById(id); return !!e && e.style.display !== 'none'; };
  try {
    NOM.noFigura = true;
    ['cedsola','persona','empresa','codigo','confirmar'].forEach(p => {
      nominaPiePintar(p);
      PRUEBAS.falso(vis('nomNoEstoy'), '⚠️ en el paso «' + p + '», con noFigura=true, no aparece');
    });
    nominaPiePintar('cedsola');
    PRUEBAS.cierto(vis('nomYaReg'), 'y «Ya me había registrado» sigue: es la salida de quien reinstaló');
  } finally { NOM.noFigura = antesFig; nominaPiePintar(antesPaso); }
});

PRUEBAS.caso('⚠️ y si el servidor rechaza el registro por nómina, la persona se entera', () => {
  /* Antes el rechazo era mudo: se reintentaba en cada apertura y ella usaba la app creyendo que
     estaba registrada. R17 · sobre la fuente de `sincronizarRegistro`. */
  const src = String(sincronizarRegistro);
  PRUEBAS.cierto(/no_en_nomina/.test(src), 'mira el motivo');
  PRUEBAS.cierto(/reg_no_en_nomina/.test(src), 'y avisa con su texto');
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l);
      PRUEBAS.cierto(t('reg_no_en_nomina') !== 'reg_no_en_nomina', 'el texto existe en ' + l + ' (R14)'); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
});
