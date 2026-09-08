PRUEBAS.grupo('P042 · "Retomamos donde ibas"');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   ⚠️ REESCRITO EN P143, Y EL MOTIVO IMPORTA MÁS QUE LO QUE PRUEBA. Este archivo estuvo en verde
   mientras la función que medía era INALCANZABLE. Llamaba a `nominaRetomar()` directo y le armaba
   `NOM.perfiles` a mano, así que siguió pasando después de que P132 dejara sin llamador a toda la
   cadena de la lista de empresas. El retome del alta estuvo muerto en producción y el único
   instrumento que debía avisar decía que todo bien. Es R17 en su forma más cara: la prueba no
   entraba por el camino real, así que probaba la pieza y no el uso.

   La regla que aplica ahora: **se entra por `nominaAbrir()`**, que es el punto de entrada del alta
   de verdad. Si mañana alguien vuelve a desconectar el retome, estos casos se ponen rojos.

   Lo que P042 midió en su momento sigue vigente y se conserva: el aviso sale EN la pantalla a la
   que se saltó (salía 3,2 s antes, en la anterior) y dice QUÉ empresa se retomó. Dos de los casos
   viejos se cayeron con el camino viejo y se dice cuáles y por qué, abajo.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p042Estado(fn){
  const prev = { emp:NOM.empresa, per:NOM.persona, perfiles:NOM.perfiles, ret:NOM._retomando,
                 paso:NOM.paso, cod:NOM.codigo, pide:NOM.pideCodigo, lista:NOM.empresaPorLista,
                 alta:(typeof ALTA_EN_CURSO !== 'undefined') ? ALTA_EN_CURSO : undefined };
  const g = localStorage.getItem(K_ALTA_PROGRESO);
  const abierto = nominaEl('nominaOv').classList.contains('show');
  try { return fn(); }
  finally {
    NOM.empresa=prev.emp; NOM.persona=prev.per; NOM.perfiles=prev.perfiles;
    NOM._retomando=prev.ret; NOM.paso=prev.paso; NOM.codigo=prev.cod; NOM.pideCodigo=prev.pide;
    NOM.empresaPorLista=prev.lista;
    try { if (prev.alta !== undefined) ALTA_EN_CURSO = prev.alta; } catch(e){}
    if (g === null) localStorage.removeItem(K_ALTA_PROGRESO); else localStorage.setItem(K_ALTA_PROGRESO, g);
    if (!abierto) { try { nominaCerrar(); } catch(e){} }
  }
}
function p042Progreso(empresa, extra){
  localStorage.setItem(K_ALTA_PROGRESO, JSON.stringify(Object.assign(
    { empresa:empresa, codigo:'AB12', persona:'', pideCodigo:true, perfil:null, ts:Date.now() }, extra||{})));
}

PRUEBAS.caso('🔴 ALCANZABLE · abrir el alta con un progreso guardado salta al paso de la cédula', () => {
  /* EL CASO QUE FALTABA. Entra por `nominaAbrir()` —lo que ejecuta la persona— y no por
     `nominaRetomar()`. Es el que se habría puesto rojo el día que P132 dejó la cadena sin
     llamador; el archivo viejo, que llamaba a la función directo, no se enteró. */
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC', { codigo:'AB12' });
    nominaAbrir();
    return { paso: NOM.paso, empresa: NOM.empresa, codigo: NOM.codigo,
             visible: getComputedStyle(nominaEl('nomPasoCed')).display,
             enCodigo: getComputedStyle(nominaEl('nomPasoCod')).display };
  });
  PRUEBAS.igual(r.paso, 'cedsola',
    '⚠️ el alta retoma en la cédula · antes arrancaba de cero pidiendo el código otra vez');
  PRUEBAS.igual(r.empresa, 'Consorcio HELITEC', 'con la empresa guardada puesta');
  PRUEBAS.igual(r.codigo, 'AB12', 'y el código, que viaja de nuevo al servidor en nomina_confirmar');
  PRUEBAS.cierto(r.visible !== 'none', 'la pantalla de la cédula está a la vista');
  PRUEBAS.igual(r.enCodigo, 'none', 'y la del código no');
});

PRUEBAS.caso('el DISCRIMINADOR: sin progreso guardado, el alta arranca por el código', () => {
  /* Sin esto, un retome que se disparara SIEMPRE daría verde arriba y estaría saltándose el primer
     paso del alta a todo el mundo — justo lo que este bloque vino a cerrar. */
  const r = p042Estado(() => {
    localStorage.removeItem(K_ALTA_PROGRESO);
    nominaAbrir();
    return { paso: NOM.paso, empresa: NOM.empresa };
  });
  PRUEBAS.igual(r.paso, 'codigo', 'el primer paso sigue siendo el código para quien no dejó nada a medias');
  PRUEBAS.igual(r.empresa, '', 'y sin empresa: la dice el servidor cuando valide el código');
});

PRUEBAS.caso('🔴 un progreso SIN código no retoma · no hay nada que ahorrar y el servidor lo rechazaría', () => {
  /* Lo escribe `nominaCedulaBuscar` cuando el código se venció a mitad del alta. Saltar a la
     cédula con eso deja a la persona en una pantalla que el servidor va a rechazar sí o sí. */
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC', { codigo:'' });
    nominaAbrir();
    return { paso: NOM.paso, quedo: localStorage.getItem(K_ALTA_PROGRESO) };
  });
  PRUEBAS.igual(r.paso, 'codigo', 'arranca por el código, que es lo que le falta');
  PRUEBAS.igual(r.quedo, null, 'y el progreso a medias se limpia en vez de esperar 24 h a vencerse');
});

