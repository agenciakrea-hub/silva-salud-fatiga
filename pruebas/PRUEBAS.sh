#!/usr/bin/env bash
# Equivalente en Linux de PRUEBAS.bat. Levanta los dos servidores que hacen
# falta y abre el panel, que corre las pruebas solo.
#   - 8928: la app (servidor estatico sobre la raiz del repo)
#   - 8929: el emulador del endpoint de Google Script (servir-gs.py)
# El .bat original queda intacto para cuando trabajes desde Windows.
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(dirname "$AQUI")"
cd "$RAIZ" || exit 1

echo
echo " Silva Salud Fatiga - pruebas"
echo " ============================"
echo

PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then
  echo " ERROR: no encuentro Python."
  echo " Instalalo con:  sudo apt install python3"
  exit 1
fi
echo " Python encontrado: $PY"

ocupado(){ ss -lnt 2>/dev/null | grep -q ":$1 "; }

if ocupado 8928; then
  echo " El servidor de la app ya estaba corriendo."
else
  echo " Levantando el servidor de la app en 8928..."
  setsid nohup "$PY" -m http.server 8928 --bind 127.0.0.1 \
    > /tmp/fatiga-app-8928.log 2>&1 < /dev/null &
  disown
  sleep 2
fi

if ocupado 8929; then
  echo " El servidor del endpoint ya estaba corriendo."
else
  echo " Levantando el servidor del endpoint en 8929..."
  setsid nohup "$PY" "$AQUI/servir-gs.py" \
    > /tmp/fatiga-gs-8929.log 2>&1 < /dev/null &
  disown
  sleep 2
fi

for p in 8928 8929; do
  ocupado "$p" && echo " puerto $p: OK" || echo " puerto $p: NO LEVANTO (mira /tmp/fatiga-*-$p.log)"
done

URL="http://127.0.0.1:8928/pruebas/panel.html"
echo " Abriendo el panel: $URL"
xdg-open "$URL" >/dev/null 2>&1 &

echo
echo " Listo. El panel corre las pruebas solo al abrirse."
echo " Los servidores quedan de fondo. Para bajarlos:"
echo "   pkill -f 'http.server 8928' ; pkill -f servir-gs.py"
echo
