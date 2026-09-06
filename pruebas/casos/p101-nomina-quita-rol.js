
PRUEBAS.grupo('P101 · la nómina puede quitar el rol, y la celda vacía nunca quita');

/* El ADR 002 lo dejó escrito: la nómina PROPONE el rol —nunca da acceso por sí sola— pero SÍ
   puede sacarlo. Si RRHH se lo quita a alguien en la hoja, esa persona tiene que perder el panel.
   Hasta hoy no lo perdía nunca: nada volvía a leer su fila después del alta.

   ⚠️ LA TRAMPA QUE ESTO EVITA, y por la que Franco tuvo que decidir: `leerNomina` normaliza la
   celda vacía a "empleado", así que después de esa línea "RRHH decidió que es empleado" y "RRHH no
   llenó la columna" son indistinguibles. Un refresco que no las separe le saca el panel a TODOS
   los supervisores que hoy funcionan por casilla, en el próximo arranque y sin aviso.
   Decisión del 2026-09-06: **la celda vacía NUNCA quita nada.** */

function p101Env(filaNomina){
  return GS.crearEntorno({
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
              .concat(filaNomina ? [filaNomina] : []),
    'Tareas': [["Empresa","ID","Cedula","Persona","Origen","Titulo","Detalle","Vence","Estado",
                "Creada","Actualizada","CreadaPor"]],
    'Gestiones': [["Empresa","ID","Datos","Actualizada"]],
    'Config Empresa': [["Empresa","Clave","Valor"]],
    'Accesos': [["Usuario","Contraseña","Rol","Empresas"]],
    'Identidades': [["Variante","Empresa","Cedula","ResueltoPor","Como","Registros","PrimeraVez","UltimaVez"]],
  });
}
function p101Pedir(env){
  return JSON.parse(GS.cargarGs(CTX.gs, env, ['accionTareasMias'])
    .accionTareasMias({ persona:'Ana Suárez', empresa:'Helitec', cedula:'V-111',
                        dispositivoId:'d1' }).getContent());
}

PRUEBAS.caso('⚠️ la celda VACÍA no manda nada — no puede quitar', () => {
  /* EL CASO QUE MÁS IMPORTA. Si esto falla, todos los supervisores que hoy funcionan por casilla
     pierden el panel en su próximo arranque. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const r = p101Pedir(p101Env(['Helitec','Ana Suárez','V-111','Op','Piloto','F','34','','','Sí','','','4']));
  PRUEBAS.cierto(r.ok, 'la consulta funciona igual');
  PRUEBAS.igual(r.rolNomina, null, '⚠️ con la celda vacía NO viaja el rol: el cliente no toca nada');
});

PRUEBAS.caso('con "Empleado" escrito, sí manda que es empleado', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p101Pedir(p101Env(['Helitec','Ana Suárez','V-111','Op','Piloto','F','34','','','Sí','','Empleado','4']));
  PRUEBAS.igual(r.rolNomina, 'empleado', '⚠️ escrito explícitamente, sí quita');
});

PRUEBAS.caso('el DISCRIMINADOR: vacío y "Empleado" dan DISTINTO', () => {
  /* Sin esto, los dos casos de arriba podrían estar pasando porque `rolNomina` es siempre null.
     Es la distinción entera de P101 en una comprobación. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const vacio = p101Pedir(p101Env(['Helitec','Ana Suárez','V-111','Op','P','F','34','','','Sí','','','4'])).rolNomina;
  const escrito = p101Pedir(p101Env(['Helitec','Ana Suárez','V-111','Op','P','F','34','','','Sí','','Empleado','4'])).rolNomina;
  PRUEBAS.cierto(vacio !== escrito,
    '⚠️ la celda vacía y "Empleado" NO pueden dar lo mismo — es toda la decisión de P101');
});

PRUEBAS.caso('un rol que no es empleado también viaja, y no quita nada', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p101Pedir(p101Env(['Helitec','Ana Suárez','V-111','Op','P','F','34','','','Sí','','Supervisor','4']));
  PRUEBAS.igual(r.rolNomina, 'supervisor', 'llega normalizado');
});

PRUEBAS.caso('⚠️ sin nómina cargada NO se manda rol', () => {
  /* `accionTareasMias` degrada cuando la empresa no tiene nómina. Ahí "no encontré la fila" no es
     lo mismo que "le sacaron el rol": quitar en ese caso sería sacárselo a gente al azar. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const r = p101Pedir(p101Env(null));
  PRUEBAS.cierto(r.ok, 'la consulta sigue funcionando (la app vieja no se rompe)');
  PRUEBAS.igual(r.rolNomina, null, '⚠️ sin fila que leer, no se afirma nada');
});

PRUEBAS.caso('el cliente avisa al servidor ANTES de borrar el token', () => {
  /* Si se borra primero, la sesión queda viva del otro lado y nadie puede cerrarla. Es el mismo
     orden que ya usa `saveProfile`. */
  const f = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const i = f.indexOf("d.rolNomina === 'empleado'");
  PRUEBAS.alMenos(i, 0, 'existe la rama que quita el rol');
  if (i < 0) return;
  const bloque = f.slice(i, i + 900);
  const iAviso = bloque.indexOf('sesionAvisarCierre');
  const iBorra = bloque.indexOf('K_DASH_CREDS');
  PRUEBAS.alMenos(iAviso, 0, 'se avisa al servidor');
  PRUEBAS.cierto(iAviso >= 0 && iBorra > iAviso, '⚠️ y el aviso va ANTES de borrar el token');
});

PRUEBAS.caso('⚠️ sólo se le quita a quien tenía el rol', () => {
  /* Un empleado común recibe `rolNomina:'empleado'` en cada arranque. Si la rama no comprobara que
     antes tenía el rol, le escribiría el perfil y le mostraría un aviso todos los días. */
  const f = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const i = f.indexOf("d.rolNomina === 'empleado'");
  if (i < 0){ PRUEBAS.cierto(false, 'no existe la rama'); return; }
  PRUEBAS.cierto(/esSupervisor \|\| _p\.esServicioMedico/.test(f.slice(i, i + 400)),
    '⚠️ se comprueba que tenía rol antes de tocar nada');
});
