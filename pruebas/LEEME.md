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
