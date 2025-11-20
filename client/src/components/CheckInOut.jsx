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
  const autoCompleteRef = useRef(null)

  // 현재 타입의 방문만 필터링
  const filteredVisits = currentVisits.filter(visit => visit.visit_type === visitType)

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
      const response = await axios.post(`${API_URL}/checkin`, {
        customer_id: customer.id,
        visit_type: visitType
      })

      setMessage({ type: 'success', text: response.data.message })
      setDogName('')
      setSearchResults([])
      setShowResults(false)
      setAutoCompleteResults([])
      onRefresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '체크인 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async (visit) => {
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await axios.post(`${API_URL}/checkout`, {
        visit_id: visit.id
      })

      setMessage({ type: 'success', text: response.data.message })
      onRefresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCheckInTime = (visit) => {
    // 체크인 시간을 datetime-local 형식으로 변환
    const checkInDate = new Date(visit.check_in)
    const year = checkInDate.getFullYear()
    const month = String(checkInDate.getMonth() + 1).padStart(2, '0')
    const day = String(checkInDate.getDate()).padStart(2, '0')
    const hours = String(checkInDate.getHours()).padStart(2, '0')
    const minutes = String(checkInDate.getMinutes()).padStart(2, '0')
    const datetimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`
    
    setEditingVisit(visit)
    setEditCheckInTime(datetimeLocal)
  }

  const handleSaveCheckInTime = async () => {
    if (!editingVisit || !editCheckInTime) return

    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // datetime-local 형식을 ISO 형식으로 변환
      const date = new Date(editCheckInTime)
      const isoString = date.toISOString().slice(0, 19).replace('T', ' ')

      const response = await axios.put(`${API_URL}/visits/${editingVisit.id}/checkin-time`, {
        check_in_time: isoString
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
                    <div style={{ flex: 1 }}>
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
                        padding: '8px 15px',
                        fontSize: '0.85rem',
                        marginLeft: '10px',
                        whiteSpace: 'nowrap'
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
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '2px solid #e0e0e0'
                  }}
                >
                  <div>
                    <div style={{ marginBottom: '5px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#667eea' }}>
                        {customer.dog_name}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      보호자: {customer.customer_name} | 
                      견종: {customer.breed} | 
                      나이: {customer.age_years}살 {customer.age_months}개월 |
                      연락처: {customer.phone}
                    </div>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={() => handleCheckIn(customer)}
                    disabled={isLoading}
                    style={{ minWidth: '100px' }}
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
                  <small>
                    보호자: {visit.customer_name} | 
                    체크인: {formatDateTime(visit.check_in)} | 
                    경과시간: {getElapsedTime(visit.check_in)}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn"
                    onClick={() => handleEditCheckInTime(visit)}
                    disabled={isLoading}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    ⏰ 시간 수정
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleCheckOut(visit)}
                    disabled={isLoading}
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
    </div>
  )
}

export default CheckInOut
