
PRUEBAS.grupo('P096 · la cobertura se mide contra la nómina, no contra quien ya tenía tests');

/* EL DEFECTO: el panel de Dirección decía "100% de la nómina medida · 19 de 19 personas", y era
   falso POR CONSTRUCCIÓN. La lista de personas se arma desde `DASH.registros`, así que **quien
   nunca se midió no existe en el denominador**. El indicador que existe para detectar a quién no
   medimos era estructuralmente incapaz de ver a esa persona.
   Medido en la auditoría: la pestaña Ciclo listaba 20 personas y el IDC decía 19. La número 20
   tenía eventos operacionales de ese día y cero tests.

   Decisión de Franco: las DOS cosas. El denominador corregido dice cuánto falta; la línea nueva
   dice a QUIÉNES, que es lo único accionable. */

function p096Dash(nominaTotal, nominaSinDato, personas){
  return {
    vista:'hseq', demoMode:false, registros: personas.map(p => ({ persona:p, empresa:'X', kss:3 })),
    metrics:['kss'], ref:{kss:6}, f:{}, tabs:[], ausencias:{},
    nominaTotal: nominaTotal, nominaSinDato: nominaSinDato
  };
}

PRUEBAS.caso('⚠️ el denominador usa la nómina cuando llega', () => {
  const prev = DASH;
  try {
    DASH = p096Dash(20, ['Luis Ferrer'], ['Ana','Beto','Caro']);
    const html = renderHseqIdc(DASH.registros);
    PRUEBAS.cierto(/de 20/.test(html.replace(/\s+/g,' ')),
      '⚠️ el denominador tiene que ser 20 (la nómina), no 3 (los que tienen registros)');
  } finally { DASH = prev; }
});

PRUEBAS.caso('el DISCRIMINADOR: sin nómina, el denominador es el viejo', () => {
  /* Sin esto, el caso de arriba podría pasar porque el número 20 aparece por otro motivo. */
  const prev = DASH;
  try {
    DASH = p096Dash(0, [], ['Ana','Beto','Caro']);
    const html = renderHseqIdc(DASH.registros).replace(/\s+/g,' ');
    PRUEBAS.falso(/de 20/.test(html), '⚠️ sin nómina NO aparece 20 — o sea que la prueba mide algo real');
    PRUEBAS.cierto(/de 3/.test(html), 'y cae al comportamiento anterior, que no rompe nada');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ se NOMBRA a quien no tiene ninguna medición', () => {
  /* El porcentaje dice cuánto falta; esto dice a quiénes. Sin la línea, alguien que opera sin
     haberse medido nunca sigue siendo invisible: no está en ninguna lista del panel, porque todas
     se arman desde los registros y esa persona no tiene ninguno. */
  const prev = DASH;
  try {
    DASH = p096Dash(5, ['Luis Ferrer','Marta Ruiz'], ['Ana','Beto','Caro']);
    const html = renderHseqIdc(DASH.registros).replace(/\s+/g,' ');
    PRUEBAS.cierto(/Luis Ferrer/.test(html), '⚠️ aparece el nombre');
    PRUEBAS.cierto(/Marta Ruiz/.test(html), 'y el segundo');
    PRUEBAS.cierto(/2 personas/.test(html), 'y el conteo');
  } finally { DASH = prev; }
});

PRUEBAS.caso('sin nadie sin medir, no se pinta la línea', () => {
  const prev = DASH;
  try {
    DASH = p096Dash(3, [], ['Ana','Beto','Caro']);
    const html = renderHseqIdc(DASH.registros).replace(/\s+/g,' ');
    PRUEBAS.falso(/no tienen ninguna medición|no tiene ninguna medición/.test(html),
      'sin faltantes no se agrega ruido');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ una nómina MENOR que lo conocido no achica el denominador', () => {
  /* Caso borde real: la nómina puede estar desactualizada y tener menos gente que la que ya se
     midió. Si el denominador la siguiera a ciegas, la cobertura podría dar más de 100%. */
  const prev = DASH;
  try {
    DASH = p096Dash(2, [], ['Ana','Beto','Caro','Dani']);
    const html = renderHseqIdc(DASH.registros).replace(/\s+/g,' ');
    PRUEBAS.falso(/de 2/.test(html), '⚠️ no se usa una nómina más chica que lo ya conocido');
  } finally { DASH = prev; }
});

PRUEBAS.caso('⚠️ el campo sobrevive a onDashData', () => {
  /* R17 / A4: `onDashData` arma DASH con una lista CERRADA de campos. Lo que el servidor mande y
     no esté nombrado ahí se descarta sin error — es lo que ya se comió `duty` y `ausencias`. */
  const fuente = [...document.querySelectorAll('script')].map(s => s.textContent).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  PRUEBAS.cierto(/nominaTotal:\s*Number\(d\.nominaTotal\)/.test(fuente),
    '⚠️ nominaTotal está nombrado en onDashData');
  PRUEBAS.cierto(/nominaSinDato:\s*Array\.isArray\(d\.nominaSinDato\)/.test(fuente),
    'y nominaSinDato también');
});
