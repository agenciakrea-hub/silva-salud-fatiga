PRUEBAS.grupo('P394a · la puerta `empleado`, del lado del servidor');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   P394a · LO QUE EL SERVIDOR DEJA DE ENTREGAR SIN IDENTIDAD (F098; verificador de P311, H1, V4 y V5)

   Cuatro entradas, las cuatro sólo restringen:
   · `registro` no cambia el nombre de una fila: renombrarse con el de otro abría sus tests (V4).
   · una fila nueva de `registro` lleva el nombre de la nómina si el escrito es otro (V4, «alta nueva con la cédula de otro»).
   · `tareas_mias` no entrega ninguna tarea sin identidad verificada (V5: las que no eran del médico salían con el nombre solo).
   · `credencial_crear` y `tiene_clave` contestan `sin_codigo` en una empresa sin código de registro (H1).

   Cada caso entra por el `.gs` REAL en el emulador (R17), dice qué función niega lo que afirma (R19) y tiene su discriminador: el
   mismo pedido con el `.gs` parchado de vuelta a como estaba en la 2026-11-06.1.

   AYUDANTES DE OTROS ARCHIVOS (por eso va al final de `casos.json` y en `soloConGs`): `p391Hojas`, `p391Parchar`.
   ⚠️ EL REPO ES PÚBLICO: nombres, cédulas y códigos inventados.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Los encabezados de `Registrados Fatiga` tal como los crea `accionRegistro` (cada campo se ubica por encabezado, P147). */
const P394A_REG_CAB = ['Fecha de registro', 'Última actualización', 'Nombre', 'Email', 'Cédula', 'ID Piloto', '¿Piloto?', '¿Supervisor?',
  'Empresa', 'Departamento', 'Cargo', 'Sexo', 'Edad', 'Teléfono', 'Dispositivo', 'Modelo', 'Sistema', 'Navegador', 'App instalada',
  'Idioma', 'Zona horaria', 'Pantalla', 'User-Agent', '¿Servicio médico?'];
const P394A_COD = 'COD-394A';
const P394A = { rosa: ['Rosa Mena', '12345678'], atac: ['Atacante Uno', '22223333'], nuevo: ['Nuevo Sinalta', '44445555'],
                sincod: ['Pedro Sincodigo', '55556666'], otroAtac: ['Otro Atacante', '66667777'], ines: ['Ines Otra', '77778888'] };

function p394aReg(nombre, ced, empresa) {
  const f = new Array(P394A_REG_CAB.length).fill('');
  f[0] = '01/10/2026 10:00'; f[1] = '01/10/2026 10:00'; f[2] = nombre; f[3] = 'antes@ejemplo.com'; f[4] = ced; f[8] = empresa;
  return f;
}
function p394aNomina(empresa, nombre, ced) {
  return [empresa, nombre, ced, 'Operaciones', 'Piloto', '', '', '', 'persona@ejemplo.com', 'No', '', 'empleado', '3'];
}

/* El CH de prueba:
   · Helitec, con código y nómina: Rosa (dada de alta), el atacante (dado de alta) y alguien que todavía no se dio de alta;
   · «Sin Codigo SA», con nómina y sin código;
   · «Otra SA», sin nómina: un atacante dado de alta y una persona fuera del padrón con tests;
   · tests de dos personas fuera del padrón (una en Helitec y otra en Otra SA) y de Rosa;
   · tareas del supervisor para las dos de afuera y una para Rosa. */
