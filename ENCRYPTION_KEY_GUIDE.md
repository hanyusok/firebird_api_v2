# 암호화 키 찾기 가이드

## 현재 상황 요약

✅ **확인 완료:**
- PERSON 테이블의 PIDNUM은 AES 블록 암호화로 암호화됨 (16 bytes, 엔트로피 7.90)
- 암호화 방식: AES-128/192/256 중 하나 (ECB 모드 가능성 높음)
- 결정적 암호화: 같은 주민번호는 항상 같은 암호화 값
- 현재 프로젝트는 읽기 전용 API 서버 (암호화 로직 없음)

❌ **확인 필요:**
- 원본 애플리케이션 소스 코드 위치
- 원본 애플리케이션의 암호화 키
- 암호화 알고리즘 및 모드 정확한 정보

## 원본 암호화 키를 찾을 수 있는 위치

### 1. 원본 애플리케이션 소스 코드
원본 애플리케이션이 PIDNUM을 암호화하는 코드가 있을 것입니다.

**확인할 위치:**
- 원본 애플리케이션의 소스 코드 디렉토리
- 암호화 관련 유틸리티 클래스/함수
- 설정 파일 또는 상수 정의 파일

**검색 키워드:**
- `encrypt`, `decrypt`, `cipher`, `AES`, `crypto`
- `PIDNUM`, `주민번호`, `암호화`
- `key`, `secret`, `password`

### 2. 환경 변수 파일
원본 애플리케이션의 `.env`, `.properties`, `config.ini` 등의 설정 파일

**확인할 위치:**
- 원본 애플리케이션 디렉토리의 설정 파일
- 시스템 환경 변수
- 애플리케이션 서버 설정 파일

### 3. 데이터베이스 설정 테이블
Firebird 데이터베이스 내부에 설정 테이블이 있을 수 있습니다.

**확인할 쿼리:**
```sql
-- 설정 테이블 검색
SELECT * FROM RDB$RELATIONS 
WHERE RDB$RELATION_NAME LIKE '%CONFIG%' 
   OR RDB$RELATION_NAME LIKE '%SETTING%'
   OR RDB$RELATION_NAME LIKE '%KEY%';

-- 시스템 테이블에서 암호화 관련 정보 검색
SELECT * FROM RDB$RELATIONS 
WHERE RDB$RELATION_NAME LIKE '%ENCRYPT%' 
   OR RDB$RELATION_NAME LIKE '%SECRET%';
```

### 4. 원본 애플리케이션 실행 파일
컴파일된 실행 파일이나 라이브러리 내부에 하드코딩된 키가 있을 수 있습니다.

**확인 방법:**
- 실행 파일을 문자열 검색 도구로 분석
- 디컴파일러 사용 (Java, .NET 등인 경우)

### 5. 문서화된 키
프로젝트 문서, README, 또는 개발자 노트에 키가 기록되어 있을 수 있습니다.

### 6. 키 관리 시스템
- 환경 변수로 관리되는 경우
- 키 관리 서비스 (AWS KMS, HashiCorp Vault 등)
- 애플리케이션 서버의 JNDI 또는 설정

## 현재 프로젝트에서 확인한 사항

✅ **확인 완료:**
- `.env` 파일 존재 (Firebird 연결 정보만 포함)
- 현재 프로젝트는 읽기 전용 API 서버
- 암호화 로직은 원본 애플리케이션에 있음

❌ **확인 필요:**
- 원본 애플리케이션 소스 코드 위치
- 원본 애플리케이션의 설정 파일
- 데이터베이스 내부 설정 테이블

## 데이터베이스 검색 결과

✅ **발견된 테이블:**
- `DRUGKEY`: 약물 관련 키 (PIDNUM 암호화와 무관)
- 설정/키 관련 테이블: 없음
- 암호화 관련 프로시저: 없음

## 다음 단계

### 1. 원본 애플리케이션 소스 코드 찾기

**확인된 위치:**
- `/home/han/medical-soap-app`: SOAP 노트 생성기 (암호화 무관)

**추가 검색 필요:**
```bash
# 다른 위치 검색
find /home/han -maxdepth 3 -type d -name "*mts*" -o -name "*clinic*" -o -name "*hospital*"
find /home/han -name "*.exe" -o -name "*.jar" -o -name "*.dll" | grep -i mts
```

### 2. 원본 애플리케이션 개발자/관리자에게 문의

**질문할 사항:**
1. PIDNUM 암호화에 사용된 알고리즘 (AES-128/192/256?)
2. 암호화 모드 (ECB/CBC/CTR?)
3. 암호화 키 위치 및 형식
4. 키 생성 방식 (고정 키? 주민번호 기반? 시스템 키?)
5. 원본 애플리케이션 소스 코드 위치

### 3. 일반적인 암호화 키 위치

**애플리케이션 설정 파일:**
- `app.config`, `web.config` (ASP.NET)
- `application.properties`, `application.yml` (Spring/Java)
- `.env`, `config.ini` (일반)
- Windows Registry
- 시스템 환경 변수

**코드 내부:**
- 상수로 정의된 키
- 하드코딩된 키 (보안상 권장되지 않음)
- 키 관리 서비스 (AWS KMS, Azure Key Vault 등)

### 4. 키 복구가 불가능한 경우

만약 원본 키를 찾을 수 없다면:
- **새로운 암호화 시스템 구축**: 기존 데이터는 그대로 두고, 새로운 데이터만 새 키로 암호화
- **데이터 마이그레이션**: MASTERAUX 테이블의 일반 주민번호를 참조하여 재암호화
- **복호화 없이 사용**: 암호화된 값 그대로 사용 (검색은 PCODE나 PNAME으로)

