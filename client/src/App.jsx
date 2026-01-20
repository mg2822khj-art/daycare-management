import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import CustomerRegistration from './components/CustomerRegistration'
import CheckInOut from './components/CheckInOut'
import CustomerList from './components/CustomerList'
import VisitHistory from './components/VisitHistory'
import TrashBin from './components/TrashBin'
import HotelingCalendar from './components/HotelingCalendar'

const API_URL = '/api' // 상대 경로 사용 (모바일 지원)

function App() {
  const [activeTab, setActiveTab] = useState('daycare')
  const [customers, setCustomers] = useState([])
  const [currentVisits, setCurrentVisits] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0) // 새로고침 트리거
  const calendarRef = useRef(null)
  const hotelingRef = useRef(null)

  // 고객 목록 불러오기 (평탄화된 형태로 변환)
  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`)
      console.log('📋 고객 데이터 수신:', response.data?.length || 0, '건')
      
      // 고객별로 강아지 정보를 포함한 평탄화된 배열 생성
      const flattenedCustomers = []
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(customer => {
          if (customer.dogs && Array.isArray(customer.dogs) && customer.dogs.length > 0) {
            // 각 강아지마다 별도의 항목으로 추가
            customer.dogs.forEach(dog => {
              flattenedCustomers.push({
                id: customer.id, // 고객 ID (호환성)
                dog_id: dog.id, // 강아지 ID
                customer_id: customer.id,
                dog_name: dog.dog_name,
                customer_name: customer.customer_name,
                phone: customer.phone,
                breed: dog.breed,
                age_years: dog.age_years || 0,
                age_months: dog.age_months || 0,
                weight: dog.weight,
                birth_date: dog.birth_date,
                created_at: customer.created_at
              })
            })
          } else if (customer.dog_name) {
            // 기존 호환성: dog_name이 직접 있는 경우 (구버전 데이터)
            flattenedCustomers.push({
              id: customer.id,
              customer_id: customer.id,
              dog_name: customer.dog_name,
              customer_name: customer.customer_name,
              phone: customer.phone,
              breed: customer.breed,
              age_years: customer.age_years || 0,
              age_months: customer.age_months || 0,
              weight: customer.weight,
              created_at: customer.created_at
            })
          }
        })
      }
      console.log('📊 평탄화된 고객 데이터:', flattenedCustomers.length, '건')
      setCustomers(flattenedCustomers)
    } catch (error) {
      console.error('고객 목록 로드 실패:', error)
      setCustomers([])
    }
  }

  // 현재 체크인 목록 불러오기
  const fetchCurrentVisits = async () => {
    try {
      const response = await axios.get(`${API_URL}/current-visits`)
      setCurrentVisits(response.data)
    } catch (error) {
      console.error('방문 목록 로드 실패:', error)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    fetchCustomers()
    fetchCurrentVisits()
  }, [])

  // 체크인/아웃 또는 예약 변경 후 전체 새로고침
  const handleRefresh = () => {
    console.log('🔄 전체 데이터 새로고침 실행')
    fetchCurrentVisits()
    // 새로고침 트리거를 변경하여 자식 컴포넌트들이 감지하도록 함
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🐕 댕스케어 호텔링/데이케어 관리</h1>
        <p>반려견 호텔링 & 데이케어 통합 관리 시스템</p>
      </header>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'daycare' ? 'active' : ''}`}
          onClick={() => setActiveTab('daycare')}
        >
          데이케어
        </button>
        <button
          className={`tab-button ${activeTab === 'hoteling' ? 'active' : ''}`}
          onClick={() => setActiveTab('hoteling')}
        >
          호텔링
        </button>
        <button
          className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          고객 등록
        </button>
        <button
          className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          고객 목록
        </button>
        <button
          className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          🗓️ 예약 캘린더
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          방문 기록
        </button>
        <button
          className={`tab-button ${activeTab === 'trash' ? 'active' : ''}`}
          onClick={() => setActiveTab('trash')}
        >
          🗑️ 휴지통
        </button>
      </div>

      <div className="content">
        {activeTab === 'daycare' && (
          <CheckInOut
            visitType="daycare"
            currentVisits={currentVisits}
            onRefresh={handleRefresh}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'hoteling' && (
          <CheckInOut
            visitType="hoteling"
            currentVisits={currentVisits}
            onRefresh={handleRefresh}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'register' && (
          <CustomerRegistration onRegistered={fetchCustomers} />
        )}

        {activeTab === 'customers' && (
          <CustomerList customers={customers} onUpdate={fetchCustomers} />
        )}

        {activeTab === 'calendar' && (
          <HotelingCalendar 
            onRefresh={handleRefresh} 
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'history' && (
          <VisitHistory />
        )}

        {activeTab === 'trash' && (
          <TrashBin />
        )}
      </div>
    </div>
  )
}

export default App

