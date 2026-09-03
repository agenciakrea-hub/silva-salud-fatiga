
PRUEBAS.grupo('Z0b · sólo el nombre no alcanza');

/* ⚠️ EL HALLAZGO, verificado en el código durante Z0 y no traído del plan: `accionEmpleado` exigía
   ÚNICAMENTE `p.persona`. La cédula era opcional. Con el nombre de un piloto, cualquiera obtenía
   sus registros clínicos (KSS, fatiga, estrés, somnolencia), su PVT y 30 días de su ciclo.

   Y los nombres no son secretos: `nomina_personas` los devuelve sin contraseña, a propósito, porque
   hacen falta para el alta. O sea que el "secreto" que protegía datos de salud era un dato que el
   propio sistema publica.

   Estos casos corren contra el `.gs` REAL en el emulador. */

function z0bEndpoint(personas, registros, config){
  const env = GS.crearEntorno({
    'Nómina': [['Empresa','Nombre','Cedula','Departamento','Cargo']].concat(personas || []),
    'Respuestas de formulario 1': [['Marca temporal','Nombre','Empresa','KSS']].concat(registros || []),
    'Config Empresa': [['Empresa','Clave','Valor']].concat(config || []),
    'Identidades': [['Variante','Empresa','Cedula','NombreCanonico','Como','Registros','PrimeraVez','UltimaVez']],
  });
  return GS.cargarGs(CTX.gs, env, ['accionEmpleado']);
}

PRUEBAS.caso('⚠️ con el nombre solo YA NO se entregan datos de salud', () => {
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el .gs servido se saltea'); return; }
  const api = z0bEndpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']],
                          [['2026-09-01','Ana Suárez','Helitec','7']]);
  const r = JSON.parse(api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec' }).getContent());
  PRUEBAS.falso(r.ok, 'sin cédula no se entrega nada');
  PRUEBAS.igual(r.motivo, 'falta_cedula', 'y se dice por qué, para que el cliente pueda reaccionar');
  PRUEBAS.falso(!!r.registros, '⚠️ ni un registro puede viajar en la respuesta');
  PRUEBAS.falso(!!r.pvt, 'ni el PVT');
  PRUEBAS.falso(!!r.operacional, 'ni los eventos del ciclo');
});

PRUEBAS.caso('⚠️ con la cédula correcta sí, como siempre', () => {
  /* El control que impide "arreglar" esto dejando a todo el mundo afuera. Si este caso fallara,
     habríamos cerrado la puerta con los pilotos adentro. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z0bEndpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']],
                          [['2026-09-01','Ana Suárez','Helitec','7']]);
  const r = JSON.parse(api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec', cedula:'V-111' }).getContent());
  PRUEBAS.cierto(r.ok, 'con su cédula, la persona ve lo suyo');
  PRUEBAS.cierto(Array.isArray(r.registros), 'y le llegan sus registros');
});

PRUEBAS.caso('⚠️ una cédula que NO es la de esa persona tampoco entra', () => {
  /* Si alcanzara con mandar CUALQUIER cédula, el arreglo sería decorativo: bastaría inventar una. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z0bEndpoint([['Helitec','Ana Suárez','V-111','Op','Piloto'],
                           ['Helitec','Beto Pérez','V-222','Op','Piloto']],
                          [['2026-09-01','Ana Suárez','Helitec','7']]);
  const r = JSON.parse(api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec',
                                            cedula:'V-222', dispositivoId:'d1' }).getContent());
  PRUEBAS.falso(r.ok, 'la cédula de otro no sirve para leer los datos de Ana');
  PRUEBAS.falso(!!r.registros, 'y no se filtra nada');
});

PRUEBAS.caso('⚠️ probar cédulas se frena: seis intentos por dispositivo', () => {
  /* Sin freno, adivinar una cédula es cuestión de tiempo: son pocos dígitos y el formato se conoce.
     Es el mismo freno del acceso de supervisor y de la demo, con clave propia para no interferir. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z0bEndpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']],
                          [['2026-09-01','Ana Suárez','Helitec','7']]);
  for (let i = 0; i < 6; i++) api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec', cedula:'V-9'+i, dispositivoId:'quemado' });
  const frenado = JSON.parse(api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec', cedula:'V-111', dispositivoId:'quemado' }).getContent());
  const otro    = JSON.parse(api.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec', cedula:'V-111', dispositivoId:'limpio'  }).getContent());
  PRUEBAS.falso(frenado.ok, 'tras seis fallos ese dispositivo no entra ni con la cédula correcta');
  PRUEBAS.cierto(otro.ok, '⚠️ pero otro dispositivo sí: si el freno fuera global, cualquiera dejaría sin app a un piloto');
});

PRUEBAS.caso('⚠️ el interruptor de emergencia existe y funciona', () => {
  /* La app es una PWA: el service worker puede estar sirviendo una versión vieja que todavía no
     manda la cédula. Si eso deja a alguien afuera, `exigir_cedula = no` en la fila GENERAL de
     `Config Empresa` lo revierte AL INSTANTE, sin volver a publicar el endpoint.
     Viene ENCENDIDO —cerrado por defecto— pero tiene que haber una salida a mano. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const conApagado = z0bEndpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']],
                                 [['2026-09-01','Ana Suárez','Helitec','7']],
                                 [['', 'exigir_cedula', 'no']]);
  const r = JSON.parse(conApagado.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec' }).getContent());
  PRUEBAS.cierto(r.ok, 'con el interruptor en "no", vuelve a funcionar como antes');
  /* Y el discriminador: sin el interruptor tiene que estar cerrado. Si diera ok en los dos casos,
     el interruptor no estaría haciendo nada y el caso de arriba sería decorativo. */
  const porDefecto = z0bEndpoint([['Helitec','Ana Suárez','V-111','Op','Piloto']],
                                 [['2026-09-01','Ana Suárez','Helitec','7']]);
  const r2 = JSON.parse(porDefecto.accionEmpleado({ persona:'Ana Suárez', empresa:'Helitec' }).getContent());
  PRUEBAS.falso(r2.ok, '⚠️ y por defecto tiene que estar CERRADO: el interruptor es la excepción, no la regla');
});

PRUEBAS.caso('⚠️ quien no tiene cédula en el padrón no queda afuera', () => {
  /* Caso borde que importa: hay registros viejos sin cédula. Si exigiéramos que COINCIDA con el
     padrón cuando el padrón no la tiene, esa gente perdería sus propios datos — lo contrario de lo
     que esto viene a proteger. Se exige que la persona MANDE una; si el padrón no la conoce, no se
     puede verificar y se deja pasar. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = z0bEndpoint([], [['2026-09-01','Carlos Viejo','Helitec','6']]);   // sin nómina
  const r = JSON.parse(api.accionEmpleado({ persona:'Carlos Viejo', empresa:'Helitec',
                                            cedula:'V-777', dispositivoId:'d2' }).getContent());
  PRUEBAS.cierto(r.ok, 'sin cédula en el padrón, mandar la suya alcanza: no se lo deja sin sus datos');
});
