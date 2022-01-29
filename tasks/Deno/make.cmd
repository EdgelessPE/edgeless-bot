@echo off
mkdir ".\build\deno"
move ".\release\deno.exe" ".\build\deno\deno.exe"
".\build\deno\deno.exe" types --unstable
call ".\build\deno\deno.exe" types --unstable > ".\build\lib.deno.d.ts"
call ".\build\deno\deno.exe" -V > ".\build\VERSION"


