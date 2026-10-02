/* ── DISCRIMINADOR de P214 · «un verde no vale sin haber visto el rojo» ────────────────────────
   (2026-10-02)

   P214 cerró NUEVE lugares con una sola regla (`esAdminMaestro_`). Eso hace que un discriminador
   ingenuo sea engañoso en los dos sentidos: revertir sólo el helper tumba todo a la vez y no dice
   qué lugar mide cada caso; revertir sólo un lugar deja los otros ocho tapando el defecto.
   Por eso van SEIS reversiones independientes:

     A · `esAdminMaestro_` vuelve a ser `acc.rol === "admin"` — la raíz. Debe caer TODO.
     B · `accionSupervisor` vuelve a filtrar sólo con empresa concreta — el panel entero.
     C · `accesoPanel_` pierde la guarda de la lista — el visor sobre empresa ajena.
     D · `ausScope` pierde la suya — ausencias, opiniones, credenciales (9 llamadores).
     E · el índice de ausencias de `accionSupervisor` — el dato va en la CLAVE (A13).
     F · `accionIdentidadesInforme` — el padrón del CH entero.

   ⚠️ E y F NO ESTABAN en la primera versión, y el verificador midió que esos dos arreglos no los
   vigilaba NADA: ni este script ni los casos. Y cuando los agregué, mis dos métricas nuevas daban
   `false` incluso para el maestro —el índice de ausencias vuelve `{}` sin `p.empresa`, y el informe
   cuenta `enPadron`, no `candidatos`— así que no medían nada. Lo cazaron las guardas de
   `NO_PUEDE`, que es para lo que están.

   ⚠️ Y LAS DOS MITADES de cada una: lo que TIENE que cambiar (el admin de fila deja de ver lo
   ajeno) y lo que NO PUEDE cambiar (el maestro ve todo, el supervisor ve lo suyo). Un
   discriminador que sólo mira la primera no distingue «lo cerré» de «dejé a todos sin acceso».

   Desde `silva-salud-fatiga/`:   node pruebas/discriminador-p214.js
   Sale 0 si discrimina, 1 si no, 3 si no pudo medir. */

const fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
const RAIZ = path.resolve(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(RAIZ, 'pruebas/emulador-gs.js'), 'utf8'), { filename: 'emulador-gs.js' });

const GS_PATH = path.resolve(RAIZ, '..', 'ENDPOINT_STANDALONE_MODIFICADO.gs');
if (!fs.existsSync(GS_PATH)) { console.log('🔴 no encuentro el `.gs` en ' + GS_PATH); process.exit(3); }
const real = fs.readFileSync(GS_PATH, 'utf8');

const REV = [
  { nombre: 'A · `esAdminMaestro_` vuelve a ser `acc.rol === "admin"` (la raíz de las nueve)',
    busca: '  return !!acc && acc.rol === "admin" && acc.empresas === null && acc.canonical == null;',
    pone:  '  return !!acc && acc.rol === "admin";' },
  { nombre: 'B · `accionSupervisor` vuelve a filtrar sólo con empresa concreta (el panel entero)',
    busca: `    var permitidasS = empresasPermitidas_(acc);          // \`null\` sólo para el maestro`,
    pone:  `    var permitidasS = null;   // REVERTIDO` },
  { nombre: 'C · `accesoPanel_` pierde la guarda de la lista (el visor sobre empresa ajena)',
    /* ⚠️ El ancla cambió cuando se invirtió el orden del candado (primero resolver la cuenta
       destino, después validar SU canónico). Un ancla vieja hace que el script aborte con
       «no encontré estos puntos de reversión», que es lo correcto: falla cerrado en vez de
       informar un verde sobre una reversión que no se aplicó. */
    busca: '    var permitidasV = empresasPermitidas_(acc);\n    if (permitidasV && permitidasV.indexOf(norm(nominaEmpresaCanon(construirAlias(), cta.canonical || ve))) < 0) {',
    pone:  '    var permitidasV = null;   // REVERTIDO\n    if (permitidasV) {' },
  { nombre: 'E · el ÍNDICE DE AUSENCIAS pierde la guarda (el dato está en la CLAVE, A13)',
    busca: `        if (acc.rol === "admin" && !esAdminMaestro_(acc)
            && empresasPermitidas_(acc).indexOf(norm(empAus)) < 0) {
          empAus = (acc.canonical || (acc.empresas && acc.empresas[0]) || "");
        }`,
    pone:  `        // REVERTIDO` },
  { nombre: 'F · `accionIdentidadesInforme` vuelve a `acc.rol !== "admin"` (el padrón del CH entero)',
    busca: '  var permitidas = null;\n  if (!esAdminMaestro_(acc)) {',
    pone:  '  var permitidas = null;\n  if (acc.rol !== "admin") {' },
  { nombre: 'D · `ausScope` pierde la suya (ausencias, opiniones, credenciales: 9 llamadores)',
    busca: `    if (!esAdminMaestro_(acc)) {
      var canonE = nominaEmpresaCanon(alias, e);
      if (empresasPermitidas_(acc).indexOf(norm(canonE)) < 0) {
        return nominaEmpresaCanon(alias, acc.canonical || (acc.empresas && acc.empresas[0]) || "");
      }
      return canonE;
    }
    return nominaEmpresaCanon(alias, e);`,
    pone:  `    return nominaEmpresaCanon(alias, e);   // REVERTIDO` }
];

