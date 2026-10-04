/* ── P223 · Actividad reciente ───────────────────────────────────────────────────────────────
   Pedido de Franco (2026-10-04): un panel arriba de las estadísticas del administrador con los
   últimos movimientos, fecha y hora, **para saber si hubo actividad o no** — «para solucionar y
   probar si lo arreglamos». Nació del incidente en que Rafael cargó personas en la nómina y el
   panel no mostraba nada (ver `INCIDENTE_2026-10-03_NIVELES.md`).

   ⚠️ R17 · se entra por `accionActividad`, el punto de entrada REAL, con las hojas que produce el
   CH — nunca armando el resultado a mano. Las dos mitades del alcance se prueban: lo que el
   administrador TIENE que ver y lo que un supervisor NO puede ver.

   ⚠️ R19 · cada caso nombra la función que concede el derecho que afirma. El alcance lo concede
   `empresasPermitidas_` (`null` = TODAS, sólo el maestro) más `gestScope` para el filtro, y la
   seudonimización de Dirección la concede `esAdminMaestro_`. Son las mismas tres de
   `accionSupervisor`: esta acción las USA, no las reescribe. */

PRUEBAS.grupo('P223 · actividad reciente · el alcance y la hora');

const P223_ACC = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P223_SES = ['Id','HashToken','Usuario','Dispositivo','Rol','Vista','Empresas','Canonical',
  'Combinada','Creada','UltimoUso','Estado','Cerrada'];
const P223_BIT = ['Fecha','Empresa','Accion','Sujeto','Actor','Rol','Origen','NivelRiesgo',
  'UmbralAmarillo','UmbralRojo','AppVersion','IdEvento','JSON'];

/* Una fila del formulario: 130 columnas y DOS de encabezado, como la hoja real. `parseRegistros`
   lee por índice fijo (1 nombre, 2 departamento, 72 empresa, 73 fecha, 0 marca, 86 KSS). */
function p223Test(empresa, persona, marca, kss) {
  const f = new Array(130).fill('');
  f[0] = marca; f[1] = persona; f[2] = 'Operaciones'; f[72] = empresa; f[73] = marca;
  f[86] = String(kss == null ? 4 : kss);
  return f;
}
function p223Bit(fecha, empresa, accion, sujeto, ts) {
  const f = new Array(13).fill('');
  f[0] = fecha; f[1] = empresa; f[2] = accion; f[3] = sujeto; f[4] = 'sistema'; f[5] = 'sistema';
  f[6] = 'endpoint'; f[11] = 'srv_' + accion + '_' + (ts || 0);
  f[12] = ts ? JSON.stringify({ id: f[11], ts: ts, empresa: empresa }) : '';
  return f;
}
/* 60 filas viejas de Alfa, para poder medir el tope. Fechas DESCENDENTES desde 2026-08-01 para
   que ninguna le gane a los movimientos con significado. */
function p223Relleno(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const dia = String((i % 28) + 1).padStart(2, '0');
    const mes = i < 28 ? '08' : '07';
    out.push(p223Bit(dia + '/' + mes + '/2026 08:00', 'Alfa S.A.', 'nomina_sync', 'RELLENO ' + i,
                     Date.UTC(2026, mes === '08' ? 7 : 6, (i % 28) + 1, 8, 0)));
  }
  return out;
}
/* Instantes fijos: `Date.now()` dentro de un caso lo vuelve dependiente del reloj. */
const P223_T = { alfa2: Date.UTC(2026, 8, 20, 15, 30), alfa1: Date.UTC(2026, 8, 18,  9, 15),
                 beta1: Date.UTC(2026, 8, 19, 11,  0), bitA:  Date.UTC(2026, 8, 17, 20, 45) };
function p223Entorno() {
  return GS.crearEntorno({
    'Accesos': [P223_ACC,
      ['*',    'k-maestra', 'admin', '', '', ''],
      ['Alfa', 'k-alfa', 'supervisor', 'Alfa S.A., Alfa', '', ''],
      ['Beta', 'k-beta', 'supervisor', 'Beta', '', '']],
    'Respuestas de formulario 1': [new Array(130).fill(''), new Array(130).fill(''),
      p223Test('Alfa S.A.', 'ANA ALFA',  new Date(P223_T.alfa2), 5),
      p223Test('Alfa',      'LUIS ALFA', new Date(P223_T.alfa1), 3),   // la MISMA empresa, por su variante
      p223Test('Beta',      'ZOE BETA',  new Date(P223_T.beta1), 6)],
    /* ⚠️ 2 filas con significado + 60 de relleno. Las 60 existen SÓLO para que el tope duro de 50
       se pueda medir: con 5 movimientos, pedir `n=9999` devuelve 5 y el aserto del tope pasa en
       verde con el tope BORRADO. Lo cazó el discriminador — un mutante que no discrimina puede ser
       el fixture, no el caso. */
    'Bitácora': [P223_BIT,
      p223Bit('17/09/2026 20:45', 'Alfa S.A.', 'nomina_sync', 'ANA ALFA', P223_T.bitA),
      p223Bit('16/09/2026 10:00', 'Beta',      'credencial_creada', 'ZOE BETA', 0)   // sin ts: cae al parseo de la col A
    ].concat(p223Relleno(60)),
    'Sesiones': [P223_SES]
  });
}
function p223Api(env) {
  return GS.cargarGs(CTX.gs, env, ['accionActividad', 'empresasPermitidas_', 'validarAcceso', 'tsDeMarca_']);
}
const P223_J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return {}; } };

