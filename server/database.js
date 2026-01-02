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

  CREATE INDEX IF NOT EXISTS idx_dog_name ON customers(dog_name);
  CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
  CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);
  CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_visits_deleted ON visits(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_reservations_dates ON hoteling_reservations(start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_reservations_deleted ON hoteling_reservations(deleted_at);
`);
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
export function searchCustomersByDogName(searchTerm) {
  if (!searchTerm) return [];
  const stmt = db.prepare('SELECT * FROM customers WHERE (dog_name LIKE ? OR customer_name LIKE ? OR phone LIKE ?) AND deleted_at IS NULL ORDER BY dog_name LIMIT 20');
  const searchPattern = `%${searchTerm}%`;
  stmt.bind([searchPattern, searchPattern, searchPattern]);
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

// 모든 고객 조회 (삭제되지 않은 것만, 나이 자동 계산)
export function getAllCustomers() {
  try {
    const result = db.exec('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC');
    if (!result.length) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      // 나이 자동 계산
      if (obj.birth_date) {
        const age = calculateAge(obj.birth_date);
        obj.age_years = age.years;
        obj.age_months = age.months;
      } else if (obj.age !== undefined && obj.age !== null) {
        // 기존 데이터 호환성
        obj.age_years = parseInt(obj.age) || 0;
        obj.age_months = 0;
      } else {
        obj.age_years = 0;
        obj.age_months = 0;
      }
      return obj;
    });
  } catch (error) {
    console.error('고객 목록 조회 오류:', error);
    return [];
  }
}

// 체크인 (한국 시간 KST, UTC+9, 타입 구분)
export function checkIn(customer_id, visit_type = 'daycare') {
  const stmt = db.prepare("INSERT INTO visits (customer_id, visit_type, check_in) VALUES (?, ?, datetime('now', '+9 hours'))");
  stmt.bind([customer_id, visit_type]);
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

// 데이케어 요금 계산 (1시간 단위, 남은 시간은 30분 기준)
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

  // 1시간 단위로 계산
  const fullHours = Math.floor(duration_minutes / 60);
  const remainingMinutes = duration_minutes % 60;
  
  let fee = fullHours * pricePerHour;
  let additionalFee = 0;
  let additionalUnit = '';
  
  // 남은 시간 처리
  if (remainingMinutes > 0) {
    if (remainingMinutes < 30) {
      // 30분 미만: 30분 요금만
      additionalFee = pricePer30min;
      additionalUnit = '30분';
    } else {
      // 30분 이상: 1시간 요금
      additionalFee = pricePerHour;
      additionalUnit = '1시간';
    }
  }
  
  fee += additionalFee;

  return {
    fee,
    fullHours,
    remainingMinutes,
    additionalFee,
    additionalUnit,
    pricePerHour,
    pricePer30min,
    duration_minutes,
    weight
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
