import * as firebird from 'node-firebird';
import path from 'path';
import fs from 'fs';
import { getFirebirdOptions } from '../lib/firebird';

/**
 * Firebird 데이터베이스 연결 테스트
 */
async function testConnection(dbPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 파일 존재 확인
    if (!fs.existsSync(dbPath)) {
      reject(new Error(`데이터베이스 파일을 찾을 수 없습니다: ${dbPath}`));
      return;
    }

    const options = getFirebirdOptions({
      database: dbPath,
    });

    console.log('='.repeat(60));
    console.log('Firebird 연결 테스트');
    console.log('='.repeat(60));
    console.log(`데이터베이스 경로: ${options.database}`);
    console.log(`호스트: ${options.host}`);
    console.log(`포트: ${options.port}`);
    console.log(`사용자: ${options.user}`);
    console.log('-'.repeat(60));

    firebird.attach(options, (err, db) => {
      if (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('❌ 연결 실패!');
        console.error(`오류: ${errorMsg}`);
        reject(err);
        return;
      }

      console.log('✅ 연결 성공!');
      console.log('-'.repeat(60));

      // 간단한 쿼리 실행 테스트
      db.query('SELECT COUNT(*) as TABLE_COUNT FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0', [], (queryErr, result) => {
        if (queryErr) {
          console.error('❌ 쿼리 실행 실패!');
          console.error(`오류: ${queryErr.message || queryErr}`);
          db.detach();
          reject(queryErr);
          return;
        }

        const tableCount = result[0]?.TABLE_COUNT || 0;
        console.log(`📊 사용자 테이블 수: ${tableCount}`);
        console.log('='.repeat(60));
        console.log('✅ 연결 및 쿼리 테스트 완료!');
        console.log('='.repeat(60));

        db.detach();
        resolve();
      });
    });
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  const dbPath = process.env.FIREBIRD_DATABASE_PATH || path.join(__dirname, '../db');

  // 디렉토리인 경우 첫 번째 .fdb 파일 찾기
  let testDbPath: string;

  if (fs.statSync(dbPath).isDirectory()) {
    const files = fs.readdirSync(dbPath)
      .filter(file => file.toLowerCase().endsWith('.fdb'))
      .map(file => path.join(dbPath, file));

    if (files.length === 0) {
      console.error(`❌ ${dbPath} 디렉토리에 .fdb 파일을 찾을 수 없습니다.`);
      process.exit(1);
    }

    testDbPath = files[0];
    console.log(`📁 디렉토리에서 첫 번째 데이터베이스 파일 선택: ${path.basename(testDbPath)}\n`);
  } else {
    testDbPath = dbPath;
  }

  try {
    await testConnection(testDbPath);
  } catch (error: any) {
    console.error('\n❌ 테스트 실패:', error.message || error);
    process.exit(1);
  }
}

main().catch(console.error);

