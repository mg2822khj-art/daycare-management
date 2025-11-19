import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = '/api'

function TrashBin() {
  const [activeTab, setActiveTab] = useState('customers')
  const [deletedCustomers, setDeletedCustomers] = useState([])
  const [deletedVisits, setDeletedVisits] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // 데이터 로드
  useEffect(() => {
    fetchDeletedData()
  }, [activeTab])

  const fetchDeletedData = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'customers') {
        const response = await axios.get(`${API_URL}/trash/customers`)
        setDeletedCustomers(response.data)
      } else {
        const response = await axios.get(`${API_URL}/trash/visits`)
        setDeletedVisits(response.data)
      }
    } catch (error) {
      console.error('삭제된 항목 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 고객 복구
  const handleRestoreCustomer = async (customer) => {
    if (!window.confirm(`"${customer.dog_name}" (${customer.customer_name}님)을 복구하시겠습니까?\n\n모든 방문 기록도 함께 복구됩니다.`)) {
      return
    }

    try {
      await axios.post(`${API_URL}/trash/customers/${customer.id}/restore`)
      alert('고객이 복구되었습니다.')
      fetchDeletedData()
    } catch (error) {
      alert(error.response?.data?.error || '고객 복구 중 오류가 발생했습니다.')
    }
  }

  // 방문 기록 복구
  const handleRestoreVisit = async (visit) => {
    if (!window.confirm(`"${visit.dog_name}"의 방문 기록을 복구하시겠습니까?`)) {
      return
    }

    try {
      await axios.post(`${API_URL}/trash/visits/${visit.id}/restore`)
      alert('방문 기록이 복구되었습니다.')
      fetchDeletedData()
    } catch (error) {
      alert(error.response?.data?.error || '방문 기록 복구 중 오류가 발생했습니다.')
    }
  }

  const formatDateTime = (datetime) => {
    if (!datetime) return '-'
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

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        🗑️ 휴지통 (최근 10개)
      </h2>

      {/* 탭 */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        borderBottom: '2px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'customers' ? '3px solid #667eea' : 'none',
            color: activeTab === 'customers' ? '#667eea' : '#666',
            fontWeight: activeTab === 'customers' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          삭제된 고객
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'visits' ? '3px solid #667eea' : 'none',
            color: activeTab === 'visits' ? '#667eea' : '#666',
            fontWeight: activeTab === 'visits' ? '600' : '400',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          삭제된 방문 기록
        </button>
      </div>

      {isLoading ? (
        <div className="empty-state">
          <p>로딩 중...</p>
        </div>
      ) : (
        <>
          {/* 삭제된 고객 */}
          {activeTab === 'customers' && (
            <>
              {deletedCustomers.length === 0 ? (
                <div className="empty-state">
                  <p>삭제된 고객이 없습니다.</p>
                </div>
              ) : (
                <div className="customer-list">
                  {deletedCustomers.map((customer) => (
                    <div 
                      key={customer.id} 
                      className="customer-item"
                      style={{ 
                        background: '#fff5f5',
                        borderLeft: '4px solid #ef4444'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0, marginBottom: '10px', color: '#ef4444' }}>
                            🗑️ {customer.dog_name}
                          </h3>
                          <div className="customer-details">
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
                              <strong>삭제일:</strong> {formatDateTime(customer.deleted_at)}
                            </div>
                          </div>
                        </div>
                        <button
                          className="btn btn-success"
                          onClick={() => handleRestoreCustomer(customer)}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            minWidth: 'auto'
                          }}
                        >
                          ♻️ 복구
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: '#fff9e6', 
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                ℹ️ 최근 삭제된 10개 항목만 표시됩니다. 고객을 복구하면 모든 방문 기록도 함께 복구됩니다.
              </div>
            </>
          )}

          {/* 삭제된 방문 기록 */}
          {activeTab === 'visits' && (
            <>
              {deletedVisits.length === 0 ? (
                <div className="empty-state">
                  <p>삭제된 방문 기록이 없습니다.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>반려견</th>
                        <th>견종</th>
                        <th>보호자</th>
                        <th>체크인</th>
                        <th>체크아웃</th>
                        <th>이용시간</th>
                        <th>삭제일</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedVisits.map((visit) => (
                        <tr key={visit.id} style={{ background: '#fff5f5' }}>
                          <td><strong>{visit.dog_name || '(삭제된 고객)'}</strong></td>
                          <td>{visit.breed || '-'}</td>
                          <td>{visit.customer_name || '-'}</td>
                          <td>{formatDateTime(visit.check_in)}</td>
                          <td>{formatDateTime(visit.check_out)}</td>
                          <td>
                            <strong style={{ color: '#667eea' }}>
                              {formatDuration(visit.duration_minutes)}
                            </strong>
                          </td>
                          <td style={{ color: '#ef4444' }}>
                            {formatDateTime(visit.deleted_at)}
                          </td>
                          <td>
                            <button
                              className="btn btn-success"
                              onClick={() => handleRestoreVisit(visit)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.85rem',
                                minWidth: 'auto'
                              }}
                            >
                              ♻️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ 
                marginTop: '20px', 
                padding: '15px', 
                background: '#fff9e6', 
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                ℹ️ 최근 삭제된 10개 항목만 표시됩니다. 고객이 삭제된 경우 해당 고객의 정보는 표시되지 않습니다.
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default TrashBin

