import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Firebird API Service
          </h1>
          <p className="text-xl text-gray-600">
            Firebird 데이터베이스를 위한 RESTful API 서비스
          </p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            API 엔드포인트
          </h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                GET /api/databases
              </h3>
              <p className="text-gray-600 mb-2">
                사용 가능한 모든 데이터베이스 목록 조회
              </p>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                /api/databases
              </code>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                GET /api/databases/[dbName]/tables
              </h3>
              <p className="text-gray-600 mb-2">
                특정 데이터베이스의 테이블 목록 조회
              </p>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                /api/databases/MTSDB/tables
              </code>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                GET /api/databases/[dbName]/tables/[tableName]
              </h3>
              <p className="text-gray-600 mb-2">
                특정 테이블의 데이터 조회 (페이징 지원)
              </p>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                /api/databases/MTSDB/tables/TABLE_NAME?page=1&limit=100
              </code>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                GET /api/databases/[dbName]/tables/[tableName]/schema
              </h3>
              <p className="text-gray-600 mb-2">
                특정 테이블의 스키마 정보 조회
              </p>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                /api/databases/MTSDB/tables/TABLE_NAME/schema
              </code>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">
                POST /api/databases/[dbName]/query
              </h3>
              <p className="text-gray-600 mb-2">
                사용자 정의 SELECT 쿼리 실행
              </p>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded block mt-2">
                POST /api/databases/MTSDB/query
                <br />
                Body: {`{ "query": "SELECT * FROM TABLE_NAME", "params": [] }`}
              </code>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            빠른 시작
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>환경 변수 설정 (.env 파일 생성)</li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">
                npm install
              </code>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code>
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">
                npm run analyze
              </code>{' '}
              (데이터베이스 스키마 분석)
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