const comoLista = r => Array.isArray(r.busca) ? r.busca : [r.busca];
const aplicar = (txt, r) => comoLista(r).reduce((acc, b) => acc.split(b).join(r.pone), txt);
const falta = REV.filter(r => comoLista(r).some(b => real.split(b).length - 1 !== 1));
if (falta.length) {
  console.log('🔴 no encontré estos puntos de reversión: no puedo medir.');
  falta.forEach(r => console.log('   · ' + r.nombre));
  process.exit(3);
}

const HOY = (function () { const d = new Date(), z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); })();
const CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const HOJAS = () => ({
  'Accesos': [CAB,
    ['*', 'km', 'admin', '', '', ''],                       // el maestro
    ['Grupo Norte', 'kgn', 'admin', 'Aerocentro', '', ''],   // admin DE FILA
    ['Aeropostal', 'kap', 'supervisor', 'Aeropostal', '', '']],
  'Nómina': [['Empresa', 'Nombre', 'Cedula', 'Departamento', 'Cargo'],
    ['Aerocentro', 'ANA SUAREZ', 'V-111', 'Operaciones', 'Piloto'],
    ['Aeropostal', 'PEDRO GOMEZ', 'V-222', 'Mantenimiento', 'Tecnico']],
  /* ⚠️ `Operacional` CON FILAS DE LAS DOS EMPRESAS, y es lo que hacía falta para medir la fuga más
     grande. La primera versión de este discriminador no tenía ninguna métrica sobre el panel de
     `accionSupervisor`, así que la reversión B salía «NO DISCRIMINA» — no porque la defensa
     estuviera de más, sino porque el medidor no miraba ahí. Un medidor que no mide lo que dice es
     el defecto que este proyecto ya pagó varias veces.
     Se mide por `operacional` y no por `registros` porque `Respuestas de formulario 1` tiene ~90
     columnas con dos filas de encabezado, y el MISMO `enAlcance` filtra los cuatro conjuntos. */
  'Operacional': [['Fecha', 'Hora', 'ISO', 'IdEvento', 'Persona', 'Empresa', 'Departamento', 'Cargo', 'Evento', 'Test', 'Resultado', 'Plan'],
    [HOY, '08:00', HOY + 'T08:00:00', 'e1', 'ANA SUAREZ', 'Aerocentro', 'Operaciones', 'Piloto', 'inicio', '', '', ''],
    [HOY, '09:00', HOY + 'T09:00:00', 'e2', 'PEDRO GOMEZ', 'Aeropostal', 'Mantenimiento', 'Tecnico', 'inicio', '', '', '']],
  /* `AUS_HEAD` real: 12 columnas, `Cedula` antes de `Persona`, la 8ª es `Estado` = «vigente». */
  'Ausencias': [['IdAusencia', 'Empresa', 'Cedula', 'Persona', 'Desde', 'Hasta', 'Motivo', 'Estado', 'Marcada', 'MarcadaPor', 'Anulada', 'AnuladaPor'],
    ['a1', 'Aeropostal', 'V-222', 'PEDRO GOMEZ', HOY, HOY, 'franco', 'vigente', '', '', '', ''],
    ['a2', 'Aerocentro', 'V-111', 'ANA SUAREZ', HOY, HOY, 'franco', 'vigente', '', '', '', '']],
  'Config Empresa': [['Empresa', 'Clave', 'Valor']],
  /* `SES_HEAD` real: 13 columnas, `HashToken` segunda. El fixture de 11 dejaba todo corrido. */
  'Sesiones': [['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical', 'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada']],
  'Bitácora': [['Fecha', 'Empresa', 'Accion', 'Sujeto', 'Actor', 'Rol', 'Origen', 'Detalle', 'Umbral', 'App', 'Id', 'Hash', 'Extra']]
});

