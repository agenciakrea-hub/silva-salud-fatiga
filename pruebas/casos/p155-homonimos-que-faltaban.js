PRUEBAS.grupo('P155 · los homónimos que quedaban');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   P152 cerró el cruce de homónimos en `Identidades`. Quedaban tres con la misma forma —un dato
   cruzado por NOMBRE SOLO, con la empresa disponible y sin usar— y los tres duelen distinto:

   1 · `Confiabilidad` PERDÍA DATOS. El id lo arma el cliente como `conf_<nombre>_<fecha>_<test>`:
       sin cédula y sin empresa. Dos homónimos de empresas distintas que contesten el mismo test el
       mismo día generan el MISMO IdRegistro, y el upsert pisaba la fila del primero — su score, sus
       señales y su marca de Confiable reemplazados por los del otro.
   2 · `marcarConfiabilidad` SUPRIMÍA CASOS. Cruzaba por persona + fecha, ignorando la columna
       Empresa que el escritor sí guarda. Si a uno le quedaba `Confiable = false`, los registros del
       homónimo de otra empresa se marcaban `confiable:false` — y `casoDePersona` corta con
       `if (regs[0].confiable === false) return null`: al segundo no se le abría el caso de
       telemedicina aunque estuviera en rojo.
   3 · `Casos Odoo` CRUZABA DATOS PERSONALES. El teléfono y el correo salían de un mapa indexado por
       nombre donde «gana la última fila»: el ticket se abría con el contacto de otra persona, de
       otro cliente.

   ⚠️ EL RESPALDO SIN EMPRESA ES DEUDA CON VENCIMIENTO, no una regla, y por eso está probado: las
   filas viejas no tienen la columna cargada y descartarlas perdería marcas ya puestas.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P155_CAB_CONF = ['Fecha','IdRegistro','Test','Persona','Empresa','Departamento','Score',
                       'Confiable','Senales','Creada','Origen'];
const P155_CAB_REG = ['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
  'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
  'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA'];

