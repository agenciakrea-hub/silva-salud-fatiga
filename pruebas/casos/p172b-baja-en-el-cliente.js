PRUEBAS.grupo('P172b · la baja llega a la app: el inicio lo dice y se apaga cuando el servidor vuelve a decir que sí');

/* La revisión adversarial de P172: «el cliente ignora motivo:"baja"; el mensaje es texto muerto y
   la persona sigue usando la app». `tareas_mias` corre en cada apertura: es la puerta natural. */

function p172bCon(respuesta, fn){
  const prev = { ls: Object.assign({}, localStorage), fetch: window.fetch, lista: TAREAS.lista.slice(), cargando: TAREAS.cargando };
  try {
    localStorage.clear();
    setProfile({ nombre:'Ana Suárez P172', cedula:'99172172', empresa:'Empresa P172', departamento:'Op', cargo:'Piloto',
                 sexo:'F', edad:'30', telefono:'0412', email:'a@e.com', esPiloto:false });
    TAREAS.cargando = false; TAREAS.lista = [];
    window.fetch = () => Promise.resolve({ ok:true, json: () => Promise.resolve(respuesta) });
    return Promise.resolve(fn()).finally(() => {
      window.fetch = prev.fetch; TAREAS.lista = prev.lista; TAREAS.cargando = prev.cargando;
      localStorage.clear(); Object.keys(prev.ls).forEach(k => localStorage.setItem(k, prev.ls[k]));
      try { renderSections(); } catch(e){}
    });
  } catch(e){ window.fetch = prev.fetch; throw e; }
}

PRUEBAS.caso('🔴 `tareas_mias` con motivo «baja» marca la baja y el inicio la muestra', () => {
  return p172bCon({ ok:false, motivo:'baja', tareas:[] }, async () => {
    PRUEBAS.falso(bajaGuardada(), 'precondición · sin marca');
    await tareasCargar();
    PRUEBAS.cierto(bajaGuardada(), '🔴 quedó marcada');
    renderSections();
    const aviso = document.querySelector('#inicio .ini-baja');
    PRUEBAS.cierto(!!aviso, '🔴 y el inicio lo dice arriba de todo');
    PRUEBAS.cierto(aviso.textContent.indexOf(t('baja_titulo')) >= 0, 'con el título');
    PRUEBAS.cierto(aviso === document.querySelector('#inicio').firstElementChild, 'primero');
  });
});

PRUEBAS.caso('⚠️ EL DISCRIMINADOR · cuando el servidor vuelve a responder bien, la marca se apaga', () => {
  return p172bCon({ ok:true, tareas:[], pendientes:0 }, async () => {
    bajaMarcar(true);
    await tareasCargar();
    PRUEBAS.falso(bajaGuardada(), '⚠️ desmarcada');
    renderSections();
    PRUEBAS.falso(!!document.querySelector('#inicio .ini-baja'), 'y el aviso se fue');
  });
});

PRUEBAS.caso('⚠️ cerrar sesión borra la marca, y los textos están en los dos idiomas (R14) sin color a mano (R13)', () => {
  PRUEBAS.cierto(sesionClavesBorrar().indexOf(K_BAJA) >= 0, 'K_BAJA está entre las claves de sesión');
  const antes = localStorage.getItem(K_LANG);
  try {
    ['es','en'].forEach(l => { localStorage.setItem(K_LANG, l); ['baja_titulo','baja_texto'].forEach(k => PRUEBAS.cierto(t(k) !== k, k + ' en ' + l)); });
  } finally { if (antes == null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); }
  const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const i = css.indexOf('.ini-baja {');
  PRUEBAS.cierto(i > 0, 'guarda: el CSS existe');
  PRUEBAS.falso(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css.slice(i, i + 300)), 'sin color a mano');
});
