import { useState } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'

const API_URL = '/api'

function CustomerList({ customers }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [visitHistory, setVisitHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)

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
  }

  // 고객 삭제
  const handleDeleteCustomer = async (customer, event) => {
    event.stopPropagation() // 클릭 이벤트 전파 방지
    
    const confirmMessage = `정말로 "${customer.dog_name}" (${customer.customer_name}님)을 삭제하시겠습니까?\n\n⚠️ 모든 방문 기록도 함께 삭제됩니다!`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      await axios.delete(`${API_URL}/customers/${customer.id}`)
      alert('고객이 삭제되었습니다.')
      // 부모 컴포넌트에서 고객 목록 새로고침
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
      // 방문 기록 다시 조회
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
    const totalVisits = visitHistory.length
    const totalMinutes = visitHistory.reduce((sum, visit) => sum + (visit.duration_minutes || 0), 0)
    return { totalVisits, totalMinutes }
  }

  // 엑셀 다운로드 함수
  const handleExportToExcel = () => {
    if (customers.length === 0) {
      alert('다운로드할 고객 데이터가 없습니다.')
      return
    }

    // 엑셀 데이터 포맷팅
    const excelData = customers.map((customer, index) => ({
      '번호': index + 1,
      '반려견 이름': customer.dog_name,
      '보호자 이름': customer.customer_name,
      '연락처': customer.phone,
      '견종': customer.breed,
      '나이': `${customer.age}살`,
      '등록일': new Date(customer.created_at).toLocaleDateString('ko-KR')
    }))

    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { wch: 8 },  // 번호
      { wch: 15 }, // 반려견 이름
      { wch: 12 }, // 보호자 이름
      { wch: 15 }, // 연락처
      { wch: 15 }, // 견종
      { wch: 10 }, // 나이
      { wch: 15 }  // 등록일
    ]

    // 워크북 생성
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '고객 목록')

    // 파일명 생성 (현재 날짜 포함)
    const today = new Date()
    const fileName = `데이케어_고객목록_${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}.xlsx`

    // 파일 다운로드
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0 }}>🐕 {customer.dog_name}</h3>
                    <button
                      className="btn btn-danger"
                      onClick={(e) => handleDeleteCustomer(customer, e)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        minWidth: 'auto'
                      }}
                    >
                      🗑️ 삭제
                    </button>
                  </div>
                  <div className="customer-details" style={{ marginTop: '10px' }}>
                    <div>
                      <strong>보호자:</strong> {customer.customer_name}
                    </div>
                    <div>
                      <strong>연락처:</strong> {customer.phone}
                    </div>
                    <div>
                      <strong>견종:</strong> {customer.breed}
                    </div>
                    <div>
                      <strong>나이:</strong> {customer.age}살
                    </div>
                    <div>
                      <strong>등록일:</strong>{' '}
                      {new Date(customer.created_at).toLocaleDateString('ko-KR')}
                    </div>
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
              <h2 style={{ color: '#667eea', marginBottom: '15px' }}>
                🐕 {selectedCustomer.dog_name}
              </h2>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                fontSize: '1rem'
              }}>
                <div><strong>보호자:</strong> {selectedCustomer.customer_name}</div>
                <div><strong>연락처:</strong> {selectedCustomer.phone}</div>
                <div><strong>견종:</strong> {selectedCustomer.breed}</div>
                <div><strong>나이:</strong> {selectedCustomer.age}살</div>
                <div><strong>등록일:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString('ko-KR')}</div>
              </div>
            </div>
          </div>

          {/* 통계 */}
          {visitHistory.length > 0 && (
            <div style={{
              background: '#e7f3ff',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#667eea', marginBottom: '10px' }}>📊 이용 통계</h3>
              <div style={{ display: 'flex', gap: '30px', fontSize: '1rem' }}>
                <div>
                  <strong>총 방문:</strong> {getTotalStats().totalVisits}회
                </div>
                <div>
                  <strong>총 이용시간:</strong> {formatDuration(getTotalStats().totalMinutes)}
                </div>
              </div>
            </div>
          )}

          {/* 방문 기록 */}
          <h3 style={{ marginBottom: '15px', color: '#333' }}>
            이용 내역 ({visitHistory.length}건)
          </h3>

          {isLoading ? (
            <div className="empty-state">
              <p>로딩 중...</p>
            </div>
          ) : visitHistory.length === 0 ? (
            <div className="empty-state">
              <p>아직 방문 기록이 없습니다.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>체크인</th>
                    <th>체크아웃</th>
                    <th>이용시간</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {visitHistory.map((visit) => (
                    <tr key={visit.id}>
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