PRUEBAS.caso('🔴 el ADMINISTRADOR sin filtro ve TODAS las empresas; con filtro, sólo esa', () => {
  /* EL DERECHO: lo concede `empresasPermitidas_`, que devuelve `null` para el maestro — y ese
     `null` significa «todas». El filtro lo aplica `gestScope(acc, p.empresa)`. Es EXACTAMENTE el
     patrón de `accionSupervisor`, y el `|| []` que lo rompió ahí dejó la nómina del administrador
     en cero y causó el incidente del 2026-10-03: acá no se reescribe, se usa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p223Api(p223Entorno());
  const mae = api.validarAcceso('*', 'k-maestra', 'd');
  PRUEBAS.igual(api.empresasPermitidas_(mae), null,
    'guarda: el maestro es el único con `null`, y `null` ES «todas»');

  const todas = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d' }));
  PRUEBAS.cierto(todas.ok === true, 'guarda: la acción responde ok');
  PRUEBAS.igual(todas.error, null, 'guarda: sin error de lectura — el cero no vendría del `catch`');
  PRUEBAS.igual(todas.alcance, null, '🔴 sin filtro el alcance es `null`, o sea todas las empresas');
  /* LO QUE TIENE QUE CAMBIAR · 3 tests + 2 acciones de bitácora, de las DOS empresas */
  PRUEBAS.igual(todas.total, 65, '🔴 ve los 65 movimientos de las dos empresas (3 tests + 2 acciones + 60 de relleno)');
  PRUEBAS.igual(todas.tests, 3, '🔴 y cuenta los 3 tests aparte: es lo que contesta «¿hubo actividad?»');
  const empT = {}; (todas.items || []).forEach(i => { empT[i.empresa] = 1; });
  PRUEBAS.alMenos(Object.keys(empT).length, 2, '🔴 y aparecen DOS empresas distintas, no una');
  PRUEBAS.igual((todas.items || []).length, 10, '🔴 y viajan 10, no las 65: el panel pide 10');

  const soloBeta = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d', empresa:'Beta' }));
  PRUEBAS.igual(soloBeta.total, 2, '🔴 con el filtro en «Beta» ve sólo sus 2 movimientos');
  PRUEBAS.falso((soloBeta.items || []).some(i => /alfa/i.test(String(i.empresa))),
    '🔴 y NINGUNO es de Alfa: el filtro del panel recorta también este listado');
});

PRUEBAS.caso('🔴 un SUPERVISOR ve su empresa y NO puede pedir otra, ni por el parámetro', () => {
  /* EL DERECHO, y acá el freno: `empresasPermitidas_` devuelve la lista del canónico de la cuenta
     —nunca `null`— así que el `indexOf` descarta todo lo ajeno sin importar qué mande el cliente.
     `p.empresa` es un parámetro del REQUEST: lo manda el navegador y el servidor no puede
     confiarle el alcance (es la lección de P212, donde `gestScope` devolvía el pedido crudo). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p223Api(p223Entorno());
  PRUEBAS.igual(JSON.stringify(api.empresasPermitidas_(api.validarAcceso('Alfa', 'k-alfa', 'd'))),
    '["alfa s a"]', 'guarda: el supervisor recibe su canónico, nunca `null`');

  const suyo = P223_J(api.accionActividad({ usuario:'Alfa', pass:'k-alfa', dispositivoId:'d' }));
  /* LO QUE TIENE QUE CAMBIAR · ve SUS dos tests y SU acción de bitácora, por las dos variantes */
  PRUEBAS.igual(suyo.total, 63, '🔴 ve sus 63 movimientos (las dos variantes del nombre son UNA empresa)');
  PRUEBAS.falso((suyo.items || []).some(i => /beta/i.test(String(i.empresa))),
    '🔴 y nada de Beta');
  /* LO QUE NO PUEDE CAMBIAR · pedir otra empresa no abre nada */
  const robo = P223_J(api.accionActividad({ usuario:'Alfa', pass:'k-alfa', dispositivoId:'d', empresa:'Beta' }));
  PRUEBAS.igual(robo.total, 63, '🔴 pidiendo «Beta» sigue viendo SUS 63, no los de Beta');
  PRUEBAS.falso((robo.items || []).some(i => /beta/i.test(String(i.empresa))),
    '🔴 NO PUEDE CAMBIAR · ni un solo movimiento ajeno se filtra por el parámetro');
  /* Y una sesión sin alcance falla CERRADA, no abierta: `[]` filtra todo. */
  const vacia = P223_J(api.accionActividad({ usuario:'Alfa', pass:'equivocada', dispositivoId:'d' }));
  PRUEBAS.cierto(vacia.ok === false, '🔴 con la contraseña mal no devuelve nada, ni una lista vacía con ok');
});

