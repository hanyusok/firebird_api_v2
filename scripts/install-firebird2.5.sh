#!/bin/bash
# Firebird 2.5 설치 스크립트 (Ubuntu/WSL)

set -e

echo "=========================================="
echo "Firebird 2.5 설치 스크립트"
echo "=========================================="
echo ""

# 1. Firebird 2.5 패키지 준비 및 설치
echo "📦 1단계: Firebird 2.5 설치 중..."
echo ""

# 아키텍처 확인
ARCH=$(dpkg --print-architecture)
echo "시스템 아키텍처: $ARCH"

if [ "$ARCH" != "amd64" ] && [ "$ARCH" != "i386" ]; then
    echo "⚠️  경고: Firebird 2.5는 amd64 또는 i386 아키텍처만 지원합니다."
    echo "현재 아키텍처: $ARCH"
    exit 1
fi

# Firebird 2.5.9 (최신 2.5 버전)
FIREBIRD_VERSION="2.5.9"

# 1-1. 현재 프로젝트 폴더의 tmp 디렉토리에 있는 tar.gz 우선 사용
PROJECT_TMP_DIR="/home/han/firebird_api_v2/tmp"
LOCAL_TAR=""

if [ -d "$PROJECT_TMP_DIR" ]; then
    # 예: FirebirdSS-2.5.9.27139-0.amd64.tar.gz 등
    LOCAL_TAR_CANDIDATE=$(ls "$PROJECT_TMP_DIR"/*.tar.gz 2>/dev/null | head -n 1 || true)
    if [ -n "$LOCAL_TAR_CANDIDATE" ]; then
        LOCAL_TAR="$LOCAL_TAR_CANDIDATE"
        echo "로컬에서 Firebird 패키지를 찾았습니다:"
        echo "  $LOCAL_TAR"
        echo ""
    fi
fi

# 임시 디렉토리 생성
TMP_DIR=$(mktemp -d)
cd "$TMP_DIR"

if [ -n "$LOCAL_TAR" ]; then
    echo "로컬 tar.gz 파일을 사용하여 설치를 진행합니다."
    cp "$LOCAL_TAR" .
    PACKAGE_NAME=$(basename "$LOCAL_TAR")
else
    echo "로컬 tar.gz 파일을 찾지 못했습니다. 공식 사이트에서 다운로드합니다."
    echo ""

    FIREBIRD_URL="https://github.com/FirebirdSQL/firebird/releases/download/v${FIREBIRD_VERSION}"

    if [ "$ARCH" = "amd64" ]; then
        PACKAGE_NAME="Firebird-${FIREBIRD_VERSION}-amd64.tar.gz"
    elif [ "$ARCH" = "i386" ]; then
        PACKAGE_NAME="Firebird-${FIREBIRD_VERSION}-i386.tar.gz"
    else
        echo "❌ 지원되지 않는 아키텍처: $ARCH"
        echo "Firebird 2.5는 amd64 또는 i386만 지원합니다."
        exit 1
    fi

    echo "다운로드 URL: ${FIREBIRD_URL}/${PACKAGE_NAME}"
    echo ""

    # wget 또는 curl 확인
    if ! command -v wget &> /dev/null && ! command -v curl &> /dev/null; then
        echo "❌ wget 또는 curl이 필요합니다."
        echo "다음 명령으로 설치하세요: sudo apt-get install wget"
        exit 1
    fi

    # 다운로드 시도
    echo "Firebird 2.5 패키지 다운로드 중..."
    if command -v wget &> /dev/null; then
        wget "${FIREBIRD_URL}/${PACKAGE_NAME}" -O "$PACKAGE_NAME" 2>&1 || {
            echo ""
            echo "❌ 자동 다운로드 실패"
            echo ""
            echo "수동 다운로드 방법:"
            echo "1. 브라우저에서 다음 URL을 열어주세요:"
            echo "   https://github.com/FirebirdSQL/firebird/releases/tag/v${FIREBIRD_VERSION}"
            echo ""
            echo "2. ${PACKAGE_NAME} 파일을 다운로드하세요"
            echo ""
            echo "3. 다운로드한 파일을 현재 디렉토리($TMP_DIR)에 복사한 후"
            echo "   이 스크립트를 다시 실행하세요."
            exit 1
        }
    else
        curl -L "${FIREBIRD_URL}/${PACKAGE_NAME}" -o "$PACKAGE_NAME" 2>&1 || {
            echo ""
            echo "❌ 자동 다운로드 실패"
            echo ""
            echo "수동 다운로드 방법:"
            echo "1. 브라우저에서 다음 URL을 열어주세요:"
            echo "   https://github.com/FirebirdSQL/firebird/releases/tag/v${FIREBIRD_VERSION}"
            echo ""
            echo "2. ${PACKAGE_NAME} 파일을 다운로드하세요"
            echo ""
            echo "3. 다운로드한 파일을 현재 디렉토리($TMP_DIR)에 복사한 후"
            echo "   이 스크립트를 다시 실행하세요."
            exit 1
        }
    fi

    echo "✅ 다운로드 완료"
    echo ""
fi

# 압축 해제
echo "압축 해제 중..."
tar -xzf "$PACKAGE_NAME"

# 압축을 풀고 나서 생성된 Firebird 디렉토리를 자동으로 찾기
FIREBIRD_DIR=$(find . -maxdepth 1 -type d \( -name 'Firebird*' -o -name 'FirebirdSS*' \) | head -n 1 || true)

if [ -z "$FIREBIRD_DIR" ]; then
    echo "❌ Firebird 설치 디렉토리를 찾을 수 없습니다."
    echo "현재 디렉토리 내용:"
    ls -la
    exit 1
fi

echo "찾은 설치 디렉토리: $FIREBIRD_DIR"
cd "$FIREBIRD_DIR"

# 설치 스크립트 확인
if [ -f "install.sh" ]; then
    echo "설치 스크립트 실행 중..."
    echo "설치 중 SYSDBA 비밀번호를 입력하라는 프롬프트가 나올 수 있습니다."
    echo "기본값: masterkey"
    echo ""
    read -p "계속하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo ./install.sh
    else
        echo "설치를 취소했습니다."
        exit 1
    fi
else
    echo "❌ install.sh 파일을 찾을 수 없습니다."
    echo "수동 설치가 필요할 수 있습니다."
    exit 1
fi

# 임시 디렉토리 정리
cd /
rm -rf "$TMP_DIR"

# 3. 서비스 시작
echo ""
echo "📦 3단계: Firebird 2.5 서비스 시작 중..."
echo ""

# Firebird 2.5 서비스 이름 확인 (시스템에 따라 다를 수 있음)
if systemctl list-units --type=service | grep -q firebird2.5; then
    sudo systemctl start firebird2.5-classic || sudo service firebird2.5-classic start
    sudo systemctl enable firebird2.5-classic || sudo update-rc.d firebird2.5-classic enable
elif [ -f "/etc/init.d/firebird2.5-classic" ]; then
    sudo service firebird2.5-classic start
    sudo update-rc.d firebird2.5-classic enable
else
    echo "⚠️  Firebird 2.5 서비스가 자동으로 시작되지 않았습니다."
    echo "수동으로 시작해야 할 수 있습니다."
fi

# 4. 버전 확인
echo ""
echo "📦 4단계: 설치 확인 중..."
echo ""

if command -v isql-fb &> /dev/null; then
    echo "Firebird 버전:"
    isql-fb -z 2>&1 | head -1 || echo "버전 확인 실패"
elif [ -f "/opt/firebird/bin/isql" ]; then
    echo "Firebird 버전:"
    /opt/firebird/bin/isql -z 2>&1 | head -1 || echo "버전 확인 실패"
else
    echo "⚠️  isql 명령을 찾을 수 없습니다."
fi

echo ""
echo "=========================================="
echo "✅ Firebird 2.5 설치 완료!"
echo "=========================================="
echo ""
echo "다음 단계:"
echo "1. 데이터베이스 파일 권한 설정:"
echo "   sudo chown firebird:firebird /home/han/firebird_api_v2/db/*.FDB"
echo ""
echo "2. 연결 테스트:"
echo "   npm run test-connection"
echo ""

