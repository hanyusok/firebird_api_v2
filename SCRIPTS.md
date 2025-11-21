# Shell Scripts Documentation

이 프로젝트에서 사용되는 shell script에 대한 문서입니다.

## 현재 사용 가능한 스크립트

### `remove-large-files.sh`

Git 히스토리에서 큰 파일(데이터베이스 파일 등)을 제거하는 유틸리티 스크립트입니다.

**사용 목적:**
- GitHub에 push할 때 100MB 이상의 파일로 인한 오류 해결
- Git 히스토리에서 큰 데이터베이스 파일 제거

**사용 방법:**
```bash
./remove-large-files.sh
```

**주의사항:**
- Force push가 필요할 수 있습니다
- 팀원이 있다면 새 히스토리로 재클론해야 합니다

## 프로젝트에서 사용하는 주요 명령어

### 데이터베이스 분석

```bash
# TypeScript 스크립트 실행
npm run analyze
```

이 명령어는 `scripts/analyze-db.ts`를 실행하여 모든 Firebird 데이터베이스 파일의 스키마를 분석합니다.

### 개발 서버 실행

```bash
npm run dev
```

Next.js 개발 서버를 시작합니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## Git 관련 명령어

### 큰 파일 제거 후 Force Push

```bash
# Git 히스토리에서 큰 파일 제거
git rm -r --cached Db/

# 새 히스토리 생성 (필요시)
git checkout --orphan temp-main
git add .
git commit -m "Initial commit without large database files"
git branch -D main
git branch -m main

# Force push
git push -f origin main
```

## Firebird 서버 관리

### 서버 상태 확인

```bash
# 프로세스 확인
ps aux | grep -E "(firebird|fbguard)"

# 포트 확인
lsof -i :3050
netstat -an | grep 3050
```

### 서버 시작/중지

```bash
# 서버 시작
sudo launchctl load -w /Library/LaunchDaemons/org.firebird.gds.plist

# 서버 중지
sudo launchctl unload /Library/LaunchDaemons/org.firebird.gds.plist

# 수동 시작
sudo /Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/fbguard &
```

### 버전 확인

```bash
/Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/isql -z
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 생성하여 다음 변수들을 설정할 수 있습니다:

```env
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey
FIREBIRD_DATABASE_PATH=./Db
```

## 유용한 명령어 모음

### 데이터베이스 파일 확인

```bash
# 데이터베이스 파일 목록
ls -lh Db/*.FDB

# 데이터베이스 파일 크기 합계
du -sh Db/
```

### Firebird 연결 테스트

```bash
# isql을 사용한 연결 테스트
/Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/isql \
  -user SYSDBA -password masterkey \
  localhost:/path/to/database.fdb
```

### 로그 확인

```bash
# Firebird 로그 확인
tail -f /Library/Frameworks/Firebird.framework/Versions/A/Resources/firebird.log

# 또는
tail -f /opt/firebird/firebird.log
```

## 스크립트 작성 가이드라인

새로운 shell script를 작성할 때 다음 사항을 고려하세요:

1. **실행 권한 부여**
   ```bash
   chmod +x script-name.sh
   ```

2. **Shebang 라인 포함**
   ```bash
   #!/bin/bash
   ```

3. **에러 처리**
   ```bash
   set -e  # 오류 발생 시 즉시 종료
   set -u  # 정의되지 않은 변수 사용 시 오류
   ```

4. **사용자 친화적 메시지**
   - 진행 상황 표시
   - 명확한 오류 메시지
   - 다음 단계 안내

5. **`.gitignore` 확인**
   - 데이터베이스 파일은 제외
   - 임시 파일 제외

## 참고 자료

- [Firebird 공식 문서](https://firebirdsql.org/en/documentation/)
- [Git Large File Storage](https://git-lfs.github.com/)
- [Next.js 문서](https://nextjs.org/docs)

