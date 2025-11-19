import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'daycare.db');

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
  const tableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'");
  if (tableInfo.length > 0) {
    const createSQL = tableInfo[0].values[0][0];
    // UNIQUE 제약조건이 있는지 또는 deleted_at 컬럼이 없는지 확인
    if (createSQL && (createSQL.includes('UNIQUE') || !createSQL.includes('deleted_at'))) {
      console.log('⚠️ 기존 데이터베이스 구조를 업데이트합니다. 테이블을 재생성합니다...');
      // 기존 테이블 삭제
      db.run('DROP TABLE IF EXISTS visits');
      db.run('DROP TABLE IF EXISTS customers');
      console.log('✅ 기존 테이블 삭제 완료');
    }
  }
} catch (e) {
  console.log('테이블 체크 중 에러 (무시됨):', e.message);
}

// 테이블 생성 (soft delete 지원)
db.run(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    dog_name TEXT NOT NULL,
    breed TEXT NOT NULL,
    age INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    check_in DATETIME NOT NULL,
    check_out DATETIME,
    duration_minutes INTEGER,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE INDEX IF NOT EXISTS idx_dog_name ON customers(dog_name);
  CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id);
  CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_visits_deleted ON visits(deleted_at);
`);
saveDatabase();
console.log('✅ 데이터베이스 초기화 완료');

// 고객 등록
export function createCustomer(customer_name, phone, dog_name, breed, age) {
  const stmt = db.prepare('INSERT INTO customers (customer_name, phone, dog_name, breed, age) VALUES (?, ?, ?, ?, ?)');
  stmt.bind([customer_name, phone, dog_name, breed, age]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 반려견 이름으로 고객 조회 (정확히 일치, 삭제되지 않은 것만)
export function findCustomersByDogName(dog_name) {
  const stmt = db.prepare('SELECT * FROM customers WHERE dog_name = ? AND deleted_at IS NULL');
  stmt.bind([dog_name]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// 반려견 이름으로 실시간 검색 (부분 일치, 삭제되지 않은 것만)
export function searchCustomersByDogName(searchTerm) {
  if (!searchTerm) return [];
  const stmt = db.prepare('SELECT * FROM customers WHERE dog_name LIKE ? AND deleted_at IS NULL ORDER BY dog_name LIMIT 20');
  stmt.bind([`%${searchTerm}%`]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// 고객 ID로 조회
export function findCustomerById(id) {
  const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
  stmt.bind([id]);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

// 모든 고객 조회 (삭제되지 않은 것만)
export function getAllCustomers() {
  const result = db.exec('SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY created_at DESC');
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

// 체크인
export function checkIn(customer_id) {
  const stmt = db.prepare("INSERT INTO visits (customer_id, check_in) VALUES (?, datetime('now', 'localtime'))");
  stmt.bind([customer_id]);
  stmt.step();
  stmt.free();
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: result[0].values[0][0] };
}

// 체크아웃
export function checkOut(visit_id) {
  const stmt = db.prepare(`
    UPDATE visits 
    SET check_out = datetime('now', 'localtime'),
        duration_minutes = CAST((julianday(datetime('now', 'localtime')) - julianday(check_in)) * 24 * 60 AS INTEGER)
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
  const result = db.exec(`
    SELECT v.*
    FROM visits v
    WHERE v.customer_id = ? AND v.check_out IS NOT NULL
    ORDER BY v.check_in DESC
  `, [customer_id]);
  
  if (!result.length) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return obj;
  });
}

// 고객 삭제 (soft delete)
export function deleteCustomer(customer_id) {
  // 고객을 소프트 삭제
  const stmt = db.prepare("UPDATE customers SET deleted_at = datetime('now', 'localtime') WHERE id = ?");
  stmt.bind([customer_id]);
  stmt.step();
  stmt.free();
  
  // 해당 고객의 방문 기록도 소프트 삭제
  const stmt2 = db.prepare("UPDATE visits SET deleted_at = datetime('now', 'localtime') WHERE customer_id = ?");
  stmt2.bind([customer_id]);
  stmt2.step();
  stmt2.free();
  
  saveDatabase();
}

// 방문 기록 삭제 (soft delete)
export function deleteVisit(visit_id) {
  const stmt = db.prepare("UPDATE visits SET deleted_at = datetime('now', 'localtime') WHERE id = ?");
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
