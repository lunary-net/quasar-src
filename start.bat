@echo off
:start
node deploy-commands.js
node index.js
if errorlevel 1 goto start
goto end
:end
