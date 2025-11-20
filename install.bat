@echo off
chcp 65001 > nul
echo ==========================================
echo    🐕 데이케어 관리 - 초기 설치
echo ==========================================
echo.
echo 백엔드와 프론트엔드 의존성을 설치합니다.
echo.

echo 📦 [1/2] 백엔드 의존성 설치 중...
call npm install
if errorlevel 1 (
    echo ❌ 백엔드 의존성 설치 실패
    pause
    exit /b 1
)
echo ✅ 백엔드 의존성 설치 완료!
echo.

echo 📦 [2/2] 프론트엔드 의존성 설치 중...
cd client
call npm install
if errorlevel 1 (
    echo ❌ 프론트엔드 의존성 설치 실패
    cd ..
    pause
    exit /b 1
)
echo ✅ 프론트엔드 의존성 설치 완료!
cd ..
echo.

echo ==========================================
echo ✅ 설치가 완료되었습니다!
echo.
echo 이제 start.bat 파일을 실행하여
echo 데이케어 관리 시스템을 시작하세요.
echo ==========================================
echo.
pause


