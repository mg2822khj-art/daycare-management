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
  updateVisitPrepaid,
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
  createRevenue,
  getAllRevenues,
  getRevenuesByCustomer,
  deleteRevenue,
  updateRevenue,
  getRevenueById,
  createReservation,
  getReservationsByDateRange,
  getReservationsByDate,
  getAllReservations,
  getCustomerReservations,
  updateReservation,
  deleteReservation,
  getReservationById,
  createTransportLog,
  getAllTransportLogs,
  updateTransportLog,
  deleteTransportLog,
  createDisinfectionLog,
  getAllDisinfectionLogs,
  updateDisinfectionLog,
  deleteDisinfectionLog
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const normalizeCheckoutDiscount = (discountRateInput, discountAmountInput) => {
  const rate = Number(discountRateInput || 0);
  const amount = Number(discountAmountInput || 0);

  if (Number.isNaN(rate) || rate < 0 || rate > 100) {
    throw new Error('할인율은 0~100 사이여야 합니다.');
  }
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error('할인금액은 0원 이상이어야 합니다.');
  }
  if (rate > 0 && amount > 0) {
    throw new Error('할인율 또는 할인금액 중 하나만 입력해주세요.');
  }

  return { discount_rate: rate, discount_amount_input: amount };
};

const applyDiscountToBaseAmount = (baseAmount, discountRate, discountAmountInput) => {
  const safeBase = Math.max(0, Number(baseAmount || 0));
  let discountAmount = 0;

  if (discountRate > 0) {
    discountAmount = Math.round((safeBase * discountRate) / 100);
  } else if (discountAmountInput > 0) {
    discountAmount = Math.round(discountAmountInput);
  }

  discountAmount = Math.min(discountAmount, safeBase);
  return {
    discount_amount: discountAmount,
    discounted_amount: Math.max(0, safeBase - discountAmount)
  };
};

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
    console.log('📋 검색 요청 (search):', searchTerm);
    if (!searchTerm || searchTerm.trim().length === 0) {
      console.log('⚠️ 검색어가 비어있습니다.');
      return res.json([]);
    }
    const customers = searchCustomersByDogName(searchTerm.trim());
    console.log(`📋 검색 결과 반환: ${customers.length}건`);
    res.json(customers);
  } catch (error) {
    console.error('❌ 검색 API 오류:', error);
    res.status(500).json({ error: '고객 검색 중 오류가 발생했습니다.' });
  }
});

// 반려견 이름으로 실시간 검색 (부분 일치)
app.get('/api/customers/autocomplete', (req, res) => {
  try {
    const { q } = req.query;
    console.log('🔍 자동완성 검색 요청:', q);
    if (!q || q.trim().length === 0) {
      console.log('⚠️ 자동완성 검색어가 비어있습니다.');
      return res.json([]);
    }
    const customers = searchCustomersByDogName(q.trim());
    console.log(`🔍 자동완성 검색 결과 반환: ${customers.length}건`);
    res.json(customers);
  } catch (error) {
    console.error('❌ 자동완성 검색 API 오류:', error);
    res.status(500).json({ error: '검색 중 오류가 발생했습니다.' });
  }
});

