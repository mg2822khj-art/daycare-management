import { useState } from 'react'
import axios from 'axios'

const API_URL = '/api' // 상대 경로 사용 (모바일 지원)

function CustomerRegistration({ onRegistered }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    dog_name: '',
    breed: '',
    age: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await axios.post(`${API_URL}/customers`, {
        ...formData,
        age: parseInt(formData.age)
      })

      setMessage({ type: 'success', text: response.data.message })
      setFormData({
        customer_name: '',
        phone: '',
        dog_name: '',
        breed: '',
        age: ''
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

        <div className="form-group">
          <label htmlFor="breed">견종 *</label>
          <input
            type="text"
            id="breed"
            name="breed"
            value={formData.breed}
            onChange={handleChange}
            required
            placeholder="푸들"
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">나이 (살) *</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
            min="0"
            max="30"
            step="1"
            placeholder="1"
          />
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
            예: 1살, 2살, 3살 등 (0살은 1살 미만)
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

