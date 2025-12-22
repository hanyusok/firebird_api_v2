import { executeQuery, getDatabaseFiles } from '../lib/firebird';

async function findEncryptionKey() {
  const dbFiles = getDatabaseFiles();
  const dbFile = dbFiles.find(f => f.toLowerCase().includes('mtsdb'));
  
  if (!dbFile) {
    console.error('MTSDB not found');
    return;
  }

  console.log('=== 암호화 키 찾기: 데이터베이스 내부 검색 ===\n');

  // 1. 설정 관련 테이블 검색
  console.log('1. 설정/키 관련 테이블 검색:');
  const configTables = await executeQuery(
    { database: dbFile },
    `SELECT RDB$RELATION_NAME 
     FROM RDB$RELATIONS 
     WHERE RDB$SYSTEM_FLAG = 0
       AND (RDB$RELATION_NAME LIKE '%CONFIG%'
         OR RDB$RELATION_NAME LIKE '%SETTING%'
         OR RDB$RELATION_NAME LIKE '%KEY%'
         OR RDB$RELATION_NAME LIKE '%SECRET%'
         OR RDB$RELATION_NAME LIKE '%ENCRYPT%'
         OR RDB$RELATION_NAME LIKE '%CRYPTO%')
     ORDER BY RDB$RELATION_NAME`,
    []
  );

  if (configTables.length > 0) {
    console.log(`  발견된 테이블: ${configTables.length}개`);
    for (const row of configTables) {
      const tableName = row.RDB$RELATION_NAME?.toString().trim();
      console.log(`    - ${tableName}`);
      
      // 테이블 내용 확인
      try {
        const tableData = await executeQuery(
          { database: dbFile },
          `SELECT FIRST 5 * FROM "${tableName}"`,
          []
        );
        if (tableData.length > 0) {
          console.log(`      샘플 데이터:`, JSON.stringify(tableData[0], null, 2));
        }
      } catch (e) {
        // 무시
      }
    }
  } else {
    console.log('  설정 테이블을 찾을 수 없습니다.');
  }

  // 2. 모든 사용자 테이블 목록
  console.log('\n2. 모든 사용자 테이블 목록:');
  const allTables = await executeQuery(
    { database: dbFile },
    `SELECT RDB$RELATION_NAME 
     FROM RDB$RELATIONS 
     WHERE RDB$SYSTEM_FLAG = 0
     ORDER BY RDB$RELATION_NAME`,
    []
  );

  console.log(`  총 ${allTables.length}개의 테이블 발견`);
  console.log('  주요 테이블:');
  allTables.slice(0, 20).forEach((row: any) => {
    const tableName = row.RDB$RELATION_NAME?.toString().trim();
    console.log(`    - ${tableName}`);
  });

  // 3. PERSON 테이블의 다른 컬럼에서 키 단서 찾기
  console.log('\n3. PERSON 테이블 구조 분석:');
  const personColumns = await executeQuery(
    { database: dbFile },
    `SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE
     FROM RDB$RELATION_FIELDS RF
     JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
     WHERE RF.RDB$RELATION_NAME = 'PERSON'
     ORDER BY RF.RDB$FIELD_POSITION`,
    []
  );

  console.log('  PERSON 테이블 컬럼:');
  personColumns.forEach((row: any) => {
    const colName = row.RDB$FIELD_NAME?.toString().trim();
    console.log(`    - ${colName}`);
  });

  // 4. 암호화 관련 함수나 프로시저 검색
  console.log('\n4. 저장 프로시저/함수 검색:');
  const procedures = await executeQuery(
    { database: dbFile },
    `SELECT RDB$PROCEDURE_NAME 
     FROM RDB$PROCEDURES 
     WHERE RDB$SYSTEM_FLAG = 0
       AND (RDB$PROCEDURE_NAME LIKE '%ENCRYPT%'
         OR RDB$PROCEDURE_NAME LIKE '%DECRYPT%'
         OR RDB$PROCEDURE_NAME LIKE '%KEY%')
     ORDER BY RDB$PROCEDURE_NAME`,
    []
  );

  if (procedures.length > 0) {
    console.log(`  발견된 프로시저: ${procedures.length}개`);
    procedures.forEach((row: any) => {
      console.log(`    - ${row.RDB$PROCEDURE_NAME?.toString().trim()}`);
    });
  } else {
    console.log('  암호화 관련 프로시저를 찾을 수 없습니다.');
  }

  console.log('\n=== 검색 완료 ===');
  console.log('\n추가 확인 사항:');
  console.log('1. 원본 애플리케이션 소스 코드 확인');
  console.log('2. 원본 애플리케이션의 설정 파일 확인');
  console.log('3. 시스템 환경 변수 확인');
  console.log('4. 원본 애플리케이션 개발자/관리자에게 문의');
}

findEncryptionKey().catch(console.error);

