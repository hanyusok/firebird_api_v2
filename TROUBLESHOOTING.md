# 문제 해결 가이드

## "Connection is closed" 오류

### 원인
Firebird 서버 버전과 데이터베이스 파일 버전이 호환되지 않습니다.

오류 메시지:
```
unsupported on-disk structure for file ...; found 11.2, support 13.1
```

### 해결 방법

#### 방법 1: 호환되는 Firebird 버전 설치 (권장)

데이터베이스 파일이 Firebird 11.2 형식이므로, Firebird 3.0 또는 4.0을 설치하세요:

1. **Firebird 3.0 다운로드 및 설치**
   - [Firebird 3.0 릴리스 페이지](https://github.com/FirebirdSQL/firebird/releases/tag/v3.0.13)에서 macOS용 패키지 다운로드
   - 설치 후 기존 Firebird 5.0 제거 또는 다른 경로에 설치

2. **또는 Firebird 4.0 설치**
   - [Firebird 4.0 릴리스 페이지](https://github.com/FirebirdSQL/firebird/releases/tag/v4.0.5)에서 macOS용 패키지 다운로드

#### 방법 2: 데이터베이스 파일 업그레이드

Firebird 5.0을 사용하려면 데이터베이스 파일을 업그레이드해야 합니다:

```bash
# 1. Firebird 3.0 또는 4.0으로 데이터베이스 백업
/Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/gbak -b -user SYSDBA -password masterkey \
  localhost:/Users/han/dev/firebird_api_v2/Db/MTSCHT.FDB \
  /tmp/MTSCHT.fbk

# 2. Firebird 5.0으로 복원 (자동 업그레이드)
/Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/gbak -c -user SYSDBA -password masterkey \
  /tmp/MTSCHT.fbk \
  localhost:/Users/han/dev/firebird_api_v2/Db/MTSCHT.FDB
```

**주의**: 데이터베이스 업그레이드는 되돌릴 수 없으므로 백업을 먼저 생성하세요.

#### 방법 3: Firebird Embedded 모드 사용 (제한적)

일부 경우에는 Embedded 모드를 사용할 수 있지만, node-firebird는 서버 모드를 사용하므로 이 방법은 제한적입니다.

### 현재 설치된 Firebird 버전 확인

```bash
/Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/isql -z
```

### 데이터베이스 파일 버전 확인

```bash
/Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/gstat -h /path/to/database.fdb
```

### 권장 사항

1. **데이터베이스 파일 버전 확인**: 모든 데이터베이스 파일의 버전을 확인하세요
2. **호환되는 Firebird 버전 설치**: 데이터베이스 파일과 호환되는 Firebird 버전을 설치하세요
3. **백업 생성**: 업그레이드 전에 반드시 백업을 생성하세요

## 기타 문제

### 포트 3050이 열리지 않는 경우

```bash
# 서버 재시작
./start-firebird.sh

# 또는
sudo /Library/Frameworks/Firebird.framework/Versions/A/Resources/bin/fbguard &
```

### 인증 오류

기본 인증 정보:
- 사용자: `SYSDBA`
- 비밀번호: `masterkey`

설치 시 다른 비밀번호를 설정한 경우 해당 비밀번호를 사용하세요.

