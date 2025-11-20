# 🚀 Render.com 배포 가이드 (5분 완성!)

Railway 대신 **Render.com**으로 배포합니다! 훨씬 간단하고 확실합니다! 😊

---

## 📋 배포 단계

### 1️⃣ Render 가입 및 로그인

1. **Render 웹사이트 접속**
   👉 https://render.com

2. **"Get Started for Free"** 클릭

3. **GitHub 계정으로 로그인**
   - "Sign Up with GitHub" 클릭
   - GitHub 계정 인증
   - Render 권한 승인

---

### 2️⃣ Web Service 생성

1. **Dashboard 화면**에서:
   - 왼쪽 상단 **"New +"** 버튼 클릭
   - **"Web Service"** 선택

2. **GitHub 저장소 연결**:
   - "Connect a repository" 섹션에서
   - `daycare-management` 저장소 찾기
   - **"Connect"** 버튼 클릭

   📌 **저장소가 안 보이면?**
   - "Configure account" 링크 클릭
   - GitHub에서 Render 접근 권한 설정
   - 모든 저장소 또는 특정 저장소 선택
   - 다시 돌아와서 새로고침

---

### 3️⃣ 서비스 설정

다음 정보를 입력하세요:

| 항목 | 입력 값 |
|------|---------|
| **Name** | `daycare-management` (또는 원하는 이름) |
| **Region** | `Singapore` (가장 가까움) |
| **Branch** | `main` |
| **Root Directory** | (비워두기) |
| **Runtime** | `Node` (자동 감지됨) |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |

#### Environment (환경변수) - 선택사항:
- **"Add Environment Variable"** 클릭
- `NODE_ENV` = `production` 입력

#### Plan 선택:
- **Free** 플랜 선택 ✅ (월 $0)

---

### 4️⃣ 배포 시작!

1. 아래로 스크롤하여 **"Create Web Service"** 버튼 클릭

2. **빌드 시작!** 🎉
   - 로그가 **실시간으로** 나타납니다!
   - 다음과 같은 내용이 표시됨:

```
==> Building...
Cloning repository...
Installing dependencies...
npm install
...
Building client...
cd client && npm run build
...
Build succeeded!

==> Deploying...
Starting server...
🐕 데이케어 관리 서버가 포트 XXXX에서 실행 중입니다.
환경: production

==> Your service is live! 🎉
```

3. **배포 시간**: 약 3-5분

---

### 5️⃣ URL 확인 및 접속

1. **배포 완료 후**:
   - 화면 상단에 **녹색 체크마크** ✅
   - URL이 표시됨
   - 예: `https://daycare-management.onrender.com`

2. **URL 클릭**하여 접속!

3. **완료!** 🎊
   - PC, 모바일, 어디서든 접속 가능
   - 더 이상 서버를 켜놓을 필요 없음!

---

## 🔍 빌드 로그 확인

**만약 빌드가 실패하면:**
- 화면에서 **"Logs"** 탭 클릭
- 빌드 로그에서 오류 메시지 확인
- 오류 내용을 복사해서 알려주세요!

---

## 💡 Render 무료 플랜 특징

### ✅ 장점:
- 완전 무료
- 자동 HTTPS (SSL 인증서)
- 자동 재배포 (GitHub push 시)
- 로그가 명확하게 보임

### ⚠️ 제약사항:
- **15분 미사용 시 슬립 모드**
  - 첫 접속 시 10-20초 정도 로딩
  - 이후 정상 속도
- 월 750시간 무료 (충분함!)

---

## 🔄 코드 수정 후 재배포

나중에 코드를 수정하면:

```powershell
# 변경사항 커밋
git add .
git commit -m "기능 수정"
git push
```

→ **Render가 자동으로 감지하고 재배포!** 🚀

---

## 📱 모바일 접속

Render URL을 모바일 브라우저에 입력하면 바로 접속됩니다!
- 북마크 저장
- 홈 화면에 추가 가능

---

## ❓ 문제 해결

### 저장소가 안 보여요
1. Render Dashboard → Settings
2. "Configure GitHub App"
3. 저장소 접근 권한 추가

### 빌드가 실패했어요
- Logs 탭에서 오류 확인
- 오류 메시지를 알려주세요!

### 배포는 성공했는데 접속이 안 돼요
- URL 옆에 녹색 체크마크 확인
- Logs에서 서버가 실행 중인지 확인

---

## 🎉 완료!

이제 어디서든 데이케어 관리 시스템을 사용할 수 있습니다!

**Render URL**: `https://your-app.onrender.com`

궁금한 점이 있으면 언제든 물어보세요! 😊


