import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createCustomer,
  updateCustomer,
  findCustomersByDogName,
  searchCustomersByDogName,
  findCustomerById,
  getAllCustomers,
  checkIn,
  checkOut,
  checkOutWithTime,
  updateCheckInTime,
  getVisitById,
  calculateDuration,
  calculateDaycareFee,
  calculateHotelingFee,
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
  restoreVisit,
  createReservation,
  getReservationsByDateRange,
  getReservationsByDate,
  getAllReservations,
  getCustomerReservations,
  updateReservation,
  deleteReservation,
  getReservationById
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
    const { customer_name, phone, dog_name, breed, birth_date, weight } = req.body;
    
    // 유효성 검사
    if (!customer_name || !phone || !dog_name || !breed || !birth_date) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    const result = createCustomer(customer_name, phone, dog_name, breed, birth_date, weight || null);
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

// 개별 고객 조회
app.get('/api/customers/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = findCustomerById(customerId);
    
    if (!customer) {
      return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 조회 중 오류가 발생했습니다.' });
  }
});

// 반려견 이름, 고객 이름, 연락처로 고객 검색 (부분 일치)
app.get('/api/customers/search/:searchTerm', (req, res) => {
  try {
    const searchTerm = req.params.searchTerm;
    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.json([]);
    }
    const customers = searchCustomersByDogName(searchTerm.trim());
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

// 체크인 (타입 구분: daycare/hoteling, 선결제 정보)
app.post('/api/checkin', (req, res) => {
  try {
    const { customer_id, visit_type = 'daycare', prepaid = false, prepaid_amount = 0 } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: '고객을 선택해주세요.' });
    }

    if (!['daycare', 'hoteling'].includes(visit_type)) {
      return res.status(400).json({ error: '유효하지 않은 방문 타입입니다.' });
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

    // 선결제 금액 검증
    const finalPrepaidAmount = prepaid && prepaid_amount ? parseFloat(prepaid_amount) : 0;

    // 체크인
    const result = checkIn(customer.id, visit_type, prepaid, finalPrepaidAmount);
    const typeLabel = visit_type === 'daycare' ? '데이케어' : '호텔링';
    res.json({ 
      success: true, 
      visit_id: result.lastInsertRowid,
      customer: customer,
      visit_type: visit_type,
      prepaid: prepaid,
      prepaid_amount: finalPrepaidAmount,
      message: `${customer.dog_name} (${customer.customer_name}님) ${typeLabel} 체크인 완료!`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '체크인 중 오류가 발생했습니다.' });
  }
});

// 체크인 시간 수정
app.put('/api/visits/:visitId/checkin-time', (req, res) => {
  try {
    const { visitId } = req.params;
    const { check_in_time } = req.body;
    
    if (!check_in_time) {
      return res.status(400).json({ error: '체크인 시간을 입력해주세요.' });
    }

    // 날짜 형식 검증 (YYYY-MM-DD HH:MM:SS 형식)
    const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!datePattern.test(check_in_time)) {
      return res.status(400).json({ error: '유효하지 않은 날짜 형식입니다. YYYY-MM-DD HH:MM:SS 형식이어야 합니다.' });
    }

    // 날짜 유효성 검증
    const [datePart, timePart] = check_in_time.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    if (date.getFullYear() !== year || 
        date.getMonth() !== month - 1 || 
        date.getDate() !== day ||
        date.getHours() !== hours ||
        date.getMinutes() !== minutes) {
      return res.status(400).json({ error: '유효하지 않은 날짜/시간입니다.' });
    }

    const success = updateCheckInTime(visitId, check_in_time);
    if (!success) {
      return res.status(400).json({ error: '체크인 시간 수정에 실패했습니다. 이미 체크아웃된 방문이거나 존재하지 않는 방문입니다.' });
    }

    res.json({ 
      success: true,
      message: '체크인 시간이 수정되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '체크인 시간 수정 중 오류가 발생했습니다.' });
  }
});

// 체크아웃 요금 계산 (체크아웃 전)
app.post('/api/checkout/calculate', (req, res) => {
  try {
    const { visit_id, checkout_time } = req.body;
    
    if (!visit_id) {
      return res.status(400).json({ error: '방문 ID가 필요합니다.' });
    }

    // 방문 정보 조회
    const visit = getVisitById(visit_id);
    if (!visit) {
      return res.status(404).json({ error: '방문 정보를 찾을 수 없습니다.' });
    }

    if (visit.check_out) {
      return res.status(400).json({ error: '이미 체크아웃된 방문입니다.' });
    }

    // 체크아웃 시간 계산 (한국 시간 기준)
    let duration_minutes;
    if (checkout_time) {
      // 사용자 지정 체크아웃 시간으로 계산
      const checkInTime = new Date(visit.check_in);
      const checkOutTime = new Date(checkout_time);
      duration_minutes = Math.floor((checkOutTime - checkInTime) / 1000 / 60);
      // 음수 방지
      if (duration_minutes < 0) duration_minutes = 0;
    } else {
      // 데이터베이스 함수를 사용하여 한국 시간으로 계산
      duration_minutes = calculateDuration(visit.check_in);
    }

    // 데이케어 요금 계산
    if (visit.visit_type === 'daycare') {
      const feeInfo = calculateDaycareFee(visit.weight, duration_minutes);
      return res.json({
        success: true,
        visit_type: 'daycare',
        fee_info: feeInfo,
        duration_minutes,
        check_in: visit.check_in,
        checkout_time: checkout_time || null,
        dog_name: visit.dog_name,
        customer_name: visit.customer_name,
        prepaid: visit.prepaid || 0,
        prepaid_amount: visit.prepaid_amount || 0
      });
    } else {
      // 호텔링 요금 계산
      const feeInfo = calculateHotelingFee(visit.weight, duration_minutes, visit.prepaid_amount || 0);
      return res.json({
        success: true,
        visit_type: 'hoteling',
        fee_info: feeInfo,
        duration_minutes,
        check_in: visit.check_in,
        checkout_time: checkout_time || null,
        dog_name: visit.dog_name,
        customer_name: visit.customer_name,
        prepaid: visit.prepaid || 0,
        prepaid_amount: visit.prepaid_amount || 0
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '요금 계산 중 오류가 발생했습니다.' });
  }
});

// 체크아웃
app.post('/api/checkout', (req, res) => {
  try {
    const { visit_id, checkout_time } = req.body;
    
    if (!visit_id) {
      return res.status(400).json({ error: '방문 ID가 필요합니다.' });
    }

    // 사용자 지정 체크아웃 시간이 있으면 그것을 사용, 없으면 현재 시간 사용
    if (checkout_time) {
      checkOutWithTime(visit_id, checkout_time);
    } else {
      checkOut(visit_id);
    }
    
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
    const { visit_type } = req.query; // daycare, hoteling, 또는 all
    const history = getCustomerVisitHistory(customerId);
    
    // 타입 필터링
    if (visit_type && visit_type !== 'all') {
      const filtered = history.filter(v => v.visit_type === visit_type);
      return res.json(filtered);
    }
    
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 방문 기록 조회 중 오류가 발생했습니다.' });
  }
});

// 고객 정보 수정
app.put('/api/customers/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const { customer_name, phone, dog_name, breed, birth_date, weight } = req.body;
    
    // 유효성 검사
    if (!customer_name || !phone || !dog_name || !breed || !birth_date) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 고객 존재 확인
    const customer = findCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ error: '고객을 찾을 수 없습니다.' });
    }

    updateCustomer(customerId, customer_name, phone, dog_name, breed, birth_date, weight || null);
    res.json({ 
      success: true, 
      message: '고객 정보가 수정되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 정보 수정 중 오류가 발생했습니다.' });
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

