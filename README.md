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

#### Ubuntu/WSL 설치:

**Firebird 2.5 설치 (ODS 11.2 형식 데이터베이스용):**

데이터베이스 파일이 Firebird 2.x 형식인 경우 Firebird 2.5가 필요합니다.

```bash
# 자동 설치 스크립트 사용 (권장)
./scripts/install-firebird2.5.sh

# 설치 확인
./check-firebird-installation.sh
```

자세한 설치 방법은 [FIREBIRD_2.5_INSTALL.md](./FIREBIRD_2.5_INSTALL.md)를 참고하세요.

#### macOS 설치:

1. **수동 설치:**
   - [Firebird GitHub 릴리스](https://github.com/FirebirdSQL/firebird/releases/latest)에서 macOS용 패키지 다운로드
   - Apple Silicon: `Firebird-*-macos-arm64.pkg`
   - Intel: `Firebird-*-macos-x64.pkg`
   - 다운로드한 `.pkg` 파일 실행하여 설치

2. **설치 후 서버 시작:**
   ```bash
   sudo launchctl load -w /Library/LaunchDaemons/org.firebird.gds.plist
   ```

**버전 호환성:**

- Firebird 2.x 형식(ODS 11.2): Firebird 2.5 필요
- Firebird 5.0은 ODS 13.1을 사용하므로 이전 버전과 호환되지 않음

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
FIREBIRD_DATABASE_PATH=/db
```

**참고:** 
- Ubuntu/WSL에서 DB 파일이 `/db` 폴더에 있는 경우: `FIREBIRD_DATABASE_PATH=/db`
- 프로젝트 내 `Db/` 폴더를 사용하는 경우: `FIREBIRD_DATABASE_PATH=./Db`
- Windows Firebird 서버를 사용하는 경우: `FIREBIRD_HOST=172.23.16.1` (Windows 호스트 IP)

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

이 명령은 환경 변수 `FIREBIRD_DATABASE_PATH`에 지정된 디렉토리의 모든 Firebird 데이터베이스 파일을 분석하고, `db-schema/` 디렉토리에 JSON 형식으로 스키마 정보를 저장합니다.

### 연결 테스트

```bash
npm run test-connection
```

Firebird 데이터베이스 연결을 테스트합니다.

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

### 5. 테이블 검색

```http
GET /api/databases/[dbName]/tables/[tableName]/search?pcode=123&pname=홍길동&page=1&limit=100
```

**쿼리 파라미터:**
- `pcode`: 코드 검색 (숫자, 와일드카드 지원: `*`, `%`)
- `pname`: 이름 검색 (문자열, 부분 일치)
- `pbirth`: 생년월일 검색 (날짜 형식: YYYY-MM-DD)
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 레코드 수 (기본값: 100)

**예시:**
```http
GET /api/databases/MTSDB/tables/PATIENTS/search?pcode=12345&pname=홍&page=1&limit=50
```

**응답 예시:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "PATIENTS",
  "search": {
    "pcode": "12345",
    "pname": "홍",
    "pbirth": null
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10,
    "totalPages": 1
  },
  "columns": ["PCODE", "PNAME", "PBIRTH"],
  "data": [...]
}
```

### 6. 사용자 정의 쿼리 실행

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
│   │           │       ├── schema/
│   │           │       │   └── route.ts    # 테이블 스키마
│   │           │       └── search/
│   │           │           └── route.ts    # 테이블 검색
│   │           └── query/
│   │               └── route.ts            # 사용자 쿼리
│   ├── globals.css                         # 전역 스타일
│   ├── layout.tsx                          # 레이아웃 컴포넌트
│   └── page.tsx                            # 메인 페이지
├── lib/
│   └── firebird.ts                         # Firebird 유틸리티 함수
├── scripts/
│   ├── analyze-db.ts                       # 데이터베이스 분석 스크립트
│   ├── install-firebird2.5.sh             # Firebird 2.5 설치 스크립트
│   ├── fix-permissions.sh                 # 데이터베이스 파일 권한 수정
│   └── test-connection.ts                  # 연결 테스트 스크립트
├── check-firebird-installation.sh          # Firebird 설치 확인 스크립트
├── FIREBIRD_2.5_INSTALL.md                # Firebird 2.5 설치 가이드
├── WSL_SETUP.md                           # WSL 설정 가이드
└── README.md                               # 프로젝트 문서
```

## 유용한 스크립트

### Firebird 설치 확인

```bash
./check-firebird-installation.sh
```

Firebird 설치 상태를 종합적으로 확인합니다.

### 데이터베이스 파일 권한 수정

```bash
./scripts/fix-permissions.sh
```

데이터베이스 파일의 소유권과 권한을 올바르게 설정합니다.

## 기술 스택

- **Next.js 14**: React 프레임워크
- **TypeScript**: 타입 안정성
- **node-firebird**: Firebird 데이터베이스 연결
- **Tailwind CSS**: 스타일링

## 추가 문서

- [FIREBIRD_2.5_INSTALL.md](./FIREBIRD_2.5_INSTALL.md) - Firebird 2.5 설치 가이드
- [WSL_SETUP.md](./WSL_SETUP.md) - WSL 환경 설정 가이드

## 라이선스

MIT

