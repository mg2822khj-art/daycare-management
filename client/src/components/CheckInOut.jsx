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
  const autoCompleteRef = useRef(null)

  // 현재 타입의 방문만 필터링
  const filteredVisits = currentVisits.filter(visit => visit.visit_type === visitType)

  // 실시간 자동완성 검색
  useEffect(() => {
    const searchAutoComplete = async () => {
      if (dogName.trim().length === 0) {
        setAutoCompleteResults([])
        setShowAutoComplete(false)
        return
      }

      try {
        const response = await axios.get(`${API_URL}/customers/autocomplete?q=${dogName.trim()}`)
        setAutoCompleteResults(response.data)
        setShowAutoComplete(response.data.length > 0)
      } catch (error) {
        console.error('자동완성 검색 실패:', error)
      }
    }

    const timeoutId = setTimeout(searchAutoComplete, 300)
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
    axios.get(`${API_URL}/customers/search/${customer.dog_name}`)
      .then(response => {
        setSearchResults(response.data)
        setShowResults(true)
      })
      .catch(error => {
        setMessage({
          type: 'error',
          text: '검색 중 오류가 발생했습니다.'
        })
      })
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
                onChange={(e) => setDogName(e.target.value)}
                onFocus={() => {
                  if (autoCompleteResults.length > 0) {
                    setShowAutoComplete(true)
                  }
                }}
                placeholder="반려견 이름, 보호자 이름, 연락처를 입력하세요"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="submit"
                className="btn btn-success"
                disabled={isLoading || !dogName.trim()}
              >
                {isLoading ? '검색 중...' : '검색'}
              </button>
            </div>

            {/* 자동완성 드롭다운 */}
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
                zIndex: 1000
              }}>
                {autoCompleteResults.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleAutoCompleteSelect(customer)}
                    style={{
                      padding: '12px 15px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e0e0e0',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div style={{ fontWeight: '600', color: '#667eea', marginBottom: '4px' }}>
                      🐕 {customer.dog_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {customer.customer_name} | {customer.phone} | {customer.breed} | {customer.age_years}살 {customer.age_months}개월
                    </div>
                  </div>
                ))}
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
                <button
                  className="btn btn-danger"
                  onClick={() => handleCheckOut(visit)}
                  disabled={isLoading}
                >
                  체크아웃
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CheckInOut
