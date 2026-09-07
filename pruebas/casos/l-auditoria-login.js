PRUEBAS.grupo('Auditoría del login · nueve defectos, y ninguno lo veía la suite');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   La suite daba 1106/1106 con el flujo nuevo ROTO. El auditor lo dijo con precisión: NINGÚN caso
   ejercitaba `codigo_empresa`, `nominaSoyYo`, `nominaCedulaBuscar` ni el `nomina_confirmar` sin
   nombre. Un verde sobre código que nadie ejecuta no es una garantía, es un adorno.
   Este archivo existe para que cada uno de esos defectos tenga quien lo vea.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

function lAudEnv(nomina, config){
  return GS.crearEntorno({
    'Config Empresa': [["Empresa","Clave","Valor"]].concat(config || []),
    /* ⚠️ EL ALIAS ES EL ESCENARIO. La columna «Empresas» de `Accesos` es de donde
       `construirAlias()` saca que «Helitec» y «Consorcio HELITEC» son la misma empresa. Sin las
       dos formas acá, la prueba del alias no mide nada — se me pasó la primera vez y el caso falló
       por el entorno, no por el código. */
    'Accesos': [["Usuario","Contraseña","Rol","Empresas","ClaveMedica","ClaveHseq"],
                ['Consorcio HELITEC','sup001','supervisor','Consorcio HELITEC, Helitec','med002','dir003']],
    'Nómina': [["Empresa","Nombre y apellido","Cédula","Departamento","Cargo","Sexo","Edad",
                "Teléfono","Email","¿Es piloto?","ID de piloto","Rol en la app","Nivel de riesgo"]]
               .concat(nomina || []),
  });
}
const L_SIETE = ['Ana','Bruno','Carla','Diego','Elena','Fabio','Gaby'].map((n, i) =>
  ['Consorcio HELITEC', n + ' Apellido', 'V-' + (i + 1), 'Op', 'Piloto', 'F', 30,
   '+58', n.toLowerCase() + '@e.com', 'Sí', '', 'empleado', '2']);

