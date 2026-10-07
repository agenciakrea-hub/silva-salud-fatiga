PRUEBAS.grupo('P231 · el departamento partido por un tilde');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   QUÉ VIGILA ESTE ARCHIVO

   Medido sobre los 108 registros reales de Aeroambulancias Silva, el combo de departamentos del
   panel listaba **NUEVE opciones y tres eran el mismo departamento**: «Operaciones» (70 registros),
   «Operaciónes» (2, con tilde) y «operaciones» (1, en minúscula). El supervisor veía tres veces lo
   mismo y **elegir una le mostraba una parte de su gente**: 70 de 73.

   ⚠️ LO QUE NO SE HIZO, Y ES LA MITAD DE LA LECCIÓN. Franco autorizó corregir las celdas. Al ir a
   escribirlas apareció que **la corrección no dura**: `Registrados Fatiga` es el perfil que declara
   la PERSONA (ADR 013) y `accionRegistro` hace upsert, así que la próxima vez que esa persona abra
   la app su perfil vuelve a escribir «Operaciónes». Se arregla la LECTURA, que es lo que dura, con
   la derivación que YA EXISTÍA en los dos lados (`depClave` en el `.gs`, `depClaveCliente` en el
   cliente) y que el combo y el filtro no usaban.

   ⚠️ Y TOCÓ CUATRO LUGARES, no uno: `dashEnAlcance` dice en su comentario que existe para que los
   filtros no se escriban dos veces, y **la usa un solo llamador** — `cicloPersonas`,
   `reportesFiltrados` y `dashFilteredPVT` copiaron la línea. Unificarlos es trabajo propio y está
   anotado como lo que encarece `P227`.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* Las tres variantes reales del CH, con sus proporciones reales (70 / 2 / 1). */
function p231Rows(){
  const mk = (dep, n) => Array.from({ length: n }, (_, i) => ({
    persona: dep.replace(/\W/g,'') + i, empresa: 'Alfa', departamento: dep, cargo: 'Piloto',
    fecha: '2026-10-03', kss: 3 }));
  return [].concat(mk('Operaciones', 70), mk('Operaciónes', 2), mk('operaciones', 1),
                   mk('Presidencia', 19), mk('Pre- vuelo', 1));
}
function p231Con(fn){
  const prev = (typeof DASH !== 'undefined') ? DASH : null;
  return Promise.resolve()
    .then(() => {
      onDashData({ ok:true, rol:'supervisor', vista:'medico', referencia:{}, metricas:['kss'],
        registros: p231Rows(), comentarios:[], pvt:[], aptitud:[], turnos:[], ausencias:{},
        duty:null, operacional:[], operacionalPeriodo:null, config:{}, marca:null, combinada:false,
        zonaOp:null, nominaTotal:0, nominaSinDato:[], nominaSinDatoN:0, nominaError:null,
        cicloPlanPersona:null, cicloPlanPersonaError:null, cuentas:null, visor:null,
        visorError:null, atajosAdmin:null }, 'Alfa', { usuario:'Alfa', empresa:'Alfa' }, 'medico');
      return fn();
    })
    /* R18 · en el `.finally()` de la PROMESA. */
    .finally(() => { try { DASH = prev; DASH && (DASH.f.dep = ''); } catch(e){} });
}

PRUEBAS.caso('🔴 el combo muestra UNA opción por departamento real, con la escritura más usada', () => {
  /* EL DERECHO: lo concede `depsDelCombo()`, que agrupa por `depClaveCliente()` — la misma
     derivación que el `.gs` usa como `depClave()`. R19. */
  return p231Con(() => {
    const rows = DASH.registros;
    const crudos = Array.from(new Set(rows.map(r => r.departamento))).sort();
    PRUEBAS.igual(crudos.length, 5, 'guarda: en los datos hay 5 escrituras distintas · ' + crudos.join(' | '));
    const combo = depsDelCombo(rows);
    /* LO QUE TIENE QUE CAMBIAR · tres variantes colapsan en una */
    PRUEBAS.igual(combo.length, 3,
      '🔴 el combo muestra 3 departamentos, no 5: «Operaciones» aparecía tres veces · ' + combo.join(' | '));
    PRUEBAS.cierto(combo.indexOf('Operaciones') >= 0,
      '🔴 y la etiqueta es la MÁS USADA (70 contra 2 y 1), no la primera alfabética');
    PRUEBAS.falso(combo.indexOf('Operaciónes') >= 0, '🔴 la del tilde ya no se ofrece aparte');
    PRUEBAS.falso(combo.indexOf('operaciones') >= 0, '🔴 ni la minúscula');
    /* LO QUE NO PUEDE CAMBIAR · lo que NO es variante de nada sigue estando */
    PRUEBAS.cierto(combo.indexOf('Presidencia') >= 0, '🔴 NO PUEDE CAMBIAR · «Presidencia» sigue');
    PRUEBAS.cierto(combo.indexOf('Pre- vuelo') >= 0,
      '🔴 NO PUEDE CAMBIAR · «Pre- vuelo» sigue: tiene guion y espacio raro, pero no es variante de otro');
  });
});