function p394aMundo(cambios) {
  const g = cambios ? p391Parchar(CTX.gs, cambios) : { gs: CTX.gs, faltan: [] };
  if (g.faltan.length) return { faltan: g.faltan };
  const opc = {
    tests: [['2026-07-15', '10:40', 'Fuera Delpadron', 7, 2, '', 'Helitec'], ['2026-07-15', '10:41', 'Rosa Mena', 6, 2, '', 'Helitec'],
            ['2026-07-15', '10:42', 'Otra Huerfana', 8, 2, '', 'Otra SA'], ['2026-07-15', '10:43', 'Ines Otra', 5, 2, '', 'Otra SA'],
            ['2026-07-15', '10:44', 'Sin Cedula', 4, 2, '', 'Otra SA']],
    nomina: [p394aNomina('Helitec', ...P394A.rosa), p394aNomina('Helitec', ...P394A.atac), p394aNomina('Helitec', ...P394A.nuevo),
             p394aNomina('Sin Codigo SA', ...P394A.sincod)]
  };
  const tarea = (emp, id, ced, persona, titulo) => [emp, id, ced, persona, 'supervisor', titulo, 'Texto libre del supervisor', '', 'pendiente',
                                                    '2026-11-01T10:00:00Z', '', 'supervisor'];
  const hojas = Object.assign(p391Hojas(opc), {
    'Registrados Fatiga': [P394A_REG_CAB, p394aReg(...P394A.rosa, 'Helitec'), p394aReg(...P394A.atac, 'Helitec'),
                           p394aReg(...P394A.otroAtac, 'Otra SA'), p394aReg(...P394A.ines, 'Otra SA'), p394aReg('Sin Cedula', '', 'Otra SA')],
    'Config Empresa': [['Empresa', 'Clave', 'Valor'], ['Helitec', 'codigoRegistro', P394A_COD]],
    'Credenciales': [['Empresa', 'Cedula', 'Usuario', 'Hash', 'Sal', 'Iteraciones', 'Algoritmo', 'Rol', 'Estado', 'Creada', 'UltimoAcceso']],
    'Tareas': [['Empresa', 'ID', 'Cedula', 'Persona', 'Origen', 'Titulo', 'Detalle', 'Vence', 'Estado', 'Creada', 'Actualizada', 'CreadaPor'],
               tarea('Helitec', 't1', '', 'Fuera Delpadron', 'Descansar antes del vuelo'),
               tarea('Otra SA', 't2', '', 'Otra Huerfana', 'Pasar por la oficina'),
               tarea('Helitec', 't3', P394A.rosa[1], 'Rosa Mena', 'Tarea de Rosa')]
  });
  const env = GS.crearEntorno(hojas);
  env.Date = GS.relojFijo('2026-11-12T15:00:00Z');
  const a = GS.cargarGs(g.gs, env, ['accionRegistro', 'accionEmpleado', 'accionTareasMias', 'accionCredencialCrear', 'accionTieneClave']);
  /* Un dispositivo por pedido: los frenos por dispositivo no son lo que se prueba acá. */
  let n = 0;
  const pedir = (fn, x) => JSON.parse(a[fn](Object.assign({ dispositivoId: 'p394a-' + (++n) }, x)).getContent());
  const hoja = nombre => env.SpreadsheetApp.openById('maestro').getSheetByName(nombre);
  const filasReg = ced => hoja('Registrados Fatiga').getDataRange().getValues().slice(1)
    .filter(r => String(r[4]).replace(/\D/g, '') === ced);
  return {
    faltan: undefined, hoja,
    reg: x => pedir('accionRegistro', x), emp: x => pedir('accionEmpleado', x), tareas: x => pedir('accionTareasMias', x),
    cred: x => pedir('accionCredencialCrear', x), tiene: x => pedir('accionTieneClave', x),
    nombres: ced => filasReg(ced).map(r => r[2]), emails: ced => filasReg(ced).map(r => r[3]),
    cedulasDe: nombre => hoja('Registrados Fatiga').getDataRange().getValues().slice(1).filter(r => r[2] === nombre).map(r => String(r[4])),
    credenciales: ced => hoja('Credenciales').getDataRange().getValues().slice(1).filter(r => String(r[1]).replace(/\D/g, '') === ced).length
  };
}
const p394aLee = r => [r.ok, (r.registros || []).length];
const p394aTitulos = r => (r.tareas || []).map(t => t.titulo);

/* Los parches que devuelven cada cierre a la 2026-11-06.1. Cada texto tiene que aparecer UNA vez (`p391Parchar` lo dice si no). */
const P394A_SIN_V4_RENOMBRE = [['        if ("nombre" in p && !regMismoNombre_(p.nombre, nomGuardado)) {', '        if (false) {']];
/* La PRIMERA versión de P394a: la guarda corría sólo si el nombre traía texto (verificador de P394a, 2). */
const P394A_PRIMERA_VERSION = [['        if ("nombre" in p && !regMismoNombre_(p.nombre, nomGuardado)) {',
                                '        if (String(p.nombre == null ? "" : p.nombre).trim() && !regMismoNombre_(p.nombre, nomGuardado)) {']];
/* Las dos capas del cierre de la cédula `0`, deshechas: cada una sola alcanza para frenarla. */
const P394A_SIN_CEDULA_CERO = [['  var ced = cedulaNorm(p.cedula == null ? "" : p.cedula);', '  var ced = cedulaNorm(p.cedula || "");'],
                               ['        if (!ced) { p = Object.assign({}, p); delete p.cedula; }\n', '']];
