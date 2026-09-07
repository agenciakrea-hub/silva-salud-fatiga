PRUEBAS.grupo('L · Etapa A · las puertas que estaban abiertas sin ninguna credencial');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   MEDIDO CONTRA PRODUCCIÓN el 2026-09-06, con sólo la URL pública que está en el index.html del
   repo abierto y SIN NINGUNA CREDENCIAL: `nomina_empresas` devolvía la lista de empresas clientes,
   `nomina_personas` los 7 nombres completos de HELITEC —cada uno con `yaRegistrado`, o sea a quién
   conviene suplantar— y `empresa_perfil` el perfil con `pideCodigo:false`.
   23 de 52 acciones del endpoint no llaman a `validarAcceso()`.

   Lo pidió Franco después de que su jefe viera las empresas cargadas. El rediseño del login NO
   cierra nada de esto: son cierres de servidor, y por eso van primero y aparte.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function lEnv(nomina){
  return GS.crearEntorno({
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"],
                ['Helitec', 'sup001', 'supervisor', 'Helitec', 'med002', 'dir003']],
    'Sesiones': [["Id","HashToken","Usuario","Dispositivo","Rol","Vista","Empresas","Canonical",
                  "Combinada","Creada","UltimoUso","Estado","Cerrada"]],
    'Credenciales': [["Empresa","Cédula","Usuario","Hash","Sal","Vueltas","Algoritmo","Rol",
                      "Estado","Creada","UltimoAcceso"]],
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
               .concat(nomina || [
                 ['Helitec','Ana Suárez','V-1','Operaciones','Piloto','F',35,'+58123','a@e.com','Sí','','empleado','2']]),
  });
}

