#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inventario de instrumentos de la suite (P182 / P183).

Cuenta, caso por caso, dos cosas que un grep no distingue:

  · LEE LA FUENTE: el caso mira el código como TEXTO — los <script> de index.html, la fuente del
    .gs (`CTX.gs` con .match/.test/.indexOf/…, no con `cargarGs`), el CSS como texto, o el cuerpo
    de una función con `fn.toString()` / los helpers `p174bFuente` / `p174bDentro`.
  · TOCA ALGO VIVO: llama a una función real de index.html, mide el DOM, entra por el emulador
    del .gs, siembra localStorage, espera una condición, hace click.

Un caso que lee la fuente Y NO toca nada vivo es un instrumento de texto: comprueba que algo está
ESCRITO, no que FUNCIONE. Es lo que más caro salió en este proyecto (R17, `DEUDA_DE_INSTRUMENTOS.md`).
No todos son deuda —«ningún color a mano», «esta función está declarada», «el servidor y el
cliente nombran lo mismo» SON preguntas sobre el texto—, por eso el guion clasifica en cuatro
categorías con heurísticas y deja la decisión final para quien lee la lista.

Uso:  python3 pruebas/inventario-instrumentos.py            → resumen + lista
      python3 pruebas/inventario-instrumentos.py --json     → JSON con todos los casos y sus banderas
      python3 pruebas/inventario-instrumentos.py --archivo p057a-plan-por-persona.js

