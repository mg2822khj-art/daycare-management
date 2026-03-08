import { useState, useEffect } from 'react'
import axios from 'axios'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'

const API_URL = '/api'

function HotelingCalendar({ onRefresh, refreshTrigger }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [reservations, setReservations] = useState([])
  const [currentMonthReservations, setCurrentMonthReservations] = useState([])
  const [currentVisits, setCurrentVisits] = useState([])
  const [dateVisitHistory, setDateVisitHistory] = useState([])
  // 예약용 고객 전체 목록 (한 번만 불러와서 클라이언트에서 검색)
  const [allCustomers, setAllCustomers] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [checkInReservation, setCheckInReservation] = useState(null)
  const [prepaid, setPrepaid] = useState(false)
  const [prepaidAmount, setPrepaidAmount] = useState('')
  const [prepaidMethod, setPrepaidMethod] = useState('')
  const [checkoutConfirm, setCheckoutConfirm] = useState(null)
  const [feeInfo, setFeeInfo] = useState(null)
  const [editingVisit, setEditingVisit] = useState(null)
  const [editCheckInTime, setEditCheckInTime] = useState('')
  const [editPrepaid, setEditPrepaid] = useState(false)
  const [editPrepaidAmount, setEditPrepaidAmount] = useState('')
  const [editCheckOutTime, setEditCheckOutTime] = useState('')
  const [showPlannedCheckoutModal, setShowPlannedCheckoutModal] = useState(false)
  const [planningVisit, setPlanningVisit] = useState(null)
  const [plannedCheckoutInput, setPlannedCheckoutInput] = useState('')
  
  // 예약 폼 데이터
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    dog_name: '',
    start_date: '',
    end_date: '',
    notes: '',
    prepaid: false,
    prepaid_amount: '',
    prepaid_payment_method: ''
  })

  // refreshTrigger가 변경되면 데이터 새로고침
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 캘린더: refreshTrigger 감지, 데이터 새로고침', refreshTrigger)
      fetchCurrentVisits()
      fetchMonthReservations(selectedDate)
      fetchDateReservations(selectedDate)
      fetchDateVisitHistory(selectedDate)
    }
  }, [refreshTrigger])

  // 현재 월의 예약 불러오기
  useEffect(() => {
    const loadData = async () => {
      await fetchMonthReservations(selectedDate)
      await fetchCurrentVisits()
    }
    loadData()
  }, [selectedDate])

  // 선택한 날짜의 예약 및 방문 기록 불러오기
  useEffect(() => {
    if (currentMonthReservations.length >= 0) {
      fetchDateReservations(selectedDate)
    }
    fetchDateVisitHistory(selectedDate)
  }, [selectedDate, currentMonthReservations.length])

  // 날짜를 YYYY-MM-DD 형식으로 변환 (로컬 시간대 기준)
  const formatDateToString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 호텔링 예약용 고객 전체 목록 불러오기 (한 번만)
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        console.log('📋 호텔링 예약용 고객 목록 불러오기...')
        const response = await axios.get(`${API_URL}/customers`)
        if (Array.isArray(response.data)) {
          // 여러 스키마 형태를 모두 지원하기 위해 그대로 저장
          setAllCustomers(response.data)
          console.log('📋 고객 수:', response.data.length)
        } else {
          console.error('고객 목록 응답이 배열이 아닙니다:', response.data)
          setAllCustomers([])
        }
      } catch (error) {
        console.error('고객 목록 불러오기 실패:', error)
        setAllCustomers([])
      }
    }
    loadCustomers()
  }, [])

  // 현재 체크인 목록 불러오기
  const fetchCurrentVisits = async () => {
    try {
      const response = await axios.get(`${API_URL}/current-visits`)
      // 호텔링만 필터링하고 배열인지 확인
      if (Array.isArray(response.data)) {
        const hotelingVisits = response.data.filter(visit => visit.visit_type === 'hoteling')
        setCurrentVisits(hotelingVisits)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setCurrentVisits([])
      }
    } catch (error) {
      console.error('체크인 목록 조회 실패:', error)
      setCurrentVisits([])
    }
  }

  const fetchMonthReservations = async (date) => {
    try {
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = formatDateToString(new Date(year, month, 1))
      const lastDay = formatDateToString(new Date(year, month + 1, 0))
      
      const response = await axios.get(`${API_URL}/reservations`, {
        params: { start_date: firstDay, end_date: lastDay }
      })
      // 배열인지 확인
      if (Array.isArray(response.data)) {
        setCurrentMonthReservations(response.data)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setCurrentMonthReservations([])
      }
    } catch (error) {
      console.error('예약 조회 실패:', error)
      setCurrentMonthReservations([])
    }
  }

  const fetchDateReservations = (date) => {
    const dateStr = formatDateToString(date)
    const filtered = currentMonthReservations.filter(res => {
      return dateStr >= res.start_date && dateStr <= res.end_date
    })
    setReservations(filtered)
  }

  // 선택한 날짜의 방문 기록 불러오기 (해당 날짜에 이용 중이었던 모든 호텔링)
  const fetchDateVisitHistory = async (date) => {
    try {
      const dateStr = formatDateToString(date)
      const response = await axios.get(`${API_URL}/hoteling-visits-on-date`, {
        params: { date: dateStr }
      })
      console.log('선택한 날짜의 호텔링 이용 기록:', response.data)
      // 응답이 배열인지 확인
      if (Array.isArray(response.data)) {
        setDateVisitHistory(response.data)
      } else {
        console.error('API 응답이 배열이 아닙니다:', response.data)
        setDateVisitHistory([])
      }
    } catch (error) {
      console.error('방문 기록 조회 실패:', error)
      setDateVisitHistory([])
    }
  }

  // 고객 검색 (백엔드 검색 API 대신, 미리 불러온 allCustomers에서 필터)
  const handleSearch = async (term) => {
    setSearchTerm(term)
    if (!term || term.trim().length === 0) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    try {
      const keyword = term.trim().toLowerCase()
      // 다양한 구조를 지원: 단일 고객+강아지 / 고객+dogs 배열 등
      const results = []

      allCustomers.forEach((c) => {
        // 형태 1: 고객 한 명 + 단일 강아지 필드(dog_name, breed)
        const baseMatch =
          (c.customer_name && c.customer_name.toLowerCase().includes(keyword)) ||
          (c.phone && c.phone.toLowerCase().includes(keyword)) ||
          (c.dog_name && c.dog_name.toLowerCase().includes(keyword)) ||
          (c.breed && c.breed.toLowerCase().includes(keyword))

        // 형태 2: 고객 + dogs 배열
        if (Array.isArray(c.dogs) && c.dogs.length > 0) {
          c.dogs.forEach((dog) => {
            const dogMatch =
              (dog.dog_name && dog.dog_name.toLowerCase().includes(keyword)) ||
              (dog.breed && dog.breed.toLowerCase().includes(keyword))

            if (baseMatch || dogMatch) {
              results.push({
                // 검색 결과에 필요한 공통 필드로 변환
                id: dog.id || dog.dog_id || dog.id,
                customer_id: c.id || c.customer_id,
                customer_name: c.customer_name,
                phone: c.phone,
                dog_name: dog.dog_name,
                breed: dog.breed,
              })
            }
          })
        } else if (baseMatch) {
          // 단일 강아지 구조
          results.push({
            id: c.id,
            customer_id: c.id,
            customer_name: c.customer_name,
            phone: c.phone,
            dog_name: c.dog_name || '(이름 없음)',
            breed: c.breed || '',
          })
        }
      })

      console.log('🔍 로컬 필터링 검색 결과:', results)
      setSearchResults(results)
      setIsSearching(false)
    } catch (error) {
      console.error('검색 필터링 실패:', error)
      setSearchResults([])
      setIsSearching(false)
    }
  }

  // 고객 선택
  const handleSelectCustomer = (customer) => {
    console.log('🔍 고객 선택:', customer)
    
    // customer_id 확인 및 설정
    const customerId = customer.customer_id || customer.customerId || customer.id
    
    if (!customerId) {
      console.error('❌ customer_id를 찾을 수 없습니다:', customer)
      alert('고객 정보에 오류가 있습니다. 다시 검색해주세요.')
      return
    }
    
    setFormData({
      ...formData,
      customer_id: customerId,
      customer_name: customer.customer_name || '',
      dog_name: customer.dog_name || ''
    })
    
    console.log('✅ formData 업데이트:', {
      customer_id: customerId,
      customer_name: customer.customer_name,
      dog_name: customer.dog_name
    })
    
    setSearchTerm(`${customer.dog_name} (${customer.customer_name})`)
    setSearchResults([])
    setIsSearching(false)
  }

  // 예약 추가 모달 열기
  const handleAddReservation = () => {
    const dateStr = formatDateToString(selectedDate)
    setFormData({
      customer_id: '',
      customer_name: '',
      dog_name: '',
      start_date: dateStr,
      end_date: dateStr,
      notes: '',
      prepaid: false,
      prepaid_amount: '',
      prepaid_payment_method: ''
    })
    setSearchTerm('')
    setSearchResults([])
    setShowAddModal(true)
  }

  // 예약 수정 모달 열기
  const handleEditReservation = (reservation) => {
    setSelectedReservation(reservation)
    setFormData({
      customer_id: reservation.customer_id,
      customer_name: reservation.customer_name,
      dog_name: reservation.dog_name,
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      notes: reservation.notes || '',
      prepaid: Boolean(reservation.prepaid) || Number(reservation.prepaid_amount || 0) > 0,
      prepaid_amount: Number(reservation.prepaid_amount || 0) > 0 ? String(reservation.prepaid_amount) : '',
      prepaid_payment_method: reservation.prepaid_payment_method || ''
    })
    setSearchTerm(`${reservation.dog_name} (${reservation.customer_name})`)
    setShowEditModal(true)
  }

  // 예약 생성
  const handleCreateReservation = async (e) => {
    e.preventDefault()
    
    console.log('📝 예약 생성 시도:', formData)
    
    // customer_id 확인
    let customerId = formData.customer_id
    
    // customer_id가 없으면 검색 결과에서 찾기
    if (!customerId && searchResults && searchResults.length > 0) {
      const matched = searchResults.find(item => {
        const label = `${item.dog_name} (${item.customer_name})`
        return label === searchTerm
      }) || searchResults[0]
      
      if (matched) {
        customerId = matched.customer_id || matched.customerId
        console.log('✅ 검색 결과에서 customer_id 추출:', customerId, matched)
      }
    }
    
    // 최종 확인
    if (!customerId) {
      console.error('❌ customer_id 없음:', { formData, searchResults, searchTerm })
      alert('고객을 선택해주세요.\n검색 결과 목록에서 고객을 클릭해서 선택해야 합니다.')
      return
    }
    
    console.log('✅ 예약 생성 요청:', {
      customer_id: customerId,
      start_date: formData.start_date,
      end_date: formData.end_date,
      notes: formData.notes
    })

    const parsedPrepaidAmount = formData.prepaid ? parseFloat(formData.prepaid_amount || 0) : 0
    if (formData.prepaid && (Number.isNaN(parsedPrepaidAmount) || parsedPrepaidAmount <= 0)) {
      alert('선결제 금액을 입력해주세요.')
      return
    }
    if (formData.prepaid && !formData.prepaid_payment_method) {
      alert('선결제 결제 수단을 선택해주세요.')
      return
    }

    try {
      const response = await axios.post(`${API_URL}/reservations`, {
        customer_id: customerId,
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes,
        prepaid: formData.prepaid && parsedPrepaidAmount > 0,
        prepaid_amount: formData.prepaid ? parsedPrepaidAmount : 0,
        prepaid_payment_method: formData.prepaid ? formData.prepaid_payment_method : null
      })
      
      console.log('✅ 예약 생성 성공:', response.data)
      alert('예약이 등록되었습니다.')
      setShowAddModal(false)
      fetchMonthReservations(selectedDate)
      onRefresh() // 호텔링 카테고리에도 반영
    } catch (error) {
      console.error('❌ 예약 생성 오류:', error)
      alert(error.response?.data?.error || '예약 등록 중 오류가 발생했습니다.')
    }
  }

  // 예약 수정
  const handleUpdateReservation = async (e) => {
    e.preventDefault()

    const parsedPrepaidAmount = formData.prepaid ? parseFloat(formData.prepaid_amount || 0) : 0
    if (formData.prepaid && (Number.isNaN(parsedPrepaidAmount) || parsedPrepaidAmount <= 0)) {
      alert('선결제 금액을 입력해주세요.')
      return
    }
    if (formData.prepaid && !formData.prepaid_payment_method) {
      alert('선결제 결제 수단을 선택해주세요.')
      return
    }
    
    try {
      await axios.put(`${API_URL}/reservations/${selectedReservation.id}`, {
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes,
        status: 'confirmed',
        prepaid: formData.prepaid && parsedPrepaidAmount > 0,
        prepaid_amount: formData.prepaid ? parsedPrepaidAmount : 0,
        prepaid_payment_method: formData.prepaid ? formData.prepaid_payment_method : null
      })
      
      alert('예약이 수정되었습니다.')
      setShowEditModal(false)
      fetchMonthReservations(selectedDate)
      onRefresh() // 호텔링 카테고리에도 반영
    } catch (error) {
      alert(error.response?.data?.error || '예약 수정 중 오류가 발생했습니다.')
    }
  }

  // 예약 삭제
  const handleDeleteReservation = async (reservationId, dogName) => {
    if (!window.confirm(`"${dogName}"의 예약을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await axios.delete(`${API_URL}/reservations/${reservationId}`)
      alert('예약이 삭제되었습니다.')
      setShowEditModal(false)
      fetchMonthReservations(selectedDate)
      onRefresh() // 호텔링 카테고리에도 반영
    } catch (error) {
      alert(error.response?.data?.error || '예약 삭제 중 오류가 발생했습니다.')
    }
  }

  // 체크인 상태 확인
  const isSameCustomerId = (a, b) => String(a) === String(b)

  const isCheckedIn = (customerId) => {
    return currentVisits.some(visit => 
      visit.visit_type === 'hoteling' && isSameCustomerId(visit.customer_id, customerId)
    )
  }

  // 예약 캘린더 목록에서는 이미 체크인된 아이를 제외
  const visibleReservations = reservations.filter(
    reservation => !isCheckedIn(reservation.customer_id)
  )

  // 체크인된 visit ID 찾기
  const getVisitId = (customerId) => {
    const visit = currentVisits.find(visit => 
      visit.customer_id === customerId && visit.visit_type === 'hoteling'
    )
    return visit ? visit.id : null
  }

  const getReservationByCustomer = (customerId) => {
    const merged = [...reservations, ...currentMonthReservations]
    const uniqueReservations = Array.from(
      new Map(merged.map((item) => [item.id, item])).values()
    )
    return uniqueReservations.find((reservation) =>
      isSameCustomerId(reservation.customer_id, customerId)
    )
  }

  const openPlannedCheckoutModal = (visit) => {
    const reservation = getReservationByCustomer(visit.customer_id)
    setPlanningVisit(visit)
    setPlannedCheckoutInput(reservation?.end_date || '')
    setShowPlannedCheckoutModal(true)
  }

  const closePlannedCheckoutModal = () => {
    setShowPlannedCheckoutModal(false)
    setPlanningVisit(null)
    setPlannedCheckoutInput('')
  }

  const savePlannedCheckoutDate = async () => {
    if (!planningVisit || !plannedCheckoutInput) {
      alert('종료 예정일을 입력해주세요.')
      return
    }

    try {
      await axios.post(`${API_URL}/hoteling/planned-checkout`, {
        customer_id: planningVisit.customer_id,
        end_date: plannedCheckoutInput
      })

      alert('진행 중 호텔링 종료 예정일이 저장되었습니다.')
      closePlannedCheckoutModal()
      await fetchMonthReservations(selectedDate)
      fetchDateReservations(selectedDate)
      fetchDateVisitHistory(selectedDate)
      fetchCurrentVisits()
      if (onRefresh) onRefresh()
    } catch (error) {
      alert(error.response?.data?.error || '종료 예정일 저장 중 오류가 발생했습니다.')
    }
  }

  // 체크인 모달 열기
  const handleCheckIn = (reservation) => {
    setCheckInReservation(reservation)
    const reservedPrepaidAmount = Number(reservation.prepaid_amount || 0)
    const hasReservedPrepaid = Boolean(reservation.prepaid) || reservedPrepaidAmount > 0
    setPrepaid(hasReservedPrepaid)
    setPrepaidAmount(hasReservedPrepaid && reservedPrepaidAmount > 0 ? String(reservedPrepaidAmount) : '')
    setPrepaidMethod(hasReservedPrepaid ? (reservation.prepaid_payment_method || '') : '')
    setShowCheckInModal(true)
  }

  // 체크인 처리
  const handleConfirmCheckIn = async () => {
    if (!checkInReservation) return

    try {
      const checkInData = {
        customer_id: checkInReservation.customer_id,
        visit_type: 'hoteling'
      }

      // 선결제가 체크된 경우에만 선결제 정보 추가
      if (prepaid) {
        const amount = parseFloat(prepaidAmount) || 0
        if (amount <= 0) {
          alert('선결제 금액을 입력해주세요.')
          return
        }
        if (!prepaidMethod) {
          alert('선결제 결제 수단을 선택해주세요.')
          return
        }
        checkInData.prepaid = true
        checkInData.prepaid_amount = amount
        checkInData.prepaid_payment_method = prepaidMethod
      }

      await axios.post(`${API_URL}/checkin`, checkInData)
      
      alert(`${checkInReservation.dog_name} 체크인 완료!`)
      setShowCheckInModal(false)
      setCheckInReservation(null)
      setPrepaid(false)
      setPrepaidAmount('')
      setPrepaidMethod('')
      fetchCurrentVisits()
      if (onRefresh) onRefresh() // 호텔링 탭 새로고침
    } catch (error) {
      alert(error.response?.data?.error || '체크인 중 오류가 발생했습니다.')
    }
  }

  // 체크아웃 처리 (요금 계산 포함)
  const handleCheckOut = async (reservation) => {
    const visitId = getVisitId(reservation.customer_id)
    if (!visitId) {
      alert('체크인 정보를 찾을 수 없습니다.')
      return
    }

    try {
      // 요금 계산
      const response = await axios.post(`${API_URL}/checkout/calculate`, {
        visit_id: visitId
      })
      
      if (response.data.success && response.data.fee_info) {
        const visit = currentVisits.find(v => v.id === visitId)
        setCheckoutConfirm({ ...visit, ...reservation })
        setFeeInfo(response.data.fee_info)
        
        // 현재 시간을 체크아웃 시간 기본값으로 설정
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        setEditCheckOutTime(`${year}-${month}-${day}T${hours}:${minutes}`)
        
        return
      }

      // 요금 정보 없으면 바로 체크아웃
      await confirmCheckout(visitId)
    } catch (error) {
      alert(error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.')
    }
  }

  // 체크아웃 확정
  const confirmCheckout = async (visit_id) => {
    try {
      // 수정된 체크아웃 시간을 서버에 전달
      const checkoutData = { visit_id }
      
      if (editCheckOutTime) {
        // datetime-local 형식을 YYYY-MM-DD HH:MM:SS 형식으로 변환
        const [datePart, timePart] = editCheckOutTime.split('T')
        const checkoutTimeStr = `${datePart} ${timePart}:00`
        checkoutData.checkout_time = checkoutTimeStr
      }
      
      await axios.post(`${API_URL}/checkout`, checkoutData)
      
      alert('체크아웃 완료!')
      setCheckoutConfirm(null)
      setFeeInfo(null)
      setEditCheckOutTime('')
      fetchCurrentVisits()
      fetchMonthReservations(selectedDate)
      fetchDateVisitHistory(selectedDate)
      if (onRefresh) onRefresh()
    } catch (error) {
      alert(error.response?.data?.error || '체크아웃 중 오류가 발생했습니다.')
    }
  }

  // 체크아웃 취소
  const cancelCheckout = () => {
    setCheckoutConfirm(null)
    setFeeInfo(null)
    setEditCheckOutTime('')
  }

  // 체크아웃 시간 수정 시 요금 재계산
  const handleCheckOutTimeChange = async (newTime) => {
    setEditCheckOutTime(newTime)
    
    if (!checkoutConfirm || !newTime) return
    
    try {
      // datetime-local 형식을 YYYY-MM-DD HH:MM:SS 형식으로 변환
      const [datePart, timePart] = newTime.split('T')
      const checkoutTimeStr = `${datePart} ${timePart}:00`
      
      const visitId = getVisitId(checkoutConfirm.customer_id)
      if (!visitId) return
      
      // 요금 재계산
      const response = await axios.post(`${API_URL}/checkout/calculate`, {
        visit_id: visitId,
        checkout_time: checkoutTimeStr
      })
      
      if (response.data.success && response.data.fee_info) {
        setFeeInfo(response.data.fee_info)
      }
    } catch (error) {
      console.error('요금 재계산 실패:', error)
    }
  }

  // 체크인 시간 수정
  const handleEditCheckInTime = (visit) => {
    setEditingVisit(visit)
    const checkInDate = new Date(visit.check_in)
    const year = checkInDate.getFullYear()
    const month = String(checkInDate.getMonth() + 1).padStart(2, '0')
    const day = String(checkInDate.getDate()).padStart(2, '0')
    const hours = String(checkInDate.getHours()).padStart(2, '0')
    const minutes = String(checkInDate.getMinutes()).padStart(2, '0')
    setEditCheckInTime(`${year}-${month}-${day}T${hours}:${minutes}`)
    const currentPrepaidAmount = Number(visit.prepaid_amount || 0)
    setEditPrepaid(Boolean(visit.prepaid) || currentPrepaidAmount > 0)
    setEditPrepaidAmount(currentPrepaidAmount > 0 ? String(currentPrepaidAmount) : '')
  }

  // 체크인 시간 수정 확정
  const handleSaveCheckInTime = async () => {
    if (!editingVisit || !editCheckInTime) return

    try {
      const dateTime = new Date(editCheckInTime)
      const formattedDateTime = dateTime.getFullYear() + '-' +
        String(dateTime.getMonth() + 1).padStart(2, '0') + '-' +
        String(dateTime.getDate()).padStart(2, '0') + ' ' +
        String(dateTime.getHours()).padStart(2, '0') + ':' +
        String(dateTime.getMinutes()).padStart(2, '0') + ':' +
        String(dateTime.getSeconds()).padStart(2, '0')

      const parsedAmount = editPrepaid ? parseFloat(editPrepaidAmount || 0) : 0
      if (editPrepaid && (Number.isNaN(parsedAmount) || parsedAmount <= 0)) {
        alert('선결제 금액을 입력해주세요.')
        return
      }

      await axios.put(`${API_URL}/visits/${editingVisit.id}/checkin-time`, {
        check_in_time: formattedDateTime
      })

      await axios.put(`${API_URL}/visits/${editingVisit.id}/prepaid`, {
        prepaid: editPrepaid && parsedAmount > 0,
        prepaid_amount: editPrepaid ? parsedAmount : 0
      })

      alert('체크인 정보(시간/선결제)가 수정되었습니다.')
      setEditingVisit(null)
      setEditCheckInTime('')
      setEditPrepaid(false)
      setEditPrepaidAmount('')
      fetchCurrentVisits()
      fetchMonthReservations(selectedDate) // 캘린더 갱신
      if (onRefresh) onRefresh()
    } catch (error) {
      alert(error.response?.data?.error || '시간 수정 중 오류가 발생했습니다.')
    }
  }

  // 시간 수정 취소
  const handleCancelEdit = () => {
    setEditingVisit(null)
    setEditCheckInTime('')
    setEditPrepaid(false)
    setEditPrepaidAmount('')
  }

  // 날짜/시간 포맷팅 (과거 데이터를 위해 연도 포함)
  const formatDateTime = (datetime) => {
    const date = new Date(datetime)
    const now = new Date()
    const isCurrentYear = date.getFullYear() === now.getFullYear()
    
    // 올해 데이터면 연도 생략, 작년 이전 데이터면 연도 표시
    if (isCurrentYear) {
      return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // 경과 시간 계산
  const getElapsedTime = (checkIn) => {
    const start = new Date(checkIn)
    const now = new Date()
    const diff = now - start
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}시간 ${minutes}분`
  }

  // 캘린더 타일에 예약 표시
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = formatDateToString(date)
      const count = currentMonthReservations.filter(res => {
        return dateStr >= res.start_date && dateStr <= res.end_date
      }).length

      if (count > 0) {
        return (
          <div style={{
            background: '#667eea',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            margin: '2px auto 0'
          }}>
            {count}
          </div>
        )
      }
    }
    return null
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateNights = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        🗓️ 호텔링 예약 캘린더
      </h2>

      {/* 캘린더 영역 (맨 위) */}
      <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
          locale="ko-KR"
          onActiveStartDateChange={({ activeStartDate }) => {
            if (activeStartDate) {
              fetchMonthReservations(activeStartDate)
            }
          }}
        />
        
        <button
          className="btn btn-primary"
          onClick={handleAddReservation}
          style={{ 
            marginTop: '20px',
            padding: '12px 30px',
            fontSize: '1rem'
          }}
        >
          ➕ 예약 추가
        </button>
      </div>

      {/* 현재 체크인 중인 목록 */}
      {Array.isArray(currentVisits) && currentVisits.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f8ff', borderRadius: '12px', border: '2px solid #667eea' }}>
          <h3 style={{ color: '#667eea', marginBottom: '15px' }}>
            🏠 현재 호텔링 중 ({currentVisits.length}마리)
          </h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {currentVisits.map((visit) => (
              <div
                key={visit.id}
                style={{
                  padding: '15px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                      🐕 {visit.dog_name}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                      <div>보호자: {visit.customer_name}</div>
                      <div>체크인: {formatDateTime(visit.check_in)}</div>
                      <div>경과시간: {getElapsedTime(visit.check_in)}</div>
                      {(() => {
                        const reservation = getReservationByCustomer(visit.customer_id)
                        if (!reservation) return null
                        return (
                          <div style={{ color: '#3b82f6', fontWeight: '600' }}>
                            📅 예약기간: {formatDate(reservation.start_date)} ~ {formatDate(reservation.end_date)}
                            ({calculateNights(reservation.start_date, reservation.end_date)}박)
                          </div>
                        )
                      })()}
                      {visit.prepaid && visit.prepaid_amount > 0 && (
                        <div style={{ color: '#f57c00', fontWeight: '600', marginTop: '5px' }}>
                          💰 선결제: {visit.prepaid_amount.toLocaleString()}원
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    className="btn"
                    onClick={() => handleEditCheckInTime(visit)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#6c757d',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  >
                    ⏰ 시간 수정
                  </button>
                  <button
                    className="btn"
                    onClick={() => openPlannedCheckoutModal(visit)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#0ea5e9',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  >
                    📅 종료일 설정
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      const reservation = { dog_name: visit.dog_name, customer_id: visit.customer_id }
                      handleCheckOut(reservation)
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '0.9rem'
                    }}
                  >
                    🚪 체크아웃
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택한 날짜의 예약 목록 */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ color: '#667eea', marginBottom: '15px' }}>
          📋 {formatDate(formatDateToString(selectedDate))} 예약 및 이용 내역
        </h3>

        {/* 예약 목록 */}
        {Array.isArray(visibleReservations) && visibleReservations.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#667eea', marginBottom: '10px', fontSize: '1rem' }}>
              📅 예약 목록
            </h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {visibleReservations.map(reservation => (
                  <div
                    key={reservation.id}
                    style={{
                      padding: '15px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '2px solid #667eea',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleEditReservation(reservation)}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          🐕 {reservation.dog_name}
                        </div>
                      </div>
                      <div style={{ color: '#666', marginBottom: '5px' }}>
                        보호자: {reservation.customer_name}
                      </div>
                      <div style={{ color: '#666', marginBottom: '5px' }}>
                        견종: {reservation.breed}
                      </div>
                      <div style={{ color: '#667eea', fontWeight: '600', marginBottom: '5px' }}>
                        {formatDate(reservation.start_date)} ~ {formatDate(reservation.end_date)}
                        ({calculateNights(reservation.start_date, reservation.end_date)}박)
                      </div>
                      {reservation.notes && (
                        <div style={{ 
                          marginTop: '8px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}>
                          📝 {reservation.notes}
                        </div>
                      )}
                    </div>
                    
                    {/* 체크인/체크아웃 버튼 */}
                    <div style={{ 
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #e0e0e0',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        className="btn btn-success"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCheckIn(reservation)
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '0.95rem'
                        }}
                      >
                        🏠 체크인
                      </button>
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditReservation(reservation)
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '0.95rem',
                          background: '#6c757d',
                          color: 'white'
                        }}
                      >
                        ✏️ 수정
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* 방문 기록 (호텔링 이용 완료) */}
        {Array.isArray(dateVisitHistory) && dateVisitHistory.length > 0 && (
          <div>
            <h4 style={{ color: '#28a745', marginBottom: '10px', fontSize: '1rem' }}>
              ✅ {formatDateToString(selectedDate)} 호텔링 이용 내역 ({dateVisitHistory.length}건)
              <span style={{ fontSize: '0.85rem', color: '#999', marginLeft: '10px', fontWeight: 'normal' }}>
                (과거 데이터 포함)
              </span>
            </h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {dateVisitHistory.map(visit => {
                // 과거 데이터 여부 확인 (작년 이전)
                const checkInDate = new Date(visit.check_in)
                const currentYear = new Date().getFullYear()
                const isPastYear = checkInDate.getFullYear() < currentYear
                
                return (
                  <div
                    key={visit.id}
                    style={{
                      padding: '15px',
                      background: isPastYear ? '#f0fdf4' : '#e7ffe7',
                      borderRadius: '8px',
                      border: `2px solid ${isPastYear ? '#86efac' : '#28a745'}`,
                      position: 'relative'
                    }}
                  >
                    {isPastYear && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#86efac',
                        color: '#166534',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {checkInDate.getFullYear()}년
                      </div>
                    )}
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                      🐕 {visit.dog_name}
                      {visit.weight && (
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'normal', marginLeft: '8px' }}>
                          ({visit.weight}kg)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.6' }}>
                      <div>보호자: {visit.customer_name}</div>
                      <div>견종: {visit.breed}</div>
                      <div>체크인: {formatDateTime(visit.check_in)}</div>
                      <div>체크아웃: {formatDateTime(visit.check_out)}</div>
                      <div style={{ color: '#28a745', fontWeight: '600' }}>
                        이용시간: {Math.floor(visit.duration_minutes / 60)}시간 {visit.duration_minutes % 60}분
                      </div>
                      {visit.prepaid && visit.prepaid_amount > 0 && (
                        <div style={{ color: '#f57c00', fontWeight: '600', marginTop: '5px' }}>
                          💰 선결제: {visit.prepaid_amount.toLocaleString()}원
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 데이터 없을 때 */}
        {visibleReservations.length === 0 && dateVisitHistory.length === 0 && (
          <div className="empty-state">
            <p>이 날짜에 예약 및 이용 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 예약 추가 모달 */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>예약 추가</h3>
            
            <form onSubmit={handleCreateReservation}>
              {/* 고객 검색 */}
              <div className="form-group">
                <label>고객 검색 *</label>
                <input
                  type="text"
                  placeholder="반려견 이름, 보호자명, 연락처로 검색"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="form-input"
                />
                
                {Array.isArray(searchResults) && searchResults.length > 0 && (
                  <div className="search-results" style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    marginTop: '8px',
                    background: 'white'
                  }}>
                    {searchResults.map((customer, index) => {
                      const customerId = customer.customer_id || customer.customerId || customer.id
                      return (
                        <div
                          key={customer.id || index}
                          className="search-result-item"
                          onClick={() => {
                            console.log('🖱️ 검색 결과 클릭:', customer)
                            handleSelectCustomer(customer)
                          }}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                            🐕 {customer.dog_name} ({customer.breed || '견종 없음'})
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            👤 {customer.customer_name} - 📞 {customer.phone}
                          </div>
                          {customerId && (
                            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>
                              ID: {customerId}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 시작일 */}
              <div className="form-group">
                <label>체크인 날짜 *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 종료일 */}
              <div className="form-group">
                <label>체크아웃 날짜 *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 메모 */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.prepaid}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormData({
                        ...formData,
                        prepaid: checked,
                        prepaid_amount: checked ? formData.prepaid_amount : '',
                        prepaid_payment_method: checked ? formData.prepaid_payment_method : ''
                      })
                    }}
                  />
                  <span>💰 선결제 입력</span>
                </label>
                {formData.prepaid && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      value={formData.prepaid_amount}
                      onChange={(e) => setFormData({ ...formData, prepaid_amount: e.target.value })}
                      className="form-input"
                      placeholder="선결제 금액 (원)"
                    />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['카드', '현금', '계좌이체'].map((method) => (
                        <label
                          key={method}
                          style={{
                            flex: 1,
                            minWidth: '90px',
                            padding: '8px',
                            border: `2px solid ${formData.prepaid_payment_method === method ? '#667eea' : '#e0e0e0'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: formData.prepaid_payment_method === method ? '#f0f4ff' : 'white'
                          }}
                        >
                          <input
                            type="radio"
                            name="reservation_prepaid_method"
                            value={method}
                            checked={formData.prepaid_payment_method === method}
                            onChange={(e) => setFormData({ ...formData, prepaid_payment_method: e.target.value })}
                            style={{ marginRight: '4px' }}
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="특이사항이나 메모를 입력하세요"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  예약 등록
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, background: '#6c757d', color: 'white' }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 예약 수정 모달 */}
      {showEditModal && selectedReservation && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>예약 수정</h3>
            
            <form onSubmit={handleUpdateReservation}>
              {/* 고객 정보 (읽기 전용) */}
              <div className="form-group">
                <label>반려견</label>
                <input
                  type="text"
                  value={`${formData.dog_name} (${formData.customer_name})`}
                  className="form-input"
                  disabled
                  style={{ background: '#f0f0f0' }}
                />
              </div>

              {/* 시작일 */}
              <div className="form-group">
                <label>체크인 날짜 *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 종료일 */}
              <div className="form-group">
                <label>체크아웃 날짜 *</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>

              {/* 메모 */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.prepaid}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormData({
                        ...formData,
                        prepaid: checked,
                        prepaid_amount: checked ? formData.prepaid_amount : '',
                        prepaid_payment_method: checked ? formData.prepaid_payment_method : ''
                      })
                    }}
                  />
                  <span>💰 선결제 입력</span>
                </label>
                {formData.prepaid && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      value={formData.prepaid_amount}
                      onChange={(e) => setFormData({ ...formData, prepaid_amount: e.target.value })}
                      className="form-input"
                      placeholder="선결제 금액 (원)"
                    />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['카드', '현금', '계좌이체'].map((method) => (
                        <label
                          key={method}
                          style={{
                            flex: 1,
                            minWidth: '90px',
                            padding: '8px',
                            border: `2px solid ${formData.prepaid_payment_method === method ? '#667eea' : '#e0e0e0'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            background: formData.prepaid_payment_method === method ? '#f0f4ff' : 'white'
                          }}
                        >
                          <input
                            type="radio"
                            name="reservation_edit_prepaid_method"
                            value={method}
                            checked={formData.prepaid_payment_method === method}
                            onChange={(e) => setFormData({ ...formData, prepaid_payment_method: e.target.value })}
                            style={{ marginRight: '4px' }}
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input"
                  rows="3"
                  placeholder="특이사항이나 메모를 입력하세요"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  수정 완료
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteReservation(selectedReservation.id, selectedReservation.dog_name)}
                  style={{ flex: 1 }}
                >
                  삭제
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, background: '#6c757d', color: 'white' }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 체크인 모달 */}
      {showCheckInModal && checkInReservation && (
        <div className="modal-overlay" onClick={() => setShowCheckInModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>호텔링 체크인</h3>
            
            <div style={{ 
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px' }}>
                🐕 {checkInReservation.dog_name}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                보호자: {checkInReservation.customer_name}
              </div>
              <div style={{ color: '#666', fontSize: '0.9rem' }}>
                견종: {checkInReservation.breed}
              </div>
            </div>

            <div style={{ 
              padding: '15px', 
              background: 'white', 
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              marginBottom: '20px'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                cursor: 'pointer',
                marginBottom: prepaid ? '15px' : '0'
              }}>
                <input
                  type="checkbox"
                  checked={prepaid}
                  onChange={(e) => {
                    setPrepaid(e.target.checked)
                    if (!e.target.checked) {
                      setPrepaidAmount('')
                    }
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontWeight: '600', color: '#333', fontSize: '1rem' }}>
                  💰 선결제
                </span>
              </label>

              {prepaid && (
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px',
                    fontWeight: '500',
                    color: '#666'
                  }}>
                    선결제 금액
                  </label>
                  <input
                    type="number"
                    value={prepaidAmount}
                    onChange={(e) => setPrepaidAmount(e.target.value)}
                    placeholder="금액을 입력하세요 (원)"
                    className="form-input"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #667eea',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '6px' }}>결제 수단</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {['카드', '현금', '계좌이체'].map((method) => (
                        <label
                          key={method}
                          style={{
                            flex: '1',
                            minWidth: '80px',
                            padding: '8px 10px',
                            border: `2px solid ${prepaidMethod === method ? '#667eea' : '#e0e0e0'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                            background: prepaidMethod === method ? '#f0f4ff' : 'white'
                          }}
                        >
                          <input
                            type="radio"
                            name="calendar_checkin_prepaid_method"
                            value={method}
                            checked={prepaidMethod === method}
                            onChange={(e) => setPrepaidMethod(e.target.value)}
                            style={{ marginRight: '4px' }}
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-success"
                onClick={handleConfirmCheckIn}
                style={{ flex: 1 }}
              >
                체크인 완료
              </button>
              <button
                className="btn"
                onClick={() => setShowCheckInModal(false)}
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체크인 시간 수정 모달 */}
      {editingVisit && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>체크인 시간 수정</h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px', color: '#666' }}>
                <strong>{editingVisit.dog_name}</strong> ({editingVisit.customer_name}님)
              </div>
              <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#999' }}>
                현재 체크인 시간: {formatDateTime(editingVisit.check_in)}
              </div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                새로운 체크인 시간
              </label>
              <input
                type="datetime-local"
                value={editCheckInTime}
                onChange={(e) => setEditCheckInTime(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #667eea',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginBottom: editPrepaid ? '10px' : '0'
              }}>
                <input
                  type="checkbox"
                  checked={editPrepaid}
                  onChange={(e) => {
                    setEditPrepaid(e.target.checked)
                    if (!e.target.checked) {
                      setEditPrepaidAmount('')
                    }
                  }}
                />
                <span style={{ fontWeight: '600', color: '#333' }}>💰 선결제 적용</span>
              </label>

              {editPrepaid && (
                <input
                  type="number"
                  min="0"
                  value={editPrepaidAmount}
                  onChange={(e) => setEditPrepaidAmount(e.target.value)}
                  className="form-input"
                  placeholder="선결제 금액 (원)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                />
              )}
              <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '6px' }}>
                체크 해제 후 저장하면 선결제가 취소됩니다.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveCheckInTime}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                저장
              </button>
              <button
                onClick={handleCancelEdit}
                className="btn"
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 진행 중 호텔링 종료 예정일 설정 모달 */}
      {showPlannedCheckoutModal && planningVisit && (
        <div className="modal-overlay" onClick={closePlannedCheckoutModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>📅 호텔링 종료 예정일 설정</h3>
            <div style={{ marginBottom: '10px', color: '#555' }}>
              <strong>{planningVisit.dog_name}</strong> ({planningVisit.customer_name}님)
            </div>
            <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#777' }}>
              종료 예정일을 저장하면 예약 캘린더에 즉시 반영됩니다.
            </div>
            <input
              type="date"
              value={plannedCheckoutInput}
              min={String(planningVisit.check_in || '').slice(0, 10)}
              onChange={(e) => setPlannedCheckoutInput(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                padding: '10px',
                border: '2px solid #0ea5e9',
                borderRadius: '6px',
                fontSize: '1rem',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={closePlannedCheckoutModal}
                className="btn"
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
              <button
                onClick={savePlannedCheckoutDate}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체크아웃 확인 모달 (요금 계산) */}
      {checkoutConfirm && feeInfo && (
        <div className="modal-overlay" onClick={cancelCheckout}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              💰 체크아웃 요금 안내
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ marginBottom: '10px', fontSize: '1.1rem', fontWeight: '600', color: '#333' }}>
                  🐕 {checkoutConfirm.dog_name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  몸무게: {feeInfo.weight ? `${feeInfo.weight}kg` : '정보 없음'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  이용 시간: {Math.floor(feeInfo.duration_minutes / 60)}시간 {feeInfo.duration_minutes % 60}분
                </div>
                
                {/* 체크아웃 시간 수정 */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e0e0e0' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333', fontSize: '0.95rem' }}>
                    ⏰ 체크아웃 시간 수정
                  </label>
                  <input
                    type="datetime-local"
                    value={editCheckOutTime}
                    onChange={(e) => handleCheckOutTimeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #667eea',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                    💡 시간을 수정하면 요금이 자동으로 재계산됩니다
                  </div>
                </div>
              </div>

              {/* 호텔링 요금 표시 */}
              {feeInfo.total_fee !== undefined && (
                <div>
                  {/* 요금 계산 상세 */}
                  <div style={{ padding: '20px', background: '#e7f3ff', borderRadius: '8px', marginBottom: '15px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '12px' }}>
                      요금 계산 내역
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: '1.8' }}>
                      {feeInfo.full_days > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span>{feeInfo.full_days}일 × {feeInfo.price_per_day.toLocaleString()}원</span>
                          <span style={{ fontWeight: '600' }}>{(feeInfo.full_days * feeInfo.price_per_day).toLocaleString()}원</span>
                        </div>
                      )}
                      {feeInfo.remaining_minutes > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span>초과 시간 ({Math.floor(feeInfo.remaining_minutes / 60)}시간 {feeInfo.remaining_minutes % 60}분)</span>
                            <span style={{ fontWeight: '600' }}>{feeInfo.overtime_fee.toLocaleString()}원</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#999', marginLeft: '10px', marginBottom: '5px' }}>
                            (30분당 {feeInfo.price_per_30min.toLocaleString()}원 기준)
                          </div>
                        </div>
                      )}
                      <div style={{ 
                        borderTop: '1px solid #ddd', 
                        marginTop: '10px', 
                        paddingTop: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.95rem'
                      }}>
                        <span style={{ fontWeight: '600' }}>총 요금</span>
                        <span style={{ fontWeight: '600', color: '#1976d2' }}>{feeInfo.total_fee.toLocaleString()}원</span>
                      </div>
                    </div>
                  </div>

                  {/* 선결제 및 최종 금액 */}
                  {feeInfo.prepaid_amount > 0 ? (
                    <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '12px' }}>
                        결제 정보
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span>총 요금</span>
                          <span>{feeInfo.total_fee.toLocaleString()}원</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#f57c00' }}>
                          <span>선결제 금액</span>
                          <span>- {feeInfo.prepaid_amount.toLocaleString()}원</span>
                        </div>
                        <div style={{ 
                          borderTop: '2px solid #2e7d32', 
                          marginTop: '10px', 
                          paddingTop: '10px',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2e7d32' }}>
                            최종 결제 금액
                          </span>
                          <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2e7d32' }}>
                            {feeInfo.remaining_fee.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                        최종 결제 금액
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#2e7d32' }}>
                        {feeInfo.total_fee.toLocaleString()}원
                      </div>
                    </div>
                  )}
                </div>
              )}

              {feeInfo.message && (
                <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ fontSize: '0.9rem', color: '#856404' }}>
                    {feeInfo.message}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={cancelCheckout}
                className="btn"
                style={{ flex: 1, background: '#6c757d', color: 'white' }}
              >
                취소
              </button>
              <button
                onClick={() => {
                  const visitId = getVisitId(checkoutConfirm.customer_id)
                  confirmCheckout(visitId)
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                확인 및 체크아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HotelingCalendar

