# Firebird API Service

Firebird 데이터베이스 파일을 분석하고 RESTful API 서비스를 제공하는 Next.js 애플리케이션입니다.

## 기능

- 🔍 **데이터베이스 분석**: Firebird 데이터베이스 파일의 스키마 자동 분석
- 📊 **RESTful API**: 표준 REST API를 통한 데이터 접근
- 📄 **페이징 지원**: 대용량 데이터 조회 시 페이징 기능 제공
- 🔐 **보안**: SELECT 쿼리만 허용하여 데이터 무결성 보호

## 사전 요구사항

### Firebird 서버 설치

이 프로젝트를 사용하려면 Firebird 서버가 설치되어 있어야 합니다.

**Firebird 서버 설치 확인:**
```bash
# 프로세스 확인
ps aux | grep -E "(firebird|fbguard)"

# 포트 확인
lsof -i :3050
```

**Firebird 서버가 설치되어 있지 않은 경우:**

1. **수동 설치:**
   - [Firebird GitHub 릴리스](https://github.com/FirebirdSQL/firebird/releases/latest)에서 macOS용 패키지 다운로드
   - Apple Silicon: `Firebird-*-macos-arm64.pkg`
   - Intel: `Firebird-*-macos-x64.pkg`
   - 다운로드한 `.pkg` 파일 실행하여 설치

2. **설치 후 서버 시작:**
   ```bash
   sudo launchctl load -w /Library/LaunchDaemons/org.firebird.gds.plist
   ```

**버전 호환성 문제:**

데이터베이스 파일이 Firebird 2.x/3.x 형식(ODS 11.2)인 경우:
- Firebird 3.0 또는 4.0 설치 필요
- Firebird 5.0은 ODS 13.1을 사용하므로 호환되지 않음

자세한 내용은 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)를 참고하세요.

자세한 내용은 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)와 [SCRIPTS.md](./SCRIPTS.md)를 참고하세요.

## 설치

```bash
npm install
```

## 환경 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey
FIREBIRD_DATABASE_PATH=./Db
```

## 사용 방법

### 개발 서버 실행

```bash
npm run dev
```

서버는 `http://localhost:3000`에서 실행됩니다.

### 데이터베이스 스키마 분석

```bash
npm run analyze
```

이 명령은 `Db/` 디렉토리의 모든 Firebird 데이터베이스 파일을 분석하고, `db-schema/` 디렉토리에 JSON 형식으로 스키마 정보를 저장합니다.

## API 엔드포인트

### 1. 데이터베이스 목록 조회

```http
GET /api/databases
```

**응답 예시:**
```json
{
  "success": true,
  "count": 11,
  "databases": [
    {
      "name": "MTSDB",
      "fileName": "MTSDB.FDB",
      "path": "/path/to/Db/MTSDB.FDB"
    }
  ]
}
```

### 2. 테이블 목록 조회

```http
GET /api/databases/[dbName]/tables
```

**예시:**
```http
GET /api/databases/MTSDB/tables
```

**응답 예시:**
```json
{
  "success": true,
  "database": "MTSDB",
  "count": 10,
  "tables": [
    {
      "name": "TABLE_NAME",
      "url": "/api/databases/MTSDB/tables/TABLE_NAME"
    }
  ]
}
```

### 3. 테이블 데이터 조회

```http
GET /api/databases/[dbName]/tables/[tableName]?page=1&limit=100
```

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 레코드 수 (기본값: 100)

**예시:**
```http
GET /api/databases/MTSDB/tables/USERS?page=1&limit=50
```

**응답 예시:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "USERS",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1000,
    "totalPages": 20
  },
  "columns": ["ID", "NAME", "EMAIL"],
  "data": [...]
}
```

### 4. 테이블 스키마 조회

```http
GET /api/databases/[dbName]/tables/[tableName]/schema
```

**예시:**
```http
GET /api/databases/MTSDB/tables/USERS/schema
```

**응답 예시:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "USERS",
  "schema": {
    "columns": [
      {
        "name": "ID",
        "type": "INTEGER",
        "nullable": false,
        "defaultValue": null
      },
      {
        "name": "NAME",
        "type": "VARCHAR(100)",
        "nullable": true,
        "defaultValue": null
      }
    ],
    "primaryKeys": ["ID"],
    "foreignKeys": [
      {
        "name": "FK_USER_ROLE",
        "column": "ROLE_ID",
        "referencedTable": "ROLES",
        "referencedColumn": "ID"
      }
    ]
  }
}
```

### 5. 사용자 정의 쿼리 실행

```http
POST /api/databases/[dbName]/query
```

**요청 본문:**
```json
{
  "query": "SELECT * FROM USERS WHERE ID > ?",
  "params": [100]
}
```

**주의:** 보안상 SELECT 쿼리만 허용됩니다.

**응답 예시:**
```json
{
  "success": true,
  "database": "MTSDB",
  "query": "SELECT * FROM USERS WHERE ID > ?",
  "count": 50,
  "data": [...]
}
```

## 프로젝트 구조

```
firebird_api_v2/
├── app/
│   ├── api/
│   │   └── databases/
│   │       ├── route.ts                    # 데이터베이스 목록
│   │       └── [dbName]/
│   │           ├── tables/
│   │           │   ├── route.ts            # 테이블 목록
│   │           │   └── [tableName]/
│   │           │       ├── route.ts        # 테이블 데이터
│   │           │       └── schema/
│   │           │           └── route.ts    # 테이블 스키마
│   │           └── query/
│   │               └── route.ts            # 사용자 쿼리
│   └── page.tsx                            # API 문서 페이지
├── lib/
│   └── firebird.ts                         # Firebird 유틸리티
├── scripts/
│   └── analyze-db.ts                       # 데이터베이스 분석 스크립트
├── Db/                                     # Firebird 데이터베이스 파일
└── db-schema/                              # 분석된 스키마 (자동 생성)
```

## 기술 스택

- **Next.js 14**: React 프레임워크
- **TypeScript**: 타입 안정성
- **node-firebird**: Firebird 데이터베이스 연결
- **Tailwind CSS**: 스타일링 (선택사항)

## 라이선스

MIT

