#!/bin/bash
# Firebird 2.5 설치를 위한 통합 스크립트
# 이 스크립트는 sudo 권한이 필요합니다.

set -e

echo "=========================================="
echo "Firebird 2.5 설치 프로세스"
echo "=========================================="
echo ""

# 1단계: Firebird 3.0 제거
echo "📦 1단계: Firebird 3.0 제거 중..."
echo ""

echo "Firebird 3.0 서버 중지 중..."
sudo systemctl stop firebird3.0 2>/dev/null || true
sudo systemctl disable firebird3.0 2>/dev/null || true

echo "Firebird 3.0 패키지 제거 중..."
sudo apt-get remove --purge -y \
    firebird3.0-server \
    firebird3.0-server-core \
    firebird3.0-utils \
    firebird3.0-common \
    firebird3.0-common-doc \
    firebird3.0-doc \
    firebird3.0-examples 2>/dev/null || true

echo "✅ Firebird 3.0 제거 완료"
echo ""

# 2단계: Firebird 2.5 다운로드 및 설치
echo "📦 2단계: Firebird 2.5 설치 중..."
echo ""

# 아키텍처 확인
ARCH=$(dpkg --print-architecture)
echo "시스템 아키텍처: $ARCH"

if [ "$ARCH" != "amd64" ] && [ "$ARCH" != "i386" ]; then
    echo "❌ 경고: Firebird 2.5는 amd64 또는 i386 아키텍처만 지원합니다."
    echo "현재 아키텍처: $ARCH"
    exit 1
fi

# 임시 디렉토리 생성
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

echo "임시 디렉토리: $TMP_DIR"
echo ""

# Firebird 2.5.9 다운로드
FIREBIRD_VERSION="2.5.9"
FIREBIRD_URL="https://github.com/FirebirdSQL/firebird/releases/download/v${FIREBIRD_VERSION}"

if [ "$ARCH" = "amd64" ]; then
    PACKAGE_NAME="Firebird-${FIREBIRD_VERSION}-amd64.tar.gz"
elif [ "$ARCH" = "i386" ]; then
    PACKAGE_NAME="Firebird-${FIREBIRD_VERSION}-i386.tar.gz"
fi

echo "다운로드 URL: ${FIREBIRD_URL}/${PACKAGE_NAME}"
echo ""

# wget 또는 curl 확인
if ! command -v wget &> /dev/null && ! command -v curl &> /dev/null; then
    echo "wget 또는 curl 설치 중..."
    sudo apt-get update
    sudo apt-get install -y wget
fi

# 다운로드
echo "Firebird 2.5 패키지 다운로드 중..."
if command -v wget &> /dev/null; then
    wget "${FIREBIRD_URL}/${PACKAGE_NAME}" -O "$PACKAGE_NAME" || {
        echo ""
        echo "❌ 자동 다운로드 실패"
        echo ""
        echo "수동 다운로드 방법:"
        echo "1. 브라우저에서 다음 URL을 열어주세요:"
        echo "   https://github.com/FirebirdSQL/firebird/releases/tag/v${FIREBIRD_VERSION}"
        echo ""
        echo "2. ${PACKAGE_NAME} 파일을 다운로드하세요"
        echo ""
        echo "3. 다운로드한 파일을 $TMP_DIR 에 복사한 후"
        echo "   이 스크립트를 다시 실행하세요."
        exit 1
    }
else
    curl -L "${FIREBIRD_URL}/${PACKAGE_NAME}" -o "$PACKAGE_NAME" || {
        echo ""
        echo "❌ 자동 다운로드 실패"
        exit 1
    }
fi

echo "✅ 다운로드 완료"
echo ""

# 압축 해제
echo "압축 해제 중..."
tar -xzf "$PACKAGE_NAME"
cd Firebird-${FIREBIRD_VERSION}-*

# 설치 스크립트 확인
if [ -f "install.sh" ]; then
    echo "설치 스크립트 실행 중..."
    echo "설치 중 SYSDBA 비밀번호를 입력하라는 프롬프트가 나올 수 있습니다."
    echo "기본값: masterkey"
    echo ""
    sudo ./install.sh
else
    echo "❌ install.sh 파일을 찾을 수 없습니다."
    echo "현재 디렉토리 내용:"
    ls -la
    exit 1
fi

# 임시 디렉토리 정리
cd /
rm -rf "$TMP_DIR"

# 3단계: 서비스 시작
echo ""
echo "📦 3단계: Firebird 2.5 서비스 시작 중..."
echo ""

# Firebird 2.5 서비스 시작 (시스템에 따라 다를 수 있음)
if [ -f "/etc/init.d/firebird2.5-classic" ]; then
    sudo service firebird2.5-classic start
    sudo update-rc.d firebird2.5-classic enable
elif systemctl list-units --type=service --all | grep -q firebird2.5; then
    sudo systemctl start firebird2.5-classic
    sudo systemctl enable firebird2.5-classic
else
    echo "⚠️  Firebird 2.5 서비스가 자동으로 시작되지 않았습니다."
    echo "수동으로 시작해야 할 수 있습니다."
fi

# 4단계: 버전 확인
echo ""
echo "📦 4단계: 설치 확인 중..."
echo ""

if [ -f "/opt/firebird/bin/isql" ]; then
    echo "Firebird 버전:"
    /opt/firebird/bin/isql -z 2>&1 | head -1 || echo "버전 확인 실패"
    
    # PATH에 추가 안내
    echo ""
    echo "💡 Firebird 명령어를 사용하려면 PATH에 추가하세요:"
    echo "   export PATH=\"/opt/firebird/bin:\$PATH\""
    echo "   또는 ~/.bashrc에 추가:"
    echo "   echo 'export PATH=\"/opt/firebird/bin:\$PATH\"' >> ~/.bashrc"
elif command -v isql &> /dev/null; then
    echo "Firebird 버전:"
    isql -z 2>&1 | head -1 || echo "버전 확인 실패"
else
    echo "⚠️  isql 명령을 찾을 수 없습니다."
    echo "Firebird가 /opt/firebird/bin/ 에 설치되었는지 확인하세요."
fi

# 5단계: 데이터베이스 파일 권한 설정
echo ""
echo "📦 5단계: 데이터베이스 파일 권한 설정 중..."
echo ""

DB_PATH="/home/han/firebird_api_v2/db"
if [ -d "$DB_PATH" ]; then
    echo "데이터베이스 파일 권한 설정 중..."
    sudo chown firebird:firebird "$DB_PATH"/*.FDB 2>/dev/null || true
    sudo chmod 640 "$DB_PATH"/*.FDB 2>/dev/null || true
    sudo chmod 755 "$DB_PATH" 2>/dev/null || true
    echo "✅ 권한 설정 완료"
else
    echo "⚠️  데이터베이스 디렉토리를 찾을 수 없습니다: $DB_PATH"
fi

echo ""
echo "=========================================="
echo "✅ Firebird 2.5 설치 완료!"
echo "=========================================="
echo ""
echo "다음 단계:"
echo "1. 연결 테스트:"
echo "   cd /home/han/firebird_api_v2"
echo "   FIREBIRD_DATABASE_PATH=./db npm run test-connection"
echo ""
echo "2. 데이터베이스 구조 분석:"
echo "   FIREBIRD_DATABASE_PATH=./db npm run analyze"
echo ""

