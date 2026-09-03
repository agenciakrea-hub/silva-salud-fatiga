
PRUEBAS.grupo('R1 · salida en todos los caminos del splash');

/* ⚠️ EL RECLAMO, TEXTUAL: "en muchos lugares del splash debo reiniciar la página para ir para
   atrás". Se recorrieron los caminos uno por uno y había TRES pantallas sin ninguna salida:

     · `#setup` (el alta)      → el botón "Cancelar" existe pero nacía con `display:none` y sólo se
                                 mostraba al EDITAR. En un alta nueva —el camino que viene del
                                 splash— no había forma de volver.
     · `#consent`              → único botón: "Aceptar y continuar".
     · `#textoOverlay`         → único botón: "Continuar".

   Y el botón FÍSICO del teléfono no cubría cuatro: el carrusel, la nómina, el consentimiento y el
   tamaño de texto. En `#setup` era peor: se TRAGABA el "atrás" sin hacer nada, así que la persona
   apretaba y no pasaba nada nunca. */

/* Las pantallas del recorrido del alta y cómo se llega a ellas. La lista está acá y no adentro de
   cada caso a propósito: si mañana alguien agrega una pantalla al recorrido y no le pone salida,
   lo que falla es esta lista, no un caso suelto. */
const R1_PANTALLAS = ['setup', 'consent', 'textoOverlay', 'nominaOv', 'carruselOv'];

function r1Abierta(id, fn){
  const el = document.getElementById(id);
  const tenia = el && el.classList.contains('show');
  if (el && !tenia) el.classList.add('show');
  try { return fn(el); } finally { if (el && !tenia) el.classList.remove('show'); }
}

