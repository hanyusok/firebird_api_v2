#!/bin/bash
# Firebird 데이터베이스 파일 권한 수정 스크립트

set -e

DB_PATH="${1:-./db}"

if [ ! -d "$DB_PATH" ]; then
    echo "❌ 디렉토리를 찾을 수 없습니다: $DB_PATH"
    exit 1
fi

echo "🔧 Firebird 데이터베이스 파일 권한 수정 중..."
echo "디렉토리: $DB_PATH"
echo ""

# Firebird 사용자가 읽을 수 있도록 권한 설정
# 방법 1: 그룹 권한 추가 (firebird 사용자가 han 그룹에 있는 경우)
# 방법 2: 다른 사용자 읽기 권한 추가
# 방법 3: firebird 사용자에게 소유권 변경 (sudo 필요)

echo "현재 권한:"
ls -la "$DB_PATH"/*.FDB 2>/dev/null | head -3

echo ""
echo "권한 수정 방법:"
echo ""
echo "방법 1: 다른 사용자 읽기 권한 추가 (권장)"
echo "  chmod o+r $DB_PATH/*.FDB"
echo ""
echo "방법 2: firebird 사용자에게 소유권 변경 (sudo 필요)"
echo "  sudo chown firebird:firebird $DB_PATH/*.FDB"
echo "  sudo chmod 640 $DB_PATH/*.FDB"
echo ""
echo "방법 3: firebird 사용자를 han 그룹에 추가 (sudo 필요)"
echo "  sudo usermod -a -G han firebird"
echo "  chmod g+r $DB_PATH/*.FDB"
echo ""

read -p "방법 1을 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    chmod o+r "$DB_PATH"/*.FDB 2>/dev/null || {
        echo "❌ 권한 수정 실패. sudo가 필요할 수 있습니다."
        echo "다음 명령을 직접 실행하세요:"
        echo "  chmod o+r $DB_PATH/*.FDB"
        exit 1
    }
    echo "✅ 권한 수정 완료!"
    echo ""
    echo "수정된 권한:"
    ls -la "$DB_PATH"/*.FDB 2>/dev/null | head -3
else
    echo "권한 수정을 건너뜁니다."
fi

