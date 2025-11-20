import { useState } from 'react'
import axios from 'axios'

const API_URL = '/api'

// 한국에서 흔한 견종 리스트
const BREED_LIST = [
  '골든 리트리버',
  '그레이 하운드',
  '그레이트 데인',
  '그레이트 피레니즈',
  '닥스훈트',
  '도베르만',
  '도사견',
  '동경견',
  '라브라도 리트리버',
  '래빗 닥스훈트',
  '로트와일러',
  '말라뮤트',
  '말티즈',
  '믹스견',
  '미니어처 닥스훈트',
  '미니어처 슈나우저',
  '미니어처 푸들',
  '바센지',
  '버니즈 마운틴 독',
  '베들링턴 테리어',
  '보더 콜리',
  '볼로네즈',
  '불독',
  '불 테리어',
  '비글',
  '비숑 프리제',
  '비어디드 콜리',
  '사모예드',
  '삽살개',
  '샤페이',
  '세인트 버나드',
  '센트럴 아시안 셰퍼드',
  '셰틀랜드 쉽독',
  '슈나우저',
  '스코티시 테리어',
  '스피츠',
  '시바견',
  '시베리안 허스키',
  '시추',
  '실키 테리어',
  '아메리칸 코커 스패니얼',
  '아이리시 세터',
  '알래스칸 말라뮤트',
  '요크셔 테리어',
  '웰시 코기',
  '웰시코기 카디건',
  '웰시코기 펨브로크',
  '잉글리시 코커 스패니얼',
  '잉글리시 불독',
  '잉글리시 세터',
  '잉글리시 스프링거 스패니얼',
  '재패니즈 스피츠',
  '잭 러셀 테리어',
  '저먼 셰퍼드',
  '제페니즈 친',
  '진돗개',
  '차우차우',
  '차이니즈 크레스티드',
  '치와와',
  '카발리에 킹 찰스 스패니얼',
  '케언 테리어',
  '케리 블루 테리어',
  '코리안 마스티프',
  '코카 푸',
  '코카스파니엘',
  '콜리',
  '토이 맨체스터 테리어',
  '토이 푸들',
  '티베탄 마스티프',
  '티베탄 스파니엘',
  '파피용',
  '퍼그',
  '페키니즈',
  '포메라니안',
  '폭스 테리어',
  '푸들',
  '풍산개',
  '프렌치 불독',
  '플랫 코티드 리트리버',
  '피레니언 마운틴 독',
  '핏불 테리어',
  '화이트 테리어',
].sort()

function CustomerRegistration({ onRegistered }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    dog_name: '',
    breed: '',
    age_years: '',
    age_months: '',
    weight: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [breedSuggestions, setBreedSuggestions] = useState([])
  const [showBreedSuggestions, setShowBreedSuggestions] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })

    // 견종 입력시 자동완성 제안
    if (name === 'breed' && value) {
      const filtered = BREED_LIST.filter(breed => 
        breed.toLowerCase().includes(value.toLowerCase())
      )
      setBreedSuggestions(filtered)
      setShowBreedSuggestions(true)
    } else if (name === 'breed' && !value) {
      setShowBreedSuggestions(false)
    }
  }

  const handleBreedSelect = (breed) => {
    setFormData({
      ...formData,
      breed: breed
    })
    setShowBreedSuggestions(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      // 나이를 생년월일로 변환
      const years = parseInt(formData.age_years) || 0
      const months = parseInt(formData.age_months) || 0
      
      const today = new Date()
      const birthDate = new Date(today.getFullYear() - years, today.getMonth() - months, today.getDate())
      const birth_date = birthDate.toISOString().split('T')[0]

      const response = await axios.post(`${API_URL}/customers`, {
        customer_name: formData.customer_name,
        phone: formData.phone,
        dog_name: formData.dog_name,
        breed: formData.breed,
        birth_date: birth_date,
        weight: formData.weight ? parseFloat(formData.weight) : null
      })

      setMessage({ type: 'success', text: response.data.message })
      setFormData({
        customer_name: '',
        phone: '',
        dog_name: '',
        breed: '',
        age_years: '',
        age_months: '',
        weight: ''
      })
      
      // 고객 목록 새로고침
      if (onRegistered) {
        onRegistered()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || '고객 등록 중 오류가 발생했습니다.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', color: '#333' }}>신규 고객 등록</h2>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="customer_name">보호자 이름 *</label>
          <input
            type="text"
            id="customer_name"
            name="customer_name"
            value={formData.customer_name}
            onChange={handleChange}
            required
            placeholder="홍길동"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">연락처 *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="010-1234-5678"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dog_name">반려견 이름 *</label>
          <input
            type="text"
            id="dog_name"
            name="dog_name"
            value={formData.dog_name}
            onChange={handleChange}
            required
            placeholder="뽀삐"
          />
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label htmlFor="breed">견종 *</label>
          <input
            type="text"
            id="breed"
            name="breed"
            value={formData.breed}
            onChange={handleChange}
            onFocus={() => {
              if (formData.breed) {
                setShowBreedSuggestions(true)
              }
            }}
            required
            placeholder="견종을 입력하세요 (예: 푸들, 말티즈)"
            autoComplete="off"
          />
          {showBreedSuggestions && breedSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '8px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              marginTop: '5px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              {breedSuggestions.map((breed, index) => (
                <div
                  key={index}
                  onClick={() => handleBreedSelect(breed)}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderBottom: index < breedSuggestions.length - 1 ? '1px solid #eee' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f4ff'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  {breed}
                </div>
              ))}
            </div>
          )}
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
            입력하면 자동완성 목록이 나타납니다
          </small>
        </div>

        <div className="form-group">
          <label>나이 *</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                name="age_years"
                value={formData.age_years}
                onChange={handleChange}
                required
                min="0"
                max="30"
                placeholder="0"
                style={{ width: '100%' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                살
              </small>
            </div>
            <div style={{ flex: 1 }}>
              <input
                type="number"
                name="age_months"
                value={formData.age_months}
                onChange={handleChange}
                min="0"
                max="11"
                placeholder="0"
                style={{ width: '100%' }}
              />
              <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
                개월
              </small>
            </div>
          </div>
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
            예: 1살 3개월 → 1살 + 3개월
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="weight">몸무게 (kg)</label>
          <input
            type="number"
            id="weight"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            min="0"
            step="0.1"
            placeholder="예: 5.5"
            style={{ width: '100%' }}
          />
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
            데이케어 요금 계산에 사용됩니다 (선택사항)
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          style={{ width: '100%' }}
        >
          {isSubmitting ? '등록 중...' : '고객 등록'}
        </button>
      </form>
    </div>
  )
}

export default CustomerRegistration
