# -*- coding: utf-8 -*-
r"""Barrido de ORDEN DE DECLARACION sobre index.html.

POR QUE EXISTE
==============
Este archivo unico de ~19.500 lineas mordio TRES VECES en el mismo lugar, y las tres
veces el sintoma fue distinto y ninguno decia "error de orden":

  1) `let _splAnim = null` declarado DESPUES del arranque
     -> "Cannot access '_splAnim' before initialization"
     -> el error CORTA la ejecucion del resto del script: no se rompe una funcion,
        se rompen todas las que venian despues. Media app deja de existir.

  2) `var SPLASH_ANIM_ACTIVA = true` declarado DESPUES del arranque
     -> `var` iza la DECLARACION pero no la ASIGNACION, asi que al arrancar vale
        `undefined` y la guarda corta en silencio. Sin error en consola.
     -> El usuario lo describio como: "cuando cargo la pagina no se mueve, pero si
        entro a un boton y vuelvo, ahi si". (Al volver, la asignacion ya corrio.)

  3) `var _splAnim = null` declarado DESPUES del arranque
     -> la funcion arranca, guarda su estado, y esa linea despues lo PISA con null.
     -> quedo un temporizador huerfano que ningun freno alcanzaba, gastando bateria
        abajo de la app.

LA REGLA QUE SALIO DE ESO
=========================
Lo que use el camino de ARRANQUE va como **funcion declarada** (se iza entera).
Si tiene que ser variable, se declara **sin asignar** (`var x;`), porque una
declaracion sin valor no pisa lo que ya hay.

QUE HACE ESTE BARRIDO
=====================
Lo que un `grep` no puede: sigue las LLAMADAS. Los tres bugs fueron indirectos —el
arranque llama a una funcion, y esa funcion lee una variable declarada mas abajo—,
asi que buscar el nombre de la variable cerca del arranque no encuentra nada.

  1. Junta las variables de nivel superior CON asignacion.
  2. Junta los cuerpos de las funciones de nivel superior.
  3. Junta las sentencias EJECUTABLES de nivel superior (el "arranque").
  4. Desde cada sentencia sigue las llamadas hasta 3 niveles de profundidad y
     avisa si alguna funcion alcanzada lee una variable declarada MAS ABAJO.

COMO CORRERLO
=============
    python pruebas/orden-declaracion.py

Sin hallazgos, no imprime nada mas que el resumen. Con hallazgos, imprime una linea
por variable en riesgo.

COMO LEER EL RESULTADO
======================
Un hallazgo NO es automaticamente un bug. Puede estar protegido. En la ultima
corrida (2026-08-29) aparecieron dos, y los dos estaban bien:

  * TAREAS  -> lo lee `renderInicio()`, que corre en el arranque. Esta envuelto en
               try/catch a proposito, con el comentario que explica la trampa.
               OJO: `typeof` NO sirve para protegerse aca. Con `let`/`const` en zona
               muerta, `typeof` TAMBIEN lanza. La unica proteccion es el try/catch.
  * NOMLIST -> lo alcanza `aplicarIdioma()`, pero solo con el panel de nomina
               abierto (imposible al arrancar), y ademas dentro de un try/catch.

O sea: ante un hallazgo hay que ir a mirar. Lo que este barrido garantiza es que
no aparezca uno NUEVO sin que nadie lo note.

LIMITES CONOCIDOS
=================
  * Es un analisis de texto, no un interprete. Sobre-aproxima: sigue cualquier
    nombre de funcion que aparezca en el cuerpo, incluso en ramas que no corren.
    Preferible asi: falso positivo se descarta mirando; falso negativo no se ve.
  * No entra en funciones anonimas ni en callbacks asignados a variables.
  * Solo mira el nivel superior (columna 0). Lo anidado tiene su propio alcance.
"""
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
IDX = os.path.normpath(os.path.join(AQUI, "..", "index.html"))
PROF_MAX = 3


def cargar(ruta):
    return io.open(ruta, encoding="utf-8", errors="replace").read().split("\n")


def variables_con_valor(L):
    """Variables de nivel superior que ASIGNAN. Las que solo declaran no molestan."""
    out = {}
    for i, l in enumerate(L):
        m = re.match(r"^(var|let|const)\s+([A-Za-z_$][\w$]*)\s*=", l)
        if m:
            out.setdefault(m.group(2), (i + 1, m.group(1)))
    return out


def funciones(L):
    """Cuerpos de las funciones declaradas en columna 0, por conteo de llaves."""
    out, i = {}, 0
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
        out[nom] = (i + 1, "\n".join(cuerpo))
        i = j
    return out


def arranque(L):
    """Sentencias ejecutables de nivel superior: lo que corre al cargar la pagina."""
    out = []
    for i, l in enumerate(L):
        t = l.rstrip()
        if not t or t[0] in " \t":
            continue
        if re.match(r"^(var|let|const|function|class|/\*|\*|//|\}|\)|<|@|\.|import|export)", t):
            continue
        out.append((i + 1, t))
    return out


def llamadas(txt):
    return set(re.findall(r"\b([A-Za-z_$][\w$]*)\s*\(", txt))


def main():
    L = cargar(IDX)
    decl, funcs, ejec = variables_con_valor(L), funciones(L), arranque(L)

    riesgos = {}
    for linea, txt in ejec:
        vistos, pila = set(), [(n, 1) for n in llamadas(txt) if n in funcs]
        while pila:
            fn, prof = pila.pop()
            if fn in vistos or prof > PROF_MAX:
                continue
            vistos.add(fn)
            _, cuerpo = funcs[fn]
            for nom, (dl, tipo) in decl.items():
                if dl > linea and re.search(r"\b" + re.escape(nom) + r"\b", cuerpo):
                    riesgos.setdefault(nom, (tipo, dl, fn, linea))
            for sig in llamadas(cuerpo):
                if sig in funcs and sig not in vistos:
                    pila.append((sig, prof + 1))

    print("variables de nivel superior con valor: %d" % len(decl))
    print("funciones de nivel superior:           %d" % len(funcs))
    print("sentencias de arranque:                %d" % len(ejec))
    print()
    if not riesgos:
        print("Sin variables alcanzables desde el arranque antes de su asignacion.")
        return 0
    print("ALCANZABLES DESDE EL ARRANQUE ANTES DE ASIGNARSE (hay que ir a mirar cada una):")
    for nom, (tipo, dl, fn, linea) in sorted(riesgos.items()):
        print("  %-22s %-5s declarada en %5d | la usa %-28s alcanzada desde la linea %d"
              % (nom, tipo, dl, fn + "()", linea))
    print()
    print("Un hallazgo NO es automaticamente un bug: puede estar protegido con try/catch.")
    print("Ver la cabecera de este archivo para los dos casos ya revisados y por que estan bien.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
