@echo off
if "%~1"=="" (
  echo Uso: run.bat nome-script
  exit /b 1
)

set PB_EMAIL=maxm4004@mymail.com
set PB_PASSWORD=maxm4004
node "%~dp0scripts\%~1.mjs" --apply