PRUEBAS.grupo('P160 · Turnos: un solo reloj');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El cliente manda `creada: Date.now()` desde siempre y `accionTurnoGuardar` lo TIRABA: la hoja no
   tenía columna para el instante. Entonces la misma decisión —«¿este check-in sigue dentro de la
   ventana de 14 h del turno nocturno?»— se contestaba distinto según quién preguntara:

   · en el teléfono, `turnosHoy()` usa `r.creada`, el instante verdadero;
   · en el panel, `cicloTurnoDe()` lo reconstruía con `Date.parse(fecha + 'T' + hora)`.

   Y esos dos campos no salen del mismo reloj: `fecha` viene de la ZONA DE LA OPERACIÓN, `hora` del
   reloj del DISPOSITIVO, y el `Date.parse` los interpreta en la zona del NAVEGADOR QUE ABRE EL
   PANEL. **Tres zonas en un solo número.** Un check-in de las 23:30 mirado desde otra zona corre
   horas: el chip desaparecía de la tarjeta de ciclo del supervisor mientras la persona lo veía
   marcado en su propio teléfono. Nadie comparaba los dos resultados.

   Se guarda con `formatoIsoLocal_` y se lee con `fechaReporteAEpoch_` — el par que `Reportes` ya
   usa, que interpreta los dos lados en la zona del SCRIPT.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P160_CAB_TURNOS = ['Fecha','Hora','IdTurno','Tipo','Persona','Empresa','Departamento','Cargo','KSS','Carga'];

function p160Env(fns, filasViejas){
  const t = [P160_CAB_TURNOS.slice()];
  (filasViejas || []).forEach(f => t.push(f));
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','EMPRESAS','Contraseña Médica','Contraseña HSQ'],
                ['helitec','c1','supervisor','Consorcio HELITEC, Helitec','','']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo']],
    'Turnos': t,
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p160Hoja(api){ return api.__env.__libro.getSheetByName('Turnos').getDataRange().getValues(); }
function p160Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }
/* Un check-in de las 23:30, que es el caso que rompía. El epoch es el dato verdadero. */
const P160_EPOCH = 1789000000000;
function p160Guardar(api, extra){
  return p160Json(api.accionTurnoGuardar(Object.assign({
    id:'turno_c1_2026-09-08_checkin', fecha:'2026-09-08', hora:'23:30', tipo:'checkin',
    persona:'Ana Suárez', empresa:'Consorcio HELITEC', departamento:'Ops', cargo:'Piloto',
    creada: P160_EPOCH, dispositivoId:'d1', _post:true }, extra || {})));
}

PRUEBAS.caso('🔴 el instante real se GUARDA · antes se tiraba', () => {
  const api = p160Env(['accionTurnoGuardar']);
  const r = p160Guardar(api);
  PRUEBAS.cierto(r.ok !== false, 'guarda: la escritura respondió · ' + (r.error || ''));
  const v = p160Hoja(api);
  const c = v[0].indexOf('Creada');
  PRUEBAS.cierto(c >= 0, '⚠️ la columna «Creada» existe · se crea sola si falta');
  PRUEBAS.igual(c, P160_CAB_TURNOS.length,
    '🔒 y va AL FINAL · en el medio correría los datos de todo lo ya escrito (la lección de P147)');
  PRUEBAS.cierto(String(v[1][c]).length > 10, 'con el instante adentro · quedó «' + v[1][c] + '»');
});

PRUEBAS.caso('🔴 EL PAR CERRADO · lo que se guarda vuelve como el MISMO instante', () => {
  /* R17 · el contrato entre las dos puntas. De nada sirve guardarlo si el lector devuelve otra
     cosa: `formatoIsoLocal_` y `fechaReporteAEpoch_` tienen que interpretar en la misma zona. */
  const api = p160Env(['accionTurnoGuardar','leerTurnos']);
  p160Guardar(api);
  const t = api.leerTurnos('Consorcio HELITEC') || [];
  PRUEBAS.alMenos(t.length, 1, 'guarda de medibilidad: el turno vuelve · si no, no se midió nada');
  if (!t.length) return;
  /* ⚠️ EXACTO, no aproximado, y ese rigor encontró un defecto real. El primer arreglo guardaba un
     ISO y lo releía con el par de `Reportes`: el instante volvía con **exactamente una hora** de
     diferencia, porque el ISO se escribe en la zona del script y se reconstruye en la del entorno
     que lo lee. Era el mismo bug de tres relojes, reintroducido dentro del arreglo. Con un epoch no
     hay zona posible: si esto vuelve a fallar, es que alguien metió un formato con zona. */
  PRUEBAS.igual(Number(t[0].creada), P160_EPOCH,
    '⚠️ el instante vuelve IDÉNTICO · un epoch no tiene zona en la que desfasarse');
});

PRUEBAS.caso('⚠️ una fila VIEJA sin la columna vuelve con `creada` nula, no inventada', () => {
  /* El respaldo: las filas escritas antes de que la columna existiera no tienen el dato. Devolver
     un instante inventado sería peor que no devolver ninguno — el cliente tiene que poder caer al
     cálculo de siempre para ésas. */
  const api = p160Env(['leerTurnos'],
    [['2026-09-08','23:30','turno_viejo','checkin','Ana Suárez','Consorcio HELITEC','Ops','Piloto','3','4']]);
  const t = api.leerTurnos('Consorcio HELITEC') || [];
  PRUEBAS.alMenos(t.length, 1, 'guarda: la fila vieja se lee igual');
  if (!t.length) return;
  PRUEBAS.igual(t[0].creada, null, '⚠️ `creada` es null · el cliente cae a `fecha + hora` para ésta');
  PRUEBAS.igual(t[0].tipo, 'checkin', 'y el resto de la fila intacto · no se corrió nada');
});

PRUEBAS.caso('🔴 el cliente usa el instante primero, y el cálculo viejo sólo de respaldo', () => {
  /* La otra punta del contrato. Se mide sobre el fuente porque lo que se vigila es cuál de los dos
     caminos se toma — y `cicloTurnoDe` necesita un panel armado para ejecutarse. */
  const fuente = cicloTurnoDe.toString().replace(/\/\*[\s\S]*?\*\//g, ' ');
  PRUEBAS.cierto(/r\.creada\s*\|\|/.test(fuente),
    '⚠️ `r.creada ||` va primero · antes reconstruía con fecha + hora y mezclaba tres relojes');
  /* Y que sigue siendo el MISMO orden que usa el teléfono: si los dos se separan otra vez, vuelve
     el defecto por el que la persona y su supervisor veían cosas distintas. */
  const enTelefono = turnosHoy.toString().replace(/\/\*[\s\S]*?\*\//g, ' ');
  PRUEBAS.cierto(/r\.creada\s*\|\|/.test(enTelefono),
    '🔒 y el teléfono hace lo mismo · las dos mitades de la decisión, con la misma regla');
});
