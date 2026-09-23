PRUEBAS.grupo('P090 · la zona de la operación viaja en el payload y decide EN QUÉ CASILLA cae cada jornada');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO  (caso 1 del plan de P090)

   Una casilla del calendario ES un día. Así que el calendario no puede estar más bien que
   `fechaOpDe()`, y `fechaOpDe()` no puede estar más bien que `zonaOperacion()`.

   Lo que se rompía antes: el servidor manda la zona en la RAÍZ del payload (`zonaOp`), y
   `onDashData` arma `DASH` con una lista CERRADA de campos — lo que no está nombrado ahí se
   descarta SIN ERROR. Es exactamente lo que ya se comió `duty` y `ausencias` (hallazgo A4), y con
   `zonaOp` el síntoma habría sido peor que una pantalla vacía: una jornada dibujada en el día
   equivocado, que se lee como un dato y no como una falta de dato.

   Por eso este archivo prueba EL CONTRATO, no la función: se entra por `onDashData(payload, …)`
   —el único camino por el que el panel recibe datos de verdad (R17)— y se mide la CASILLA que sale,
   no `zonaOperacion()` sola. Que `zonaOperacion()` devuelva la cadena es la mitad; la otra mitad es
   que `cmesDiaDe` → `fechaOpDe` la obedezca.

   EL INSTANTE ELEGIDO, Y POR QUÉ ÉSE
   `2026-09-01T02:30:00Z` está a dos horas y media de la medianoche UTC, o sea del lado donde las
   zonas se pelean por el día:
     · America/Caracas (−4) → 22:30 del 31 de AGOSTO
     · Asia/Tokyo      (+9) → 11:30 del 1  de SEPTIEMBRE
   Un solo instante, dos casillas, y además dos MESES distintos: el mismo dato se dibuja en dos
   pantallas que ni siquiera se ven a la vez.

   ⚠️ EL DISCRIMINADOR NO PUEDE SER «SIN ZONA CAMBIA DE DÍA». Esta máquina corre en UTC−3, y a
   UTC−3 ese instante cae el 31 de agosto: el MISMO día que en Caracas. Un discriminador que
   depende de dónde esté la computadora no es un discriminador — pasaría acá y fallaría en una
   máquina en Madrid. Por eso el discriminador real es TOKIO: dos zonas declaradas, dos casillas
   distintas, en cualquier máquina. El caso «sin zonaOp» sigue estando, pero afirma lo que sí es
   determinista: que sin dato se cae en la zona del DISPOSITIVO, calculada acá con los getters
   locales, y se deja escrito que en esta máquina eso coincide con Caracas por casualidad.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

const P090Z_EMP = 'Empresa P090Z';
const P090Z_PER = 'Ana Zona P090';
const P090Z_T0  = '2026-09-01T02:30:00Z';

/* Un evento operacional con la MISMA forma que arma el servidor. `fecha` es la del EMISOR (lo que
   `cicloHistoricoFilas` usa para recortar el rango ancho del mes) y `iso` es el instante (lo que
   `cmesDiaDe` usa para ubicar la casilla). Que sean distintos entre sí es justamente el borde que
   el calendario tiene que aguantar: el filtro es ancho (mes ±1 día) y la ubicación es fina. */
function p090zEv(evento, iso){
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16), iso: iso,
           persona: P090Z_PER, empresa: P090Z_EMP, departamento: 'Tripulación', cargo: 'Piloto',
           evento: evento, test: '', resultado: null };
}

/* UNA jornada, corta y cerrada, arrancando a las 02:30 UTC.
   ⚠️ Los eventos salen de `cicloEventos()` y no de una lista escrita a mano: la forma la define el
   SECTOR (R14) y el que abre el ciclo es `cicloEventos()[0].k`, no «salida_casa» por decreto. Con
   una lista fija, cambiar de sector dejaría este caso midiendo un ciclo que el motor no arma.
   Quince minutos entre eventos: la jornada entera entra en una hora, así que el motor no la puede
   partir en dos por la ventana, y el último evento (el de cierre) cae el mismo día en las dos
   zonas — si cayera al día siguiente aparecería una marca de arrastre y la cuenta de casillas
   dejaría de ser la que este caso afirma. */