PRUEBAS.caso('🔴 el alta funciona para TODAS las personas, no sólo la primera', () => {
  /* EL DEFECTO: `nomina_confirmar` sin nombre se rendía en la PRIMERA fila de la empresa —
     `return` en vez de `continue`—, así que entraba una y fallaban seis. Y cada intento honesto
     sumaba al freno hasta dejar a la persona diez minutos afuera, mientras la app le decía que
     revisara un número que estaba bien.
     Estaba latente sólo porque el código de empresa está vacío: se disparaba el día que se cargue,
     que es el objetivo del bloque. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE), ['accionNominaConfirmar']);
  const entran = [];
  L_SIETE.forEach((f, i) => {
    const r = JSON.parse(api.accionNominaConfirmar({
      empresa: 'Consorcio HELITEC', cedula: 'V-' + (i + 1),
      dispositivoId: 'disp' + i        // uno por persona: el freno es por dispositivo
    }).getContent());
    if (r.ok && r.perfil) entran.push(r.perfil.nombre);
  });
  PRUEBAS.igual(entran.length, 7,
    '⚠️ las SIETE entran con su cédula · antes entraba 1 y fallaban 6 · entraron: ' + entran.join(', '));
  PRUEBAS.igual(entran[6], 'Gaby Apellido', 'y la última de la lista también, no sólo la primera');
});

PRUEBAS.caso('el DISCRIMINADOR: una cédula que NO está sigue fallando', () => {
  /* Sin esto, el caso de arriba daría verde si la acción aceptara cualquier cosa. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE), ['accionNominaConfirmar']);
  const r = JSON.parse(api.accionNominaConfirmar({
    empresa: 'Consorcio HELITEC', cedula: 'V-99999', dispositivoId: 'otro' }).getContent());
  PRUEBAS.falso(!!r.ok, '⚠️ una cédula inventada no entra');
});

PRUEBAS.caso('🔴 el «sólo POST» no se saltea con un parámetro en la URL', () => {
  /* `_post` era un campo más del objeto de parámetros: `?_post=1` en la query saltaba la guarda
     entera. Una guarda que el cliente puede escribir no es una guarda. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const dg = (gs.match(/function doGet\(e\)[\s\S]{0,500}/) || [''])[0];
  PRUEBAS.alMenos(dg.length, 60, 'guarda de medibilidad: se encontró doGet');
  PRUEBAS.cierto(/delete _q\._post/.test(dg),
    '⚠️ `doGet` borra `_post` de lo que llega en la query');
  const dp = (gs.match(/function doPost\(e\)[\s\S]{0,700}/) || [''])[0];
  const iFusion = dp.indexOf('body[k2]'), iPost = dp.indexOf('p._post = true');
  PRUEBAS.cierto(iFusion >= 0 && iPost > iFusion,
    '⚠️ y `doPost` lo asigna DESPUÉS de fusionar · si no, el cliente lo pisaría');
});

PRUEBAS.caso('🔴 con el alta cerrada, un código válido no se distingue por el contador', () => {
  /* El JSON era idéntico pero el ESTADO no: un código correcto con la ventana cerrada no anotaba
     fallo, así que mandándolo siete veces se sabía si era válido —si al séptimo salía
     `codigo_frenado` era falso; si seguía `codigo_invalido`, era VÁLIDO—. Siete POST. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function accionCodigoEmpresa[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 300, 'guarda: se encontró la acción');
  const ramas = (fn.match(/codAnotarFallo/g) || []).length;
  PRUEBAS.alMenos(ramas, 3,
    '⚠️ todas las ramas de rechazo anotan el fallo · ' + ramas + ' encontradas (inválido, ambiguo, cerrado)');
});

PRUEBAS.caso('🔴 el freno del código lee el contador POR EMPRESA, no sólo el del dispositivo', () => {
  /* `codClaveEmpresa` se ESCRIBÍA y no se leía nunca. Como el `dispositivoId` lo manda el cliente,
     rotarlo daba intentos ilimitados: 200 códigos con 200 dispositivos, cero frenados. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE), ['codFrenado', 'codAnotarFallo']);
  PRUEBAS.falso(api.codFrenado('E', 'disp1'), 'guarda: se arranca sin freno');
  /* Se queman intentos ROTANDO el dispositivo, que es lo que hacía inútil al freno viejo. */
  for (let i = 0; i < 70; i++) api.codAnotarFallo('E', 'disp' + i);
  PRUEBAS.cierto(api.codFrenado('E', 'dispCompletamenteNuevo'),
    '⚠️ tras muchos fallos contra la MISMA empresa, un dispositivo nuevo también queda frenado');
  PRUEBAS.falso(api.codFrenado('OtraEmpresa', 'dispCompletamenteNuevo'),
    'y el freno es POR EMPRESA · otra empresa no se ve afectada');
});

