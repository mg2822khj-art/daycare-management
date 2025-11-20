# 🔧 Git 설치 가이드

Git이 설치되어 있지 않습니다. 먼저 Git을 설치해야 GitHub에 코드를 업로드할 수 있습니다!

---

## 🚀 방법 1: 공식 설치 프로그램 (가장 쉬움!)

### 1단계: Git 다운로드

**다음 링크를 클릭하여 Git을 다운로드하세요:**
👉 **https://git-scm.com/download/win**

- "64-bit Git for Windows Setup" 클릭
- 또는 자동으로 다운로드가 시작됩니다

### 2단계: 설치하기

1. 다운로드한 `Git-x.xx.x-64-bit.exe` 파일 실행

2. 설치 옵션:
   - **대부분 기본값으로 "Next" 클릭하면 됩니다!**
   - 중요한 설정들은 이미 최적화되어 있습니다

3. 주의할 옵션:
   - "Choosing the default editor": **Visual Studio Code** 또는 **Notepad++** 선택 (선호하는 것)
   - "Adjusting your PATH environment": **Git from the command line and also from 3rd-party software** (기본값) 선택
   - 나머지는 모두 기본값으로 진행

4. "Install" 클릭 → 설치 완료 대기 (약 1-2분)

5. "Finish" 클릭

### 3단계: 설치 확인

1. **PowerShell을 완전히 닫고 다시 열기** (중요!)

2. 다음 명령어로 확인:
```powershell
git --version
```

3. 버전이 표시되면 성공! ✅
   - 예: `git version 2.43.0.windows.1`

---

## 🔧 방법 2: winget 사용 (Windows 11 또는 최신 Windows 10)

PowerShell을 **관리자 권한으로** 실행 후:

```powershell
winget install --id Git.Git -e --source winget
```

설치 후 PowerShell을 다시 열고 확인:
```powershell
git --version
```

---

## 📝 Git 초기 설정 (설치 후 필수!)

Git 설치 후 **한 번만** 다음 명령어를 실행하세요:

```powershell
# 사용자 이름 설정 (GitHub 사용자 이름 또는 실제 이름)
git config --global user.name "홍길동"

# 이메일 설정 (GitHub에 가입한 이메일)
git config --global user.email "your-email@example.com"
```

**⚠️ 중요:** 이메일은 GitHub 계정 이메일과 동일해야 합니다!

---

## ✅ 설치 완료 후

Git 설치가 완료되면 프로젝트 폴더에서 다음 명령어를 실행하세요:

```powershell
# 1. Git 초기화
git init

# 2. 모든 파일 추가
git add .

# 3. 커밋
git commit -m "Railway 클라우드 배포 준비 완료"

# 4. 브랜치 이름 설정
git branch -M main
```

그 다음 GitHub에 업로드하면 됩니다!

---

## ❓ 문제 해결

### "git --version" 명령어가 작동하지 않음
→ **PowerShell을 완전히 닫고 다시 열기**
→ PC 재시작

### 설치는 했는데 명령어가 인식 안 됨
→ 환경변수 PATH에 Git이 추가되지 않은 경우
→ Git을 다시 설치하고 "PATH environment" 옵션 확인

---

## 📞 도움이 필요하면

Git 설치가 완료되면 알려주세요! 다음 단계를 진행하겠습니다. 😊


