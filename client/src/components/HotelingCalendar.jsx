import { useState, useEffect } from 'react'
import axios from 'axios'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

const API_URL = '/api'

function HotelingCalendar({ onRefresh }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [reservations, setReservations] = useState([])
  const [currentMonthReservations, setCurrentMonthReservations] = useState([])
  const [currentVisits, setCurrentVisits] = useState([])
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
  
  // 예약 폼 데이터
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    dog_name: '',
    start_date: '',
    end_date: '',
    notes: ''
  })

  // 현재 월의 예약 불러오기
  useEffect(() => {
    fetchMonthReservations(selectedDate)
    fetchCurrentVisits()
  }, [selectedDate])

  // 선택한 날짜의 예약 불러오기
  useEffect(() => {
    fetchDateReservations(selectedDate)
  }, [selectedDate, currentMonthReservations])

  // 현재 체크인 목록 불러오기
  const fetchCurrentVisits = async () => {
    try {
      const response = await axios.get(`${API_URL}/current-visits`)
      setCurrentVisits(response.data)
    } catch (error) {
      console.error('체크인 목록 조회 실패:', error)
    }
  }

  const fetchMonthReservations = async (date) => {
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0]
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0]
      
      const response = await axios.get(`${API_URL}/reservations`, {
        params: { start_date: firstDay, end_date: lastDay }
      })
      setCurrentMonthReservations(response.data)
    } catch (error) {
      console.error('예약 조회 실패:', error)
    }
  }

  const fetchDateReservations = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    const filtered = currentMonthReservations.filter(res => {
      return dateStr >= res.start_date && dateStr <= res.end_date
    })
    setReservations(filtered)
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
      setSearchResults(response.data)
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
    const dateStr = selectedDate.toISOString().split('T')[0]
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

  // 체크아웃 처리
  const handleCheckOut = async (reservation) => {
    const visitId = getVisitId(reservation.customer_id)
    if (!visitId) {
      alert('체크인 정보를 찾을 수 없습니다.')
      return
    }

    if (!window.confirm(`"${reservation.dog_name}" 체크아웃 하시겠습니까?`)) {
      return
    }

    try {
      await axios.post(`${API_URL}/checkout`, {
        visit_id: visitId
      })
      
      alert(`${reservation.dog_name} 체크아웃 완료!`)
      fetchCurrentVisits()
      if (onRefresh) onRefresh() // 호텔링 탭 새로고침
    } catch (error) {
      alert(error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.')
    }
  }

  // 캘린더 타일에 예약 표시
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = date.toISOString().split('T')[0]
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

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* 캘린더 영역 */}
        <div style={{ flex: '1', minWidth: '300px' }}>
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
              width: '100%',
              padding: '12px',
              fontSize: '1rem'
            }}
          >
            ➕ 예약 추가
          </button>
        </div>

        {/* 선택한 날짜의 예약 목록 */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <h3 style={{ color: '#667eea', marginBottom: '15px' }}>
            {formatDate(selectedDate.toISOString().split('T')[0])} 예약 목록
          </h3>

          {reservations.length === 0 ? (
            <div className="empty-state">
              <p>이 날짜에 예약이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
          )}
        </div>
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
                
                {isSearching && searchResults.length > 0 && (
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
    </div>
  )
}

export default HotelingCalendar

