import { NextResponse } from 'next/server';
import { executeQuery, getDatabaseFiles } from '@/lib/firebird';
import path from 'path';
import iconv from 'iconv-lite';

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
    const directConditions: string[] = []; // 인코딩이 필요한 조건 (직접 쿼리에 포함)

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
      
      // PERSON 테이블에서 한글이 정상적으로 읽히는 것은 결과를 읽을 때입니다.
      // 하지만 파라미터 바인딩에서는 node-firebird가 charset 변환을 자동 처리하지 않을 수 있음
      // 따라서 UTF-8을 EUC-KR Buffer로 변환하여 전달
      try {
        const eucKrBuffer = iconv.encode(pattern, 'euc-kr');
        // Buffer를 파라미터로 전달 (node-firebird가 처리)
        conditions.push(`PNAME LIKE ?`);
        queryParams.push(eucKrBuffer);
        
        console.log('한글 검색 파라미터 (EUC-KR Buffer):', {
          pattern,
          bufferLength: eucKrBuffer.length,
          bufferHex: eucKrBuffer.toString('hex').toUpperCase()
        });
      } catch (e) {
        // 인코딩 실패 시 원본 문자열 사용 (fallback)
        console.warn('한글 인코딩 변환 실패, 원본 문자열 사용:', e);
        conditions.push(`PNAME LIKE ?`);
        queryParams.push(pattern);
      }
    }

    if (pbirth) {
      // PBIRTH는 날짜이므로 정확 일치
      // 날짜 형식: YYYY-MM-DD
      conditions.push(`PBIRTH = ?`);
      queryParams.push(pbirth);
    }

    // 검색 조건이 없으면 에러 반환 (directConditions와 conditions 모두 확인)
    if (directConditions.length === 0 && conditions.length === 0) {
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

    // 직접 조건과 파라미터 조건 결합
    const allConditions = [...directConditions, ...conditions];
    const whereClause = allConditions.length > 0 ? `WHERE ${allConditions.join(' AND ')}` : '';

    // 디버깅: 최종 쿼리 로그
    console.log('검색 쿼리:', {
      whereClause,
      queryParams: queryParams.length,
      directConditions: directConditions.length,
      conditions: conditions.length,
      paramTypes: queryParams.map(p => typeof p === 'object' && Buffer.isBuffer(p) ? 'Buffer' : typeof p)
    });

    // 전체 레코드 수 조회
    const countQuery = `SELECT COUNT(*) AS TOTAL FROM "${tableName}" ${whereClause}`;
    
    // directConditions를 사용할 때는 queryParams가 비어있어야 함
    const finalQueryParams = directConditions.length > 0 ? [] : queryParams;
    
    console.log('COUNT 쿼리 실행:', { countQuery, paramsCount: finalQueryParams.length });
    
    const countResult = await executeQuery<{ TOTAL: number }>(
      { database: dbFile },
      countQuery,
      finalQueryParams
    );
    const total = countResult[0]?.TOTAL || 0;

    // 데이터 조회 (FIRST와 SKIP은 파라미터가 아닌 직접 값으로 사용)
    const dataQuery = `SELECT FIRST ${limit} SKIP ${offset} * FROM "${tableName}" ${whereClause} ORDER BY PCODE`;
    
    console.log('DATA 쿼리 실행:', { dataQuery, paramsCount: finalQueryParams.length });
    
    const data = await executeQuery(
      { database: dbFile },
      dataQuery,
      finalQueryParams
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
    const { dbName, tableName } = params;
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

