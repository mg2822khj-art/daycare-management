@echo off
chcp 65001 > nul
echo ==========================================
echo    🐕 데이케어 관리 시스템 시작
echo ==========================================
echo.
echo 백엔드와 프론트엔드 서버를 동시에 시작합니다.
echo.

REM 백엔드 의존성 확인 및 설치
if not exist "node_modules" (
    echo 📦 백엔드 의존성을 설치합니다...
    call npm install
    echo.
)

REM 프론트엔드 의존성 확인 및 설치
cd client
if not exist "node_modules" (
    echo 📦 프론트엔드 의존성을 설치합니다...
    call npm install
    echo.
)
cd ..

echo.
echo ==========================================
echo 🚀 서버를 시작합니다...
echo.
echo - 백엔드 서버: http://localhost:3001
echo - 프론트엔드: http://localhost:3000
echo.
echo 잠시 후 웹 브라우저가 자동으로 열립니다.
echo 종료하려면 두 창 모두에서 Ctrl+C를 누르세요.
echo ==========================================
echo.

REM 백엔드 서버를 새 창에서 실행
start "데이케어 관리 - 백엔드" cmd /k "node server/index.js"

REM 3초 대기 (백엔드 서버 준비 시간)
timeout /t 3 /nobreak > nul

REM 프론트엔드 서버를 새 창에서 실행
start "데이케어 관리 - 프론트엔드" cmd /k "cd client && npm run dev"

REM 5초 대기 (프론트엔드 서버 준비 시간)
timeout /t 5 /nobreak > nul

REM 브라우저 열기
echo 🌐 웹 브라우저를 엽니다...
start http://localhost:3000

echo.
echo ✅ 시스템이 실행되었습니다!
echo 백엔드와 프론트엔드 창을 닫지 마세요.
echo.
pause

