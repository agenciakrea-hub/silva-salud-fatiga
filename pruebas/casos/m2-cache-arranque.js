/* ── M2 · Que la pantalla no espere a la red ────────────────────────────────────────────────────
   (2026-08-27)

   MEDIDO EN EL ARRANQUE REAL, contra producción:
     empresa_perfil  arranca a 67 ms · tarda 3.560 ms
     tareas_mias     arranca a 68 ms · tarda 4.716 ms
     empleado        arranca a 69 ms · tarda 4.885 ms
   Los tres YA iban en paralelo, así que no había nada que paralelizar — esa hipótesis se
   descartó midiendo. El problema era que la pantalla no mostraba nada hasta el más lento (~5 s).
   Y `renderInicio()` corría **3 veces**, dos de ellas con 1 ms de diferencia: eso es lo que se ve
   como "la página se carga varias veces".

   Con la caché: el contador aparece a los **556 ms** en vez de ~4.700. */

PRUEBAS.grupo('M2 · caché de arranque');

const K_TC = 'silva_fatiga_tareas_cache_v1';
const K_LC = 'silva_fatiga_listas_cache_v1';

PRUEBAS.caso('las tareas se pintan desde la caché sin esperar la red', () => {
  CTX.resetear({ nombre: 'Ana Prueba' });
  localStorage.setItem(K_TC, JSON.stringify({
    lista: [{ id: 't1', estado: 'pendiente' }, { id: 't2', estado: 'pendiente' }],
    pendientes: 2, determinacion: null, persona: 'Ana Prueba'
  }));
  TAREAS.lista = []; TAREAS.pendientes = 0;
  const oFetch = window.fetch;
  window.fetch = () => new Promise(() => {});      // la red NUNCA contesta: sólo vale la caché
  try { tareasCargar(); } finally { window.fetch = oFetch; TAREAS.cargando = false; }
  PRUEBAS.igual(TAREAS.pendientes, 2,
    'con la red colgada, el contador tiene que salir igual: es lo que evita los 5 segundos en blanco');
  const b = document.getElementById('tareasBadge');
  PRUEBAS.igual(b.textContent, '2', 'y el numerito tiene que estar pintado, no sólo el dato en memoria');
});

PRUEBAS.caso('⚠️ la caché de OTRA persona no se muestra', () => {
  /* En esta app lo cacheado son datos de salud. Si alguien cierra sesión y entra con otro nombre,
     ver por unos segundos las tareas del anterior sería una fuga — y encima silenciosa. */
  CTX.resetear({ nombre: 'Luis Otro' });
  localStorage.setItem(K_TC, JSON.stringify({
    lista: [{ id: 'x' }], pendientes: 9, determinacion: { nivel: 'alto' }, persona: 'Ana Prueba'
  }));
  TAREAS.lista = []; TAREAS.pendientes = 0; TAREAS.determinacion = null;
  const oFetch = window.fetch;
  window.fetch = () => new Promise(() => {});
  try { tareasCargar(); } finally { window.fetch = oFetch; TAREAS.cargando = false; }
  PRUEBAS.igual(TAREAS.pendientes, 0,
    'la caché es de Ana y el perfil es de Luis: no se puede mostrar nada');
  PRUEBAS.igual(TAREAS.determinacion, null,
    'y menos todavía una determinación médica, que es lo más sensible que viaja por este canal');
});

PRUEBAS.caso('la lista de empresas del ALTA sale al instante', () => {
  /* Medido aparte: `action=listas` tarda 2,5–4,3 s para 375 bytes que casi nunca cambian. */
  localStorage.setItem(K_LC, JSON.stringify({
    empresas: ['Aeroambulancias Silva', 'Helitec'], departamentos: ['Operaciones']
  }));
  SETUP_LISTS.empresas = []; SETUP_LISTS.departamentos = []; SETUP_LISTS_LOADED = false;
  const oFetch = window.fetch;
  window.fetch = () => new Promise(() => {});
  try { loadSetupLists(); } finally { window.fetch = oFetch; }
  PRUEBAS.igual(SETUP_LISTS.empresas.length, 2,
    'el desplegable tiene que estar lleno antes de que conteste el servidor');
});

PRUEBAS.caso('⚠️ con la lista cacheada, la validación queda PERMISIVA', () => {
  /* El detalle que hace que esto no sea un bug: `SETUP_LISTS_FAILED` decide si `saveProfile()`
     valida la empresa contra la lista. Con la caché llena y la bandera en `false`, alguien de una
     empresa dada de alta HOY —que todavía no está en la caché— sería RECHAZADO durante esos
     segundos, con un mensaje diciéndole que su empresa no existe. Sería cambiar una espera por un
     rechazo falso. Por eso queda permisiva hasta que conteste el servidor de verdad. */
  localStorage.setItem(K_LC, JSON.stringify({ empresas: ['Helitec'], departamentos: [] }));
  SETUP_LISTS.empresas = []; SETUP_LISTS_LOADED = false; SETUP_LISTS_FAILED = false;
  const oFetch = window.fetch;
  window.fetch = () => new Promise(() => {});
  try { loadSetupLists(); } finally { window.fetch = oFetch; }
  PRUEBAS.cierto(SETUP_LISTS_FAILED,
    'mientras lo mostrado sea de la caché, nadie puede quedar bloqueado por no estar en una lista vieja');
});

PRUEBAS.caso('sin caché se comporta como antes, no rompe', () => {
  /* La primera vez que alguien abre la app no hay nada guardado. Ese camino tiene que seguir
     funcionando exactamente igual. */
  CTX.resetear({ nombre: 'Ana Prueba' });
  try { localStorage.removeItem(K_TC); localStorage.removeItem(K_LC); } catch (e) {}
  TAREAS.lista = []; TAREAS.pendientes = 0;
  const oFetch = window.fetch;
  window.fetch = () => new Promise(() => {});
  let err = null;
  try { tareasCargar(); } catch (e) { err = e.message; } finally { window.fetch = oFetch; TAREAS.cargando = false; }
  PRUEBAS.igual(err, null, 'sin nada guardado no puede lanzar');
  PRUEBAS.igual(TAREAS.pendientes, 0, 'y simplemente no muestra nada hasta que llegue la respuesta');
});

PRUEBAS.caso('el arranque no repinta el inicio de más', () => {
  /* `tareasCargar()` ya llama a `renderInicio()` al terminar; `tareasArranque()` lo volvía a
     llamar en su `.then()`. Dos repintados completos a 1 ms de distancia. Se comprueba sobre el
     código para que nadie vuelva a agregar el segundo. */
  PRUEBAS.falso(/tareasCargar\(\)\s*\.then\([^)]*renderInicio/.test(tareasArranque.toString()),
    'el arranque no puede repintar además de lo que ya repinta tareasCargar()');
});
