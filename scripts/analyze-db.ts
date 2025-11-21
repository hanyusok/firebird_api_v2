import * as firebird from 'node-firebird';
import path from 'path';
import fs from 'fs';
import { getFirebirdOptions, getDatabaseFiles } from '../lib/firebird';

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  position: number;
}

interface ForeignKeyInfo {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

/**
 * 테이블 목록 가져오기
 */
async function getTables(db: firebird.Database): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT RDB$RELATION_NAME
      FROM RDB$RELATIONS
      WHERE RDB$SYSTEM_FLAG = 0
      AND RDB$RELATION_TYPE = 0
      ORDER BY RDB$RELATION_NAME
    `;

    db.query(query, [], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const tables = result.map((row: any) => {
        const name = row.RDB$RELATION_NAME?.toString().trim();
        return name;
      }).filter(Boolean);

      resolve(tables);
    });
  });
}

/**
 * 테이블의 컬럼 정보 가져오기
 */
async function getColumns(
  db: firebird.Database,
  tableName: string
): Promise<ColumnInfo[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        RF.RDB$FIELD_NAME,
        F.RDB$FIELD_TYPE,
        F.RDB$FIELD_SUB_TYPE,
        F.RDB$FIELD_LENGTH,
        RF.RDB$NULL_FLAG,
        RF.RDB$DEFAULT_SOURCE,
        RF.RDB$FIELD_POSITION
      FROM RDB$RELATION_FIELDS RF
      JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
      WHERE RF.RDB$RELATION_NAME = ?
      ORDER BY RF.RDB$FIELD_POSITION
    `;

    db.query(query, [tableName], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const columns: ColumnInfo[] = result.map((row: any) => {
        const fieldName = row.RDB$FIELD_NAME?.toString().trim();
        const fieldType = row.RDB$FIELD_TYPE;
        const fieldSubType = row.RDB$FIELD_SUB_TYPE;
        const fieldLength = row.RDB$FIELD_LENGTH;
        const nullable = !row.RDB$NULL_FLAG;
        const defaultValue = row.RDB$DEFAULT_SOURCE?.toString().trim() || null;
        const position = row.RDB$FIELD_POSITION || 0;

        // Firebird 타입 매핑
        let type = 'UNKNOWN';
        if (fieldType === 7) {
          type = fieldSubType === 1 ? 'SMALLINT' : 'INTEGER';
        } else if (fieldType === 8) {
          type = fieldSubType === 1 ? 'INTEGER' : 'BIGINT';
        } else if (fieldType === 10) {
          type = 'FLOAT';
        } else if (fieldType === 27) {
          type = 'DOUBLE PRECISION';
        } else if (fieldType === 12) {
          type = 'DATE';
        } else if (fieldType === 13) {
          type = 'TIME';
        } else if (fieldType === 35) {
          type = 'TIMESTAMP';
        } else if (fieldType === 37) {
          type = `VARCHAR(${fieldLength})`;
        } else if (fieldType === 261) {
          type = 'BLOB';
        } else if (fieldType === 14) {
          type = `CHAR(${fieldLength})`;
        }

        return {
          name: fieldName,
          type,
          nullable,
          defaultValue,
          position,
        };
      });

      resolve(columns);
    });
  });
}

/**
 * 테이블의 Primary Key 가져오기
 */
async function getPrimaryKeys(
  db: firebird.Database,
  tableName: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT S.RDB$FIELD_NAME
      FROM RDB$INDEX_SEGMENTS S
      JOIN RDB$INDICES I ON S.RDB$INDEX_NAME = I.RDB$INDEX_NAME
      WHERE I.RDB$RELATION_NAME = ?
      AND I.RDB$UNIQUE_FLAG = 1
      AND I.RDB$INDEX_NAME IN (
        SELECT RDB$INDEX_NAME
        FROM RDB$RELATION_CONSTRAINTS
        WHERE RDB$RELATION_NAME = ?
        AND RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
      )
      ORDER BY S.RDB$FIELD_POSITION
    `;

    db.query(query, [tableName, tableName], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const keys = result.map((row: any) => {
        return row.RDB$FIELD_NAME?.toString().trim();
      }).filter(Boolean);

      resolve(keys);
    });
  });
}

/**
 * 테이블의 Foreign Key 가져오기
 */
async function getForeignKeys(
  db: firebird.Database,
  tableName: string
): Promise<ForeignKeyInfo[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        RC.RDB$CONSTRAINT_NAME,
        ISEG.RDB$FIELD_NAME,
        RC2.RDB$RELATION_NAME AS REFERENCED_TABLE,
        ISEG2.RDB$FIELD_NAME AS REFERENCED_FIELD
      FROM RDB$RELATION_CONSTRAINTS RC
      JOIN RDB$INDEX_SEGMENTS ISEG ON RC.RDB$INDEX_NAME = ISEG.RDB$INDEX_NAME
      JOIN RDB$REF_CONSTRAINTS REFC ON RC.RDB$CONSTRAINT_NAME = REFC.RDB$CONSTRAINT_NAME
      JOIN RDB$RELATION_CONSTRAINTS RC2 ON REFC.RDB$CONST_NAME_UQ = RC2.RDB$CONSTRAINT_NAME
      JOIN RDB$INDEX_SEGMENTS ISEG2 ON RC2.RDB$INDEX_NAME = ISEG2.RDB$INDEX_NAME
      WHERE RC.RDB$RELATION_NAME = ?
      AND RC.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND ISEG.RDB$FIELD_POSITION = ISEG2.RDB$FIELD_POSITION
      ORDER BY RC.RDB$CONSTRAINT_NAME, ISEG.RDB$FIELD_POSITION
    `;

    db.query(query, [tableName], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const foreignKeys: ForeignKeyInfo[] = result.map((row: any) => {
        return {
          name: row.RDB$CONSTRAINT_NAME?.toString().trim(),
          column: row.RDB$FIELD_NAME?.toString().trim(),
          referencedTable: row.REFERENCED_TABLE?.toString().trim(),
          referencedColumn: row.REFERENCED_FIELD?.toString().trim(),
        };
      });

      resolve(foreignKeys);
    });
  });
}

