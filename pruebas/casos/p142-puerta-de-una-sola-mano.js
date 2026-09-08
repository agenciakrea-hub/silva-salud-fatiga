PRUEBAS.grupo('P142 · «No es mi empresa», la puerta de una sola mano');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   El enlace «No es mi empresa» hace tres cosas de un toque: borra la llave de reingreso, cierra el
   login y abre el alta en el paso del código. Para el reingreso en un teléfono compartido —el caso
   para el que P121 lo creó— eso ES la salida. Para alguien que está usando su app y recibió el
   login encima porque su sesión venció (`misSincronizar` con `necesita_clave`), es lo contrario:
   lo expulsa de su app, le borra la llave y lo deja en el paso del código sin ningún camino de
   vuelta en pantalla. El botón está pegado a «Entrar».

   La regla que sigue este archivo es la misma de P137: el enlace se ofrece SÓLO a quien lo
   necesita, y la condición se mide entrando por `lgnAbrir()`, no leyendo la función que decide.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function p142Perfil(){
  return { nombre:'Ana Pérez', cedula:'12345678', empresa:'Consorcio HELITEC', departamento:'Operaciones',
           cargo:'Piloto', sexo:'F', edad:'34', telefono:'04121234567', email:'ana@helitec.com' };
}
function p142Visible(){
  const el = document.getElementById('lgnOtraEmpresa');
  if (!el) return false;
  /* R11 · acá no se puede confiar en lo que se "ve": la pestaña está oculta permanente. Se mide el
     estilo computado, que es lo único que no miente con `display:none`. */
  return getComputedStyle(el).display !== 'none';
}

PRUEBAS.caso('🔴 con perfil completo (sesión vencida adentro de la app) el enlace NO se ofrece', () => {
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    /* El escenario real: la persona está registrada, tiene su perfil entero, y el login se le abre
       encima porque el servidor contestó `necesita_clave`. Se entra por `lgnAbrir()` —el mismo
       punto que usa `misSincronizar`—, nunca pintando el enlace a mano. */
    setProfile(p142Perfil());
    reingresoGuardar('Consorcio HELITEC');
    const abrio = lgnAbrir();
    PRUEBAS.cierto(abrio !== false, 'guarda: el login se abrió (si no, no hay nada que medir)');
    PRUEBAS.igual(document.getElementById('lgnEmpresa').textContent, 'Consorcio HELITEC',
      'guarda: la empresa sí se pinta — lo que se esconde es el enlace, no el rótulo');
    PRUEBAS.igual(p142Visible(), false,
      '⚠️ el enlace está oculto · antes lo sacaba de su app, le borraba la llave y lo dejaba en el paso del código');

    /* DISCRIMINADOR DEL INSTRUMENTO. Un `false` sólo vale si el mismo medidor sabe decir `true`:
       se muestra el enlace a mano y se vuelve a medir. Si esto no se pusiera en `true`, el caso de
       arriba estaría midiendo un elemento que nunca es visible por otro motivo. */
    document.getElementById('lgnOtraEmpresa').style.display = '';
    PRUEBAS.igual(p142Visible(), true, 'discriminador: el medidor detecta el enlace cuando SÍ está visible');
  } finally {
    try { lgnCerrar(true); } catch(e){}
    try {
      localStorage.clear();
      Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
    } catch(e){}
    document.getElementById('splashOv').classList.remove('show');
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('⚠️ pero en el REINGRESO sin perfil el enlace sigue estando — es para lo que se creó (P121)', () => {
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    /* Teléfono compartido: no hay perfil, la empresa la puso la llave de reingreso y puede ser la
       de la persona anterior. Sin este enlace, quien vuelve de OTRA empresa recibe «Usuario o
       contraseña incorrecta» con la contraseña correcta. */
    appRevelar(false);
    localStorage.clear();
    reingresoGuardar('Otra Empresa C.A.');
    const abrio = lgnAbrir();
    PRUEBAS.cierto(abrio !== false, 'guarda: el login se abre sin perfil (P121)');
    PRUEBAS.igual(p142Visible(), true,
      '⚠️ el enlace se ofrece a quien no tiene perfil · P142 no puede haber cerrado la puerta del reingreso');
  } finally {
    try { lgnCerrar(true); } catch(e){}
    try {
      localStorage.clear();
      Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
    } catch(e){}
    appRevelar(false);
    document.getElementById('splashOv').classList.remove('show');
    try { syncScrollLock(); } catch(e){}
  }
});

PRUEBAS.caso('🔴 el cinturón: aunque se llame a la acción, con perfil completo no borra la llave ni cierra el login', () => {
  /* Esconder el botón evita el toque accidental; no evita un `onclick` disparado por otro camino
     ni un enlace que quede visible por un repintado futuro. La acción también tiene que negarse,
     porque lo que está en juego es irreversible: `reingresoOlvidar()` borra la única empresa que
     sobrevive a cerrar sesión. */
  const previo = { todo: Object.assign({}, localStorage) };
  try {
    setProfile(p142Perfil());
    reingresoGuardar('Consorcio HELITEC');
    lgnAbrir();
    lgnOtraEmpresa();
    PRUEBAS.igual(reingresoEmpresa(), 'Consorcio HELITEC',
      '⚠️ la llave de reingreso sobrevive · antes se borraba y no había forma de recuperarla');
    PRUEBAS.cierto(document.getElementById('loginOv').classList.contains('show'),
      '⚠️ el login sigue abierto · la persona puede escribir su contraseña y volver a su app');
  } finally {
    try { lgnCerrar(true); } catch(e){}
    try {
      localStorage.clear();
      Object.keys(previo.todo).forEach(k => localStorage.setItem(k, previo.todo[k]));
    } catch(e){}
    document.getElementById('splashOv').classList.remove('show');
    try { syncScrollLock(); } catch(e){}
  }
});
