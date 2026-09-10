PRUEBAS.grupo('L9 · «Mi contraseña» no tenía dónde escribir el código que le exigían');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   MEDIDO EN PRODUCCIÓN (tarea `cred_estado`, 2026-09-07): de las 7 personas de HELITEC,
   **CERO tienen contraseña**. O sea que las siete pasan por esta pantalla, y era la única de las
   cinco puertas del código que no tenía campo donde escribirlo.

   El cliente mandaba el código SÓLO si lo encontraba en `altaProgresoCargar()`, que `nominaConfirmar`
   BORRA al terminar el alta y que además vence a las 24 h. Para alguien registrado hace meses eso
   es `null` siempre: recibía «El código de la empresa no es correcto» en una pantalla donde no
   había nada que corregir. Un error verdadero y sin salida, que es peor que no decir nada.

   Por eso L8 no cargó el código: habría trabado a las 7 el mismo día.
   ══════════════════════════════════════════════════════════════════════════════════════════ */

PRUEBAS.caso('🔴 la pantalla tiene un campo para el código', () => {
  /* ⚠️ `CTX.resetear()` PRIMERO, y no es adorno: sin esto el caso falló dos veces seguidas
     buscando `#claveOv #clvCodigo` mientras el elemento SÍ estaba en el DOM. Este era el único
     caso del archivo que no partía de un estado conocido, y el único que fallaba. Lo que deja
     puesto el caso anterior es de él, no de este archivo. */
  CTX.resetear();
  /* ⚠️ `PRUEBAS.existe` ANOTA POR SU CUENTA y devuelve `undefined`. Envolverlo en
     `PRUEBAS.cierto(PRUEBAS.existe(...))` da SIEMPRE rojo, pase lo que pase — y eso fue lo que me
     tuvo tres corridas persiguiendo un elemento que estaba ahí. Lo destapó instrumentar el caso:
     el diagnóstico decía `dentro: true` y el aserto seguía en falso. Una API mal usada miente en
     la dirección más cara: parece un defecto del código que se está probando. */
  PRUEBAS.existe('#claveOv #clvCodigo', '⚠️ el campo existe, y DENTRO de la pantalla de contraseña');
  PRUEBAS.existe('#claveOv #clvCodigoCampo', 'y su contenedor, para poder ocultarlo');
  const lbl = document.querySelector('#clvCodigoCampo label');
  PRUEBAS.cierto(!!lbl, 'guarda de medibilidad: tiene etiqueta');
  PRUEBAS.igual(lbl && lbl.getAttribute('data-i18n'), 'nom_codigo_lbl',
    '⚠️ R14 · el texto sale de `t()`, y reusa la clave que ya existe en el alta');
});

PRUEBAS.caso('⚠️ nace OCULTO · quien no lo necesita no ve un campo de más', () => {
  CTX.resetear();
  const campo = document.getElementById('clvCodigoCampo');
  PRUEBAS.cierto(!!campo, 'guarda: está el contenedor');
  /* Se entra por el camino real: `clvAbrir()` lo prepara. Con el perfil de empresa sin
     `pideCodigo` —el estado de HOY para HELITEC— el campo no se muestra. */
  try { localStorage.removeItem('silva_fatiga_empresa_perfil_v1'); } catch(e){}
  clvCodigoPreparar();
  PRUEBAS.cierto(campo.hidden, '⚠️ sin perfil de empresa guardado, oculto');

  empresaPerfilGuardar({ empresa:'E', nombre:'E', pideCodigo:false });
  clvCodigoPreparar();
  PRUEBAS.cierto(campo.hidden, '⚠️ y con una empresa que NO pide código, también');
});

PRUEBAS.caso('🔴 aparece cuando la empresa SÍ pide código', () => {
  CTX.resetear();
  empresaPerfilGuardar({ empresa:'E', nombre:'E', pideCodigo:true });
  clvCodigoPreparar();
  PRUEBAS.falso(document.getElementById('clvCodigoCampo').hidden,
    '⚠️ con `pideCodigo` se muestra · es el caso del día que se cargue el código');
});

PRUEBAS.caso('🔴 y el ERROR del servidor lo abre igual · la red del camino de arriba', () => {
  /* El perfil guardado de la empresa puede estar viejo o no existir —una app que nunca hizo el
     alta en ese teléfono no lo tiene—. Sin esta red, esa persona veía el error y nada más. */
  CTX.resetear();
  try { localStorage.removeItem('silva_fatiga_empresa_perfil_v1'); } catch(e){}
  clvCodigoPreparar();
  PRUEBAS.cierto(document.getElementById('clvCodigoCampo').hidden, 'guarda: arranca oculto');
  clvCodigoRevelar();
  PRUEBAS.falso(document.getElementById('clvCodigoCampo').hidden,
    '⚠️ `clvCodigoRevelar()` lo abre · lo llama la respuesta `codigo_invalido`');
});