⚠️ Es una heurística sobre texto. Un caso que llama a un helper del propio archivo que lee la
fuente cuenta como «lee la fuente» sólo si el helper está en el mismo archivo (se resuelve un nivel).
"""
import io, os, re, sys, json, glob

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
INDEX = os.path.join(RAIZ, 'index.html')
CASOS = os.path.join(AQUI, 'casos')

# ── 1 · nombres de funciones reales de la app (para saber si un caso las LLAMA) ─────────────────
def funciones_de_la_app():
    s = io.open(INDEX, encoding='utf-8').read()
    nombres = set(re.findall(r'^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(', s, flags=re.M))
    # `const foo = (…) =>` y `const foo = function` de nivel superior
    nombres |= set(re.findall(r'^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>', s, flags=re.M))
    nombres |= set(re.findall(r'^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b', s, flags=re.M))
    # nombres demasiado genéricos que también existen en el marco de pruebas o en el navegador
    for ruido in ('t', 'esc', 'norm', 'pad', 'hoy', 'ahora', 'ms', 'iso'):
        nombres.discard(ruido)
    return nombres

# ── 2 · partir un archivo en casos ───────────────────────────────────────────────────────────────
def partir_casos(src):
    """Devuelve [(nombre, cuerpo)] para cada PRUEBAS.caso('…', …). Se sigue el paréntesis de
    apertura hasta su cierre, ignorando comillas, plantillas, regex simples y comentarios."""
    out = []
    for m in re.finditer(r"PRUEBAS\.caso\(\s*(['\"`])((?:\\.|(?!\1).)*)\1\s*,", src):
        nombre = m.group(2)
        i = m.end()
        # buscar el paréntesis que cierra PRUEBAS.caso(
        prof = 1; j = i; n = len(src)
        estado = None  # None | "'" | '"' | '`' | '/'  | 'lc' (line comment) | 'bc' (block comment)
        while j < n and prof > 0:
            c = src[j]; d = src[j+1] if j + 1 < n else ''
            if estado is None:
                if c == '/' and d == '/': estado = 'lc'; j += 2; continue
                if c == '/' and d == '*': estado = 'bc'; j += 2; continue
                if c in ('"', "'", '`'): estado = c; j += 1; continue
                if c == '/':
                    # regex si lo anterior no es un valor
                    k = j - 1
                    while k >= 0 and src[k] in ' \t\n': k -= 1
                    if k < 0 or src[k] in '(,=:[!&|?{};+-*%<>~^' or src[k-1:k+1] in ('=>',):
                        estado = '/'; j += 1; continue
                if c == '(': prof += 1
                elif c == ')': prof -= 1
                j += 1; continue
            if estado == 'lc':
                if c == '\n': estado = None
                j += 1; continue
            if estado == 'bc':
                if c == '*' and d == '/': estado = None; j += 2; continue
                j += 1; continue
            if estado == '/':
                if c == '\\': j += 2; continue
                if c == '[':
                    # clase de caracteres: saltar hasta ]
                    j += 1
                    while j < n and src[j] != ']':
                        j += 2 if src[j] == '\\' else 1
                    j += 1; continue
                if c == '/' or c == '\n': estado = None
                j += 1; continue
            # cadena
            if c == '\\': j += 2; continue
            if c == estado: estado = None
            j += 1
        out.append((nombre, src[i:j-1]))
    return out

def sin_comentarios_ni_cadenas(cuerpo):
    """Para buscar LLAMADAS: se sacan comentarios y el contenido de cadenas/regex, que es donde
    aparecen nombres de funciones sin que nadie las llame."""
    s = re.sub(r'/\*[\s\S]*?\*/', ' ', cuerpo)
    s = re.sub(r'//[^\n]*', ' ', s)
    s = re.sub(r"'(?:\\.|[^'\\\n])*'", "''", s)
    s = re.sub(r'"(?:\\.|[^"\\\n])*"', '""', s)
    s = re.sub(r'`(?:\\.|[^`\\])*`', '``', s)
    return s

# ── 3 · señales ──────────────────────────────────────────────────────────────────────────────────
TEXTO_OPS = r"(?:match|matchAll|test|exec|indexOf|lastIndexOf|includes|search|slice|substring|split|replace|replaceAll)"
LEE_FUENTE = [
    (r"querySelectorAll\(\s*['\"]script['\"]\s*\)", 'scripts de index.html como texto'),
    (r"querySelectorAll\(\s*['\"]style['\"]\s*\)|querySelector\(\s*['\"]style['\"]\s*\)|styleSheets|\.cssText", 'CSS como texto'),
    (r"CTX\.gs\s*\." + TEXTO_OPS + r"\s*\(", 'la fuente del .gs como texto'),
    (r"\.(?:test|exec)\(\s*CTX\.gs\b", 'la fuente del .gs como texto'),
    (r"\bp174bFuente\(|\bp174bDentro\(", 'p174bFuente/p174bDentro (la fuente entera)'),
    (r"\b(?:fuente|src|codigo|gs|js|css|cuerpo|txt|texto|html|f)\s*\." + TEXTO_OPS + r"\s*\(", 'una variable de texto de fuente con regex'),
    (r"\.(?:test|exec)\(\s*(?:fuente|src|codigo|gs|js|css|cuerpo|txt|texto)\b", 'una variable de texto de fuente con regex'),
]
# `fn.toString()` sólo cuenta si `fn` es una función de la app (se completa en analizar_archivo)
RE_TOSTRING = re.compile(r"\b([A-Za-z_$][\w$]*)\.toString\(\)")
TOCA_VIVO_FIJO = [
    (r"\bPRUEBAS\.esperarA\(|\bPRUEBAS\.conOculto\(|\bPRUEBAS\.enVentana\(", 'espera/observa'),
    (r"\bgetComputedStyle\(|\bgetBoundingClientRect\(|\boffsetWidth\b|\boffsetHeight\b|\bscrollWidth\b|\bclientWidth\b", 'mide el DOM'),
    (r"\.click\(\)|dispatchEvent\(|\.focus\(\)", 'interactúa'),
    (r"\blocalStorage\.setItem\(|\bCTX\.resetear\(|\bsetProfile\(", 'siembra estado y entra por la app'),
    (r"\bGS\.cargarGs\(|\bGS\.crearEntorno\(|__volcado\(|\bCTX\.emulador\b", 'corre el .gs en el emulador'),
    (r"document\.getElementById\(|querySelector\(\s*['\"](?!script|style)", 'lee el DOM'),
    (r"\.innerHTML\s*=|\.textContent\s*=|appendChild\(", 'construye/escribe DOM'),
]

def cuerpo_por_llaves(src, ini):
    """Desde la llave de apertura en `ini`, devuelve el cuerpo hasta su cierre (aprox.: ignora
    llaves dentro de cadenas simples)."""
    prof = 0; j = ini; n = len(src); estado = None
    while j < n:
        c = src[j]
        if estado:
            if c == '\\': j += 2; continue
            if c == estado: estado = None
            j += 1; continue
        if c in ('"', "'", '`'): estado = c
        elif c == '{': prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0: return src[ini + 1:j]
        j += 1
    return src[ini + 1:]

def senales(cuerpo, app_fns, helpers, nivel=0):
    """(lee, vivo) de un cuerpo. Los helpers del archivo se resuelven un nivel."""
    limpio = sin_comentarios_ni_cadenas(cuerpo)
    lee = [d for p, d in LEE_FUENTE if re.search(p, cuerpo)]
    for m in RE_TOSTRING.finditer(limpio):
        if m.group(1) in app_fns: lee.append('el cuerpo de una función de la app (' + m.group(1) + '.toString)')
    vivo = [d for p, d in TOCA_VIVO_FIJO if re.search(p, limpio)]
    llamadas = sorted(set(re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', limpio)))
    llama_app = [f for f in llamadas if f in app_fns and f not in helpers]
    if llama_app: vivo.append('llama a la app: ' + ', '.join(llama_app[:6]) + ('…' if len(llama_app) > 6 else ''))
    if nivel == 0:
        for h, (hl, hv) in helpers.items():
            if re.search(r'\b' + re.escape(h) + r'\s*\(', limpio):
                if hl: lee.append('helper del archivo que lee la fuente: ' + h)
                if hv: vivo.append('helper del archivo que toca algo vivo: ' + h)
    return sorted(set(lee)), sorted(set(vivo))

def analizar_archivo(ruta, app_fns):
    src = io.open(ruta, encoding='utf-8').read()
    # helpers del archivo: (lee, vivo) de cada uno, para propagar las dos señales un nivel
    helpers = {}
    for m in re.finditer(r'(?:^|\n)\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{', src):
        cuerpo = cuerpo_por_llaves(src, m.end() - 1)
        l, v = senales(cuerpo, app_fns, {}, 1)
        helpers[m.group(1)] = (bool(l), bool(v))
    for m in re.finditer(r'(?:^|\n)\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*', src):
        resto = src[m.end():]
        cuerpo = cuerpo_por_llaves(src, m.end()) if resto.startswith('{') else resto.split('\n')[0]
        l, v = senales(cuerpo, app_fns, {}, 1)
        helpers[m.group(1)] = (bool(l), bool(v))
    casos = []
    for nombre, cuerpo in partir_casos(src):
        lee, vivo = senales(cuerpo, app_fns, helpers)
        casos.append({'archivo': os.path.basename(ruta), 'nombre': nombre,
                      'leeFuente': lee, 'tocaVivo': vivo,
                      'instrumento': bool(lee) and not vivo})
    return casos

# ── 4 · categoría (heurística sobre el nombre y el cuerpo; la decisión final es de quien lee) ────
def categoria(c):
    n = (c['nombre'] + ' ' + ' '.join(c['leeFuente'])).lower()
    if re.search(r'r13|color a mano|colores? fij|token|r14|t\(\)|por t\(|voseo|neutro|español|traducci|idioma|i18n|texto', n):
        return 'regla de escritura'
    if re.search(r'contrato|servidor.*cliente|cliente.*servidor|nombran lo mismo|manda.*consume|\.gs.*cliente', n):
        return 'contrato'
    if re.search(r'r16|declarad|hoist|iza|llamador|alcanz|orden de declar|muert|if por empresa|por empresa|sin llamador|una sola vez|única|duplicad', n):
        return 'forma del código'
    return 'comportamiento disfrazado'

def main():
    args = sys.argv[1:]
    app_fns = funciones_de_la_app()
    archivos = sorted(glob.glob(os.path.join(CASOS, '*.js')))
    if '--archivo' in args:
        a = args[args.index('--archivo') + 1]
        archivos = [x for x in archivos if os.path.basename(x) == a]
    todos = []
    for ruta in archivos:
        todos.extend(analizar_archivo(ruta, app_fns))
    for c in todos:
        c['categoria'] = categoria(c) if c['instrumento'] else ''
    inst = [c for c in todos if c['instrumento']]
    if '--json' in args:
        print(json.dumps(todos, ensure_ascii=False, indent=1)); return
    print('casos: %d en %d archivos · funciones de la app conocidas: %d' % (len(todos), len(archivos), len(app_fns)))
    print('leen la fuente: %d · de esos, sin tocar nada vivo (INSTRUMENTOS DE TEXTO): %d' % (
        sum(1 for c in todos if c['leeFuente']), len(inst)))
    por_cat = {}
    for c in inst: por_cat.setdefault(c['categoria'], []).append(c)
    for cat in ('comportamiento disfrazado', 'regla de escritura', 'contrato', 'forma del código'):
        lista = por_cat.get(cat, [])
        print('\n== %s · %d ==' % (cat, len(lista)))
        for c in lista:
            print('  %-42s %s' % (c['archivo'][:42], c['nombre'][:78]))
            print('  %-42s   ← %s' % ('', '; '.join(c['leeFuente'])[:110]))
    por_arch = {}
    for c in inst: por_arch[c['archivo']] = por_arch.get(c['archivo'], 0) + 1
    print('\n== por archivo ==')
    for a, k in sorted(por_arch.items(), key=lambda x: -x[1]): print('  %3d  %s' % (k, a))

if __name__ == '__main__':
    main()
