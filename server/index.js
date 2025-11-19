import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCustomer,
  findCustomersByDogName,
  searchCustomersByDogName,
  findCustomerById,
  getAllCustomers,
  checkIn,
  checkOut,
  getCurrentVisit,
  getCustomerCurrentVisit,
  getVisitHistory,
  getVisitDates,
  getCustomerVisitHistory,
  deleteCustomer,
  deleteVisit,
  getDeletedCustomers,
  getDeletedVisits,
  restoreCustomer,
  restoreVisit
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 고객 등록
app.post('/api/customers', (req, res) => {
  try {
    const { customer_name, phone, dog_name, breed, age } = req.body;
    
    // 유효성 검사
    if (!customer_name || !phone || !dog_name || !breed || !age) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const result = createCustomer(customer_name, phone, dog_name, breed, age);
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: '고객이 등록되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 등록 중 오류가 발생했습니다.' });
  }
});

// 모든 고객 조회
app.get('/api/customers', (req, res) => {
  try {
    const customers = getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 반려견 이름으로 고객 검색 (정확히 일치)
app.get('/api/customers/search/:dogName', (req, res) => {
  try {
    const customers = findCustomersByDogName(req.params.dogName);
    if (!customers.length) {
      return res.status(404).json({ error: '등록되지 않은 반려견입니다.' });
    }
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 검색 중 오류가 발생했습니다.' });
  }
});

// 반려견 이름으로 실시간 검색 (부분 일치)
app.get('/api/customers/autocomplete', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }
    const customers = searchCustomersByDogName(q.trim());
    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

// 체크인
app.post('/api/checkin', (req, res) => {
  try {
    const { customer_id } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: '고객을 선택해주세요.' });
    }

    // 고객 찾기
    const customer = findCustomerById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: '등록되지 않은 고객입니다.' });
    }

    // 이미 체크인 중인지 확인
    const currentVisit = getCustomerCurrentVisit(customer.id);
    if (currentVisit) {
      return res.status(400).json({ error: '이미 체크인 중입니다.' });
    }

    // 체크인
    const result = checkIn(customer.id);
    res.json({ 
      success: true, 
      visit_id: result.lastInsertRowid,
      customer: customer,
      message: `${customer.dog_name} (${customer.customer_name}님) 체크인 완료!`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '체크인 중 오류가 발생했습니다.' });
  }
});

// 체크아웃
app.post('/api/checkout', (req, res) => {
  try {
    const { visit_id } = req.body;
    
    if (!visit_id) {
      return res.status(400).json({ error: '방문 ID가 필요합니다.' });
    }

    // 체크아웃
    checkOut(visit_id);
    res.json({ 
      success: true,
      message: '체크아웃 완료!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '체크아웃 중 오류가 발생했습니다.' });
  }
});

// 현재 체크인 중인 목록
app.get('/api/current-visits', (req, res) => {
  try {
    const visits = getCurrentVisit();
    res.json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '방문 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 방문 기록 (날짜별)
app.get('/api/visit-history', (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    let history;
    
    if (date) {
      // 특정 날짜
      history = getVisitHistory(date, date);
    } else if (startDate && endDate) {
      // 기간
      history = getVisitHistory(startDate, endDate);
    } else {
      // 전체 (최근 200건)
      history = getVisitHistory();
    }
    
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '방문 기록 조회 중 오류가 발생했습니다.' });
  }
});

// 방문 기록이 있는 날짜 목록
app.get('/api/visit-dates', (req, res) => {
  try {
    const dates = getVisitDates();
    res.json(dates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '날짜 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 고객의 방문 기록
app.get('/api/customers/:customerId/visits', (req, res) => {
  try {
    const { customerId } = req.params;
    const history = getCustomerVisitHistory(customerId);
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 방문 기록 조회 중 오류가 발생했습니다.' });
  }
});

// 고객 삭제
app.delete('/api/customers/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    
    // 고객이 존재하는지 확인
    const customer = findCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });
    }
    
    // 체크인 중인지 확인
    const currentVisit = getCustomerCurrentVisit(customerId);
    if (currentVisit) {
      return res.status(400).json({ error: '체크인 중인 고객은 삭제할 수 없습니다. 먼저 체크아웃을 해주세요.' });
    }
    
    deleteCustomer(customerId);
    res.json({ success: true, message: '고객이 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 삭제 중 오류가 발생했습니다.' });
  }
});

// 방문 기록 삭제
app.delete('/api/visits/:visitId', (req, res) => {
  try {
    const { visitId } = req.params;
    deleteVisit(visitId);
    res.json({ success: true, message: '방문 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '방문 기록 삭제 중 오류가 발생했습니다.' });
  }
});

// 삭제된 고객 목록 조회
app.get('/api/trash/customers', (req, res) => {
  try {
    const deletedCustomers = getDeletedCustomers();
    res.json(deletedCustomers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '삭제된 고객 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 삭제된 방문 기록 조회
app.get('/api/trash/visits', (req, res) => {
  try {
    const deletedVisits = getDeletedVisits();
    res.json(deletedVisits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '삭제된 방문 기록 조회 중 오류가 발생했습니다.' });
  }
});

// 고객 복구
app.post('/api/trash/customers/:customerId/restore', (req, res) => {
  try {
    const { customerId } = req.params;
    restoreCustomer(customerId);
    res.json({ success: true, message: '고객이 복구되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 복구 중 오류가 발생했습니다.' });
  }
});

// 방문 기록 복구
app.post('/api/trash/visits/:visitId/restore', (req, res) => {
  try {
    const { visitId } = req.params;
    restoreVisit(visitId);
    res.json({ success: true, message: '방문 기록이 복구되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '방문 기록 복구 중 오류가 발생했습니다.' });
  }
});

// 프로덕션 환경: 빌드된 React 앱 제공
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // 모든 다른 요청은 React 앱으로
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐕 데이케어 관리 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📱 모바일 접속: 같은 WiFi에서 http://[컴퓨터IP]:3000`);
  }
});

