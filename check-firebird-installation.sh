#!/bin/bash
# Firebird 설치 상태 종합 확인 스크립트

echo "=========================================="
echo "Firebird 설치 상태 확인"
echo "=========================================="
echo ""

# 1. 설치 디렉토리 확인
echo "1. Firebird 설치 디렉토리:"
if [ -d "/opt/firebird" ]; then
    echo "   ✅ /opt/firebird 디렉토리 존재"
    echo "   디렉토리 내용:"
    ls -ld /opt/firebird
else
    echo "   ❌ /opt/firebird 디렉토리가 없습니다"
fi

echo ""

# 2. 실행 파일 확인
echo "2. 주요 실행 파일:"
BIN_FILES=("isql" "fbguard" "fbserver" "gbak" "gfix")
for file in "${BIN_FILES[@]}"; do
    if [ -f "/opt/firebird/bin/$file" ]; then
        echo "   ✅ $file 존재"
    else
        echo "   ❌ $file 없음"
    fi
done

echo ""

# 3. 라이브러리 확인
echo "3. Firebird 라이브러리:"
if [ -d "/opt/firebird/lib" ]; then
    echo "   ✅ /opt/firebird/lib 디렉토리 존재"
    echo "   주요 라이브러리:"
    ls -lh /opt/firebird/lib/libfbclient.so* 2>/dev/null | head -3
else
    echo "   ❌ /opt/firebird/lib 디렉토리가 없습니다"
fi

echo ""

# 4. 의존성 확인
echo "4. isql 의존성 확인:"
if [ -f "/opt/firebird/bin/isql" ]; then
    MISSING=$(ldd /opt/firebird/bin/isql 2>&1 | grep "not found")
    if [ -z "$MISSING" ]; then
        echo "   ✅ 모든 의존성이 설치되어 있습니다"
    else
        echo "   ❌ 누락된 의존성:"
        echo "$MISSING" | sed 's/^/      /'
    fi
else
    echo "   ⚠️  isql 파일이 없어 의존성을 확인할 수 없습니다"
fi

echo ""

# 5. Firebird 버전 확인
echo "5. Firebird 버전:"
if [ -f "/opt/firebird/bin/isql" ]; then
    if ldd /opt/firebird/bin/isql 2>&1 | grep -q "not found"; then
        echo "   ⚠️  의존성 문제로 버전을 확인할 수 없습니다"
    else
        /opt/firebird/bin/isql -z 2>&1 | head -1 || echo "   ❌ 버전 확인 실패"
    fi
else
    echo "   ⚠️  isql이 없어 버전을 확인할 수 없습니다"
fi

echo ""

# 6. 프로세스 확인
echo "6. Firebird 프로세스:"
PROCESSES=$(ps aux | grep -E "(firebird|fbguard)" | grep -v grep)
if [ -n "$PROCESSES" ]; then
    echo "   ✅ Firebird 프로세스 실행 중:"
    echo "$PROCESSES" | sed 's/^/      /'
else
    echo "   ❌ Firebird 프로세스가 실행 중이지 않습니다"
fi

echo ""

# 7. 포트 확인
echo "7. 포트 3050:"
if ss -tuln | grep -q ":3050"; then
    echo "   ✅ 포트 3050이 리스닝 중입니다"
    ss -tuln | grep ":3050" | sed 's/^/      /'
else
    echo "   ❌ 포트 3050이 리스닝 중이지 않습니다"
fi

echo ""

# 8. 데이터베이스 파일 권한
echo "8. 데이터베이스 파일 권한:"
DB_PATH="/home/han/firebird_api_v2/db"
if [ -d "$DB_PATH" ]; then
    DB_FILES=$(ls "$DB_PATH"/*.FDB 2>/dev/null | head -1)
    if [ -n "$DB_FILES" ]; then
        echo "   파일 권한:"
        ls -la "$DB_FILES" | sed 's/^/      /'
        echo ""
        echo "   소유자: $(stat -c '%U:%G' "$DB_FILES" 2>/dev/null || echo '알 수 없음')"
    else
        echo "   ⚠️  데이터베이스 파일을 찾을 수 없습니다"
    fi
else
    echo "   ⚠️  데이터베이스 디렉토리를 찾을 수 없습니다: $DB_PATH"
fi

echo ""

# 9. PATH 확인
echo "9. PATH 설정:"
if echo "$PATH" | grep -q "/opt/firebird/bin"; then
    echo "   ✅ /opt/firebird/bin이 PATH에 포함되어 있습니다"
else
    echo "   ⚠️  /opt/firebird/bin이 PATH에 없습니다"
    echo "   다음 명령으로 추가하세요:"
    echo "      export PATH=\"/opt/firebird/bin:\$PATH\""
fi

echo ""
echo "=========================================="
echo "확인 완료"
echo "=========================================="

