# -*- coding: utf-8 -*-
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
`/endpoint`. Cualquier otra cosa da 404 sin tocar el disco.
"""
import http.server
import os
import socketserver
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
# El .gs está un nivel arriba del repo: pruebas/ -> silva-salud-fatiga/ -> silva fatiga local/
GS = os.path.normpath(os.path.join(AQUI, "..", "..", "ENDPOINT_STANDALONE_MODIFICADO.gs"))
PUERTO = 8929


class Manejador(http.server.BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802  (lo define la clase base)
        ruta = self.path.split("?", 1)[0]
        if ruta != "/endpoint":
            self.send_error(404, "Solo /endpoint")
            return
        try:
            with open(GS, "rb") as f:
                cuerpo = f.read()
        except OSError as e:
            self.send_error(500, "No se pudo leer el .gs: %s" % e)
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
    if not os.path.exists(GS):
        print("ERROR: no encuentro el endpoint en:\n  %s" % GS)
        print("\nSi lo moviste, actualiza la ruta GS en este archivo.")
        return 1
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PUERTO), Manejador) as s:
        print("Sirviendo el endpoint en http://127.0.0.1:%d/endpoint" % PUERTO)
        print("  archivo: %s" % GS)
        print("  (Ctrl+C para detener)")
        try:
            s.serve_forever()
        except KeyboardInterrupt:
            print("\nDetenido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
