---
paths:
  - "**/*.js"
  - "**/*.html"
  - "**/*.css"
  - "sw.js"
  - "manifest.json"
---

# App de fatiga — front

**Este repo es público.** No metas acá claves, correos, nombres de pacientes ni
nada del cliente. El contexto de trabajo vive un nivel más arriba, fuera del
repo, a propósito.

Es una app web sin framework ni compilación: JavaScript de navegador, un
`index.html` y un service worker. No agregues un empaquetador, ni npm, ni una
librería, sin que Krea lo pida.

## Service worker

`sw.js` cachea la app. Si cambiás archivos y "no se ve el cambio", eso es lo
primero a descartar: hay que subir la versión del caché y recargar sin caché.
Un service worker viejo sirviendo archivos viejos es el error más caro de este
proyecto porque parece un bug de la app.

## Textos

Todo lo que ve el usuario va en **español neutro**: los usuarios son de
Venezuela. "Usted" o impersonal; *computadora*, *celular*, *carro*. Nada de
"vos" ni de modismos rioplatenses.

## Antes de decir que algo anda

Hay una suite de pruebas de verdad. Corrila:

```
bash pruebas/PRUEBAS.sh
```

Levanta el servidor de la app en 8928, el emulador del endpoint en 8929, y abre
el panel, que corre los casos solo. **Leé `pruebas/LEEME.md` antes de medir
nada**: ahí está qué se puede verificar en ese entorno y qué no — la pestaña
está oculta de forma permanente, así que las animaciones no corren, `:focus` no
engancha y el rasterizador miente en cinco cosas concretas.

Si no corriste la suite, escribí "sin probar". Nada de "debería funcionar".

## Verificación visual

Para mirar la app de verdad tenés los MCP `chrome-devtools` y `playwright`.
Usalos en vez de suponer: abrí la página, mirá la consola y la red.
