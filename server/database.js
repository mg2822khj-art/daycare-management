import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 환경변수에서 데이터베이스 경로 가져오기 (Render Disk 지원)
// 프로덕션: /app/data/daycare.db (영구 저장소)
// 개발: ./server/daycare.db (로컬)
const dbPath = process.env.DB_PATH || join(__dirname, 'daycare.db');

// 프로덕션 환경에서 데이터 디렉토리 확인 및 생성
if (process.env.NODE_ENV === 'production' && dbPath.includes('/app/data')) {
  const dataDir = dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`📁 데이터 디렉토리 생성: ${dataDir}`);
  }
}

console.log(`💾 데이터베이스 경로: ${dbPath}`);

// SQL.js 초기화
const SQL = await initSqlJs();
let db;

// 기존 데이터베이스 로드 또는 새로 생성
if (fs.existsSync(dbPath)) {
  const buffer = fs.readFileSync(dbPath);
  db = new SQL.Database(buffer);
} else {
  db = new SQL.Database();
}

// 데이터베이스 저장 함수
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// 기존 테이블이 잘못된 구조일 수 있으므로 체크
try {
  // customers 테이블 체크
  const customersTableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'");
  const visitsTableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='visits'");
  
  let needRecreate = false;
  
  // customers 테이블에 birth_date 컬럼이 있는지 확인
  if (customersTableInfo.length > 0) {
    const createSQL = customersTableInfo[0].values[0][0];
    if (createSQL && !createSQL.includes('birth_date')) {
      console.log('⚠️ customers 테이블에 birth_date 컬럼이 없습니다.');
      needRecreate = true;
    }
    // deleted_at 컬럼 확인
    if (createSQL && !createSQL.includes('deleted_at')) {
      console.log('⚠️ customers 테이블에 deleted_at 컬럼이 없습니다.');
      needRecreate = true;
    }
    // weight 컬럼 확인 및 추가
    if (createSQL && !createSQL.includes('weight')) {
      console.log('⚠️ customers 테이블에 weight 컬럼이 없습니다. 추가합니다...');
      try {
        db.run('ALTER TABLE customers ADD COLUMN weight REAL DEFAULT NULL');
        saveDatabase();
        console.log('✅ weight 컬럼 추가 완료');
      } catch (e) {
        console.log('weight 컬럼 추가 중 오류 (무시됨):', e.message);
      }
    }
  }
  
  // visits 테이블에 visit_type 컬럼이 있는지 확인
  if (visitsTableInfo.length > 0) {
    const createSQL = visitsTableInfo[0].values[0][0];
    if (createSQL && !createSQL.includes('visit_type')) {
      console.log('⚠️ visits 테이블에 visit_type 컬럼이 없습니다.');
      needRecreate = true;
    }
    // deleted_at 컬럼 확인
    if (createSQL && !createSQL.includes('deleted_at')) {
      console.log('⚠️ visits 테이블에 deleted_at 컬럼이 없습니다.');
      needRecreate = true;
    }
    // prepaid 컬럼 확인 및 추가
    if (createSQL && !createSQL.includes('prepaid')) {
      console.log('⚠️ visits 테이블에 prepaid 컬럼이 없습니다. 추가합니다...');
      try {
        db.run('ALTER TABLE visits ADD COLUMN prepaid INTEGER DEFAULT 0');
        db.run('ALTER TABLE visits ADD COLUMN prepaid_amount REAL DEFAULT 0');
        saveDatabase();
        console.log('✅ prepaid 컬럼 추가 완료');
      } catch (e) {
        console.log('prepaid 컬럼 추가 중 오류 (무시됨):', e.message);
      }
    }
  }
  
  if (needRecreate) {
    console.log('⚠️ 데이터베이스 스키마가 오래되었습니다. 테이블을 재생성합니다...');
    // 기존 테이블 삭제
    db.run('DROP TABLE IF EXISTS visits');
    db.run('DROP TABLE IF EXISTS customers');
    console.log('✅ 기존 테이블 삭제 완료');
  }
} catch (e) {
  console.log('테이블 체크 중 에러 (무시됨):', e.message);
}