const P394A_SIN_V4_ALTA = [['    var nomAlta = regMismoNombre_(p.nombre, enNomina.nombre) ? p.nombre : enNomina.nombre;',
                            '    var nomAlta = p.nombre;']];
const P394A_SIN_V5 = [['    if (!verificada) continue;', '    if (!verificada && filaTarea.origen === "medico") continue;']];
/* En `credencial_crear` el cierre es un bloque: `sin_nomina` primero (verificador de P394a, 6) y después `sin_codigo`. Se saca sólo el segundo. */
const P394A_SIN_CODIGO_CRED = [['    return json(credSinCodigo_());\n  }\n\n  var freno = "__altacred__"', '  }\n\n  var freno = "__altacred__"']];
const P394A_SIN_CODIGO_TIENE = [['  if (!codigoRegistroDe(empCanon)) return json(credSinCodigo_());\n\n  var freno = "__tieneclave__";',
                                 '\n  var freno = "__tieneclave__";']];

PRUEBAS.caso('🔒 P394a · V4 · `registro` no cambia el nombre de una fila: renombrarse con el de otro no abre sus tests, de ninguna empresa', () => {
  /* R19 · lo que lo NIEGA: `accionRegistro`, rama de la fila que ya existe (el nombre es de la empresa, ADR 013). `accionEmpleado` sigue
     verificando contra el padrón (`construirPadron`), que se arma con esos nombres: si el nombre no cambia, el padrón no le asocia el
     de otro a esta cédula. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const [atac, cedA] = P394A.atac;
  PRUEBAS.igual(p394aLee(w.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec', cedula: cedA })), [true, 0], 'CONTROL · antes de renombrarse, nada');
  const r = w.reg({ nombre: 'Fuera Delpadron', cedula: cedA, empresa: 'Helitec', email: 'atacante@ejemplo.com' });
  PRUEBAS.igual([r.ok, r.actualizado], [true, true], 'el pedido se contesta como siempre');
  PRUEBAS.falso('nombreConservado' in r || 'nombre' in r, '🔒 y la respuesta no dice que el nombre quedó: sería un oráculo de cédulas');
  PRUEBAS.igual(w.nombres(cedA), [atac], '🔒 la fila conserva su nombre');
  PRUEBAS.igual(w.emails(cedA), ['atacante@ejemplo.com'], 'CONTROL · el resto del perfil se sigue actualizando');
  PRUEBAS.igual(p394aLee(w.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec', cedula: cedA })), [true, 0], '🔒 con su cédula no salen los tests del otro');
  const [, cedO] = P394A.otroAtac;
  w.reg({ nombre: 'Otra Huerfana', cedula: cedO, empresa: 'Otra SA' });
  PRUEBAS.igual(p394aLee(w.emp({ persona: 'Otra Huerfana', empresa: 'Otra SA', cedula: cedO })), [true, 0], '🔒 tampoco en una empresa sin nómina');
  const g = w.reg({ nombre: 'ATACANTE   uno', cedula: cedA, empresa: 'Helitec' });
  PRUEBAS.igual([g.ok, w.nombres(cedA)], [true, ['ATACANTE   uno']], 'CONTROL · otra grafía del mismo nombre sí se escribe: no asocia un nombre nuevo');
  /* DISCRIMINADOR · la 2026-11-06.1: la fila se reescribía entera, nombre incluido */
  const s = p394aMundo(P394A_SIN_V4_RENOMBRE);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    s.reg({ nombre: 'Fuera Delpadron', cedula: cedA, empresa: 'Helitec' });
    PRUEBAS.igual(p394aLee(s.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec', cedula: cedA })), [true, 1], '⚠️ discriminador · así salían los tests del otro: el aserto de arriba lo ve');
    s.reg({ nombre: 'Otra Huerfana', cedula: cedO, empresa: 'Otra SA' });
    PRUEBAS.igual(p394aLee(s.emp({ persona: 'Otra Huerfana', empresa: 'Otra SA', cedula: cedO })), [true, 1], '⚠️ discriminador · y en la empresa sin nómina');
  }
});

PRUEBAS.caso('🔒 P394a · V4 · una fila nueva lleva el nombre de la nómina: darse de alta con la cédula de otro y un nombre ajeno no abre nada', () => {
  /* R19 · lo que lo NIEGA: `accionRegistro`, rama de la fila nueva, con el nombre que da `registroEnNomina_` para esa cédula. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const [nuevo, cedN] = P394A.nuevo;
  PRUEBAS.igual(w.nombres(cedN), [], 'guarda: todavía no se dio de alta');
  const r = w.reg({ nombre: 'Fuera Delpadron', cedula: cedN, empresa: 'Helitec', email: 'x@ejemplo.com' });
  PRUEBAS.igual([r.ok, r.nuevo], [true, true], 'la fila se crea: el alta termina igual en el teléfono');
  PRUEBAS.falso('nombreDeLaNomina' in r || 'nombre' in r, '🔒 sin decir que el nombre cambió');
  PRUEBAS.igual(w.nombres(cedN), [nuevo], '🔒 con el nombre de la nómina, no el escrito');
  PRUEBAS.igual(p394aLee(w.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec', cedula: cedN })), [true, 0], '🔒 y con esa cédula no salen los tests del otro');
  /* CONTROL · el alta de verdad: el nombre de la nómina, con otra grafía, se guarda como se escribió */
  const c = p394aMundo();
  c.reg({ nombre: 'nuevo sinalta', cedula: cedN, empresa: 'Helitec' });
  PRUEBAS.igual(c.nombres(cedN), ['nuevo sinalta'], 'CONTROL · otra grafía del nombre de la nómina se guarda tal cual');
  /* DISCRIMINADOR · la 2026-11-06.1: se guardaba el nombre escrito */
  const s = p394aMundo(P394A_SIN_V4_ALTA);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    s.reg({ nombre: 'Fuera Delpadron', cedula: cedN, empresa: 'Helitec' });
    PRUEBAS.igual(p394aLee(s.emp({ persona: 'Fuera Delpadron', empresa: 'Helitec', cedula: cedN })), [true, 1], '⚠️ discriminador · así salían los tests del otro');
  }
});

