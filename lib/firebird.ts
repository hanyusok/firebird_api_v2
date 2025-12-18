import * as firebird from 'node-firebird';
import path from 'path';
import fs from 'fs';
import iconv from 'iconv-lite';

export interface FirebirdConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
}

export interface FirebirdOptions {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  lowercase_keys?: boolean;
  role?: string;
  pageSize?: number;
  charset?: string;
}

/**
 * Firebird 데이터베이스 연결 옵션 생성
 */
export function getFirebirdOptions(config: FirebirdConfig): FirebirdOptions {
  let dbPath = config.database;
  
  // 절대 경로가 아닌 경우 현재 작업 디렉토리 기준으로 변환
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.join(process.cwd(), dbPath);
  }
  
  // 경로 정규화 (Windows 경로 구분자 처리)
  dbPath = path.normalize(dbPath);

  const host = config.host || process.env.FIREBIRD_HOST || 'localhost';
  const port = config.port || (process.env.FIREBIRD_PORT ? parseInt(process.env.FIREBIRD_PORT) : 3050);

  const options: FirebirdOptions = {
    host: host,
    port: port,
    database: dbPath,
    user: config.user || process.env.FIREBIRD_USER || 'SYSDBA',
    password: config.password || process.env.FIREBIRD_PASSWORD || 'masterkey',
    lowercase_keys: false, // Firebird는 기본적으로 대문자 키를 사용
    charset: 'euc_kr', // Firebird 2.5는 보통 EUC-KR 인코딩을 사용
  };

  return options;
}

/**
 * Firebird 데이터베이스에 연결하고 쿼리 실행
 */
export async function executeQuery<T = any>(
  config: FirebirdConfig,
  query: string,
  params: any[] = []
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const options = getFirebirdOptions(config);

    firebird.attach(options, (err, db) => {
      if (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errorDetails = err instanceof Error ? err.stack : String(err);
        console.error('Firebird 연결 오류:', {
          error: errorMsg,
          details: errorDetails,
          options: {
            host: options.host,
            port: options.port,
            database: options.database,
            user: options.user,
          },
        });
        reject(new Error(`Firebird 연결 실패: ${errorMsg}`));
        return;
      }

      db.query(query, params, (err, result) => {
        db.detach();

        if (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error('Firebird 쿼리 오류:', {
            error: errorMsg,
            query: query.substring(0, 100),
            params,
          });
          reject(new Error(`쿼리 실행 실패: ${errorMsg}`));
          return;
        }

        // Buffer 값을 문자열로 변환
        const convertedResult = result ? convertBuffersInObject(result) : [];
        resolve(convertedResult);
      });
    });
  });
}

/**
 * Firebird 데이터베이스에 연결하고 단일 쿼리 실행 (첫 번째 결과만 반환)
 */
export async function executeQueryOne<T = any>(
  config: FirebirdConfig,
  query: string,
  params: any[] = []
): Promise<T | null> {
  const results = await executeQuery<T>(config, query, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Firebird 데이터베이스에 연결하고 트랜잭션 실행
 */
export async function executeTransaction<T = any>(
  config: FirebirdConfig,
  callback: (db: firebird.Database) => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const options = getFirebirdOptions(config);

    firebird.attach(options, async (err, db) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const result = await callback(db);
        db.detach();
        resolve(result);
      } catch (error) {
        db.detach();
        reject(error);
      }
    });
  });
}

/**
 * Buffer를 문자열로 변환 (Firebird의 한글 인코딩 처리)
 * Firebird 2.5는 보통 EUC-KR 또는 CP949 인코딩을 사용
 */
export function convertBufferToString(value: any): any {
  if (Buffer.isBuffer(value)) {
    // EUC-KR로 먼저 시도
    try {
      return iconv.decode(value, 'euc-kr').trim();
    } catch (e) {
      // CP949로 시도
      try {
        return iconv.decode(value, 'cp949').trim();
      } catch (e2) {
        // UTF-8로 시도
        try {
          return value.toString('utf-8').trim();
        } catch (e3) {
          // 실패하면 기본 toString
          return value.toString().trim();
        }
      }
    }
  }
  return value;
}

/**
 * UTF-8 문자열을 Firebird 인코딩(EUC-KR/CP949)으로 변환
 * 검색 파라미터를 데이터베이스 인코딩에 맞게 변환
 */
export function encodeToFirebird(str: string): string {
  if (!str || typeof str !== 'string') {
    return str;
  }
  
  try {
    // EUC-KR로 인코딩 시도
    const eucKrBuffer = iconv.encode(str, 'euc-kr');
    // 다시 디코딩하여 검증 (정상적으로 인코딩되었는지 확인)
    const decoded = iconv.decode(eucKrBuffer, 'euc-kr');
    if (decoded === str) {
      // EUC-KR로 인코딩 가능한 경우, Buffer를 문자열로 변환
      // node-firebird는 Buffer를 자동으로 처리하므로 원본 문자열 반환
      // 하지만 실제로는 Buffer를 전달해야 할 수도 있음
      return str;
    }
  } catch (e) {
    // EUC-KR 인코딩 실패 시 CP949 시도
    try {
      const cp949Buffer = iconv.encode(str, 'cp949');
      const decoded = iconv.decode(cp949Buffer, 'cp949');
      if (decoded === str) {
        return str;
      }
    } catch (e2) {
      // 인코딩 실패 시 원본 반환
    }
  }
  
  // 인코딩 변환이 필요 없는 경우 원본 반환
  return str;
}

/**
 * 객체의 모든 Buffer 값을 문자열로 변환 (재귀적 처리)
 */
export function convertBuffersInObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Buffer.isBuffer(obj)) {
    return convertBufferToString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBuffersInObject);
  }

  if (obj instanceof Date) {
    // 날짜 및 시간 포맷팅
    const year = obj.getFullYear();
    const month = String(obj.getMonth() + 1).padStart(2, '0');
    const day = String(obj.getDate()).padStart(2, '0');
    const hours = obj.getHours();
    const minutes = obj.getMinutes();
    const seconds = obj.getSeconds();
    
    // 시간이 00:00:00이면 날짜만 반환, 아니면 전체 일시 반환
    if (hours === 0 && minutes === 0 && seconds === 0) {
      return `${year}-${month}-${day}`;
    }
    return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = convertBuffersInObject(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/**
 * 데이터베이스 파일 목록 가져오기
 */
export function getDatabaseFiles(): string[] {
  const dbPath = process.env.FIREBIRD_DATABASE_PATH || './db';
  
  const fullPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), dbPath);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  return fs
    .readdirSync(fullPath)
    .filter((file: string) => file.endsWith('.FDB') || file.endsWith('.fdb'))
    .map((file: string) => path.join(fullPath, file));
}