PRUEBAS.caso('⚠️ el envío usa lo que la persona escribió, no sólo el progreso del alta', () => {
  /* El defecto entero era que `altaProgresoCargar()` fuera la ÚNICA fuente: se borra al terminar
     el alta (index.html, en `nominaConfirmar`) y vence a las 24 h. */
  const src = String(clvGuardar);
  PRUEBAS.alMenos(src.length, 200, 'guarda de medibilidad: se leyó la función');
  PRUEBAS.cierto(/clvCodigo/.test(src), '⚠️ lee el campo de la pantalla');
  /* ⚠️ QUÉ CAMBIÓ EN P164 (2026-09-10): el respaldo ya no es `altaProgresoCargar()` a secas sino
     `altaCodigoVigente()`, que mira PRIMERO la memoria del alta en curso (`NOM.codigo`) y después
     el progreso guardado. El alta de prueba contra producción encontró que el progreso se borra
     en `nominaConfirmar` —cuatro pantallas antes— así que el respaldo de L9 nunca llegaba a
     esta pantalla durante un alta normal. Lo que este caso afirma es lo mismo: el campo manda y
     hay un respaldo detrás. */
  PRUEBAS.cierto(/codManual/.test(src) && /altaCodigoVigente/.test(src),
    'y el código del alta queda de respaldo para quien está terminando su alta ahora');
  const iManual = src.indexOf('codManual'), iProg = src.indexOf('altaCodigoVigente');
  PRUEBAS.cierto(iManual >= 0 && iProg > iManual,
    '⚠️ y el campo tiene PRIORIDAD sobre el respaldo · si no, un código viejo taparía al nuevo');
  const srcV = String(altaCodigoVigente);
  PRUEBAS.cierto(/altaProgresoCargar/.test(srcV) && srcV.indexOf('NOM') < srcV.indexOf('altaProgresoCargar'),
    'y dentro del respaldo, la memoria de ESTA alta va antes que lo guardado de una anterior');
});

PRUEBAS.caso('⚠️ la respuesta de código inválido abre el campo · por el camino real', () => {
  const src = String(clvGuardar);
  PRUEBAS.cierto(/codigo_invalido/.test(src) && /clvCodigoRevelar/.test(src),
    '⚠️ el manejador de la respuesta llama a revelar · antes sólo pintaba el error');
  PRUEBAS.cierto(/codigo_frenado/.test(src),
    'y también cuando el servidor dice que hubo demasiados intentos');
});

PRUEBAS.caso('⚠️ abrir la pantalla NO depende de la red (R7)', () => {
  /* Si `clvAbrir` pidiera el perfil de la empresa al servidor para saber si mostrar el campo, sin
     señal la hoja no se abriría o se abriría mal. Se lee del guardado, y la red es la de abajo. */
  const src = String(clvCodigoPreparar);
  PRUEBAS.falso(/fetch|dashRequest|fetchConReloj/.test(src),
    '⚠️ no hay pedido a la red para abrir la pantalla · el perfil sale del guardado local');
  PRUEBAS.cierto(/empresaPerfilGuardado/.test(src), 'y de ahí sale `pideCodigo`');
});

PRUEBAS.caso('🔴 un código que NO se mandó no quema un intento', () => {
  /* El freno del código es por dispositivo y lo comparten todas las acciones de esa empresa. Si
     tocar «Crear mi contraseña» sin código contara como intento fallido, la persona a la que hay
     que NO trabar se frenaba sola en pocos toques — incluido el camino que la salva. */
  if (!CTX.hayGs) { PRUEBAS.cierto(true, 'sin el emulador del endpoint no se puede medir'); return; }
  const gs = CTX.gs;
  const fn = (gs.match(/function puertaCodigo[\s\S]*?\n\}/) || [''])[0];
  PRUEBAS.alMenos(fn.length, 100, 'guarda de medibilidad: se encontró la puerta');
  PRUEBAS.cierto(/if \(String\(p\.codigo == null \? "" : p\.codigo\)\.trim\(\)\) codAnotarFallo/.test(fn),
    '⚠️ sólo se anota el fallo si vino un código · el freno es contra quien PRUEBA códigos');
});
