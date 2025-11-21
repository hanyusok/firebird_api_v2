import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseFiles } from '@/lib/firebird';
import path from 'path';

/**
 * GET /api/databases/[dbName]/tables/[tableName]
 * 특정 테이블의 데이터 조회 (페이징 지원)
 */
export async function GET(
  request: Request,
  { params }: { params: { dbName: string; tableName: string } }
) {
  try {
    const { dbName, tableName } = params;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

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

    // 테이블 존재 확인
    const tableCheckQuery = `
      SELECT COUNT(*) AS CNT
      FROM RDB$RELATIONS
      WHERE RDB$RELATION_NAME = ?
      AND RDB$SYSTEM_FLAG = 0
      AND RDB$RELATION_TYPE = 0
    `;

    const tableCheck = await executeQuery<{ CNT: number }>(
      { database: dbFile },
      tableCheckQuery,
      [tableName]
    );

    if (!tableCheck[0] || tableCheck[0].CNT === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `테이블 '${tableName}'를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 전체 레코드 수 조회
    const countQuery = `SELECT COUNT(*) AS TOTAL FROM "${tableName}"`;
    const countResult = await executeQuery<{ TOTAL: number }>(
      { database: dbFile },
      countQuery
    );
    const total = countResult[0]?.TOTAL || 0;

    // 데이터 조회
    const dataQuery = `SELECT FIRST ? SKIP ? * FROM "${tableName}"`;
    const data = await executeQuery(
      { database: dbFile },
      dataQuery,
      [limit, offset]
    );

    // 컬럼 정보 조회
    const columnsQuery = `
      SELECT RF.RDB$FIELD_NAME
      FROM RDB$RELATION_FIELDS RF
      WHERE RF.RDB$RELATION_NAME = ?
      ORDER BY RF.RDB$FIELD_POSITION
    `;
    const columnsResult = await executeQuery<{ RDB$FIELD_NAME: string }>(
      { database: dbFile },
      columnsQuery,
      [tableName]
    );
    const columns = columnsResult.map((row) =>
      row.RDB$FIELD_NAME?.toString().trim()
    );

    return NextResponse.json({
      success: true,
      database: dbName,
      table: tableName,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      columns,
      data,
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

