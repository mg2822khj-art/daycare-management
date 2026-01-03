import { useState, useEffect } from 'react'
import axios from 'axios'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

const API_URL = '/api'

function HotelingCalendar({ onRefresh, refreshTrigger }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [reservations, setReservations] = useState([])
  const [currentMonthReservations, setCurrentMonthReservations] = useState([])
  const [currentVisits, setCurrentVisits] = useState([])
  const [dateVisitHistory, setDateVisitHistory] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [checkInReservation, setCheckInReservation] = useState(null)
  const [prepaid, setPrepaid] = useState(false)
  const [prepaidAmount, setPrepaidAmount] = useState('')
  const [checkoutConfirm, setCheckoutConfirm] = useState(null)
  const [feeInfo, setFeeInfo] = useState(null)
  const [editingVisit, setEditingVisit] = useState(null)
  const [editCheckInTime, setEditCheckInTime] = useState('')
  const [editCheckOutTime, setEditCheckOutTime] = useState('')
  
  // 예약 폼 데이터
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    dog_name: '',
    start_date: '',
    end_date: '',
    notes: ''
  })

  // refreshTrigger가 변경되면 데이터 새로고침
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 캘린더: refreshTrigger 감지, 데이터 새로고침', refreshTrigger)
      fetchCurrentVisits()
      fetchMonthReservations(selectedDate)
      fetchDateReservations(selectedDate)
      fetchDateVisitHistory(selectedDate)
    }
  }, [refreshTrigger])

  // 현재 월의 예약 불러오기
  useEffect(() => {
    const loadData = async () => {
      await fetchMonthReservations(selectedDate)
      await fetchCurrentVisits()
    }
    loadData()
  }, [selectedDate])

  // 선택한 날짜의 예약 및 방문 기록 불러오기
  useEffect(() => {
    if (currentMonthReservations.length >= 0) {
      fetchDateReservations(selectedDate)
    }
    fetchDateVisitHistory(selectedDate)
  }, [selectedDate, currentMonthReservations.length])

  // 날짜를 YYYY-MM-DD 형식으로 변환 (로컬 시간대 기준)
  const formatDateToString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 현재 체크인 목록 불러오기
  const fetchCurrentVisits = async () => {
    try {
      const response = await axios.get(`${API_URL}/current-visits`)
      // 호텔링만 필터링하고 배열인지 확인
      if (Array.isArray(response.data)) {
        const hotelingVisits = response.data.filter(visit => visit.visit_type === 'hoteling')
        setCurrentVisits(hotelingVisits)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setCurrentVisits([])
      }
    } catch (error) {
      console.error('체크인 목록 조회 실패:', error)
      setCurrentVisits([])
    }
  }

  const fetchMonthReservations = async (date) => {
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = formatDateToString(new Date(year, month, 1))
      const lastDay = formatDateToString(new Date(year, month + 1, 0))
      
      const response = await axios.get(`${API_URL}/reservations`, {
        params: { start_date: firstDay, end_date: lastDay }
      })
      // 배열인지 확인
      if (Array.isArray(response.data)) {
        setCurrentMonthReservations(response.data)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setCurrentMonthReservations([])
      }
    } catch (error) {
      console.error('예약 조회 실패:', error)
      setCurrentMonthReservations([])
    }
  }

  const fetchDateReservations = (date) => {
    const dateStr = formatDateToString(date)
    const filtered = currentMonthReservations.filter(res => {
      return dateStr >= res.start_date && dateStr <= res.end_date
    })
    setReservations(filtered)
  }

  // 선택한 날짜의 방문 기록 불러오기 (해당 날짜에 이용 중이었던 모든 호텔링)
  const fetchDateVisitHistory = async (date) => {
    try {
      const dateStr = formatDateToString(date)
      const response = await axios.get(`${API_URL}/hoteling-visits-on-date`, {
        params: { date: dateStr }
      })
      console.log('선택한 날짜의 호텔링 이용 기록:', response.data)
      // 응답이 배열인지 확인
      if (Array.isArray(response.data)) {
        setDateVisitHistory(response.data)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setDateVisitHistory([])
      }
    } catch (error) {
      console.error('방문 기록 조회 실패:', error)
      setDateVisitHistory([])
    }
  }

  // 고객 검색
  const handleSearch = async (term) => {
    setSearchTerm(term)
    if (!term || term.trim().length === 0) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await axios.get(`${API_URL}/customers/search/${term.trim()}`)
      // 배열인지 확인
      if (Array.isArray(response.data)) {
        setSearchResults(response.data)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setSearchResults([])
      }
    } catch (error) {
      console.error('검색 실패:', error)
      setSearchResults([])
    }
  }

  // 고객 선택
  const handleSelectCustomer = (customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.customer_name,
      dog_name: customer.dog_name
    })
    setSearchTerm(`${customer.dog_name} (${customer.customer_name})`)
    setSearchResults([])
    setIsSearching(false)
  }

  // 예약 추가 모달 열기
  const handleAddReservation = () => {
    const dateStr = formatDateToString(selectedDate)
    setFormData({
      customer_id: '',
      customer_name: '',
      dog_name: '',
      start_date: dateStr,
      end_date: dateStr,
      notes: ''
    })
    setSearchTerm('')
    setSearchResults([])
    setShowAddModal(true)
  }

  // 예약 수정 모달 열기
  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation)
    setFormData({
      customer_id: reservation.customer_id,
      customer_name: reservation.customer_name,
      dog_name: reservation.dog_name,
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      notes: reservation.notes || ''
    })
    setSearchTerm(`${reservation.dog_name} (${reservation.customer_name})`)
    setShowEditModal(true)
  }

  // 예약 생성
  const handleCreateReservation = async (e) => {
    e.preventDefault()
    
    if (!formData.customer_id) {
      alert('고객을 선택해주세요.')
      return
    }

    try {
      await axios.post(`${API_URL}/reservations`, {
        customer_id: formData.customer_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes
      })
      
      alert('예약이 등록되었습니다.')
      setShowAddModal(false)
      fetchMonthReservations(selectedDate)
      onRefresh() // 호텔링 카테고리에도 반영
    } catch (error) {
      alert(error.response?.data?.error || '예약 등록 중 오류가 발생했습니다.')
    }
  }

  // 예약 수정
  const handleUpdateReservation = async (e) => {
    e.preventDefault()
    
    try {
      await axios.put(`${API_URL}/reservations/${selectedReservation.id}`, {
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes,
        status: 'confirmed'
      })
      
      alert('예약이 수정되었습니다.')
      setShowEditModal(false)
      fetchMonthReservations(selectedDate)
      onRefresh() // 호텔링 카테고리에도 반영
    } catch (error) {
      alert(error.response?.data?.error || '예약 수정 중 오류가 발생했습니다.')
    }
  }

  // 예약 삭제
  const handleDeleteReservation = async (reservationId, dogName) => {
    if (!window.confirm(`"${dogName}"의 예약을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await axios.delete(`${API_URL}/reservations/${reservationId}`)
      alert('예약이 삭제되었습니다.')
      setShowEditModal(false)
      fetchMonthReservations(selectedDate)
      onRefresh() // 호텔링 카테고리에도 반영
    } catch (error) {
      alert(error.response?.data?.error || '예약 삭제 중 오류가 발생했습니다.')
    }
  }

  // 체크인 상태 확인
  const isCheckedIn = (customerId) => {
    return currentVisits.some(visit => 
      visit.customer_id === customerId && visit.visit_type === 'hoteling'
    )
  }

  // 체크인된 visit ID 찾기
  const getVisitId = (customerId) => {
    const visit = currentVisits.find(visit => 
      visit.customer_id === customerId && visit.visit_type === 'hoteling'
    )
    return visit ? visit.id : null
  }

  // 체크인 모달 열기
  const handleCheckIn = (reservation) => {
    setCheckInReservation(reservation)
    setPrepaid(false)
    setPrepaidAmount('')
    setShowCheckInModal(true)
  }

  // 체크인 처리
  const handleConfirmCheckIn = async () => {
    if (!checkInReservation) return

    try {
      const checkInData = {
        customer_id: checkInReservation.customer_id,
        visit_type: 'hoteling'
      }

      // 선결제가 체크된 경우에만 선결제 정보 추가
      if (prepaid) {
        checkInData.prepaid = true
        checkInData.prepaid_amount = parseFloat(prepaidAmount) || 0
      }

      await axios.post(`${API_URL}/checkin`, checkInData)
      
      alert(`${checkInReservation.dog_name} 체크인 완료!`)
      setShowCheckInModal(false)
      setCheckInReservation(null)
      fetchCurrentVisits()
      if (onRefresh) onRefresh() // 호텔링 탭 새로고침
    } catch (error) {
      alert(error.response?.data?.error || '체크인 중 오류가 발생했습니다.')
    }
  }

  // 체크아웃 처리 (요금 계산 포함)
  const handleCheckOut = async (reservation) => {
    const visitId = getVisitId(reservation.customer_id)
    if (!visitId) {
      alert('체크인 정보를 찾을 수 없습니다.')
      return
    }

    try {
      // 요금 계산
      const response = await axios.post(`${API_URL}/checkout/calculate`, {
        visit_id: visitId
      })
      
      if (response.data.success && response.data.fee_info) {
        const visit = currentVisits.find(v => v.id === visitId)
        setCheckoutConfirm({ ...visit, ...reservation })
        setFeeInfo(response.data.fee_info)
        
        // 현재 시간을 체크아웃 시간 기본값으로 설정
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        setEditCheckOutTime(`${year}-${month}-${day}T${hours}:${minutes}`)
        
        return
      }

      // 요금 정보 없으면 바로 체크아웃
      await confirmCheckout(visitId)
    } catch (error) {
      alert(error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.')
    }
  }

  // 체크아웃 확정
  const confirmCheckout = async (visit_id) => {
    try {
      // 수정된 체크아웃 시간을 서버에 전달
      const checkoutData = { visit_id }
      
      if (editCheckOutTime) {
        // datetime-local 형식을 YYYY-MM-DD HH:MM:SS 형식으로 변환
        const [datePart, timePart] = editCheckOutTime.split('T')
        const checkoutTimeStr = `${datePart} ${timePart}:00`
        checkoutData.checkout_time = checkoutTimeStr
      }
      
      await axios.post(`${API_URL}/checkout`, checkoutData)
      
      alert('체크아웃 완료!')
      setCheckoutConfirm(null)
      setFeeInfo(null)
      setEditCheckOutTime('')
      fetchCurrentVisits()
      fetchMonthReservations(selectedDate)
      fetchDateVisitHistory(selectedDate)
      if (onRefresh) onRefresh()
    } catch (error) {
      alert(error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.')
    }
  }

  // 체크아웃 취소
  const cancelCheckout = () => {
    setCheckoutConfirm(null)
    setFeeInfo(null)
    setEditCheckOutTime('')
  }

  // 체크아웃 시간 수정 시 요금 재계산
  const handleCheckOutTimeChange = async (newTime) => {
    setEditCheckOutTime(newTime)
    
    if (!checkoutConfirm || !newTime) return
    
    try {
      // datetime-local 형식을 YYYY-MM-DD HH:MM:SS 형식으로 변환
      const [datePart, timePart] = newTime.split('T')
      const checkoutTimeStr = `${datePart} ${timePart}:00`
      
      const visitId = getVisitId(checkoutConfirm.customer_id)
      if (!visitId) return
      
      // 요금 재계산
      const response = await axios.post(`${API_URL}/checkout/calculate`, {
        visit_id: visitId,
        checkout_time: checkoutTimeStr
      })
      
      if (response.data.success && response.data.fee_info) {
        setFeeInfo(response.data.fee_info)
      }
    } catch (error) {
      console.error('요금 재계산 실패:', error)
    }
  }

  // 체크인 시간 수정
  const handleEditCheckInTime = (visit) => {
    setEditingVisit(visit)
    const checkInDate = new Date(visit.check_in)
    const year = checkInDate.getFullYear()
    const month = String(checkInDate.getMonth() + 1).padStart(2, '0')
    const day = String(checkInDate.getDate()).padStart(2, '0')
    const hours = String(checkInDate.getHours()).padStart(2, '0')
    const minutes = String(checkInDate.getMinutes()).padStart(2, '0')
    setEditCheckInTime(`${year}-${month}-${day}T${hours}:${minutes}`)
  }

  // 체크인 시간 수정 확정
  const handleSaveCheckInTime = async () => {
    if (!editingVisit || !editCheckInTime) return

    try {
      const dateTime = new Date(editCheckInTime)
      const formattedDateTime = dateTime.getFullYear() + '-' +
        String(dateTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(dateTime.getDate()).padStart(2, '0') + ' ' +
        String(dateTime.getHours()).padStart(2, '0') + ':' +
        String(dateTime.getMinutes()).padStart(2, '0') + ':' +
        String(dateTime.getSeconds()).padStart(2, '0')

      await axios.put(`${API_URL}/visits/${editingVisit.id}/checkin-time`, {
        check_in_time: formattedDateTime
      })

      alert('체크인 시간이 수정되었습니다.')
      setEditingVisit(null)
      setEditCheckInTime('')
      fetchCurrentVisits()
      fetchMonthReservations(selectedDate) // 캘린더 갱신
      if (onRefresh) onRefresh()
    } catch (error) {
      alert(error.response?.data?.error || '시간 수정 중 오류가 발생했습니다.')
    }
  }

  // 시간 수정 취소
  const handleCancelEdit = () => {
    setEditingVisit(null)
    setEditCheckInTime('')
  }

  // 날짜/시간 포맷팅
  const formatDateTime = (datetime) => {
    const date = new Date(datetime)
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 경과 시간 계산
  const getElapsedTime = (checkIn) => {
    const start = new Date(checkIn)
    const now = new Date()
    const diff = now - start
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}시간 ${minutes}분`
  }

  // 캘린더 타일에 예약 표시
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDateToString(date)
      const count = currentMonthReservations.filter(res => {
        return dateStr >= res.start_date && dateStr <= res.end_date
      }).length

      if (count > 0) {
        return (
          <div style={{
            background: '#667eea',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            margin: '2px auto 0'
          }}>
            {count}
          </div>
        )
      }
    }
    return null
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateNights = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        🗓️ 호텔링 예약 캘린더
      </h2>

      {/* 캘린더 영역 (맨 위) */}
      <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
          locale="ko-KR"
          onActiveStartDateChange={({ activeStartDate }) => {
            if (activeStartDate) {
              fetchMonthReservations(activeStartDate)
            }
          }}
        />
        
        <button
          className="btn btn-primary"
          onClick={handleAddReservation}
          style={{ 
            marginTop: '20px',
            padding: '12px 30px',
            fontSize: '1rem'
          }}
        >
          ➕ 예약 추가
        </button>
      </div>

      {/* 현재 체크인 중인 목록 */}
      {Array.isArray(currentVisits) && currentVisits.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '12px', border: '2px solid #667eea' }}>
          <h3 style={{ color: '#667eea', marginBottom: '15px' }}>
            🏠 현재 호텔링 중 ({currentVisits.length}마리)
          </h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {currentVisits.map((visit) => (
              <div
                key={visit.id}
                style={{
                  padding: '15px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                      🐕 {visit.dog_name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                      <div>보호자: {visit.customer_name}</div>
                      <div>체크인: {formatDateTime(visit.check_in)}</div>
                      <div>경과시간: {getElapsedTime(visit.check_in)}</div>
                      {visit.prepaid && visit.prepaid_amount > 0 && (
                        <div style={{ color: '#f57c00', fontWeight: '600', marginTop: '5px' }}>
                          💰 선결제: {visit.prepaid_amount.toLocaleString()}원
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    className="btn"
                    onClick={() => handleEditCheckInTime(visit)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#6c757d',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  >
                    ⏰ 시간 수정
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      const reservation = { dog_name: visit.dog_name, customer_id: visit.customer_id }
                      handleCheckOut(reservation)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '0.9rem'
                    }}
                  >
                    🚪 체크아웃
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택한 날짜의 예약 목록 */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#667eea', marginBottom: '15px' }}>
          📋 {formatDate(formatDateToString(selectedDate))} 예약 및 이용 내역
        </h3>

        {/* 예약 목록 */}
        {Array.isArray(reservations) && reservations.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#667eea', marginBottom: '10px', fontSize: '1rem' }}>
              📅 예약 목록
            </h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {reservations.map(reservation => {
                const checkedIn = isCheckedIn(reservation.customer_id)
                return (
                  <div
                    key={reservation.id}
                    style={{
                      padding: '15px',
                      background: checkedIn ? '#e7ffe7' : '#f8f9fa',
                      borderRadius: '8px',
                      border: `2px solid ${checkedIn ? '#28a745' : '#667eea'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleEditReservation(reservation)}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          🐕 {reservation.dog_name}
                        </div>
                        {checkedIn && (
                          <span style={{
                            background: '#28a745',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            체크인 중
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#666', marginBottom: '5px' }}>
                        보호자: {reservation.customer_name}
                      </div>
                      <div style={{ color: '#666', marginBottom: '5px' }}>
                        견종: {reservation.breed}
                      </div>
                      <div style={{ color: '#667eea', fontWeight: '600', marginBottom: '5px' }}>
                        {formatDate(reservation.start_date)} ~ {formatDate(reservation.end_date)}
                        ({calculateNights(reservation.start_date, reservation.end_date)}박)
                      </div>
                      {reservation.notes && (
                        <div style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}>
                          📝 {reservation.notes}
                        </div>
                      )}
                    </div>
                    
                    {/* 체크인/체크아웃 버튼 */}
                    <div style={{ 
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #e0e0e0',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      {checkedIn ? (
                        <>
                          <button
                            className="btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              const visit = currentVisits.find(v => v.customer_id === reservation.customer_id)
                              if (visit) handleEditCheckInTime(visit)
                            }}
                            style={{
                              flex: 1,
                              padding: '10px',
                              fontSize: '0.95rem',
                              background: '#6c757d',
                              color: 'white'
                            }}
                          >
                            ⏰ 시간 수정
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCheckOut(reservation)
                            }}
                            style={{
                              flex: 1,
                              padding: '10px',
                              fontSize: '0.95rem'
                            }}
                          >
                            🚪 체크아웃
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-success"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCheckIn(reservation)
                          }}
                          style={{
                            flex: 1,
                            padding: '10px',
                            fontSize: '0.95rem'
                          }}
                        >
                          🏠 체크인
                        </button>
                      )}
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditReservation(reservation)
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '0.95rem',
                          background: '#6c757d',
                          color: 'white'
                        }}
                      >
                        ✏️ 수정
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 방문 기록 (호텔링 이용 완료) */}
        {Array.isArray(dateVisitHistory) && dateVisitHistory.length > 0 && (
          <div>
            <h4 style={{ color: '#28a745', marginBottom: '10px', fontSize: '1rem' }}>
              ✅ {formatDateToString(selectedDate)} 호텔링 이용 내역 ({dateVisitHistory.length}건)
            </h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {dateVisitHistory.map(visit => (
                <div
                  key={visit.id}
                  style={{
                    padding: '15px',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '2px solid #28a745'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                    🐕 {visit.dog_name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                    <div>보호자: {visit.customer_name}</div>
                    <div>견종: {visit.breed}</div>
                    <div>체크인: {formatDateTime(visit.check_in)}</div>
                    <div>체크아웃: {formatDateTime(visit.check_out)}</div>
                    <div style={{ color: '#28a745', fontWeight: '600' }}>
                      이용시간: {Math.floor(visit.duration_minutes / 60)}시간 {visit.duration_minutes % 60}분
                    </div>
                    {visit.prepaid && visit.prepaid_amount > 0 && (
                      <div style={{ color: '#f57c00', fontWeight: '600', marginTop: '5px' }}>
                        💰 선결제: {visit.prepaid_amount.toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 데이터 없을 때 */}
        {reservations.length === 0 && dateVisitHistory.length === 0 && (
          <div className="empty-state">
            <p>이 날짜에 예약 및 이용 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 예약 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>예약 추가</h3>
            
            <form onSubmit={handleCreateReservation}>
              {/* 고객 검색 */}
              <div className="form-group">
                <label>고객 검색 *</label>
                <input
                  type="text"
                  placeholder="반려견 이름, 보호자명, 연락처로 검색"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-input"
                />
                
                {isSearching && Array.isArray(searchResults) && searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(customer => (
                      <div
                        key={customer.id}
                        className="search-result-item"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <strong>{customer.dog_name}</strong> ({customer.breed})
                        <br />
                        <small>{customer.customer_name} - {customer.phone}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 시작일 */}
              <div className="form-group">
                <label>체크인 날짜 *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 종료일 */}
              <div className="form-group">
                <label>체크아웃 날짜 *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 메모 */}
              <div className="form-group">
                <label>메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="특이사항이나 메모를 입력하세요"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  예약 등록
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, background: '#6c757d', color: 'white' }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 예약 수정 모달 */}
      {showEditModal && selectedReservation && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>예약 수정</h3>
            
            <form onSubmit={handleUpdateReservation}>
              {/* 고객 정보 (읽기 전용) */}
              <div className="form-group">
                <label>반려견</label>
                <input
                  type="text"
                  value={`${formData.dog_name} (${formData.customer_name})`}
                  className="form-input"
                  disabled
                  style={{ background: '#f0f0f0' }}
                />
              </div>

              {/* 시작일 */}
              <div className="form-group">
                <label>체크인 날짜 *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 종료일 */}
              <div className="form-group">
                <label>체크아웃 날짜 *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 메모 */}
              <div className="form-group">
                <label>메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="특이사항이나 메모를 입력하세요"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  수정 완료
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteReservation(selectedReservation.id, selectedReservation.dog_name)}
                  style={{ flex: 1 }}
                >
                  삭제
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, background: '#6c757d', color: 'white' }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 체크인 모달 */}
      {showCheckInModal && checkInReservation && (
        <div className="modal-overlay" onClick={() => setShowCheckInModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>호텔링 체크인</h3>
            
            <div style={{ 
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px' }}>
                🐕 {checkInReservation.dog_name}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                보호자: {checkInReservation.customer_name}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                견종: {checkInReservation.breed}
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              background: 'white', 
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              marginBottom: '20px'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                cursor: 'pointer',
                marginBottom: prepaid ? '15px' : '0'
              }}>
                <input
                  type="checkbox"
                  checked={prepaid}
                  onChange={(e) => {
                    setPrepaid(e.target.checked)
                    if (!e.target.checked) {
                      setPrepaidAmount('')
                    }
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontWeight: '600', color: '#333', fontSize: '1rem' }}>
                  💰 선결제
                </span>
              </label>

              {prepaid && (
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: '500',
                    color: '#666'
                  }}>
                    선결제 금액
                  </label>
                  <input
                    type="number"
                    value={prepaidAmount}
                    onChange={(e) => setPrepaidAmount(e.target.value)}
                    placeholder="금액을 입력하세요 (원)"
                    className="form-input"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #667eea',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-success"
                onClick={handleConfirmCheckIn}
                style={{ flex: 1 }}
              >
                체크인 완료
              </button>
              <button
                className="btn"
                onClick={() => setShowCheckInModal(false)}
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체크인 시간 수정 모달 */}
      {editingVisit && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>체크인 시간 수정</h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px', color: '#666' }}>
                <strong>{editingVisit.dog_name}</strong> ({editingVisit.customer_name}님)
              </div>
              <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#999' }}>
                현재 체크인 시간: {formatDateTime(editingVisit.check_in)}
              </div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                새로운 체크인 시간
              </label>
              <input
                type="datetime-local"
                value={editCheckInTime}
                onChange={(e) => setEditCheckInTime(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #667eea',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveCheckInTime}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                저장
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn"
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체크아웃 확인 모달 (요금 계산) */}
      {checkoutConfirm && feeInfo && (
        <div className="modal-overlay" onClick={cancelCheckout}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              💰 체크아웃 요금 안내
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                  🐕 {checkoutConfirm.dog_name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  몸무게: {feeInfo.weight ? `${feeInfo.weight}kg` : '정보 없음'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  이용 시간: {Math.floor(feeInfo.duration_minutes / 60)}시간 {feeInfo.duration_minutes % 60}분
                </div>
                
                {/* 체크아웃 시간 수정 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '0.95rem' }}>
                    ⏰ 체크아웃 시간 수정
                  </label>
                  <input
                    type="datetime-local"
                    value={editCheckOutTime}
                    onChange={(e) => handleCheckOutTimeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #667eea',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                    💡 시간을 수정하면 요금이 자동으로 재계산됩니다
                  </div>
                </div>
              </div>

              {/* 호텔링 요금 표시 */}
              {feeInfo.total_fee !== undefined && (
                <div>
                  {/* 요금 계산 상세 */}
                  <div style={{ padding: '20px', background: '#e7f3ff', borderRadius: '8px', marginBottom: '15px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '12px' }}>
                      요금 계산 내역
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.8' }}>
                      {feeInfo.full_days > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span>{feeInfo.full_days}일 × {feeInfo.price_per_day.toLocaleString()}원</span>
                          <span style={{ fontWeight: '600' }}>{(feeInfo.full_days * feeInfo.price_per_day).toLocaleString()}원</span>
                        </div>
                      )}
                      {feeInfo.remaining_minutes > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>초과 시간 ({Math.floor(feeInfo.remaining_minutes / 60)}시간 {feeInfo.remaining_minutes % 60}분)</span>
                            <span style={{ fontWeight: '600' }}>{feeInfo.overtime_fee.toLocaleString()}원</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginLeft: '10px', marginBottom: '5px' }}>
                            (30분당 {feeInfo.price_per_30min.toLocaleString()}원 기준)
                          </div>
                        </div>
                      )}
                      <div style={{ 
                        borderTop: '1px solid #ddd', 
                        marginTop: '10px', 
                        paddingTop: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.95rem'
                      }}>
                        <span style={{ fontWeight: '600' }}>총 요금</span>
                        <span style={{ fontWeight: '600', color: '#1976d2' }}>{feeInfo.total_fee.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>

                  {/* 선결제 및 최종 금액 */}
                  {feeInfo.prepaid_amount > 0 ? (
                    <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '12px' }}>
                        결제 정보
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span>총 요금</span>
                          <span>{feeInfo.total_fee.toLocaleString()}원</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#f57c00' }}>
                          <span>선결제 금액</span>
                          <span>- {feeInfo.prepaid_amount.toLocaleString()}원</span>
                        </div>
                        <div style={{ 
                          borderTop: '2px solid #2e7d32', 
                          marginTop: '10px', 
                          paddingTop: '10px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2e7d32' }}>
                            최종 결제 금액
                          </span>
                          <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2e7d32' }}>
                            {feeInfo.remaining_fee.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                        최종 결제 금액
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2e7d32' }}>
                        {feeInfo.total_fee.toLocaleString()}원
                      </div>
                    </div>
                  )}
                </div>
              )}

              {feeInfo.message && (
                <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                    {feeInfo.message}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cancelCheckout}
                className="btn"
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  const visitId = getVisitId(checkoutConfirm.customer_id)
                  confirmCheckout(visitId)
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                확인 및 체크아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotelingCalendar

