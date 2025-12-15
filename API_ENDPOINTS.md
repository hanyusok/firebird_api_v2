# Backend API Endpoints for Frontend Service

프론트엔드 서비스를 위한 백엔드 API 엔드포인트 명세서입니다.

## API 기본 구조

### Base URL
```
http://localhost:3000/api
```

### 공통 응답 형식
```json
{
  "success": true|false,
  "data": {...},
  "error": "error message",
  "pagination": {...}  // 페이징이 필요한 경우
}
```

---

## 1. 데이터베이스 관리

### 1.1 데이터베이스 목록 조회
```http
GET /api/databases
```

**응답:**
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

**용도:** 프론트엔드에서 사용 가능한 데이터베이스 목록 표시

---

## 2. 테이블 관리

### 2.1 테이블 목록 조회
```http
GET /api/databases/[dbName]/tables
```

**예시:**
```http
GET /api/databases/MTSDB/tables
```

**응답:**
```json
{
  "success": true,
  "database": "MTSDB",
  "count": 10,
  "tables": [
    {
      "name": "PERSON",
      "url": "/api/databases/MTSDB/tables/PERSON"
    }
  ]
}
```

**용도:** 특정 데이터베이스의 테이블 목록 표시

---

## 3. 테이블 데이터 조회

### 3.1 테이블 데이터 조회 (페이징)
```http
GET /api/databases/[dbName]/tables/[tableName]?page=1&limit=100&sort=column&order=asc
```

**쿼리 파라미터:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 레코드 수 (기본값: 100, 최대: 1000)
- `sort`: 정렬 컬럼명 (선택)
- `order`: 정렬 방향 `asc` | `desc` (기본값: `asc`)

**예시:**
```http
GET /api/databases/MTSDB/tables/PERSON?page=1&limit=50&sort=PCODE&order=desc
```

**응답:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "PERSON",
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 67502,
    "totalPages": 1351
  },
  "columns": ["PCODE", "FCODE", "PNAME", "PBIRTH", ...],
  "data": [
    {
      "PCODE": 12345,
      "FCODE": 970,
      "PNAME": "임재권",
      "PBIRTH": null
    }
  ]
}
```

**용도:** 테이블 데이터를 페이지네이션하여 표시

---

### 3.2 테이블 스키마 조회
```http
GET /api/databases/[dbName]/tables/[tableName]/schema
```

**예시:**
```http
GET /api/databases/MTSDB/tables/PERSON/schema
```

**응답:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "PERSON",
  "schema": {
    "columns": [
      {
        "name": "PCODE",
        "type": "INTEGER",
        "nullable": false,
        "defaultValue": null,
        "size": 4
      },
      {
        "name": "PNAME",
        "type": "VARCHAR",
        "nullable": true,
        "defaultValue": null,
        "size": 50
      }
    ],
    "primaryKeys": ["PCODE"],
    "foreignKeys": [
      {
        "name": "FK_PERSON_FAMILY",
        "column": "FCODE",
        "referencedTable": "FAMILY",
        "referencedColumn": "FCODE"
      }
    ],
    "indexes": [...]
  }
}
```

**용도:** 테이블 구조 정보 표시, 폼 생성, 검증 규칙 설정

---

## 4. 검색 기능

### 4.1 테이블 검색
```http
GET /api/databases/[dbName]/tables/[tableName]/search?pcode=123&pname=홍길동&pbirth=1990-01-01&page=1&limit=100
```

**쿼리 파라미터:**
- `pcode`: 코드 검색 (숫자, 와일드카드: `*`, `%`)
- `pname`: 이름 검색 (문자열, 부분 일치)
- `pbirth`: 생년월일 검색 (날짜 형식: YYYY-MM-DD)
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 레코드 수 (기본값: 100)

**예시:**
```http
GET /api/databases/MTSDB/tables/PERSON/search?pname=한유석&page=1&limit=100
```