function p090zOperacional(){
  const base = Date.parse(P090Z_T0);
  return cicloEventos().map(function(e, i){
    return p090zEv(e.k, new Date(base + i * 15 * 60000).toISOString());
  });
}

function p090zPayload(zonaOp){
  const p = {
    ok: true, rol: 'supervisor', vista: 'medico', referencia: {}, metricas: [],
    registros: [{ persona: P090Z_PER, empresa: P090Z_EMP, departamento: 'Tripulación',
                  cargo: 'Piloto', fecha: '2026-09-01' }],
    comentarios: [], pvt: [], aptitud: [], turnos: [], config: {}, marca: null, niveles: [],
    duty: null, ausencias: {}, nominaTotal: 1, nominaSinDato: [],
    operacional: p090zOperacional(),
    /* Cobertura ANCHA a propósito. Si agosto de 2026 quedara fuera del período declarado, todas sus
       casillas dirían «fuera» y este caso estaría midiendo la cobertura en vez de la zona. La
       cobertura tiene su propio archivo (`p090-cobertura-no-miente.js`). */
    operacionalPeriodo: { dias: 400, desde: '2026-01-01', hasta: null, puedeVerHistorico: true }
  };
  if (zonaOp) p.zonaOp = zonaOp;
  return p;
}

/* Entra al panel por el camino real. Los params van SIN `pass` a propósito: así `gestCanSync()` da
   false y entrar no dispara los pedidos laterales de gestiones/reportes/opiniones — que además
   irían a parar al candado de red y ensuciarían el aviso de la corrida. */
function p090zEntrar(zonaOp){
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  const prev = { dash: DASH, gate: gate ? gate.style.display : '', panel: panel ? panel.style.display : '' };
  const fetchAntes = window.fetch;
  window.fetch = function(){ return new Promise(function(){}); };
  try {
    onDashData(p090zPayload(zonaOp), P090Z_EMP,
               { action: 'empleado', empresa: P090Z_EMP, persona: P090Z_PER }, 'medico');
  } finally {
    /* Se vuelve a lo que HABÍA, que es el candado de red del arnés, nunca al `fetch` pelado. */
    window.fetch = fetchAntes;
  }
  stopDashAutoRefresh();   // el panel arranca su refresco; acá sobra
  cicloTickStop();         // y su reloj de 1 s
  return prev;
}

function p090zSalir(prev){
  stopDashAutoRefresh(); cicloTickStop();
  DASH = prev.dash;
  const gate = document.getElementById('portalGate'), panel = document.getElementById('portalDash');
  if (gate) gate.style.display = prev.gate;
  if (panel) panel.style.display = prev.panel;
}

/* El caso visual de cada casilla del mes, leído de la CLASE que la app escribe (`cmes-c-<caso>`).
   Se mide sobre un nodo suelto: `cmesBloqueHtml` devuelve una cadena y no hace falta montarla en la
   pantalla para leer clases y atributos (R11: las capturas no sirven acá; `getComputedStyle` sí
   necesitaría el nodo montado, pero esto no mide estilo).
   Sólo las casillas del mes tienen `data-f`; las de relleno son divs vacíos. */
function p090zCasos(ym){
  const div = document.createElement('div');
  div.innerHTML = cmesBloqueHtml('panel', P090Z_PER, ym);
  const out = {};
  div.querySelectorAll('.cmes-grid [data-f]').forEach(function(b){
    const m = /cmes-c-([a-z_]+)/.exec(String(b.className || ''));
    out[b.getAttribute('data-f')] = m ? m[1] : '(sin caso)';
  });
  return out;
}

/* Los días del mes donde el calendario dibujó UNA JORNADA. Todo lo demás —«sin jornada»,
   «fuera del período», «futuro», «franco»— es ausencia de jornada, no otra clase de jornada. */
function p090zDiasConJornada(ym){
  const cas = p090zCasos(ym);
  const SIN = { sin_jornada: 1, fuera: 1, futuro: 1, franco: 1, '(sin caso)': 1 };
  return Object.keys(cas).filter(function(f){ return !SIN[cas[f]]; }).sort();
}

