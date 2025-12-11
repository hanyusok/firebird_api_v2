import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseFiles } from '@/lib/firebird';
import path from 'path';

/**
 * GET /api/databases/[dbName]/tables/[tableName]/search
 * 특정 테이블에서 조건으로 검색 (PCODE, PNAME, PBIRTH)
 */
export async function GET(
  request: Request,
  { params }: { params: { dbName: string; tableName: string } }
) {
  try {
    const { dbName, tableName } = params;
    const { searchParams } = new URL(request.url);
    
    // 검색 조건 파라미터
    const pcode = searchParams.get('pcode');
    const pname = searchParams.get('pname');
    const pbirth = searchParams.get('pbirth');
    
    // 페이징 파라미터
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
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
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
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    // WHERE 조건 구성
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (pcode) {
      // PCODE는 숫자이므로 정확 일치 또는 부분 일치 지원
      if (pcode.includes('%') || pcode.includes('*')) {
        // 와일드카드가 있으면 LIKE 검색 (문자열로 변환)
        const pattern = pcode.replace(/\*/g, '%');
        conditions.push(`CAST(PCODE AS VARCHAR(20)) LIKE ?`);
        queryParams.push(pattern);
      } else {
        // 정확 일치
        conditions.push(`PCODE = ?`);
        queryParams.push(parseInt(pcode));
      }
    }

    if (pname) {
      // PNAME은 문자열이므로 LIKE 검색
      const pattern = pname.includes('%') || pname.includes('*') 
        ? pname.replace(/\*/g, '%')
        : `%${pname}%`;
      conditions.push(`PNAME LIKE ?`);
      queryParams.push(pattern);
    }

    if (pbirth) {
      // PBIRTH는 날짜이므로 정확 일치
      // 날짜 형식: YYYY-MM-DD
      conditions.push(`PBIRTH = ?`);
      queryParams.push(pbirth);
    }

    // 검색 조건이 없으면 에러 반환
    if (conditions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '검색 조건이 필요합니다. (pcode, pname, pbirth 중 하나 이상)',
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 전체 레코드 수 조회
    const countQuery = `SELECT COUNT(*) AS TOTAL FROM "${tableName}" ${whereClause}`;
    const countResult = await executeQuery<{ TOTAL: number }>(
      { database: dbFile },
      countQuery,
      queryParams
    );
    const total = countResult[0]?.TOTAL || 0;

    // 데이터 조회 (FIRST와 SKIP은 파라미터가 아닌 직접 값으로 사용)
    const dataQuery = `SELECT FIRST ${limit} SKIP ${offset} * FROM "${tableName}" ${whereClause} ORDER BY PCODE`;
    const data = await executeQuery(
      { database: dbFile },
      dataQuery,
      queryParams
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
      search: {
        pcode: pcode || null,
        pname: pname || null,
        pbirth: pbirth || null,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      columns,
      data,
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error: any) {
    console.error('Search API 오류:', {
      dbName,
      tableName,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || '검색 중 오류가 발생했습니다.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}

