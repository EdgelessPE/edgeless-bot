@echo off

::提前清理用于判断PA安装程序是否结束的文件防止程序提前退出
if exist ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini" del /f /q ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini"

::重命名，否则PA安装程序无法运行
ren target.exe Chrome_online.paf.exe

::启动pecmd实现按键模拟
start .\utils\pecmd.exe .\utils\press.wcs

::启动安装程序
start Chrome_online.paf.exe

::循环判断PA安装是否结束
:loop
timeout 1 >nul
if not exist ".\GoogleChromePortable\Data\PortableApps.comInstaller\license.ini" goto loop
echo Finish

::延迟结束进程
ping 127.0.0.1 -n 5 >nul
cmd /c "taskkill /f /im Chrome_online.paf.exe"
ping 127.0.0.1 -n 3 >nul

::拷贝程序文件，不使用move的原因是此时可能文件锁未被释放导致move可能执行失败
xcopy /s /r /y .\GoogleChromePortable\ .\build\google_chrome_bot\

::生成外置批处理
echo LINK X:\Users\Default\Desktop\Chrome,X:\Program Files\Edgeless\google_chrome_bot\GoogleChromePortable.exe >./build/google_chrome_bot.wcs