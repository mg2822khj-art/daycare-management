# 💾 Render 데이터 영구 저장 설정 가이드

## 🚨 문제
GitHub에 코드를 푸시하고 Render가 재배포하면 **기존 고객 데이터가 모두 사라집니다!**

### 원인:
- SQLite 데이터베이스 파일이 서버 컨테이너 안에 저장됨
- 재배포 시 컨테이너가 새로 만들어지면서 모든 파일 초기화

---

## ✅ 해결 방법: Render Disk 사용

Render의 영구 저장소(Disk)를 사용하여 데이터를 안전하게 보관합니다!

---

## 📋 설정 단계

### 1️⃣ 코드 수정 완료 ✅

`server/database.js` 파일이 이미 수정되었습니다!
- 환경변수 `DB_PATH`를 지원하도록 변경
- 프로덕션 환경에서 `/app/data` 디렉토리 자동 생성

---

### 2️⃣ GitHub에 푸시

```powershell
# 변경사항 추가
git add .

# 커밋
git commit -m "Render Disk 영구 저장소 지원 추가"

# 푸시
git push
```

→ Render가 자동으로 재배포 (약 5분)

---

### 3️⃣ Render Disk 생성

1. **Render 대시보드 접속**:
   👉 https://dashboard.render.com

2. **왼쪽 메뉴에서 "Disks" 클릭**:
   - 또는 프로젝트 페이지에서 "Add Disk"

3. **"New Disk" 버튼 클릭**

4. **설정 입력**:
   ```
   Name: daycare-database
   
   Mount Path: /app/data
   
   Size: 1 GB
   ```
   
   ⚠️ **중요**: Mount Path는 반드시 `/app/data`로 입력!

5. **"Create Disk" 클릭**

---

### 4️⃣ Web Service에 Disk 연결

1. **생성된 Disk 페이지에서**:
   - "Connect to Service" 버튼 클릭

2. **Web Service 선택**:
   - `daycare-management` (프로젝트 이름) 선택
   - "Connect" 클릭

3. **재배포 대기**:
   - Render가 자동으로 재배포 시작
   - 약 3-5분 소요

---

### 5️⃣ 환경변수 설정

1. **프로젝트 → Environment 탭**

2. **"Add Environment Variable" 클릭**

3. **환경변수 추가**:
   ```
   Key: DB_PATH
   Value: /app/data/daycare.db
   ```

4. **"Save Changes" 클릭**

5. **재배포 대기** (자동으로 시작됨)

---

## ✅ 완료! 확인하기

### 테스트 방법:

1. **앱 접속하여 고객 등록**
   - 테스트 데이터 몇 개 입력

2. **재배포 테스트**:
   - Render 대시보드 → Manual Deploy → "Deploy latest commit"
   - 또는 GitHub에 새 코드 푸시

3. **데이터 확인**:
   - 재배포 완료 후 앱 접속
   - **기존 데이터가 그대로 남아있어야 합니다!** ✅

---

## 🎉 이제 안전합니다!

### ✅ 해결된 문제:
- ✅ 재배포 시 데이터 유지
- ✅ GitHub 푸시 시 데이터 안전
- ✅ 서버 재시작 시 데이터 보존

### 💾 데이터 저장 위치:
- **개발 (로컬)**: `./server/daycare.db`
- **프로덕션 (Render)**: `/app/data/daycare.db` (영구 저장소)

---

## 📊 Render 무료 플랜

- **Disk 용량**: 1 GB 무료
- **충분한 용량**: 고객 수천 명 저장 가능
- **자동 백업**: Render가 관리

---

## ⚠️ 중요 참고사항

### Disk 연결 전 데이터:
- Disk 연결 전에 입력한 데이터는 **사라집니다**
- Disk 연결 후부터 데이터가 영구 저장됨

### 백업 권장:
- 정기적으로 엑셀 다운로드 기능 사용
- 중요 데이터는 로컬에도 백업

---

## 🔄 데이터 마이그레이션 (선택사항)

기존 로컬 데이터를 Render로 옮기고 싶다면:

1. 로컬에서 엑셀 다운로드
2. Render 앱에 접속하여 수동으로 재입력
3. 또는 PostgreSQL로 마이그레이션 (고급 사용자용)

---

## ❓ 문제 해결

### Disk가 연결 안 됨:
- Mount Path가 정확히 `/app/data`인지 확인
- 환경변수 `DB_PATH`가 `/app/data/daycare.db`인지 확인
- 재배포 후 로그에서 "💾 데이터베이스 경로" 메시지 확인

### 여전히 데이터가 사라짐:
- Render 로그 확인: "📁 데이터 디렉토리 생성" 메시지가 있는지
- Environment 탭에서 `DB_PATH` 환경변수 확인
- Disk가 Web Service에 연결되어 있는지 확인

---

## 📞 다음 단계

1. 위 단계대로 Render Disk 설정
2. 테스트 데이터로 확인
3. 재배포 후에도 데이터 유지 확인!

이제 안심하고 코드를 업데이트할 수 있습니다! 🎊


