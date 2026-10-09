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

En P209 (2026-09-29) aparecieron CUATRO mas, y los cuatro son el mismo caso:

  * _anotCache, _restCache, _notaCache, _telemCache
               -> los alcanza `gestPush()` (via `gestSaveStore` -> los `*CacheClear`),
                  y `gestPush` entra al grafo por el `setInterval(..., 60000)` que P209
                  le agrego para que la cola de gestiones se reintente sola. El callback
                  corre 60 SEGUNDOS despues, o sea con el script terminado hace rato:
                  no hay zona muerta posible. El barrido los marca porque sigue el nombre
                  dentro del callback sin mirar el retardo, que es la sobre-aproximacion
                  que los LIMITES CONOCIDOS de abajo declaran.
                  Si algun dia alguien llama a `gestPush()` de forma SINCRONICA desde el
                  arranque, estos cuatro pasan a ser un bug de verdad.

  * DASH, K_DISPOSITIVO_ID, K_TURNOS, TURNO_TIPOS
               -> misma historia, por el otro reloj: `setInterval(function(){ empFlush(); },
                  60000)`. P209 ENVOLVIO ese callback a proposito —Firefox le pasa el "lateness"
                  como argumento, o sea que `empFlush` pelado recibia `alSalir` TRUTHY, y desde
                  P209 eso ya no significa solo `keepalive`: tambien reintenta los TRABADOS, que
                  es justo lo que ese prompt vino a cerrar—. Al envolverlo, el barrido pasa a
                  entrar en el callback y sigue la cadena `empFlush -> turnoGuardar -> ...`.
                  Los cuatro corren 60 SEGUNDOS despues del arranque: sin zona muerta.

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


def sin_comentarios(s):
    """Quita comentarios respetando cadenas, PRESERVANDO los saltos de linea para que los
    numeros de linea que este barrido reporta sigan siendo los del archivo real.

    ⚠️ POR QUE ESTA ACA. Hasta el 2026-10-09 este barrido leia el archivo CRUDO, y 7 de sus 19
    hallazgos eran FALSOS POSITIVOS por comentario: `DASH` en `empFlush()`, `TAREAS` en
    `onDashData()`, `TURNO_TIPOS` en `turnoGuardar()` y los cuatro `_*Cache` de `gestPush()` no se
    usan en esas funciones — se MENCIONAN en un comentario. La cabecera de este archivo declara 10
    casos "ya revisados y por que estan bien", o sea alguien los reviso uno por uno sin notar que
    siete no eran hallazgos. Un barrido que grita por lo correcto se aprende a ignorar igual que uno
    que no ve lo que falta, y el dia que marque un orden de declaracion real nadie lo va a mirar.
    Ademas arregla de paso el conteo de llaves de `funciones()`: una `{` dentro de un comentario
    desincronizaba el cuerpo, que es el defecto que ya mordio a otros dos barridos del repo.
    ⚠️ Lo que NO hace: no toca las llaves dentro de CADENAS. Una `{` en un template literal sigue
    desincronizando el conteo. Es el hueco conocido de este script, no se midio cuanto pesa."""
    out, i, n, estado = [], 0, len(s), None
    while i < n:
        c, d = s[i], (s[i + 1] if i + 1 < n else "")
        if estado is None:
            # Una barra ESCAPADA no abre comentario: esta rama es la que faltaba y el verificador la
            # midio. Fuera de una cadena, un `\` antes de `/` solo aparece dentro de un literal de
            # regex, y el despojador no los modela: `if (/EdgiOS|Edg\//.test(ua)) …` entraba en
            # estado "linea" y SE COMIA el resto de la linea, incluido codigo. Con el discriminador
            # ejecutado quedo probado que podia HACER DESAPARECER un hallazgo real de R16 — una
            # lectura en zona muerta en una de esas lineas dejaba de verse, o sea el script quedaba
            # PEOR que antes para ese caso. Cinco sitios en el index.html vivo.
            if c == "/" and s[i - 1:i] == "\\":
                out.append(c); i += 1; continue
            if c == "/" and d == "/":
                estado = "linea"; i += 2; continue
            if c == "/" and d == "*":
                estado = "bloque"; out.append(" "); i += 2; continue
            if c in ('"', "'", "`"):
                estado = c; out.append(c); i += 1; continue
            out.append(c); i += 1; continue
        if estado == "linea":
            if c == "\n":
                estado = None; out.append("\n")
            i += 1; continue
        if estado == "bloque":
            if c == "*" and d == "/":
                estado = None; i += 2; continue
            out.append("\n" if c == "\n" else " "); i += 1; continue
        if c == "\\":
            out.append(c); out.append(d); i += 2; continue
        out.append(c)
        if c == estado:
            estado = None
        i += 1
    return "".join(out)


