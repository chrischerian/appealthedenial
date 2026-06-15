@echo off
cd /d "%~dp0"
git config user.email "willjhooper@msn.com"
git config user.name "Will Hooper"
git remote set-url origin https://github.com/chrischerian/appealthedenial.git
git add -A
git commit -m "Rebrand CoverFight to AppealTheDenial (appealthedenial.com)"
git push origin HEAD
echo.
echo Done! Press any key to close.
pause
