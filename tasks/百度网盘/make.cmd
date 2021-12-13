@echo off
del /f /s /q .\release\$PLUGINSDIR
rd /s /q .\release\$PLUGINSDIR
del /f /s /q .\release\$TEMP
rd /s /q .\release\$TEMP
move .\release .\build\BaiduNetDisk