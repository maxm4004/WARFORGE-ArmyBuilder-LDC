@echo off
REM Avvia PocketBase (porta 8091, cosi puo girare insieme a IEF) e Vite.
set PROJECT_DIR=E:\Wargaming-DEV\Warforge-ArmyBuilder-LDC
start "PocketBase LDC" cmd /k "cd /d %PROJECT_DIR%\pocketBase && pocketbase.exe serve --http=127.0.0.1:8091"
timeout /t 2 /nobreak >nul
start "Vite LDC" cmd /k "cd /d %PROJECT_DIR% && npm run dev"
