import { useContext } from 'react';
import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * هوك للمصادقة - يوفر وصولاً سهلًا لبيانات المستخدم ووظائف المصادقة
 * 
 * @returns {object} كائن يحتوي على:
 * - user: بيانات المستخدم الحالي
 * - token: توكن المصادقة
 * - isAuthenticated: حالة المصادقة
 * - isLoading: حالة التحميل
 * - login: دالة تسجيل الدخول
 * - guestLogin: دالة تسجيل دخول الضيف
 * - logout: دالة تسجيل الخروج
 * - updateUser: دالة تحديث بيانات المستخدم
 * - checkAuth: دالة التحقق من المصادقة
 */
export const useAuth = () => {
  const authContext = useAuthContext();
  
  // دوال مساعدة للتحقق من الصلاحيات
  const hasRole = (role: string | string[]): boolean => {
    if (!authContext.user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(authContext.user.role);
    }
    
    return authContext.user.role === role;
  };

  const isStudent = (): boolean => hasRole('student');
  const isProfessor = (): boolean => hasRole('professor');
  const isAdmin = (): boolean => hasRole('admin');
  const isRoot = (): boolean => hasRole('root');
  const isGuest = (): boolean => hasRole('guest');
  const isStaff = (): boolean => hasRole(['professor', 'admin', 'root']);
  
  const canAccess = (permission: string): boolean => {
    if (!authContext.user) return false;
    
    const { role } = authContext.user;
    
    // صلاحيات الروت (zero)
    if (role === 'root') return true;
    
    // صلاحيات الإدارة
    if (role === 'admin') {
      const adminPermissions = [
        'manage_users',
        'manage_courses',
        'manage_forum',
        'view_stats',
        'manage_settings'
      ];
      return adminPermissions.includes(permission);
    }
    
    // صلاحيات الأساتذة
    if (role === 'professor') {
      const professorPermissions = [
        'create_course',
        'edit_own_course',
        'upload_files',
        'manage_forum',
        'view_students'
      ];
      return professorPermissions.includes(permission);
    }
    
    // صلاحيات الطلاب
    if (role === 'student') {
      const studentPermissions = [
        'download_files',
        'participate_forum',
        'view_courses'
      ];
      return studentPermissions.includes(permission);
    }
    
    // صلاحيات الضيوف
    if (role === 'guest') {
      const guestPermissions = [
        'view_courses',
        'download_files'
      ];
      return guestPermissions.includes(permission);
    }
    
    return false;
  };

  // دالة للتحقق من صلاحية الوصول إلى تخصص معين
  const canAccessDepartment = (department: string): boolean => {
    if (!authContext.user) return false;
    
    // الروت والإدارة يمكنهم الوصول لكل شيء
    if (authContext.user.role === 'root' || authContext.user.role === 'admin') {
      return true;
    }
    
    // الأساتذة يمكنهم الوصول لتخصصاتهم فقط
    if (authContext.user.role === 'professor') {
      return authContext.user.department === department;
    }
    
    // الطلاب يمكنهم الوصول لتخصصاتهم فقط
    if (authContext.user.role === 'student') {
      return authContext.user.department === department;
    }
    
    // الضيوف يمكنهم الوصول لكل التخصصات
    if (authContext.user.role === 'guest') {
      return true;
    }
    
    return false;
  };

  // دالة للتحقق من صلاحية الوصول إلى مادة معينة
  const canAccessCourse = (courseProfessorId?: string, courseDepartment?: string): boolean => {
    if (!authContext.user) return false;
    
    const { role, _id, department } = authContext.user;
    
    // الروت والإدارة يمكنهم الوصول لكل المواد
    if (role === 'root' || role === 'admin') {
      return true;
    }
    
    // الأساتذة يمكنهم الوصول لموادهم فقط
    if (role === 'professor') {
      if (courseProfessorId && courseProfessorId === _id) {
        return true;
      }
      if (courseDepartment && courseDepartment === department) {
        return true;
      }
    }
    
    // الطلاب يمكنهم الوصول لمواد تخصصهم فقط
    if (role === 'student') {
      return courseDepartment === department;
    }
    
    // الضيوف يمكنهم الوصول لكل المواد
    if (role === 'guest') {
      return true;
    }
    
    return false;
  };

  // دالة للتحقق من صلاحية تعديل/حذف مادة
  const canModifyCourse = (courseProfessorId?: string): boolean => {
    if (!authContext.user) return false;
    
    const { role, _id } = authContext.user;
    
    // الروت يمكنه تعديل كل شيء
    if (role === 'root') return true;
    
    // الإدارة يمكنها تعديل كل المواد
    if (role === 'admin') return true;
    
    // الأساتذة يمكنهم تعديل موادهم فقط
    if (role === 'professor') {
      return courseProfessorId === _id;
    }
    
    return false;
  };

  // دالة للتحقق من صلاحية المشاركة في المنتدى
  const canPostInForum = (forumId?: string): boolean => {
    if (!authContext.user) return false;
    
    const { role } = authContext.user;
    
    // الضيوف لا يمكنهم المشاركة
    if (role === 'guest') return false;
    
    // باقي المستخدمين يمكنهم المشاركة
    return role !== 'guest';
  };

  // دالة للحصول على بيانات المصادقة للرؤوس
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    
    if (authContext.token) {
      headers['Authorization'] = `Bearer ${authContext.token}`;
    }
    
    return headers;
  };

  // دالة للحصول على معلومات المستخدم بشكل آمن
  const getUserInfo = () => {
    if (!authContext.user) return null;
    
    // إرجاع نسخة من بيانات المستخدم بدون معلومات حساسة
    const { password, ...safeUser } = authContext.user as any;
    return safeUser;
  };

  // دالة للتحقق من انتهاء جلسة الضيف
  const isGuestSessionExpired = (): boolean => {
    if (!authContext.user || authContext.user.role !== 'guest') {
      return false;
    }
    
    // جلسات الضيوف تنتهي بعد 30 دقيقة
    const sessionStart = localStorage.getItem('guestSessionStart');
    if (!sessionStart) return true;
    
    const sessionTime = Date.now() - parseInt(sessionStart);
    return sessionTime > 30 * 60 * 1000; // 30 دقيقة
  };

  // دالة لإعادة توجيه المستخدم بناءً على صلاحياته
  const redirectBasedOnRole = (): string => {
    if (!authContext.user) return '/login';
    
    switch (authContext.user.role) {
      case 'root':
        return '/admin/root';
      case 'admin':
        return '/admin/dashboard';
      case 'professor':
        return '/professor/dashboard';
      case 'student':
        return '/student/dashboard';
      case 'guest':
        return '/departments';
      default:
        return '/login';
    }
  };

  return {
    ...authContext,
    hasRole,
    isStudent,
    isProfessor,
    isAdmin,
    isRoot,
    isGuest,
    isStaff,
    canAccess,
    canAccessDepartment,
    canAccessCourse,
    canModifyCourse,
    canPostInForum,
    getAuthHeaders,
    getUserInfo,
    isGuestSessionExpired,
    redirectBasedOnRole,
  };
};

export default useAuth;
