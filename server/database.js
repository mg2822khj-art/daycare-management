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
  const tableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='visits'");
  if (tableInfo.length > 0) {
    const createSQL = tableInfo[0].values[0][0];
    // visit_type 컬럼이 없는지 확인
    if (createSQL && !createSQL.includes('visit_type')) {
      console.log('⚠️ 데이터베이스에 visit_type 컬럼이 없습니다. 테이블을 재생성합니다...');
      // 기존 테이블 삭제
      db.run('DROP TABLE IF EXISTS visits');
      db.run('DROP TABLE IF EXISTS customers');
      console.log('✅ 기존 테이블 삭제 완료');
    }
  }
} catch (e) {
  console.log('테이블 체크 중 에러 (무시됨):', e.message);
}

// 테이블 생성 (soft delete 지원, 데이케어/호텔링 구분)
db.run(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    dog_name TEXT NOT NULL,
    breed TEXT NOT NULL,
    birth_date TEXT NOT NULL,
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

  CREATE INDEX IF NOT EXISTS idx_dog_name ON customers(dog_name);
  CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
  CREATE INDEX IF NOT EXISTS idx_visits_type ON visits(visit_type);
  CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_visits_deleted ON visits(deleted_at);
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

// 고객 등록 (birth_date 저장)
export function createCustomer(customer_name, phone, dog_name, breed, birth_date) {
  const stmt = db.prepare('INSERT INTO customers (customer_name, phone, dog_name, breed, birth_date) VALUES (?, ?, ?, ?, ?)');
  stmt.bind([customer_name, phone, dog_name, breed, birth_date]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 고객 정보 수정
export function updateCustomer(customer_id, customer_name, phone, dog_name, breed, birth_date) {
  const stmt = db.prepare('UPDATE customers SET customer_name = ?, phone = ?, dog_name = ?, breed = ?, birth_date = ? WHERE id = ?');
  stmt.bind([customer_name, phone, dog_name, breed, birth_date, customer_id]);
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

export default db;