// 체크인 (타입 구분: daycare/hoteling, 선결제 정보 + 매출 연동)
app.post('/api/checkin', (req, res) => {
  try {
    const { 
      customer_id, 
      visit_type = 'daycare', 
      prepaid = false, 
      prepaid_amount = 0,
      prepaid_payment_method
    } = req.body;
    
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

    // 이미 체크인 중인지 확인 (같은 타입의 체크인만 확인)
    const currentVisit = getCustomerCurrentVisit(customer.id);
    if (currentVisit && currentVisit.visit_type === visit_type) {
      return res.status(400).json({ error: `이미 ${visit_type === 'daycare' ? '데이케어' : '호텔링'} 체크인 중입니다.` });
    }

    // 선결제 금액 검증
    const finalPrepaidAmount = prepaid && prepaid_amount ? parseFloat(prepaid_amount) : 0;

    // 호텔링 선결제가 있는 경우 결제 수단 필수
    const validMethods = ['카드', '현금', '계좌이체'];
    if (visit_type === 'hoteling' && finalPrepaidAmount > 0) {
      if (!prepaid_payment_method || !validMethods.includes(prepaid_payment_method)) {
        return res.status(400).json({ error: '선결제 결제 수단을 선택해주세요. (카드/현금/계좌이체)' });
      }
    }

    // 체크인
    const result = checkIn(customer.id, visit_type, prepaid, finalPrepaidAmount);
    const typeLabel = visit_type === 'daycare' ? '데이케어' : '호텔링';

    // 호텔링 선결제 금액을 매출에 즉시 반영
    if (visit_type === 'hoteling' && finalPrepaidAmount > 0) {
      try {
        createRevenue(
          customer.id,
          null, // dog_id는 현재 구조상 별도 테이블이 없으므로 null
          '호텔링',
          prepaid_payment_method,
          finalPrepaidAmount,
          1,
          '호텔링 선결제'
        );
      } catch (revErr) {
        console.error('선결제 매출 등록 중 오류:', revErr);
        // 매출 등록 실패가 체크인 자체를 막지는 않도록 함
      }
    }
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

// 체크인 이후 선결제 정보 수정/취소 (호텔링)
app.put('/api/visits/:visitId/prepaid', (req, res) => {
  try {
    const { visitId } = req.params;
    const { prepaid = false, prepaid_amount = 0 } = req.body;

    const visit = getVisitById(visitId);
    if (!visit) {
      return res.status(404).json({ error: '방문 정보를 찾을 수 없습니다.' });
    }
    if (visit.visit_type !== 'hoteling') {
      return res.status(400).json({ error: '호텔링 방문만 선결제를 수정할 수 있습니다.' });
    }
    if (visit.check_out) {
      return res.status(400).json({ error: '이미 체크아웃된 방문입니다.' });
    }

    const amount = prepaid ? parseFloat(prepaid_amount || 0) : 0;
    if (amount < 0 || Number.isNaN(amount)) {
      return res.status(400).json({ error: '유효한 선결제 금액을 입력해주세요.' });
    }

    const success = updateVisitPrepaid(visitId, prepaid, amount);
    if (!success) {
      return res.status(400).json({ error: '선결제 정보 수정에 실패했습니다.' });
    }

    res.json({
      success: true,
      prepaid: !!prepaid,
      prepaid_amount: amount,
      message: amount > 0 ? '선결제 금액이 수정되었습니다.' : '선결제가 취소되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '선결제 수정 중 오류가 발생했습니다.' });
  }
});

// 체크아웃 요금 계산 (체크아웃 전)
app.post('/api/checkout/calculate', (req, res) => {
  try {
    const { visit_id, checkout_time, discount_rate, discount_amount } = req.body;
    
    if (!visit_id) {
      return res.status(400).json({ error: '방문 ID가 필요합니다.' });
    }

    const discountInfo = normalizeCheckoutDiscount(discount_rate, discount_amount);

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
      const discounted = applyDiscountToBaseAmount(
        feeInfo.fee || 0,
        discountInfo.discount_rate,
        discountInfo.discount_amount_input
      );
      return res.json({
        success: true,
        visit_type: 'daycare',
        fee_info: {
          ...feeInfo,
          original_fee: feeInfo.fee || 0,
          fee: discounted.discounted_amount,
          discount_rate: discountInfo.discount_rate,
          discount_amount_input: discountInfo.discount_amount_input,
          discount_amount: discounted.discount_amount
        },
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
      const discounted = applyDiscountToBaseAmount(
        feeInfo.total_fee || 0,
        discountInfo.discount_rate,
        discountInfo.discount_amount_input
      );
      const prepaidAmount = Number(visit.prepaid_amount || 0);
      const discountedRemainingFee = Math.max(0, discounted.discounted_amount - prepaidAmount);
      return res.json({
        success: true,
        visit_type: 'hoteling',
        fee_info: {
          ...feeInfo,
          original_total_fee: feeInfo.total_fee || 0,
          total_fee: discounted.discounted_amount,
          remaining_fee: discountedRemainingFee,
          discount_rate: discountInfo.discount_rate,
          discount_amount_input: discountInfo.discount_amount_input,
          discount_amount: discounted.discount_amount
        },
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
    if (error.message && error.message.includes('할인')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: '요금 계산 중 오류가 발생했습니다.' });
  }
});

// 체크아웃 (요금 + 매출 자동 반영)
app.post('/api/checkout', (req, res) => {
  try {
    const { visit_id, checkout_time, payment_method, discount_rate, discount_amount } = req.body;
    
    if (!visit_id) {
      return res.status(400).json({ error: '방문 ID가 필요합니다.' });
    }

    const validMethods = ['카드', '현금', '계좌이체'];
    if (!payment_method || !validMethods.includes(payment_method)) {
      return res.status(400).json({ error: '결제 수단을 선택해주세요. (카드/현금/계좌이체)' });
    }

    const discountInfo = normalizeCheckoutDiscount(discount_rate, discount_amount);

    // 방문 정보 조회
    const visit = getVisitById(visit_id);
    if (!visit) {
      return res.status(404).json({ error: '방문 정보를 찾을 수 없습니다.' });
    }

    if (visit.check_out) {
      return res.status(400).json({ error: '이미 체크아웃된 방문입니다.' });
    }

    // 이용 시간 계산 (데이케어/호텔링 공통, 한국 시간 기준)
    let duration_minutes;
    if (checkout_time) {
      const checkInTime = new Date(visit.check_in);
      const checkOutTime = new Date(checkout_time);
      duration_minutes = Math.floor((checkOutTime - checkInTime) / 1000 / 60);
      if (duration_minutes < 0) duration_minutes = 0;
    } else {
      duration_minutes = calculateDuration(visit.check_in);
    }

    // 최종 결제 금액 계산 및 매출 기록
    try {
      let amount = 0;
      let serviceLabel = visit.visit_type === 'daycare' ? '데이케어' : '호텔링';

      if (visit.visit_type === 'daycare') {
        const feeInfo = calculateDaycareFee(visit.weight, duration_minutes);
        const discounted = applyDiscountToBaseAmount(
          feeInfo?.fee || 0,
          discountInfo.discount_rate,
          discountInfo.discount_amount_input
        );
        amount = discounted.discounted_amount;
      } else if (visit.visit_type === 'hoteling') {
        const feeInfo = calculateHotelingFee(visit.weight, duration_minutes, visit.prepaid_amount || 0);
        if (feeInfo) {
          const discounted = applyDiscountToBaseAmount(
            feeInfo.total_fee || 0,
            discountInfo.discount_rate,
            discountInfo.discount_amount_input
          );
          const prepaidAmount = Number(visit.prepaid_amount || 0);
          amount = Math.max(0, discounted.discounted_amount - prepaidAmount);
        }
      }

      if (amount > 0) {
        const discountNote =
          discountInfo.discount_rate > 0
            ? ` (할인율 ${discountInfo.discount_rate}%)`
            : discountInfo.discount_amount_input > 0
              ? ` (할인 ${Math.round(discountInfo.discount_amount_input).toLocaleString()}원)`
              : '';
        createRevenue(
          visit.customer_id,
          null,
          serviceLabel,
          payment_method,
          amount,
          1,
          `${serviceLabel} 체크아웃 자동 매출${discountNote}`
        );
      }
    } catch (revErr) {
      console.error('체크아웃 매출 등록 중 오류:', revErr);
      // 매출 오류가 있어도 체크아웃은 계속 처리
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
    if (error.message && error.message.includes('할인')) {
      return res.status(400).json({ error: error.message });
    }
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
    const {
      customer_id,
      start_date,
      end_date,
      notes,
      prepaid = false,
      prepaid_amount = 0,
      prepaid_payment_method
    } = req.body;
    
    if (!customer_id || !start_date || !end_date) {
      return res.status(400).json({ error: '고객, 시작일, 종료일을 입력해주세요.' });
    }

    // 날짜 유효성 검사
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (start > end) {
      return res.status(400).json({ error: '시작일이 종료일보다 늦을 수 없습니다.' });
    }

    const parsedPrepaidAmount = prepaid ? parseFloat(prepaid_amount || 0) : 0;
    if (Number.isNaN(parsedPrepaidAmount) || parsedPrepaidAmount < 0) {
      return res.status(400).json({ error: '유효한 선결제 금액을 입력해주세요.' });
    }

    const validMethods = ['카드', '현금', '계좌이체'];
    if (parsedPrepaidAmount > 0 && (!prepaid_payment_method || !validMethods.includes(prepaid_payment_method))) {
      return res.status(400).json({ error: '선결제 결제 수단을 선택해주세요. (카드/현금/계좌이체)' });
    }

    // 고객 존재 확인
    const customer = findCustomerById(customer_id);
    if (!customer) {
      return res.status(404).json({ error: '등록되지 않은 고객입니다.' });
    }

    const result = createReservation(
      customer_id,
      start_date,
      end_date,
      notes || '',
      parsedPrepaidAmount > 0,
      parsedPrepaidAmount,
      parsedPrepaidAmount > 0 ? (prepaid_payment_method || null) : null
    );
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: '예약이 등록되었습니다.'
    });
  } catch (error) {
    console.error('예약 생성 오류:', error);
    res.status(500).json({ 
      error: error.message || '예약 등록 중 오류가 발생했습니다.',
      // 개발 환경에서는 상세 스택도 같이 전달
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// 진행 중 호텔링의 종료 예정일 설정(예약 업서트)
app.post('/api/hoteling/planned-checkout', (req, res) => {
  try {
    const { customer_id, end_date } = req.body;

    if (!customer_id || !end_date) {
      return res.status(400).json({ error: '고객과 종료 예정일을 입력해주세요.' });
    }

    const currentVisit = getCustomerCurrentVisit(customer_id);
    if (!currentVisit || currentVisit.visit_type !== 'hoteling') {
      return res.status(400).json({ error: '진행 중인 호텔링 체크인 정보를 찾을 수 없습니다.' });
    }

    const visitStartDate = String(currentVisit.check_in || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitStartDate)) {
      return res.status(400).json({ error: '체크인 날짜를 확인할 수 없습니다.' });
    }

    const start = new Date(visitStartDate);
    const end = new Date(end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: '유효한 날짜를 입력해주세요.' });
    }
    if (end < start) {
      return res.status(400).json({ error: '종료 예정일은 체크인 날짜보다 빠를 수 없습니다.' });
    }

    const reservations = getCustomerReservations(customer_id);
    const coveringReservation = reservations.find(
      (r) => r.start_date <= visitStartDate && r.end_date >= visitStartDate
    );

    if (coveringReservation) {
      const newStartDate = coveringReservation.start_date < visitStartDate
        ? coveringReservation.start_date
        : visitStartDate;

      updateReservation(
        coveringReservation.id,
        newStartDate,
        end_date,
        coveringReservation.notes || '진행 중 호텔링 기간 설정',
        coveringReservation.status || 'confirmed',
        Boolean(coveringReservation.prepaid) || Number(coveringReservation.prepaid_amount || 0) > 0,
        Number(coveringReservation.prepaid_amount || 0),
        coveringReservation.prepaid_payment_method || null
      );

      return res.json({
        success: true,
        mode: 'updated',
        reservation_id: coveringReservation.id,
        start_date: newStartDate,
        end_date,
        message: '진행 중 호텔링 종료 예정일이 저장되었습니다.'
      });
    }

    const result = createReservation(
      customer_id,
      visitStartDate,
      end_date,
      '진행 중 호텔링 기간 설정',
      false,
      0,
      null
    );

    return res.json({
      success: true,
      mode: 'created',
      reservation_id: result.lastInsertRowid,
      start_date: visitStartDate,
      end_date,
      message: '진행 중 호텔링 예약 기간이 생성되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '호텔링 종료 예정일 저장 중 오류가 발생했습니다.' });
  }
});

// 예약 수정
app.put('/api/reservations/:reservationId', (req, res) => {
  try {
    const { reservationId } = req.params;
    const {
      start_date,
      end_date,
      notes,
      status,
      prepaid = false,
      prepaid_amount = 0,
      prepaid_payment_method
    } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: '시작일과 종료일을 입력해주세요.' });
    }

    // 날짜 유효성 검사
    const start = new Date(start_date);
    const end = new Date(end_date);
    if (start > end) {
      return res.status(400).json({ error: '시작일이 종료일보다 늦을 수 없습니다.' });
    }

    const parsedPrepaidAmount = prepaid ? parseFloat(prepaid_amount || 0) : 0;
    if (Number.isNaN(parsedPrepaidAmount) || parsedPrepaidAmount < 0) {
      return res.status(400).json({ error: '유효한 선결제 금액을 입력해주세요.' });
    }

    const validMethods = ['카드', '현금', '계좌이체'];
    if (parsedPrepaidAmount > 0 && (!prepaid_payment_method || !validMethods.includes(prepaid_payment_method))) {
      return res.status(400).json({ error: '선결제 결제 수단을 선택해주세요. (카드/현금/계좌이체)' });
    }

    // 예약 존재 확인
    const reservation = getReservationById(reservationId);
    if (!reservation) {
      return res.status(404).json({ error: '예약을 찾을 수 없습니다.' });
    }

    updateReservation(
      reservationId,
      start_date,
      end_date,
      notes || '',
      status || 'confirmed',
      parsedPrepaidAmount > 0,
      parsedPrepaidAmount,
      parsedPrepaidAmount > 0 ? (prepaid_payment_method || null) : null
    );
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

// 매출 등록
app.post('/api/revenues', (req, res) => {
  try {
    const { customer_id, dog_id, service_type, payment_method, amount, sessions, notes, revenue_date } = req.body;
    
    if (!customer_id || !service_type || !payment_method || !amount) {
      return res.status(400).json({ error: '필수 정보를 입력해주세요.' });
    }

    if (!['유치원', '데이케어', '호텔링', '목욕'].includes(service_type)) {
      return res.status(400).json({ error: '유효하지 않은 서비스 타입입니다.' });
    }

    if (!['카드', '현금', '계좌이체'].includes(payment_method)) {
      return res.status(400).json({ error: '유효하지 않은 결제 수단입니다.' });
    }

    // 날짜가 제공되면 시간까지 포함한 형식으로 변환
    let formattedDate = null;
    if (revenue_date) {
      // 날짜만 제공되면 시간 추가 (한국 시간 기준)
      if (revenue_date.length === 10) {
        formattedDate = `${revenue_date} 00:00:00`;
      } else {
        formattedDate = revenue_date;
      }
    }

    const result = createRevenue(
      customer_id,
      dog_id || null,
      service_type,
      payment_method,
      parseFloat(amount),
      service_type === '유치원' ? (sessions || 1) : 1,
      notes || '',
      formattedDate
    );
    
    res.json({ 
      success: true, 
      id: result.lastInsertRowid,
      message: '매출이 등록되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '매출 등록 중 오류가 발생했습니다.' });
  }
});

// 모든 매출 조회
app.get('/api/revenues', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const revenues = getAllRevenues(start_date || null, end_date || null);
    res.json(revenues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '매출 조회 중 오류가 발생했습니다.' });
  }
});

// 고객별 매출 조회
app.get('/api/revenues/customer/:customerId', (req, res) => {
  try {
    const { customerId } = req.params;
    const revenues = getRevenuesByCustomer(customerId);
    res.json(revenues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '고객별 매출 조회 중 오류가 발생했습니다.' });
  }
});

// 매출 수정
app.put('/api/revenues/:revenueId', (req, res) => {
  try {
    const { revenueId } = req.params;
    const { customer_id, dog_id, service_type, payment_method, amount, sessions, notes, revenue_date } = req.body;
    
    if (!customer_id || !service_type || !payment_method || !amount) {
      return res.status(400).json({ error: '필수 정보를 입력해주세요.' });
    }

    if (!['유치원', '데이케어', '호텔링', '목욕'].includes(service_type)) {
      return res.status(400).json({ error: '유효하지 않은 서비스 타입입니다.' });
    }

    if (!['카드', '현금', '계좌이체'].includes(payment_method)) {
      return res.status(400).json({ error: '유효하지 않은 결제 수단입니다.' });
    }

    // 날짜가 제공되면 시간까지 포함한 형식으로 변환
    let formattedDate = null;
    if (revenue_date) {
      // 날짜만 제공되면 시간 추가 (한국 시간 기준)
      if (revenue_date.length === 10) {
        formattedDate = `${revenue_date} 00:00:00`;
      } else {
        formattedDate = revenue_date;
      }
    }

    updateRevenue(
      revenueId,
      customer_id,
      dog_id || null,
      service_type,
      payment_method,
      parseFloat(amount),
      service_type === '유치원' ? (sessions || 1) : 1,
      notes || '',
      formattedDate
    );
    
    res.json({ 
      success: true, 
      message: '매출이 수정되었습니다.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '매출 수정 중 오류가 발생했습니다.' });
  }
});

// 매출 상세 조회
app.get('/api/revenues/:revenueId', (req, res) => {
  try {
    const { revenueId } = req.params;
    const revenue = getRevenueById(revenueId);
    
    if (!revenue) {
      return res.status(404).json({ error: '매출을 찾을 수 없습니다.' });
    }
    
    res.json(revenue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '매출 조회 중 오류가 발생했습니다.' });
  }
});

// 매출 삭제
app.delete('/api/revenues/:revenueId', (req, res) => {
  try {
    const { revenueId } = req.params;
    deleteRevenue(revenueId);
    res.json({ success: true, message: '매출이 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '매출 삭제 중 오류가 발생했습니다.' });
  }
});

// ─── 운송일지 API ─────────────────────────────────────────────────────────────

app.post('/api/transport-logs', (req, res) => {
  try {
    const { log_date, vehicle_number, driver_name, route_type, dogs_info, notes } = req.body;
    if (!log_date || !vehicle_number || !driver_name || !route_type) {
      return res.status(400).json({ error: '날짜, 차량번호, 운전자, 구분은 필수입니다.' });
    }
    const id = createTransportLog({ log_date, vehicle_number, driver_name, route_type, dogs_info, notes });
    res.json({ success: true, id, message: '운송일지가 등록되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '운송일지 등록 중 오류가 발생했습니다.' });
  }
});

app.get('/api/transport-logs', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const logs = getAllTransportLogs({ start_date, end_date });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '운송일지 조회 중 오류가 발생했습니다.' });
  }
});

app.put('/api/transport-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { log_date, vehicle_number, driver_name, route_type, dogs_info, notes } = req.body;
    if (!log_date || !vehicle_number || !driver_name || !route_type) {
      return res.status(400).json({ error: '날짜, 차량번호, 운전자, 구분은 필수입니다.' });
    }
    updateTransportLog(id, { log_date, vehicle_number, driver_name, route_type, dogs_info, notes });
    res.json({ success: true, message: '운송일지가 수정되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '운송일지 수정 중 오류가 발생했습니다.' });
  }
});

app.delete('/api/transport-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteTransportLog(id);
    res.json({ success: true, message: '운송일지가 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '운송일지 삭제 중 오류가 발생했습니다.' });
  }
});

// ─── 소독일지 API ─────────────────────────────────────────────────────────────

app.post('/api/disinfection-logs', (req, res) => {
  try {
    const { log_date, disinfection_area, disinfectant, method, manager, notes } = req.body;
    if (!log_date || !disinfection_area || !disinfectant || !method || !manager) {
      return res.status(400).json({ error: '날짜, 소독구역, 소독약품, 소독방법, 담당자는 필수입니다.' });
    }
    const id = createDisinfectionLog({ log_date, disinfection_area, disinfectant, method, manager, notes });
    res.json({ success: true, id, message: '소독일지가 등록되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '소독일지 등록 중 오류가 발생했습니다.' });
  }
});

app.get('/api/disinfection-logs', (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const logs = getAllDisinfectionLogs({ start_date, end_date });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '소독일지 조회 중 오류가 발생했습니다.' });
  }
});

app.put('/api/disinfection-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { log_date, disinfection_area, disinfectant, method, manager, notes } = req.body;
    if (!log_date || !disinfection_area || !disinfectant || !method || !manager) {
      return res.status(400).json({ error: '날짜, 소독구역, 소독약품, 소독방법, 담당자는 필수입니다.' });
    }
    updateDisinfectionLog(id, { log_date, disinfection_area, disinfectant, method, manager, notes });
    res.json({ success: true, message: '소독일지가 수정되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '소독일지 수정 중 오류가 발생했습니다.' });
  }
});

app.delete('/api/disinfection-logs/:id', (req, res) => {
  try {
    const { id } = req.params;
    deleteDisinfectionLog(id);
    res.json({ success: true, message: '소독일지가 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '소독일지 삭제 중 오류가 발생했습니다.' });
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

