@echo off
if not exist ".\release\$PLUGINSDIR\app-64.7z" (
  echo.not found app archive
  exit /b 9009
)

"%p7zip%" x ".\release\$PLUGINSDIR\app-64.7z" -o.\build\balenaEtcher -y