PRUEBAS.caso('🔒 P394a · V5 · `tareas_mias` no entrega ninguna tarea sin identidad verificada; con su cédula, la persona recibe las suyas', () => {
  /* R19 · lo que lo NIEGA: `accionTareasMias`, `verificada` (el par exacto de la nómina o, sin nómina, el padrón). Lo que lo CONCEDE a Rosa:
     ese mismo par. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const a = w.tareas({ persona: 'Fuera Delpadron', empresa: 'Helitec' });
  PRUEBAS.igual([a.ok, p394aTitulos(a)], [true, []], '🔒 con el nombre solo, en una empresa con nómina que no la conoce: ninguna');
  PRUEBAS.falso('sinVerificar' in a, '🔒 sin una marca que diga por qué');
  PRUEBAS.igual(p394aTitulos(w.tareas({ persona: 'Otra Huerfana', empresa: 'Otra SA' })), [], '🔒 con el nombre solo, en una empresa sin nómina: ninguna');
  PRUEBAS.igual(p394aTitulos(w.tareas({ persona: 'Otra Huerfana', empresa: 'Otra SA', cedula: '99887766' })), [], '🔒 y con una cédula inventada, tampoco');
  PRUEBAS.igual(p394aTitulos(w.tareas({ persona: 'Rosa Mena', empresa: 'Helitec', cedula: P394A.rosa[1] })), ['Tarea de Rosa'],
                'CONTROL · con su cédula, la persona recibe las suyas');
  /* DISCRIMINADOR · la 2026-11-06.1: las que no eran del médico salían con el nombre */
  const s = p394aMundo(P394A_SIN_V5);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    PRUEBAS.igual(p394aTitulos(s.tareas({ persona: 'Fuera Delpadron', empresa: 'Helitec' })), ['Descansar antes del vuelo'], '⚠️ discriminador · así salían');
    PRUEBAS.igual(p394aTitulos(s.tareas({ persona: 'Otra Huerfana', empresa: 'Otra SA' })), ['Pasar por la oficina'], '⚠️ discriminador · también sin nómina');
  }
});