PRUEBAS.caso('🔴 cada movimiento trae su INSTANTE, y el servidor NO lo formatea', () => {
  /* EL DERECHO: `tsDeMarca_` saca el epoch de la celda y `parseRegistros` lo guarda en `reg.ts`.
     ⚠️ QUE VIAJE EN EPOCH ES EL PUNTO, no un detalle: quien formatea es el cliente, con
     `fechaOpDe`/`horaOpDe`, que resuelven en la zona de OPERACIÓN de la empresa. Si el servidor
     formateara con `Session.getScriptTimeZone()` (Buenos Aires), un test tomado a las 23:30 de
     Caracas se mostraría con la fecha del día siguiente — el desfase medido en
     `INFORME_ZONA_2026-10-03.md`, que afecta a 3 de 452 registros reales. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p223Api(p223Entorno());
  const d = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d' }));
  const it = d.items || [];
  PRUEBAS.igual(it.length, 10, 'guarda: por defecto viajan 10 movimientos');
  /* LO QUE TIENE QUE CAMBIAR · números, no cadenas, y con la hora dentro */
  PRUEBAS.cierto(it.every(i => typeof i.ts === 'number' && i.ts > 0),
    '🔴 todos traen `ts` NUMÉRICO: sin él el cliente no puede mostrar la hora');
  PRUEBAS.igual(it[0].ts, P223_T.alfa2,
    '🔴 y es el instante exacto de la celda, con hora — no el día al mediodía');
  /* ⚠️ Ordenado por `ts` numérico. Ordenar fechas como CADENA es un defecto que este repo ya pagó
     (memoria `fechas-no-se-ordenan-como-cadenas`): "Wed Sep 30" ganaba sobre "Sat Oct 03". */
  PRUEBAS.cierto(it.every((x, k) => k === 0 || it[k-1].ts >= x.ts),
    '🔴 más reciente primero');
  /* ⚠️ HONESTIDAD SOBRE QUÉ PRUEBA ESTE ASERTO: con epoch en milisegundos todos los instantes de
     esta década tienen 13 dígitos, así que `String(ts)` ordena IGUAL que el número — un mutante que
     cambie el comparador a cadenas NO se puede distinguir acá, y el discriminador lo confirmó con
     0 rojos. Lo que este aserto sí caza es invertir el sentido (más viejo primero) y ordenar por
     un campo que no sea el instante. El riesgo histórico del repo —ordenar `"Wed Sep 30"` contra
     `"Sat Oct 03"`, memoria `fechas-no-se-ordenan-como-cadenas`— lo cierra el aserto de abajo:
     mientras nada viaje formateado, no hay cadena de fecha que se pueda ordenar por error. */
  PRUEBAS.igual(it[0].ts > it[it.length-1].ts, true,
    '🔴 y el sentido es descendente: invertirlo pone «última actividad» en el movimiento más viejo');
  /* LO QUE NO PUEDE CAMBIAR · el servidor no manda nada ya formateado */
  PRUEBAS.falso(it.some(i => /\d{4}-\d{2}-\d{2}/.test(JSON.stringify(i))),
    '🔴 NO PUEDE CAMBIAR · ningún campo viaja formateado como fecha: formatea el cliente, con la zona de operación');
  /* La fila de bitácora SIN `ts` en el JSON cae al parseo de la columna A, y tiene que conservar
     la hora (10:00), no quedar al mediodía. */
  const sinJson = it.filter(i => i.que === 'credencial_creada')[0];
  PRUEBAS.cierto(!!sinJson, 'guarda: la fila de bitácora sin JSON entró igual');
  PRUEBAS.igual(new Date(sinJson.ts).getHours(), 10,
    '🔴 la fila sin JSON conserva su HORA (col A «dd/MM/yyyy HH:mm»), no cae al mediodía');
});

