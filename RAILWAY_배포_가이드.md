# 🚀 Railway 클라우드 배포 - 단계별 가이드

## ✅ 배포 준비 완료!

모든 파일이 Railway 배포를 위해 수정되었습니다!

---

## 📋 이제 해야 할 일

### 1단계: GitHub 저장소 만들기

1. **GitHub 웹사이트 접속**
   - https://github.com/new
   - 로그인 필요

2. **저장소 설정**
   - Repository name: `daycare-management` (또는 원하는 이름)
   - Public 또는 Private 선택
   - **❌ README, .gitignore, license 추가 체크 해제** (이미 있음)
   - "Create repository" 버튼 클릭

3. **저장소 URL 복사**
   - 생성된 페이지에서 HTTPS URL 복사
   - 예: `https://github.com/YOUR-USERNAME/daycare-management.git`

---

### 2단계: Git 명령어 실행 (PowerShell)

프로젝트 폴더에서 **PowerShell**을 열고 다음 명령어를 **순서대로** 실행하세요:

```powershell
# 1. Git 초기화 (처음이면)
git init

# 2. 모든 파일 스테이징
git add .

# 3. 첫 커밋
git commit -m "Railway 클라우드 배포 준비 완료"

# 4. 메인 브랜치로 이름 변경
git branch -M main

# 5. GitHub 저장소 연결 (YOUR-URL을 실제 URL로 변경!)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# 6. GitHub에 푸시
git push -u origin main
```

**⚠️ 주의:** 5번 명령어에서 `YOUR-USERNAME`과 `YOUR-REPO`를 실제 값으로 변경하세요!

---

### 3단계: Railway 배포

1. **Railway 접속**
   - https://railway.app
   - "Start a New Project" 클릭

2. **GitHub 계정 연결**
   - "Deploy from GitHub repo" 선택
   - GitHub 로그인 및 권한 승인

3. **저장소 선택**
   - 방금 만든 `daycare-management` 저장소 선택
   - Railway가 자동으로 감지하고 빌드 시작! ⏳

4. **빌드 완료 대기** (약 3-5분)
   - 빌드 로그를 실시간으로 볼 수 있습니다
   - ✅ "Success" 메시지가 나오면 완료!

5. **도메인 생성**
   - 프로젝트 → Settings → Networking
   - "Generate Domain" 버튼 클릭
   - 생성된 URL 복사! 🎉
   - 예: `https://daycare-management-production.up.railway.app`

---

## 🌐 배포 완료! 접속 방법

생성된 URL로 어디서든 접속 가능합니다:

- **PC에서**: 브라우저에서 URL 입력
- **모바일에서**: 동일한 URL 입력
- **친구/동료와 공유**: URL만 전달하면 OK!

**더 이상 서버를 켜놓지 않아도 됩니다!** 🎊

---

## 📝 변경된 파일 목록

1. ✅ `package.json` - 빌드 스크립트 추가
2. ✅ `server/index.js` - 프로덕션 환경 지원
3. ✅ `railway.json` - Railway 배포 설정 (신규)
4. ✅ `DEPLOY.md` - 상세 배포 문서 (신규)

---

## 💡 유용한 팁

### 코드 수정 후 재배포
GitHub에 푸시하면 자동으로 재배포됩니다!

```powershell
git add .
git commit -m "기능 추가"
git push
```

### 배포 로그 확인
Railway 대시보드 → Deployments → View Logs

### 무료 티어
- Railway: 월 $5 크레딧 (약 500시간 실행)
- 소규모 데이케어에 충분합니다!

---

## ❓ 자주 묻는 질문

**Q: 데이터가 사라지나요?**
A: 서버 재시작 시 초기화될 수 있습니다. 영구 저장이 필요하면 Railway Volume 설정을 추가하세요. (DEPLOY.md 참조)

**Q: 비용이 얼마나 드나요?**
A: 무료 티어로 시작 가능합니다. 월 500시간까지 무료!

**Q: 도메인을 변경할 수 있나요?**
A: 커스텀 도메인 연결 가능합니다. (Railway 유료 플랜)

---

## 🎉 완료!

이제 어디서든 데이케어 관리 시스템을 사용할 수 있습니다!

궁금한 점이 있으면 `DEPLOY.md` 파일을 참고하세요.

**행운을 빕니다!** 🚀🐕


