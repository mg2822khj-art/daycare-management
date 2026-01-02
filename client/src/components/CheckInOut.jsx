import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = '/api'

function CheckInOut({ visitType = 'daycare', currentVisits, onRefresh }) {
  const typeLabel = visitType === 'daycare' ? '데이케어' : '호텔링'
  const typeEmoji = visitType === 'daycare' ? '☀️' : '🌙'
  
  const [dogName, setDogName] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [autoCompleteResults, setAutoCompleteResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [showAutoComplete, setShowAutoComplete] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)
  const [editCheckInTime, setEditCheckInTime] = useState('')
  const [checkoutConfirm, setCheckoutConfirm] = useState(null)
  const [feeInfo, setFeeInfo] = useState(null)
  const [editCheckOutTime, setEditCheckOutTime] = useState('')
  const [prepaid, setPrepaid] = useState(false)
  const [prepaidAmount, setPrepaidAmount] = useState('')
  const [todayReservations, setTodayReservations] = useState([])
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [reservationForm, setReservationForm] = useState({
    customer_id: '',
    customer_name: '',
    dog_name: '',
    start_date: '',
    end_date: '',
    notes: ''
  })
  const autoCompleteRef = useRef(null)

  // 현재 타입의 방문만 필터링
  const filteredVisits = currentVisits.filter(visit => visit.visit_type === visitType)

  // 호텔링일 때 오늘의 예약 불러오기
  useEffect(() => {
    if (visitType === 'hoteling') {
      fetchTodayReservations()
    }
  }, [visitType])

  const fetchTodayReservations = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await axios.get(`${API_URL}/reservations`, {
        params: { date: today }
      })
      setTodayReservations(response.data)
    } catch (error) {
      console.error('예약 조회 실패:', error)
    }
  }

  // 체크인 상태 확인
  const isCheckedIn = (customerId) => {
    return currentVisits.some(visit => 
      visit.customer_id === customerId && visit.visit_type === 'hoteling'
    )
  }

  // 실시간 자동완성 검색 (즉시 반응)
  useEffect(() => {
    const searchAutoComplete = async () => {
      if (dogName.trim().length === 0) {
        setAutoCompleteResults([])
        setShowAutoComplete(false)
        return
      }

      // 최소 1글자 이상 입력 시 즉시 검색
      if (dogName.trim().length < 1) {
        setAutoCompleteResults([])
        setShowAutoComplete(false)
        return
      }

      try {
        const response = await axios.get(`${API_URL}/customers/autocomplete?q=${encodeURIComponent(dogName.trim())}`)
        setAutoCompleteResults(response.data)
        setShowAutoComplete(response.data.length > 0)
      } catch (error) {
        console.error('자동완성 검색 실패:', error)
        setAutoCompleteResults([])
        setShowAutoComplete(false)
      }
    }

    // 딜레이를 줄여서 더 빠르게 반응 (150ms)
    const timeoutId = setTimeout(searchAutoComplete, 150)
    return () => clearTimeout(timeoutId)
  }, [dogName])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autoCompleteRef.current && !autoCompleteRef.current.contains(event.target)) {
        setShowAutoComplete(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!dogName.trim()) return

    setIsLoading(true)
    setMessage({ type: '', text: '' })
    setShowAutoComplete(false)

    try {
      const response = await axios.get(`${API_URL}/customers/search/${dogName.trim()}`)
      setSearchResults(response.data)
      setShowResults(true)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '검색 중 오류가 발생했습니다.'
      })
      setSearchResults([])
      setShowResults(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutoCompleteSelect = (customer) => {
    setDogName(customer.dog_name)
    setShowAutoComplete(false)
    setSearchResults([customer])
    setShowResults(true)
  }

  const handleAutoCompleteCheckIn = async (customer, e) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    setShowAutoComplete(false)
    await handleCheckIn(customer)
  }

  const handleCheckIn = async (customer) => {
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const checkInData = {
        customer_id: customer.id,
        visit_type: visitType
      }

      // 호텔링이고 선결제가 체크된 경우에만 선결제 정보 추가
      if (visitType === 'hoteling' && prepaid) {
        checkInData.prepaid = true
        checkInData.prepaid_amount = parseFloat(prepaidAmount) || 0
      }

      const response = await axios.post(`${API_URL}/checkin`, checkInData)

      setMessage({ type: 'success', text: response.data.message })
      setDogName('')
      setSearchResults([])
      setShowResults(false)
      setAutoCompleteResults([])
      setPrepaid(false)
      setPrepaidAmount('')
      onRefresh()
      if (visitType === 'hoteling') {
        fetchTodayReservations() // 예약 목록 새로고침
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '체크인 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 예약에서 체크인
  const handleReservationCheckIn = (reservation) => {
    setSelectedReservation(reservation)
    setPrepaid(false)
    setPrepaidAmount('')
    setShowCheckInModal(true)
  }

  // 예약 체크인 확인
  const handleConfirmReservationCheckIn = async () => {
    if (!selectedReservation) return

    try {
      const checkInData = {
        customer_id: selectedReservation.customer_id,
        visit_type: 'hoteling'
      }

      if (prepaid) {
        checkInData.prepaid = true
        checkInData.prepaid_amount = parseFloat(prepaidAmount) || 0
      }

      await axios.post(`${API_URL}/checkin`, checkInData)
      
      setMessage({ type: 'success', text: `${selectedReservation.dog_name} 체크인 완료!` })
      setShowCheckInModal(false)
      setSelectedReservation(null)
      setPrepaid(false)
      setPrepaidAmount('')
      onRefresh()
      fetchTodayReservations()
    } catch (error) {
      alert(error.response?.data?.error || '체크인 중 오류가 발생했습니다.')
    }
  }

  // 예약 추가 모달 열기
  const handleAddReservation = () => {
    const today = new Date().toISOString().split('T')[0]
    setReservationForm({
      customer_id: '',
      customer_name: '',
      dog_name: '',
      start_date: today,
      end_date: today,
      notes: ''
    })
    setDogName('')
    setSearchResults([])
    setAutoCompleteResults([])
    setShowAutoComplete(false)
    setShowReservationModal(true)
  }

  // 예약 추가
  const handleCreateReservation = async (e) => {
    e.preventDefault()
    
    if (!reservationForm.customer_id) {
      alert('고객을 선택해주세요.')
      return
    }

    try {
      await axios.post(`${API_URL}/reservations`, {
        customer_id: reservationForm.customer_id,
        start_date: reservationForm.start_date,
        end_date: reservationForm.end_date,
        notes: reservationForm.notes
      })
      
      setMessage({ type: 'success', text: '예약이 등록되었습니다.' })
      setShowReservationModal(false)
      setShowAutoComplete(false)
      setAutoCompleteResults([])
      setDogName('')
      fetchTodayReservations()
    } catch (error) {
      alert(error.response?.data?.error || '예약 등록 중 오류가 발생했습니다.')
    }
  }

  // 예약 삭제
  const handleDeleteReservation = async (reservationId, dogName) => {
    if (!window.confirm(`"${dogName}"의 예약을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await axios.delete(`${API_URL}/reservations/${reservationId}`)
      setMessage({ type: 'success', text: '예약이 삭제되었습니다.' })
      fetchTodayReservations()
    } catch (error) {
      alert(error.response?.data?.error || '예약 삭제 중 오류가 발생했습니다.')
    }
  }

  // 예약 폼에서 고객 선택
  const handleSelectCustomerForReservation = (customer) => {
    setReservationForm({
      ...reservationForm,
      customer_id: customer.id,
      customer_name: customer.customer_name,
      dog_name: customer.dog_name
    })
    setDogName('')  // 선택 후 입력 필드 초기화
    setSearchResults([])
    setAutoCompleteResults([])
    setShowAutoComplete(false)
  }

  const handleCheckOut = async (visit) => {
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // 요금 계산 (데이케어, 호텔링 모두)
      const response = await axios.post(`${API_URL}/checkout/calculate`, {
        visit_id: visit.id
      })
      
      if (response.data.success && response.data.fee_info) {
        setCheckoutConfirm(visit)
        setFeeInfo(response.data.fee_info)
        
        // 현재 시간을 체크아웃 시간 기본값으로 설정
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        setEditCheckOutTime(`${year}-${month}-${day}T${hours}:${minutes}`)
        
        setIsLoading(false)
        return
      }

      // 요금 정보가 없는 경우 바로 체크아웃
      await confirmCheckout(visit.id)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.'
      })
      setIsLoading(false)
    }
  }

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
      
      const response = await axios.post(`${API_URL}/checkout`, checkoutData)

      setMessage({ type: 'success', text: response.data.message })
      setCheckoutConfirm(null)
      setFeeInfo(null)
      setEditCheckOutTime('')
      onRefresh()
      if (visitType === 'hoteling') {
        fetchTodayReservations() // 예약 목록 갱신
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelCheckout = () => {
    setCheckoutConfirm(null)
    setFeeInfo(null)
    setEditCheckOutTime('')
    setIsLoading(false)
  }

  // 체크아웃 시간 수정 시 요금 재계산
  const handleCheckOutTimeChange = async (newTime) => {
    setEditCheckOutTime(newTime)
    
    if (!checkoutConfirm || !newTime) return
    
    try {
      // datetime-local 형식을 YYYY-MM-DD HH:MM:SS 형식으로 변환
      const [datePart, timePart] = newTime.split('T')
      const checkoutTimeStr = `${datePart} ${timePart}:00`
      
      // 요금 재계산
      const response = await axios.post(`${API_URL}/checkout/calculate`, {
        visit_id: checkoutConfirm.id,
        checkout_time: checkoutTimeStr
      })
      
      if (response.data.success && response.data.fee_info) {
        setFeeInfo(response.data.fee_info)
      }
    } catch (error) {
      console.error('요금 재계산 실패:', error)
    }
  }

  const handleEditCheckInTime = (visit) => {
    // 체크인 시간을 datetime-local 형식으로 변환
    // 서버에서 받은 시간 문자열 (YYYY-MM-DD HH:MM:SS)을 그대로 파싱
    const timeString = visit.check_in
    const [datePart, timePart] = timeString.split(' ')
    const [year, month, day] = datePart.split('-')
    const [hours, minutes] = timePart.split(':')
    
    // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:MM)
    const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`
    
    setEditingVisit(visit)
    setEditCheckInTime(datetimeLocal)
  }

  const handleSaveCheckInTime = async () => {
    if (!editingVisit || !editCheckInTime) return

    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // datetime-local 형식 (YYYY-MM-DDTHH:MM)을 한국 시간 문자열로 변환
      // 입력받은 시간을 한국 시간으로 직접 해석 (로컬 시간대 무시)
      const [datePart, timePart] = editCheckInTime.split('T')
      const [year, month, day] = datePart.split('-')
      const [hours, minutes] = timePart.split(':')
      
      // YYYY-MM-DD HH:MM:SS 형식으로 변환 (한국 시간으로 직접 저장)
      const kstString = `${year}-${month}-${day} ${hours}:${minutes}:00`

      const response = await axios.put(`${API_URL}/visits/${editingVisit.id}/checkin-time`, {
        check_in_time: kstString
      })

      setMessage({ type: 'success', text: response.data.message })
      setEditingVisit(null)
      setEditCheckInTime('')
      onRefresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '체크인 시간 수정 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingVisit(null)
    setEditCheckInTime('')
  }

  const formatDateTime = (datetime) => {
    const date = new Date(datetime)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getElapsedTime = (checkIn) => {
    const start = new Date(checkIn)
    const now = new Date()
    const diff = Math.floor((now - start) / 1000 / 60)
    
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#333' }}>
          {typeEmoji} {typeLabel} 빠른 체크인
        </h2>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSearch}>
          <div style={{ position: 'relative' }} ref={autoCompleteRef}>
            <div className="checkin-input-group">
              <input
                type="text"
                value={dogName}
                onChange={(e) => {
                  setDogName(e.target.value)
                  setShowResults(false) // 입력 시 검색 결과 숨김
                }}
                onFocus={() => {
                  if (autoCompleteResults.length > 0) {
                    setShowAutoComplete(true)
                  }
                }}
                placeholder="반려견 이름, 보호자 이름, 연락처를 입력하세요"
                disabled={isLoading}
                autoComplete="off"
                style={{ width: '100%' }}
              />
              <button
                type="submit"
                className="btn btn-success"
                disabled={isLoading || !dogName.trim()}
              >
                {isLoading ? '검색 중...' : '검색'}
              </button>
            </div>

            {/* 자동완성 드롭다운 - 스크롤 가능 */}
            {showAutoComplete && autoCompleteResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '8px',
                marginTop: '5px',
                maxHeight: '400px',
                overflowY: 'auto',
                overflowX: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                WebkitOverflowScrolling: 'touch' // iOS 부드러운 스크롤
              }}>
                {autoCompleteResults.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleAutoCompleteSelect(customer)}
                    style={{
                      padding: '15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e0e0e0',
                      transition: 'background 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: '600', color: '#667eea', marginBottom: '6px', fontSize: '1rem' }}>
                        🐕 {customer.dog_name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.4' }}>
                        <div>👤 {customer.customer_name}</div>
                        <div>📞 {customer.phone}</div>
                        <div>{customer.breed} | {customer.age_years}살 {customer.age_months}개월</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-success"
                      onClick={(e) => handleAutoCompleteCheckIn(customer, e)}
                      disabled={isLoading}
                      style={{
                        minWidth: '90px',
                        padding: '8px 12px',
                        fontSize: '0.8rem',
                        marginLeft: '10px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {typeLabel} 체크인
                    </button>
                  </div>
                ))}
                {autoCompleteResults.length > 5 && (
                  <div style={{
                    padding: '10px',
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '0.85rem',
                    background: '#f8f9fa',
                    borderTop: '1px solid #e0e0e0'
                  }}>
                    ⬆️⬇️ 스크롤하여 더 많은 결과 보기 ({autoCompleteResults.length}건)
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {showResults && searchResults.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '15px', color: '#333' }}>
              검색 결과 ({searchResults.length}건)
            </h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {searchResults.map((customer) => (
                <div
                  key={customer.id}
                  style={{
                    background: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    border: '2px solid #e0e0e0'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#667eea', display: 'block' }}>
                        {customer.dog_name}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                      <div>보호자: {customer.customer_name}</div>
                      <div>견종: {customer.breed}</div>
                      <div>나이: {customer.age_years}살 {customer.age_months}개월</div>
                      <div>연락처: {customer.phone}</div>
                    </div>
                  </div>

                  {/* 호텔링일 때만 선결제 옵션 표시 */}
                  {visitType === 'hoteling' && (
                    <div style={{ 
                      padding: '12px', 
                      background: 'white', 
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        marginBottom: prepaid ? '10px' : '0'
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
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontWeight: '600', color: '#333' }}>
                          💰 선결제
                        </span>
                      </label>

                      {prepaid && (
                        <div style={{ marginTop: '8px' }}>
                          <input
                            type="number"
                            value={prepaidAmount}
                            onChange={(e) => setPrepaidAmount(e.target.value)}
                            placeholder="선결제 금액 (원)"
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '2px solid #667eea',
                              borderRadius: '6px',
                              fontSize: '1rem'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    className="btn btn-success"
                    onClick={() => handleCheckIn(customer)}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  >
                    {typeLabel} 체크인
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '15px' }}>
          💡 팁: 반려견 이름, 보호자 이름, 연락처 중 하나를 입력하면 자동으로 추천 목록이 나타납니다
        </p>
      </div>

      {/* 호텔링 예약 목록 */}
      {visitType === 'hoteling' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#333', margin: 0 }}>
              📅 오늘의 예약 ({todayReservations.length}건)
            </h2>
            <button
              className="btn btn-primary"
              onClick={handleAddReservation}
              style={{ padding: '10px 20px' }}
            >
              ➕ 예약 추가
            </button>
          </div>

          {todayReservations.length === 0 ? (
            <div className="empty-state">
              <p>오늘 예약이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {todayReservations.map((reservation) => {
                const checkedIn = isCheckedIn(reservation.customer_id)
                return (
                  <div
                    key={reservation.id}
                    style={{
                      padding: '15px',
                      background: checkedIn ? '#e7ffe7' : '#f8f9fa',
                      borderRadius: '8px',
                      border: `2px solid ${checkedIn ? '#28a745' : '#667eea'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                          🐕 {reservation.dog_name}
                          {checkedIn && (
                            <span style={{
                              marginLeft: '10px',
                              background: '#28a745',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '0.85rem'
                            }}>
                              체크인 중
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                          <div>보호자: {reservation.customer_name}</div>
                          <div>견종: {reservation.breed}</div>
                          <div>연락처: {reservation.phone}</div>
                          <div style={{ color: '#667eea', fontWeight: '600' }}>
                            기간: {new Date(reservation.start_date).toLocaleDateString('ko-KR')} ~ {new Date(reservation.end_date).toLocaleDateString('ko-KR')}
                          </div>
                          {reservation.notes && (
                            <div style={{ 
                              marginTop: '8px',
                              padding: '8px',
                              background: 'white',
                              borderRadius: '4px',
                              fontSize: '0.85rem'
                            }}>
                              📝 {reservation.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      {!checkedIn && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleReservationCheckIn(reservation)}
                          style={{ flex: 1, padding: '10px' }}
                        >
                          🏠 체크인
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteReservation(reservation.id, reservation.dog_name)}
                        style={{ flex: checkedIn ? 1 : 0, padding: '10px' }}
                      >
                        🗑️ {checkedIn ? '예약 삭제' : '삭제'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#333' }}>
          {typeEmoji} 현재 {typeLabel} 체크인 중 ({filteredVisits.length}마리)
        </h2>

        {filteredVisits.length === 0 ? (
          <div className="empty-state">
            <p>현재 {typeLabel} 체크인 중인 반려견이 없습니다.</p>
          </div>
        ) : (
          <div className="current-visits">
            {filteredVisits.map((visit) => (
              <div key={visit.id} className="visit-item">
                <div className="visit-info">
                  <div>
                    <strong>{visit.dog_name}</strong>
                    <span style={{ color: '#999', marginLeft: '10px' }}>
                      ({visit.breed})
                    </span>
                    <span style={{ 
                      marginLeft: '10px',
                      padding: '2px 8px',
                      background: visitType === 'daycare' ? '#fef3c7' : '#dbeafe',
                      color: visitType === 'daycare' ? '#92400e' : '#1e40af',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {typeEmoji} {typeLabel}
                    </span>
                  </div>
                  <small style={{ display: 'block', lineHeight: '1.6' }}>
                    <div>보호자: {visit.customer_name}</div>
                    <div>체크인: {formatDateTime(visit.check_in)}</div>
                    <div>경과시간: {getElapsedTime(visit.check_in)}</div>
                    {visit.prepaid && visit.prepaid_amount > 0 && (
                      <div style={{ 
                        color: '#f57c00', 
                        fontWeight: '600',
                        marginTop: '5px'
                      }}>
                        💰 선결제: {visit.prepaid_amount.toLocaleString()}원
                      </div>
                    )}
                  </small>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px', 
                  width: '100%'
                }}>
                  <button
                    className="btn"
                    onClick={() => handleEditCheckInTime(visit)}
                    disabled={isLoading}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 15px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      width: '100%'
                    }}
                  >
                    ⏰ 시간 수정
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleCheckOut(visit)}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  >
                    체크아웃
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 체크인 시간 수정 모달 */}
      {editingVisit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }} onClick={handleCancelEdit}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              체크인 시간 수정
            </h3>
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
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #667eea',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
                disabled={isLoading}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelEdit}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveCheckInTime}
                disabled={isLoading || !editCheckInTime}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체크아웃 확인 모달 (요금 계산) */}
      {checkoutConfirm && feeInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000
        }} onClick={cancelCheckout}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
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

              {/* 데이케어 요금 표시 */}
              {visitType === 'daycare' && feeInfo.fee > 0 && (
                <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                    요금 계산
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#2e7d32', marginBottom: '10px' }}>
                    {feeInfo.fee.toLocaleString()}원
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.6' }}>
                    {feeInfo.fullHours > 0 && (
                      <div>
                        {feeInfo.fullHours}시간 × {feeInfo.pricePerHour.toLocaleString()}원/시간 = {(feeInfo.fullHours * feeInfo.pricePerHour).toLocaleString()}원
                      </div>
                    )}
                    {feeInfo.additionalFee > 0 && (
                      <div style={{ marginTop: '5px' }}>
                        + {feeInfo.additionalUnit} ({feeInfo.remainingMinutes}분) × {feeInfo.additionalUnit === '1시간' ? feeInfo.pricePerHour.toLocaleString() : feeInfo.pricePer30min.toLocaleString()}원 = {feeInfo.additionalFee.toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 호텔링 요금 표시 */}
              {visitType === 'hoteling' && feeInfo.total_fee !== undefined && (
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

              {/* 에러 메시지 */}
              {feeInfo.message && (
                <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                    {feeInfo.message}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelCheckout}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                취소
              </button>
              <button
                onClick={() => confirmCheckout(checkoutConfirm.id)}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
              >
                {isLoading ? '처리 중...' : '확인 및 체크아웃'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 예약 추가 모달 */}
      {showReservationModal && (
        <div className="modal-overlay" onClick={() => {
          setShowReservationModal(false)
          setShowAutoComplete(false)
          setAutoCompleteResults([])
          setDogName('')
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>호텔링 예약 추가</h3>
            
            <form onSubmit={handleCreateReservation}>
              {/* 고객 검색 */}
              <div className="form-group">
                <label>고객 검색 *</label>
                <div style={{ position: 'relative' }} ref={autoCompleteRef}>
                  <input
                    type="text"
                    placeholder="반려견 이름, 보호자명, 연락처로 검색"
                    value={dogName}
                    onChange={(e) => setDogName(e.target.value)}
                    onFocus={() => {
                      if (autoCompleteResults.length > 0) {
                        setShowAutoComplete(true)
                      }
                    }}
                    className="form-input"
                    autoComplete="off"
                  />
                  
                  {showAutoComplete && autoCompleteResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '2px solid #667eea',
                      borderRadius: '8px',
                      marginTop: '5px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      zIndex: 10000
                    }}>
                      {autoCompleteResults.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleSelectCustomerForReservation(customer)}
                          style={{
                            padding: '12px 15px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #e0e0e0',
                            transition: 'background 0.2s',
                            background: 'white'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8f9fa'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'white'
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#667eea', marginBottom: '4px' }}>
                            🐕 {customer.dog_name}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {customer.breed} | {customer.customer_name} | {customer.phone}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {reservationForm.dog_name && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    background: '#e7f3ff',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: '#1976d2'
                  }}>
                    ✓ 선택됨: <strong>{reservationForm.dog_name}</strong> ({reservationForm.customer_name})
                  </div>
                )}
              </div>

              {/* 체크인 날짜 */}
              <div className="form-group">
                <label>체크인 날짜 *</label>
                <input
                  type="date"
                  value={reservationForm.start_date}
                  onChange={(e) => setReservationForm({ ...reservationForm, start_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 체크아웃 날짜 */}
              <div className="form-group">
                <label>체크아웃 날짜 *</label>
                <input
                  type="date"
                  value={reservationForm.end_date}
                  onChange={(e) => setReservationForm({ ...reservationForm, end_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 메모 */}
              <div className="form-group">
                <label>메모</label>
                <textarea
                  value={reservationForm.notes}
                  onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
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
                  onClick={() => {
                    setShowReservationModal(false)
                    setShowAutoComplete(false)
                    setAutoCompleteResults([])
                    setDogName('')
                  }}
                  style={{ flex: 1, background: '#6c757d', color: 'white' }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 예약 체크인 모달 */}
      {showCheckInModal && selectedReservation && (
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
                🐕 {selectedReservation.dog_name}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                보호자: {selectedReservation.customer_name}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                견종: {selectedReservation.breed}
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
                onClick={handleConfirmReservationCheckIn}
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
    </div>
  )
}

export default CheckInOut
