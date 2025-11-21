import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseFiles } from '@/lib/firebird';
import path from 'path';

/**
 * POST /api/databases/[dbName]/query
 * 사용자 정의 쿼리 실행 (읽기 전용)
 */
export async function POST(
  request: Request,
  { params }: { params: { dbName: string } }
) {
  try {
    const { dbName } = params;
    const body = await request.json();
    const { query, params: queryParams = [] } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: '쿼리가 필요합니다.',
        },
        { status: 400 }
      );
    }

    // SELECT 쿼리만 허용 (보안상)
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return NextResponse.json(
        {
          success: false,
          error: 'SELECT 쿼리만 허용됩니다.',
        },
        { status: 400 }
      );
    }

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

    const result = await executeQuery({ database: dbFile }, query, queryParams);

    return NextResponse.json({
      success: true,
      database: dbName,
      query,
      count: result.length,
      data: result,
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

