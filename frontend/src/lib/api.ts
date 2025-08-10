import axios from 'axios';
import { getSession } from 'next-auth/react';

// Create axios instances for different contexts

// Client-side API instance (for frontend components)
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

// Server-side API instance (for NextAuth and server components)
export const serverApi = axios.create({
  baseURL: process.env.INTERNAL_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

// Server API error interceptor
serverApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging (server-side)
    console.error('Server API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

// Request interceptor to add auth token
// Temporarily disabled to debug NextAuth initialization issues
/*
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession();
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    } catch (error) {
      // If getSession fails, continue without auth header
      console.warn('Failed to get session in API interceptor:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
*/

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error details for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      // Redirect to login for authentication errors (only in browser)
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    } else if (error.response?.status === 403) {
      // Handle authorization errors
      console.warn('Access denied - insufficient permissions');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error occurred');
    } else if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
      // Handle network errors
      console.error('Network error - server unavailable');
    }

    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => api.post('/auth/register', data),
  
  me: () => api.get('/auth/me'),
  
  logout: () => api.post('/auth/logout'),
};

export const patientsApi = {
  getAll: (params?: any) => api.get('/patients', { params }),
  
  getById: (id: string) => api.get(`/patients/${id}`),
  
  create: (data: any) => api.post('/patients', data),
  
  update: (id: string, data: any) => api.put(`/patients/${id}`, data),
  
  delete: (id: string) => api.delete(`/patients/${id}`),
  
  search: (searchParams: any) => api.post('/patients/search', searchParams),
};

export const examinationsApi = {
  getWorklist: (params?: any) => api.get('/examinations/worklist', { params }),
  
  getById: (id: string) => api.get(`/examinations/${id}`),
  
  create: (data: any) => api.post('/examinations', data),
  
  update: (id: string, data: any) => api.put(`/examinations/${id}`, data),
  
  delete: (id: string) => api.delete(`/examinations/${id}`),
  
  bulkAction: (action: string, examinationIds: string[], data?: any) =>
    api.post('/examinations/bulk-action', { action, examinationIds, data }),
  
  getStats: () => api.get('/examinations/stats/dashboard'),
};

export const reportsApi = {
  getAll: (params?: any) => api.get('/reports', { params }),
  
  getById: (id: string) => api.get(`/reports/${id}`),
  
  create: (data: any) => api.post('/reports', data),
  
  update: (id: string, data: any) => api.put(`/reports/${id}`, data),
  
  delete: (id: string) => api.delete(`/reports/${id}`),
  
  validate: (id: string, data: any) => api.post(`/reports/${id}/validate`, data),
  
  getTemplates: (params?: any) => api.get('/reports/templates', { params }),
  
  createTemplate: (data: any) => api.post('/reports/templates', data),
  
  updateTemplate: (id: string, data: any) => api.put(`/reports/templates/${id}`, data),
  
  getStats: () => api.get('/reports/stats/reporting'),
};

export const dicomApi = {
  echo: () => api.get('/dicom/echo'),
  
  getStats: () => api.get('/dicom/stats'),
  
  searchStudies: (searchParams: any) => api.post('/dicom/studies/search', searchParams),
  
  getStudy: (studyUID: string) => api.get(`/dicom/studies/${studyUID}`),
  
  getSeries: (studyUID: string, seriesUID: string) =>
    api.get(`/dicom/studies/${studyUID}/series/${seriesUID}`),
  
  getInstanceMetadata: (studyUID: string, seriesUID: string, instanceUID: string) =>
    api.get(`/dicom/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/metadata`),
  
  getWadoUri: (studyUID: string, params?: any) =>
    api.get(`/dicom/studies/${studyUID}/wado-uri`, { params }),
  
  store: (dicomData: string) => api.post('/dicom/store', { dicomData }),
  
  createWorklist: (data: any) => api.post('/dicom/worklist', data),
  
  syncExamination: (examinationId: string) =>
    api.post(`/dicom/sync-examination/${examinationId}`),
  
  getViewerConfig: (examinationId: string) =>
    api.get(`/dicom/viewer-config/${examinationId}`),
};

export default api;