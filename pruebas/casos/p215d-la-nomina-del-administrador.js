/* ── El conteo de nómina del ADMINISTRADOR · `null` no es `[]` ──────────────────────────────────
   (2026-10-03)

   NACE DE UN INCIDENTE, y el defecto lo introduje yo en P214, el día anterior. Reporte: «hoy
   cargaron información de Silva y no se ve nada».

   `empresasPermitidas_` devuelve **`null` para el administrador maestro**, y ese `null` ES el
   significado «todas las empresas» — es lo único que distingue al maestro de una cuenta sin
   alcance. El conteo de nómina lo leía como `empresasPermitidas_(acc) || []`, y una lista vacía
   significa **ninguna**: el `indexOf` daba `-1` para las 27 filas de producción, el `return` corría
   siempre, y `nominaTotal` llegaba en 0.

   Lo que el administrador veía: la cobertura de nómina en cero y **la lista de «a quiénes no
   medimos» vacía** — mientras `accionNominaListar`, en el mismo panel, le devolvía las 27 personas.
   Dos respuestas incompatibles sobre el mismo alcance.

   ⚠️ Y LA RAMA DE AL LADO LO HACÍA BIEN: `permitidasS` lleva escrito «`null` sólo para el maestro»
   y lo respeta. El `|| []` de `permitidasP` también está bien, porque esa rama es la de supervisor
   y ahí `empresasPermitidas_` nunca devuelve `null`. Este conteo corre FUERA del `if/else`, para
   todos — y era el único de los once sitios que trataba `null` como «ninguna».

   ⚠️ Y UN SEGUNDO DEFECTO, que apareció al medir el primero: con `permS` en `null` el conteo daba
   las 27 de TODAS las empresas aunque el filtro dijera una sola, mientras `registros` en el mismo
   payload sí respetaba el filtro (452 → 113). Un denominador de 27 contra 113 registros de Silva
   es una cobertura que no significa nada.

   ⚠️ R19 · cada derecho que se afirma acá nombra la función que lo concede. */

PRUEBAS.grupo('la nómina del administrador · `null` no es `[]`');

const P215D_CAB = ['Usuario (puede ser el que quieras)', 'Contraseña (puede ser la que quieras)',
  'Rol (supervisor ve solo su empresa, admin ve todas)',
  'EMPRESAS (la lista de empresas que usuario ve, separadas por coma)',
  'Contraseña Médica (si no se pone ninguna la de supervisor abre ambas secciones)', 'Contraseña HSQ'];
const P215D_SES = ['Id', 'HashToken', 'Usuario', 'Dispositivo', 'Rol', 'Vista', 'Empresas', 'Canonical',
  'Combinada', 'Creada', 'UltimoUso', 'Estado', 'Cerrada'];
/* ⚠️ `NOMINA_HEAD` real: 17 columnas, y el nombre va en «Nombre y apellido», no en «Nombre».
   `leerNominaLeer_` lee por índice fijo. R17: el fixture es la hoja, no mi idea de la hoja. */
const P215D_NOM = ['Empresa', 'Nombre y apellido', 'Cédula', 'Departamento', 'Cargo', 'Sexo', 'Edad',
  'Teléfono', 'Email', '¿Es piloto?', 'ID de piloto', 'Rol en la app', 'Nivel de riesgo', 'Estado',
  '¿Supervisor?', '¿Servicio médico?', '¿Dirección?'];

function p215dFila(empresa, nombre, ced) {
  const f = new Array(17).fill('');
  f[0] = empresa; f[1] = nombre; f[2] = ced; f[3] = 'Operaciones'; f[4] = 'Piloto';
  return f;
}

function p215dEntorno() {
  return GS.crearEntorno({
    /* dos empresas con celda multi-variante, como en producción, y el maestro con la celda VACÍA */
    'Accesos': [P215D_CAB,
      ['*', 'clave-maestra', 'admin', '', '', ''],
      ['Alfa', 'clave-a', 'supervisor', 'Alfa S.A., Alfa', '', ''],
      ['Beta', 'clave-b', 'supervisor', 'Beta', '', '']],
    'Nómina': [P215D_NOM,
      p215dFila('Alfa S.A.', 'ANA ALFA', 'V-1'),
      p215dFila('Alfa', 'LUIS ALFA', 'V-2'),      // la MISMA empresa, por su variante
      p215dFila('Beta', 'ZOE BETA', 'V-3')],
    'Sesiones': [P215D_SES]
  });
}

