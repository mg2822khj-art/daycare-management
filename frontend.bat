@echo off
chcp 65001 > nul
echo ==========================================
echo    🐕 데이케어 관리 - 프론트엔드 시작
echo ==========================================
echo.

REM 프론트엔드 디렉토리로 이동
cd client

REM 의존성 확인
if not exist "node_modules" (
    echo 📦 프론트엔드 의존성을 설치합니다...
    call npm install
    echo.
)

echo 🚀 프론트엔드 개발 서버를 시작합니다...
echo 웹 주소: http://localhost:3000
echo 종료하려면 Ctrl+C를 누르세요
echo.
echo ==========================================
echo.

call npm run dev


