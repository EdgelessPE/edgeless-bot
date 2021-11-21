@echo off

::删除垃圾
del /f /s /q .\release\$PLUGINSDIR
rd /s /q .\release\$PLUGINSDIR

::移动
move /y .\release .\build\NetEaseCloud_bot

::生成外置批处理
echo LINK X:\Users\Default\Desktop\网易云音乐,X:\Program Files\Edgeless\NetEaseCloud_bot\cloudmusic.exe >./build/NetEaseCloud_bot.wcs