/* Lo que se mide en cada corrida. Cada clave es un HECHO observable, no una opinión. */
function medir(txt) {
  const env = GS.crearEntorno(HOJAS());
  const api = GS.cargarGs(txt, env, ['validarAcceso', 'accesoPanel_', 'ausScope', 'construirAlias',
    'accionNominaListar', 'cuentasPanel_', 'empresasPermitidas_', 'accionSupervisor',
    'accionIdentidadesInforme']);
  const alias = api.construirAlias();
  const deFila = api.validarAcceso('Grupo Norte', 'kgn', 'd');
  const maestro = api.validarAcceso('*', 'km', 'd');
  const sup = api.validarAcceso('Aeropostal', 'kap', 'd');
  const nom = (u, p) => { try {
    const d = JSON.parse(api.accionNominaListar({ usuario: u, pass: p, dispositivoId: 'd' }).getContent());
    return (d.nomina || []).map(x => String(x.persona));
  } catch (e) { return ['ERROR:' + e.message]; } };
  const visor = (u, p, ve) => { try {
    const a = api.accesoPanel_({ usuario: u, pass: p, dispositivoId: 'd', verEmpresa: ve, verVista: 'medico' });
    return !!(a && a.visor) && !(a && a.visorError);
  } catch (e) { return 'ERROR'; } };
  const cuentasDe = (acc) => { try {
    return api.cuentasPanel_(api.empresasPermitidas_(acc)).map(x => String(x.empresa));
  } catch (e) { return ['ERROR']; } };
  /* LA MÉTRICA DE LA FUGA MÁS GRANDE: qué personas trae el panel en `operacional`. Se entra por
     `accionSupervisor`, que es la acción real, y SIN mandar `empresa` — que es justo el estado en
     que la rama vieja no filtraba nada. */
  const panelPersonas = (u, pw) => { try {
    const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd' }).getContent());
    return (d.operacional || []).map(x => String(x.persona || ''));
  } catch (e) { return ['ERROR:' + e.message]; } };
  /* el ÍNDICE de ausencias: el dato va en la CLAVE (`cedula|fecha`, `n:nombre|fecha`), así que
     ninguna anonimización lo tapa — es lo que advierte A13 en el propio `.gs`.
     ⚠️ HAY QUE PEDIR LA EMPRESA. Sin `p.empresa` el índice vuelve `{}` para CUALQUIER admin
     —`if (!empAus …) return {}`, preexistente y correcto—, así que medirlo sin empresa daba
     `false` para todos y mis dos guardas lo cazaron como «se rompió un acceso legítimo». No se
     había roto nada: la métrica no medía. */
  const ausIndice = (u, pw, emp) => { try {
    const d = JSON.parse(api.accionSupervisor({ usuario: u, pass: pw, dispositivoId: 'd',
      empresa: emp }).getContent());
    return Object.keys(d.ausencias || {}).join(' | ');
  } catch (e) { return 'ERROR'; } };
  /* el informe de identidades: se mide por `enPadron` y `alcance`, no por `candidatos`, que vienen
     vacíos sin filas en `Respuestas de formulario 1` (90 columnas, dos encabezados: no vale
     fabricarlas para esto). `enPadron` cuenta las personas del padrón RECORTADO. */
  const padron = (u, pw) => { try {
    const d = JSON.parse(api.accionIdentidadesInforme({ usuario: u, pass: pw, dispositivoId: 'd' }).getContent());
    return { n: Number(d.enPadron || 0), alcance: String(d.alcance || '') };
  } catch (e) { return { n: -1, alcance: 'ERROR' }; } };
  return {
    /* LO QUE TIENE QUE CAMBIAR */
    filaVeNominaAjena:   nom('Grupo Norte', 'kgn').indexOf('PEDRO GOMEZ') >= 0,
    filaAbreVisorAjeno:  visor('Grupo Norte', 'kgn', 'Aeropostal'),
    filaAusenciaAjena:   String(api.ausScope(deFila, alias, 'Aeropostal')).toLowerCase().indexOf('aeropostal') === 0,
    filaVeCuentasAjenas: cuentasDe(deFila).indexOf('Aeropostal') >= 0,
    filaVePanelAjeno:    panelPersonas('Grupo Norte', 'kgn').indexOf('PEDRO GOMEZ') >= 0,
    filaVeAusenciaAjena: /222|pedro/i.test(ausIndice('Grupo Norte', 'kgn', 'Aeropostal')),
    filaVePadronAjeno:   padron('Grupo Norte', 'kgn').n > 1,
    /* LO QUE **NO** PUEDE CAMBIAR */
    maestroVeTodaLaNomina: (() => { const l = nom('*', 'km'); return l.indexOf('PEDRO GOMEZ') >= 0 && l.indexOf('ANA SUAREZ') >= 0; })(),
    maestroAbreVisor:      visor('*', 'km', 'Aeropostal'),
    maestroAusenciaLibre:  api.ausScope(maestro, alias, 'Aeropostal') === 'Aeropostal',
    maestroVeTodasCuentas: cuentasDe(maestro).indexOf('Aeropostal') >= 0,
    filaVeLaSuya:          nom('Grupo Norte', 'kgn').indexOf('ANA SUAREZ') >= 0,
    filaAbreVisorPropio:   visor('Grupo Norte', 'kgn', 'Aerocentro'),
    supVeLoSuyo:           nom('Aeropostal', 'kap').indexOf('PEDRO GOMEZ') >= 0,
    supNoVeLoAjeno:        nom('Aeropostal', 'kap').indexOf('ANA SUAREZ') < 0,
    supAnclado:            api.ausScope(sup, alias, 'Aerocentro') === 'Aeropostal',
    /* y las dos guardas que hacen valer la métrica nueva: si el panel viniera vacío para todos,
       `filaVePanelAjeno:false` no mediría nada */
    maestroVePanelEntero:  (() => { const l = panelPersonas('*', 'km');
                              return l.indexOf('PEDRO GOMEZ') >= 0 && l.indexOf('ANA SUAREZ') >= 0; })(),
    filaVePanelPropio:     panelPersonas('Grupo Norte', 'kgn').indexOf('ANA SUAREZ') >= 0,
    /* y las guardas de las dos métricas nuevas: sin esto, un informe o un índice vacío para TODOS
       haría pasar `filaVe…Ajeno:false` sin medir nada */
    maestroVeAusenciaAjena: /222|pedro/i.test(ausIndice('*', 'km', 'Aeropostal')),
    maestroVePadronAjeno:   padron('*', 'km').n > 1,
    filaVePadronPropio:     padron('Grupo Norte', 'kgn').n === 1
  };
}