// 테이블 생성 (soft delete 지원, 데이케어/호텔링 구분, 호텔링 예약)
db.run(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    dog_name TEXT NOT NULL,
    breed TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    weight REAL DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    visit_type TEXT NOT NULL DEFAULT 'daycare',
    check_in DATETIME NOT NULL,
    check_out DATETIME,
    duration_minutes INTEGER,
    prepaid INTEGER DEFAULT 0,
    prepaid_amount REAL DEFAULT 0,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE TABLE IF NOT EXISTS hoteling_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE TABLE IF NOT EXISTS revenues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    dog_id INTEGER,
    service_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount REAL NOT NULL,
    sessions INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers (id),
    FOREIGN KEY (dog_id) REFERENCES dogs (id)
  );

  CREATE INDEX IF NOT EXISTS idx_dog_name ON customers(dog_name);
  CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
  CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);
  CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_visits_deleted ON visits(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_reservations_dates ON hoteling_reservations(start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_reservations_deleted ON hoteling_reservations(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_revenues_customer ON revenues(customer_id);
  CREATE INDEX IF NOT EXISTS idx_revenues_created ON revenues(created_at);
  CREATE INDEX IF NOT EXISTS idx_revenues_deleted ON revenues(deleted_at);
`);

// 기존 DB 호환성: hoteling_reservations 테이블 스키마 보정
try {
  const pragmaResult = db.exec(`PRAGMA table_info(hoteling_reservations);`);
  if (pragmaResult && pragmaResult.length > 0) {
    const columns = pragmaResult[0].columns; // ['cid','name','type','notnull','dflt_value','pk']
    const nameIndex = columns.indexOf('name');
    const hasCustomerId = pragmaResult[0].values.some(row => row[nameIndex] === 'customer_id');
    const hasDogId = pragmaResult[0].values.some(row => row[nameIndex] === 'dog_id');

    // 1) customer_id 컬럼이 없으면 추가
    if (!hasCustomerId) {
      console.log('⚠️ hoteling_reservations 테이블에 customer_id 컬럼이 없습니다. 추가합니다...');
      db.run(`ALTER TABLE hoteling_reservations ADD COLUMN customer_id INTEGER;`);
      console.log('✅ customer_id 컬럼 추가 완료');
    }

    // 2) 예전 스키마에서 사용하던 dog_id 컬럼이 남아 있다면,
    //    NOT NULL 제약 때문에 오류가 날 수 있으므로 새 테이블로 마이그레이션
    if (hasDogId) {
      console.log('⚠️ hoteling_reservations 테이블에 dog_id 컬럼이 감지되었습니다. 새 스키마로 마이그레이션합니다...');

      // 새 테이블 생성 (현재 코드에서 사용하는 스키마)
      db.run(`
        CREATE TABLE IF NOT EXISTS hoteling_reservations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          notes TEXT,
          status TEXT DEFAULT 'confirmed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT NULL,
          FOREIGN KEY (customer_id) REFERENCES customers (id)
        );
      `);

      // 기존 데이터에서 사용할 수 있는 컬럼만 복사 (dog_id는 버림)
      try {
        db.run(`
          INSERT INTO hoteling_reservations_new (id, customer_id, start_date, end_date, notes, status, created_at, deleted_at)
          SELECT 
            id,
            -- 기존 테이블에 customer_id가 없었다면 NULL로 들어가지만,
            -- 앞으로 새로 추가되는 예약만 정확한 customer_id를 사용하면 되므로 과거 데이터는 무시 가능
            customer_id,
            start_date,
            end_date,
            notes,
            COALESCE(status, 'confirmed'),
            created_at,
            deleted_at
          FROM hoteling_reservations;
        `);
      } catch (copyErr) {
        console.error('hoteling_reservations 데이터 마이그레이션 중 오류:', copyErr);
      }

      // 기존 테이블/인덱스 제거 후 새 테이블 이름 변경
      db.run(`DROP TABLE hoteling_reservations;`);
      db.run(`ALTER TABLE hoteling_reservations_new RENAME TO hoteling_reservations;`);

      // 인덱스 재생성
      db.run(`CREATE INDEX IF NOT EXISTS idx_reservations_dates ON hoteling_reservations(start_date, end_date);`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_reservations_deleted ON hoteling_reservations(deleted_at);`);

      console.log('✅ hoteling_reservations 테이블 마이그레이션 완료 (dog_id 제거)');
    }
  }
} catch (e) {
  console.error('hoteling_reservations 스키마 확인/수정 중 오류:', e);
}

saveDatabase();
console.log('✅ 데이터베이스 초기화 완료');

// 나이 계산 함수 (생년월일 기준)
export function calculateAge(birth_date) {
  if (!birth_date) {
    return { years: 0, months: 0 };
  }
  
  try {
    const today = new Date();
    const birth = new Date(birth_date);
    
    // 유효한 날짜인지 확인
    if (isNaN(birth.getTime())) {
      return { years: 0, months: 0 };
    }
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    // 음수 방지
    if (years < 0) {
      years = 0;
      months = 0;
    }
    
    return { years, months };
  } catch (error) {
    console.error('나이 계산 오류:', error);
    return { years: 0, months: 0 };
  }
}

