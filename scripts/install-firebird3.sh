#!/bin/bash
# Firebird 3.0 설치 스크립트 (Ubuntu/WSL)

set -e

echo "🔍 현재 Firebird 버전 확인 중..."
firebird3.0-server --version 2>/dev/null || echo "Firebird 3.0이 설치되어 있지 않습니다."

echo ""
echo "📦 Firebird 3.0 서버 설치 중..."
echo ""

# 기존 Firebird 4.0/5.0 제거 (있는 경우)
echo "기존 Firebird 서버 중지..."
sudo systemctl stop firebird3.0 2>/dev/null || true

# Firebird 3.0 설치
echo "Firebird 3.0 설치..."
sudo apt update
sudo apt install -y firebird3.0-server firebird3.0-utils

echo ""
echo "✅ Firebird 3.0 설치 완료!"
echo ""
echo "설정 단계:"
echo "1. SYSDBA 비밀번호 설정 (기본값: masterkey)"
echo "2. 서버 시작"
echo ""
read -p "Firebird 서버를 시작하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl start firebird3.0
    sudo systemctl enable firebird3.0
    echo "✅ Firebird 3.0 서버가 시작되었습니다."
    echo ""
    echo "서버 상태 확인:"
    sudo systemctl status firebird3.0 --no-pager | head -10
fi

echo ""
echo "연결 테스트:"
echo "  npm run test-connection"

