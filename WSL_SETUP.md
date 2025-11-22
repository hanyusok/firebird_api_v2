# WSL Ubuntu에서 Firebird 설정 가이드

## 권한 문제 해결

Firebird 서버는 `firebird` 사용자로 실행되므로, 데이터베이스 파일에 접근할 수 있도록 권한을 설정해야 합니다.

### 방법 1: 파일 소유권 변경 (권장)

```bash
# 데이터베이스 파일의 소유권을 firebird 사용자로 변경
sudo chown firebird:firebird /home/han/firebird_api_v2/db/*.FDB

# 파일 권한 설정 (소유자 읽기/쓰기, 그룹 읽기)
sudo chmod 640 /home/han/firebird_api_v2/db/*.FDB

# 디렉토리 권한 설정 (firebird 사용자가 접근 가능하도록)
sudo chmod 755 /home/han/firebird_api_v2/db
```

### 방법 2: firebird 사용자를 han 그룹에 추가

```bash
# firebird 사용자를 han 그룹에 추가
sudo usermod -a -G han firebird

# 그룹 읽기 권한 추가
chmod g+r /home/han/firebird_api_v2/db/*.FDB
chmod g+x /home/han/firebird_api_v2/db

# Firebird 서버 재시작
sudo systemctl restart firebird3.0
```

### 방법 3: 표준 Firebird 디렉토리 사용

```bash
# Firebird 표준 디렉토리 생성
sudo mkdir -p /var/lib/firebird/data
sudo chown firebird:firebird /var/lib/firebird/data

# 데이터베이스 파일 복사 또는 심볼릭 링크
sudo cp /home/han/firebird_api_v2/db/*.FDB /var/lib/firebird/data/
sudo chown firebird:firebird /var/lib/firebird/data/*.FDB

# .env 파일에서 경로 변경
# FIREBIRD_DATABASE_PATH=/var/lib/firebird/data
```

## 연결 테스트

권한 설정 후 연결 테스트:

```bash
# isql로 직접 테스트
echo "SELECT COUNT(*) FROM RDB\$RELATIONS WHERE RDB\$SYSTEM_FLAG = 0;" | \
  isql-fb -user SYSDBA -password masterkey \
  localhost:/home/han/firebird_api_v2/db/MTSCHT.FDB

# 또는 Node.js 스크립트로 테스트
cd /home/han/firebird_api_v2
FIREBIRD_DATABASE_PATH=./db npx tsx scripts/test-connection.ts
```

## 데이터베이스 구조 분석

권한 문제 해결 후:

```bash
cd /home/han/firebird_api_v2
FIREBIRD_DATABASE_PATH=./db npm run analyze
```

## 버전 호환성 문제 해결

### "unsupported on-disk structure" 오류

데이터베이스 파일이 Firebird 2.x 형식(ODS 11.2)인 경우, Firebird 2.5 서버가 필요합니다.

#### 해결 방법 1: Firebird 2.5 설치 (권장)

Firebird 2.5는 ODS 11.2를 완벽하게 지원합니다.

```bash
# 1. Firebird 3.0 제거
./scripts/remove-firebird3.sh

# 2. Firebird 2.5 설치
./scripts/install-firebird2.5.sh
```

또는 수동 설치:

```bash
# Firebird 3.0 제거
sudo systemctl stop firebird3.0
sudo apt-get remove --purge -y firebird3.0-server firebird3.0-utils firebird3.0-common

# Firebird 2.5 다운로드 및 설치
# https://github.com/FirebirdSQL/firebird/releases/tag/v2.5.9
# 에서 Ubuntu용 패키지 다운로드 후 설치
```

#### 해결 방법 2: Firebird 3.0 사용

데이터베이스 파일이 Firebird 3.x 형식인 경우:

```bash
# 기존 Firebird 서버 중지
sudo systemctl stop firebird3.0

# Firebird 3.0 설치 (이미 설치되어 있을 수 있음)
sudo apt update
sudo apt install -y firebird3.0-server firebird3.0-utils

# 서버 시작
sudo systemctl start firebird3.0
sudo systemctl enable firebird3.0

# 버전 확인
isql-fb -z
```

또는 설치 스크립트 사용:
```bash
./scripts/install-firebird3.sh
```

## 문제 해결

### "Permission denied" 오류

1. 파일 소유권 확인:
   ```bash
   ls -la /home/han/firebird_api_v2/db/*.FDB
   ```

2. Firebird 서버 사용자 확인:
   ```bash
   ps aux | grep firebird
   ```

3. SELinux/AppArmor 확인 (있는 경우):
   ```bash
   sudo aa-status | grep firebird
   ```

### "Connection is closed" 오류

Firebird 버전 호환성 문제일 수 있습니다. 데이터베이스 파일 버전 확인:

```bash
# Firebird 버전 확인
isql-fb -z

# 데이터베이스 파일 버전은 Firebird 서버 로그에서 확인
sudo journalctl -u firebird3.0 -n 50 | grep -i "on-disk"
```