PRUEBAS.caso('🔴 elegir cualquiera de las tres variantes trae EXACTAMENTE la misma gente', () => {
  /* ⚠️ Es el aserto que importa: el combo podía arreglarse y el filtro seguir partiendo el grupo.
     Son dos mitades y arreglar una sola deja la pantalla peor — una opción que no trae a nadie. */
  return p231Con(() => {
    const cuantos = dep => { DASH.f.dep = dep; const n = dashFiltered().length; DASH.f.dep = ''; return n; };
    const todas = cuantos('Operaciones');
    /* LO QUE TIENE QUE CAMBIAR · 73, no 70: los 3 que se perdían */
    PRUEBAS.igual(todas, 73,
      '🔴 «Operaciones» trae las 73, no 70: antes se perdían los 3 de las otras dos escrituras');
    PRUEBAS.igual(cuantos('Operaciónes'), 73, '🔴 y la del tilde trae las mismas 73');
    PRUEBAS.igual(cuantos('operaciones'), 73, '🔴 y la minúscula también');
    /* LO QUE NO PUEDE CAMBIAR · un departamento ajeno no se mezcla */
    PRUEBAS.igual(cuantos('Presidencia'), 19,
      '🔴 NO PUEDE CAMBIAR · «Presidencia» trae sólo las suyas: normalizar no puede fusionar de más');
    PRUEBAS.igual(cuantos('Pre- vuelo'), 1, '🔴 NO PUEDE CAMBIAR · ni «Pre- vuelo»');
    PRUEBAS.igual(cuantos(''), 93, '🔴 NO PUEDE CAMBIAR · sin filtro siguen estando las 93');
  });
});

