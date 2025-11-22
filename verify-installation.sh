#!/bin/bash
# Firebird 2.5 설치 확인 스크립트

echo "=========================================="
echo "Firebird 2.5 설치 확인"
echo "=========================================="
echo ""

# 1. Firebird 버전 확인
echo "1. Firebird 버전 확인:"
if [ -f "/opt/firebird/bin/isql" ]; then
    /opt/firebird/bin/isql -z 2>&1 | head -1
    ISQL_PATH="/opt/firebird/bin/isql"
elif command -v isql &> /dev/null; then
    isql -z 2>&1 | head -1
    ISQL_PATH="isql"
else
    echo "❌ isql 명령을 찾을 수 없습니다."
    exit 1
fi

echo ""

# 2. Firebird 프로세스 확인
echo "2. Firebird 프로세스 확인:"
ps aux | grep -E "(firebird|fbguard)" | grep -v grep || echo "⚠️  Firebird 프로세스가 실행 중이지 않습니다."

echo ""

# 3. 포트 확인
echo "3. 포트 3050 확인:"
ss -tuln | grep 3050 || echo "⚠️  포트 3050이 리스닝 중이지 않습니다."

echo ""

# 4. 데이터베이스 파일 권한 확인
echo "4. 데이터베이스 파일 권한 확인:"
DB_PATH="/home/han/firebird_api_v2/db"
if [ -d "$DB_PATH" ]; then
    ls -la "$DB_PATH"/*.FDB 2>/dev/null | head -3
else
    echo "⚠️  데이터베이스 디렉토리를 찾을 수 없습니다: $DB_PATH"
fi

echo ""

# 5. 연결 테스트
echo "5. 연결 테스트:"
DB_FILE=$(ls "$DB_PATH"/*.FDB 2>/dev/null | head -1)
if [ -n "$DB_FILE" ]; then
    echo "테스트 데이터베이스: $(basename $DB_FILE)"
    echo "SELECT COUNT(*) FROM RDB\$RELATIONS WHERE RDB\$SYSTEM_FLAG = 0;" | \
        $ISQL_PATH -user SYSDBA -password masterkey \
        localhost:"$DB_FILE" 2>&1 | head -5
else
    echo "⚠️  테스트할 데이터베이스 파일을 찾을 수 없습니다."
fi

echo ""
echo "=========================================="