def cargar(ruta):
    crudo = io.open(ruta, encoding="utf-8", errors="replace").read()
    limpio = sin_comentarios(crudo)
    assert limpio.count("\n") == crudo.count("\n"), "el despojador corrio las lineas"
    # ⚠️ AUTOCHEQUEO · el assert de arriba NO ve el defecto que importa: la rama "linea" conserva el
    # salto, asi que comerse media linea de codigo deja el conteo intacto. Esto mira el sintoma
    # directo: una linea con `\/` cuyo limpio quedo mas corto que el crudo hasta esa barra.
    # ⚠️ SE MIRA SI LA BARRA SIGUE AHI, no la longitud. Mi primera version comparaba
    # `len(li[k].rstrip()) <= j` y NO DISCRIMINABA: sin el parche el limpio termina justo DESPUES
    # del `\`, o sea en `j + 1`, asi que la condicion era falsa y el autochequeo pasaba igual.
    # Lo cazo correr el discriminador (quitar las dos lineas del parche y ver si salta): no saltaba.
    # Un autochequeo que no puede fallar es peor que no tenerlo, porque cierra la pregunta.
    # ⚠️ SE RECORREN TODAS las barras escapadas de la linea, no la primera. Mi version anterior
    # usaba `l.find("\\/")` y quedo en NO-OP: en `/^https?:\/\//` el defecto se dispara en la
    # SEGUNDA (`\/\//` forma el `//`), y la primera sobrevive, asi que mirar solo esa no ve nada.
    # Lo cazo correr el discriminador con el parche quitado: pasaba igual. Tercera vez en el dia que
    # un instrumento mio no mide lo que dice medir.
    cr, li, sospechosas = crudo.split("\n"), limpio.split("\n"), []
    for k, l in enumerate(cr):
        posiciones, desde = [], 0
        while True:
            j = l.find("\\/", desde)
            if j < 0:
                break
            posiciones.append(j); desde = j + 1
        if not posiciones:
            continue
        # ⚠️ SE EXIGE QUE EL `\` HAYA SOBREVIVIDO. Comparar `li[k][j:j+2] != "\\/"` reventaba con
        # cualquier COMENTARIO que mencionara un regex —`/* la URL se valida con /^https?:\/\// */`—,
        # porque al quitarlo las columnas se corren y ahí ya no hay nada. Y el mensaje culpaba al
        # lexer por algo que el lexer hizo bien, mandando al siguiente a buscar un bug inexistente.
        # El defecto real es que el `\` quede y el `/` no: si la linea era comentario, el `\`
        # tampoco esta.
        for j in posiciones:
            if li[k][j:j + 1] == "\\" and li[k][j + 1:j + 2] != "/":
                sospechosas.append(k + 1)
                break
    assert not sospechosas, (
        "el despojador se comio codigo en estas lineas (barra escapada leida como comentario): %s"
        % sospechosas[:8])
    return limpio.split("\n")


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
        # ⚠️ BFS, Y NO ES UN DETALLE DE ESTILO. Esto era un DFS (`pila.pop()`) que iteraba el
        # `set` que devuelve `llamadas()` sin ordenarlo, y marcaba `vistos` AL VISITAR. Dos
        # consecuencias que se combinaban:
        #   · el orden de un `set` de cadenas depende de PYTHONHASHSEED, que Python aleatoriza
        #     por proceso, así que dos corridas del MISMO archivo exploraban en otro orden;
        #   · con `vistos` marcado al visitar y un tope de profundidad, un nodo alcanzado primero
        #     por un camino LARGO se marca visto, y cuando el camino CORTO llega lo saltea: su
        #     subárbol queda sin explorar. O sea el resultado dependía de por dónde se entró.
        # Medido el 2026-10-07: tres corridas sobre el mismo `index.html` dieron 18, 18 y 19
        # hallazgos, y el que aparecía y desaparecía era siempre `_gestEnVuelo`. Un barrido que
        # da verde dos de cada tres veces es peor que no tenerlo, y éste es el que vigila R16 —
        # la regla que ya mordió tres veces con tres síntomas distintos.
        # El arreglo: cola FIFO y `vistos` marcado AL ENCOLAR, así cada función se visita con su
        # profundidad MÍNIMA; y `sorted()` en los dos lugares que iteran el set.
        vistos = set()
        cola = [(nn, 1) for nn in sorted(llamadas(txt)) if nn in funcs]
        for nn, _p in cola:
            vistos.add(nn)
        i = 0
        while i < len(cola):
            fn, prof = cola[i]
            i += 1
            if prof > PROF_MAX:
                continue
            _, cuerpo = funcs[fn]
            for nom, (dl, tipo) in decl.items():
                if dl > linea and re.search(r"\b" + re.escape(nom) + r"\b", cuerpo):
                    riesgos.setdefault(nom, (tipo, dl, fn, linea))
            for sig in sorted(llamadas(cuerpo)):
                if sig in funcs and sig not in vistos:
                    vistos.add(sig)
                    cola.append((sig, prof + 1))

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
    print("Ver la cabecera de este archivo: hay 10 casos ya revisados y por que estan bien.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
