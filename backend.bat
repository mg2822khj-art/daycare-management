@echo off
chcp 65001 > nul
echo ==========================================
echo    🐕 데이케어 관리 - 백엔드 서버 시작
echo ==========================================
echo.

REM 의존성 확인
if not exist "node_modules" (
    echo 📦 백엔드 의존성을 설치합니다...
    call npm install
    echo.
)

echo 🚀 백엔드 서버를 시작합니다...
echo 서버 주소: http://localhost:3001
echo 종료하려면 Ctrl+C를 누르세요
echo.
echo ==========================================
echo.

node server/index.js


