#!/bin/bash
# Firebird 2.5 의존성 설치 스크립트

echo "=========================================="
echo "Firebird 2.5 의존성 설치"
echo "=========================================="
echo ""

echo "누락된 라이브러리 확인 중..."
ldd /opt/firebird/bin/isql 2>&1 | grep "not found" || echo "모든 의존성이 설치되어 있습니다."

echo ""
echo "필요한 패키지 설치 중..."
echo ""

# libncurses5 설치
sudo apt-get update
sudo apt-get install -y libncurses5

# 기타 일반적인 의존성 확인 및 설치
echo ""
echo "추가 의존성 확인 중..."

# libstdc++ 확인
if ! ldconfig -p | grep -q libstdc++; then
    echo "libstdc++ 설치 중..."
    sudo apt-get install -y libstdc++6
fi

# libgcc 확인
if ! ldconfig -p | grep -q libgcc_s; then
    echo "libgcc 설치 중..."
    sudo apt-get install -y libgcc1
fi

# 32비트 라이브러리 (필요한 경우)
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" = "amd64" ]; then
    echo "64비트 시스템용 32비트 호환 라이브러리 확인 중..."
    sudo apt-get install -y lib32ncurses5 2>/dev/null || true
fi

echo ""
echo "의존성 재확인 중..."
if ldd /opt/firebird/bin/isql 2>&1 | grep -q "not found"; then
    echo "⚠️  여전히 누락된 의존성이 있습니다:"
    ldd /opt/firebird/bin/isql 2>&1 | grep "not found"
else
    echo "✅ 모든 의존성이 설치되었습니다!"
fi

echo ""
echo "Firebird 버전 확인:"
/opt/firebird/bin/isql -z 2>&1 | head -1 || echo "여전히 오류가 있습니다."