PRUEBAS.caso('🔴 el ADMINISTRADOR sin filtro cuenta TODA la nómina, no cero', () => {
  /* EL DERECHO: a quién alcanza una cuenta lo concede `empresasPermitidas_`, que devuelve `null`
     para el maestro —y ese `null` significa «todas»— o la lista de un canónico para el resto.
     El conteo que llega al panel es `nominaTotal`, y la lista de quiénes no tienen ningún test es
     `nominaSinDato`; las dos se arman en `accionSupervisor` fuera del `if/else` de rol. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215dEntorno();
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'empresasPermitidas_', 'validarAcceso']);
  const J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return {}; } };
  const mae = api.validarAcceso('*', 'clave-maestra', 'd');

  /* guarda: el maestro es el único con `null`, y de ahí sale todo el defecto */
  PRUEBAS.igual(api.empresasPermitidas_(mae), null,
    'guarda: `empresasPermitidas_` devuelve `null` para el maestro — eso ES «todas»');
  PRUEBAS.igual(JSON.stringify(api.empresasPermitidas_(api.validarAcceso('Alfa', 'clave-a', 'd'))),
    '["alfa s a"]', 'guarda: y para un supervisor devuelve su canónico, nunca `null`');

  const d = J(api.accionSupervisor({ usuario: '*', pass: 'clave-maestra', dispositivoId: 'd' }));
  PRUEBAS.cierto(d.ok === true, 'guarda: el panel del maestro responde ok');
  PRUEBAS.igual(d.nominaError, null, 'guarda: y sin error de nómina — el cero no venía del `catch`');

  /* LO QUE TIENE QUE CAMBIAR */
  PRUEBAS.igual(d.nominaTotal, 3,
    '🔴 cuenta las TRES personas de la nómina: el `|| []` las dejaba en 0');
  PRUEBAS.igual((d.nominaSinDato || []).length, 3,
    '🔴 y lista a las tres como «sin datos»: con 0 la lista llegaba vacía y nadie sabía a quién le falta');
});

PRUEBAS.caso('🔴 el administrador CON una empresa en el filtro cuenta sólo esa', () => {
  /* EL DERECHO: la empresa del filtro la resuelve `gestScope`, que desde P215 devuelve SIEMPRE un
     canónico — también para el maestro. Y el centinela («*», vacío) normaliza a cadena vacía, que
     es lo que distingue «sin filtro» de «esta empresa». */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215dEntorno();
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'gestScope', 'validarAcceso']);
  const J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return {}; } };
  const tot = e => J(api.accionSupervisor({ usuario: '*', pass: 'clave-maestra', dispositivoId: 'd', empresa: e })).nominaTotal;
  const mae = api.validarAcceso('*', 'clave-maestra', 'd');

  PRUEBAS.igual(api.gestScope(mae, 'Alfa'), 'Alfa S.A.',
    'guarda: `gestScope` canoniza la variante también para el maestro');

  /* LO QUE TIENE QUE CAMBIAR · el denominador respeta el filtro */
  PRUEBAS.igual(tot('Alfa S.A.'), 2, '🔴 con «Alfa S.A.» cuenta sus DOS personas, no las tres');
  PRUEBAS.igual(tot('Alfa'), 2, '🔴 y por su VARIANTE cuenta las mismas dos');
  PRUEBAS.igual(tot('Beta'), 1, '🔴 con «Beta» cuenta una');

  /* LO QUE NO PUEDE CAMBIAR · los centinelas siguen significando «sin filtro» */
  PRUEBAS.igual(tot(''), 3, '🔴 NO PUEDE CAMBIAR · con el filtro vacío siguen siendo las tres');
  PRUEBAS.igual(tot('*'), 3, '🔴 NO PUEDE CAMBIAR · y con «*», que es lo que el cliente manda por defecto');
});

