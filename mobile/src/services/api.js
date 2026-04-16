import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── Base URL ──────────────────────────────────────────────────────────────────
const getBaseUrl = () => {
  // If running in development, try to get the host's IP address automatically
  if (__DEV__) {
    const debuggerHost = Constants.expoConfig?.hostUri;
    const address = debuggerHost?.split(':')[0];
    if (address) {
      return `http://${address}:5000/api`;
    }
  }
  // Fallback for production or if detection fails
  return 'http://192.168.1.4:5000/api'; 
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigation reset handled by AuthContext listener
    }
    return Promise.reject(error);
  }
);

// ── Admin (CSO) ──────────────────────────────────────────────────────────────
export const adminAPI = {
  // Staff
  getAllStaff: (params) => api.get('/admin/staff', { params }),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),
  
  // Entities
  getAllEntities: (params) => api.get('/admin/entities', { params }),
  createEntity: (data) => api.post('/admin/entities', data),
  updateEntity: (id, data) => api.put(`/admin/entities/${id}`, data),
  deleteEntity: (id) => api.delete(`/admin/entities/${id}`),

  // Other
  getDashboardStats: () => api.get('/admin/dashboard'),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
};

// ── Staff ─────────────────────────────────────────────────────────────────────
export const staffAPI = {
  getAll: (params) => api.get('/staff', { params }),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
  getCertificates: (id) => api.get(`/staff/${id}/certificates`),
};

// ── Entities ──────────────────────────────────────────────────────────────────
export const entitiesAPI = {
  getAll: (params) => api.get('/entities', { params }),
  getById: (id) => api.get(`/entities/${id}`),
  create: (data) => api.post('/entities', data),
  update: (id, data) => api.put(`/entities/${id}`, data),
  delete: (id) => api.delete(`/entities/${id}`),
  getStaff: (id) => api.get(`/entities/${id}/staff`),
  getCertificates: (id) => api.get(`/entities/${id}/certificates`),
};

// ── Certificates ──────────────────────────────────────────────────────────────
export const certificatesAPI = {
  getAll: (params) => api.get('/certificates', { params }),
  getById: (id) => api.get(`/certificates/${id}`),
  create: (data) => api.post('/certificates', data),
  update: (id, data) => api.put(`/certificates/${id}`, data),
  delete: (id) => api.delete(`/certificates/${id}`),
  approve: (id) => api.post(`/certificates/${id}/approve`),
  reject: (id, reason) => api.post(`/certificates/${id}/reject`, { reason }),
};

// ── Certificate Types ─────────────────────────────────────────────────────────
export const certTypesAPI = {
  getAll: () => api.get('/certificate-types'),
  create: (data) => api.post('/certificate-types', data),
  update: (id, data) => api.put(`/certificate-types/${id}`, data),
  delete: (id) => api.delete(`/certificate-types/${id}`),
};

// ── Approvals ─────────────────────────────────────────────────────────────────
export const approvalsAPI = {
  getPending: () => api.get('/certificates?status=PENDING'),
  getHistory: () => api.get('/certificates?status=APPROVED,REJECTED'),
};

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const auditAPI = {
  getLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// ── Dashboard / Stats ─────────────────────────────────────────────────────────
export const dashboardAPI = {
  getCSOStats: () => api.get('/admin/dashboard'),
  getEntityStats: () => api.get('/entity/dashboard'),
};

export default api;
