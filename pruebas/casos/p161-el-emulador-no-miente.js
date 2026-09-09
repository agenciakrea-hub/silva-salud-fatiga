PRUEBAS.grupo('P161 · el emulador no miente sobre la zona');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El emulador usaba `America/Caracas` (UTC-4) mientras `appsscript.json` pone el proyecto en
   `America/Argentina/Buenos_Aires` (UTC-3). Eso lo hacía MENTIR sobre las fechas:
   `Utilities.formatDate` respeta la zona configurada, pero `new Date(a, m, d, h, …)` es JavaScript
   puro y usa la del navegador que corre la suite.

   Lo destapó `P160`: un instante escrito con `formatoIsoLocal_` y releído con `parsearIsoAEpoch_`
   volvía con **exactamente una hora** de diferencia. En producción eso NO pasa —en Apps Script las
   dos corren en la zona del script y coinciden—, así que el emulador estaba inventando un defecto
   que no existe. Yo lo anoté como hallazgo real de `Reportes` y estaba equivocado; se verificó al
   día siguiente y la nota quedó corregida en `PENDIENTES_USUARIO.md`.

   ⚠️ POR QUÉ IMPORTA MÁS DE LO QUE PARECE: un emulador que miente puede inventar un defecto —caro,
   se pierde tiempo— pero también puede TAPAR uno. Una prueba de fecha en verde no decía nada
   mientras las dos zonas no coincidieran.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P161_EPOCH = 1789000000000;

function p161Env(fns, opciones){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','EMPRESAS','Contraseña Médica','Contraseña HSQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC','','']],
    'Reportes': [['Fecha','IdReporte','Opcion','Identificado','Persona','Empresa','Departamento','Cargo','Comentario']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Config Empresa': [['Empresa','Clave','Valor']]
  }, opciones);
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}

PRUEBAS.caso('🔴 el par escritor/lector de fechas NO desfasa · como en producción', () => {
  /* `formatoIsoLocal_` escribe con la zona del script; `parsearIsoAEpoch_` reconstruye con
     `new Date(componentes)`. En Apps Script las dos son la misma zona. Acá también, desde P161. */
  const api = p161Env(['formatoIsoLocal_','parsearIsoAEpoch_']);
  const iso = api.formatoIsoLocal_(P161_EPOCH);
  PRUEBAS.cierto(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(iso),
    'guarda de medibilidad: el ISO tiene la forma esperada · quedó «' + iso + '»');
  PRUEBAS.igual(api.parsearIsoAEpoch_(iso), P161_EPOCH,
    '⚠️ vuelve IDÉNTICO · antes daba exactamente una hora de diferencia y parecía un bug del .gs');
});

PRUEBAS.caso('⚠️ la zona del emulador es la del `appsscript.json` real', () => {
  /* Si alguien cambia la zona del proyecto en Apps Script y no acá, las pruebas de fecha vuelven a
     medir una zona que no es la de producción — que es exactamente lo que este prompt cerró. */
  const api = p161Env(['formatoIsoLocal_']);
  PRUEBAS.igual(api.__env.Session.getScriptTimeZone(), 'America/Argentina/Buenos_Aires',
    '⚠️ la del script real · si el proyecto cambia de zona, hay que cambiarla acá también');
  PRUEBAS.igual(api.__env.__libro.getSpreadsheetTimeZone(), 'America/Argentina/Buenos_Aires',
    'y la del libro, que en Apps Script son dos cosas pero acá conviene que coincidan');
});

PRUEBAS.caso('🔒 el DISCRIMINADOR: con una zona distinta a propósito, SÍ desfasa', () => {
  /* Esto es lo que hacía el emulador todo el tiempo sin decirlo. Se deja medido para que quede
     claro que `opciones.zona` mueve `formatDate` pero NO `new Date(componentes)` — quien la use
     tiene que saberlo. */
  const api = p161Env(['formatoIsoLocal_','parsearIsoAEpoch_'], { zona: 'America/Caracas' });
  const iso = api.formatoIsoLocal_(P161_EPOCH);
  PRUEBAS.cierto(api.parsearIsoAEpoch_(iso) !== P161_EPOCH,
    '🔒 con la zona forzada el par se separa · por eso el default es la real');
});

PRUEBAS.caso('⚠️ y el ciclo completo de `Reportes` conserva el instante', () => {
  /* R17 · el contrato de verdad, no las dos funciones sueltas: se escribe por la acción real y se
     lee por la de lectura. Era lo que yo había reportado como roto, y no lo estaba. */
  const api = p161Env(['accionReporteGuardar','accionReportesLeer']);
  const r = JSON.parse(api.accionReporteGuardar({
    id:'rep_1', opcion:'cansancio', identificado:'false', persona:'Ana Suárez',
    empresa:'Consorcio HELITEC', departamento:'Ops', cargo:'Piloto', comentario:'',
    creada: P161_EPOCH, dispositivoId:'d1', _post:true }).getContent());
  PRUEBAS.cierto(r.ok !== false, 'guarda: el reporte se guardó · ' + (r.error || ''));
  const leido = JSON.parse(api.accionReportesLeer({
    usuario:'helitec', pass:'c1', dispositivoId:'d1' }).getContent());
  const reps = (leido && leido.reportes) || [];
  PRUEBAS.alMenos(reps.length, 1, 'guarda de medibilidad: vuelve al menos uno');
  if (!reps.length) return;
  PRUEBAS.igual(Number(reps[0].creada), P161_EPOCH,
    '⚠️ el instante del reporte vuelve idéntico · la bandeja se ordena por esto');
});