PRUEBAS.caso('🔴 los SUPERVISORES no cambian, y una sesión corrupta sigue fallando cerrada', () => {
  /* EL DERECHO: un supervisor está acotado a su canónico por `empresasPermitidas_`, que para él
     nunca devuelve `null`. El `|| []` que había era defensa contra una sesión corrupta —`empresas`
     nula y `canonical` vacío—, y esa defensa tiene que sobrevivir al arreglo: `null` no filtra,
     pero `[]` filtra todo. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215dEntorno();
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'empresasPermitidas_']);
  const J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return {}; } };

  const a = J(api.accionSupervisor({ usuario: 'Alfa', pass: 'clave-a', dispositivoId: 'd' }));
  const b = J(api.accionSupervisor({ usuario: 'Beta', pass: 'clave-b', dispositivoId: 'd' }));
  /* LO QUE NO PUEDE CAMBIAR */
  PRUEBAS.igual(a.nominaTotal, 2, '🔴 NO PUEDE CAMBIAR · «Alfa» sigue contando sus dos (las dos variantes)');
  PRUEBAS.igual(b.nominaTotal, 1, '🔴 NO PUEDE CAMBIAR · «Beta» sigue contando una');
  PRUEBAS.falso((a.nominaSinDato || []).some(n => /ZOE BETA/.test(String(n))),
    '🔴 NO PUEDE CAMBIAR · y «Alfa» NO nombra a la persona de Beta');

  /* la sesión corrupta: `empresasPermitidas_` devuelve `[]`, que tiene que seguir filtrando TODO */
  PRUEBAS.igual(JSON.stringify(api.empresasPermitidas_({ rol: 'supervisor', empresas: null, canonical: '' })),
    '[]', 'guarda: una sesión sin lista y sin canónico da `[]`, no `null`');
  PRUEBAS.igual(JSON.stringify(api.empresasPermitidas_(null)), '[]',
    '🔴 NO PUEDE CAMBIAR · y un `acc` nulo también: `[]` significa NINGUNA y falla cerrado');
});

PRUEBAS.caso('🔴 y el EFECTO de `[]` en el conteo: una sesión corrupta cuenta CERO', () => {
  /* ⚠️ ESTE CASO EXISTE PORQUE EL DE ARRIBA NO ALCANZABA. Prueba que `empresasPermitidas_`
     devuelve `[]`, no que ese `[]` FILTRE en el conteo — y el mutante que lo deshace
     (`permS && permS.length && …`) pasaba en verde. Es la misma distinción que la cuarta ronda de
     P215 tuvo que aprender: «la función devuelve X» no es «X tiene el efecto que digo».

     EL DERECHO, o el freno: el `|| []` original defendía el estado «sesión corrupta» —`empresas`
     nula y `canonical` vacío— haciendo que el conteo fallara CERRADO. El arreglo tiene que
     conservar eso: `null` no filtra, `[]` filtra todo.
     ⚠️ El estado sólo sale del camino del TOKEN: `validarAcceso` por contraseña siempre pone
     canónico. Se emite un token REAL y después se editan las columnas 7 y 8 de `Sesiones` — que
     además ES el escenario, porque esa hoja la edita gente y `sesResolver` la lee por ÍNDICE FIJO. */
  if (!CTX.hayGs) { PRUEBAS.cierto(false, '🔴 no está levantado `servir-gs.py`'); return; }
  const env = p215dEntorno();
  const api = GS.cargarGs(CTX.gs, env, ['accionSupervisor', 'accionSesionCrear']);
  const J = r => { try { return JSON.parse(r.getContent()); } catch (e) { return {}; } };

  const sana = J(api.accionSupervisor({ usuario: 'Alfa', pass: 'clave-a', dispositivoId: 'd' }));
  PRUEBAS.igual(sana.nominaTotal, 2, 'guarda: con la sesión sana, «Alfa» cuenta sus dos');

  let tk = null;
  try { const r = J(api.accionSesionCrear({ usuario: 'Alfa', pass: 'clave-a', dispositivoId: 'd', _post: true }));
        tk = r.sesion || r.token || null; } catch (e) {}
  PRUEBAS.cierto(!!tk, 'guarda: se emitió un token real');
  if (!tk) return;
  const sh = env.__libro.getSheetByName('Sesiones');
  PRUEBAS.alMenos(sh.getDataRange().getValues().length, 2, 'guarda: la fila de sesión existe');
  sh.getRange(2, 7).setValue('');     // Empresas: nula
  sh.getRange(2, 8).setValue('');     // Canonical: vacío

  const roto = J(api.accionSupervisor({ usuario: 'Alfa', pass: tk, dispositivoId: 'd' }));
  /* LO QUE NO PUEDE CAMBIAR · falla CERRADO: cero, no «todas» */
  PRUEBAS.igual(roto.nominaTotal, 0,
    '🔴 con la sesión corrupta el conteo da CERO: `[]` significa ninguna, y eso es fallar cerrado');
  PRUEBAS.igual((roto.nominaSinDato || []).length, 0,
    '🔴 y no nombra a nadie: un `[]` leído como «todas» le habría dado la nómina entera');
});
