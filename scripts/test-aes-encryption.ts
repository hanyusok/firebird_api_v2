import { executeQuery, getDatabaseFiles } from '../lib/firebird';
import * as crypto from 'crypto';

async function testAESEncryption() {
  const dbFiles = getDatabaseFiles();
  const dbFile = dbFiles.find(f => f.toLowerCase().includes('mtsdb'));
  
  if (!dbFile) {
    console.error('MTSDB not found');
    return;
  }

  console.log('=== AES-256 및 블록 암호화 분석 ===\n');

  // 같은 PCODE의 암호화된 값과 일반 값 가져오기
  const testData = await executeQuery(
    { database: dbFile },
    `SELECT FIRST 5
      p.PCODE,
      p.PNAME AS PERSON_NAME,
      p.PIDNUM AS ENCRYPTED_PIDNUM,
      m.PIDNUM AS PLAIN_PIDNUM
    FROM "PERSON" p
    INNER JOIN "MASTERAUX" m ON p.PCODE = m.PCODE
    WHERE p.PIDNUM IS NOT NULL AND m.PIDNUM IS NOT NULL
    ORDER BY p.PCODE, m.VISIDATE`,
    []
  );

  if (testData.length === 0) {
    console.log('비교할 데이터가 없습니다.');
    return;
  }

  console.log(`테스트 데이터: ${testData.length}건\n`);

  // AES-256 특성 분석
  console.log('=== AES-256 블록 암호화 특성 ===');
  const firstRow = testData[0];
  if (firstRow) {
    const encrypted = firstRow.ENCRYPTED_PIDNUM?.toString() || '';
    const plain = firstRow.PLAIN_PIDNUM?.toString() || '';
    const decoded = Buffer.from(encrypted, 'base64');
    
    console.log(`\n암호화된 데이터 길이: ${decoded.length} bytes`);
    console.log(`일반 데이터 길이: ${plain.length} bytes`);
    console.log(`\nAES 블록 크기: 16 bytes (128 bits)`);
    console.log(`AES-256 키 크기: 32 bytes (256 bits)`);
    console.log(`AES-128 키 크기: 16 bytes (128 bits)`);
    console.log(`\n⚠️  주의: 암호화된 데이터 길이(16 bytes)만으로는 AES-128/192/256을 구분할 수 없습니다.`);
    console.log(`   모든 AES 변형은 동일한 블록 크기(16 bytes)를 사용합니다.`);
    console.log(`   키 길이만 다릅니다: AES-128(16), AES-192(24), AES-256(32)`);
    
    // 패딩 분석
    const paddingLength = decoded.length - plain.length;
    console.log(`\n패딩 분석:`);
    console.log(`  일반 데이터: ${plain.length} bytes`);
    console.log(`  암호화 데이터: ${decoded.length} bytes`);
    console.log(`  패딩: ${paddingLength} bytes`);
    
    if (decoded.length === 16 && plain.length === 13) {
      console.log(`  → PKCS#7 패딩 가능성 (13 bytes → 16 bytes, 3 bytes 패딩)`);
    }
  }
  console.log('');

  // 다양한 키 생성 방식 시도
  const keyGenerationMethods = [
    {
      name: '고정 키 (기본값)',
      keys: [
        '0123456789abcdef',
        'abcdefghijklmnop',
        '1234567890123456',
        '0000000000000000',
        'FFFFFFFFFFFFFFFF',
      ]
    },
    {
      name: 'MD5 해시 기반 키',
      keys: [
        crypto.createHash('md5').update('default').digest().slice(0, 16).toString('hex'),
        crypto.createHash('md5').update('secret').digest().slice(0, 16).toString('hex'),
        crypto.createHash('md5').update('key').digest().slice(0, 16).toString('hex'),
        crypto.createHash('md5').update('password').digest().slice(0, 16).toString('hex'),
      ]
    },
    {
      name: 'SHA1 해시 기반 키',
      keys: [
        crypto.createHash('sha1').update('default').digest().slice(0, 16).toString('hex'),
        crypto.createHash('sha1').update('secret').digest().slice(0, 16).toString('hex'),
      ]
    },
    {
      name: 'SHA256 해시 기반 키 (AES-256용)',
      keys: [
        crypto.createHash('sha256').update('default').digest().toString('hex'),
        crypto.createHash('sha256').update('secret').digest().toString('hex'),
        crypto.createHash('sha256').update('key').digest().toString('hex'),
        crypto.createHash('sha256').update('password').digest().toString('hex'),
        crypto.createHash('sha256').update('masterkey').digest().toString('hex'),
      ]
    },
    {
      name: 'PBKDF2 기반 키 (AES-256용)',
      keys: [
        crypto.pbkdf2Sync('default', 'salt', 10000, 32, 'sha256').toString('hex'),
        crypto.pbkdf2Sync('secret', 'salt', 10000, 32, 'sha256').toString('hex'),
        crypto.pbkdf2Sync('key', 'salt', 10000, 32, 'sha256').toString('hex'),
      ]
    },
    {
      name: '주민번호 기반 키',
      keys: [] // 동적으로 생성
    }
  ];

  // 암호화 모드 목록 (AES-256 우선)
  const cipherModes = [
    { name: 'AES-256-ECB', algorithm: 'aes-256-ecb', iv: false, keyLength: 32 },
    { name: 'AES-256-CBC', algorithm: 'aes-256-cbc', iv: true, keyLength: 32 },
    { name: 'AES-256-CTR', algorithm: 'aes-256-ctr', iv: true, keyLength: 32 },
    { name: 'AES-256-GCM', algorithm: 'aes-256-gcm', iv: true, keyLength: 32 },
    { name: 'AES-192-ECB', algorithm: 'aes-192-ecb', iv: false, keyLength: 24 },
    { name: 'AES-192-CBC', algorithm: 'aes-192-cbc', iv: true, keyLength: 24 },
    { name: 'AES-128-ECB', algorithm: 'aes-128-ecb', iv: false, keyLength: 16 },
    { name: 'AES-128-CBC', algorithm: 'aes-128-cbc', iv: true, keyLength: 16 },
    { name: 'DES-ECB', algorithm: 'des-ecb', iv: false, keyLength: 8 },
    { name: 'DES-CBC', algorithm: 'des-cbc', iv: true, keyLength: 8 },
    { name: '3DES-ECB', algorithm: 'des-ede3', iv: false, keyLength: 24 },
  ];

  let successCount = 0;
  const successfulMethods: string[] = [];

  for (const row of testData) {
    const encrypted = row.ENCRYPTED_PIDNUM?.toString() || '';
    const plain = row.PLAIN_PIDNUM?.toString() || '';
    
    if (!encrypted || !plain) continue;

    console.log(`\n[테스트 ${row.PCODE}] ${row.PERSON_NAME}`);
    console.log(`  암호화된 값: ${encrypted}`);
    console.log(`  일반 값: ${plain}`);

    const decoded = Buffer.from(encrypted, 'base64');
    console.log(`  Base64 디코딩 후 길이: ${decoded.length} bytes`);

    // 주민번호 기반 키 생성 (다양한 길이)
    const pidnumBasedKeys = [
      crypto.createHash('md5').update(plain).digest().slice(0, 16),
      crypto.createHash('md5').update(plain).digest().slice(0, 24),
      crypto.createHash('md5').update(plain).digest().slice(0, 32),
      crypto.createHash('sha256').update(plain).digest().slice(0, 32), // AES-256용
      crypto.pbkdf2Sync(plain, 'salt', 10000, 32, 'sha256'), // AES-256용
    ];

    // 각 암호화 모드 테스트
    for (const mode of cipherModes) {
      const keyLength = mode.keyLength;

      // 각 키 생성 방식 테스트
      for (const keyMethod of keyGenerationMethods) {
        let keysToTest: Buffer[] = [];

        if (keyMethod.name === '주민번호 기반 키') {
          keysToTest = pidnumBasedKeys
            .map(k => {
              if (Buffer.isBuffer(k)) {
                return k.slice(0, keyLength);
              } else {
                return Buffer.from(k, 'hex').slice(0, keyLength);
              }
            })
            .filter(k => k.length === keyLength);
        } else {
          keysToTest = keyMethod.keys
            .map(k => {
              const keyBuffer = Buffer.from(k, 'hex');
              if (keyBuffer.length >= keyLength) {
                return keyBuffer.slice(0, keyLength);
              }
              // 키가 짧으면 패딩 또는 반복
              if (keyLength === 32 && keyBuffer.length === 16) {
                // 16바이트 키를 32바이트로 확장 (반복)
                return Buffer.concat([keyBuffer, keyBuffer]);
              }
              return null;
            })
            .filter((k): k is Buffer => k !== null && k.length === keyLength);
        }

        for (const key of keysToTest) {
          if (key.length !== keyLength) continue;

          try {
            let decrypted: Buffer;

            if (mode.iv) {
              // IV가 필요한 모드 (CBC, CTR, GCM 등)
              if (decoded.length < 16) continue;
              
              // IV를 앞에서 추출 (일반적으로 16바이트)
              const iv = decoded.slice(0, 16);
              const encryptedData = decoded.slice(16);
              
              if (encryptedData.length === 0) continue;

              try {
                if (mode.algorithm.includes('gcm')) {
                  // GCM 모드는 추가 인증 태그가 필요할 수 있음
                  // 일반적으로 마지막 16바이트가 태그
                  if (encryptedData.length < 16) continue;
                  const tag = encryptedData.slice(-16);
                  const ciphertext = encryptedData.slice(0, -16);
                  const decipher = crypto.createDecipheriv(mode.algorithm, key, iv);
                  decipher.setAuthTag(tag);
                  decipher.setAutoPadding(true);
                  decrypted = decipher.update(ciphertext);
                  decrypted = Buffer.concat([decrypted, decipher.final()]);
                } else {
                  // CBC, CTR 등
                  const decipher = crypto.createDecipheriv(mode.algorithm, key, iv);
                  decipher.setAutoPadding(true);
                  decrypted = decipher.update(encryptedData);
                  decrypted = Buffer.concat([decrypted, decipher.final()]);
                }
              } catch (e: any) {
                // GCM 태그 검증 실패 등
                continue;
              }
            } else {
              // IV가 없는 모드 (ECB 등)
              const decipher = crypto.createDecipheriv(mode.algorithm, key, Buffer.alloc(0));
              decipher.setAutoPadding(true);
              decrypted = decipher.update(decoded);
              decrypted = Buffer.concat([decrypted, decipher.final()]);
            }

            const decryptedStr = decrypted.toString('utf-8').trim().replace(/\0/g, '');
            
            if (decryptedStr === plain) {
              console.log(`  ✅ 성공! ${mode.name} - ${keyMethod.name}`);
              console.log(`     키 (hex): ${key.toString('hex')}`);
              successCount++;
              const methodKey = `${mode.name}-${keyMethod.name}`;
              if (!successfulMethods.includes(methodKey)) {
                successfulMethods.push(methodKey);
              }
              break; // 이 모드에서는 성공했으므로 다음 모드로
            }
          } catch (e: any) {
            // 복호화 실패 (키 길이 불일치, 패딩 오류 등)
          }
        }
      }
    }

    // XOR 암호화 테스트 (간단한 대칭키)
    if (decoded.length >= plain.length) {
      const xorKey = Buffer.alloc(plain.length);
      for (let i = 0; i < plain.length; i++) {
        xorKey[i] = decoded[i] ^ plain.charCodeAt(i);
      }
      
      // 키로 복호화 테스트
      const testDecrypt = Buffer.from(
        Array.from(plain).map((_, i) => decoded[i] ^ xorKey[i])
      );
      if (testDecrypt.toString('utf-8') === plain) {
        console.log(`  ✅ XOR 암호화 가능성 (키 길이: ${xorKey.length})`);
        console.log(`     키 (hex): ${xorKey.toString('hex')}`);
      }
    }
  }

  console.log(`\n=== 분석 결과 요약 ===`);
  console.log(`총 테스트 데이터: ${testData.length}건`);
  console.log(`성공한 복호화: ${successCount}건`);
  
  if (successfulMethods.length > 0) {
    console.log(`\n성공한 암호화 방식:`);
    successfulMethods.forEach(method => {
      console.log(`  - ${method}`);
    });
  } else {
    console.log(`\n⚠️  일반적인 키로는 복호화 실패`);
    console.log(`   원본 시스템의 암호화 키가 필요합니다.`);
  }

  // 패턴 분석: 같은 주민번호가 같은 암호화 값인지 확인
  console.log(`\n=== 패턴 분석 ===`);
  const patternTest = await executeQuery(
    { database: dbFile },
    `SELECT 
      m.PIDNUM AS PLAIN_PIDNUM,
      COUNT(DISTINCT p.PIDNUM) AS ENCRYPTED_COUNT,
      COUNT(*) AS TOTAL_RECORDS
    FROM "PERSON" p
    INNER JOIN "MASTERAUX" m ON p.PCODE = m.PCODE
    WHERE p.PIDNUM IS NOT NULL AND m.PIDNUM IS NOT NULL
    GROUP BY m.PIDNUM
    HAVING COUNT(DISTINCT p.PIDNUM) > 1
    ORDER BY COUNT(DISTINCT p.PIDNUM) DESC
    ROWS 5`,
    []
  );

  if (patternTest.length > 0) {
    console.log(`같은 주민번호가 다른 암호화 값을 가지는 경우:`);
    patternTest.forEach((row: any) => {
      console.log(`  주민번호: ${row.PLAIN_PIDNUM}, 암호화 값 종류: ${row.ENCRYPTED_COUNT}개`);
    });
    console.log(`  → 결정적 암호화 (Deterministic)가 아님`);
  } else {
    console.log(`같은 주민번호는 항상 같은 암호화 값을 가짐`);
    console.log(`  → 결정적 암호화 (Deterministic) 가능성`);
  }

  // 추가 분석: 암호화된 값의 엔트로피 확인
  console.log(`\n=== 암호화 품질 분석 ===`);
  const allEncrypted = await executeQuery(
    { database: dbFile },
    `SELECT PIDNUM FROM "PERSON" WHERE PIDNUM IS NOT NULL ROWS 100`,
    []
  );

  if (allEncrypted.length > 0) {
    // Base64 디코딩 후 바이트 분포 확인
    const byteDistribution = new Map<number, number>();
    let totalBytes = 0;

    allEncrypted.forEach((row: any) => {
      try {
        const decoded = Buffer.from(row.PIDNUM.toString(), 'base64');
        decoded.forEach(byte => {
          byteDistribution.set(byte, (byteDistribution.get(byte) || 0) + 1);
          totalBytes++;
        });
      } catch (e) {
        // 무시
      }
    });

    // 엔트로피 계산 (간단한 버전)
    let entropy = 0;
    byteDistribution.forEach((count, byte) => {
      const probability = count / totalBytes;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });

    console.log(`  분석한 암호화 값: ${allEncrypted.length}개`);
    console.log(`  총 바이트 수: ${totalBytes}`);
    console.log(`  고유 바이트 값: ${byteDistribution.size}/256`);
    console.log(`  엔트로피 (최대 8.0): ${entropy.toFixed(2)}`);
    
    if (entropy > 7.5) {
      console.log(`  ✅ 높은 엔트로피 - 강력한 암호화 가능성`);
    } else if (entropy > 6.0) {
      console.log(`  ⚠️  중간 엔트로피 - 약한 암호화 또는 패턴 존재`);
    } else {
      console.log(`  ❌ 낮은 엔트로피 - 단순 인코딩 또는 약한 암호화`);
    }

    // 바이트 분포 확인 (균등 분포인지)
    const expectedCount = totalBytes / 256;
    let chiSquare = 0;
    for (let i = 0; i < 256; i++) {
      const observed = byteDistribution.get(i) || 0;
      chiSquare += Math.pow(observed - expectedCount, 2) / expectedCount;
    }
    console.log(`  카이제곱 통계: ${chiSquare.toFixed(2)}`);
    console.log(`  (256에 가까울수록 균등 분포, 255 미만이면 균등 분포 가능성 높음)`);
  }
}

testAESEncryption().catch(console.error);

