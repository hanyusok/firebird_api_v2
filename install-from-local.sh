#!/bin/bash
# 로컬에 다운로드한 Firebird 2.5 설치 스크립트

set -e

FIREBIRD_PACKAGE="/home/han/firebird_api_v2/TMP_DIR/FirebirdSS-2.5.9.27139-0.amd64.tar.gz"
INSTALL_DIR="/home/han/firebird_api_v2"

echo "=========================================="
echo "Firebird 2.5 설치 (로컬 패키지)"
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

# 2단계: 압축 해제
echo "📦 2단계: Firebird 2.5 패키지 압축 해제 중..."
echo ""

if [ ! -f "$FIREBIRD_PACKAGE" ]; then
    echo "❌ 오류: 패키지 파일을 찾을 수 없습니다: $FIREBIRD_PACKAGE"
    exit 1
fi

cd "$INSTALL_DIR"
TMP_DIR=$(mktemp -d -p "$INSTALL_DIR")
echo "임시 디렉토리: $TMP_DIR"

tar -xzf "$FIREBIRD_PACKAGE" -C "$TMP_DIR"
echo "✅ 압축 해제 완료"
echo ""

# 3단계: 설치
echo "📦 3단계: Firebird 2.5 설치 중..."
echo ""

# 압축 해제된 디렉토리 찾기
EXTRACTED_DIR=$(find "$TMP_DIR" -maxdepth 1 -type d -name "Firebird*" | head -1)

if [ -z "$EXTRACTED_DIR" ]; then
    echo "❌ 오류: 압축 해제된 디렉토리를 찾을 수 없습니다."
    echo "압축 해제된 내용:"
    ls -la "$TMP_DIR"
    exit 1
fi

echo "설치 디렉토리: $EXTRACTED_DIR"
cd "$EXTRACTED_DIR"

# install.sh 파일 찾기
if [ -f "install.sh" ]; then
    echo "설치 스크립트 실행 중..."
    echo "설치 중 SYSDBA 비밀번호를 입력하라는 프롬프트가 나올 수 있습니다."
    echo "기본값: masterkey"
    echo ""
    sudo ./install.sh
elif [ -f "builds/install/misc/install.sh" ]; then
    echo "설치 스크립트 실행 중..."
    sudo ./builds/install/misc/install.sh
else
    echo "❌ install.sh 파일을 찾을 수 없습니다."
    echo "현재 디렉토리 내용:"
    ls -la
    echo ""
    echo "하위 디렉토리:"
    find . -name "install.sh" -type f 2>/dev/null | head -5
    exit 1
fi

# 임시 디렉토리 정리
echo ""
echo "임시 파일 정리 중..."
rm -rf "$TMP_DIR"

# 4단계: 서비스 시작
echo ""
echo "📦 4단계: Firebird 2.5 서비스 시작 중..."
echo ""

# Firebird 2.5 서비스 시작 (시스템에 따라 다를 수 있음)
if [ -f "/etc/init.d/firebird2.5-classic" ]; then
    sudo service firebird2.5-classic start
    sudo update-rc.d firebird2.5-classic enable
    echo "✅ Firebird 2.5 서비스 시작됨"
elif systemctl list-units --type=service --all 2>/dev/null | grep -q firebird2.5; then
    sudo systemctl start firebird2.5-classic
    sudo systemctl enable firebird2.5-classic
    echo "✅ Firebird 2.5 서비스 시작됨"
elif [ -f "/opt/firebird/bin/fbguard" ]; then
    echo "Firebird 서버를 수동으로 시작해야 할 수 있습니다."
    echo "다음 명령으로 시작하세요:"
    echo "  sudo /opt/firebird/bin/fbguard -daemon"
else
    echo "⚠️  Firebird 2.5 서비스가 자동으로 시작되지 않았습니다."
    echo "수동으로 시작해야 할 수 있습니다."
fi

# 5단계: 버전 확인
echo ""
echo "📦 5단계: 설치 확인 중..."
echo ""

if [ -f "/opt/firebird/bin/isql" ]; then
    echo "Firebird 버전:"
    /opt/firebird/bin/isql -z 2>&1 | head -1 || echo "버전 확인 실패"
    
    # PATH에 추가 안내
    echo ""
    echo "💡 Firebird 명령어를 사용하려면 PATH에 추가하세요:"
    echo "   export PATH=\"/opt/firebird/bin:\$PATH\""
elif command -v isql &> /dev/null; then
    echo "Firebird 버전:"
    isql -z 2>&1 | head -1 || echo "버전 확인 실패"
else
    echo "⚠️  isql 명령을 찾을 수 없습니다."
    echo "Firebird가 /opt/firebird/bin/ 에 설치되었는지 확인하세요."
fi

# 6단계: 데이터베이스 파일 권한 설정
echo ""
echo "📦 6단계: 데이터베이스 파일 권한 설정 중..."
echo ""

DB_PATH="/home/han/firebird_api_v2/db"
if [ -d "$DB_PATH" ]; then
    echo "데이터베이스 파일 권한 설정 중..."
    sudo chown firebird:firebird "$DB_PATH"/*.FDB 2>/dev/null || true
    sudo chmod 640 "$DB_PATH"/*.FDB 2>/dev/null || true
    sudo chmod 755 "$DB_PATH" 2>/dev/null || true
    echo "✅ 권한 설정 완료"
    echo ""
    echo "설정된 권한:"
    ls -la "$DB_PATH"/*.FDB | head -3
else
    echo "⚠️  데이터베이스 디렉토리를 찾을 수 없습니다: $DB_PATH"
fi

echo ""
echo "=========================================="
echo "✅ Firebird 2.5 설치 완료!"
echo "=========================================="
echo ""
echo "다음 단계:"
echo "1. PATH 설정 (선택사항):"
echo "   export PATH=\"/opt/firebird/bin:\$PATH\""
echo "   또는 ~/.bashrc에 추가:"
echo "   echo 'export PATH=\"/opt/firebird/bin:\$PATH\"' >> ~/.bashrc"
echo ""
echo "2. 연결 테스트:"
echo "   cd /home/han/firebird_api_v2"
echo "   FIREBIRD_DATABASE_PATH=./db npm run test-connection"
echo ""
echo "3. 데이터베이스 구조 분석:"
echo "   FIREBIRD_DATABASE_PATH=./db npm run analyze"
echo ""

