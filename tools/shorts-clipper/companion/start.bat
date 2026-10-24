@echo off
rem Double-click to start the Shorts Clipper companion. Keep this window open while you use the extension.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo The companion is not set up yet. Follow "1. Install the tools" in the README first.
  pause
  exit /b 1
)
rem The smaller speech model keeps captions quick; set WHISPER_MODEL yourself to change it.
if "%WHISPER_MODEL%"=="" set WHISPER_MODEL=base
".venv\Scripts\python.exe" server.py
pause
