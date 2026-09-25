PRUEBAS.grupo('Demo · la ficha clínica y el cuaderno de ejemplo hablan el idioma de la pantalla');

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   Las tres anotaciones médicas de ejemplo, el nombre del médico y casi todo el cuaderno de
   gestiones estaban escritos A MANO en español (R14). Con la app en inglés, la demostración
   mostraba la interfaz traducida y adentro «No apto para turno noche por 24 h: fatiga y
   somnolencia…». El comentario del código lo sabía y lo dejaba anotado como deuda.

   ⚠️ LAS DOS SIEMBRAS NO SE ARREGLAN IGUAL, y por eso hay dos casos:
   · Las anotaciones se BORRAN Y SE VUELVEN A SEMBRAR en cada entrada a la demostración, así que
     alcanza con `t()`.
   · Las gestiones NO: `gestUpsert` persiste el TEXTO, no la clave, y la siembra se saltea si ya
     hay casos («no pisar lo que el usuario editó explorando»). Traducir sin tocar esa guarda
     habría congelado el idioma del primer sembrado. Por eso cada caso guarda su `lang` y se
     re-siembra cuando no coincide.
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

function demoIdiomaPayload(){
  return { ok:true, rol:'supervisor', vista:'medico', referencia:{}, metricas:['kss'], demo:true,
    registros: [ { persona:'Ana Suárez', cedula:'V-9001', departamento:'Operaciones', empresa:'Empresa Demo', kss:5 },
                 { persona:'Beto Pérez', cedula:'V-9002', departamento:'Operaciones', empresa:'Empresa Demo', kss:3 },
                 { persona:'Caro Díaz',  cedula:'V-9003', departamento:'Operaciones', empresa:'Empresa Demo', kss:4 },
                 { persona:'Dora Lima',  cedula:'V-9004', departamento:'Operaciones', empresa:'Empresa Demo', kss:2 },
                 { persona:'Eva Mora',   cedula:'V-9005', departamento:'Operaciones', empresa:'Empresa Demo', kss:6 } ],
    comentarios: [], pvt: [], aptitud: [], turnos: [], ausencias: {}, duty: null,
    operacional: [], operacionalPeriodo: null, config: { sector:'aviacion' } };
}
// Todo el texto que la siembra escribe, en una sola cadena: títulos, detalles, tareas y seguimientos.
function demoTextoGestiones(){
  return gestCasos().filter(g => /^gdemo/.test(g.id)).map(g =>
    [g.titulo, g.detalle].concat((g.tareas||[]).map(x => x.t))
                         .concat((g.seguimientos||[]).map(x => x.texto)).join(' ')).join(' ');
}
function demoTextoAnotaciones(){
  return gestList().filter(g => /^ademo_/.test(g.id)).map(g => (g.nota||'') + ' ' + (g.medico||'')).join(' ');
}
function conIdioma(k, fn){
  let antes = null;
  try { antes = localStorage.getItem(K_LANG); localStorage.setItem(K_LANG, k); } catch(e){}
  try { return fn(); }
  finally { try { if (antes === null) localStorage.removeItem(K_LANG); else localStorage.setItem(K_LANG, antes); } catch(e){} }
}

PRUEBAS.caso('🔴 Demo · en inglés, las anotaciones médicas de ejemplo no salen en español', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    const p = demoIdiomaPayload();
    const es = conIdioma('es', () => { onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'medico'); return demoTextoAnotaciones(); });
    PRUEBAS.cierto(es.indexOf('Dr. Ejemplo') >= 0, 'guarda: en español sí se sembraron · ' + es.slice(0, 50));
    const en = conIdioma('en', () => { onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'medico'); return demoTextoAnotaciones(); });
    PRUEBAS.cierto(en.indexOf('Dr. Example') >= 0, '🔴 en inglés el médico de ejemplo es «Dr. Example» · ' + en.slice(0, 50));
    PRUEBAS.igual(en.match(/No apto|Apto para|Evaluado y en seguimiento/g), null,
      '🔴 y ningún texto de la nota quedó en español');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});

PRUEBAS.caso('🔴 Demo · el cuaderno de gestiones se re-siembra al cambiar de idioma', () => {
  const prev = DASH;
  try {
    CTX.resetear(); localStorage.clear();
    const p = demoIdiomaPayload();
    const es = conIdioma('es', () => {
      onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'medico');
      demoSembrando(gestSembrarDemo); return demoTextoGestiones(); });
    PRUEBAS.cierto(es.indexOf('Fatiga elevada') >= 0, 'guarda: en español sí se sembró · ' + es.slice(0, 40));

    /* ⚠️ MISMA SESIÓN, SIN LIMPIAR: es el caso que fallaba. Los `gdemo*` YA están en el almacén, así
       que la guarda «ya sembrado, no pisar» los dejaba en español para siempre. */
    const en = conIdioma('en', () => {
      onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'medico');
      demoSembrando(gestSembrarDemo); return demoTextoGestiones(); });
    PRUEBAS.cierto(en.indexOf('High fatigue') >= 0, '🔴 en inglés el cuaderno se re-sembró · ' + en.slice(0, 40));
    PRUEBAS.igual(en.match(/Fatiga elevada|Ansiedad|Estrés alto|Somnolencia|Ajustar rotación|Repetir test|Sin cambios significativos/g), null,
      '🔴 y no quedó ni un título, ni una tarea, ni un seguimiento en español');

    // Y vuelve: el idioma no es un viaje de ida.
    const es2 = conIdioma('es', () => {
      onDashData(p, 'Empresa Demo', { usuario:'demo' }, 'medico');
      demoSembrando(gestSembrarDemo); return demoTextoGestiones(); });
    PRUEBAS.cierto(es2.indexOf('Fatiga elevada') >= 0, '⚠️ y al volver a español también · ' + es2.slice(0, 40));
    PRUEBAS.igual(gestCasos().filter(g => /^gdemo/.test(g.id)).length, 4,
      '⚠️ y siguen siendo CUATRO · los ids se reusan, así que re-sembrar actualiza en vez de duplicar');
  } finally { try { DASH = prev; localStorage.clear(); } catch(e){} }
});