PRUEBAS.caso('⚠️ ninguna pantalla del alta queda sin salida en la PANTALLA', () => {
  /* Se busca un control que lleve a `altaAbandonar`, a cerrar, o a volver un paso. No se mira el
     texto del botón: lo que importa es que exista algo que saque de ahí. */
  const sinSalida = [];
  R1_PANTALLAS.forEach(id => {
    const ov = document.getElementById(id);
    if (!ov) { sinSalida.push(id + ': no existe'); return; }
    const salidas = [...ov.querySelectorAll('button')].filter(b => {
      const on = (b.getAttribute('onclick') || '');
      return /altaAbandonar|Cerrar\(|closeSetup|carruselCerrar|nominaVolver|recuperarAbrir/.test(on);
    });
    if (!salidas.length) sinSalida.push(id);
  });
  PRUEBAS.igual(sinSalida, [],
    '⚠️ una pantalla sin salida obliga a recargar la página, que es el reclamo original: ' + sinSalida.join(', '));
});

PRUEBAS.caso('⚠️ el botón del alta se ve TAMBIÉN en un alta nueva', () => {
  /* EL DEFECTO PRINCIPAL. Antes: `display = isEdit ? 'block' : 'none'`. O sea que existía para
     quien venía a corregir un teléfono y NO para quien recién llegaba del splash — justo al revés
     de donde hace falta. */
  const btn = document.getElementById('cancelBtn');
  PRUEBAS.cierto(!!btn, 'tiene que existir el botón');
  const antes = { display: btn.style.display, onclick: btn.getAttribute('onclick'), txt: btn.textContent };
  try {
    openSetup(false);                                  // alta NUEVA
    const nueva = { display: btn.style.display, onclick: btn.getAttribute('onclick') };
    openSetup(true);                                   // edición
    const edicion = { display: btn.style.display, onclick: btn.getAttribute('onclick') };
    PRUEBAS.falso(nueva.display === 'none', '⚠️ en un alta nueva el botón NO puede estar oculto');
    PRUEBAS.cierto(/altaAbandonar/.test(nueva.onclick || ''),
      'y en un alta nueva tiene que volver al splash deshaciendo lo que el alta escribió');
    PRUEBAS.falso(edicion.display === 'none', 'editando también se ve');
    PRUEBAS.cierto(/closeSetup/.test(edicion.onclick || ''),
      '⚠️ pero editando sólo CIERRA: quien vino a corregir un dato no puede perder su perfil');
  } finally {
    try { closeSetup(); } catch(e){}
    btn.style.display = antes.display;
    if (antes.onclick) btn.setAttribute('onclick', antes.onclick);
    btn.textContent = antes.txt;
  }
});

PRUEBAS.caso('⚠️ volver atrás NO deja un perfil a medio guardar', () => {
  /* CASO BORDE DEL PLAN, y era real: `nominaConfirmar()` hace `setProfile(...)` con los datos de la
     nómina ANTES de abrir el formulario de revisión. Si la nómina trae el registro completo, desde
     ese instante `perfilCompleto()` ya da true — la persona cuenta como REGISTRADA sin haber
     confirmado nada y sin haber pasado por `saveProfile()`, que es lo único que valida y sincroniza
     con `Registrados Fatiga`. */
  const previo = getProfile();
  try {
    try { localStorage.removeItem(K_PROFILE); } catch(e){}
    altaOlvidarPerfil();
    altaRecordarPerfil();                              // como hace nominaConfirmar
    setProfile({ nombre:'Alguien De La Nomina', cedula:'V-9', empresa:'X', departamento:'Op',
                 cargo:'Piloto', sexo:'M', edad:'40', telefono:'04141111111', email:'a@b.co' });
    PRUEBAS.cierto(perfilCompleto(getProfile()),
      'a esta altura la persona YA figura como registrada sin haber confirmado nada');
    altaAbandonar();
    PRUEBAS.falso(perfilCompleto(getProfile()),
      '⚠️ al volver atrás no puede quedar registrada: el perfil que escribió el alta se deshace');
  } finally {
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    altaOlvidarPerfil();
  }
});

PRUEBAS.caso('⚠️ y el caso discrimina: a quien YA estaba registrado no se le borra nada', () => {
  /* El control. Si `altaAbandonar()` borrara siempre, el caso de arriba pasaría igual — y le
     estaríamos borrando el perfil a quien entró a corregir un teléfono y se arrepintió. */
  const previo = getProfile();
  try {
    const mio = { nombre:'Ya Registrado', cedula:'V-1', empresa:'X', departamento:'Op',
                  cargo:'Piloto', sexo:'M', edad:'40', telefono:'04141111111', email:'a@b.co' };
    setProfile(mio);
    altaOlvidarPerfil();
    altaRecordarPerfil();                              // el alta arranca sobre un perfil que ya existía
    setProfile(Object.assign({}, mio, { nombre:'Pisado Por El Alta' }));
    altaAbandonar();
    const q = getProfile();
    PRUEBAS.cierto(!!q && q.nombre === 'Ya Registrado',
      '⚠️ tiene que volver EXACTAMENTE el perfil anterior, no borrarse (quedó: ' + (q && q.nombre) + ')');
  } finally {
    if (previo) setProfile(previo); else { try { localStorage.removeItem(K_PROFILE); } catch(e){} }
    altaOlvidarPerfil();
  }
});

PRUEBAS.caso('⚠️ el botón FÍSICO del teléfono cubre las cinco pantallas', () => {
  /* `silvaAtras()` es lo que responde al atrás del celular. No cubría el carrusel, la nómina, el
     consentimiento ni el tamaño de texto — y en `#setup` se tragaba el evento sin hacer nada.
     Se comprueba que devuelva `true` (o sea: "yo me ocupo") con cada pantalla abierta. Si devuelve
     false, el teléfono SALE DE LA APP, que es lo peor que puede pasar en medio de un alta. */
  const noAtendidas = [];
  R1_PANTALLAS.forEach(id => {
    const atendida = r1Abierta(id, () => {
      try { return silvaAtras() === true; } catch(e){ return 'error: ' + e.message; }
    });
    if (atendida !== true) noAtendidas.push(id + ' → ' + atendida);
  });
  PRUEBAS.igual(noAtendidas, [],
    'con cualquiera de estas abierta, el atrás del teléfono tiene que hacer algo — si no, la app ' +
    'se cierra en medio del alta: ' + noAtendidas.join(', '));
});

PRUEBAS.caso('⚠️ dentro de la nómina, atrás retrocede de paso antes de salir del alta', () => {
  /* Que el atrás salga del alta estando en el paso 3 sería tan malo como que no hiciera nada: la
     persona pierde lo que ya eligió. Y el botón de la pantalla y el del teléfono tienen que usar
     LA MISMA condición, o discrepan — que es el caso borde que pide el plan. */
  PRUEBAS.cierto(typeof nominaPuedeVolver === 'function', 'la condición tiene que estar en un solo lugar');
  const antes = NOM.paso;
  try {
    NOM.paso = 'empresa';
    PRUEBAS.falso(nominaPuedeVolver(), 'en el primer paso no hay a dónde retroceder');
    NOM.paso = 'cedula';
    PRUEBAS.cierto(nominaPuedeVolver(), 'en el último sí');
  } finally { NOM.paso = antes; }
});

PRUEBAS.caso('los textos de las salidas nuevas pasan por t() (R14)', () => {
  ['atras','cancelar'].forEach(k => {
    PRUEBAS.cierto(t(k) && t(k) !== k, 'la clave "' + k + '" tiene que resolver a texto de verdad');
  });
});
