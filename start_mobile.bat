@echo off
chcp 65001 > nul
echo ==========================================
echo    📱 모바일 지원 서버 시작
echo ==========================================
echo.
echo 백엔드와 프론트엔드를 동시에 시작합니다.
echo 모바일에서도 접속 가능합니다!
echo.

REM 백엔드 의존성 확인
if not exist "node_modules" (
    echo 📦 백엔드 의존성을 설치합니다...
    call npm install
    echo.
)

REM 프론트엔드 의존성 확인
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

REM 컴퓨터 IP 주소 확인
echo 📍 현재 컴퓨터의 IP 주소:
echo.
ipconfig | findstr /i "IPv4" | findstr /v "127.0.0.1"
echo.

echo ==========================================
echo 📱 모바일 접속 방법
echo ==========================================
echo.
echo 1. 컴퓨터와 모바일을 같은 WiFi에 연결하세요
echo 2. 위에 표시된 IP 주소를 확인하세요
echo    예: 192.168.0.xxx
echo.
echo 3. 모바일 브라우저에서 다음 주소로 접속:
echo    http://[IP주소]:3000
echo.
echo    예시: http://192.168.0.10:3000
echo.
echo ==========================================
echo.

REM 백엔드 서버를 새 창에서 실행
start "데이케어 관리 - 백엔드" cmd /k "node server/index.js"

REM 3초 대기
timeout /t 3 /nobreak > nul

REM 프론트엔드 서버를 새 창에서 실행
start "데이케어 관리 - 프론트엔드" cmd /k "cd client && npm run dev"

REM 5초 대기
timeout /t 5 /nobreak > nul

echo 🌐 PC 브라우저를 엽니다...
start http://localhost:3000

echo.
echo ✅ 시스템이 실행되었습니다!
echo.
echo 📱 모바일에서 접속하려면:
echo    위에 표시된 IP 주소를 사용하세요
echo.
echo ⚠️ 백엔드와 프론트엔드 창을 닫지 마세요.
echo.
pause