// 고객 등록 (birth_date, weight 저장)
export function createCustomer(customer_name, phone, dog_name, breed, birth_date, weight = null) {
  const stmt = db.prepare('INSERT INTO customers (customer_name, phone, dog_name, breed, birth_date, weight) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.bind([customer_name, phone, dog_name, breed, birth_date, weight]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 고객 정보 수정
export function updateCustomer(customer_id, customer_name, phone, dog_name, breed, birth_date, weight = null) {
  const stmt = db.prepare('UPDATE customers SET customer_name = ?, phone = ?, dog_name = ?, breed = ?, birth_date = ?, weight = ? WHERE id = ?');
  stmt.bind([customer_name, phone, dog_name, breed, birth_date, weight, customer_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 반려견 이름으로 고객 조회 (정확히 일치, 삭제되지 않은 것만, 나이 자동 계산)
export function findCustomersByDogName(dog_name) {
  const stmt = db.prepare('SELECT * FROM customers WHERE dog_name = ? AND deleted_at IS NULL');
  stmt.bind([dog_name]);
  const results = [];
  while (stmt.step()) {
    const customer = stmt.getAsObject();
    if (customer.birth_date) {
      const age = calculateAge(customer.birth_date);
      customer.age_years = age.years;
      customer.age_months = age.months;
    } else if (customer.age !== undefined && customer.age !== null) {
      // 기존 데이터 호환성
      customer.age_years = parseInt(customer.age) || 0;
      customer.age_months = 0;
    } else {
      customer.age_years = 0;
      customer.age_months = 0;
    }
    results.push(customer);
  }
  stmt.free();
  return results;
}

// 반려견 이름, 보호자 이름, 연락처로 실시간 검색 (부분 일치, 삭제되지 않은 것만, 나이 자동 계산)
// 반려견 이름, 보호자 이름, 연락처로 실시간 검색 (부분 일치, 삭제되지 않은 것만, 나이 자동 계산)
export function searchCustomersByDogName(searchTerm) {
  if (!searchTerm) {
    console.log('🔍 검색어가 없습니다.');
    return [];
  }
  
  console.log('🔍 검색 시작:', searchTerm);
  
  try {
    const stmt = db.prepare(`
      SELECT d.*, c.customer_name, c.phone, c.id as customer_id
      FROM dogs d
      JOIN customers c ON d.customer_id = c.id
      WHERE (d.dog_name LIKE ? OR c.customer_name LIKE ? OR c.phone LIKE ?) 
      AND d.deleted_at IS NULL 
      AND c.deleted_at IS NULL 
      ORDER BY d.dog_name 
      LIMIT 20
    `);
    const searchPattern = `%${searchTerm}%`;
    stmt.bind([searchPattern, searchPattern, searchPattern]);
    const results = [];
    while (stmt.step()) {
      const dog = stmt.getAsObject();
      if (dog.birth_date) {
        const age = calculateAge(dog.birth_date);
        dog.age_years = age.years;
        dog.age_months = age.months;
      } else {
        dog.age_years = 0;
        dog.age_months = 0;
      }
      results.push(dog);
    }
    stmt.free();
    console.log(`✅ 검색 완료: ${results.length}건 발견`);
    return results;
  } catch (error) {
    console.error('❌ 검색 오류:', error);
    return [];
  }
}

// 고객 ID로 조회 (나이 자동 계산)
export function findCustomerById(id) {
  try {
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    stmt.bind([id]);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    
    if (!result) {
      return null;
    }
    
    // birth_date가 있으면 계산, 없으면 기본값 설정
    if (result.birth_date) {
      const age = calculateAge(result.birth_date);
      result.age_years = age.years;
      result.age_months = age.months;
    } else {
      // 기존 데이터 호환성: age 컬럼이 있으면 사용
      if (result.age !== undefined && result.age !== null) {
        result.age_years = parseInt(result.age) || 0;
        result.age_months = 0;
      } else {
        result.age_years = 0;
        result.age_months = 0;
      }
    }
    
    return result;
  } catch (error) {
    console.error('고객 조회 오류:', error);
    return null;
  }
}

// 모든 고객 조회 (삭제되지 않은 것만, 강아지 정보 포함)
export function getAllCustomers() {
  try {
    console.log('📋 모든 고객 조회 시작 (강아지 정보 포함)...');
    
    // 고객 정보 조회
    const customersResult = db.exec('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC');
    if (!customersResult.length) {
      console.log('⚠️ 고객 데이터가 없습니다.');
      return [];
    }
    
    const customersColumns = customersResult[0].columns;
    const customers = customersResult[0].values.map(row => {
      const obj = {};
      customersColumns.forEach((col, idx) => { obj[col] = row[idx]; });
      // 나이 자동 계산 (고객의 나이가 아니라 강아지의 나이를 사용하므로 여기서는 기본값만 설정)
      obj.age_years = 0;
      obj.age_months = 0;
      return obj;
    });
    
    console.log(`📊 조회된 고객 수: ${customers.length}명`);
    
    // 각 고객의 강아지 정보 조회
    const customersWithDogs = customers.map(customer => {
      try {
        const dogsStmt = db.prepare(`
          SELECT * FROM dogs 
          WHERE customer_id = ? AND deleted_at IS NULL 
          ORDER BY created_at ASC
        `);
        dogsStmt.bind([customer.id]);
        const dogs = [];
        while (dogsStmt.step()) {
          const dog = dogsStmt.getAsObject();
          // 강아지 나이 계산
          if (dog.birth_date) {
            const age = calculateAge(dog.birth_date);
            dog.age_years = age.years;
            dog.age_months = age.months;
          } else {
            dog.age_years = 0;
            dog.age_months = 0;
          }
          dogs.push(dog);
        }
        dogsStmt.free();
        
        // 고객 객체에 강아지 배열 추가
        customer.dogs = dogs;
        
        // 호환성을 위해 첫 번째 강아지 정보를 고객 객체의 최상위 레벨에도 추가 (기존 코드 호환성)
        if (dogs.length > 0) {
          const firstDog = dogs[0];
          customer.dog_name = firstDog.dog_name;
          customer.breed = firstDog.breed;
          customer.weight = firstDog.weight;
          customer.age_years = firstDog.age_years;
          customer.age_months = firstDog.age_months;
        }
        
        return customer;
      } catch (error) {
        console.error(`고객 ${customer.id}의 강아지 정보 조회 오류:`, error);
        customer.dogs = [];
        return customer;
      }
    });
    
    console.log(`✅ 고객 조회 완료: ${customersWithDogs.length}명 (강아지 정보 포함)`);
    return customersWithDogs;
  } catch (error) {
    console.error('고객 목록 조회 오류:', error);
    return [];
  }
}

// 체크인 (한국 시간 KST, UTC+9, 타입 구분, 선결제 정보)
export function checkIn(customer_id, visit_type = 'daycare', prepaid = 0, prepaid_amount = 0) {
  const stmt = db.prepare("INSERT INTO visits (customer_id, visit_type, check_in, prepaid, prepaid_amount) VALUES (?, ?, datetime('now', '+9 hours'), ?, ?)");
  stmt.bind([customer_id, visit_type, prepaid ? 1 : 0, prepaid_amount || 0]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 체크인 시간 수정 (한국 시간 KST, UTC+9)
export function updateCheckInTime(visit_id, new_check_in_time) {
  try {
    // 받은 시간 문자열이 이미 한국 시간 형식인지 확인
    // SQLite의 datetime 함수를 사용하여 한국 시간으로 저장
    // 입력된 시간을 그대로 사용하되, 형식이 맞는지 확인
    
    // 체크아웃이 안 된 방문만 수정 가능
    const stmt = db.prepare(`
      UPDATE visits 
      SET check_in = ?
      WHERE id = ? AND check_out IS NULL
    `);
    stmt.bind([new_check_in_time, visit_id]);
    stmt.step();
    stmt.free();
    saveDatabase();
    return true;
  } catch (error) {
    console.error('체크인 시간 수정 오류:', error);
    return false;
  }
}

// 방문 정보 조회 (체크아웃 전)
export function getVisitById(visit_id) {
  try {
    const stmt = db.prepare(`
      SELECT v.*, c.weight, c.dog_name, c.customer_name
      FROM visits v
      JOIN customers c ON v.customer_id = c.id
      WHERE v.id = ? AND v.deleted_at IS NULL AND c.deleted_at IS NULL
    `);
    stmt.bind([visit_id]);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
  } catch (error) {
    console.error('방문 정보 조회 오류:', error);
    return null;
  }
}

// 이용 시간 계산 (한국 시간 기준, 분 단위)
export function calculateDuration(check_in_time) {
  try {
    // SQLite의 datetime 함수를 사용하여 한국 시간으로 계산
    const stmt = db.prepare(`
      SELECT CAST((julianday(datetime('now', '+9 hours')) - julianday(?)) * 24 * 60 AS INTEGER) as duration_minutes
    `);
    stmt.bind([check_in_time]);
    
    let duration_minutes = 0;
    if (stmt.step()) {
      const result = stmt.getAsObject();
      duration_minutes = result.duration_minutes || 0;
    }
    stmt.free();
    
    return duration_minutes;
  } catch (error) {
    console.error('이용 시간 계산 오류:', error);
    // 폴백: 문자열 파싱 방식 (한국 시간 기준)
    try {
      const [datePart, timePart] = check_in_time.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      
      // 체크인 시간을 한국 시간으로 파싱 (로컬 시간으로 해석)
      const checkInTime = new Date(year, month - 1, day, hour, minute, second || 0);
      
      // 현재 시간을 한국 시간으로 계산
      const now = new Date();
      const kstOffset = 9 * 60 * 60 * 1000; // 한국 시간 오프셋 (밀리초)
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
      const checkOutTime = new Date(utcTime + kstOffset);
      
      // 체크인 시간도 UTC로 변환 후 한국 시간으로 변환
      const checkInUtc = checkInTime.getTime() - (checkInTime.getTimezoneOffset() * 60 * 1000);
      const checkInKst = new Date(checkInUtc + kstOffset);
      
      const duration = Math.floor((checkOutTime - checkInKst) / 1000 / 60);
      return duration >= 0 ? duration : 0; // 음수 방지
    } catch (e) {
      console.error('이용 시간 계산 폴백 오류:', e);
      return 0;
    }
  }
}

// 데이케어 요금 계산 (30분 단위, 남은 시간이 15분 미만은 무시, 15분 이상은 30분 요금)
export function calculateDaycareFee(weight, duration_minutes) {
  if (!weight || weight < 2) {
    return { fee: 0, message: '몸무게 정보가 없거나 2kg 미만입니다.' };
  }

  // 1시간당 요금 및 30분당 요금 설정
  let pricePerHour = 0;
  let pricePer30min = 0;
  if (weight >= 2 && weight <= 7) {
    pricePerHour = 5000;
    pricePer30min = 2500;
  } else if (weight > 7 && weight <= 15) {
    pricePerHour = 6000;
    pricePer30min = 3000;
  } else if (weight > 15) {
    pricePerHour = 7000;
    pricePer30min = 3500;
  }

  // 30분 단위로 계산
  const full30mins = Math.floor(duration_minutes / 30); // 30분 단위 개수
  const remainingMinutes = duration_minutes % 30; // 30분으로 나눈 나머지
  
  // 기본 요금 (30분 단위)
  let fee = full30mins * pricePer30min;
  let additionalFee = 0;
  let additionalUnit = '';
  
  // 남은 시간 처리 - 15분 미만은 0원, 15분 이상은 30분 요금 추가
  if (remainingMinutes >= 15) {
    additionalFee = pricePer30min;
    additionalUnit = '30분';
    fee += additionalFee;
  }
  
  // 시간 표시를 위한 계산
  const fullHours = Math.floor(duration_minutes / 60);

  return {
    fee,
    fullHours,
    remainingMinutes,
    additionalFee,
    additionalUnit,
    pricePerHour,
    pricePer30min,
    duration_minutes,
    weight,
    full30mins // 30분 단위 개수 추가
  };
}

// 호텔링 요금 계산 (1일 기준, 초과 시간은 30분당 데이케어 요금, 15분 미만은 무시)
export function calculateHotelingFee(weight, duration_minutes, prepaid_amount = 0) {
  if (!weight || weight < 2) {
    return { 
      total_fee: 0, 
      remaining_fee: 0,
      message: '몸무게 정보가 없거나 2kg 미만입니다.' 
    };
  }

  // 1일(24시간) 호텔링 요금 및 데이케어 30분 요금
  let pricePerDay = 0;
  let pricePer30min = 0;
  
  if (weight >= 2 && weight <= 7) {
    pricePerDay = 44000;
    pricePer30min = 2500;
  } else if (weight > 7 && weight <= 15) {
    pricePerDay = 55000;
    pricePer30min = 3000;
  } else if (weight > 15) {
    pricePerDay = 66000;
    pricePer30min = 3500;
  }

  // 1일 = 1440분 (24시간)
  const minutesPerDay = 1440;
  const fullDays = Math.floor(duration_minutes / minutesPerDay);
  const excessMinutes = duration_minutes % minutesPerDay; // 1일을 초과한 시간
  
  // 기본 일수 요금
  let totalFee = fullDays * pricePerDay;
  
  // 초과 시간을 30분 단위로 계산
  let overtimeFee = 0;
  if (excessMinutes > 0) {
    const full30mins = Math.floor(excessMinutes / 30); // 30분 단위 개수
    const remainingMinutes = excessMinutes % 30; // 30분으로 나눈 나머지
    
    // 30분 단위 요금
    overtimeFee = full30mins * pricePer30min;
    
    // 남은 시간이 15분 이상이면 30분 요금 추가
    if (remainingMinutes >= 15) {
      overtimeFee += pricePer30min;
    }
    
    // 초과 요금이 1일 호텔링 요금을 넘으면 1일 호텔링 요금으로 대체
    if (overtimeFee > pricePerDay) {
      overtimeFee = pricePerDay;
    }
  }
  
  totalFee += overtimeFee;
  
  // 선결제 금액 차감
  const remainingFee = Math.max(0, totalFee - prepaid_amount);

  return {
    total_fee: totalFee,
    prepaid_amount: prepaid_amount,
    remaining_fee: remainingFee,
    full_days: fullDays,
    remaining_minutes: excessMinutes,
    overtime_fee: overtimeFee,
    price_per_day: pricePerDay,
    price_per_30min: pricePer30min,
    duration_minutes: duration_minutes,
    weight: weight
  };
}

// 체크아웃 (한국 시간 KST, UTC+9)
export function checkOut(visit_id) {
  const stmt = db.prepare(`
    UPDATE visits 
    SET check_out = datetime('now', '+9 hours'),
        duration_minutes = CAST((julianday(datetime('now', '+9 hours')) - julianday(check_in)) * 24 * 60 AS INTEGER)
    WHERE id = ? AND check_out IS NULL
  `);
  stmt.bind([visit_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 사용자 지정 시간으로 체크아웃
export function checkOutWithTime(visit_id, checkout_time) {
  const stmt = db.prepare(`
    UPDATE visits 
    SET check_out = ?,
        duration_minutes = CAST((julianday(?) - julianday(check_in)) * 24 * 60 AS INTEGER)
    WHERE id = ? AND check_out IS NULL
  `);
  stmt.bind([checkout_time, checkout_time, visit_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 현재 체크인 중인 방문 조회 (삭제되지 않은 것만)
export function getCurrentVisit() {
  const result = db.exec(`
    SELECT v.*, c.customer_name, c.dog_name, c.breed
    FROM visits v
    JOIN customers c ON v.customer_id = c.id
    WHERE v.check_out IS NULL AND v.deleted_at IS NULL AND c.deleted_at IS NULL
    ORDER BY v.check_in DESC
  `);
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

// 특정 고객의 현재 방문 조회
export function getCustomerCurrentVisit(customer_id) {
  const stmt = db.prepare(`
    SELECT * FROM visits
    WHERE customer_id = ? AND check_out IS NULL
    ORDER BY check_in DESC
    LIMIT 1
  `);
  stmt.bind([customer_id]);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

// 방문 기록 조회 (날짜별, 삭제되지 않은 것만)
export function getVisitHistory(startDate = null, endDate = null) {
  let query = `
    SELECT v.*, c.customer_name, c.dog_name, c.phone, c.breed
    FROM visits v
    JOIN customers c ON v.customer_id = c.id
    WHERE v.check_out IS NOT NULL AND v.deleted_at IS NULL AND c.deleted_at IS NULL
  `;
  
  const params = [];
  
  if (startDate && endDate) {
    query += ` AND date(v.check_in) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  } else if (startDate) {
    query += ` AND date(v.check_in) = ?`;
    params.push(startDate);
  }
  
  query += ` ORDER BY v.check_in DESC LIMIT 1000`;
  
  let result;
  if (params.length > 0) {
    const stmt = db.prepare(query);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } else {
    result = db.exec(query);
    if (!result.length) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
  }
}

// 방문 기록이 있는 날짜 목록 조회
export function getVisitDates() {
  const result = db.exec(`
    SELECT DISTINCT date(check_in) as visit_date
    FROM visits
    WHERE check_out IS NOT NULL
    ORDER BY visit_date DESC
    LIMIT 90
  `);
  if (!result.length) return [];
  return result[0].values.map(row => row[0]);
}

// 특정 고객의 방문 기록 조회
export function getCustomerVisitHistory(customer_id) {
  try {
    const stmt = db.prepare(`
      SELECT v.*
      FROM visits v
      WHERE v.customer_id = ? AND v.check_out IS NOT NULL AND v.deleted_at IS NULL
      ORDER BY v.check_in DESC
    `);
    stmt.bind([customer_id]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('방문 기록 조회 오류:', error);
    return [];
  }
}

// 고객 삭제 (soft delete, 한국 시간)
export function deleteCustomer(customer_id) {
  // 고객을 소프트 삭제
  const stmt = db.prepare("UPDATE customers SET deleted_at = datetime('now', '+9 hours') WHERE id = ?");
  stmt.bind([customer_id]);
  stmt.step();
  stmt.free();
  
  // 해당 고객의 방문 기록도 소프트 삭제
  const stmt2 = db.prepare("UPDATE visits SET deleted_at = datetime('now', '+9 hours') WHERE customer_id = ?");
  stmt2.bind([customer_id]);
  stmt2.step();
  stmt2.free();
  
  saveDatabase();
}

// 방문 기록 삭제 (soft delete, 한국 시간)
export function deleteVisit(visit_id) {
  const stmt = db.prepare("UPDATE visits SET deleted_at = datetime('now', '+9 hours') WHERE id = ?");
  stmt.bind([visit_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 삭제된 고객 목록 조회 (최근 10개)
export function getDeletedCustomers() {
  const result = db.exec(`
    SELECT * FROM customers 
    WHERE deleted_at IS NOT NULL 
    ORDER BY deleted_at DESC 
    LIMIT 10
  `);
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

// 삭제된 방문 기록 조회 (최근 10개)
export function getDeletedVisits() {
  const result = db.exec(`
    SELECT v.*, c.customer_name, c.dog_name, c.phone, c.breed
    FROM visits v
    LEFT JOIN customers c ON v.customer_id = c.id
    WHERE v.deleted_at IS NOT NULL
    ORDER BY v.deleted_at DESC
    LIMIT 10
  `);
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

// 고객 복구
export function restoreCustomer(customer_id) {
  // 고객 복구
  const stmt = db.prepare('UPDATE customers SET deleted_at = NULL WHERE id = ?');
  stmt.bind([customer_id]);
  stmt.step();
  stmt.free();
  
  // 해당 고객의 방문 기록도 복구
  const stmt2 = db.prepare('UPDATE visits SET deleted_at = NULL WHERE customer_id = ?');
  stmt2.bind([customer_id]);
  stmt2.step();
  stmt2.free();
  
  saveDatabase();
}

// 방문 기록 복구
export function restoreVisit(visit_id) {
  const stmt = db.prepare('UPDATE visits SET deleted_at = NULL WHERE id = ?');
  stmt.bind([visit_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// ===== 호텔링 예약 관련 함수 =====

// 예약 생성 (한국 시간)
export function createReservation(customer_id, start_date, end_date, notes = '') {
  const stmt = db.prepare("INSERT INTO hoteling_reservations (customer_id, start_date, end_date, notes) VALUES (?, ?, ?, ?)");
  stmt.bind([customer_id, start_date, end_date, notes]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 특정 기간의 예약 조회
export function getReservationsByDateRange(start_date, end_date) {
  try {
    const stmt = db.prepare(`
      SELECT r.*, c.customer_name, c.dog_name, c.phone, c.breed
      FROM hoteling_reservations r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.deleted_at IS NULL 
        AND c.deleted_at IS NULL
        AND (
          (r.start_date <= ? AND r.end_date >= ?)
          OR (r.start_date >= ? AND r.start_date <= ?)
          OR (r.end_date >= ? AND r.end_date <= ?)
        )
      ORDER BY r.start_date ASC
    `);
    stmt.bind([end_date, start_date, start_date, end_date, start_date, end_date]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('예약 조회 오류:', error);
    return [];
  }
}

// 특정 날짜의 예약 조회
export function getReservationsByDate(date) {
  try {
    const stmt = db.prepare(`
      SELECT r.*, c.customer_name, c.dog_name, c.phone, c.breed
      FROM hoteling_reservations r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.deleted_at IS NULL 
        AND c.deleted_at IS NULL
        AND r.start_date <= ? 
        AND r.end_date >= ?
      ORDER BY r.start_date ASC
    `);
    stmt.bind([date, date]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('예약 조회 오류:', error);
    return [];
  }
}

// 모든 예약 조회 (최근 순)
export function getAllReservations() {
  try {
    const result = db.exec(`
      SELECT r.*, c.customer_name, c.dog_name, c.phone, c.breed
      FROM hoteling_reservations r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.deleted_at IS NULL AND c.deleted_at IS NULL
      ORDER BY r.start_date DESC
      LIMIT 500
    `);
    if (!result.length) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
  } catch (error) {
    console.error('예약 목록 조회 오류:', error);
    return [];
  }
}

// 특정 고객의 예약 조회
export function getCustomerReservations(customer_id) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM hoteling_reservations
      WHERE customer_id = ? AND deleted_at IS NULL
      ORDER BY start_date DESC
    `);
    stmt.bind([customer_id]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('고객 예약 조회 오류:', error);
    return [];
  }
}

// 예약 수정
export function updateReservation(reservation_id, start_date, end_date, notes, status) {
  const stmt = db.prepare('UPDATE hoteling_reservations SET start_date = ?, end_date = ?, notes = ?, status = ? WHERE id = ?');
  stmt.bind([start_date, end_date, notes, status, reservation_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 예약 삭제 (soft delete, 한국 시간)
export function deleteReservation(reservation_id) {
  const stmt = db.prepare("UPDATE hoteling_reservations SET deleted_at = datetime('now', '+9 hours') WHERE id = ?");
  stmt.bind([reservation_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 매출 등록
export function createRevenue(customer_id, dog_id, service_type, payment_method, amount, sessions = 1, notes = '') {
  const stmt = db.prepare(`
    INSERT INTO revenues (customer_id, dog_id, service_type, payment_method, amount, sessions, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.bind([customer_id, dog_id || null, service_type, payment_method, amount, sessions, notes]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 모든 매출 조회 (삭제되지 않은 것만)
export function getAllRevenues(startDate = null, endDate = null) {
  try {
    let query = `
      SELECT r.*, c.customer_name, c.phone, 
             COALESCE(d.dog_name, c.dog_name) as dog_name,
             COALESCE(d.breed, c.breed) as breed
      FROM revenues r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN dogs d ON r.dog_id = d.id
      WHERE r.deleted_at IS NULL
    `;
    const params = [];
    
    if (startDate) {
      query += ' AND DATE(r.created_at) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND DATE(r.created_at) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const stmt = db.prepare(query);
    if (params.length > 0) {
      stmt.bind(params);
    }
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('매출 조회 오류:', error);
    return [];
  }
}

// 매출 수정
export function updateRevenue(revenue_id, customer_id, dog_id, service_type, payment_method, amount, sessions = 1, notes = '') {
  const stmt = db.prepare(`
    UPDATE revenues 
    SET customer_id = ?, dog_id = ?, service_type = ?, payment_method = ?, amount = ?, sessions = ?, notes = ?
    WHERE id = ?
  `);
  stmt.bind([customer_id, dog_id || null, service_type, payment_method, amount, sessions, notes, revenue_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 매출 ID로 조회
export function getRevenueById(revenue_id) {
  try {
    const stmt = db.prepare(`
      SELECT r.*, c.customer_name, c.phone,
             COALESCE(d.dog_name, c.dog_name) as dog_name,
             COALESCE(d.breed, c.breed) as breed
      FROM revenues r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN dogs d ON r.dog_id = d.id
      WHERE r.id = ? AND r.deleted_at IS NULL
    `);
    stmt.bind([revenue_id]);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
  } catch (error) {
    console.error('매출 조회 오류:', error);
    return null;
  }
}

// 고객별 매출 조회
export function getRevenuesByCustomer(customer_id) {
  try {
    const stmt = db.prepare(`
      SELECT r.*, d.dog_name, d.breed
      FROM revenues r
      LEFT JOIN dogs d ON r.dog_id = d.id
      WHERE r.customer_id = ? AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `);
    stmt.bind([customer_id]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (error) {
    console.error('고객별 매출 조회 오류:', error);
    return [];
  }
}

// 매출 삭제 (soft delete)
export function deleteRevenue(revenue_id) {
  const stmt = db.prepare("UPDATE revenues SET deleted_at = datetime('now', '+9 hours') WHERE id = ?");
  stmt.bind([revenue_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
}

// 예약 ID로 조회
export function getReservationById(reservation_id) {
  try {
    const stmt = db.prepare(`
      SELECT r.*, c.customer_name, c.dog_name, c.phone, c.breed
      FROM hoteling_reservations r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.id = ? AND r.deleted_at IS NULL AND c.deleted_at IS NULL
    `);
    stmt.bind([reservation_id]);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
  } catch (error) {
    console.error('예약 조회 오류:', error);
    return null;
  }
}

export default db;
