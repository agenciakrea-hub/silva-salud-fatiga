# Pruebas

## Cómo correrlas

**Doble clic en `PRUEBAS.bat`, desde el Explorador de Windows.**

Levanta los dos servidores que hacen falta y abre el panel, que corre las pruebas solo. Verde o
rojo por caso; en las fallas dice qué esperaba, qué obtuvo y por qué importa.

> ⚠️ Tiene que ser desde el **Explorador de Windows**. Si lo abrís desde el árbol de archivos de
> un editor, se abre como texto y no pasa nada.

Si preferís hacerlo a mano, son dos pasos:

```bash
python pruebas/servir-gs.py
```

y después abrir `http://127.0.0.1:8928/pruebas/panel.html` (con el servidor de la app corriendo en
el 8928).

## Qué hay que saber si algo no arranca

| Síntoma | Qué pasa |
|---|---|
| El panel dice que se saltearon los casos del endpoint | No está corriendo `servir-gs.py`. Los casos de cliente igual corrieron. |
| "no encuentro Python en el PATH" | Instalar Python. El `.bat` prueba primero `py` y después `python`. |
| El panel no abre | El servidor de la app no está en el 8928. El `.bat` lo levanta solo. |

## ⚠️ El entorno miente: lo que NO se puede verificar acá

Esto es lo que más tiempo hizo perder, y no se descubre leyendo: se descubre midiendo algo, sacando
una conclusión equivocada y volviendo. Está acá para no volver a pagarlo.

La sesión de Claude corre el navegador con la pestaña **oculta de forma permanente**. Eso arrastra
tres consecuencias que hacen que cosas correctas *parezcan* rotas:

| Lo que se observa | Por qué | Cómo verificarlo de verdad |
|---|---|---|
| Las animaciones no corren y todo queda en el primer fotograma | `document.hidden` es siempre `true`, así que la app pone `.sin-animaciones`. Con `fill: both`, el elemento se queda en el `from` del keyframe — y si ese `from` es `opacity: 0`, **se ve vacío** | Sacar la clase a mano (`classList.remove('sin-animaciones')`) y recién ahí medir |
| `:focus` no engancha aunque `document.activeElement` sea el campo | `document.hasFocus()` da `false`: la ventana nunca tiene el foco | No se puede. Se comprueba **sobre la regla CSS**, no sobre el estado |
| Un `<video>` se clava a mitad de la reproducción | El navegador pausa el video con la pestaña oculta, así que el evento `ended` no llega nunca | Medir `currentTime` antes y después; no esperar `ended` |

**Y las capturas de pantalla del entorno se cuelgan** (es la R11 del proyecto). Por eso existe
`capturar.js`. Pero esa herramienta tiene sus propios límites, y **ya me hizo reportar cinco defectos
que no existían**:

1. **No carga DM Sans** → usa una tipografía de respaldo más ancha, así que parte más texto que la
   app real.
2. **No trae imágenes externas** → el logo sale como imagen rota. En la app carga perfecto.
3. **No copia `fill` ni `stroke` de SVG** → un gráfico de líneas sale como un triángulo negro.
4. **No copia `text-decoration`** → las píldoras salieron subrayadas.
5. **No clona pseudo-elementos** → un tilde hecho con `::after` no aparece.

### La regla que resume todo esto

> **Cuando la imagen y la medición no coinciden, manda la medición.**
> **Salvo para SVG, imágenes y pseudo-elementos, donde manda la imagen** — porque ahí el rasterizador
> no dibuja lo que la app sí dibuja.

Y la de fondo, que costó dos vueltas aprender: **una herramienta de verificación que miente es peor
que no tenerla**, porque el error se propaga como si fuera un hallazgo. Cuando una captura muestre un
defecto, medirlo antes de reportarlo.

---

## Cómo correr la suite desde una sesión de Claude

Tres servidores, y los tres tienen que estar arriba:

| Puerto | Qué | Cómo |
|---|---|---|
| 8928 | La app | `python -m http.server 8928 --bind 127.0.0.1` desde `silva-salud-fatiga/` |
| 8929 | El endpoint (`.gs`) | `python pruebas/servir-gs.py` — ruta `/endpoint` |
| 8930 | Recibe las capturas | `python pruebas/servir-captura.py` |

Después se abre `http://127.0.0.1:8928/pruebas/panel.html` y se toca "Correr las pruebas".

⚠️ **Dos cosas que hacen fallar la corrida y no son culpa del código:**

- **Recargar y medir en la misma llamada no funciona.** `location.reload()` corta la conexión de la
  herramienta y devuelve *"Inspected target navigated or closed"*. Hay que recargar en una llamada y
  medir en la siguiente.
- **Hay que esperar a que el iframe cargue** antes de tocar el botón (unos 3 a 4 segundos). Si se
  toca antes, los casos que necesitan el endpoint se saltean y el resultado engaña.

### La prueba de la caché que dependía de la red

Al arrancar, la app dispara `tareasCargar()` contra el endpoint real y deja `TAREAS.cargando = true`
por 2,5 a 5 segundos. La suite entera corre en menos de 1 s, o sea **dentro de esa ventana**: la
prueba de la caché de M2 pasaba o fallaba según lo rápida que estuviera la red, y **aislada pasaba
siempre**, que es lo que la hacía difícil de ver. Por eso `CTX.resetear()` limpia ese flag.