**응답:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "PERSON",
  "search": {
    "pcode": null,
    "pname": "한유석",
    "pbirth": null
  },
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1,
    "totalPages": 1
  },
  "columns": ["PCODE", "FCODE", "PNAME", ...],
  "data": [
    {
      "PCODE": 1762,
      "PNAME": "한유석",
      "PBIRTH": null
    }
  ]
}
```

**용도:** 조건부 검색, 필터링 기능

---

## 5. 사용자 정의 쿼리

### 5.1 사용자 정의 쿼리 실행
```http
POST /api/databases/[dbName]/query
```

**요청 본문:**
```json
{
  "query": "SELECT PCODE, PNAME FROM PERSON WHERE PCODE > ? ORDER BY PCODE",
  "params": [1000]
}
```

**응답:**
```json
{
  "success": true,
  "database": "MTSDB",
  "query": "SELECT PCODE, PNAME FROM PERSON WHERE PCODE > ?",
  "count": 50,
  "data": [...]
}
```

**주의:** 
- SELECT 쿼리만 허용 (보안)
- SQL Injection 방지를 위해 파라미터 바인딩 사용 필수

**용도:** 고급 사용자를 위한 커스텀 쿼리 실행

---

## 6. 추가 제안 엔드포인트 (구현 필요)

### 6.1 통계 정보 조회
```http
GET /api/databases/[dbName]/tables/[tableName]/stats
```

**응답:**
```json
{
  "success": true,
  "database": "MTSDB",
  "table": "PERSON",
  "stats": {
    "totalRecords": 67502,
    "columns": 58,
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

**용도:** 테이블 통계 정보 표시

---

### 6.2 데이터 내보내기
```http
GET /api/databases/[dbName]/tables/[tableName]/export?format=csv|json|excel
```

**쿼리 파라미터:**
- `format`: 내보내기 형식 (csv, json, excel)
- `page`: 페이지 번호 (선택)
- `limit`: 레코드 수 (선택)

**응답:** 파일 다운로드 또는 JSON 데이터

**용도:** 데이터 내보내기 기능

---

### 6.3 헬스 체크
```http
GET /api/health
```

**응답:**
```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "count": 11
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**용도:** 서버 상태 확인

---

### 6.4 정렬 옵션 조회
```http
GET /api/databases/[dbName]/tables/[tableName]/sort-options
```

**응답:**
```json
{
  "success": true,
  "sortableColumns": [
    {
      "name": "PCODE",
      "type": "INTEGER",
      "sortable": true
    },
    {
      "name": "PNAME",
      "type": "VARCHAR",
      "sortable": true
    }
  ]
}
```

**용도:** 프론트엔드에서 정렬 가능한 컬럼 목록 표시

---

## API 사용 예시 (프론트엔드)

### React/Next.js 예시
```typescript
// 데이터베이스 목록 조회
const fetchDatabases = async () => {
  const response = await fetch('/api/databases');
  const data = await response.json();
  return data.databases;
};

// 테이블 데이터 조회 (페이징)
const fetchTableData = async (dbName: string, tableName: string, page: number = 1) => {
  const response = await fetch(
    `/api/databases/${dbName}/tables/${tableName}?page=${page}&limit=50`
  );
  const data = await response.json();
  return data;
};

// 검색
const searchTable = async (
  dbName: string, 
  tableName: string, 
  searchParams: { pname?: string; pcode?: number }
) => {
  const queryString = new URLSearchParams(
    Object.entries(searchParams).filter(([_, v]) => v != null)
  ).toString();
  
  const response = await fetch(
    `/api/databases/${dbName}/tables/${tableName}/search?${queryString}`
  );
  const data = await response.json();
  return data;
};
```

---

## 에러 처리

### 공통 에러 응답 형식
```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "ERROR_CODE",
  "details": {}  // 개발 환경에서만 제공
}
```

### HTTP 상태 코드
- `200`: 성공
- `400`: 잘못된 요청 (파라미터 오류)
- `404`: 리소스를 찾을 수 없음
- `500`: 서버 내부 오류

---

## 보안 고려사항

1. **읽기 전용**: 모든 엔드포인트는 SELECT 쿼리만 허용
2. **SQL Injection 방지**: 파라미터 바인딩 사용
3. **페이징 제한**: 최대 limit 값 제한 (예: 1000)
4. **CORS 설정**: 필요시 프론트엔드 도메인만 허용
5. **Rate Limiting**: API 호출 제한 고려

---

## 성능 최적화

1. **캐싱**: 데이터베이스 목록, 테이블 목록 등 메타데이터 캐싱
2. **인덱스 활용**: 검색 쿼리에서 인덱스 사용
3. **페이징**: 대용량 데이터는 반드시 페이징 처리
4. **컬럼 선택**: 필요한 컬럼만 조회 (SELECT * 지양)