PRUEBAS.caso('🔴 el tope duro y la mezcla de fuentes: la bitácora SOLA no alcanza', () => {
  /* ⚠️ ESTE CASO EXISTE POR UNA MEDICIÓN QUE CAMBIÓ EL DISEÑO. Yo iba a leer sólo la bitácora.
     Medido sobre sus 152 filas reales, sus únicas 8 acciones son de sistema o de credenciales
     (`nomina_sync` 98, `credencial_creada` 25, …): **ninguna es «una persona contestó un test»**.
     La bitácora de Aeroambulancias Silva termina el 2026-10-01 y ese 3 de octubre hubo 7 tests, así
     que un panel que leyera sólo bitácora habría contestado «última actividad: 1 de octubre» —
     justo MAL la pregunta por la que Franco lo pidió. Si alguien «simplifica» esto a una fuente,
     este caso se pone en rojo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const api = p223Api(p223Entorno());
  const d = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d' }));
  const tipos = {}; (d.items || []).forEach(i => { tipos[i.tipo] = (tipos[i.tipo] || 0) + 1; });
  PRUEBAS.igual(tipos.test, 3, '🔴 los tests están (la bitácora no los registra)');
  PRUEBAS.igual((d.items || []).filter(i => i.tipo === 'accion').length, 7,
    '🔴 y las acciones de bitácora también (los 10 que viajan son 3 tests + 7 acciones)');
  /* El movimiento MÁS RECIENTE es un test, no una acción: es lo que hace que «última actividad»
     signifique algo para quien pregunta si la app está recibiendo datos. */
  PRUEBAS.igual((d.items || [])[0].tipo, 'test',
    '🔴 el más reciente es un test: con sólo bitácora, «última actividad» habría dicho otra cosa');
  PRUEBAS.igual(d.ultima, P223_T.alfa2, '🔴 y `ultima` es ese instante');
  /* Tope duro: nadie puede pedir la hoja entera por el parámetro. */
  const mucho = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d', n:'9999' }));
  /* ⚠️ Con 65 movimientos en el alcance, pedir 9999 DEBE devolver 50. Con el fixture chico este
     aserto pasaba en verde aunque el tope estuviera borrado. */
  PRUEBAS.igual((mucho.items || []).length, 50, '🔴 el tope de 50 se respeta aunque se pidan 9999');
  const tres = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d', n:'3' }));
  PRUEBAS.igual((tres.items || []).length, 3, '🔴 y se respeta el `n` pedido');
  PRUEBAS.igual(tres.total, 65,
    '🔴 pero `total` sigue siendo 65: si no, tres filas parecerían tres movimientos en toda la empresa');
});

