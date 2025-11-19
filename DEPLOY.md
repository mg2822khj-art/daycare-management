# 🚀 Railway 배포 가이드

## 배포 준비 완료! ✅

모든 파일이 Railway 배포를 위해 준비되었습니다.

## 📋 배포 단계

### 1️⃣ GitHub 저장소 생성 및 푸시

1. **GitHub에서 새 저장소 만들기**
   - https://github.com/new 접속
   - 저장소 이름: `daycare-management` (또는 원하는 이름)
   - Public 또는 Private 선택
   - "Create repository" 클릭

2. **로컬 코드를 GitHub에 푸시**

```bash
# Git 초기화 (이미 했다면 skip)
git init

# 모든 파일 스테이징
git add .

# 커밋
git commit -m "Railway 배포 준비 완료"

# GitHub 저장소 연결 (YOUR-USERNAME과 YOUR-REPO를 실제 값으로 변경)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# 브랜치 이름 확인 및 설정
git branch -M main

# 푸시
git push -u origin main
```

### 2️⃣ Railway 배포

1. **Railway 가입**
   - https://railway.app 접속
   - "Start a New Project" 클릭
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   - "Deploy from GitHub repo" 선택
   - 방금 만든 저장소 선택
   - Railway가 자동으로 빌드 시작 (3-5분 소요)

3. **도메인 설정**
   - 프로젝트 대시보드에서 Settings 클릭
   - "Generate Domain" 버튼 클릭
   - 생성된 URL 메모 (예: `https://your-app.railway.app`)

4. **환경 변수 (자동 설정됨)**
   - `PORT`: Railway가 자동 할당
   - `NODE_ENV`: `production`으로 자동 설정

### 3️⃣ 접속 확인

배포가 완료되면:
- 🌐 제공된 URL로 어디서든 접속 가능
- 📱 모바일에서도 동일한 URL로 접속
- 💾 모든 데이터가 클라우드에 저장됨

---

## 📝 변경된 파일 목록

1. **package.json**
   - `build` 스크립트 추가
   - `engines` 섹션 추가 (Node.js 버전 명시)

2. **server/index.js**
   - 환경변수 `PORT` 지원
   - 프로덕션 환경에서 React 정적 파일 서빙

3. **railway.json** (신규)
   - Railway 배포 설정

---

## 💡 배포 후 팁

### 로그 확인
Railway 대시보드 → Deployments → View Logs

### 재배포
GitHub에 새 코드를 푸시하면 자동으로 재배포됩니다:
```bash
git add .
git commit -m "업데이트 내용"
git push
```

### 무료 티어 제한
- Railway: 월 $5 크레딧 (약 500시간)
- 소규모 사용에는 충분합니다!

### 데이터베이스 영구 저장 (선택사항)
현재 SQLite 파일은 서버 재시작 시 초기화될 수 있습니다.
영구 저장이 필요하면:
1. Railway 대시보드 → 프로젝트 선택
2. "New" → "Volume" 클릭
3. Mount Path: `/app` 입력
4. 재배포

---

## ❓ 문제 해결

### 빌드 실패 시
- Railway 로그에서 오류 메시지 확인
- Node.js 버전 확인 (18 이상 필요)

### 배포는 성공했지만 접속 안 됨
- Railway 대시보드에서 로그 확인
- "Generate Domain" 버튼을 눌렀는지 확인

### 데이터가 사라짐
- Railway Volume 설정 (위 참조)

---

## 🎉 완료!

이제 어디서든 데이케어 관리 시스템을 사용할 수 있습니다!

- PC에서: `https://your-app.railway.app`
- 모바일에서: `https://your-app.railway.app`
- 태블릿에서: `https://your-app.railway.app`

서버를 켜놓지 않아도 24시간 접속 가능합니다! 🚀

