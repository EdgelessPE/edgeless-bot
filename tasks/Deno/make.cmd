@echo off
mkdir ".\build\deno"
move ".\release\deno.exe" ".\build\deno\deno.exe"
call ".\build\deno\deno.exe" types --unstable > ".\build\deno\lib.deno.d.ts"
call ".\build\deno\deno.exe" -V > ".\build\deno\VERSION"


