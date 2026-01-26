import { useState } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'

const API_URL = '/api'

function CustomerList({ customers, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [visitHistory, setVisitHistory] = useState([])
  const [visitTypeFilter, setVisitTypeFilter] = useState('all') // all, daycare, hoteling
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    customer_name: '',
    phone: '',
    dog_name: '',
    breed: '',
    age_years: '',
    age_months: '',
    weight: ''
  })

  // 고객 검색 필터
  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase()
    return (
      customer.dog_name.toLowerCase().includes(search) ||
      customer.customer_name.toLowerCase().includes(search) ||
      customer.phone.includes(search) ||
      customer.breed.toLowerCase().includes(search)
    )
  })

  // 고객 선택 및 방문 기록 조회
  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer)
    setIsLoading(true)
    setVisitTypeFilter('all')
    setIsEditing(false)

    try {
      const response = await axios.get(`${API_URL}/customers/${customer.id}/visits`)
      setVisitHistory(response.data)
    } catch (error) {
      console.error('방문 기록 조회 실패:', error)
      setVisitHistory([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseDetail = () => {
    setSelectedCustomer(null)
    setVisitHistory([])
    setIsEditing(false)
  }

  // 수정 모드 시작
  const handleStartEdit = () => {
    // selectedCustomer에서 나이 정보 가져오기
    // 나이가 0살 0개월인 경우 birth_date에서 계산 시도
    let ageYears = selectedCustomer.age_years || 0
    let ageMonths = selectedCustomer.age_months || 0
    
    // 나이가 0이고 birth_date가 있으면 계산
    if ((ageYears === 0 && ageMonths === 0) && selectedCustomer.birth_date) {
      try {
        const today = new Date()
        const birth = new Date(selectedCustomer.birth_date)
        if (!isNaN(birth.getTime())) {
          let years = today.getFullYear() - birth.getFullYear()
          let months = today.getMonth() - birth.getMonth()
          
          if (months < 0) {
            years--
            months += 12
          }
          
          if (years >= 0) {
            ageYears = years
            ageMonths = months
          }
        }
      } catch (e) {
        console.error('나이 계산 오류:', e)
      }
    }
    
    setEditForm({
      customer_name: selectedCustomer.customer_name,
      phone: selectedCustomer.phone,
      dog_name: selectedCustomer.dog_name,
      breed: selectedCustomer.breed,
      age_years: ageYears,
      age_months: ageMonths,
      weight: selectedCustomer.weight || ''
    })
    setIsEditing(true)
  }

  // 수정 취소
  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  // 고객 정보 수정 저장
  const handleSaveEdit = async () => {
    if (!editForm.customer_name || !editForm.phone || !editForm.dog_name || !editForm.breed) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    try {
      // 나이를 생년월일로 변환 (더 정확한 계산)
      const years = parseInt(editForm.age_years) || 0
      const months = parseInt(editForm.age_months) || 0
      
      const today = new Date()
      let birthYear = today.getFullYear() - years
      let birthMonth = today.getMonth() + 1 - months // 1-12 범위
      
      // 월이 음수이거나 0이면 이전 해로 조정
      if (birthMonth <= 0) {
        birthYear -= 1
        birthMonth += 12
      }
      
      // 일은 오늘 날짜로 설정 (정확한 날짜는 알 수 없으므로)
      const birthDay = today.getDate()
      
      // 생년월일 생성 (YYYY-MM-DD 형식)
      const birth_date = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`

      await axios.put(`${API_URL}/customers/${selectedCustomer.customer_id || selectedCustomer.id}`, {
        customer_name: editForm.customer_name,
        phone: editForm.phone,
        dog_name: editForm.dog_name,
        breed: editForm.breed,
        birth_date: birth_date,
        weight: editForm.weight ? parseFloat(editForm.weight) : null
      })

      alert('고객 정보가 수정되었습니다.')
      setIsEditing(false)
      
      // 부모 컴포넌트 새로고침
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('고객 정보 수정 오류:', error)
      alert(error.response?.data?.error || '고객 정보 수정 중 오류가 발생했습니다.')
    }
  }

  // 고객 삭제
  const handleDeleteCustomer = async (customer, event) => {
    event.stopPropagation()
    
    const confirmMessage = `정말로 "${customer.dog_name}" (${customer.customer_name}님)을 삭제하시겠습니까?\n\n⚠️ 모든 방문 기록도 함께 삭제됩니다!`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await axios.delete(`${API_URL}/customers/${customer.id}`)
      alert('고객이 삭제되었습니다.')
      window.location.reload()
    } catch (error) {
      alert(error.response?.data?.error || '고객 삭제 중 오류가 발생했습니다.')
    }
  }

  // 방문 기록 삭제
  const handleDeleteVisit = async (visitId) => {
    if (!window.confirm('이 방문 기록을 삭제하시겠습니까?')) {
      return
    }

    try {
      await axios.delete(`${API_URL}/visits/${visitId}`)
      const response = await axios.get(`${API_URL}/customers/${selectedCustomer.id}/visits`)
      setVisitHistory(response.data)
      alert('방문 기록이 삭제되었습니다.')
    } catch (error) {
      alert(error.response?.data?.error || '방문 기록 삭제 중 오류가 발생했습니다.')
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

  const formatDuration = (minutes) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}시간 ${mins}분`
    }
    return `${mins}분`
  }

  const getTotalStats = () => {
    const filtered = visitTypeFilter === 'all' 
      ? visitHistory 
      : visitHistory.filter(v => v.visit_type === visitTypeFilter)
    
    const totalVisits = filtered.length
    const totalMinutes = filtered.reduce((sum, visit) => sum + (visit.duration_minutes || 0), 0)
    return { totalVisits, totalMinutes }
  }

  // 타입별 필터링된 방문 기록
  const filteredVisitHistory = visitTypeFilter === 'all'
    ? visitHistory
    : visitHistory.filter(v => v.visit_type === visitTypeFilter)

  // 엑셀 다운로드 함수
  const handleExportToExcel = () => {
    if (customers.length === 0) {
      alert('다운로드할 고객 데이터가 없습니다.')
      return
    }

    const excelData = customers.map((customer, index) => ({
      '번호': index + 1,
      '반려견 이름': customer.dog_name,
      '보호자 이름': customer.customer_name,
      '연락처': customer.phone,
      '견종': customer.breed,
      '나이': `${customer.age_years}살 ${customer.age_months}개월`,
      '등록일': new Date(customer.created_at).toLocaleDateString('ko-KR')
    }))

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 }
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '고객 목록')

    const today = new Date()
    const fileName = `댕스케어_고객목록_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`

    XLSX.writeFile(workbook, fileName)
    
    alert(`${customers.length}명의 고객 데이터가 다운로드되었습니다.`)
  }

  return (
    <div className="card">
      {!selectedCustomer ? (
        <>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h2 style={{ margin: 0, color: '#333' }}>
              등록된 고객 목록 ({filteredCustomers.length}명)
            </h2>
            <button
              className="btn"
              onClick={handleExportToExcel}
              style={{
                background: '#28a745',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px'
              }}
            >
              📊 엑셀 다운로드
            </button>
          </div>

          {/* 검색 바 */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 반려견 이름, 보호자, 연락처, 견종으로 검색..."
              style={{
                width: '100%',
                padding: '12px 15px',
                fontSize: '1rem',
                border: '2px solid #667eea',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="empty-state">
              <p>{searchTerm ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}</p>
            </div>
          ) : (
            <div className="customer-list">
              {filteredCustomers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="customer-item"
                  onClick={() => handleSelectCustomer(customer)}
                  style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <h3 style={{ margin: 0 }}>🐕 {customer.dog_name}</h3>
                  <div className="customer-details" style={{ marginTop: '10px' }}>
                    <div><strong>보호자:</strong> {customer.customer_name}</div>
                    <div><strong>연락처:</strong> {customer.phone}</div>
                    <div><strong>견종:</strong> {customer.breed}</div>
                    <div><strong>나이:</strong> {customer.age_years}살 {customer.age_months}개월</div>
                    <div><strong>등록일:</strong> {new Date(customer.created_at).toLocaleDateString('ko-KR')}</div>
                  </div>
                  <div style={{ marginTop: '10px', color: '#667eea', fontSize: '0.9rem' }}>
                    👆 클릭하여 이용 내역 보기
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 고객 상세 정보 */}
          <div style={{ marginBottom: '20px' }}>
            <button
              className="btn"
              onClick={handleCloseDetail}
              style={{
                background: '#6c757d',
                color: 'white',
                marginBottom: '15px'
              }}
            >
              ← 목록으로
            </button>

            <div style={{
              background: '#f0f4ff',
              padding: '20px',
              borderRadius: '12px',
              border: '2px solid #667eea'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <h2 style={{ color: '#667eea', margin: 0 }}>
                  🐕 {selectedCustomer.dog_name}
                </h2>
                {!isEditing && (
                  <button
                    className="btn"
                    onClick={handleStartEdit}
                    style={{
                      background: '#f59e0b',
                      color: 'white',
                      padding: '8px 16px',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✏️ 정보 수정
                  </button>
                )}
              </div>

              {isEditing ? (
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>반려견 이름</label>
                    <input
                      type="text"
                      value={editForm.dog_name}
                      onChange={(e) => setEditForm({ ...editForm, dog_name: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>보호자 이름</label>
                    <input
                      type="text"
                      value={editForm.customer_name}
                      onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>연락처</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>견종</label>
                    <input
                      type="text"
                      value={editForm.breed}
                      onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>나이</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={editForm.age_years}
                          onChange={(e) => setEditForm({ ...editForm, age_years: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                          살
                        </small>
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          min="0"
                          max="11"
                          value={editForm.age_months}
                          onChange={(e) => setEditForm({ ...editForm, age_months: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                          개월
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '15px' }}>
                    <label htmlFor="edit-weight">몸무게 (kg)</label>
                    <input
                      type="number"
                      id="edit-weight"
                      value={editForm.weight}
                      onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                      min="0"
                      step="0.1"
                      placeholder="예: 5.5"
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                      데이케어 요금 계산에 사용됩니다 (선택사항)
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-success"
                      onClick={handleSaveEdit}
                      style={{ flex: 1, minWidth: '100px' }}
                    >
                      💾 저장
                    </button>
                    <button
                      className="btn"
                      onClick={handleCancelEdit}
                      style={{ flex: 1, minWidth: '100px', background: '#6c757d', color: 'white' }}
                    >
                      취소
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustomer(selectedCustomer, e)
                      }}
                      style={{ flex: 1, minWidth: '100px' }}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr',
                  gap: '10px',
                  fontSize: '0.9rem'
                }}>
                  <div><strong>보호자:</strong> {selectedCustomer.customer_name}</div>
                  <div><strong>연락처:</strong> {selectedCustomer.phone}</div>
                  <div><strong>견종:</strong> {selectedCustomer.breed}</div>
                  <div><strong>나이:</strong> {selectedCustomer.age_years}살 {selectedCustomer.age_months}개월</div>
                  <div><strong>등록일:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString('ko-KR')}</div>
                </div>
              )}
            </div>
          </div>

          {/* 타입 필터 버튼 */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              className="btn"
              onClick={() => setVisitTypeFilter('all')}
              style={{
                background: visitTypeFilter === 'all' ? '#667eea' : '#e0e0e0',
                color: visitTypeFilter === 'all' ? 'white' : '#666'
              }}
            >
              전체
            </button>
            <button
              className="btn"
              onClick={() => setVisitTypeFilter('daycare')}
              style={{
                background: visitTypeFilter === 'daycare' ? '#f59e0b' : '#e0e0e0',
                color: visitTypeFilter === 'daycare' ? 'white' : '#666'
              }}
            >
              ☀️ 데이케어
            </button>
            <button
              className="btn"
              onClick={() => setVisitTypeFilter('hoteling')}
              style={{
                background: visitTypeFilter === 'hoteling' ? '#3b82f6' : '#e0e0e0',
                color: visitTypeFilter === 'hoteling' ? 'white' : '#666'
              }}
            >
              🌙 호텔링
            </button>
          </div>

          {/* 통계 */}
          {filteredVisitHistory.length > 0 && (
            <div style={{
              background: '#e7f3ff',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#667eea', marginBottom: '10px' }}>
                📊 이용 통계 ({visitTypeFilter === 'all' ? '전체' : visitTypeFilter === 'daycare' ? '데이케어' : '호텔링'})
              </h3>
              <div style={{ display: 'flex', gap: '30px', fontSize: '1rem' }}>
                <div><strong>총 방문:</strong> {getTotalStats().totalVisits}회</div>
                <div><strong>총 이용시간:</strong> {formatDuration(getTotalStats().totalMinutes)}</div>
              </div>
            </div>
          )}

          {/* 방문 기록 */}
          <h3 style={{ marginBottom: '15px', color: '#333' }}>
            이용 내역 ({filteredVisitHistory.length}건)
          </h3>

          {isLoading ? (
            <div className="empty-state">
              <p>로딩 중...</p>
            </div>
          ) : filteredVisitHistory.length === 0 ? (
            <div className="empty-state">
              <p>
                {visitTypeFilter === 'all' 
                  ? '아직 방문 기록이 없습니다.' 
                  : `${visitTypeFilter === 'daycare' ? '데이케어' : '호텔링'} 방문 기록이 없습니다.`}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>타입</th>
                    <th>체크인</th>
                    <th>체크아웃</th>
                    <th>이용시간</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitHistory.map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <span style={{ 
                          padding: '4px 10px',
                          background: visit.visit_type === 'daycare' ? '#fef3c7' : '#dbeafe',
                          color: visit.visit_type === 'daycare' ? '#92400e' : '#1e40af',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}>
                          {visit.visit_type === 'daycare' ? '☀️ 데이케어' : '🌙 호텔링'}
                        </span>
                      </td>
                      <td>{formatDateTime(visit.check_in)}</td>
                      <td>{formatDateTime(visit.check_out)}</td>
                      <td>
                        <strong style={{ color: '#667eea' }}>
                          {formatDuration(visit.duration_minutes)}
                        </strong>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteVisit(visit.id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            minWidth: 'auto'
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CustomerList