// ===== 호텔링 예약 API =====

// 예약 생성
app.post('/api/reservations', (req, res) => {
  try {
    const { customer_id, start_date, end_date, notes } = req.body;
    
    if (!customer_id || !start_date || !end_date) {
      return res.status(400).json({ error: '고객, 시작일, 종료일을 입력해주세요.' });
    }

    // 날짜 유효성 검사
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (start > end) {
      return res.status(400).json({ error: '시작일이 종료일보다 늦을 수 없습니다.' });
    }

    // 고객 존재 확인
    const customer = findCustomerById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: '등록되지 않은 고객입니다.' });
    }

    const result = createReservation(customer_id, start_date, end_date, notes || '');
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: '예약이 등록되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '예약 등록 중 오류가 발생했습니다.' });
  }
});

// 모든 예약 조회
app.get('/api/reservations', (req, res) => {
  try {
    const { start_date, end_date, date } = req.query;
    
    let reservations;
    if (date) {
      // 특정 날짜
      reservations = getReservationsByDate(date);
    } else if (start_date && end_date) {
      // 기간 조회
      reservations = getReservationsByDateRange(start_date, end_date);
    } else {
      // 전체 조회
      reservations = getAllReservations();
    }
    
    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '예약 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 예약 조회
app.get('/api/reservations/:reservationId', (req, res) => {
  try {
    const { reservationId } = req.params;
    const reservation = getReservationById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }
    
    res.json(reservation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '예약 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 고객의 예약 조회
app.get('/api/customers/:customerId/reservations', (req, res) => {
  try {
    const { customerId } = req.params;
    const reservations = getCustomerReservations(customerId);
    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객 예약 조회 중 오류가 발생했습니다.' });
  }
});

// 예약 수정
app.put('/api/reservations/:reservationId', (req, res) => {
  try {
    const { reservationId } = req.params;
    const { start_date, end_date, notes, status } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: '시작일과 종료일을 입력해주세요.' });
    }

    // 날짜 유효성 검사
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (start > end) {
      return res.status(400).json({ error: '시작일이 종료일보다 늦을 수 없습니다.' });
    }

    // 예약 존재 확인
    const reservation = getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    updateReservation(reservationId, start_date, end_date, notes || '', status || 'confirmed');
    res.json({ 
      success: true, 
      message: '예약이 수정되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '예약 수정 중 오류가 발생했습니다.' });
  }
});

// 예약 삭제
app.delete('/api/reservations/:reservationId', (req, res) => {
  try {
    const { reservationId } = req.params;
    deleteReservation(reservationId);
    res.json({ success: true, message: '예약이 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '예약 삭제 중 오류가 발생했습니다.' });
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

