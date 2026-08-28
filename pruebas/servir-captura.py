# -*- coding: utf-8 -*-
r"""Recibe capturas de la app y las guarda en disco, para poder MIRARLAS.

    python pruebas/servir-captura.py

POR QUÉ EXISTE
La herramienta de captura del entorno no funciona: la pantalla sólo compone cuadros si el panel
del navegador está VISIBLE en la pantalla de quien está mirando, y en una sesión headless no lo
está. Está anotado como R11 del proyecto ("las capturas se cuelgan acá"), y hasta ahora la
consecuencia era que todo se verificaba midiendo el DOM y **nada se verificaba mirando**.

Esto lo destraba: la página se rasteriza a sí misma (SVG `foreignObject` → canvas → PNG) y manda
el resultado acá, que lo escribe a un archivo. Ese archivo sí se puede abrir y mirar.

⚠️ NO reemplaza mirar la app de verdad. `foreignObject` no carga tipografías externas ni recursos
de otros dominios, y algunos efectos (sombras compuestas, filtros, `backdrop-filter`) se dibujan
distinto o no se dibujan. Sirve para **composición, jerarquía, espaciado, alineación, colores y
texto cortado** — que es la mayor parte de una auditoría estética. Para el detalle fino, sigue
haciendo falta una captura real.

SEGURIDAD: sólo escucha en 127.0.0.1, sólo acepta POST a /captura, y sólo escribe dentro de la
carpeta de capturas. Nunca lee ni sirve nada del disco.
"""
import http.server
import os
import re
import socketserver
import sys
import base64

AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(AQUI, "_capturas")
PUERTO = 8930
MAX_BYTES = 24 * 1024 * 1024


class Manejador(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):  # noqa: N802
        if self.path.split("?", 1)[0] != "/captura":
            self.send_error(404, "Solo /captura")
            return
        largo = int(self.headers.get("Content-Length") or 0)
        if largo <= 0 or largo > MAX_BYTES:
            self.send_error(413, "Tamano invalido")
            return
        cuerpo = self.rfile.read(largo).decode("utf-8", "replace")

        # cuerpo = "<nombre>\n<dataURL>"
        partida = cuerpo.split("\n", 1)
        if len(partida) != 2:
            self.send_error(400, "Formato: nombre\\ndataURL")
            return
        nombre, data_url = partida
        # El nombre lo elige quien captura, pero se sanea: nunca puede salir de la carpeta.
        nombre = re.sub(r"[^A-Za-z0-9_.-]", "_", nombre.strip())[:80] or "captura"
        if not nombre.lower().endswith(".png"):
            nombre += ".png"

        m = re.match(r"^data:image/png;base64,(.+)$", data_url.strip(), re.S)
        if not m:
            self.send_error(400, "Se esperaba un data:image/png;base64,")
            return
        try:
            binario = base64.b64decode(m.group(1))
        except Exception as e:  # noqa: BLE001
            self.send_error(400, "base64 invalido: %s" % e)
            return

        os.makedirs(DESTINO, exist_ok=True)
        ruta = os.path.join(DESTINO, nombre)
        with open(ruta, "wb") as f:
            f.write(binario)

        cuerpo_resp = ('{"ok":true,"archivo":"%s","bytes":%d}' % (nombre, len(binario))).encode("utf-8")
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(cuerpo_resp)))
        self.end_headers()
        self.wfile.write(cuerpo_resp)
        print("  guardada: %s (%d KB)" % (nombre, len(binario) // 1024))

    def log_message(self, formato, *args):
        pass


def main():
    socketserver.TCPServer.allow_reuse_address = True
    os.makedirs(DESTINO, exist_ok=True)
    with socketserver.TCPServer(("127.0.0.1", PUERTO), Manejador) as s:
        print("Recibiendo capturas en http://127.0.0.1:%d/captura" % PUERTO)
        print("  se guardan en: %s" % DESTINO)
        print("  (Ctrl+C para detener)")
        try:
            s.serve_forever()
        except KeyboardInterrupt:
            print("\nDetenido.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
