import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseFiles } from '@/lib/firebird';
import path from 'path';

/**
 * GET /api/databases/[dbName]/tables
 * 특정 데이터베이스의 테이블 목록 조회
 */
export async function GET(
  request: Request,
  { params }: { params: { dbName: string } }
) {
  try {
    const { dbName } = params;
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
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    const query = `
      SELECT RDB$RELATION_NAME AS TABLE_NAME
      FROM RDB$RELATIONS
      WHERE RDB$SYSTEM_FLAG = 0
      AND RDB$RELATION_TYPE = 0
      ORDER BY RDB$RELATION_NAME
    `;

    const result = await executeQuery<{ TABLE_NAME: string }>(
      { database: dbFile },
      query
    );

    const tables = result.map((row) => {
      const tableName = row.TABLE_NAME?.toString().trim();
      return {
        name: tableName,
        url: `/api/databases/${dbName}/tables/${tableName}`,
      };
    });

    return NextResponse.json({
      success: true,
      database: dbName,
      count: tables.length,
      tables,
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error: any) {
    console.error('Tables API 오류:', {
      dbName,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || '알 수 없는 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}