Mismo criterio: `CTX.resetear()` también llama a `appRevelar(true)`, porque desde N11 la app arranca
oculta si no hay perfil completo. Sin eso, media suite mide todo en 0 y da rojo por algo que en la
app real no pasa.

---

## Errores propios que se repitieron, para no repetirlos

No son del código: son de cómo escribí las pruebas y los scripts.

1. **Probar la implementación en vez del comportamiento.** Varias pruebas fijaban un número o una
   regla CSS concreta (`animation-delay: .04s`, una media query puntual) y **fallaban cuando el
   arreglo era una mejora**. La prueba tiene que decir *qué tiene que pasar*, no *cómo está escrito*.
   Ejemplo bueno: en vez de fijar el retraso, comparar contra el escalón del botón — así sobrevive a
   que el bloque se mueva.

2. **El heredoc de bash se come las barras invertidas.** Escribiendo un caso con `new RegExp('\\'+…)`
   quedó una cadena sin cerrar y **se rompió el archivo entero**: la suite no cargó ni un caso y el
   panel dijo "0 comprobaciones" en vez de dar rojo. Para archivos con expresiones regulares, escribir
   con Python o con la herramienta de escritura, nunca con heredoc.

3. **Medir sobre elementos ocultos.** `getComputedStyle` de algo con `display:none` devuelve valores
   por defecto. Antes de medir, abrir el overlay — y acordarse de cerrarlo después.

4. **Confundir la caja de padding con la de contenido.** Dos veces: `overflow:hidden` recorta en la
   caja de PADDING (un padding horizontal abre una ventana más ancha que la diapositiva y asoman las
   vecinas), y los porcentajes de un elemento absoluto se miden contra la caja de padding del
   contenedor (agregar padding *desplaza* al hijo en vez de acomodarlo).

---

## Por qué corren en el navegador y no con una herramienta de verdad

En esta máquina **no hay Node**, así que Jest, Vitest y Playwright quedan descartados. Python sí
hay, pero Python no ejecuta JavaScript — y todo lo que hay que probar es JavaScript: la app es un
`index.html` con el script inline y el endpoint es un `.gs`.

Igual sería la decisión correcta: buena parte de lo que hay que probar acá sólo existe en la app
viva. Que un botón no quede tapado por un elemento invisible, que un desplegable no corte
contenido, que un color tenga contraste sobre el fondo que de verdad tiene detrás — nada de eso se
puede comprobar sobre un DOM simulado. Un simulacro que se desincroniza de la app real es peor que
no tener pruebas: da verde mientras producción está roja.

## El endpoint nunca se copia acá

El `.gs` vive **fuera** de este repo porque trae la clave de la API de Gemini y **este repo es
público**. `servir-gs.py` lo sirve desde donde está, en memoria, sólo a `127.0.0.1` y con una única
ruta.

La salida fácil sería copiarlo adentro y ponerlo en `.gitignore`. No se hace, y hay precedente:
`_check.js` y `_harness.js` estaban listados en `.gitignore` **y aun así publicados en GitHub**,
porque se commitearon antes de que se agregara el ignore. Si esa secuencia se repitiera con una
copia del `.gs`, lo que se publica es una clave de API.

## Cómo agregar un caso

1. Crear el archivo en `casos/`. La convención del nombre es `cliente-*.js` o `servidor-*.js`.
2. Sumar el nombre a `casos.json`. Si necesita la fuente del endpoint, sumarlo también a
   `soloConGs` — así se saltea con un aviso cuando `servir-gs.py` no está, en vez de fallar en
   falso.

```js
PRUEBAS.grupo('De qué se trata');

PRUEBAS.caso('qué tiene que pasar', () => {
  PRUEBAS.igual(loQueSalio, loQueEsperaba, 'por qué importa que esto se cumpla');
});
```

Comprobaciones disponibles: `igual`, `cierto`, `falso`, `alMenos`, `comoMucho`, `existe`.
En los casos hay dos ayudas: `CTX.resetear()` deja la app en un estado conocido, y
`CTX.contraste(a, b)` calcula contraste WCAG.

### El tercer argumento no es opcional en la práctica

**Siempre poner el "por qué".** Es lo que se lee cuando el caso falla dentro de seis meses, y lo
que permite decidir si el caso sigue teniendo sentido o quedó viejo. Un caso que dice
`esperaba 480, obtuvo 720` sin explicación obliga a abrir el código; con el porqué —*"tiene que ser
la jornada configurada por la empresa, no el default del sector"*— se entiende solo.

### Dos guardarraíles que conviene conocer

- **Un caso que no comprueba nada se marca ROJO.** No es un descuido del marco: en este proyecto
  ya hubo una suite que daba verde sin ejercitar el código.
- **Un caso que lanza una excepción no frena a los demás.** Se marca como falla con el error, y el
  resto sigue corriendo.

## Antes de dar por buena una prueba nueva: rompela

Una prueba que nunca se vio fallar no es una prueba, es una afirmación. Lo que vale es comprobar
que **se pone roja cuando lo que protege se rompe**: deshacé a propósito el arreglo, corré la
suite, y recién cuando la veas en rojo por el motivo correcto, volvé a dejar el código como estaba.

Todos los casos de esta carpeta se validaron así. Y no es teórico: al escribir los casos de idioma
apareció un bug real —"Tu actividad" no se traducía al cambiar de idioma— que se había escapado
porque cuando lo verifiqué a mano llamé al repintado yo mismo, que era justo lo que ocultaba el
problema.