PRUEBAS.caso('🔴 DIRECCIÓN no ve NOMBRES, y el administrador maestro sí', () => {
  /* EL DERECHO, y el freno: lo concede `esAdminMaestro_(acc)` — no `acc.rol`, porque el rol sale de
     la columna C de `Accesos`, que la edita gente a mano, así que escribir «admin» en una fila
     bastaría para saltear la promesa. Es el MISMO criterio que `accionBitacora`, y A8/P091 ya pagó
     una vez exactamente esta fuga: la bitácora le llegaba a Dirección CON los nombres contra la
     promesa escrita de la lámina que la persona lee antes de contestar (R4).
     ⚠️ ESTE CASO FALTABA. Los cuatro de arriba miden el alcance por EMPRESA y la hora; ninguno
     medía el recorte por VISTA dentro de la propia empresa, que es la mitad más cara. Lo encontré
     revisando mis propios huecos, no corriendo nada: el panel del cliente lo probé vaciando los
     nombres A MANO, que es justo lo que R17 prohíbe — eso prueba el render, no que el servidor
     recorte. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* La cuenta de Dirección: contraseña en la columna «Contraseña HSQ» (la 6ª). */
  const env = GS.crearEntorno({
    /* ⚠️ LA TERCERA FILA ES EL ATAQUE, y faltaba: una cuenta con **«admin» escrito a mano en la
       columna C** que NO es el maestro. Es exactamente contra lo que existe `esAdminMaestro_`, y
       sin esa fila el mutante que cambia el criterio a `acc.rol !== "admin"` pasaba en VERDE —
       porque las otras dos cuentas tienen rol `supervisor` y los dos criterios dan lo mismo. Un
       candado cuyo escenario de ataque no está en el fixture no está medido. */
    'Accesos': [P223_ACC,
      ['*',     'k-maestra', 'admin', '', '', ''],
      ['Alfa',  'k-alfa', 'supervisor', 'Alfa S.A., Alfa', '', 'k-hseq'],
      ['Gamma', 'k-gamma', 'admin', 'Alfa S.A., Alfa', '', 'k-gamma-hseq']],
    'Respuestas de formulario 1': [new Array(130).fill(''), new Array(130).fill(''),
      p223Test('Alfa S.A.', 'ANA ALFA',  new Date(P223_T.alfa2), 5),
      p223Test('Alfa',      'LUIS ALFA', new Date(P223_T.alfa1), 3)],
    'Bitácora': [P223_BIT,
      p223Bit('17/09/2026 20:45', 'Alfa S.A.', 'nomina_sync', 'ANA ALFA', P223_T.bitA)],
    'Sesiones': [P223_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionActividad', 'validarAcceso', 'esAdminMaestro_']);
  const hseq = api.validarAcceso('Alfa', 'k-hseq', 'd');
  PRUEBAS.cierto(!!hseq && hseq.vista === 'hseq', 'guarda: la contraseña HSQ abre la vista de Dirección · ' + JSON.stringify(hseq && hseq.vista));
  PRUEBAS.falso(api.esAdminMaestro_(hseq), 'guarda: y NO es el maestro, así que le toca el recorte');

  const d = P223_J(api.accionActividad({ usuario:'Alfa', pass:'k-hseq', dispositivoId:'d' }));
  PRUEBAS.cierto(d.ok === true, 'guarda: Dirección recibe el panel');
  PRUEBAS.igual(d.sinNombres, true, '🔴 el servidor DECLARA que recortó: el cliente no tiene que adivinarlo');
  PRUEBAS.alMenos((d.items || []).length, 3, 'guarda: y le llegan los movimientos, no una lista vacía');
  /* LO QUE TIENE QUE CAMBIAR · ni un nombre, por NINGÚN campo */
  const crudo = JSON.stringify(d);
  PRUEBAS.falso(/ANA ALFA/i.test(crudo), '🔴 «ANA ALFA» no aparece en NINGÚN campo del payload');
  PRUEBAS.falso(/LUIS ALFA/i.test(crudo), '🔴 ni «LUIS ALFA»');
  PRUEBAS.cierto((d.items || []).every(i => !i.persona),
    '🔴 y `persona` viene vacío en todos, también en las filas de bitácora (el `Sujeto` es un nombre)');
  /* LO QUE NO PUEDE CAMBIAR · el maestro SÍ los ve: si se recortara a todos, el panel del
     administrador —que es para quien se construyó— quedaría inútil. */
  const mae = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d' }));
  PRUEBAS.igual(mae.sinNombres, false, '🔴 NO PUEDE CAMBIAR · al maestro no se le recorta');
  PRUEBAS.cierto(/ANA ALFA/.test(JSON.stringify(mae)),
    '🔴 NO PUEDE CAMBIAR · y sí ve los nombres: es el panel del administrador');
  /* Y el supervisor de la misma empresa también los ve: no es Dirección. */
  const sup = P223_J(api.accionActividad({ usuario:'Alfa', pass:'k-alfa', dispositivoId:'d' }));
  PRUEBAS.igual(sup.sinNombres, false, '🔴 NO PUEDE CAMBIAR · el supervisor de la empresa tampoco se recorta');

  /* ⚠️ EL ATAQUE: «admin» ESCRITO A MANO en la columna C de `Accesos`, que es una hoja que edita
     gente. Si el recorte se decidiera por `acc.rol` en vez de por `esAdminMaestro_`, esta cuenta
     entraría a Dirección y se llevaría los nombres — la fuga exacta que A8/P091 ya pagó. */
  const falsoAdmin = api.validarAcceso('Gamma', 'k-gamma-hseq', 'd');
  PRUEBAS.igual(falsoAdmin && falsoAdmin.vista, 'hseq', 'guarda: entra como Dirección');
  PRUEBAS.igual(falsoAdmin && String(falsoAdmin.rol), 'admin',
    'guarda: y su columna C dice «admin» — el escenario del ataque, no una hipótesis');
  PRUEBAS.falso(api.esAdminMaestro_(falsoAdmin),
    'guarda: pero NO es el maestro, y eso es lo único que vale');
  const g = P223_J(api.accionActividad({ usuario:'Gamma', pass:'k-gamma-hseq', dispositivoId:'d' }));
  PRUEBAS.igual(g.sinNombres, true,
    '🔴 a la cuenta con «admin» a mano TAMBIÉN se le recorta: el rol de una celda no abre la lámina');
  PRUEBAS.falso(/ANA ALFA|LUIS ALFA/i.test(JSON.stringify(g)),
    '🔴 y no se lleva ni un nombre');
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   LOS SEIS HALLAZGOS DEL VERIFICADOR (2026-10-04). Cada uno con su escenario, porque los seis
   eran correcciones y cinco de ellos los introduje yo en este mismo prompt.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 H1 · el CONTEO de los que faltan viaja también a Dirección, aunque los nombres no', () => {
  /* EL DERECHO, y por qué es el hallazgo más caro del prompt: `accionSupervisor` vacía
     `nominaSinDato` para `hseq` por privacidad (K1b), y su propio comentario dice desde P096 «a
     Dirección le va el NÚMERO, no los nombres» — pero el número nunca viajaba. El panel de
     movimientos empezó a calcular `medidos = total − sinDato.length` y, con la lista vacía, le
     afirmó a Dirección que **toda la nómina estaba medida**: 20/20/0 contra el 20/17/3 real,
     medido contra el CH. Una lista vacía NO significa «no falta nadie»: significa «no te la puedo
     dar». Lo concede `nominaSinDatoN`, que se calcula ANTES del recorte. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P223_ACC, ['Alfa', 'k-alfa', 'supervisor', 'Alfa', '', 'k-hseq']],
    'Respuestas de formulario 1': [new Array(130).fill(''), new Array(130).fill(''),
      p223Test('Alfa', 'ANA ALFA', new Date(P223_T.alfa2), 5)],
    /* dos en la nómina y sólo una con test: falta exactamente UNA */
    'Nómina': [['Empresa','Nombre y apellido','Cédula','Departamento','Cargo','Sexo','Edad',
                'Teléfono','Email','¿Es piloto?','ID de piloto','Rol en la app','Nivel de riesgo',
                'Estado','¿Supervisor?','¿Servicio médico?','¿Dirección?'],
      ['Alfa','ANA ALFA','V-1','Operaciones','Piloto','','','','','','','','','','','',''],
      ['Alfa','ZOE ALFA','V-2','Operaciones','Piloto','','','','','','','','','','','','']],
    'Sesiones': [P223_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor']);
  const P = p => { try { return JSON.parse(api.accionSupervisor(p).getContent()); } catch (e) { return {}; } };
  const sup  = P({ usuario:'Alfa', pass:'k-alfa',  dispositivoId:'d' });
  const dir  = P({ usuario:'Alfa', pass:'k-hseq',  dispositivoId:'d' });
  PRUEBAS.igual(dir.vista, 'hseq', 'guarda: la contraseña HSQ abre Dirección');
  PRUEBAS.igual(sup.nominaTotal, 2, 'guarda: dos personas en la nómina');
  /* LO QUE TIENE QUE CAMBIAR · el número llega a las dos vistas */
  PRUEBAS.igual(sup.nominaSinDatoN, 1, '🔴 el supervisor recibe el conteo (1)');
  PRUEBAS.igual(dir.nominaSinDatoN, 1,
    '🔴 y DIRECCIÓN TAMBIÉN: sin esto el panel le afirma que están todos medidos');
  /* LO QUE NO PUEDE CAMBIAR · los nombres siguen recortados */
  PRUEBAS.igual((dir.nominaSinDato || []).length, 0, '🔴 NO PUEDE CAMBIAR · a Dirección sin nombres');
  PRUEBAS.igual((sup.nominaSinDato || []).join(), 'ZOE ALFA', '🔴 NO PUEDE CAMBIAR · al supervisor con nombres');
  PRUEBAS.falso(/ZOE ALFA/.test(JSON.stringify(dir)), '🔴 y «ZOE ALFA» no aparece en NINGÚN campo del payload de Dirección');
});

PRUEBAS.caso('🔴 H2 · la acción de SÓLO LECTURA no crea la hoja `Bitácora` ni la formatea', () => {
  /* EL FRENO: `leerHojaBitacoraSiExiste_` en vez de `obtenerHojaBitacora`, que CREA la hoja y le
     aplica `setNumberFormat` en cada acceso. La acción se declara de sólo lectura, R3 dice que la
     bitácora no se toca, y `movCargarSiHaceFalta` la dispara en cada login y cada cambio de
     empresa — incluido el visor, que tiene la garantía escrita de no escribir (P185). */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P223_ACC, ['*', 'k-maestra', 'admin', '', '', '']],
    'Respuestas de formulario 1': [new Array(130).fill(''), new Array(130).fill(''),
      p223Test('Alfa', 'ANA ALFA', new Date(P223_T.alfa2), 5)],
    'Sesiones': [P223_SES]
  });   // ⚠️ SIN hoja `Bitácora` a propósito
  const antes = env.__libro.getSheets().map(h => h.getName()).sort().join(',');
  const api = GS.cargarGs(CTX.gs, env, ['accionActividad']);
  const d = P223_J(api.accionActividad({ usuario:'*', pass:'k-maestra', dispositivoId:'d' }));
  const despues = env.__libro.getSheets().map(h => h.getName()).sort().join(',');
  /* LO QUE TIENE QUE CAMBIAR · la hoja NO aparece */
  PRUEBAS.igual(despues, antes, '🔴 no se creó ninguna hoja: antes la acción de lectura la creaba');
  PRUEBAS.falso(/Bit/.test(despues), '🔴 y `Bitácora` no está entre las hojas · ' + despues);
  /* LO QUE NO PUEDE CAMBIAR · el resto sigue funcionando y el problema SE DICE */
  PRUEBAS.cierto(d.ok === true, '🔴 NO PUEDE CAMBIAR · los tests igual llegan');
  PRUEBAS.igual(d.total, 1, '🔴 NO PUEDE CAMBIAR · con el registro del formulario');
  PRUEBAS.cierto(/Bit/.test(String(d.error || '')),
    '🔴 y el error se DICE en vez de fingir «no hay actividad» · ' + d.error);
});

PRUEBAS.caso('🔴 H4 · `ts` y `fecha` salen de la MISMA columna, nunca de dos', () => {
  /* EL DERECHO: las dos líneas de `parseRegistros` usan `fila[COL_FECHA-1] || fila[COL_MARCA-1]`,
     en ese orden. Mi primera versión puso la MARCA primero para `ts` mientras `fecha` usaba la
     columna 74: evité releer la hoja y metí la divergencia por la otra puerta. Medido con el CH
     real: **129 de 452 registros (29 %)** caían en días distintos, con casos de +12, −45 y −365
     días — la misma pantalla fechaba un test el 5 de julio y el 23 de junio. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  /* Las dos columnas con instantes DISTINTOS a propósito: si `ts` prefiriera otra, se nota. */
  const fila = p223Test('Alfa', 'ANA ALFA', new Date(P223_T.alfa2), 5);
  fila[0]  = new Date(Date.UTC(2026, 0, 15, 10, 0));   // marca temporal: 15 de enero
  fila[73] = new Date(P223_T.alfa2);                    // columna Fecha: 20 de septiembre
  const env = GS.crearEntorno({
    'Accesos': [P223_ACC, ['*', 'k-maestra', 'admin', '', '', '']],
    'Respuestas de formulario 1': [new Array(130).fill(''), new Array(130).fill(''), fila],
    'Sesiones': [P223_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['parseRegistros']);
  const r = api.parseRegistros(env.__libro.getSheetByName('Respuestas de formulario 1').getDataRange().getValues())[0];
  PRUEBAS.cierto(!!r, 'guarda: el registro entró');
  /* El día del `ts` se compara en la MISMA zona que `fecha` — compararlo en UTC da 10 falsos
     positivos, que es el error que cometí midiendo esto. */
  const d = new Date(r.ts);
  const diaLocal = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  PRUEBAS.igual(diaLocal, r.fecha,
    '🔴 `ts` y `fecha` son el MISMO día: si `ts` prefiriera la marca temporal, diría enero · ' + diaLocal + ' vs ' + r.fecha);
});

PRUEBAS.caso('🔴 H5 y H6 · ni una celda basura ni un día inexistente se vuelven «Último movimiento»', () => {
  /* LOS DOS FRENOS: `tsEnVentana_` (cota) y la validación del día antes de tocar `Date`.
     · SIN COTA: `tsDeMarca_` aceptaba cualquier `number > 1000` como serial, así que un `9999999`
       daba el año **29279** y, como el panel ordena descendente, se quedaba con el titular y
       empujaba el movimiento real al segundo puesto. `new Date(8.64e14)` es válido: `isNaN` no
       atrapa nada. Y no es hipotético — la fila 350 del formulario YA tiene un `365` ahí.
     · SIN GUARDA DE ROLLOVER: la rama larga se copió de `normFecha` y le faltaba la validación que
       `normFecha` tiene escrita diez líneas más arriba. `"Wed Feb 30 2026"` daba 2026-03-02.
       Y `normFecha` NO valida el día en su rama `dd/mm`, así que `"31/02/2026 10:00"` llegaba como
       2026-03-03 por el fallback — el mismo valor que el comentario presumía de rechazar. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({ 'Sesiones': [P223_SES] });
  const api = GS.cargarGs(CTX.gs, env, ['tsDeMarca_']);
  /* LO QUE TIENE QUE CAMBIAR · basura y días inexistentes se descartan (0 = fila sin ubicar) */
  PRUEBAS.igual(api.tsDeMarca_(9999999), 0, '🔴 COTA · un serial absurdo (año 29279) se descarta');
  PRUEBAS.igual(api.tsDeMarca_('01/01/2099 10:00'), 0, '🔴 COTA · un año tipeado mal se descarta');
  PRUEBAS.igual(api.tsDeMarca_(new Date(1990, 0, 1)), 0, '🔴 COTA · una fecha de antes del sistema se descarta');
  PRUEBAS.igual(api.tsDeMarca_('31/02/2026 10:00'), 0, '🔴 ROLLOVER · «31 de febrero» no sale como 3 de marzo');
  PRUEBAS.igual(api.tsDeMarca_('Wed Feb 30 2026 10:00:00 GMT-0300'), 0, '🔴 ROLLOVER · «Feb 30» tampoco');
  PRUEBAS.igual(api.tsDeMarca_('Mon Apr 31 2026 08:00:00 GMT-0300'), 0, '🔴 ROLLOVER · «Apr 31» tampoco');
  /* LO QUE NO PUEDE CAMBIAR · lo legítimo sigue entrando */
  PRUEBAS.cierto(api.tsDeMarca_('Sat Feb 29 2024 10:00:00 GMT-0300') > 0,
    '🔴 NO PUEDE CAMBIAR · el 29 de febrero de un año bisiesto SÍ entra');
  PRUEBAS.cierto(api.tsDeMarca_('03/10/2026') > 0, '🔴 NO PUEDE CAMBIAR · una fecha normal');
  PRUEBAS.cierto(api.tsDeMarca_(new Date(2026, 9, 3, 10, 0)) > 0, '🔴 NO PUEDE CAMBIAR · un `Date` real');
  PRUEBAS.cierto(api.tsDeMarca_(46298) > 0, '🔴 NO PUEDE CAMBIAR · un serial de Sheets de 2026');
});

PRUEBAS.caso('🔴 H7 · Dirección no se entera de que se abrió un caso, ni ve el `actor`', () => {
  /* EL FRENO: `ACT_OCULTAS_HSEQ_GS`. El cliente ya tenía esta regla escrita
     (`HSEQ_ACCIONES_OCULTAS = { caso_odoo:1 }`): «Dirección es la EMPRESA CONTRATANTE… ni la
     empresa ni la persona deben enterarse de que se abrió un caso». Pero ese filtro vive en el
     cliente y esta acción no pasa por ahí — y encima P223 le puso etiqueta visible.
     Hoy no es alcanzable en producción (necesita credencial HSQ Y `casosOdoo.activo`, que arranca
     apagado), pero el día que alguien cargue esa fila la fuga aparece sin tocar este código. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = GS.crearEntorno({
    'Accesos': [P223_ACC, ['Alfa', 'k-alfa', 'supervisor', 'Alfa', '', 'k-hseq']],
    'Bitácora': [P223_BIT,
      p223Bit('17/09/2026 20:45', 'Alfa', 'caso_odoo', 'ANA ALFA', P223_T.bitA),
      p223Bit('16/09/2026 10:00', 'Alfa', 'nomina_sync', 'ANA ALFA', P223_T.alfa1)],
    'Sesiones': [P223_SES]
  });
  const api = GS.cargarGs(CTX.gs, env, ['accionActividad']);
  const dir = P223_J(api.accionActividad({ usuario:'Alfa', pass:'k-hseq', dispositivoId:'d', n:'50' }));
  const sup = P223_J(api.accionActividad({ usuario:'Alfa', pass:'k-alfa', dispositivoId:'d', n:'50' }));
  /* LO QUE TIENE QUE CAMBIAR · a Dirección no le llega el caso ni el actor */
  PRUEBAS.falso((dir.items || []).some(i => /caso_odoo/.test(i.que)),
    '🔴 Dirección NO recibe la línea del caso');
  PRUEBAS.falso((dir.items || []).some(i => i.actor), '🔴 ni el campo `actor`');
  PRUEBAS.falso(/ANA ALFA/.test(JSON.stringify(dir)), '🔴 ni el nombre, por ningún campo');
  /* LO QUE NO PUEDE CAMBIAR · lo demás sí, y el supervisor ve todo */
  PRUEBAS.igual((dir.items || []).length, 1, '🔴 NO PUEDE CAMBIAR · igual recibe la otra acción');
  PRUEBAS.igual((sup.items || []).length, 2, '🔴 NO PUEDE CAMBIAR · el supervisor ve las dos, caso incluido');
  PRUEBAS.cierto((sup.items || []).some(i => /caso_odoo/.test(i.que)),
    '🔴 NO PUEDE CAMBIAR · el caso le llega a quien sí puede verlo');
});
