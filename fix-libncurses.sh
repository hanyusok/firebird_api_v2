#!/bin/bash
# libncurses.so.5 호환성 문제 해결 스크립트

echo "=========================================="
echo "libncurses.so.5 호환성 문제 해결"
echo "=========================================="
echo ""

# 1. libncurses6 확인
echo "1. 설치된 libncurses 라이브러리 확인:"
NCURSES6=$(find /usr/lib* /lib* -name "libncurses.so.6*" 2>/dev/null | head -1)
if [ -n "$NCURSES6" ]; then
    echo "   ✅ libncurses.so.6 발견: $NCURSES6"
else
    echo "   ❌ libncurses.so.6를 찾을 수 없습니다"
    echo "   libncurses6 설치 중..."
    sudo apt-get update
    sudo apt-get install -y libncurses6
    NCURSES6=$(find /usr/lib* /lib* -name "libncurses.so.6*" 2>/dev/null | head -1)
fi

echo ""

# 2. libncurses5 확인
echo "2. libncurses.so.5 확인:"
NCURSES5=$(find /usr/lib* /lib* -name "libncurses.so.5*" 2>/dev/null | head -1)
if [ -n "$NCURSES5" ]; then
    echo "   ✅ libncurses.so.5 이미 존재: $NCURSES5"
else
    echo "   ❌ libncurses.so.5를 찾을 수 없습니다"
    
    # 3. libncurses5 패키지 설치 시도
    echo ""
    echo "3. libncurses5 패키지 설치 시도:"
    sudo apt-get update
    sudo apt-get install -y libncurses5 2>&1 | tail -5
    
    # 다시 확인
    NCURSES5=$(find /usr/lib* /lib* -name "libncurses.so.5*" 2>/dev/null | head -1)
    
    if [ -z "$NCURSES5" ] && [ -n "$NCURSES6" ]; then
        echo ""
        echo "4. libncurses.so.6에서 호환성 링크 생성:"
        NCURSES_DIR=$(dirname "$NCURSES6")
        echo "   디렉토리: $NCURSES_DIR"
        
        # 심볼릭 링크 생성
        if [ -f "$NCURSES_DIR/libncurses.so.6" ]; then
            echo "   libncurses.so.5 링크 생성 중..."
            sudo ln -sf "$NCURSES_DIR/libncurses.so.6" "$NCURSES_DIR/libncurses.so.5"
            sudo ldconfig
            echo "   ✅ 링크 생성 완료"
        elif [ -f "$NCURSES_DIR/libncurses.so.6.4" ]; then
            echo "   libncurses.so.5 링크 생성 중..."
            sudo ln -sf "$NCURSES_DIR/libncurses.so.6.4" "$NCURSES_DIR/libncurses.so.5"
            sudo ldconfig
            echo "   ✅ 링크 생성 완료"
        fi
    fi
fi

echo ""
echo "5. 최종 확인:"
if ldd /opt/firebird/bin/isql 2>&1 | grep -q "libncurses.so.5 => not found"; then
    echo "   ❌ 여전히 libncurses.so.5를 찾을 수 없습니다"
    echo ""
    echo "   수동 해결 방법:"
    echo "   1. libncurses5-dev 설치:"
    echo "      sudo apt-get install -y libncurses5-dev"
    echo ""
    echo "   2. 또는 직접 링크 생성:"
    echo "      sudo ln -s /lib/x86_64-linux-gnu/libncurses.so.6 /lib/x86_64-linux-gnu/libncurses.so.5"
    echo "      sudo ldconfig"
else
    echo "   ✅ libncurses.so.5 문제 해결됨"
    echo ""
    echo "   Firebird 버전 확인:"
    /opt/firebird/bin/isql -z 2>&1 | head -1
fi

echo ""
echo "=========================================="

