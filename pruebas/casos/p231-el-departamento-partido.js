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

PRUEBAS.caso('🔴 las CUATRO comparaciones usan la misma derivación, no sólo la de `dashEnAlcance`', () => {
  /* ⚠️ ESTE CASO EXISTE PORQUE ARREGLAR UNA SOLA ERA LO FÁCIL Y LO EQUIVOCADO. `dashEnAlcance`
     declara ser la única derivación del alcance y **la usa un solo llamador**: `cicloPersonas`,
     `reportesFiltrados` y `dashFilteredPVT` tienen la línea copiada. Si alguien «simplifica» esto
     dejando una sola normalizada, el panel vuelve a partir el grupo en tres de sus pestañas sin que
     la de aptitud lo note. Se mide sobre el FUENTE porque es lo único que ve las cuatro. */
  const fuente = (typeof dashEnAlcance === 'function') ? '' : null;
  const txt = [dashEnAlcance, cicloPersonas, reportesFiltrados, dashFilteredPVT]
    .map(f => String(f)).join('\n');
  const crudas = (txt.match(/r\.departamento !== DASH\.f\.dep/g) || []).length;
  const normalizadas = (txt.match(/depClaveCliente\(r\.departamento\)/g) || []).length;
  PRUEBAS.igual(crudas, 0,
    '🔴 ninguna de las cuatro compara el departamento CRUDO · quedan ' + crudas);
  PRUEBAS.igual(normalizadas, 4,
    '🔴 las CUATRO pasan por `depClaveCliente` · hay ' + normalizadas);
});
