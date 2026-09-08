# -*- coding: utf-8 -*-
r"""Barrido de ALCANZABILIDAD sobre index.html.

POR QUE EXISTE
==============
P143. `nominaRetomar()` —retomar un alta a medio hacer— estuvo MUERTA en produccion
sin que nadie lo decidiera. La cadena era:

    nominaAbrirListaEmpresas()  ->  ...  ->  nominaRetomar()

y P132 le saco el unico llamador a `nominaAbrirListaEmpresas` porque esa pantalla
publicaba el padron de empresas clientes. Nadie se pregunto que colgaba de ella.
La funcion siguio ahi, con su llamador escrito una linea mas arriba, y **su suite
siguio en verde** porque llamaba a `nominaRetomar()` directo.

Lo mismo le paso a `nominaPasoCodigo` y `nominaConfirmar`, y ahi una auditoria se
equivoco al reves: dijo que estaban vivas porque encontro sus llamadores. Estaban
escritos, si — dentro de `#nomPaso3`, un paso al que no se llega.

    Un grep encuentra la llamada. La pregunta es si alguien puede EJECUTARLA.

QUE HACE
========
Arma el grafo de llamadas de `index.html` y camina desde las RAICES REALES:

  * los atributos de evento (`onclick=`, `onchange`, ...) del HTML **estatico**,
    o sea el que esta fuera de los bloques <script>;
  * las sentencias ejecutables de nivel superior (el arranque);
  * los `addEventListener` / `window.onX =` de nivel superior.

LA PARTE QUE IMPORTA, Y LA QUE UN GREP NO PUEDE HACER
=====================================================
Un `onclick="nominaElegirEmpresa(...)"` que vive dentro de un template literal
—HTML que una funcion GENERA— **no es una raiz**: es una arista desde la funcion
que lo escribe. Si esa funcion no es alcanzable, el boton no existe nunca.
Esa sola distincion es lo que separa "tiene llamador" de "se puede llegar".

COMO LEER EL RESULTADO
======================
Dos grupos, y el segundo es el peligroso:

  HUERFANAS       nadie las nombra en ningun lado. Un grep tambien las encuentra.
  INALCANZABLES   tienen llamadores escritos, pero TODOS estan a su vez muertos.
                  Estas son las de P143: un grep dice que estan vivas.

Un hallazgo NO es automaticamente un bug: puede ser codigo guardado a proposito
(el "camino viejo" del alta lo esta, por decision de Franco del 2026-09-08). Por
eso hay una lista blanca abajo, con el motivo de cada entrada. **Agregar algo a esa
lista sin escribir el motivo convierte este barrido en otro instrumento que dice
cero sin medir nada.**

COMO CORRERLO
=============
    python pruebas/alcanzabilidad.py            # informe
    python pruebas/alcanzabilidad.py --json     # para la suite

LIMITES CONOCIDOS
=================
  * Analisis de texto, no interprete. SOBRE-aproxima las aristas: cuenta CUALQUIER
    mencion del identificador, no solo `nombre(`. Tiene que ser asi — la primera
    version solo miraba llamadas con parentesis y dio por muerto el modulo entero de
    gestiones, porque se alcanza con `vis.map(gestCard)`: una referencia, no una
    llamada. Es el lado seguro — un falso "vivo" se descarta mirando; un falso
    "muerto" haria que alguien borre codigo que si se usa.
  * Los comentarios NO cuentan como arista: este archivo cita funciones muertas
    justamente para explicar que lo estan.
  * No sigue funciones anonimas asignadas a variables ni handlers puestos por
    `el.onclick = fn` con `fn` calculada.
  * Las llamadas desde `pruebas/` NO cuentan como raiz, a proposito: una funcion que
    solo ejecuta la suite esta muerta para la persona que usa la app. Ese es
    exactamente el agujero por el que se colo P143.
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
IDX = os.path.normpath(os.path.join(AQUI, "..", "index.html"))
# Se puede apuntar a otra copia: `python pruebas/alcanzabilidad.py --archivo /tmp/viejo.html`.
# Es lo que permite el DISCRIMINADOR HISTORICO — correrlo contra el commit anterior a
# P143 y comprobar que ahi si aparece `nominaRetomar`. Un barrido nuevo que da cero no
# prueba nada; lo que prueba algo es que encuentre el bug que ya sabemos que existio.
if "--archivo" in sys.argv:
    IDX = sys.argv[sys.argv.index("--archivo") + 1]

# Lista blanca: inalcanzable Y ESTA BIEN. Cada entrada lleva su motivo.
ESPERADAS = {
    # ── el camino viejo del alta ────────────────────────────────────────────────
    "nominaAbrirListaEmpresas": "camino viejo del alta · P132 le saco el llamador porque publicaba el padron de 11 empresas clientes a cualquiera. Franco pidio guardarlo INACTIVO, no borrarlo (2026-09-08)",
    "nominaElegirEmpresa":      "idem · solo se alcanza desde el HTML que genera nominaAbrirListaEmpresas",
    "cargandoHtml":             "idem · el esqueleto de carga de esa lista, sin otro consumidor",
    # ── modulo de casos Odoo, entero ────────────────────────────────────────────
    "casosOdooEvaluar":         "P144 · NADIE la llama, y de ella cuelga el modulo entero. Sin decision de Franco no se borra ni se conecta",
    "casosOdooDescarte":        "idem · cuelga de casosOdooEvaluar",
    "casosOdooFila":            "idem",
    "casosOdooMotivo":          "idem",
    "casosOdooSeveridad":       "idem",
    "casosOdooValores":         "idem",
    # ── impresion del panel, entera ─────────────────────────────────────────────
    "dashImprimirCabecera":     "P144 · nadie la llama; de ella cuelga toda la impresion del panel",
    "dashImprimir":             "idem · cuelga de dashImprimirCabecera",
    "dashImprimirDesactivado":  "idem",
    "dashImprimirPie":          "idem",
    # ── sueltas, ya conocidas o benignas ────────────────────────────────────────
    "bitPull":                  "el propio codigo lo documenta: «bitPull() hoy no lo llama nadie — esta definida y sin uso» (index.html:24529)",
    "splashPortal":             "Q4d la dejo sin llamador a proposito: destapaba las tres pestanas de credencial desde «Administrador». `q4d-cierre-del-inicio.js` ya la vigila en su lista de muertas. ⚠️ pero `m5-coherencia-visual.js` la USA para armar una pantalla — prueba un camino que la persona no tiene",
    "dashSetTab":               "el propio codigo la marca «compat con llamadas viejas»",
    "seguirTrasTamanoTexto":    "alias de una linea (`avanzarAlta()`), sin llamador",
    "nFmt":                     "formateador de numeros sin consumidor; de el cuelga langTag",
    "langTag":                  "idem · solo la nombra nFmt",
    "dashMesCorto":             "sin consumidor",
    "dashMismoDia":             "sin consumidor",
    "gestVisible":              "sin consumidor",
    "setFilterValues":          "sin consumidor",
    "entradaCirculosHtml":      "sin consumidor",
    "activarFlujoApple":        "sin consumidor",
    "tareasArranque":           "sin consumidor",
}


def cargar():
    return io.open(IDX, encoding="utf-8", errors="replace").read()


def partir(src):
    """Separa el JS (dentro de <script> sin src) del HTML estatico. Conserva las
       lineas: lo que se saca se reemplaza por lineas vacias, asi los numeros valen."""
    js_lineas = [""] * len(src.split("\n"))
    html_lineas = src.split("\n")[:]
    for m in re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", src, re.S):
        ini = src[: m.start(1)].count("\n")
        for k, l in enumerate(m.group(1).split("\n")):
            js_lineas[ini + k] = l
            html_lineas[ini + k] = ""
    return js_lineas, html_lineas


def funciones(L):
    """Cuerpos de las funciones declaradas en columna 0, por conteo de llaves.
       Devuelve tambien QUE LINEAS ocupan, que es lo que permite calcular su
       complemento: todo lo demas del JS es codigo que corre al cargar."""
    out, cubiertas, i = {}, set(), 0
    while i < len(L):
        m = re.match(r"^function\s+([A-Za-z_$][\w$]*)\s*\(", L[i])
        if not m:
            i += 1
            continue
        nom, prof, j, cuerpo = m.group(1), 0, i, []
        while j < len(L):
            prof += L[j].count("{") - L[j].count("}")
            cuerpo.append(L[j])
            j += 1
            if prof <= 0 and j > i:
                break
        out[nom] = {"linea": i + 1, "cuerpo": "\n".join(cuerpo)}
        cubiertas.update(range(i, j))
        i = j
    return out, cubiertas


def sin_comentarios(txt):
    """Un comentario que nombra una funcion no la mantiene viva. Este archivo tiene
       comentarios larguisimos que citan funciones muertas justamente para explicar
       que estan muertas: contarlos como aristas seria medir la propia prosa.

       ⚠️ SE APLICA AL TEXTO COMPLETO, NUNCA LINEA POR LINEA. La primera version
       llamaba a esto con una linea suelta, asi que un /* ... */ de veinte lineas no
       se limpiaba: ninguna linea del medio tiene el /* ni el */. Efecto medido: el
       comentario de `nominaAbrir` que EXPLICA que el camino viejo esta muerto lo
       mantenia vivo, y el barrido decia cero donde habia ocho.

       De los `//` solo se quita el que ABRE la linea: uno al final se comeria las
       URLs (`https://...`), y perder una arista real es el error caro — daria por
       muerta una funcion que si se usa."""
    txt = re.sub(r"/\*.*?\*/", lambda m: "\n" * m.group(0).count("\n"), txt, flags=re.S)
    # ⚠️ `[ \t]*` y NO `\s*`: en Python `\s` incluye el salto de linea, asi que `^\s*//`
    #    se traga los saltos ANTERIORES y el texto pierde lineas. Medido: 151 lineas
    #    menos, que corre todos los numeros y desalinea `cubiertas` — el barrido pasaba
    #    a ver 454 raices que en realidad viven dentro de una funcion.
    txt = re.sub(r"(?m)^[ \t]*//.*$", "", txt)
    return txt


def raices(js, html, nombres, cubiertas):
    """Los tres orígenes reales de ejecucion."""
    r, porque = set(), {}

    def sumar(n, motivo):
        if n in nombres and n not in r:
            r.add(n)
            porque[n] = motivo

    # 1 · atributos de evento del HTML ESTATICO
    htxt = "\n".join(html)
    for m in re.finditer(r"\bon[a-z]+\s*=\s*\"([^\"]*)\"", htxt):
        for n in re.findall(r"[A-Za-z_$][\w$]*", m.group(1)):
            sumar(n, "HTML estatico: " + m.group(0)[:48])

    # 2 · TODO el JS que no vive dentro de una funcion declarada. O sea: el arranque,
    #     pero tambien los cuerpos de los `addEventListener(..., function(e){ ... })`
    #     y de las IIFE de nivel superior.
    #     ⚠️ ESTE ERA EL AGUJERO DE LA PRIMERA VERSION. Miraba solo las lineas en
    #     columna 0, asi que todo lo que un listener inline llama desde adentro (que
    #     esta indentado) quedaba invisible: el modulo entero de gestiones aparecia
    #     muerto. Un barrido que reporta 97 muertas donde hay 8 no lo lee nadie.
    for i, l in enumerate(js):
        if i in cubiertas or not l.strip():
            continue
        for n in re.findall(r"[A-Za-z_$][\w$]*", l):
            sumar(n, "nivel superior, linea %d" % (i + 1))

    # 3 · listeners y handlers de nivel superior (pueden estar indentados dentro de
    #     un addEventListener multilinea, asi que se busca en todo el JS)
    jtxt = "\n".join(js)
    for m in re.finditer(r"addEventListener\s*\(\s*['\"][a-z]+['\"]\s*,\s*([A-Za-z_$][\w$]*)\s*[,)]", jtxt):
        sumar(m.group(1), "addEventListener")
    for m in re.finditer(r"(?:window|document)\.on[a-z]+\s*=\s*([A-Za-z_$][\w$]*)\s*;", jtxt):
        sumar(m.group(1), "handler global")
    return r, porque


def analizar():
    src = cargar()
    js, html = partir(src)
    # ⚠️ Los comentarios se borran del JS ENTERO antes de nada, conservando los saltos
    #    de linea para que los numeros sigan valiendo. `funciones()` corre dos veces:
    #    sobre el original (necesita las llaves reales para cerrar los cuerpos) y sobre
    #    el limpio, que es de donde salen las aristas.
    js_limpio = sin_comentarios("\n".join(js)).split("\n")
    fns, cubiertas = funciones(js)
    fns_limpias, _ = funciones(js_limpio)
    nombres = set(fns)

    # Aristas. Se mira el cuerpo SIN comentarios, pero SI con los strings: un
    # onclick dentro de un template literal es una arista real desde quien lo genera.
    llama = {}
    for n, d in fns.items():
        cuerpo = fns_limpias.get(n, {}).get("cuerpo", "")
        
        vistos = set(re.findall(r"[A-Za-z_$][\w$]*", cuerpo))
        vistos.discard(n)
        llama[n] = vistos & nombres

    r, porque = raices(js_limpio, html, nombres, cubiertas)

    vivas, cola = set(r), list(r)
    while cola:
        a = cola.pop()
        for b in llama.get(a, ()):
            if b not in vivas:
                vivas.add(b)
                cola.append(b)

    muertas = sorted(nombres - vivas)
    quien_la_nombra = {}
    for m in muertas:
        quien_la_nombra[m] = sorted(a for a in nombres if m in llama.get(a, ()))

    return {
        "total": len(nombres),
        "raices": len(r),
        "vivas": len(vivas),
        "huerfanas": [m for m in muertas if not quien_la_nombra[m]],
        "inalcanzables": [m for m in muertas if quien_la_nombra[m]],
        "nombrada_por": quien_la_nombra,
        "lineas": {m: fns[m]["linea"] for m in muertas},
        "esperadas": ESPERADAS,
    }


def informe(d):
    print("funciones declaradas: %d" % d["total"])
    print("raices reales:        %d" % d["raices"])
    print("alcanzables:          %d" % d["vivas"])
    print("")
    nuevas_i = [m for m in d["inalcanzables"] if m not in ESPERADAS]
    nuevas_h = [m for m in d["huerfanas"] if m not in ESPERADAS]

    if nuevas_i:
        print("INALCANZABLES CON LLAMADOR ESCRITO (las de P143 · un grep las da por vivas):")
        for m in nuevas_i:
            print("  %-32s linea %-6d la nombra: %s" % (m, d["lineas"][m], ", ".join(d["nombrada_por"][m])))
        print("")
    if nuevas_h:
        print("HUERFANAS (nadie las nombra):")
        for m in nuevas_h:
            print("  %-32s linea %d" % (m, d["lineas"][m]))
        print("")
    ya = [m for m in d["inalcanzables"] + d["huerfanas"] if m in ESPERADAS]
    if ya:
        print("Muertas ESPERADAS (%d), con su motivo:" % len(ya))
        for m in sorted(ya):
            print("  %-32s %s" % (m, ESPERADAS[m]))
        print("")
    if not nuevas_i and not nuevas_h:
        print("Sin hallazgos nuevos.")
    print("Un hallazgo NO es automaticamente un bug: hay que ir a mirar. Lo que este")
    print("barrido garantiza es que no aparezca uno NUEVO sin que nadie lo note.")


if __name__ == "__main__":
    d = analizar()
    if "--json" in sys.argv:
        print(json.dumps(d, ensure_ascii=False))
    else:
        informe(d)