PRUEBAS.caso('un alta de hace más de 24 h se descarta', () => {
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC', { ts: Date.now() - 25 * 3600000 });
    nominaAbrir();
    return { paso: NOM.paso, empresa: NOM.empresa };
  });
  PRUEBAS.igual(r.paso, 'codigo', 'lo de anteayer no se retoma · vence a las 24 h');
  PRUEBAS.igual(r.empresa, '', 'y no queda una empresa vieja pegada en NOM');
});

PRUEBAS.caso('⚠️ NO se restaura el nombre de la persona · teléfono prestado', () => {
  /* El camino nuevo identifica por cédula, así que el nombre no hace falta. Y dejarlo afuera evita
     que el alta abandonada de alguien de la nómina le muestre su nombre al siguiente que abra la
     app en ese teléfono. Hasta acá la única defensa para ese caso era el vencimiento a 24 h. */
  const r = p042Estado(() => {
    p042Progreso('Consorcio HELITEC', { persona:'Juan Pérez' });
    NOM.persona = '';
    nominaAbrir();
    return NOM.persona;
  });
  PRUEBAS.igual(r, '', '⚠️ el nombre guardado no vuelve a la pantalla');
});

PRUEBAS.caso('⚠️ el aviso sale EN la pantalla nueva, no en la anterior', () => {
  /* Salía 3,2 s antes del cambio. Lo consume `nominaPaso()`, así que no puede adelantarse: si el
     paso no cambia, no hay aviso. */
  const r = p042Estado(() => {
    NOM._retomando = 'Consorcio HELITEC';
    const o = window.showToast; const vistos = [];
    window.showToast = m => vistos.push({ msg: String(m), paso: NOM.paso });
    try {
      nominaPaso('confirmar');                  // una pantalla cualquiera que NO es a la que se retoma
      const antes = vistos.length;
      nominaPaso('cedsola');                    // la pantalla a la que se salta: acá sí
      return { antes: antes, vistos: vistos };
    } finally { window.showToast = o; }
  });
  PRUEBAS.igual(r.antes, 0, '⚠️ en otra pantalla NO avisa');
  PRUEBAS.igual(r.vistos.length, 1, 'avisa una sola vez');
  PRUEBAS.igual(r.vistos[0].paso, 'cedsola', 'y en la pantalla nueva');
});

PRUEBAS.caso('⚠️ el aviso dice QUÉ empresa se retomó', () => {
  const r = p042Estado(() => {
    NOM._retomando = 'Consorcio HELITEC';
    const o = window.showToast; let msg = '';
    window.showToast = m => { msg = String(m); };
    try { nominaPaso('cedsola'); } finally { window.showToast = o; }
    return msg;
  });
  PRUEBAS.cierto(r.indexOf('Consorcio HELITEC') >= 0,
    '⚠️ el nombre está en el aviso · "Retomamos donde ibas" a secas no dice DÓNDE · decía «' + r + '»');
});

PRUEBAS.caso('no se repite: se avisa una vez y se consume', () => {
  const n = p042Estado(() => {
    NOM._retomando = 'Consorcio HELITEC';
    const o = window.showToast; let c = 0; window.showToast = () => c++;
    try { nominaPaso('cedsola'); nominaPaso('confirmar'); nominaPaso('cedsola'); }
    finally { window.showToast = o; }
    return c;
  });
  PRUEBAS.igual(n, 1, 'un solo aviso aunque se navegue entre pasos');
});

PRUEBAS.caso('los dos idiomas llevan el hueco del nombre', () => {
  const antes = (typeof idiomaActual === 'function') ? idiomaActual() : 'es';
  const t2 = {};
  try { ['es','en'].forEach(l => { fijarIdioma(l); t2[l] = t('nom_retomamos', { e: 'ACME' }); }); }
  finally { fijarIdioma(antes); }
  PRUEBAS.cierto(t2.es.indexOf('ACME') >= 0, 'español: «' + t2.es + '»');
  PRUEBAS.cierto(t2.en.indexOf('ACME') >= 0, 'inglés: «' + t2.en + '»');
  PRUEBAS.falso(/\{e\}/.test(t2.es + t2.en), 'y el hueco se reemplaza, no queda a la vista');
});

/* ── DOS CASOS VIEJOS QUE SE CAYERON CON EL CAMINO VIEJO, Y POR QUÉ ─────────────────────────────
   · «si la persona YA eligió una empresa, no se le cambia» — protegía una ventana de 6,5 segundos
     en la que la lista de empresas estaba a la vista mientras el retome viajaba. Esa pantalla ya
     no existe y el retome de hoy no espera a ninguna red: corre dentro de `nominaAbrir()`, antes
     de que haya nada tocable. El defecto desapareció por construcción, no por un arreglo.
   · «un alta de una empresa que ya no está se descarta» — se validaba contra `NOM.perfiles`, la
     lista de empresas clientes que P132 dejó de pedir. Hoy esa comprobación la hace el SERVIDOR
     con el código, en `nomina_confirmar`, y su rechazo devuelve al paso del código (P143). Vigilar
     eso desde acá sería volver a probar contra un estado armado a mano.
   ────────────────────────────────────────────────────────────────────────────────────────────── */