PRUEBAS.caso('🔴 el alcance se deriva en UN solo lugar y nadie compara el departamento a mano', () => {
  /* ⚠️ ESTE CASO EXISTE PORQUE ARREGLAR UNA SOLA ERA LO FÁCIL Y LO EQUIVOCADO: `dashEnAlcance`
     declaraba ser la única derivación del alcance y tres funciones tenían la línea COPIADA, así que
     el panel partía el grupo en tres de sus pestañas sin que la de aptitud lo notara.

     ⚠️ SEGUNDA VERSIÓN (P227b, 2026-10-07), y la primera no podía sobrevivir al arreglo de verdad.
     Exigía `depClaveCliente(r.departamento)` exactamente CUATRO veces, o sea daba por buena la
     situación que vino a denunciar: cuatro copias que casualmente derivan igual. Cuando P227b las
     unificó en `dashEnAlcanceDe`, el conteo pasó a 0 y el caso se puso en rojo **por el arreglo**.
     Un caso que se rompe cuando el defecto se cierra está midiendo la forma, no el invariante.

     El invariante de verdad es: **una sola derivación, y todos pasan por ella**. Y se mide sobre el
     FUENTE COMPLETO, no sobre una lista de funciones escrita a mano: enumerarlas deja ciego al
     noveno sitio que alguien escriba, que es exactamente cómo esto creció de cuatro a ocho. */
  return fetch('/index.html?v=' + Date.now()).then(r => r.text()).then(src => {
    /* ⚠️ EL PATRÓN MIDE EL FILTRO DE ALCANCE, NO EL USO DE `depClaveCliente`. Mi primera versión
       buscaba `depClaveCliente(x.departamento)` a secas y cazaba un uso LEGÍTIMO: la lista de
       nómina (`nominaListFiltrar`) normaliza contra `depK`, que sale de su propio desplegable
       —`nomListDepto`— y no tiene nada que ver con `DASH.f.dep`. `verificar-adr015.py` ya tenía
       documentado ese caso. Un barrido que marca lo correcto se aprende a ignorar igual que uno
       que no ve lo incorrecto.
       La forma del filtro de alcance es `DASH.f.dep && …depClaveCliente…`, y así se cuenta: la
       guarda y la normalización en la misma sentencia, sin importar el orden de los operandos. */
    const RE_DEP = /DASH\.f\.dep\s*&&[^;]*depClaveCliente/g;
    const RE_CRUDO = /[a-z]+\.departamento\s*(?:!==|===|!=|==)\s*DASH\.f\.dep\b/g;

    const total = (src.match(RE_DEP) || []).length;
    PRUEBAS.alMenos(total, 1, 'guarda: el barrido encuentra la comparación, o no está midiendo el fuente');

    /* El cuerpo del predicado: desde su `function` hasta el próximo `function` de nivel superior. */
    const iPred = src.indexOf('function dashEnAlcanceDe(');
    PRUEBAS.alMenos(iPred, 0, 'guarda: `dashEnAlcanceDe` existe en el fuente');
    const finPred = src.indexOf('\nfunction ', iPred + 10);
    const cuerpo = src.slice(iPred, finPred);
    const dentro = (cuerpo.match(RE_DEP) || []).length;

    PRUEBAS.igual(dentro, 1, '🔴 el predicado normaliza el departamento UNA vez · ' + dentro);
    PRUEBAS.igual(total - dentro, 0,
      '🔴 y NADIE más compara el departamento por su cuenta · quedan ' + (total - dentro) +
      ' fuera del predicado · si alguien copió la línea otra vez, el panel vuelve a partir el grupo');
    /* ⚠️ LAS DOS DIRECCIONES. `RE_CRUDO` miraba sólo `x.departamento !== DASH.f.dep`; una copia
       escrita al revés —`DASH.f.dep !== r.departamento`, que es el MISMO defecto de P231 dado
       vuelta— pasaba invisible por los dos patrones. Lo midió el verificador saboteándolo. */
    const RE_CRUDO_INV = /DASH\.f\.dep\s*(?:!==|===|!=|==)\s*[a-z]+\.departamento\b/g;
    PRUEBAS.igual((src.match(RE_CRUDO) || []).length + (src.match(RE_CRUDO_INV) || []).length, 0,
      '🔴 y ninguna compara el departamento CRUDO, en NINGUNO de los dos órdenes de operandos');

    /* ⚠️ Y QUE TODOS PASEN POR AHÍ. Sin esto, el aserto de arriba también daría verde si alguien
       borrara el filtro de un sitio en vez de unificarlo — «cero comparaciones afuera» es cierto
       tanto si llaman al predicado como si no filtran nada. Son dos cosas distintas. */
    /* ⚠️ `alMenos(9)`, Y EL NÚMERO ES EL VALOR EXACTO DE HOY A PROPÓSITO. Las dos versiones
       anteriores fallaban en direcciones opuestas:
         · `alMenos(8)` con 9 ocurrencias reales TOLERABA que un sitio perdiera su llamada —
           saboteado quedaban 8 y pasaba igual, o sea el aserto que existe para que «cero
           comparaciones afuera» no dé verde cuando alguien BORRA el filtro toleraba exactamente eso;
         · `igual(9)` se rompe cuando alguien AGREGA un consumidor legítimo —`P227c` va a hacerlo, el
           ADR ya nombra 8 `render*` candidatas— y lo hace con el mensaje equivocado: apuntaría a una
           llamada faltante cuando la causa es una de más. Es el mismo modo de falla que la versión
           original de este caso, que exigía 4 copias y se rompió con el arreglo (R19).
       Un piso en el valor exacto cubre las dos: perder una da 8 y falla; agregar una da 10 y pasa. */
    const llamadas = (src.match(/dashEnAlcanceDe\(/g) || []).length;
    PRUEBAS.alMenos(llamadas, 9,
      '🔴 los 9 sitios que llaman al predicado (declaración + `dashEnAlcance` + los 7) · hay ' + llamadas +
      ' · si BAJÓ, alguien le quitó el filtro a un sitio en vez de unificarlo');

    /* DISCRIMINADOR · se reintroduce una copia de la línea en el texto y el caso TIENE que verla. */
    const roto = src.replace('function dashFiltradoEn(',
      'function dashColado(r){ if (DASH.f.dep && depClaveCliente(r.departamento) !== depClaveCliente(DASH.f.dep)) return false; return true; }\n' +
      'function dashFiltradoEn(');
    PRUEBAS.falso(roto === src, 'guarda: el sabotaje tiene que modificar el fuente');
    PRUEBAS.igual((roto.match(RE_DEP) || []).length, total + 1,
      'DISCRIMINADOR · una copia nueva de la línea TIENE que subir el conteo, o este caso no mide nada');

    /* ⚠️ Y EL SEGUNDO DISCRIMINADOR, que faltaba: el aserto de `llamadas` también tiene que poder
       ponerse en rojo. Se le quita una llamada al texto y se comprueba que el piso la ve. */
    const menos = src.replace('dashEnAlcanceDe(r, ALC_TODO)', 'true /* sin filtro */');
    PRUEBAS.falso(menos === src, 'guarda: el segundo sabotaje tiene que modificar el fuente');
    PRUEBAS.igual((menos.match(/dashEnAlcanceDe\(/g) || []).length, llamadas - 1,
      'DISCRIMINADOR · quitarle la llamada a un sitio TIENE que bajar el conteo por debajo del piso');
  });
});