PRUEBAS.caso('🔒 P394a · H1 · `credencial_crear` no crea ninguna contraseña en una empresa sin código, y contesta lo mismo esté o no la cédula', () => {
  /* R19 · lo que lo NIEGA: `accionCredencialCrear`, `codigoRegistroDe` antes de mirar la cédula. Lo que lo CONCEDE en Helitec: el código. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const [, cedS] = P394A.sincod;
  const r = w.cred({ empresa: 'Sin Codigo SA', cedula: cedS, usuario: 'Pedro Sincodigo', pass: 'ClaveLarga2026' });
  PRUEBAS.igual([r.ok, r.motivo], [false, 'sin_codigo'], '🔒 sin código, ninguna');
  PRUEBAS.igual(w.credenciales(cedS), 0, '🔒 y no queda ninguna fila');
  const x = w.cred({ empresa: 'Sin Codigo SA', cedula: '10101010', pass: 'ClaveLarga2026' });
  PRUEBAS.igual([x.ok, x.motivo, x.error], [r.ok, r.motivo, r.error], '🔒 una cédula que no está recibe exactamente lo mismo');
  PRUEBAS.igual(w.cred({ empresa: 'Otra SA', cedula: P394A.otroAtac[1], pass: 'ClaveLarga2026' }).motivo, 'sin_nomina',
                'sin nómina, dice eso: pedirle un código que tampoco le serviría era mentirle (verificador de P394a, 6)');
  PRUEBAS.igual(w.cred({ empresa: 'Helitec', cedula: P394A.atac[1], pass: 'ClaveLarga2026' }).motivo, 'codigo_invalido',
                'CONTROL · con código cargado y sin mandarlo, como siempre');
  const c = w.cred({ empresa: 'Helitec', cedula: P394A.rosa[1], codigo: P394A_COD, pass: 'ClaveLarga2026' });
  PRUEBAS.igual(c.ok, true, 'CONTROL · con el código, se crea');
  /* DISCRIMINADOR · la 2026-11-06.1: sin código, la puerta quedaba abierta */
  const s = p394aMundo(P394A_SIN_CODIGO_CRED);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    PRUEBAS.igual(s.cred({ empresa: 'Sin Codigo SA', cedula: cedS, pass: 'ClaveLarga2026' }).ok, true, '⚠️ discriminador · así se creaba la de otro');
  }
});

PRUEBAS.caso('🔒 P394a · H1 · `tiene_clave` no dice quién no creó su contraseña en una empresa sin código', () => {
  /* R19 · lo que lo NIEGA: `accionTieneClave`, `codigoRegistroDe` antes de mirar la cédula. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const r = w.tiene({ empresa: 'Sin Codigo SA', cedula: P394A.sincod[1] });
  PRUEBAS.igual([r.ok, r.motivo, 'migrada' in r], [false, 'sin_codigo', false], '🔒 sin código, no contesta por la cédula');
  const x = w.tiene({ empresa: 'Sin Codigo SA', cedula: '10101010' });
  PRUEBAS.igual([x.ok, x.motivo], [r.ok, r.motivo], '🔒 lo mismo para una cédula que no está');
  const c = w.tiene({ empresa: 'Helitec', cedula: P394A.rosa[1], codigo: P394A_COD });
  PRUEBAS.igual([c.ok, c.migrada], [true, false], 'CONTROL · con el código, contesta como siempre');
  /* DISCRIMINADOR · la 2026-11-06.1 */
  const s = p394aMundo(P394A_SIN_CODIGO_TIENE);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    const d = s.tiene({ empresa: 'Sin Codigo SA', cedula: P394A.sincod[1] });
    PRUEBAS.igual([d.ok, d.migrada], [true, false], '⚠️ discriminador · así contestaba a cualquiera');
  }
});