const DEBE_CAMBIAR = ['filaVeNominaAjena', 'filaAbreVisorAjeno', 'filaAusenciaAjena', 'filaVeCuentasAjenas',
                      'filaVePanelAjeno', 'filaVeAusenciaAjena', 'filaVePadronAjeno'];
const NO_PUEDE     = ['maestroVeTodaLaNomina', 'maestroAbreVisor', 'maestroAusenciaLibre', 'maestroVeTodasCuentas',
                      'filaVeLaSuya', 'filaAbreVisorPropio', 'supVeLoSuyo', 'supNoVeLoAjeno', 'supAnclado',
                      'maestroVePanelEntero', 'filaVePanelPropio',
                      'maestroVeAusenciaAjena', 'maestroVePadronAjeno', 'filaVePadronPropio'];

let base;
try { base = medir(real); } catch (e) { console.log('🔴 no pude medir el `.gs` tal cual: ' + e.message); process.exit(3); }
console.log('── TAL CUAL ESTÁ (lo que P214 dejó) ──');
DEBE_CAMBIAR.forEach(k => console.log(`   ${base[k] ? '🔴' : '✅'} ${k} = ${base[k]}   (se espera false)`));
NO_PUEDE.forEach(k    => console.log(`   ${base[k] ? '✅' : '🔴'} ${k} = ${base[k]}   (se espera true)`));

let fallo = 0;
if (DEBE_CAMBIAR.some(k => base[k])) { console.log('\n🔴 con el `.gs` TAL CUAL, un admin de fila sigue viendo algo ajeno.'); fallo = 1; }
if (NO_PUEDE.some(k => !base[k]))    { console.log('\n🔴 con el `.gs` TAL CUAL, se rompió un acceso LEGÍTIMO.'); fallo = 1; }

REV.forEach(r => {
  console.log('\n── REVERTIDO · ' + r.nombre + ' ──');
  let m;
  try { m = medir(aplicar(real, r)); }
  catch (e) { console.log('   🔴 el mutante no corre (' + e.message + '): no mide nada'); fallo = 1; return; }
  const reabre = DEBE_CAMBIAR.filter(k => m[k]);
  const rompe  = NO_PUEDE.filter(k => !m[k]);
  DEBE_CAMBIAR.forEach(k => { if (m[k] !== base[k]) console.log(`   ⚡ ${k}: ${base[k]} → ${m[k]}`); });
  if (!reabre.length) {
    console.log('   🔴 NO DISCRIMINA: revertir esto no reabre ninguna fuga. Las defensas vecinas la tapan,');
    console.log('      o la reversión no es la correcta. Un verde así no vale.');
    fallo = 1;
  } else {
    console.log('   ✅ reabre: ' + reabre.join(', '));
  }
  if (rompe.length) console.log('   ⚠️ y además rompe accesos legítimos: ' + rompe.join(', '));
});

console.log(fallo ? '\n🔴 EL DISCRIMINADOR NO PASA.'
  : '\n✅ Las ' + REV.length + ' reversiones reabren fuga, y tal cual está no se rompe ningún acceso legítimo'
    + ' (' + DEBE_CAMBIAR.length + ' métricas de fuga, ' + NO_PUEDE.length + ' de acceso legítimo).');
process.exit(fallo);
