import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_URL = '/api'

const TODAY = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

// ─── 운송일지 서브컴포넌트 ─────────────────────────────────────────────────────

function TransportLogTab({ customers }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStart, setFilterStart] = useState(TODAY.slice(0, 7) + '-01')
  const [filterEnd, setFilterEnd] = useState(TODAY)
  const [savedVehicles, setSavedVehicles] = useState([])
  const [savedDrivers, setSavedDrivers] = useState([])
  const [recentDogKeys, setRecentDogKeys] = useState([])

  // 폼 상태
  const emptyForm = {
    log_date: TODAY,
    vehicle_number: '',
    driver_name: '',
    route_type: 'pickup',
    selected_dogs: [],
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [dogSearch, setDogSearch] = useState('')
  const [alert, setAlert] = useState(null)

  const fetchDefaults = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/transport-logs/defaults`)
      setSavedVehicles(res.data.vehicle_numbers || [])
      setSavedDrivers(res.data.driver_names || [])
      setRecentDogKeys(res.data.recent_dog_keys || [])
    } catch {
      // 무시
    }
  }, [])

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/transport-logs`, {
        params: { start_date: filterStart, end_date: filterEnd },
      })
      setLogs(res.data)
    } catch {
      showAlert('운송일지를 불러오지 못했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStart, filterEnd])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { fetchDefaults() }, [fetchDefaults])

  const handleDogToggle = (customer) => {
    const key = `${customer.customer_id || customer.id}_${customer.dog_name}`
    setForm(prev => {
      const already = prev.selected_dogs.some(d => d.key === key)
      if (already) {
        return { ...prev, selected_dogs: prev.selected_dogs.filter(d => d.key !== key) }
      }
      return {
        ...prev,
        selected_dogs: [
          ...prev.selected_dogs,
          {
            key,
            dog_name: customer.dog_name,
            customer_name: customer.customer_name,
            breed: customer.breed || '',
          },
        ],
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.vehicle_number.trim() || !form.driver_name.trim()) {
      showAlert('차량번호와 운전자를 입력해주세요.', 'error')
      return
    }
    try {
      const payload = {
        log_date: form.log_date,
        vehicle_number: form.vehicle_number.trim(),
        driver_name: form.driver_name.trim(),
        route_type: form.route_type,
        dogs_info: form.selected_dogs,
        notes: form.notes.trim(),
      }
      if (editingId) {
        await axios.put(`${API_URL}/transport-logs/${editingId}`, payload)
        showAlert('운송일지가 수정되었습니다.')
      } else {
        await axios.post(`${API_URL}/transport-logs`, payload)
        showAlert('운송일지가 등록되었습니다.')
      }
      setForm(emptyForm)
      setEditingId(null)
      setDogSearch('')
      fetchLogs()
      fetchDefaults()
    } catch (err) {
      showAlert(err.response?.data?.error || '저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleEdit = (log) => {
    setForm({
      log_date: log.log_date,
      vehicle_number: log.vehicle_number,
      driver_name: log.driver_name,
      route_type: log.route_type,
      selected_dogs: Array.isArray(log.dogs_info) ? log.dogs_info : [],
      notes: log.notes || '',
    })
    setEditingId(log.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('이 운송일지를 삭제하시겠습니까?')) return
    try {
      await axios.delete(`${API_URL}/transport-logs/${id}`)
      showAlert('삭제되었습니다.')
      fetchLogs()
    } catch {
      showAlert('삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  const filteredCustomers = customers
    .filter(c =>
      !dogSearch ||
      c.dog_name?.includes(dogSearch) ||
      c.customer_name?.includes(dogSearch)
    )
    .sort((a, b) => {
      const keyA = `${a.customer_id || a.id}_${a.dog_name}`
      const keyB = `${b.customer_id || b.id}_${b.dog_name}`
      const idxA = recentDogKeys.indexOf(keyA)
      const idxB = recentDogKeys.indexOf(keyB)
      if (idxA === -1 && idxB === -1) return 0
      if (idxA === -1) return 1
      if (idxB === -1) return -1
      return idxA - idxB
    })

  const routeLabel = (type) => type === 'pickup' ? '🚐 픽업 (가정→유치원)' : '🏠 드랍 (유치원→가정)'

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
          {alert.msg}
        </div>
      )}

      {/* 등록/수정 폼 */}
      <div className="card">
        <h2 style={{ color: '#667eea', marginBottom: 20 }}>
          {editingId ? '✏️ 운송일지 수정' : '🚐 운송일지 등록'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label>날짜 *</label>
              <input
                type="date"
                className="form-input"
                value={form.log_date}
                onChange={e => setForm(p => ({ ...p, log_date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>구분 *</label>
              <select
                className="form-input"
                value={form.route_type}
                onChange={e => setForm(p => ({ ...p, route_type: e.target.value }))}
              >
                <option value="pickup">픽업 (가정→유치원)</option>
                <option value="dropoff">드랍 (유치원→가정)</option>
              </select>
            </div>
            <div className="form-group">
              <label>차량번호 *</label>
              <input
                type="text"
                className="form-input"
                value={form.vehicle_number}
                onChange={e => setForm(p => ({ ...p, vehicle_number: e.target.value }))}
                placeholder="예: 12가 3456"
                required
              />
              {savedVehicles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {savedVehicles.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, vehicle_number: v }))}
                      style={{
                        padding: '3px 10px',
                        border: `1.5px solid ${form.vehicle_number === v ? '#667eea' : '#ccc'}`,
                        borderRadius: 14,
                        background: form.vehicle_number === v ? '#ede9ff' : 'white',
                        color: form.vehicle_number === v ? '#667eea' : '#555',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: form.vehicle_number === v ? 700 : 400,
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>운전자 *</label>
              <input
                type="text"
                className="form-input"
                value={form.driver_name}
                onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))}
                placeholder="운전자 이름"
                required
              />
              {savedDrivers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {savedDrivers.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, driver_name: d }))}
                      style={{
                        padding: '3px 10px',
                        border: `1.5px solid ${form.driver_name === d ? '#667eea' : '#ccc'}`,
                        borderRadius: 14,
                        background: form.driver_name === d ? '#ede9ff' : 'white',
                        color: form.driver_name === d ? '#667eea' : '#555',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: form.driver_name === d ? 700 : 400,
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 강아지 선택 */}
          <div className="form-group">
            <label>탑승 강아지 선택</label>
            {form.selected_dogs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {form.selected_dogs.map(d => (
                  <span
                    key={d.key}
                    style={{
                      background: '#667eea',
                      color: 'white',
                      borderRadius: 20,
                      padding: '4px 12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    🐶 {d.dog_name} ({d.customer_name})
                    <button
                      type="button"
                      onClick={() => handleDogToggle({ customer_id: d.key.split('_')[0], dog_name: d.dog_name, customer_name: d.customer_name })}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              className="form-input"
              placeholder="강아지 이름 또는 보호자 이름으로 검색..."
              value={dogSearch}
              onChange={e => setDogSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            {customers.length === 0 ? (
              <p style={{ color: '#999', fontSize: '0.9rem' }}>등록된 강아지가 없습니다.</p>
            ) : (
              <div style={{
                border: '2px solid #e0e0e0',
                borderRadius: 8,
                maxHeight: 200,
                overflowY: 'auto',
              }}>
                {filteredCustomers.length === 0 ? (
                  <p style={{ padding: 12, color: '#999', margin: 0 }}>검색 결과가 없습니다.</p>
                ) : (
                  filteredCustomers.map(c => {
                    const key = `${c.customer_id || c.id}_${c.dog_name}`
                    const selected = form.selected_dogs.some(d => d.key === key)
                    const isRecent = recentDogKeys.includes(key)
                    return (
                      <div
                        key={key}
                        onClick={() => handleDogToggle(c)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          background: selected ? '#ede9ff' : 'white',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div>
                          <strong style={{ color: selected ? '#667eea' : '#333' }}>
                            🐶 {c.dog_name}
                          </strong>
                          <span style={{ color: '#666', fontSize: '0.85rem', marginLeft: 8 }}>
                            ({c.customer_name} · {c.breed})
                          </span>
                          {isRecent && (
                            <span style={{
                              marginLeft: 8,
                              fontSize: '0.72rem',
                              background: '#fff3cd',
                              color: '#856404',
                              border: '1px solid #ffc107',
                              borderRadius: 10,
                              padding: '1px 7px',
                              fontWeight: 600,
                            }}>최근 탑승</span>
                          )}
                        </div>
                        {selected && <span style={{ color: '#667eea', fontWeight: 700 }}>✓</span>}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>비고</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="특이사항을 입력하세요"
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? '수정 완료' : '등록'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn"
                style={{ background: '#e0e0e0', color: '#333' }}
                onClick={() => { setForm(emptyForm); setEditingId(null); setDogSearch('') }}
              >
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 목록 */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
          <h2 style={{ color: '#667eea', margin: 0, flexGrow: 1 }}>📋 운송일지 목록</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filterStart} onChange={e => setFilterStart(e.target.value)} />
            <span style={{ color: '#666' }}>~</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
            <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={fetchLogs}>조회</button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#999' }}>불러오는 중...</p>
        ) : logs.length === 0 ? (
          <div className="empty-state"><p>등록된 운송일지가 없습니다.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>구분</th>
                  <th>차량번호</th>
                  <th>운전자</th>
                  <th>탑승 강아지</th>
                  <th>비고</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{log.log_date}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{routeLabel(log.route_type)}</td>
                    <td>{log.vehicle_number}</td>
                    <td>{log.driver_name}</td>
                    <td>
                      {(Array.isArray(log.dogs_info) ? log.dogs_info : []).length === 0
                        ? <span style={{ color: '#bbb' }}>-</span>
                        : (Array.isArray(log.dogs_info) ? log.dogs_info : []).map(d => (
                          <span key={d.key} style={{ display: 'inline-block', background: '#f0f0f0', borderRadius: 12, padding: '2px 8px', marginRight: 4, marginBottom: 2, fontSize: '0.85rem' }}>
                            {d.dog_name}
                          </span>
                        ))}
                    </td>
                    <td style={{ color: '#666', fontSize: '0.9rem' }}>{log.notes || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn"
                        style={{ background: '#667eea', color: 'white', padding: '6px 12px', fontSize: '0.8rem', marginRight: 4 }}
                        onClick={() => handleEdit(log)}
                      >수정</button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(log.id)}
                      >삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 소독일지 서브컴포넌트 ─────────────────────────────────────────────────────

const DISINFECTION_AREAS = ['견사 전체', '실내 놀이공간', '실외 운동장', '차량', '식기·급수대', '화장실', '기타']
const DISINFECTANTS = ['염소계 소독제', '4급 암모늄염', '과산화물계', '알코올', '이산화염소', '기타']
const METHODS = ['분무 소독', '침지 소독', '훈증 소독', '자외선 소독', '열탕 소독', '기타']

function DisinfectionLogTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStart, setFilterStart] = useState(TODAY.slice(0, 7) + '-01')
  const [filterEnd, setFilterEnd] = useState(TODAY)

  const emptyForm = {
    log_date: TODAY,
    disinfection_area: DISINFECTION_AREAS[0],
    disinfectant: DISINFECTANTS[0],
    method: METHODS[0],
    manager: '',
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [alert, setAlert] = useState(null)

  const showAlert = (msg, type = 'success') => {
    setAlert({ msg, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/disinfection-logs`, {
        params: { start_date: filterStart, end_date: filterEnd },
      })
      setLogs(res.data)
    } catch {
      showAlert('소독일지를 불러오지 못했습니다.', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStart, filterEnd])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.manager.trim()) {
      showAlert('담당자를 입력해주세요.', 'error')
      return
    }
    try {
      const payload = {
        log_date: form.log_date,
        disinfection_area: form.disinfection_area,
        disinfectant: form.disinfectant,
        method: form.method,
        manager: form.manager.trim(),
        notes: form.notes.trim(),
      }
      if (editingId) {
        await axios.put(`${API_URL}/disinfection-logs/${editingId}`, payload)
        showAlert('소독일지가 수정되었습니다.')
      } else {
        await axios.post(`${API_URL}/disinfection-logs`, payload)
        showAlert('소독일지가 등록되었습니다.')
      }
      setForm(emptyForm)
      setEditingId(null)
      fetchLogs()
    } catch (err) {
      showAlert(err.response?.data?.error || '저장 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleEdit = (log) => {
    setForm({
      log_date: log.log_date,
      disinfection_area: log.disinfection_area,
      disinfectant: log.disinfectant,
      method: log.method,
      manager: log.manager,
      notes: log.notes || '',
    })
    setEditingId(log.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('이 소독일지를 삭제하시겠습니까?')) return
    try {
      await axios.delete(`${API_URL}/disinfection-logs/${id}`)
      showAlert('삭제되었습니다.')
      fetchLogs()
    } catch {
      showAlert('삭제 중 오류가 발생했습니다.', 'error')
    }
  }

  return (
    <div>
      {alert && (
        <div className={`alert alert-${alert.type === 'error' ? 'error' : 'success'}`}>
          {alert.msg}
        </div>
      )}

      {/* 등록/수정 폼 */}
      <div className="card">
        <h2 style={{ color: '#667eea', marginBottom: 20 }}>
          {editingId ? '✏️ 소독일지 수정' : '🧴 소독일지 등록'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label>날짜 *</label>
              <input
                type="date"
                className="form-input"
                value={form.log_date}
                onChange={e => setForm(p => ({ ...p, log_date: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>소독 구역 *</label>
              <select className="form-input" value={form.disinfection_area} onChange={e => setForm(p => ({ ...p, disinfection_area: e.target.value }))}>
                {DISINFECTION_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>소독 약품 *</label>
              <select className="form-input" value={form.disinfectant} onChange={e => setForm(p => ({ ...p, disinfectant: e.target.value }))}>
                {DISINFECTANTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>소독 방법 *</label>
              <select className="form-input" value={form.method} onChange={e => setForm(p => ({ ...p, method: e.target.value }))}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>담당자 *</label>
              <input
                type="text"
                className="form-input"
                value={form.manager}
                onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}
                placeholder="담당자 이름"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>비고</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="특이사항을 입력하세요"
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              {editingId ? '수정 완료' : '등록'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn"
                style={{ background: '#e0e0e0', color: '#333' }}
                onClick={() => { setForm(emptyForm); setEditingId(null) }}
              >
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 목록 */}
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
          <h2 style={{ color: '#667eea', margin: 0, flexGrow: 1 }}>📋 소독일지 목록</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filterStart} onChange={e => setFilterStart(e.target.value)} />
            <span style={{ color: '#666' }}>~</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
            <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 16px' }} onClick={fetchLogs}>조회</button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#999' }}>불러오는 중...</p>
        ) : logs.length === 0 ? (
          <div className="empty-state"><p>등록된 소독일지가 없습니다.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>소독 구역</th>
                  <th>소독 약품</th>
                  <th>소독 방법</th>
                  <th>담당자</th>
                  <th>비고</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{log.log_date}</td>
                    <td>{log.disinfection_area}</td>
                    <td>{log.disinfectant}</td>
                    <td>{log.method}</td>
                    <td>{log.manager}</td>
                    <td style={{ color: '#666', fontSize: '0.9rem' }}>{log.notes || '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn"
                        style={{ background: '#667eea', color: 'white', padding: '6px 12px', fontSize: '0.8rem', marginRight: 4 }}
                        onClick={() => handleEdit(log)}
                      >수정</button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleDelete(log.id)}
                      >삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function TransportLog({ customers = [] }) {
  const [subTab, setSubTab] = useState('transport')

  return (
    <div>
      {/* 서브탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'white', borderRadius: 12, padding: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <button
          onClick={() => setSubTab('transport')}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'all 0.2s',
            background: subTab === 'transport' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f5f5f5',
            color: subTab === 'transport' ? 'white' : '#555',
          }}
        >
          🚐 운송일지
        </button>
        <button
          onClick={() => setSubTab('disinfection')}
          style={{
            flex: 1,
            padding: '12px 20px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'all 0.2s',
            background: subTab === 'disinfection' ? 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)' : '#f5f5f5',
            color: subTab === 'disinfection' ? 'white' : '#555',
          }}
        >
          🧴 소독일지
        </button>
      </div>

      {subTab === 'transport' && <TransportLogTab customers={customers} />}
      {subTab === 'disinfection' && <DisinfectionLogTab />}
    </div>
  )
}