PRUEBAS.caso('🔒 P394a · un nombre vacío no borra el de nadie: con sólo su cédula, a una persona ya no se la saca del padrón', () => {
  /* R19 · lo que lo NIEGA: `accionRegistro`, rama de la fila que ya existe: cualquier nombre que no sea el mismo, VACÍO incluido, deja el
     guardado. Ines está en el padrón sólo por su fila de `Registrados` (Otra SA no tiene nómina), así que sin nombre se queda sin nada. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const [ines, cedI] = P394A.ines;
  PRUEBAS.igual(p394aLee(w.emp({ persona: ines, empresa: 'Otra SA', cedula: cedI })), [true, 1], 'guarda: con su cédula ve sus tests');
  ['', null, '   '].forEach(vacio => {
    const r = w.reg({ nombre: vacio, cedula: cedI, empresa: 'Otra SA' });
    PRUEBAS.igual([r.ok, w.nombres(cedI)], [true, [ines]], '🔒 con el nombre ' + JSON.stringify(vacio) + ', la fila conserva el suyo');
  });
  PRUEBAS.igual(p394aLee(w.emp({ persona: ines, empresa: 'Otra SA', cedula: cedI })), [true, 1], '🔒 y sigue viendo sus tests');
  /* DISCRIMINADOR · la primera versión de P394a: el vacío pasaba, y después ningún nombre lo reponía */
  const s = p394aMundo(P394A_PRIMERA_VERSION);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    s.reg({ nombre: '', cedula: cedI, empresa: 'Otra SA' });
    s.reg({ nombre: ines, cedula: cedI, empresa: 'Otra SA' });   // la app sincroniza su perfil: con la 2026-11-06.1 esto lo reparaba
    PRUEBAS.igual(s.nombres(cedI), [''], '⚠️ discriminador · así quedaba vacío para siempre: el aserto de arriba lo ve');
    PRUEBAS.igual(p394aLee(s.emp({ persona: ines, empresa: 'Otra SA', cedula: cedI })), [true, 0], '⚠️ discriminador · y la persona fuera del padrón');
  }
});

PRUEBAS.caso('🔒 P394a · la cédula `0` como número no le asocia nada a una fila sin cédula: con el nombre de otro no se abren sus tests', () => {
  /* R19 · lo que lo NIEGA, en dos capas que alcanzan cada una sola: `accionRegistro` normaliza la cédula con `== null` (el `0` sigue
     siendo «0», no «sin cédula»), y una fila emparejada por nombre no recibe cédula por ese pedido. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  PRUEBAS.igual(w.cedulasDe('Sin Cedula'), [''], 'guarda: su fila no tiene cédula');
  w.reg({ nombre: 'Sin Cedula', cedula: 0, empresa: 'Otra SA' });
  PRUEBAS.igual(w.cedulasDe('Sin Cedula'), [''], '🔒 la fila sigue sin cédula');
  PRUEBAS.igual(p394aLee(w.emp({ persona: 'Sin Cedula', empresa: 'Otra SA', cedula: '0' })), [true, 0], '🔒 y con «0» no salen sus tests');
  /* DISCRIMINADOR · las dos capas deshechas: así se le escribía «0» */
  const s = p394aMundo(P394A_SIN_CEDULA_CERO);
  PRUEBAS.igual(s.faltan, undefined, 'guarda: el sabotaje entró');
  if (!s.faltan) {
    s.reg({ nombre: 'Sin Cedula', cedula: 0, empresa: 'Otra SA' });
    PRUEBAS.igual(s.cedulasDe('Sin Cedula'), ['0'], '⚠️ discriminador · así quedaba con «0»');
    PRUEBAS.igual(p394aLee(s.emp({ persona: 'Sin Cedula', empresa: 'Otra SA', cedula: '0' })), [true, 1], '⚠️ discriminador · y así salían sus tests');
  }
});

PRUEBAS.caso('P394a · CONTROL · la persona de verdad no pierde nada: se da de alta con su nombre, ve sus tests y actualiza su perfil', () => {
  /* R17 · el camino real de punta a punta, con el `.gs` de este prompt. Lo que CONCEDE cada paso: `accionRegistro` (la cédula en la nómina
     y su nombre), `accionEmpleado` (el padrón y su cédula). */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea (sin .gs)'); return; }
  const w = p394aMundo();
  PRUEBAS.igual(w.faltan, undefined, 'guarda: el mundo se armó');
  if (w.faltan) return;
  const [nuevo, cedN] = P394A.nuevo;
  const a = w.reg({ nombre: nuevo, cedula: cedN, empresa: 'Helitec', email: 'nuevo@ejemplo.com', telefono: '+58 412 0000000' });
  PRUEBAS.igual([a.ok, a.nuevo, w.nombres(cedN)], [true, true, [nuevo]], 'se da de alta con su nombre');
  const [rosa, cedR] = P394A.rosa;
  PRUEBAS.igual(p394aLee(w.emp({ persona: rosa, empresa: 'Helitec', cedula: cedR })), [true, 1], 've sus tests con su cédula');
  const u = w.reg({ nombre: rosa, cedula: cedR, empresa: 'Helitec', email: 'rosa.nueva@ejemplo.com' });
  PRUEBAS.igual([u.ok, u.actualizado, w.nombres(cedR), w.emails(cedR)], [true, true, [rosa], ['rosa.nueva@ejemplo.com']], 'y actualiza su perfil');
});
