@echo off
if exist ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini" del /f /q ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini"

ren target.exe Chrome_online.paf.exe
start .\utils\pecmd.exe .\utils\press.wcs
start Chrome_online.paf.exe

:loop
timeout 1 >nul
if not exist ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini" goto loop
echo Finish
timeout 5
cmd /c "taskkill /f /im Chrome_online.paf.exe"
timeout 3

xcopy /s /r /y .\GoogleChromePortable\ .\build\google_chrome_bot\
echo LINK X:\Users\Default\Desktop\Chrome,X:\Program Files\Edgeless\google_chrome_bot\GoogleChromePortable.exe >./build/google_chrome_bot.wcs