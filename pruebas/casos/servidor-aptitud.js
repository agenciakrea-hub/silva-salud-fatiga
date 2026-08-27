/* ── El motor de aptitud y la resolución de nivel de riesgo, del lado del servidor ──────────────
   (L2b · migra a la suite lo que se verificó a mano en E2a, 2026-08-26)

   POR QUÉ ESTOS CASOS Y NO OTROS
   E2a existe porque el payload que reciben supervisor y Dirección/HSEQ NO puede llevar los valores
   clínicos crudos. Para lograrlo hubo que calcular la aptitud EN EL SERVIDOR, duplicando en `.gs`
   una lógica que ya existía en el cliente. Dos implementaciones de la misma regla es exactamente
   lo que se desincroniza sin que nadie lo note: el supervisor vería una cosa y el médico otra
   sobre la misma persona. Estos casos son el ancla de que sigan diciendo lo mismo.

   El bug de subcadena que se prueba abajo NO es hipotético: está anotado en el propio `.gs`
   ("el cliente ya tuvo un bug real con esto — 'rol' matcheaba 'Control de Fatiga'"). */

PRUEBAS.grupo('Servidor · nivel de riesgo');

const FILAS_NIVEL = [
  { empresa: 'Helitec', persona: '', cargo: '', departamento: '', nivel: '2' },
  { empresa: 'Helitec', persona: '', cargo: 'Piloto', departamento: '', nivel: '4' },
  { empresa: 'Helitec', persona: '', cargo: '', departamento: 'Operaciones', nivel: '3' },
  { empresa: 'Helitec', persona: 'Ana Pérez', cargo: '', departamento: '', nivel: '5' },
];

function apiNivel() {
  const env = GS.crearEntorno({});
  return GS.cargarGs(CTX.gs, env, ['nivelRiesgoDeServer', 'nivelCoincideServer', 'dashNormServer']);
}

PRUEBAS.caso('la precedencia es persona > cargo > departamento > empresa', () => {
  const api = apiNivel();
  PRUEBAS.igual(api.nivelRiesgoDeServer(FILAS_NIVEL, 'Ana Pérez', 'Operaciones', 'Helitec', 'Piloto'), 5,
    'la regla por persona tiene que ganarle a la de su cargo y a la de su departamento');
  PRUEBAS.igual(api.nivelRiesgoDeServer(FILAS_NIVEL, 'Otro', 'Operaciones', 'Helitec', 'Piloto'), 4,
    'sin regla por persona manda el CARGO, no el departamento');
  PRUEBAS.igual(api.nivelRiesgoDeServer(FILAS_NIVEL, 'Otro', 'Operaciones', 'Helitec', 'Camillero'), 3,
    'sin persona ni cargo manda el DEPARTAMENTO');
  PRUEBAS.igual(api.nivelRiesgoDeServer(FILAS_NIVEL, 'Otro', 'Nada', 'Helitec', 'Nada'), 2,
    'y al final la regla general de la empresa');
});

PRUEBAS.caso('coincide por PALABRA COMPLETA, no por subcadena', () => {
  /* El bug real que documenta el propio .gs: "rol" matcheaba "Control de Fatiga". Si volviera,
     una persona quedaría clasificada con el nivel de riesgo de otro puesto — y el nivel define la
     tolerancia operativa con la que se la evalúa. */
  const api = apiNivel();
  PRUEBAS.falso(api.nivelCoincideServer('rol', 'Control de Fatiga'),
    '"rol" NO puede coincidir con "Control de Fatiga": clasificaría a la persona en el puesto equivocado');
  PRUEBAS.cierto(api.nivelCoincideServer('piloto', 'Piloto'),
    'la igualdad simple tiene que seguir andando');
  PRUEBAS.cierto(api.nivelCoincideServer('piloto', 'Piloto de línea'),
    'y la palabra completa dentro de una frase, sí');
});

PRUEBAS.caso('ignora tildes y mayúsculas al comparar', () => {
  const api = apiNivel();
  PRUEBAS.igual(api.dashNormServer('  ANA  PÉREZ '), 'ana perez',
    'los nombres llegan escritos de veinte formas distintas: sin esto la persona no se encuentra a sí misma');
  PRUEBAS.cierto(api.nivelCoincideServer('OPERACIONES', 'operaciónes'),
    'una tilde de más en la planilla no puede cambiar el nivel de riesgo de alguien');
});

PRUEBAS.caso('un nivel fuera de 1..5 se ignora, no se acepta', () => {
  const api = apiNivel();
  const rotas = [{ empresa: 'Helitec', persona: '', cargo: 'Piloto', departamento: '', nivel: '9' },
                 { empresa: 'Helitec', persona: '', cargo: '', departamento: '', nivel: '2' }];
  PRUEBAS.igual(api.nivelRiesgoDeServer(rotas, 'X', '', 'Helitec', 'Piloto'), 2,
    'un 9 escrito a mano en la planilla no puede convertirse en un nivel de riesgo inventado');
});

PRUEBAS.caso('una fila sin empresa aplica a todas', () => {
  const api = apiNivel();
  const global = [{ empresa: '', persona: '', cargo: 'Piloto', departamento: '', nivel: '5' }];
  PRUEBAS.igual(api.nivelRiesgoDeServer(global, 'X', '', 'CualquierEmpresa', 'Piloto'), 5,
    'la fila sin empresa es la regla general del sistema; si no aplicara, no serviría de nada');
});

PRUEBAS.grupo('Servidor · personas de prueba');

PRUEBAS.caso('las personas de prueba se reconocen para poder excluirlas', () => {
  /* I8: había datos de prueba mezclados con los de gente real en los tableros. */
  const env = GS.crearEntorno({});
  const api = GS.cargarGs(CTX.gs, env, ['esPersonaDePrueba']);
  PRUEBAS.falso(api.esPersonaDePrueba('Ana Pérez'),
    'una persona real NUNCA puede quedar marcada como de prueba: desaparecería de los tableros');
});