PRUEBAS.caso('🔴 L1 · nadie se fabrica una credencial de ADMINISTRADOR registrándose', () => {
  /* `accionCredencialCrear` guardaba en la columna H de `Credenciales` lo que viniera en `p.rol`
     del POST, sin lista blanca. `accionLogin` lo mete en la sesión, y `acc.rol === "admin"`
     desactiva el recorte por empresa en SEIS lugares del panel — el peor, `gestScope`, donde con
     admin la empresa la elige el parámetro. O sea: cualquiera que pudiera crear una credencial se
     hacía administrador y veía todas las empresas. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const env = lEnv();
  const api = GS.cargarGs(CTX.gs, env, ['accionCredencialCrear', 'credRolValido']);

  const r = JSON.parse(api.accionCredencialCrear({
    empresa: 'Helitec', cedula: 'V-1', pass: 'unaClaveLarga1', usuario: 'Ana Suárez',
    dispositivoId: 'd', rol: 'admin'          // ← lo que mandaría un atacante
  }).getContent());
  PRUEBAS.cierto(!!r.ok, 'guarda de medibilidad: la credencial se creó · ' + JSON.stringify(r).slice(0, 90));

  const filas = env.hojas ? null : null;
  const cred = api.credRolValido('admin');
  PRUEBAS.falso(cred === 'admin', '⚠️ `admin` no es un rol que se pueda pedir · quedó "' + cred + '"');
  PRUEBAS.igual(api.credRolValido('supervisor'), 'supervisor', 'y los roles reales sí pasan');
  PRUEBAS.igual(api.credRolValido('inventado'), 'empleado',
    '⚠️ y lo desconocido cae en el que MENOS ve · el default seguro es el más restrictivo');
});

PRUEBAS.caso('🔴 L1b · el rol sale de la NÓMINA, no de lo que manda el cliente', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function accionCredencialCrear[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 200, 'guarda de medibilidad: se encontró la acción');
  PRUEBAS.falso(/String\(p\.rol \|\| "empleado"\)/.test(fn),
    '⚠️ ya no se escribe el rol que llegó por POST');
  PRUEBAS.cierto(/credRolValido\(enNomina\.persona\.rol\)/.test(fn),
    '⚠️ se escribe el de la columna L de la Nómina, que la carga RRHH y no quien se registra');
});

PRUEBAS.caso('🔴 L2 · una colisión de cédula NO entrega datos clínicos de otra empresa', () => {
  /* Ninguna hoja del CH impone unicidad de cédula, y `accionEmpleado` armaba sus datos con
     `leerDatos()` —el CH entero, todas las empresas— recortando sólo por cédula. Dos personas de
     dos clientes distintos con la misma cédula (un error de tipeo alcanza) se veían los registros
     entre sí. No hacía falta atacar nada: pasaba solo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function accionEmpleado[\s\S]*?function esMio[\s\S]{0,900}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 200, 'guarda de medibilidad: se encontró `esMio`');
  PRUEBAS.cierto(/miEmp/.test(fn), '⚠️ la empresa entra en la comparación');
  PRUEBAS.cierto(/norm\(res\.empresa\) !== miEmp\) return false/.test(fn),
    '⚠️ y una fila de OTRA empresa se descarta antes de mirar la cédula');
});

PRUEBAS.caso('🔴 L3/L4 · las dos acciones que eran un oráculo de cédulas tienen freno', () => {
  /* `nomina_confirmar` y `recuperar_perfil` responden distinto según si la cédula existe, y no
     contaban intentos (0 llamadas a `accFrenado`): se podía iterar el espacio de cédulas hasta
     acertar, y al acertar devolvían teléfono, email, cargo, sexo y edad. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  [['accionNominaConfirmar', 'frenoNom'], ['accionRecuperarPerfil', 'frenoRec']].forEach(([fn, freno]) => {
    const cuerpo = (gs.match(new RegExp('function ' + fn + '[\\s\\S]*?\\n\\}')) || [''])[0];
    PRUEBAS.alMenos(cuerpo.length, 200, 'guarda: se encontró ' + fn);
    PRUEBAS.cierto(new RegExp('accFrenado\\(' + freno).test(cuerpo),
      '⚠️ ' + fn + ' corta cuando hubo demasiados intentos');
    PRUEBAS.cierto(new RegExp('accAnotarFallo\\(' + freno).test(cuerpo),
      '⚠️ y ANOTA el fallo · un freno que no cuenta no frena nada');
    PRUEBAS.cierto(new RegExp('accLimpiar\\(' + freno).test(cuerpo),
      'y lo limpia al acertar · quien teclea mal su propia cédula no queda castigado');
  });
});

PRUEBAS.caso('⚠️ el freno de verdad corta después de varios intentos fallidos', () => {
  /* R17 · por el camino real: se llama a la acción con una cédula equivocada hasta pasar el tope,
     y se comprueba que la respuesta CAMBIA. Sin esto sólo se estaría comprobando que las palabras
     están escritas en el archivo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lEnv(), ['accionNominaConfirmar']);
  const mal = () => JSON.parse(api.accionNominaConfirmar({
    empresa: 'Helitec', persona: 'Ana Suárez', cedula: 'V-999', dispositivoId: 'atacante'
  }).getContent());

  const primera = mal();
  PRUEBAS.falso(!!primera.ok, 'guarda: con la cédula equivocada no entra');
  PRUEBAS.falso(primera.motivo === 'muchos_intentos', 'y el primer intento NO está frenado todavía');

  let frenado = null;
  for (let i = 0; i < 12 && !frenado; i++) { const r = mal(); if (r.motivo === 'muchos_intentos') frenado = i + 2; }
  PRUEBAS.cierto(!!frenado, '⚠️ en algún momento corta · sin esto se itera el espacio de cédulas entero');

  /* Y el DISCRIMINADOR: otro dispositivo no queda frenado por lo que hizo el primero. */
  const otro = JSON.parse(api.accionNominaConfirmar({
    empresa: 'Helitec', persona: 'Ana Suárez', cedula: 'V-1', dispositivoId: 'otroTelefono'
  }).getContent());
  PRUEBAS.cierto(!!otro.ok,
    '⚠️ el freno es POR DISPOSITIVO · si fuera global, un atacante dejaría a la empresa afuera');
});
