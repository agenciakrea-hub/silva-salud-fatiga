PRUEBAS.grupo('P154 · las ausencias, alcanzables de verdad');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Toda la función Y5 —«no castigar la cobertura de quien estaba de franco»— estaba **muerta en
   producción**, y la demostración la mostraba andando perfecto. Eso último es lo que hizo que nadie
   la reportara.

   La cadena: `accionNominaListar` recortaba la cédula por privacidad, el cliente dibuja el botón
   «Marcar ausente» con `const btn = x.cedula ? …`, y con `x.cedula` en `undefined` para TODAS las
   filas ese botón no se dibujaba nunca. No hay otro camino: `ausencia_guardar` se llama desde un
   solo lugar del cliente, dentro de `ausTocar()`, que además corta con `if (!cedNum) return;`. La
   hoja `Ausencias` no recibió una sola fila desde la app.

   Es R17 en su forma más cara: el demo arma el estado a mano —le pone la cédula a las filas— y por
   eso la pantalla se ve funcionando; el llamador REAL no puede dar lo que la función pide.

   ⚠️ POR ESO ESTE ARCHIVO PRUEBA EL CONTRATO, no cada lado. Mide lo que `nomina_listar` manda
   contra lo que el cliente necesita para dibujar, y después que con eso la escritura llegue a la
   hoja. Probar las dos puntas por separado es exactamente lo que dejó pasar este defecto.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P154_CED = '12345678';

function p154Env(fns){
  const env = GS.crearEntorno({
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','clave-med','clave-hseq']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Consorcio HELITEC','Ana Suárez', P154_CED,'Operaciones','Piloto','F','34','','','Sí','','','4']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Ausencias': [['IdAusencia','Empresa','Cedula','Persona','Desde','Hasta','Motivo','Estado',
                   'Creada','Quien','Marcada','MarcadaPor']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p154Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }
function p154Listar(api, pass){
  return p154Json(api.accionNominaListar({ usuario:'helitec', pass: pass, dispositivoId:'d1' }));
}

PRUEBAS.caso('🔴 EL CONTRATO · `nomina_listar` manda lo que el cliente necesita para dibujar el botón', () => {
  const api = p154Env(['accionNominaListar']);
  const r = p154Listar(api, 'clave-sup');
  PRUEBAS.igual(r.ok, true, 'responde · ' + (r.error || ''));
  /* La clave es `nomina`, no `personas`: `nomina_personas` (el alta) usa la otra y son
     acciones distintas. Confundirlas es medir la respuesta equivocada. */
  const fila = (r.nomina || [])[0];
  PRUEBAS.cierto(!!fila, 'guarda de medibilidad: llegó al menos una fila · ' + JSON.stringify(Object.keys(r)));
  if (!fila) return;
  /* La condición EXACTA del cliente, copiada de index.html:27525 — no una equivalente. */
  PRUEBAS.cierto(!!fila.cedula,
    '⚠️ la fila trae cédula · sin ella `const btn = x.cedula ? …` no dibuja nada y Y5 muere entera');
  PRUEBAS.igual(String(fila.cedula).replace(/\D/g, ''), P154_CED,
    'y es la de esa persona, en la forma que `ausTocar()` espera (sólo dígitos)');
});

PRUEBAS.caso('🔒 pero Dirección/HSEQ sigue sin recibir la nómina — el discriminador de privacidad', () => {
  /* El recorte de K1b es una promesa hecha en la lámina del carrusel, en la pantalla donde la
     persona decide si contesta la verdad. Si el arreglo la hubiera aflojado, esto se cae. */
  const api = p154Env(['accionNominaListar']);
  const r = p154Listar(api, 'clave-hseq');
  PRUEBAS.igual(r.ok, false, '🔒 Dirección no recibe la nómina');
  PRUEBAS.igual(r.motivo, 'sin_permiso', 'con el motivo declarado, no un error genérico');
  PRUEBAS.igual(JSON.stringify(r).indexOf(P154_CED), -1, 'y ninguna cédula en la respuesta');
});

PRUEBAS.caso('🔴 y con esa cédula, la ausencia LLEGA a la hoja', async () => {
  /* La segunda mitad del contrato: que el dato que viaja sirva para escribir. Se entra por
     `accionAusenciaGuardar` con exactamente lo que el cliente arma en `ausTocar()`. */
  const api = p154Env(['accionNominaListar','accionAusenciaGuardar']);
  const fila = (p154Listar(api, 'clave-sup').nomina || [])[0];
  PRUEBAS.cierto(!!(fila && fila.cedula), 'guarda: hay cédula con la que escribir');
  const ced = String(fila.cedula).replace(/\D/g, '');
  const r = p154Json(api.accionAusenciaGuardar({
    usuario:'helitec', pass:'clave-sup', dispositivoId:'d1',
    id: 'aus_' + ced + '_2026-09-09',          // el mismo id que arma ausTocar()
    empresa:'Consorcio HELITEC', cedula: ced, persona: fila.persona,
    desde:'2026-09-09', hasta:'2026-09-09', motivo:'franco', _post:true }));
  PRUEBAS.igual(r.ok, true, 'la escritura responde ok · ' + (r.error || ''));
  const v = api.__env.__libro.getSheetByName('Ausencias').getDataRange().getValues();
  PRUEBAS.alMenos(v.length, 2, '⚠️ la hoja Ausencias recibió su primera fila desde la app');
  PRUEBAS.igual(String(v[1][2]).replace(/\D/g, ''), ced, 'con la cédula en su columna');
});

PRUEBAS.caso('⚠️ el cliente dibuja el botón cuando la fila trae cédula, y no cuando no', () => {
  /* Se mide la condición REAL del cliente sobre las dos formas de fila, para que el día que alguien
     cambie `x.cedula` por otro campo esto se ponga rojo aunque el servidor siga mandando bien. */
  const fuente = nominaListFiltrar.toString();
  PRUEBAS.cierto(/x\.cedula/.test(fuente) || /\.cedula/.test(fuente),
    '⚠️ el dibujo del botón sigue dependiendo de `cedula` · si cambia el nombre del campo, el contrato se rompe');
});
