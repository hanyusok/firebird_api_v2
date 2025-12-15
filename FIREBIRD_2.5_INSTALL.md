# Firebird 2.5 설치 가이드

## 개요

데이터베이스 파일이 Firebird 2.x 형식(ODS 11.2)인 경우, Firebird 2.5 서버가 필요합니다.

## 자동 설치 (권장)

```bash

# 1. Firebird 2.5 설치
./scripts/install-firebird2.5.sh
```

## 수동 설치

### 1단계: Firebird 2.5 다운로드

1. 브라우저에서 다음 URL 열기:
   https://github.com/FirebirdSQL/firebird/releases/tag/v2.5.9

2. 시스템 아키텍처에 맞는 파일 다운로드:
   - **amd64**: `Firebird-2.5.9-amd64.tar.gz`
   - **i386**: `Firebird-2.5.9-i386.tar.gz`

   아키텍처 확인:
   ```bash
   dpkg --print-architecture
   ```

### 3단계: Firebird 2.5 설치

```bash
# 임시 디렉토리 생성
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

# 다운로드한 파일을 이 디렉토리로 복사한 후:
tar -xzf FirebirdSS-2.5.9-*.tar.gz
cd Firebird-2.5.9-*

# 설치 실행
sudo ./install.sh
```

설치 중 SYSDBA 비밀번호를 입력하라는 프롬프트가 나옵니다. 기본값은 `masterkey`입니다.

### 4단계: 서비스 시작

```bash
# 서비스 시작 (시스템에 따라 다를 수 있음)
sudo service firebird2.5-classic start
# 또는
sudo systemctl start firebird2.5-classic

# 자동 시작 설정
sudo update-rc.d firebird2.5-classic enable
# 또는
sudo systemctl enable firebird2.5-classic
```

### 5단계: 설치 확인

```bash
# 버전 확인
/opt/firebird/bin/isql -z

# 또는 (경로가 PATH에 있는 경우)
isql -z
```

### 6단계: 데이터베이스 파일 권한 설정

```bash
# 파일 소유권 변경
sudo chown firebird:firebird /home/han/firebird_api_v2/db/*.FDB

# 파일 권한 설정
sudo chmod 640 /home/han/firebird_api_v2/db/*.FDB

# 디렉토리 권한 확인
sudo chmod 755 /home/han/firebird_api_v2/db
```

### 7단계: 연결 테스트

```bash
cd /home/han/firebird_api_v2
FIREBIRD_DATABASE_PATH=./db npm run test-connection
```

또는 isql로 직접 테스트:

```bash
/opt/firebird/bin/isql -user SYSDBA -password masterkey \
  localhost:/home/han/firebird_api_v2/db/MTSCHT.FDB
```

## 문제 해결

### "command not found: isql"

Firebird 2.5는 기본적으로 `/opt/firebird/bin/`에 설치됩니다.
전체 경로를 사용하거나 PATH에 추가하세요:

```bash
# PATH에 추가 (임시)
export PATH="/opt/firebird/bin:$PATH"

# 영구적으로 추가하려면 ~/.bashrc에 추가
echo 'export PATH="/opt/firebird/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 서비스가 시작되지 않음

```bash
# 서비스 상태 확인
sudo service firebird2.5-classic status
# 또는
sudo systemctl status firebird2.5-classic

# 로그 확인
sudo journalctl -u firebird2.5-classic -n 50
# 또는
sudo tail -f /var/log/syslog | grep firebird
```

### 포트 충돌

Firebird 2.5도 기본적으로 포트 3050을 사용합니다.
이전 Firebird 서버가 완전히 제거되었는지 확인하세요:

```bash
# 포트 사용 확인
sudo lsof -i :3050
# 또는
sudo ss -tuln | grep 3050
```

## 참고 자료

- [Firebird 2.5 릴리스 페이지](https://github.com/FirebirdSQL/firebird/releases/tag/v2.5.9)
- [Firebird 공식 문서](https://firebirdsql.org/en/documentation/)

