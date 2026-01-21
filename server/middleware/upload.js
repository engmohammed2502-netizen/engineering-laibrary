const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إنشاء مجلد إذا لم يكن موجوداً
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// إعدادات تخزين الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    
    if (req.baseUrl.includes('forum')) {
      uploadPath = 'uploads/forum-images/';
    } else if (req.baseUrl.includes('courses')) {
      const courseId = req.params.courseId || 'general';
      uploadPath = `uploads/courses/${courseId}/`;
    }
    
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// فلترة أنواع الملفات
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/x-msdownload' // exe
  ];
  
  if (file.fieldname === 'forumImage') {
    // صور المنتدى فقط
    if (file.mimetype.startsWith('image/') && file.size <= 3 * 1024 * 1024) {
      cb(null, true);
    } else {
      cb(new Error('الصور فقط مسموح بها بحد أقصى 3MB'), false);
    }
  } else {
    // ملفات المواد
    if (allowedTypes.includes(file.mimetype) && file.size <= 150 * 1024 * 1024) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف أو الحجم غير مسموح'), false);
    }
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB
    files: 10 // 10 ملفات كحد أقصى
  }
});

module.exports = upload;
