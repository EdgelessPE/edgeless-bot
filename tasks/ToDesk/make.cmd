@echo off

::解压app.7z
"%p7zip%" x .\release\app.7z -o.\build\ToDesk_bot -y

::生成外置批处理
echo LINK X:\Users\Default\Desktop\ToDesk,X:\Program Files\Edgeless\ToDesk_bot\ToDesk.exe >./build/ToDesk_bot.wcs
