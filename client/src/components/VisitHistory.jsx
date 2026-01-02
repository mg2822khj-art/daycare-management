import { useState, useEffect } from 'react'
import axios from 'axios'
import * as XLSX from 'xlsx'

const API_URL = '/api' // 상대 경로 사용 (모바일 지원)

function VisitHistory() {
  const [history, setHistory] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 초기 로드 (전체 기록)
  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async (date = null) => {
    setIsLoading(true)
    try {
      let url = `${API_URL}/visit-history`
      if (date) {
        url += `?date=${date}`
      }
      const response = await axios.get(url)
      setHistory(response.data)
    } catch (error) {
      console.error('방문 기록 조회 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateChange = (e) => {
    const date = e.target.value
    setSelectedDate(date)
    if (date) {
      fetchHistory(date)
    }
  }

  const handleQuickSelect = (days) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    const dateStr = date.toISOString().split('T')[0]
    setSelectedDate(dateStr)
    fetchHistory(dateStr)
  }

  const handleShowAll = () => {
    setSelectedDate('')
    fetchHistory()
  }

  const formatDateTime = (datetime) => {
    const date = new Date(datetime)
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (datetime) => {
    const date = new Date(datetime)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
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

  // 날짜별로 그룹화
  const groupByDate = (records) => {
    const groups = {}
    records.forEach(record => {
      const date = record.check_in.split(' ')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(record)
    })
    return groups
  }

  const groupedHistory = groupByDate(history)
  const totalVisits = history.length
  const totalDuration = history.reduce((sum, visit) => sum + (visit.duration_minutes || 0), 0)

  // 방문 기록 삭제
  const handleDeleteVisit = async (visitId, dogName) => {
    if (!window.confirm(`"${dogName}"의 이 방문 기록을 삭제하시겠습니까?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await axios.delete(`${API_URL}/visits/${visitId}`)
      alert('방문 기록이 삭제되었습니다.')
      // 현재 필터 조건으로 다시 조회
      fetchHistory(selectedDate || null)
    } catch (error) {
      alert(error.response?.data?.error || '방문 기록 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  // 고객별 방문기록 엑셀 내보내기
  const handleExportToExcel = () => {
    if (history.length === 0) {
      alert('내보낼 방문 기록이 없습니다.')
      return
    }

    // 고객별로 그룹화
    const groupedByCustomer = {}
    history.forEach(visit => {
      const key = `${visit.customer_name}_${visit.dog_name}`
      if (!groupedByCustomer[key]) {
        groupedByCustomer[key] = {
          customer_name: visit.customer_name,
          dog_name: visit.dog_name,
          breed: visit.breed,
          phone: visit.phone,
          visits: []
        }
      }
      groupedByCustomer[key].visits.push(visit)
    })

    // 엑셀 데이터 생성
    const excelData = []
    
    // 헤더 행
    excelData.push([
      '반려견명',
      '견종',
      '보호자명',
      '연락처',
      '방문타입',
      '체크인',
      '체크아웃',
      '이용시간',
      '방문횟수',
      '총 이용시간'
    ])

    // 고객별 데이터 추가
    Object.values(groupedByCustomer).forEach(customer => {
      const totalVisits = customer.visits.length
      const totalMinutes = customer.visits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0)
      
      // 첫 번째 방문 기록
      customer.visits.forEach((visit, index) => {
        const visitTypeLabel = visit.visit_type === 'daycare' ? '데이케어' : '호텔링'
        
        excelData.push([
          index === 0 ? customer.dog_name : '',
          index === 0 ? customer.breed : '',
          index === 0 ? customer.customer_name : '',
          index === 0 ? customer.phone : '',
          visitTypeLabel,
          formatDateTime(visit.check_in),
          formatDateTime(visit.check_out),
          formatDuration(visit.duration_minutes),
          index === 0 ? `${totalVisits}회` : '',
          index === 0 ? formatDuration(totalMinutes) : ''
        ])
      })
      
      // 고객 간 구분선 (빈 행)
      excelData.push([])
    })

    // 워크북 생성
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(excelData)

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 12 }, // 반려견명
      { wch: 12 }, // 견종
      { wch: 10 }, // 보호자명
      { wch: 15 }, // 연락처
      { wch: 10 }, // 방문타입
      { wch: 14 }, // 체크인
      { wch: 14 }, // 체크아웃
      { wch: 12 }, // 이용시간
      { wch: 10 }, // 방문횟수
      { wch: 12 }  // 총 이용시간
    ]

    XLSX.utils.book_append_sheet(wb, ws, '고객별 방문기록')

    // 파일명 생성
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]
    const fileName = selectedDate 
      ? `방문기록_${selectedDate}.xlsx`
      : `방문기록_전체_${dateStr}.xlsx`

    // 파일 다운로드
    XLSX.writeFile(wb, fileName)
  }

  return (
    <div className="card">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ marginBottom: '15px', color: '#333' }}>
          방문 기록 📅
        </h2>

        {/* 날짜 선택 버튼들 */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <button
            className="btn btn-primary"
            onClick={() => handleQuickSelect(0)}
            style={{ padding: '10px 20px' }}
          >
            오늘
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleQuickSelect(1)}
            style={{ padding: '10px 20px' }}
          >
            어제
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleQuickSelect(7)}
            style={{ padding: '10px 20px' }}
          >
            7일전
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowDatePicker(!showDatePicker)}
            style={{ padding: '10px 20px' }}
          >
            📅 날짜 선택
          </button>
          <button
            className="btn"
            onClick={handleShowAll}
            style={{ 
              padding: '10px 20px',
              background: '#6c757d',
              color: 'white'
            }}
          >
            전체 보기
          </button>
          <button
            className="btn"
            onClick={handleExportToExcel}
            disabled={history.length === 0}
            style={{ 
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              opacity: history.length === 0 ? 0.5 : 1,
              cursor: history.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            📊 엑셀 다운로드 (고객별)
          </button>
        </div>

        {/* 캘린더 */}
        {showDatePicker && (
          <div style={{ 
            background: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '15px'
          }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              날짜 선택:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              style={{
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #667eea',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '300px'
              }}
            />
          </div>
        )}

        {/* 통계 */}
        {selectedDate && (
          <div style={{
            background: '#e7f3ff',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px'
          }}>
            <strong style={{ color: '#667eea' }}>
              {formatDate(selectedDate)} 통계
            </strong>
            <div style={{ marginTop: '8px', color: '#666' }}>
              총 방문: {totalVisits}건 | 총 이용시간: {formatDuration(totalDuration)}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="empty-state">
          <p>로딩 중...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <p>
            {selectedDate 
              ? `${formatDate(selectedDate)} 방문 기록이 없습니다.`
              : '방문 기록이 없습니다.'
            }
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* 날짜별로 표시 */}
          {Object.keys(groupedHistory).sort().reverse().map(date => (
            <div key={date} style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                color: '#667eea', 
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '2px solid #667eea'
              }}>
                {formatDate(date)} ({groupedHistory[date].length}건)
              </h3>
              
              <table className="history-table">
                <thead>
                  <tr>
                    <th>타입</th>
                    <th>반려견</th>
                    <th>견종</th>
                    <th>보호자</th>
                    <th>연락처</th>
                    <th>체크인</th>
                    <th>체크아웃</th>
                    <th>이용시간</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedHistory[date].map((visit) => (
                    <tr key={visit.id}>
                      <td>
                        <span style={{ 
                          padding: '4px 10px',
                          background: visit.visit_type === 'daycare' ? '#fef3c7' : '#dbeafe',
                          color: visit.visit_type === 'daycare' ? '#92400e' : '#1e40af',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {visit.visit_type === 'daycare' ? '☀️ 데이케어' : '🌙 호텔링'}
                        </span>
                      </td>
                      <td><strong>{visit.dog_name}</strong></td>
                      <td>{visit.breed}</td>
                      <td>{visit.customer_name}</td>
                      <td>{visit.phone}</td>
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
                          onClick={() => handleDeleteVisit(visit.id, visit.dog_name)}
                          disabled={isDeleting}
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
          ))}
        </div>
      )}
    </div>
  )
}

export default VisitHistory
