@echo off
chcp 65001 > nul
echo ==========================================
echo    🗑️ 데이터베이스 초기화
echo ==========================================
echo.
echo 경고: 이 작업은 모든 고객 및 방문 데이터를 삭제합니다!
echo.
set /p confirm="계속하시겠습니까? (Y/N): "

if /i "%confirm%" NEQ "Y" (
    echo.
    echo 취소되었습니다.
    pause
    exit /b
)

echo.
echo 🗑️ 기존 데이터베이스를 삭제합니다...

if exist "server\daycare.db" (
    del "server\daycare.db"
    echo ✅ 데이터베이스가 삭제되었습니다.
) else (
    echo ℹ️ 데이터베이스 파일이 없습니다.
)

echo.
echo ==========================================
echo ✅ 초기화가 완료되었습니다!
echo.
echo 이제 서버를 시작하면 새 데이터베이스가
echo 생성됩니다.
echo ==========================================
echo.
pause

