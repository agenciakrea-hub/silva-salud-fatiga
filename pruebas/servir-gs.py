r"""Sirve SÓLO el endpoint `.gs` en localhost, para que la suite pueda probarlo.

    python pruebas/servir-gs.py

POR QUÉ HACE FALTA ESTO Y NO SE COPIA EL ARCHIVO Y LISTO
El `.gs` vive FUERA de `silva-salud-fatiga/` a propósito: **ese repo es público** y el `.gs` trae
la clave de la API de Gemini. El servidor de la app tiene su raíz en el repo, así que desde el
navegador no se puede pedir un archivo que está más arriba.

La salida fácil sería copiar el `.gs` adentro del repo y ponerlo en `.gitignore`. **No se hace, y
hay precedente concreto**: `_check.js` y `_harness.js` están listados en `.gitignore` y aun así
están publicados en GitHub, porque se commitearon ANTES de que se agregara el ignore y `.gitignore`
no despublica lo que ya está trackeado. Si esa misma secuencia pasara con una copia del `.gs`, lo
que se publica es una clave de API en un repo público.

Por eso: el archivo no se copia nunca. Se sirve desde donde está, en memoria, sólo a localhost, y
sólo ese archivo.

QUÉ NO HACE
No sirve directorios, no acepta rutas arbitrarias, no escucha fuera de 127.0.0.1. La única ruta es
`/endpoint` (y `/endpoint-viejo`, sólo si se la pide al arrancar). Cualquier otra cosa da 404 sin
tocar el disco.

OTRO `.gs`, SIN COPIARLO (P301, para P303)
    python pruebas/servir-gs.py --gs RUTA            # /endpoint sirve RUTA en vez del .gs de siempre
    python pruebas/servir-gs.py --viejo RUTA         # ADEMÁS, /endpoint-viejo sirve RUTA
    python pruebas/servir-gs.py --puerto 8939 ...    # otro puerto, para no pisar al de la suite
También por entorno: SERVIR_GS, SERVIR_GS_VIEJO, SERVIR_GS_PUERTO. Sin nada de eso, idéntico a antes.
Para qué: `P303` prueba sesiones emitidas con el `.gs` de ANTES del arreglo y abiertas con el de
ahora, sobre el MISMO libro (`GS.cargarGs` carga otro `.gs` sobre el mismo entorno). La copia vieja
vive en `endpoint/respaldos/`, fuera del repo, y por la misma razón que el `.gs` de siempre NO se
copia acá: se sirve desde donde está. Y sirve como discriminador de la suite entera: `--gs` con el
`.gs` viejo pone en rojo los casos que vigilan lo que cambió.
"""
import argparse
import http.server
import os
import socketserver
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
# El .gs está un nivel arriba del repo: pruebas/ -> silva-salud-fatiga/ -> silva fatiga local/
GS_DE_SIEMPRE = os.path.normpath(os.path.join(AQUI, "..", "..", "ENDPOINT_STANDALONE_MODIFICADO.gs"))
GS = GS_DE_SIEMPRE
GS_VIEJO = None
PUERTO = 8929


class Manejador(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # el nombre lo impone la clase base
        ruta = self.path.split("?", 1)[0]
        if ruta == "/endpoint":
            archivo = GS
        elif ruta == "/endpoint-viejo" and GS_VIEJO:
            archivo = GS_VIEJO
        else:
            self.send_error(404, "Solo /endpoint" + (" y /endpoint-viejo" if GS_VIEJO else ""))
            return
        try:
            with open(archivo, "rb") as f:
                cuerpo = f.read()
        except OSError as e:
            self.send_error(500, f"No se pudo leer el .gs: {e}")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo)))
        # La suite corre en el origen de la app (otro puerto), así que sin esto el navegador
        # bloquea la lectura. Se permite cualquier origen porque el servidor sólo escucha en
        # 127.0.0.1: para llegar acá ya hay que estar en esta máquina.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, formato, *args):
        pass  # sin ruido: molesta mientras se corre la suite


def main():
    global GS, GS_VIEJO, PUERTO
    ap = argparse.ArgumentParser(description="Sirve el .gs sólo a 127.0.0.1, sin copiarlo al repo.")
    ap.add_argument("--gs", default=os.environ.get("SERVIR_GS") or None,
                    help="otro .gs para /endpoint (por defecto, el de siempre)")
    ap.add_argument("--viejo", default=os.environ.get("SERVIR_GS_VIEJO") or None,
                    help="un .gs para /endpoint-viejo (si no se da, esa ruta no existe)")
    ap.add_argument("--puerto", type=int, default=int(os.environ.get("SERVIR_GS_PUERTO") or PUERTO))
    a = ap.parse_args()
    GS = os.path.abspath(a.gs) if a.gs else GS_DE_SIEMPRE
    GS_VIEJO = os.path.abspath(a.viejo) if a.viejo else None
    PUERTO = a.puerto
    for nombre, ruta in (("endpoint", GS), ("endpoint viejo", GS_VIEJO)):
        if ruta and not os.path.exists(ruta):
            print(f"ERROR: no encuentro el {nombre} en:\n  {ruta}")
            print("\nSi lo moviste, actualiza la ruta GS en este archivo o pasala con --gs/--viejo.")
            return 1
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PUERTO), Manejador) as s:
        print(f"Sirviendo el endpoint en http://127.0.0.1:{PUERTO}/endpoint")
        aviso = "" if GS == GS_DE_SIEMPRE else "   (⚠️ NO es el de siempre)"
        print(f"  archivo: {GS}{aviso}")
        if GS_VIEJO:
            print(f"  y en http://127.0.0.1:{PUERTO}/endpoint-viejo: {GS_VIEJO}")
        print("  (Ctrl+C para detener)")
        try:
            s.serve_forever()
        except KeyboardInterrupt:
            print("\nDetenido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
