import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartmatch_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      localStorage.removeItem('smartmatch_token')
      localStorage.removeItem('smartmatch_user')
      if (currentPath !== '/auth' && currentPath !== '/') {
        window.location.href = '/auth'
      }
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (payload) => api.post('/api/auth/register', payload),
  login: (payload) => api.post('/api/auth/login', payload),
  me: () => api.get('/api/auth/me'),
}

export const profilesAPI = {
  getMe: () => api.get('/api/profiles/me'),
  updateMe: (payload) => api.put('/api/profiles/me', payload),
}

export const jobsAPI = {
  list: (params) => api.get('/api/jobs', { params }),
  get: (id) => api.get(`/api/jobs/${id}`),
  create: (payload) => api.post('/api/jobs', payload),
  update: (id, payload) => api.put(`/api/jobs/${id}`, payload),
  remove: (id) => api.delete(`/api/jobs/${id}`),
}

export const resumesAPI = {
  upload: (formData, onUploadProgress) =>
    api.post('/api/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  listMine: () => api.get('/api/resumes/my'),
  get: (id) => api.get(`/api/resumes/${id}`),
  setPrimary: (id) => api.patch(`/api/resumes/${id}/primary`),
  remove: (id) => api.delete(`/api/resumes/${id}`),
  downloadBlob: (id) => api.get(`/api/resumes/${id}/download`, { responseType: 'blob' }),
}

export const applicationsAPI = {
  apply: (jobId, payload) => api.post(`/api/jobs/${jobId}/apply`, payload),
  listMine: () => api.get('/api/applications/my'),
  withdraw: (applicationId) => api.delete(`/api/applications/${applicationId}`),
  listForJob: (jobId, params) => api.get(`/api/jobs/${jobId}/applications`, { params }),
  listForRecruiter: (params) => api.get('/api/applications/recruiter', { params }),
  updateStatus: (applicationId, payload) =>
    api.patch(`/api/applications/${applicationId}/status`, payload),
}

export const matchingAPI = {
  skills: () => api.get('/api/matching/skills'),
  analyze: (payload) => api.post('/api/matching/analyze', payload),
  getResult: (id, scope = 'analysis') =>
    api.get(`/api/matching/results/${id}`, { params: { scope } }),
  rankForJob: (jobId) => api.get(`/api/matching/job/${jobId}/rank`),
}

export const notificationsAPI = {
  list: () => api.get('/api/notifications'),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
}

export const dashboardAPI = {
  recruiter: () => api.get('/api/dashboard/recruiter'),
  candidate: () => api.get('/api/dashboard/candidate'),
}

export default api