function p155Reg(nombre, empresa, tel, mail){
  const f = new Array(P155_CAB_REG.length).fill('');
  f[2] = nombre; f[3] = mail; f[8] = empresa; f[10] = 'Piloto'; f[13] = tel;
  return f;
}
function p155Env(fns, o){
  o = o || {};
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec','',''],
                ['cardon','c2','supervisor','Cardón','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Registrados Fatiga': [P155_CAB_REG.slice(),
      p155Reg('José Rodríguez','Consorcio HELITEC','0412-1111111','jose.helitec@x.com'),
      p155Reg('José Rodríguez','Cardón',           '0424-2222222','jose.cardon@x.com')],
    'Confiabilidad': [P155_CAB_CONF.slice()].concat(o.conf || []),
    'Casos Odoo': [['Fecha','Persona','Empresa','Departamento','Cargo','Telefono','Correo',
                    'NivelRiesgo','Severidad','Motivo','Indicadores','Confiabilidad','OrigenApp',
                    'IdCaso','Procesado','RefOdoo','Valores']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p155Hoja(api, n){ return api.__env.__libro.getSheetByName(n).getDataRange().getValues(); }
function p155Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }
/* El id tal como lo arma el cliente: nombre, fecha y test. Sin cédula y sin empresa — por eso
   colisiona entre homónimos, y es lo que hace real este caso. */
function p155Id(nombre, fecha, test){ return 'conf_' + nombre.toLowerCase().replace(/\s+/g,'') + '_' + fecha + '_' + test; }

PRUEBAS.caso('🔴 `Confiabilidad`: el homónimo ya no pisa la fila del otro · era pérdida de datos', () => {
  const api = p155Env(['accionConfiabilidadGuardar']);
  const id = p155Id('José Rodríguez', '2026-09-09', 'kss');   // el MISMO para los dos
  const base = { fecha:'2026-09-09', id: id, test:'kss', persona:'José Rodríguez',
                 usuario:'helitec', pass:'c1', dispositivoId:'d1', _post:true };
  api.accionConfiabilidadGuardar(Object.assign({}, base, { empresa:'Consorcio HELITEC', score:'90', confiable:'true' }));
  api.accionConfiabilidadGuardar(Object.assign({}, base, { empresa:'Cardón', score:'20', confiable:'false' }));
  const v = p155Hoja(api, 'Confiabilidad');
  PRUEBAS.igual(v.length, 3, '⚠️ quedaron DOS filas · antes la segunda pisaba la primera y quedaba una sola');
  const porEmp = {};
  for (let i = 1; i < v.length; i++) porEmp[String(v[i][4])] = String(v[i][6]);
  PRUEBAS.igual(porEmp['Consorcio HELITEC'], '90', 'el score del de HELITEC sigue siendo el suyo');
  PRUEBAS.igual(porEmp['Cardón'], '20', 'y el del de Cardón el suyo');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR: la MISMA persona sí actualiza su fila, no crea otra', () => {
  /* Si el arreglo hubiera roto el upsert, cada guardado agregaría una fila y la hoja crecería sin
     control — el defecto opuesto y también real. */
  const api = p155Env(['accionConfiabilidadGuardar']);
  const id = p155Id('José Rodríguez', '2026-09-09', 'kss');
  const base = { fecha:'2026-09-09', id: id, test:'kss', persona:'José Rodríguez',
                 empresa:'Consorcio HELITEC', usuario:'helitec', pass:'c1', dispositivoId:'d1', _post:true };
  api.accionConfiabilidadGuardar(Object.assign({}, base, { score:'90', confiable:'true' }));
  api.accionConfiabilidadGuardar(Object.assign({}, base, { score:'77', confiable:'true' }));
  const v = p155Hoja(api, 'Confiabilidad');
  PRUEBAS.igual(v.length, 2, '⚠️ una sola fila · el upsert sigue siendo upsert');
  PRUEBAS.igual(String(v[1][6]), '77', 'con el valor actualizado');
});

PRUEBAS.caso('🔴 `Casos Odoo`: el teléfono y el correo son los de SU empresa', () => {
  /* El ticket de telemedicina se abre con ese contacto: cruzarlo significa llamar al empleado
     equivocado, de otro cliente. */
  const api = p155Env(['perfilDeCaso']);
  const a = api.perfilDeCaso('José Rodríguez', 'Consorcio HELITEC');
  const b = api.perfilDeCaso('José Rodríguez', 'Cardón');
  PRUEBAS.igual(a.tel, '0412-1111111', '⚠️ el de HELITEC, con su teléfono');
  PRUEBAS.igual(a.mail, 'jose.helitec@x.com', 'y su correo');
  PRUEBAS.igual(b.tel, '0424-2222222', '⚠️ el de Cardón, con el suyo');
  PRUEBAS.igual(b.mail, 'jose.cardon@x.com', 'y el suyo');
});

PRUEBAS.caso('🔒 y sin coincidencia en esa empresa NO se devuelve el de otra', () => {
  /* Mejor un caso sin teléfono que un caso con el teléfono de otra persona. Misma regla que P152. */
  const api = p155Env(['perfilDeCaso']);
  const r = api.perfilDeCaso('José Rodríguez', 'Empresa Que No Tiene A Nadie');
  PRUEBAS.igual(r.tel || '', '', '🔒 sin teléfono · no hereda el de ningún homónimo');
  PRUEBAS.igual(r.mail || '', '', 'ni el correo');
});

PRUEBAS.caso('⚠️ el respaldo: una fila SIN empresa cargada todavía sirve · es deuda, no regla', () => {
  /* Las filas escritas antes de que la columna se llenara no la tienen. Descartarlas de golpe
     dejaría sin contacto a gente que hoy sí lo tiene. */
  const api = p155Env(['perfilDeCaso']);
  const sh = api.__env.__libro.getSheetByName('Registrados Fatiga');
  sh.appendRow((function(){ const f = p155Reg('Ana Vieja', '', '0416-3333333', 'ana@x.com'); return f; })());
  const r = api.perfilDeCaso('Ana Vieja', 'Consorcio HELITEC');
  PRUEBAS.igual(r.tel, '0416-3333333', '⚠️ la fila sin empresa se sigue usando como respaldo');
});
