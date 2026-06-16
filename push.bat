@echo off
cd /d "%~dp0"
git config user.email "willjhooper@msn.com"
git config user.name "Will Hooper"
git remote set-url origin https://github.com/chrischerian/appealthedenial.git
git add -A
git commit -m "Add GitHub Pages deploy workflow" > "%~dp0push_log.txt" 2>&1
git push origin HEAD >> "%~dp0push_log.txt" 2>&1
type "%~dp0push_log.txt"
echo.
echo Done! Press any key to close.
pause
