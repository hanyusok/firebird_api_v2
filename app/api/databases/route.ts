import { NextResponse } from 'next/server';
import { getDatabaseFiles } from '@/lib/firebird';
import path from 'path';

/**
 * GET /api/databases
 * 사용 가능한 데이터베이스 목록 조회
 */
export async function GET() {
  try {
    const dbFiles = getDatabaseFiles();
    const databases = dbFiles.map((dbPath) => {
      const fileName = path.basename(dbPath);
      const dbName = path.basename(dbPath, path.extname(dbPath));
      return {
        name: dbName,
        fileName,
        path: dbPath,
      };
    });

    return NextResponse.json({
      success: true,
      count: databases.length,
      databases,
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}