PRUEBAS.caso('🔴 un código cargado bajo un alias NO deja la empresa abierta', () => {
  /* `valorConfigPropio` compara el texto de la celda tal cual: un código en la fila «Helitec» no
     se encontraba al preguntar por «Consorcio HELITEC». El código existía, el alta nueva lo
     honraba, y al mismo tiempo `pideCodigo` daba false y la nómina se entregaba SIN código. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'se saltea'); return; }
  const api = GS.cargarGs(CTX.gs, lAudEnv(L_SIETE, [['Helitec', 'codigoRegistro', 'HELI-2026']]),
                          ['verificarCodigoEmpresa', 'perfilPublicoEmpresa', 'codigoRegistroDe']);
  PRUEBAS.igual(api.codigoRegistroDe('Consorcio HELITEC'), 'HELI-2026',
    '⚠️ se encuentra el código aunque la fila diga otra forma del nombre');
  const chk = api.verificarCodigoEmpresa('Consorcio HELITEC', 'HELI-2026');
  PRUEBAS.cierto(chk.pide, '⚠️ y la empresa SÍ pide código · antes decía que no y quedaba abierta');
  PRUEBAS.cierto(chk.ok, 'y el código correcto entra');
  PRUEBAS.cierto(api.perfilPublicoEmpresa('Consorcio HELITEC').pideCodigo,
    '⚠️ y el perfil público lo dice, que es lo que hace que la app muestre el campo');
});

PRUEBAS.caso('⚠️ guardar el perfil no borra el rol que la nómina propuso', () => {
  /* `saveProfile` era el ÚNICO `setProfile` del archivo sin merge: un literal cerrado de 13 campos
     que reemplazaba el perfil entero. Corre tres segundos después de que el alta guarda `rol`, así
     que la pantalla del ofrecimiento no se abría NUNCA. */
  CTX.resetear();
  setProfile(Object.assign({}, getProfile() || {}, { rol: 'supervisor', rolOrigen: 'nomina' }));
  PRUEBAS.igual((getProfile() || {}).rol, 'supervisor', 'guarda de medibilidad: el rol quedó puesto');
  const src = String(saveProfile);
  PRUEBAS.cierto(/Object\.assign\(\{\}, getProfile\(\) \|\| \{\}/.test(src),
    '⚠️ `saveProfile` mergea sobre el perfil previo · era el único que no lo hacía');
  PRUEBAS.falso(/const perfil = \{ nombre, cedula, id_piloto/.test(src),
    'y ya no arma un literal cerrado que pise todo lo demás');
});

PRUEBAS.caso('⚠️ un «Volver» no devuelve la lista de nombres de la nómina', () => {
  /* Cuatro toques —código, Continuar, Volver, Continuar— y la persona caía en «Búscate en la
     lista» con el padrón completo a la vista, porque el origen se INFERÍA de que `NOM.empresa`
     tuviera valor y `nominaResolverCodigo` también la setea. Y esa sesión ya no volvía nunca al
     flujo nuevo. */
  const src = String(nominaCodigoConfirmar);
  PRUEBAS.cierto(/NOM\.empresaPorLista/.test(src),
    '⚠️ el origen se marca con un flag, no se adivina de que la empresa tenga valor');
  PRUEBAS.falso(/if \(NOM\.empresa\) \{ nominaCargarPersonas/.test(src),
    '⚠️ y ya no se infiere · esa premisa era falsa porque resolver el código también la setea');
  PRUEBAS.cierto(/empresaPorLista = true/.test(String(nominaElegirEmpresa)),
    'se pone SÓLO al elegir de la lista');
  PRUEBAS.cierto(/empresaPorLista = false/.test(String(nominaResolverCodigo)),
    'y se limpia al resolver por código');
});

PRUEBAS.caso('🔴 el código de supervisor VIAJA · P099 estaba muerto en el flujo nuevo', () => {
  /* EL DEFECTO: el campo vivía en la pantalla «¿Eres tú?», que es DESPUÉS del único pedido del
     flujo. La persona lo escribía, tocaba «Sí, soy yo» y no pasaba absolutamente nada: el valor se
     guardaba en `NOM.codigoSup`, que nadie leía, y el servidor recibía `undefined` siempre.
     Ahora el campo está en el paso de la CÉDULA, que es antes del pedido. */
  const src = String(nominaCedulaBuscar);
  PRUEBAS.alMenos(src.length, 200, 'guarda de medibilidad: se leyó la función');
  PRUEBAS.cierto(/codigoSup:/.test(src), '⚠️ el pedido lo manda');
  PRUEBAS.cierto(/nomCodigoSup2/.test(src), 'y lo lee del campo de esa misma pantalla');

  /* Y que el campo esté DONDE se lo lee: si vuelve a la pantalla siguiente, esto se pone rojo. */
  const campo = document.getElementById('nomCodigoSup2');
  PRUEBAS.cierto(!!campo, 'guarda: el campo existe');
  if (campo) PRUEBAS.cierto(!!campo.closest('#nomPasoCed'),
    '⚠️ y vive en el paso de la CÉDULA, no en el de confirmar · si no, se manda vacío siempre');

  /* ⚠️ SE MIDE LA ASIGNACIÓN, NO LA PALABRA. Mi primera versión buscaba `NOM.codigoSup` en el
     fuente y se ponía roja por el COMENTARIO que explica el arreglo — el mismo choque que ya me
     costó una vuelta con `depPuedeEscribir`. Un regex sobre el fuente mide la prosa además del
     código, y la prosa cambia sola. */
  PRUEBAS.falso(/NOM\.codigoSup\s*=/.test(String(nominaSoyYo)),
    '⚠️ y ya no se ASIGNA a una variable que nadie lee');
});

PRUEBAS.caso('⚠️ el rol propuesto se muestra con el traductor que YA existía', () => {
  /* Mi primera versión inventó tres claves de traducción que no existen: `t()` habría devuelto la
     clave cruda y la línea nunca se habría pintado. `rolNombre()` ya estaba, y la usa Ajustes. */
  PRUEBAS.cierto(/rolNombre\(/.test(String(nominaRolTexto)),
    '⚠️ usa `rolNombre()`, no un diccionario propio');
  PRUEBAS.igual(nominaRolTexto(''), '', 'sin rol no se pinta nada');
  PRUEBAS.igual(nominaRolTexto('empleado'), '',
    '⚠️ y «empleado» tampoco · es el default, no un ofrecimiento');
  const sup = nominaRolTexto('supervisor');
  PRUEBAS.cierto(!!sup && sup.indexOf('{r}') === -1,
    '⚠️ y un rol real da un texto ya interpolado · ' + sup);
  PRUEBAS.falso(/rol_of_supervisor|rol_of_medico/.test(sup),
    'y nunca una clave cruda del diccionario');
});

PRUEBAS.caso('⚠️ R13 · un botón deshabilitado se puede leer, en los dos temas', () => {
  /* La auditoría visual de las pantallas del login (72 corridas: 6 pantallas × 6 anchos × 2 temas)
     devolvió UN defecto: `#clvBtn` deshabilitado daba 4,22:1 en claro y 4,03:1 en oscuro sobre su
     propio fondo. WCAG exime a los controles deshabilitados, así que no era una violación — pero el
     texto de un botón apagado es lo que le dice a la persona QUÉ está esperando la pantalla, y la
     regla alcanza a los 22 botones de guardar de la app.
     Se mide el TOKEN y no una pantalla: el defecto vivía en la regla, no en el login. */
  const r = (tinta, fondo) => {
    const cs = getComputedStyle(document.documentElement);
    const lum = css => {
      const m = String(cs.getPropertyValue(css) || css).trim();
      let n;
      if (m[0] === '#') { const h = m.length === 4 ? m.slice(1).split('').map(c=>c+c).join('') : m.slice(1);
        n = [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
      else { const q = m.match(/[\d.]+/g); if (!q) return null; n = [+q[0], +q[1], +q[2]]; }
      const g = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
      return 0.2126*g(n[0]) + 0.7152*g(n[1]) + 0.0722*g(n[2]);
    };
    const a = lum(tinta), b = lum(fondo);
    if (a == null || b == null) return null;
    return (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
  };
  ['claro', 'oscuro'].forEach(tema => {
    const previo = document.documentElement.getAttribute('data-tema');
    document.documentElement.setAttribute('data-tema', tema);
    try {
      const v = r('--text-soft', '--chip-bg-h');
      /* Guarda de medibilidad: un token que no resuelve devuelve null, y sin esto borrarlo dejaría
         el caso en verde — que es como se cuela un `var()` roto, porque no da error en consola. */
      PRUEBAS.cierto(v != null, 'guarda: `--text-soft` y `--chip-bg-h` existen en el tema ' + tema);
      if (v != null) PRUEBAS.alMenos(Math.round(v * 100), 450,
        '⚠️ el botón deshabilitado se lee en ' + tema + ' · ' + v.toFixed(2) + ':1 · antes 4,22 y 4,03 con `--text-muted`');
    } finally {
      if (previo) document.documentElement.setAttribute('data-tema', previo);
      else document.documentElement.removeAttribute('data-tema');
    }
  });
  PRUEBAS.cierto(/\.save-btn:disabled \{[^}]*var\(--text-soft\)/.test(
    [...document.querySelectorAll('style')].map(x => x.textContent).join('\n')),
    '⚠️ y la regla usa ese token · alcanza a los 22 botones de guardar');
});

/* ─────────────────────────────────────────────────────────────────────────────
   La franja naranja y los tres azules · 2026-09-07

   Franco la vio antes que nadie: "arregla esa franja que aparece cuando pongo
   codigo de empresa". `#nomCodEmpresa` es el rotulo con el nombre de la empresa
   del flujo VIEJO (el que llega al codigo ya sabiendo de quien es). El flujo
   nuevo entra al codigo SIN empresa, y le hacia `textContent = ''` — que deja el
   div en pie: 24 px de alto con su fondo naranja y su borde. Vaciar no es
   esconder. Se mide por el camino real (`nominaPasoCodigoInicial`), no leyendo
   el fuente, porque lo que falla es la altura calculada, no el texto.
   ───────────────────────────────────────────────────────────────────────────── */
PRUEBAS.caso('P124 · el rotulo de empresa no deja una franja vacia en el paso inicial', () => {
  const NOMprev = { empresa: NOM.empresa, perfil: NOM.perfil, paso: NOM.paso };
  /* ⚠️ EL OVERLAY VA ABIERTO. Lo que falla acá es el ALTO calculado de un div, y con `#nominaOv`
     cerrado todo mide 0 — el caso daría verde sin medir nada, que es como un ancestro en
     `display:none` me hizo informar "0 defectos" en A4. */
  const ov = document.getElementById('nominaOv');
  const teniaShow = ov.classList.contains('show');
  ov.classList.add('show');
  try {
    NOM.empresa = null; NOM.perfil = null;
    nominaPasoCodigoInicial();
    const franja = document.getElementById('nomCodEmpresa');
    PRUEBAS.cierto(!!franja, 'guarda: `#nomCodEmpresa` sigue existiendo (si lo borran, el caso de abajo miente)');
    PRUEBAS.igual(Math.round(franja.getBoundingClientRect().height), 0,
      '⚠️ sin empresa elegida el rotulo no ocupa alto · media 24 px de franja naranja vacia');

    /* 🔵 el lead decia "esta empresa" cuando todavia no hay ninguna elegida. */
    const lead = document.getElementById('nomLead');
    PRUEBAS.cierto(lead && !/esta empresa/i.test(lead.textContent),
      '⚠️ el texto de arriba no dice "esta empresa" antes de que haya empresa · ' + (lead ? lead.textContent : '(sin lead)'));

    /* 🔵 "No estoy en la lista" lleva a `nominaManual()`, que escribe sin codigo.
       En el paso del codigo no hay lista de la cual no estar. */
    const ne = document.getElementById('nomNoEstoy');
    PRUEBAS.cierto(!!ne, 'guarda: `#nomNoEstoy` existe');
    PRUEBAS.cierto(ne && ne.style.display === 'none',
      '⚠️ "No estoy en la lista" esta oculto en el paso del codigo · era la puerta de atras al alta sin codigo');

    /* Y el camino VIEJO, donde SI hay empresa, tiene que seguir rotulandola:
       ocultarla de mas dejaria a la persona sin saber a que empresa entra. */
    NOM.empresa = 'Consorcio HELITEC';
    NOM.perfil = { nombre: 'Consorcio HELITEC' };
    nominaPasoCodigo();
    PRUEBAS.alMenos(Math.round(franja.getBoundingClientRect().height), 20,
      '⚠️ con empresa elegida el rotulo VUELVE a verse · el `display:none` no puede quedar pegado');
    PRUEBAS.cierto(/HELITEC/.test(franja.textContent),
      '⚠️ y dice el nombre de la empresa · ' + franja.textContent);

    nominaPaso('empresa');
    PRUEBAS.cierto(ne && ne.style.display !== 'none',
      '⚠️ "No estoy en la lista" SI se ve al elegir empresa · ahi es donde tiene sentido');
  } finally {
    NOM.empresa = NOMprev.empresa; NOM.perfil = NOMprev.perfil;
    try { nominaPaso(NOMprev.paso || 'codigo'); } catch (e) {}
    if (!teniaShow) ov.classList.remove('show');
  }
});
