import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
  getPublicCertificateTypes: (params) => api.get('/auth/certificate-types', { params }),
};

// Admin/CSO APIs
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Entities
  getEntities: (params) => api.get('/admin/entities', { params }),
  getEntity: (id) => api.get(`/admin/entities/${id}`),
  createEntity: (data) => api.post('/admin/entities', data),
  updateEntity: (id, data) => api.put(`/admin/entities/${id}`, data),
  deleteEntity: (id) => api.delete(`/admin/entities/${id}`),
  
  // Staff
  getStaff: (params) => api.get('/admin/staff', { params }),
  getAllStaff: (params) => api.get('/admin/staff', { params }),
  getStaffById: (id) => api.get(`/admin/staff/${id}`),
  createStaff: (data) => api.post('/admin/staff', data),
  updateStaff: (id, data) => api.put(`/admin/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/admin/staff/${id}`),
  resetStaffPassword: (id) => api.post(`/admin/staff/${id}/reset-password`),
  
  // Certificates
  getCertificates: (params) => api.get('/admin/certificates', { params }),
  createCertificate: (data) => api.post('/admin/certificates', data),
  createEntityCertificate: (data) => api.post('/admin/entity-certificates', data),
  updateEntityCertificate: (id, data) => api.put(`/admin/entity-certificates/${id}`, data),
  deleteEntityCertificate: (id) => api.delete(`/admin/entity-certificates/${id}`),
  updateCertificate: (id, data) => api.put(`/admin/certificates/${id}`, data),
  deleteCertificate: (id) => api.delete(`/admin/certificates/${id}`),

  // Certificate Types Management
  getCertificateTypes: (params) => api.get('/admin/certificate-types', { params }),
  createCertificateType: (data) => api.post('/admin/certificate-types', data),
  updateCertificateType: (id, data) => api.put(`/admin/certificate-types/${id}`, data),
  deleteCertificateType: (id) => api.delete(`/admin/certificate-types/${id}`),

  // Document Upload
  uploadDocument: (formData) => api.post('/admin/upload/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Approvals
  getPendingApprovals: () => api.get('/admin/approvals/pending'),
  getApprovalHistory: () => api.get('/admin/approvals/history'),
  approveCertificate: (id, data) => api.put(`/admin/approvals/${id}`, data),
  
  // Entity Password
  resetEntityPassword: (id) => api.post(`/admin/entities/${id}/reset-password`),
  
  // Import
  importEntities: (formData) => api.post('/admin/import/entities', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  importKialStaff: (formData) => api.post('/admin/import/kial-staff', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  importEntityStaff: (entityCode, formData) => api.post(`/admin/import/entity-staff/${entityCode}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Export
  exportEntities: (params) => api.get('/admin/export/entities', { params, responseType: 'blob' }),
  exportStaff: (params) => api.get('/admin/export/staff', { params, responseType: 'blob' }),
};

// Entity Head APIs
export const entityAPI = {
  getDashboard: () => api.get('/entity/dashboard'),
  
  // Staff
  getStaff: () => api.get('/entity/staff'),
  createStaff: (data) => api.post('/entity/staff', data),
  updateStaff: (id, data) => api.put(`/entity/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/entity/staff/${id}`),
  
  // Certificates
  getCertificates: () => api.get('/entity/certificates'),
  createCertificate: (data) => api.post('/entity/certificates', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateCertificate: (id, data) => api.put(`/entity/certificates/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteCertificate: (id) => api.delete(`/entity/certificates/${id}`),
  renewCertificate: (data) => api.post('/entity/certificates/renew', data),

  // Exports
  exportStaff: (params) => api.get('/entity/export/staff', { params, responseType: 'blob' }),

  // Entity-Level Certificates
  createEntityCertificate: (data) => api.post('/entity/entity-certificates', data),
  updateEntityCertificate: (id, data) => api.put(`/entity/entity-certificates/${id}`, data),
  deleteEntityCertificate: (id) => api.delete(`/entity/entity-certificates/${id}`),
};

// Staff APIs
export const staffAPI = {
  getProfile: () => api.get('/staff/profile'),
  updateProfile: (data) => api.put('/staff/profile', data),
  
  // Certificates
  getCertificates: () => api.get('/staff/certificates'),
  createCertificate: (data) => api.post('/staff/certificates', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateCertificate: (id, data) => api.put(`/staff/certificates/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteCertificate: (id) => api.delete(`/staff/certificates/${id}`),
};

export default api;
