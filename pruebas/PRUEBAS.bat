@echo off
REM Correr las pruebas. Doble clic desde el Explorador de Windows.
REM OJO: este archivo debe quedar en ASCII puro y CRLF. cmd.exe lo lee en la codificacion
REM ANSI del sistema, y con tildes o caracteres de caja se corrompe y no ejecuta nada.
REM La explicacion completa esta en LEEME.md.
setlocal
cd /d "%~dp0.."
echo.
echo  Silva Salud Fatiga - pruebas
echo  ============================
echo.

REM --- Buscar Python: primero el lanzador py, si no python ---
set "PY="
where py >nul 2>&1 && set "PY=py"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY goto SINPYTHON
echo  Python encontrado: %PY%

REM --- Servidor de la app (8928) ---
netstat -an | find ":8928" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo  Levantando el servidor de la app en 8928...
  start "app 8928" /min %PY% -m http.server 8928 --bind 127.0.0.1
  ping -n 3 127.0.0.1 >nul
) else (
  echo  El servidor de la app ya estaba corriendo.
)

REM --- Servidor del endpoint (8929) ---
netstat -an | find ":8929" | find "LISTENING" >nul 2>&1
if errorlevel 1 (
  echo  Levantando el servidor del endpoint en 8929...
  start "endpoint 8929" /min %PY% "%~dp0servir-gs.py"
  ping -n 3 127.0.0.1 >nul
) else (
  echo  El servidor del endpoint ya estaba corriendo.
)

echo  Abriendo el panel en el navegador...
start "" "http://127.0.0.1:8928/pruebas/panel.html"
echo.
echo  Listo. El panel corre las pruebas solo al abrirse.
echo  Los servidores quedan en ventanas minimizadas: cerralas cuando termines.
echo.
pause
exit /b 0

:SINPYTHON
echo  ERROR: no encuentro Python en el PATH.
echo  Instalalo desde https://python.org y volve a intentar.
echo.
pause
exit /b 1
