@echo off

ren target.exe Chrome_online.paf.exe
start .\utils\pecmd.exe .\utils\press.wcs
start Chrome_online.paf.exe

:loop
timeout 1 >nul
if not exist ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini" goto loop
echo Finish
timeout 3
taskkill /f /im Chrome_online.paf.exe

ren GoogleChromePortable google_chrome_bot
move /y .\google_chrome_bot .\build
echo LINK X:\Users\Default\Desktop\Chrome,X:\Program Files\Edgeless\google_chrome_bot\GoogleChromePortable.exe >./build/google_chrome_bot.wcs