PRUEBAS.caso('🔴 P090 · con `zonaOp: America/Caracas` la jornada de las 02:30 UTC cae en la casilla del 31 de AGOSTO', function(){
  CTX.resetear();
  const prev = p090zEntrar('America/Caracas');
  try {
    PRUEBAS.igual(zonaOperacion(), 'America/Caracas',
      'el servidor manda la zona en la raíz del payload y `onDashData` arma DASH con una lista CERRADA de campos: si `zonaOp` no estuviera nombrada ahí, se descartaría sin error, como ya pasó con `duty` y `ausencias` (A4)');
    PRUEBAS.igual(Object.keys(p090zCasos('2026-08')).length, 31,
      'guarda: agosto tiene 31 casillas y las 31 se midieron — un cero sin discriminador no es un resultado, y una sección con un ancestro en display:none devolvería «0 defectos» sin mirar nada');
    PRUEBAS.igual(p090zDiasConJornada('2026-08').join(','), '2026-08-31',
      '02:30 UTC del 1 de septiembre son las 22:30 del 31 de agosto en Caracas: la jornada es UNA y la casilla también (el ciclo pertenece al día en que ARRANCÓ, por `c.t0`)');
    PRUEBAS.igual(p090zDiasConJornada('2026-09').join(','), '',
      'la misma jornada no puede aparecer además en septiembre: un turno que cruza la medianoche no se parte en dos medias casillas');
  } finally { p090zSalir(prev); }
});

PRUEBAS.caso('🔴 P090 · DISCRIMINADOR · con `zonaOp: Asia/Tokyo` el MISMO instante cambia de casilla y de mes', function(){
  CTX.resetear();
  const prev = p090zEntrar('Asia/Tokyo');
  try {
    PRUEBAS.igual(zonaOperacion(), 'Asia/Tokyo',
      'discriminador: si el caso de arriba pasara con cualquier zona, estaría midiendo una constante en vez del contrato');
    PRUEBAS.igual(p090zDiasConJornada('2026-09').join(','), '2026-09-01',
      'en Tokio ese instante son las 11:30 del 1 de septiembre: la casilla se MUEVE, y se mueve de mes — es lo que prueba que el calendario obedece a `zonaOp` y no al reloj de la computadora');
    PRUEBAS.igual(p090zDiasConJornada('2026-08').join(','), '',
      'y desaparece de agosto: dos zonas declaradas no pueden dar dos casillas encendidas para un solo hecho');
  } finally { p090zSalir(prev); }
});

PRUEBAS.caso('P090 · sin `zonaOp` el calendario cae en la zona del DISPOSITIVO, que es el comportamiento viejo y la razón de que el campo tenga que viajar', function(){
  CTX.resetear();
  /* `zonaOperacion()` tiene tres escalones: DASH.zonaOp, `cfg('zonaOp')` y la copia guardada del
     canal de tareas del empleado. `CTX.resetear()` ya limpió el localStorage, pero se saca la clave
     a mano igual: si otra prueba la dejara puesta, este caso mediría esa zona y no la del
     dispositivo, y pasaría por la razón equivocada. */
  try { localStorage.removeItem(K_ZONA_OP); } catch(e){}
  const prev = p090zEntrar(null);
  try {
    PRUEBAS.igual(zonaOperacion(), null,
      'sin `zonaOp` en el payload no hay de dónde sacarla: `CFG_DEFAULT` no declara `zonaOp` (la config de empresa la llama `zonaHoraria`) y `K_ZONA_OP` sólo lo escribe el canal de tareas del empleado');
    const d = new Date(P090Z_T0);
    const dosDig = function(n){ return String(n).padStart(2, '0'); };
    const local = d.getFullYear() + '-' + dosDig(d.getMonth() + 1) + '-' + dosDig(d.getDate());
    const dias = p090zDiasConJornada('2026-08').concat(p090zDiasConJornada('2026-09'));
    PRUEBAS.cierto(local === '2026-08-31' || local === '2026-09-01',
      'guarda: el instante está a 2 h 30 de la medianoche UTC, así que sin zona declarada sólo puede caer en uno de esos dos días, mida donde mida esta máquina');
    PRUEBAS.igual(dias.join(','), local,
      'sin zona declarada la casilla la decide el reloj de la computadora. En esta máquina (UTC−3) eso da el 31 de agosto, IGUAL que Caracas: por eso el discriminador de este archivo es Tokio y no «sin zonaOp» — un discriminador que depende de dónde esté la máquina pasaría acá y fallaría en Madrid');
  } finally { p090zSalir(prev); }
});
