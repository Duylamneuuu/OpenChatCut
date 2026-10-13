@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-OpenChatCut.ps1"
if errorlevel 1 pause
