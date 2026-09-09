PRUEBAS.grupo('P151 · el IdTurno llevaba la cédula a Dirección/HSEQ');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   A13 borró la clave que se llama `cedula` de la respuesta anonimizada de Dirección/HSEQ, y su
   comentario lo dice con todas las letras: «una cédula al lado de "P1" anula la anonimización
   completa». Dejó pasar la que la lleva ADENTRO.

   El `IdTurno` que `leerTurnos` devuelve como `id` lo arma el cliente con `turnoHoyId()`:
   `'turno_' + idPersonaClave() + '_' + fecha + '_' + tipo`, y `idPersonaClave()` es literalmente
   `'c' + la cédula sin puntos`. Así que la respuesta traía filas
   `{ persona:"P1", id:"turno_c12345678_2026-09-08_checkin" }` — el identificador más fuerte de toda
   la app, en claro, al lado del opaco.

   ⚠️ LO QUE LO ESCONDIÓ: `Operacional` NO tiene el problema, porque `leerOperacional` ni siquiera
   devuelve su columna IdEvento. `Turnos` sí la devuelve, y nadie comparó las dos.

   ⚠️ SE ENTRA POR EL CAMINO REAL (R17): `accionSupervisor` con la contraseña de HSEQ, que es lo que
   dispara `anonimizarHseq`. Llamar a la función de anonimización a mano probaría la pieza, no que
   la respuesta que sale por el cable esté limpia.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P151_CED = '12345678';
const P151_ID_CON_CEDULA = 'turno_c' + P151_CED + '_2026-09-08_checkin';

function p151Env(fns){
  const env = GS.crearEntorno({
    /* La columna F es la contraseña de Dirección/HSEQ: es la que activa `acc.vista === "hseq"`. */
    'Accesos': [['Usuario','Contraseña','Rol','Empresas','Contraseña Médica','Contraseña HSEQ'],
                ['helitec','clave-sup','supervisor','Consorcio HELITEC, Helitec','clave-med','clave-hseq']],
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo'],
               ['Consorcio HELITEC','Ana Suárez', P151_CED,'Operaciones','Piloto','F','34','','','Sí','','','4']],
    /* Una fila de Turnos con el id tal como lo escribe el cliente de verdad. */
    'Turnos': [['Fecha','Hora','IdTurno','Tipo','Persona','Empresa','Departamento','Cargo','KSS','Carga'],
               ['2026-09-08','07:30', P151_ID_CON_CEDULA,'checkin','Ana Suárez','Consorcio HELITEC',
                'Operaciones','Piloto','3','4']],
    'Registrados Fatiga': [['Nota de la hoja','Fecha y hora','Nombre','Email','Cédula','ID Piloto',
      'Es piloto','Es supervisor','Empresa','Departamento','Cargo','Sexo','Edad','Teléfono',
      'Dispositivo','Modelo','Sistema','Navegador','Está instalado','Idioma','Zona','Pantalla','UA']],
    'Credenciales': [['Empresa','Cedula','Usuario','Hash','Sal','Iteraciones','Algoritmo','Rol','Estado','Creada','UltimoAcceso']],
    'Config Empresa': [['Empresa','Clave','Valor']],
    'Respuestas de formulario 1': [new Array(90).fill('bloque'), new Array(90).fill('pregunta')]
  });
  const api = GS.cargarGs(CTX.gs, env, fns);
  api.__env = env;
  return api;
}
function p151Json(r){ return JSON.parse(r.getContent ? r.getContent() : r); }
function p151Panel(api, pass){
  return p151Json(api.accionSupervisor({ usuario:'helitec', pass: pass, dispositivoId:'d1' }));
}

PRUEBAS.caso('🔒 la cédula NO viaja a Dirección/HSEQ dentro del id del turno', () => {
  const api = p151Env(['accionSupervisor']);
  const r = p151Panel(api, 'clave-hseq');
  PRUEBAS.igual(r.ok, true, 'guarda: la vista de Dirección responde · ' + (r.error || ''));
  PRUEBAS.igual(r.vista, 'hseq', 'guarda: y es la vista anonimizada, que es la que se está midiendo');
  /* Se mide sobre la respuesta ENTERA serializada: si la cédula aparece en cualquier campo de
     cualquier colección, esto la caza — no sólo en el que se sabe que la tenía. */
  const crudo = JSON.stringify(r);
  PRUEBAS.igual(crudo.indexOf(P151_CED), -1,
    '🔒 la cédula no aparece en NINGUNA parte de la respuesta · antes viajaba dentro de `id`');
  PRUEBAS.igual(crudo.indexOf('Ana Suárez'), -1,
    'y el nombre tampoco · las filas viejas lo llevan adentro del id por `idPrevio`');
});

PRUEBAS.caso('⚠️ el DISCRIMINADOR de medibilidad: la fila del turno LLEGÓ a la respuesta', () => {
  /* Si `leerTurnos` no devolviera nada, el caso de arriba pasaría sin haber medido nada — un cero
     sin discriminador no es un resultado. Se comprueba que la fila está, anonimizada. */
  const api = p151Env(['accionSupervisor']);
  const r = p151Panel(api, 'clave-hseq');
  const t = r.turnos || [];
  PRUEBAS.alMenos(t.length, 1, '⚠️ hay al menos un turno en la respuesta · si no, no se midió nada');
  PRUEBAS.igual(t[0].persona, 'P1', 'con la persona ya reemplazada por el identificador opaco');
  PRUEBAS.igual(t[0].tipo, 'checkin', 'y el resto de los campos intactos · no se rompió la fila');
  PRUEBAS.igual('id' in t[0], false, 'pero sin `id`, que es lo que llevaba la cédula');
});

PRUEBAS.caso('⚠️ el supervisor SÍ sigue viendo lo suyo · no se anonimizó de más', () => {
  /* El discriminador del arreglo: `copiarCon` sólo corre para la vista `hseq`. Si el borrado se
     hubiera aplicado a todas, el supervisor —que tiene derecho a ver a su gente por nombre—
     perdería datos que necesita. */
  const api = p151Env(['accionSupervisor']);
  const r = p151Panel(api, 'clave-sup');
  PRUEBAS.igual(r.ok, true, 'el supervisor entra · ' + (r.error || ''));
  PRUEBAS.igual(r.vista, 'supervisor', 'con su propia vista');
  const t = (r.turnos || [])[0];
  PRUEBAS.cierto(!!t, 'guarda: y recibe el turno');
  PRUEBAS.igual(t.persona, 'Ana Suárez', '⚠️ con el nombre real, que es lo que su vista necesita');
});
