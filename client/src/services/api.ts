import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { authService } from './auth.service';

// تكوين API الأساسي
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// إنشاء نسخة axios مخصصة
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 ثانية
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// طلب مخصص: إضافة التوكن قبل كل طلب
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // إضافة رأس اللغة
    const language = localStorage.getItem('language') || 'ar';
    config.headers['Accept-Language'] = language;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// استجابة مخصصة: معالجة الأخطاء
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // إذا كان الخطأ 401 ولم يتم إعادة المحاولة بعد
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // محاولة تجديد التوكن
        const newToken = await authService.refreshToken();
        
        if (newToken) {
          // تحديث التوكن في التخزين
          const currentToken = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (currentToken) {
            localStorage.getItem('token') 
              ? localStorage.setItem('token', newToken)
              : sessionStorage.setItem('token', newToken);
          }
          
          // تحديث رأس المصادقة وإعادة المحاولة
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // إذا فشل تجديد التوكن، تسجيل الخروج
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // معالجة أخطاء أخرى
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('خطأ في الطلب:', data.message || 'بيانات غير صالحة');
          break;
        case 403:
          console.error('غير مصرح:', data.message || 'ليس لديك صلاحية للوصول');
          window.location.href = '/unauthorized';
          break;
        case 404:
          console.error('غير موجود:', data.message || 'المورد غير موجود');
          break;
        case 429:
          console.error('معدل الطلبات كبير جداً:', data.message || 'يرجى المحاولة لاحقاً');
          break;
        case 500:
          console.error('خطأ في الخادم:', data.message || 'خطأ داخلي في الخادم');
          break;
        default:
          console.error('خطأ غير معروف:', error.message);
      }
    } else if (error.request) {
      console.error('لا يوجد اتصال بالخادم:', error.message);
    } else {
      console.error('خطأ في إعداد الطلب:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// دوال HTTP الأساسية
const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.get(url, config).then(response => response.data),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.post(url, data, config).then(response => response.data),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.put(url, data, config).then(response => response.data),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    api.patch(url, data, config).then(response => response.data),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    api.delete(url, config).then(response => response.data),
  
  // رفع الملفات
  upload: <T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    }).then(response => response.data);
  },
  
  // تحميل الملفات
  download: (url: string, filename?: string): Promise<void> => {
    return api.get(url, {
      responseType: 'blob',
    }).then(response => {
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    });
  },
};

export { api, http };
export default http;
