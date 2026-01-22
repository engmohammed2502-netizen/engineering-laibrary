import { http } from './api';

// أنواع البيانات
export interface Course {
  _id: string;
  code: string;
  name: string;
  description: string;
  department: 'electrical' | 'chemical' | 'civil' | 'mechanical' | 'medical';
  semester: number;
  professorId: string;
  professorName: string;
  files: CourseFile[];
  forumEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUpdatedBy: string;
}

export interface CourseFile {
  _id: string;
  filename: string;
  originalname: string;
  path: string;
  size: number;
  type: 'lecture' | 'reference' | 'exercises' | 'exam' | 'other';
  category: string;
  uploadedBy: string;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseRequest {
  code: string;
  name: string;
  description: string;
  department: string;
  semester: number;
  professorId: string;
}

export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  professorId?: string;
  isActive?: boolean;
  forumEnabled?: boolean;
}

export interface FileUploadRequest {
  courseId: string;
  type: CourseFile['type'];
  category: string;
  description?: string;
}

export interface CourseStats {
  totalCourses: number;
  totalFiles: number;
  totalDownloads: number;
  activeCourses: number;
  popularCourses: Course[];
  departmentDistribution: Record<string, number>;
}

// خدمة المواد الدراسية
export const coursesService = {
  // الحصول على جميع التخصصات
  getDepartments(): { id: string; name: string; description: string }[] {
    return [
      { id: 'electrical', name: 'الهندسة الكهربائية', description: 'تخصص الكهرباء والإلكترونيات' },
      { id: 'chemical', name: 'الهندسة الكيميائية', description: 'تخصص الكيمياء والعمليات الصناعية' },
      { id: 'civil', name: 'الهندسة المدنية', description: 'تخصص الإنشاءات والبنية التحتية' },
      { id: 'mechanical', name: 'الهندسة الميكانيكية', description: 'تخصص الميكانيكا والتصنيع' },
      { id: 'medical', name: 'الهندسة الطبية', description: 'تخصص الأجهزة الطبية والتقنيات الصحية' },
    ];
  },

  // الحصول على السمسترات
  getSemesters(): number[] {
    return Array.from({ length: 10 }, (_, i) => i + 1);
  },

  // الحصول على جميع المواد
  async getAllCourses(): Promise<Course[]> {
    return http.get<Course[]>('/courses');
  },

  // الحصول على مواد تخصص معين
  async getCoursesByDepartment(department: string): Promise<Course[]> {
    return http.get<Course[]>(`/courses/department/${department}`);
  },

  // الحصول على مواد سمستر معين في تخصص معين
  async getCoursesBySemester(department: string, semester: number): Promise<Course[]> {
    return http.get<Course[]>(`/courses/department/${department}/semester/${semester}`);
  },

  // الحصول على مادة بواسطة ID
  async getCourseById(courseId: string): Promise<Course> {
    return http.get<Course>(`/courses/${courseId}`);
  },

  // إنشاء مادة جديدة (للأساتذة والإدارة)
  async createCourse(data: CreateCourseRequest): Promise<{ message: string; course: Course }> {
    return http.post('/courses', data);
  },

  // تحديث مادة (للمالك والإدارة)
  async updateCourse(courseId: string, data: UpdateCourseRequest): Promise<{ message: string; course: Course }> {
    return http.put(`/courses/${courseId}`, data);
  },

  // حذف مادة (للمالك والإدارة فقط)
  async deleteCourse(courseId: string): Promise<{ message: string }> {
    return http.delete(`/courses/${courseId}`);
  },

  // الحصول على ملفات المادة
  async getCourseFiles(courseId: string): Promise<CourseFile[]> {
    return http.get<CourseFile[]>(`/courses/${courseId}/files`);
  },

  // رفع ملف لمادة
  async uploadFile(courseId: string, file: File, data: FileUploadRequest): Promise<{ message: string; file: CourseFile }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);
    formData.append('category', data.category);
    if (data.description) {
      formData.append('description', data.description);
    }

    return http.post(`/courses/${courseId}/upload`, formData);
  },

  // تحميل ملف
  async downloadFile(fileId: string): Promise<void> {
    return http.download(`/files/download/${fileId}`);
  },

  // حذف ملف (للمالك والإدارة فقط)
  async deleteFile(fileId: string): Promise<{ message: string }> {
    return http.delete(`/files/${fileId}`);
  },

  // تحديث معلومات الملف
  async updateFile(fileId: string, data: { type?: string; category?: string; description?: string }): Promise<{ message: string; file: CourseFile }> {
    return http.put(`/files/${fileId}`, data);
  },

  // زيادة عداد التنزيلات
  async incrementDownloadCount(fileId: string): Promise<{ message: string }> {
    return http.post(`/files/${fileId}/download`);
  },

  // الحصول على إحصائيات المواد
  async getCourseStats(): Promise<CourseStats> {
    return http.get<CourseStats>('/courses/stats');
  },

  // الحصول على المواد الشعبية
  async getPopularCourses(limit = 10): Promise<Course[]> {
    return http.get<Course[]>(`/courses/popular?limit=${limit}`);
  },

  // البحث في المواد
  async searchCourses(query: string): Promise<Course[]> {
    return http.get<Course[]>(`/courses/search?q=${encodeURIComponent(query)}`);
  },

  // الحصول على المواد التي يدرسها أستاذ معين
  async getProfessorCourses(professorId: string): Promise<Course[]> {
    return http.get<Course[]>(`/courses/professor/${professorId}`);
  },

  // تفعيل/تعطيل المنتدى الخاص بالمادة
  async toggleForum(courseId: string, enabled: boolean): Promise<{ message: string }> {
    return http.put(`/courses/${courseId}/forum`, { enabled });
  },

  // الحصول على أنواع الملفات
  getFileTypes(): { id: string; name: string; icon: string }[] {
    return [
      { id: 'lecture', name: 'محاضرة', icon: '📚' },
      { id: 'reference', name: 'مرجع', icon: '📖' },
      { id: 'exercises', name: 'تمارين', icon: '📝' },
      { id: 'exam', name: 'امتحانات', icon: '📋' },
      { id: 'other', name: 'أخرى', icon: '📎' },
    ];
  },

  // الحصول على تصنيفات الملفات
  getFileCategories(): string[] {
    return [
      'نظري',
      'عملي',
      'مشاريع',
      'حلول',
      'ملخصات',
      'عروض تقديمية',
      'فيديوهات',
      'برامج',
      'نماذج',
      'أخرى'
    ];
  },

  // تصدير قائمة المواد
  async exportCourses(format: 'csv' | 'excel' = 'csv'): Promise<void> {
    return http.download(`/courses/export?format=${format}`, `courses-export.${format}`);
  },
};

export default coursesService;
