import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseFiles } from '@/lib/firebird';
import path from 'path';

/**
 * GET /api/databases/[dbName]/tables/[tableName]/schema
 * 특정 테이블의 스키마 정보 조회
 */
export async function GET(
  request: Request,
  { params }: { params: { dbName: string; tableName: string } }
) {
  try {
    const { dbName, tableName } = params;

    const dbFiles = getDatabaseFiles();
    const dbFile = dbFiles.find(
      (f) => path.basename(f, path.extname(f)).toLowerCase() === dbName.toLowerCase()
    );

    if (!dbFile) {
      return NextResponse.json(
        {
          success: false,
          error: `데이터베이스 '${dbName}'를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 컬럼 정보 조회
    const columnsQuery = `
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

    const columnsResult = await executeQuery(
      { database: dbFile },
      columnsQuery,
      [tableName]
    );

    // Primary Key 조회
    const pkQuery = `
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

    const pkResult = await executeQuery<{ RDB$FIELD_NAME: string }>(
      { database: dbFile },
      pkQuery,
      [tableName, tableName]
    );

    // Foreign Key 조회
    const fkQuery = `
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

    const fkResult = await executeQuery(
      { database: dbFile },
      fkQuery,
      [tableName]
    );

    // 컬럼 정보 포맷팅
    const columns = columnsResult.map((row: any) => {
      const fieldName = row.RDB$FIELD_NAME?.toString().trim();
      const fieldType = row.RDB$FIELD_TYPE;
      const fieldSubType = row.RDB$FIELD_SUB_TYPE;
      const fieldLength = row.RDB$FIELD_LENGTH;
      const nullable = !row.RDB$NULL_FLAG;
      const defaultValue = row.RDB$DEFAULT_SOURCE?.toString().trim() || null;

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
      };
    });

    const primaryKeys = pkResult.map((row) => row.RDB$FIELD_NAME?.toString().trim());

    const foreignKeys = fkResult.map((row: any) => ({
      name: row.RDB$CONSTRAINT_NAME?.toString().trim(),
      column: row.RDB$FIELD_NAME?.toString().trim(),
      referencedTable: row.REFERENCED_TABLE?.toString().trim(),
      referencedColumn: row.REFERENCED_FIELD?.toString().trim(),
    }));

    return NextResponse.json({
      success: true,
      database: dbName,
      table: tableName,
      schema: {
        columns,
        primaryKeys,
        foreignKeys,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

