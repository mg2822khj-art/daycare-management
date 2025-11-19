# 🚀 GitHub 업로드 및 Railway 배포 - 최종 단계

Git 설치 완료! 이제 GitHub에 코드를 업로드하고 Railway에 배포하겠습니다! 🎉

---

## 📝 1단계: Git 초기 설정 (한 번만!)

PowerShell에서 다음 명령어를 실행하세요:

```powershell
# 사용자 이름 설정 (본인 이름으로 변경하세요)
git config --global user.name "본인이름"

# 이메일 설정 (GitHub 가입 이메일로 변경하세요)
git config --global user.email "your-email@example.com"

# 설정 확인
git config --list
```

**⚠️ 중요:** 이메일은 GitHub 계정 이메일과 동일해야 합니다!

---

## 📂 2단계: 프로젝트 폴더에서 Git 명령어 실행

프로젝트 폴더 (`C:\cursor\데이케어관리`)에서 PowerShell을 열고 다음 명령어를 **순서대로** 실행하세요:

### 1️⃣ Git 저장소 초기화
```powershell
git init
```
→ `Initialized empty Git repository...` 메시지가 나오면 성공!

### 2️⃣ 모든 파일 스테이징
```powershell
git add .
```
→ 아무 메시지 없이 다음 줄로 넘어가면 성공!

### 3️⃣ 첫 커밋
```powershell
git commit -m "Railway 클라우드 배포 준비 완료"
```
→ 파일 개수와 변경사항이 표시되면 성공!

### 4️⃣ 브랜치 이름 설정
```powershell
git branch -M main
```
→ 아무 메시지 없이 다음 줄로 넘어가면 성공!

---

## 🌐 3단계: GitHub 저장소 만들기

### 방법 A: GitHub 계정이 있는 경우

1. **GitHub 로그인**: https://github.com

2. **새 저장소 만들기**:
   - 오른쪽 상단 "+" 버튼 → "New repository" 클릭
   - 또는 직접 접속: https://github.com/new

3. **저장소 설정**:
   - Repository name: `daycare-management` 입력
   - Description (선택): "강아지 데이케어 관리 시스템"
   - Public 또는 Private 선택
   - **❌ README, .gitignore, license 체크 해제** (이미 있음)
   - "Create repository" 클릭

4. **저장소 URL 복사**:
   - 생성된 페이지에서 HTTPS URL 복사
   - 예: `https://github.com/YOUR-USERNAME/daycare-management.git`

### 방법 B: GitHub 계정이 없는 경우

1. **GitHub 가입**: https://github.com/signup
   - 이메일 입력 (위에서 git config에 설정한 이메일과 동일하게!)
   - 비밀번호 설정
   - 사용자 이름 설정
   - 이메일 인증 완료

2. 위의 "방법 A" 단계 진행

---

## 📤 4단계: GitHub에 코드 업로드

PowerShell에서 다음 명령어를 실행하세요:

```powershell
# GitHub 저장소 연결 (URL을 실제 저장소 URL로 변경!)
git remote add origin https://github.com/YOUR-USERNAME/daycare-management.git

# GitHub에 푸시
git push -u origin main
```

### 💡 GitHub 로그인 요청 시:
- 창이 뜨면 GitHub 계정으로 로그인
- 또는 Personal Access Token 입력 (GitHub 설정에서 생성)

### ✅ 성공하면:
```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
...
To https://github.com/YOUR-USERNAME/daycare-management.git
 * [new branch]      main -> main
```

---

## 🚂 5단계: Railway 배포

### 1️⃣ Railway 접속
- https://railway.app
- "Start a New Project" 클릭
- **GitHub 계정으로 로그인**

### 2️⃣ 저장소 연결
- "Deploy from GitHub repo" 선택
- GitHub 권한 승인 (처음 한 번만)
- `daycare-management` 저장소 선택

### 3️⃣ 자동 빌드 대기
- Railway가 자동으로 코드를 감지하고 빌드 시작
- 로그를 실시간으로 볼 수 있습니다
- ⏳ 약 3-5분 소요

### 4️⃣ 도메인 생성
- 빌드 완료 후: 프로젝트 페이지에서 Settings 클릭
- Networking 섹션에서 "Generate Domain" 버튼 클릭
- 생성된 URL 복사! 🎉
- 예: `https://daycare-management-production.up.railway.app`

---

## 🎊 완료!

이제 생성된 URL로 어디서든 접속할 수 있습니다!

- 📱 모바일에서도 접속 가능
- 💻 PC를 끄고 있어도 작동
- 🌐 친구/동료와 URL만 공유하면 됩니다

---

## 🔄 코드 수정 후 재배포

나중에 코드를 수정하고 다시 배포하려면:

```powershell
# 1. 변경사항 추가
git add .

# 2. 커밋
git commit -m "기능 추가 또는 수정 내용"

# 3. GitHub에 푸시
git push
```

→ Railway가 자동으로 감지하고 재배포합니다!

---

## ❓ 문제 해결

### "git push" 시 로그인 오류
→ GitHub Personal Access Token 필요
→ GitHub → Settings → Developer settings → Personal access tokens → Generate new token

### Railway 빌드 실패
→ Railway 대시보드에서 로그 확인
→ 대부분 Node.js 버전 문제 (이미 설정됨)

### 배포는 성공했지만 페이지가 안 열림
→ Railway 대시보드에서 "Generate Domain" 버튼 클릭 확인
→ 로그에서 서버 실행 확인

---

## 📞 다음 단계

위 명령어들을 PowerShell에서 순서대로 실행해주세요!

각 단계마다 결과를 알려주시면 도움을 드리겠습니다! 😊

