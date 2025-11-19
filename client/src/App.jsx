import { useState, useEffect } from 'react'
import axios from 'axios'
import CustomerRegistration from './components/CustomerRegistration'
import CheckInOut from './components/CheckInOut'
import CustomerList from './components/CustomerList'
import VisitHistory from './components/VisitHistory'
import TrashBin from './components/TrashBin'

const API_URL = '/api' // 상대 경로 사용 (모바일 지원)

function App() {
  const [activeTab, setActiveTab] = useState('daycare')
  const [customers, setCustomers] = useState([])
  const [currentVisits, setCurrentVisits] = useState([])

  // 고객 목록 불러오기
  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`)
      setCustomers(response.data)
    } catch (error) {
      console.error('고객 목록 로드 실패:', error)
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

  // 체크인/아웃 후 데이터 새로고침
  const handleRefresh = () => {
    fetchCurrentVisits()
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
          />
        )}

        {activeTab === 'hoteling' && (
          <CheckInOut
            visitType="hoteling"
            currentVisits={currentVisits}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === 'register' && (
          <CustomerRegistration onRegistered={fetchCustomers} />
        )}

        {activeTab === 'customers' && (
          <CustomerList customers={customers} onUpdate={fetchCustomers} />
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