/**
 * 테이블의 인덱스 가져오기
 */
async function getIndexes(
  db: firebird.Database,
  tableName: string
): Promise<IndexInfo[]> {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        I.RDB$INDEX_NAME,
        I.RDB$UNIQUE_FLAG,
        S.RDB$FIELD_NAME
      FROM RDB$INDICES I
      JOIN RDB$INDEX_SEGMENTS S ON I.RDB$INDEX_NAME = S.RDB$INDEX_NAME
      WHERE I.RDB$RELATION_NAME = ?
      AND I.RDB$INDEX_NAME NOT IN (
        SELECT RDB$INDEX_NAME
        FROM RDB$RELATION_CONSTRAINTS
        WHERE RDB$RELATION_NAME = ?
      )
      ORDER BY I.RDB$INDEX_NAME, S.RDB$FIELD_POSITION
    `;

    db.query(query, [tableName, tableName], (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const indexMap = new Map<string, IndexInfo>();

      result.forEach((row: any) => {
        const indexName = row.RDB$INDEX_NAME?.toString().trim();
        const fieldName = row.RDB$FIELD_NAME?.toString().trim();
        const unique = row.RDB$UNIQUE_FLAG === 1;

        if (!indexMap.has(indexName)) {
          indexMap.set(indexName, {
            name: indexName,
            columns: [],
            unique,
          });
        }

        indexMap.get(indexName)!.columns.push(fieldName);
      });

      resolve(Array.from(indexMap.values()));
    });
  });
}

/**
 * 데이터베이스 분석
 */
async function analyzeDatabase(dbPath: string): Promise<TableInfo[]> {
  return new Promise((resolve, reject) => {
    // 파일 존재 확인
    if (!fs.existsSync(dbPath)) {
      reject(new Error(`데이터베이스 파일을 찾을 수 없습니다: ${dbPath}`));
      return;
    }

    const options = getFirebirdOptions({
      database: dbPath,
    });

    console.log(`    연결 시도 중...`);
    console.log(`    데이터베이스 경로: ${options.database}`);
    console.log(`    사용자: ${options.user}`);

    firebird.attach(options, async (err, db) => {
      if (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        // 버전 호환성 오류 감지
        if (errorMsg.includes('unsupported on-disk structure') || errorMsg.includes('found') && errorMsg.includes('support')) {
          reject(new Error(`Firebird 버전 호환성 문제: ${errorMsg}\n해결 방법: TROUBLESHOOTING.md 파일을 참고하세요.`));
        } else {
          reject(new Error(`데이터베이스 연결 실패: ${errorMsg}`));
        }
        return;
      }

      try {
        const tables = await getTables(db);
        const tableInfos: TableInfo[] = [];

        for (const table of tables) {
          try {
            const [columns, primaryKeys, foreignKeys, indexes] = await Promise.all([
              getColumns(db, table),
              getPrimaryKeys(db, table),
              getForeignKeys(db, table),
              getIndexes(db, table),
            ]);

            tableInfos.push({
              tableName: table,
              columns,
              primaryKeys,
              foreignKeys,
              indexes,
            });
          } catch (tableError: any) {
            console.error(`    테이블 ${table} 분석 중 오류: ${tableError.message || tableError}`);
            // 개별 테이블 오류는 무시하고 계속 진행
          }
        }

        db.detach();
        resolve(tableInfos);
      } catch (error: any) {
        db.detach();
        reject(new Error(`데이터베이스 분석 중 오류: ${error.message || error}`));
      }
    });
  });
}

/**
 * 메인 실행 함수
 */
async function main() {
  const dbFiles = getDatabaseFiles();

  if (dbFiles.length === 0) {
    console.log('데이터베이스 파일을 찾을 수 없습니다.');
    return;
  }

  console.log(`발견된 데이터베이스 파일: ${dbFiles.length}개\n`);

  const outputDir = path.join(process.cwd(), 'db-schema');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const dbFile of dbFiles) {
    const dbName = path.basename(dbFile, path.extname(dbFile));
    console.log(`분석 중: ${dbName}...`);

    try {
      const schema = await analyzeDatabase(dbFile);
      const outputPath = path.join(outputDir, `${dbName}.json`);

      fs.writeFileSync(
        outputPath,
        JSON.stringify(schema, null, 2),
        'utf-8'
      );

      console.log(`  ✓ 완료: ${outputPath}`);
      console.log(`  테이블 수: ${schema.length}`);
    } catch (error: any) {
      console.error(`  ✗ 오류 발생:`);
      if (error instanceof AggregateError) {
        console.error(`    AggregateError: ${error.message}`);
        if (error.errors && error.errors.length > 0) {
          error.errors.forEach((err: any, index: number) => {
            console.error(`    Error ${index + 1}: ${err.message || err}`);
            if (err.stack) {
              console.error(`      Stack: ${err.stack.split('\n')[0]}`);
            }
          });
        }
      } else {
        console.error(`    메시지: ${error.message || error}`);
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(0, 3);
          stackLines.forEach((line: string) => {
            console.error(`    ${line}`);
          });
        }
      }
      console.error(`    데이터베이스 경로: ${dbFile}`);
    }

    console.log('');
  }

  console.log('모든 데이터베이스 분석이 완료되었습니다.');
}

main().catch(console.error);

