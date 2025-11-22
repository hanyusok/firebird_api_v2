#!/bin/bash
# Firebird 3.0 제거 스크립트

set -e

echo "=========================================="
echo "Firebird 3.0 제거 스크립트"
echo "=========================================="
echo ""

echo "⚠️  경고: 이 스크립트는 Firebird 3.0을 완전히 제거합니다."
echo ""

read -p "계속하시겠습니까? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "제거를 취소했습니다."
    exit 0
fi

echo ""
echo "1. Firebird 3.0 서버 중지 중..."
sudo systemctl stop firebird3.0 2>/dev/null || true
sudo systemctl disable firebird3.0 2>/dev/null || true

echo "2. Firebird 3.0 패키지 제거 중..."
sudo apt-get remove --purge -y \
    firebird3.0-server \
    firebird3.0-server-core \
    firebird3.0-utils \
    firebird3.0-common \
    firebird3.0-common-doc \
    firebird3.0-doc \
    firebird3.0-examples 2>/dev/null || true

echo "3. 남은 설정 파일 제거 중..."
sudo apt-get autoremove -y
sudo apt-get autoclean

echo ""
echo "✅ Firebird 3.0 제거 완료!"
echo ""
echo "다음 단계: Firebird 2.5 설치"
echo "  ./scripts/install-firebird2.5.sh"

