import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = '/api'

function Revenue() {
  const [allCustomers, setAllCustomers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [formData, setFormData] = useState({
    service_type: '',
    payment_method: '',
    amount: '',
    sessions: 1,
    notes: ''
  })
  const [revenues, setRevenues] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef(null)

  // 컴포넌트 마운트 시 고객 목록 및 매출 목록 불러오기
  useEffect(() => {
    fetchAllCustomers()
    fetchRevenues()
  }, [])

  // 외부 클릭 감지 (검색 결과 닫기)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 모든 고객 데이터 가져오기
  const fetchAllCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`)
      const flattenedCustomers = []
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(customer => {
          if (customer.dogs && Array.isArray(customer.dogs) && customer.dogs.length > 0) {
            customer.dogs.forEach(dog => {
              flattenedCustomers.push({
                id: customer.id,
                dog_id: dog.id,
                customer_id: customer.id,
                dog_name: dog.dog_name,
                customer_name: customer.customer_name,
                phone: customer.phone,
                breed: dog.breed
              })
            })
          } else if (customer.dog_name) {
            flattenedCustomers.push({
              id: customer.id,
              customer_id: customer.id,
              dog_name: customer.dog_name,
              customer_name: customer.customer_name,
              phone: customer.phone,
              breed: customer.breed
            })
          }
        })
      }
      setAllCustomers(flattenedCustomers)
    } catch (error) {
      console.error('고객 데이터 가져오기 실패:', error)
      setAllCustomers([])
    }
  }

  // 매출 목록 불러오기
  const fetchRevenues = async () => {
    try {
      const response = await axios.get(`${API_URL}/revenues`)
      setRevenues(response.data || [])
    } catch (error) {
      console.error('매출 목록 로드 실패:', error)
      setRevenues([])
    }
  }

  // 고객 검색
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(e.target.value)
    
    if (term.length === 0) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const filtered = allCustomers.filter(customer => {
      const dogNameMatch = customer.dog_name?.toLowerCase().includes(term)
      const customerNameMatch = customer.customer_name?.toLowerCase().includes(term)
      const phoneMatch = customer.phone?.includes(term)
      return dogNameMatch || customerNameMatch || phoneMatch
    }).slice(0, 10)

    setSearchResults(filtered)
    setShowSearchResults(filtered.length > 0)
  }

  // 고객 선택
  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setSearchTerm(`${customer.dog_name} (${customer.customer_name})`)
    setSearchResults([])
    setShowSearchResults(false)
  }

  // 고객 선택 해제
  const handleClearCustomer = () => {
    setSelectedCustomer(null)
    setSearchTerm('')
    setFormData({
      service_type: '',
      payment_method: '',
      amount: '',
      sessions: 1,
      notes: ''
    })
  }

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedCustomer) {
      setMessage({ type: 'error', text: '고객을 선택해주세요.' })
      return
    }

    if (!formData.service_type) {
      setMessage({ type: 'error', text: '서비스를 선택해주세요.' })
      return
    }

    if (!formData.payment_method) {
      setMessage({ type: 'error', text: '결제 수단을 선택해주세요.' })
      return
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: '금액을 입력해주세요.' })
      return
    }

    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      await axios.post(`${API_URL}/revenues`, {
        customer_id: selectedCustomer.customer_id,
        dog_id: selectedCustomer.dog_id || null,
        service_type: formData.service_type,
        payment_method: formData.payment_method,
        amount: parseFloat(formData.amount),
        sessions: formData.service_type === '유치원' ? parseInt(formData.sessions) : 1,
        notes: formData.notes
      })

      setMessage({ type: 'success', text: '매출이 등록되었습니다.' })
      setFormData({
        service_type: '',
        payment_method: '',
        amount: '',
        sessions: 1,
        notes: ''
      })
      setSelectedCustomer(null)
      setSearchTerm('')
      fetchRevenues()
      
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 3000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '매출 등록 중 오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 매출 삭제
  const handleDeleteRevenue = async (revenueId) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) {
      return
    }

    try {
      await axios.delete(`${API_URL}/revenues/${revenueId}`)
      setMessage({ type: 'success', text: '매출이 삭제되었습니다.' })
      fetchRevenues()
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 3000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '매출 삭제 중 오류가 발생했습니다.'
      })
    }
  }

  // 총 매출 계산
  const totalRevenue = revenues.reduce((sum, revenue) => sum + (parseFloat(revenue.amount) || 0), 0)

  // 결제 수단별 매출 계산
  const revenueByPayment = revenues.reduce((acc, revenue) => {
    const method = revenue.payment_method || '기타'
    acc[method] = (acc[method] || 0) + (parseFloat(revenue.amount) || 0)
    return acc
  }, {})

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#333' }}>
          💰 매출 관리
        </h2>

        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* 매출 등록 폼 */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              고객 선택 *
            </label>
            <div style={{ position: 'relative' }} ref={searchRef}>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSearchResults(true)
                  }
                }}
                placeholder="고객 이름, 강아지 이름, 연락처로 검색"
                style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                disabled={isLoading}
              />
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '5px 10px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              )}
              
              {showSearchResults && searchResults.length > 0 && (
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
                  zIndex: 1000,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #e0e0e0',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ fontWeight: '600', color: '#667eea' }}>
                        🐕 {customer.dog_name}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        👤 {customer.customer_name} | 📞 {customer.phone}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              서비스 선택 *
            </label>
            <select
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value, sessions: 1 })}
              required
              style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
              disabled={isLoading}
            >
              <option value="">서비스를 선택하세요</option>
              <option value="유치원">유치원</option>
              <option value="데이케어">데이케어</option>
              <option value="호텔링">호텔링</option>
              <option value="목욕">목욕</option>
            </select>
          </div>

          {formData.service_type === '유치원' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                회차 수 *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.sessions}
                onChange={(e) => setFormData({ ...formData, sessions: parseInt(e.target.value) || 1 })}
                required
                style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
                disabled={isLoading}
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              결제 수단 *
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['카드', '현금', '계좌이체'].map((method) => (
                <label
                  key={method}
                  style={{
                    flex: '1',
                    minWidth: '100px',
                    padding: '12px',
                    border: `2px solid ${formData.payment_method === method ? '#667eea' : '#e0e0e0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: formData.payment_method === method ? '#f0f4ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={method}
                    checked={formData.payment_method === method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    disabled={isLoading}
                    style={{ marginRight: '8px' }}
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              금액 (원) *
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="금액을 입력하세요"
              style={{ width: '100%', padding: '10px', fontSize: '1rem' }}
              disabled={isLoading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              메모
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="메모를 입력하세요 (선택사항)"
              rows="3"
              style={{ width: '100%', padding: '10px', fontSize: '1rem', resize: 'vertical' }}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-success"
            disabled={isLoading}
            style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
          >
            {isLoading ? '등록 중...' : '매출 등록'}
          </button>
        </form>

        {/* 매출 통계 */}
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>📊 매출 통계</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ background: 'white', padding: '15px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>총 매출</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
                {totalRevenue.toLocaleString()}원
              </div>
            </div>
            {Object.entries(revenueByPayment).map(([method, amount]) => (
              <div key={method} style={{ background: 'white', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>{method}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#28a745' }}>
                  {amount.toLocaleString()}원
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 매출 목록 */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>📋 매출 목록</h3>
          {revenues.length === 0 ? (
            <div className="empty-state">
              <p>등록된 매출이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {revenues.map((revenue) => (
                <div
                  key={revenue.id}
                  style={{
                    background: '#f8f9fa',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '2px solid #e0e0e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#667eea' }}>
                        {revenue.dog_name || '강아지 정보 없음'}
                      </strong>
                      <span style={{ marginLeft: '10px', color: '#666' }}>
                        ({revenue.customer_name})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                      <div>서비스: {revenue.service_type}</div>
                      {revenue.service_type === '유치원' && (
                        <div>회차: {revenue.sessions}회</div>
                      )}
                      <div>결제 수단: {revenue.payment_method}</div>
                      <div>금액: <strong style={{ color: '#28a745' }}>{parseFloat(revenue.amount).toLocaleString()}원</strong></div>
                      {revenue.notes && (
                        <div>메모: {revenue.notes}</div>
                      )}
                      <div>등록일: {new Date(revenue.created_at).toLocaleString('ko-KR')}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRevenue(revenue.id)}
                    className="btn btn-danger"
                    style={{ marginLeft: '15px' }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Revenue
