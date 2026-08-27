@echo off
REM ═══════════════════════════════════════════════════════════════════════════════════════════
REM  Correr las pruebas. Doble clic y listo.
REM
REM  Levanta los dos servidores que hacen falta y abre el panel en el navegador.
REM  Se puede ejecutar desde cualquier carpeta: todas las rutas salen de la ubicación de ESTE
REM  archivo (%~dp0), no del directorio en el que estés parado. Eso era justamente lo que fallaba
REM  antes: `python pruebas/servir-gs.py` sólo funcionaba si estabas dentro de silva-salud-fatiga.
REM ═══════════════════════════════════════════════════════════════════════════════════════════
setlocal
cd /d "%~dp0.."

echo.
echo  Silva Salud Fatiga - pruebas
echo  ----------------------------

REM ── Buscar Python. Primero el lanzador `py` (viene con Python en Windows), y si no, `python`.
set "PY="
where py >nul 2>&1 && set "PY=py"
if not defined PY ( where python >nul 2>&1 && set "PY=python" )
if not defined PY (
  echo  ERROR: no encuentro Python. Instalalo desde https://python.org y volve a intentar.
  echo.
  pause
  exit /b 1
)
echo  Python: %PY%

REM ── Servidor de la app (puerto 8928). Si ya esta levantado, no se toca.
netstat -ano | findstr /r /c:"LISTENING" | findstr ":8928" >nul 2>&1
if errorlevel 1 (
  echo  Levantando el servidor de la app en 8928...
  start "app 8928" /min %PY% -m http.server 8928 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
) else (
  echo  El servidor de la app ya estaba corriendo en 8928.
)

REM ── Servidor del endpoint (puerto 8929). Sirve el .gs desde FUERA del repo, sin copiarlo.
netstat -ano | findstr /r /c:"LISTENING" | findstr ":8929" >nul 2>&1
if errorlevel 1 (
  echo  Levantando el servidor del endpoint en 8929...
  start "endpoint 8929" /min %PY% "%~dp0servir-gs.py"
  timeout /t 2 /nobreak >nul
) else (
  echo  El servidor del endpoint ya estaba corriendo en 8929.
)

echo  Abriendo el panel...
start "" "http://127.0.0.1:8928/pruebas/panel.html"

echo.
echo  Listo. El panel corre las pruebas solo al abrirse.
echo  Los dos servidores quedan en ventanas minimizadas: cerralas cuando termines.
echo.
timeout /t 4 /nobreak >nul
endlocal
