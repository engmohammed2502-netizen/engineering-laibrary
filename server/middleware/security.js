/**
 * وسائط الأمان
 * تحمي التطبيق من الهجمات الشائعة وتوفر طبقة أمان إضافية
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const SecurityAlert = require('../models/SecurityAlert');
const User = require('../models/User');

/**
 * وسيط للتحقق من وجود هجمات حقن SQL
 */
const sqlInjectionProtection = () => {
  return (req, res, next) => {
    // قائمة بالكلمات المفتاحية الخطرة في SQL
    const sqlKeywords = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', 
      'OR', 'AND', 'WHERE', 'FROM', 'TABLE', 'DATABASE',
      'EXEC', 'EXECUTE', 'TRUNCATE', 'ALTER', 'CREATE'
    ];
    
    // دالة للتحقق من وجود كلمات خطرة
    const checkForSQLInjection = (value) => {
      if (typeof value !== 'string') return false;
      
      const upperValue = value.toUpperCase();
      return sqlKeywords.some(keyword => 
        upperValue.includes(keyword) && 
        (upperValue.includes('(') || upperValue.includes(')') || upperValue.includes(';'))
      );
    };
    
    // التحقق من query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (checkForSQLInjection(value)) {
          logSecurityAlert('sql_injection_attempt', req, {
            parameter: key,
            value: value.substring(0, 100),
            source: 'query'
          });
          return res.status(400).json({
            success: false,
            message: 'طلب غير صالح'
          });
        }
      }
    }
    
    // التحقق من body parameters
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (checkForSQLInjection(value)) {
          logSecurityAlert('sql_injection_attempt', req, {
            parameter: key,
            value: value.substring(0, 100),
            source: 'body'
          });
          return res.status(400).json({
            success: false,
            message: 'طلب غير صالح'
          });
        }
      }
    }
    
    // التحقق من route parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        if (checkForSQLInjection(value)) {
          logSecurityAlert('sql_injection_attempt', req, {
            parameter: key,
            value: value.substring(0, 100),
            source: 'params'
          });
          return res.status(400).json({
            success: false,
            message: 'طلب غير صالح'
          });
        }
      }
    }
    
    next();
  };
};

/**
 * وسيط للتحقق من وجود هجمات XSS
 */
const xssProtection = () => {
  return (req, res, next) => {
    // قائمة بالعلامات والسمات الخطرة في XSS
    const dangerousPatterns = [
      /<script\b[^>]*>/i,
      /<\/script>/i,
      /javascript:/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /onmouseover=/i,
      /alert\(/i,
      /document\.cookie/i,
      /window\.location/i,
      /eval\(/i
    ];
    
    // دالة للتحقق من وجود أنماط خطرة
    const checkForXSS = (value) => {
      if (typeof value !== 'string') return false;
      return dangerousPatterns.some(pattern => pattern.test(value));
    };
    
    // التحقق من body parameters
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (checkForXSS(value)) {
          logSecurityAlert('xss_attempt', req, {
            parameter: key,
            value: value.substring(0, 100),
            source: 'body'
          });
          return res.status(400).json({
            success: false,
            message: 'طلب غير صالح'
          });
        }
      }
    }
    
    // التحقق من query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (checkForXSS(value)) {
          logSecurityAlert('xss_attempt', req, {
            parameter: key,
            value: value.substring(0, 100),
            source: 'query'
          });
          return res.status(400).json({
            success: false,
            message: 'طلب غير صالح'
          });
        }
      }
    }
    
    next();
  };
};

/**
 * وسيط للكشف عن هجمات DDoS/الفيضان
 */
const floodProtection = () => {
  const requestCounts = new Map();
  const WINDOW_SIZE = 15 * 60 * 1000; // 15 دقيقة
  const MAX_REQUESTS = 100; // 100 طلب في 15 دقيقة
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    // تنظيف الطلبات القديمة
    for (const [ipAddress, requests] of requestCounts.entries()) {
      const recentRequests = requests.filter(time => now - time < WINDOW_SIZE);
      if (recentRequests.length === 0) {
        requestCounts.delete(ipAddress);
      } else {
        requestCounts.set(ipAddress, recentRequests);
      }
    }
    
    // التحقق من طلبات هذا الـ IP
    const requests = requestCounts.get(ip) || [];
    requests.push(now);
    
    if (requests.length > MAX_REQUESTS) {
      // كشف هجوم فيضان
      logSecurityAlert('ddos_attempt', req, {
        requestCount: requests.length,
        windowSize: WINDOW_SIZE,
        maxRequests: MAX_REQUESTS
      });
      
      return res.status(429).json({
        success: false,
        message: 'لقد تجاوزت الحد الأقصى للطلبات. يرجى المحاولة لاحقاً'
      });
    }
    
    requestCounts.set(ip, requests);
    next();
  };
};

/**
 * وسيط لمنع انتحال الهوية (CSRF Protection)
 */
const csrfProtection = () => {
  return (req, res, next) => {
    // التحقق من طلبات POST, PUT, DELETE فقط
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
      const sessionToken = req.session?.csrfToken;
      
      if (!csrfToken || csrfToken !== sessionToken) {
        logSecurityAlert('csrf_attempt', req, {
          method: req.method,
          endpoint: req.originalUrl,
          providedToken: csrfToken ? 'present' : 'missing'
        });
        
        return res.status(403).json({
          success: false,
          message: 'رمز CSRF غير صالح أو مفقود'
        });
      }
    }
    next();
  };
};

/**
 * وسيط للتحقق من قوة كلمة المرور
 */
const passwordStrengthCheck = () => {
  return (req, res, next) => {
    if (req.body.password) {
      const password = req.body.password;
      
      // التحقق من الطول الأدنى
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
        });
      }
      
      // التحقق من التعقيد
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      
      const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars]
        .filter(Boolean).length;
      
      if (complexityScore < 3) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور ضعيفة. يجب أن تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة'
        });
      }
      
      // التحقق من كلمات المرور الشائعة
      const commonPasswords = [
        'password', '123456', '12345678', '123456789', '1234567890',
        'qwerty', 'admin', 'welcome', 'monkey', 'password1'
      ];
      
      if (commonPasswords.includes(password.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور شائعة جداً. يرجى اختيار كلمة مرور أقوى'
        });
      }
    }
    
    next();
  };
};

/**
 * وسيط للتحقق من عمليات النسخ واللصق الضارة
 */
const pasteProtection = () => {
  return (req, res, next) => {
    if (req.body.content || req.body.description || req.body.message) {
      const fieldsToCheck = ['content', 'description', 'message', 'title', 'name'];
      
      for (const field of fieldsToCheck) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          const value = req.body[field];
          
          // الكشف عن روابط ضارة
          const maliciousPatterns = [
            /(http|https):\/\/(malware|virus|hack|exploit|phishing)/i,
            /<iframe/i,
            /<embed/i,
            /<object/i,
            /data:text\/html/i,
            /javascript:void\(0\)/i
          ];
          
          for (const pattern of maliciousPatterns) {
            if (pattern.test(value)) {
              logSecurityAlert('malicious_content', req, {
                field: field,
                contentPreview: value.substring(0, 200),
                pattern: pattern.toString()
              });
              
              return res.status(400).json({
                success: false,
                message: 'المحتوى يحتوي على روابط أو كود ضار'
              });
            }
          }
        }
      }
    }
    
    next();
  };
};

/**
 * وسيط للكشف عن الروبوتات والبرامج الآلية
 */
const botDetection = () => {
  return (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    
    // قائمة برامج الزحف والروبوتات المعروفة
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /php/i,
      /node/i,
      /go-http/i,
      /okhttp/i
    ];
    
    // استثناء محركات البحث المشروعة
    const allowedBots = [
      /googlebot/i,
      /bingbot/i,
      /slurp/i, // Yahoo
      /duckduckbot/i,
      /baiduspider/i,
      /yandexbot/i
    ];
    
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    const isAllowedBot = allowedBots.some(pattern => pattern.test(userAgent));
    
    if (isBot && !isAllowedBot) {
      logSecurityAlert('bot_detection', req, {
        userAgent: userAgent.substring(0, 200),
        isAllowed: false
      });
      
      // السماح للروبوتات بالوصول للصفحات العامة فقط
      if (!req.originalUrl.startsWith('/api/') && req.method === 'GET') {
        return next(); // السماح للروبوتات بالزحف للصفحات العامة
      }
      
      return res.status(403).json({
        success: false,
        message: 'الوصول ممنوع للبرامج الآلية'
      });
    }
    
    next();
  };
};

/**
 * وسيط للتحقق من صلاحية ملفات الرفع
 */
const uploadSecurity = () => {
  return (req, res, next) => {
    if (req.file || req.files) {
      const files = req.file ? [req.file] : (req.files || []);
      
      for (const file of files) {
        // التحقق من نوع الملف
        const allowedTypes = process.env.ALLOWED_FILE_TYPES
          ? process.env.ALLOWED_FILE_TYPES.split(',')
          : ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'zip', 'rar', '7z', 'exe', 'mp4', 'avi', 'mov', 'wmv'];
        
        const extension = file.originalname.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(extension)) {
          logSecurityAlert('file_upload', req, {
            filename: file.originalname,
            extension: extension,
            allowedTypes: allowedTypes.join(', ')
          });
          
          return res.status(400).json({
            success: false,
            message: `نوع الملف غير مسموح: ${extension}`
          });
        }
        
        // التحقق من حجم الملف
        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 157286400; // 150MB
        if (file.size > maxSize) {
          logSecurityAlert('file_upload', req, {
            filename: file.originalname,
            size: file.size,
            maxSize: maxSize
          });
          
          return res.status(400).json({
            success: false,
            message: `حجم الملف كبير جداً. الحد الأقصى ${maxSize / (1024 * 1024)} ميجابايت`
          });
        }
        
        // التحقق من الملفات الخطرة (مثل .exe في بعض الحالات)
        if (extension === 'exe' && !req.user.role === 'admin' && !req.user.role === 'root') {
          logSecurityAlert('suspicious_file_upload', req, {
            filename: file.originalname,
            extension: extension,
            userRole: req.user.role
          });
          
          return res.status(400).json({
            success: false,
            message: 'رفع ملفات .exe مسموح للإدارة فقط'
          });
        }
      }
    }
    
    next();
  };
};

/**
 * وسيط لمنع الوصول غير المصرح للملفات
 */
const fileAccessProtection = () => {
  return async (req, res, next) => {
    try {
      // فقط للطرق التي تتعامل مع الملفات
      if (!req.params.id || !req.originalUrl.includes('/files/')) {
        return next();
      }
      
      const File = require('../models/File');
      const file = await File.findById(req.params.id);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'الملف غير موجود'
        });
      }
      
      // إذا كان الملف عاماً (مثل صور المنتدى)
      if (file.isPublic) {
        return next();
      }
      
      // التحقق من صلاحية الوصول
      const hasAccess = await checkFileAccess(req.user, file);
      
      if (!hasAccess) {
        logSecurityAlert('unauthorized_file_access', req, {
          fileId: file._id,
          filename: file.originalname,
          userRole: req.user.role,
          userId: req.user.id
        });
        
        return res.status(403).json({
          success: false,
          message: 'ليس لديك صلاحية للوصول لهذا الملف'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error in file access protection:', error);
      next();
    }
  };
};

/**
 * وسيط لمراقبة النشاط المشبوه
 */
const suspiciousActivityMonitor = () => {
  const userActivities = new Map();
  const SUSPICIOUS_THRESHOLD = 10; // 10 عمليات في دقيقة واحدة
  const TIME_WINDOW = 60 * 1000; // دقيقة واحدة
  
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return next();
      }
      
      const now = Date.now();
      const userActivity = userActivities.get(userId) || [];
      
      // إزالة الأنشطة القديمة
      const recentActivities = userActivity.filter(time => now - time < TIME_WINDOW);
      recentActivities.push(now);
      
      userActivities.set(userId, recentActivities);
      
      // إذا تجاوز العتبة، تسجيل نشاط مشبوه
      if (recentActivities.length >= SUSPICIOUS_THRESHOLD) {
        const user = await User.findById(userId).select('name role');
        
        await SecurityAlert.create({
          type: 'suspicious_activity',
          severity: 'high',
          title: 'نشاط مشبوه',
          description: `تم اكتشاف ${recentActivities.length} عملية في دقيقة واحدة من قبل المستخدم ${user?.name || userId}`,
          user: userId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            activityCount: recentActivities.length,
            timeWindow: TIME_WINDOW,
            threshold: SUSPICIOUS_THRESHOLD,
            endpoint: req.originalUrl,
            method: req.method
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('Error in suspicious activity monitor:', error);
      next();
    }
  };
};

/**
 * وسيط لتسجيل جميع الطلبات (Request Logging)
 */
const requestLogger = () => {
  return (req, res, next) => {
    const start = Date.now();
    
    // تسجيل الاستجابة عند الانتهاء
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: duration + 'ms',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || 'anonymous',
        userRole: req.user?.role || 'guest'
      };
      
      // تسجيل فقط الطلبات المثيرة للاهتمام
      if (res.statusCode >= 400 || duration > 1000) {
        console.log('HTTP Request:', logEntry);
      }
    });
    
    next();
  };
};

/**
 * تكوين Helmet للأمان
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * تكوين rate limiting
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 دقيقة
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 طلب لكل IP
  message: {
    success: false,
    message: 'لقد تجاوزت الحد الأقصى للطلبات. يرجى المحاولة لاحقاً'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * rate limiting أكثر صرامة لعمليات المصادقة
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10, // 10 محاولات فقط
  message: {
    success: false,
    message: 'لقد تجاوزت الحد الأقصى لمحاولات تسجيل الدخول. يرجى المحاولة لاحقاً'
  },
  skipSuccessfulRequests: true
});

/**
 * دالة مساعدة لتسجيل تنبيهات الأمان
 */
const logSecurityAlert = async (type, req, metadata = {}) => {
  try {
    const alertData = {
      type,
      severity: getSeverityLevel(type),
      title: getAlertTitle(type),
      description: getAlertDescription(type),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || '',
      metadata: {
        ...metadata,
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date()
      }
    };
    
    // إضافة معلومات المستخدم إذا كان مسجلاً دخولاً
    if (req.user && req.user.id) {
      alertData.user = req.user.id;
    }
    
    await SecurityAlert.create(alertData);
  } catch (error) {
    console.error('Error logging security alert:', error);
  }
};

/**
 * دالة مساعدة لتحديد مستوى الخطورة
 */
const getSeverityLevel = (type) => {
  const severityMap = {
    'sql_injection_attempt': 'critical',
    'xss_attempt': 'high',
    'ddos_attempt': 'critical',
    'csrf_attempt': 'high',
    'malicious_content': 'medium',
    'bot_detection': 'low',
    'file_upload': 'medium',
    'unauthorized_file_access': 'high',
    'suspicious_activity': 'high',
    'brute_force_attempt': 'high'
  };
  
  return severityMap[type] || 'medium';
};

/**
 * دالة مساعدة للحصول على عنوان التنبيه
 */
const getAlertTitle = (type) => {
  const titleMap = {
    'sql_injection_attempt': 'محاولة هجوم بحقن SQL',
    'xss_attempt': 'محاولة هجوم XSS',
    'ddos_attempt': 'محاولة هجوم DDoS/فيضان',
    'csrf_attempt': 'محاولة انتحال هوية CSRF',
    'malicious_content': 'محتوى ضار',
    'bot_detection': 'كشف روبوت/برنامج آلي',
    'file_upload': 'رفع ملف مشبوه',
    'unauthorized_file_access': 'محاولة وصول غير مصرح لملف',
    'suspicious_activity': 'نشاط مشبوه',
    'brute_force_attempt': 'محاولة هجوم بقوة الغاشمة'
  };
  
  return titleMap[type] || 'تنبيه أمان';
};

/**
 * دالة مساعدة للحصول على وصف التنبيه
 */
const getAlertDescription = (type) => {
  const descriptionMap = {
    'sql_injection_attempt': 'تم اكتشاف محاولة هجوم بحقن SQL',
    'xss_attempt': 'تم اكتشاف محاولة هجوم XSS',
    'ddos_attempt': 'تم اكتشاف محاولة هجوم DDoS/فيضان',
    'csrf_attempt': 'تم اكتشاف محاولة انتحال هوية CSRF',
    'malicious_content': 'تم اكتشاف محتوى ضار',
    'bot_detection': 'تم اكتشاف روبوت/برنامج آلي',
    'file_upload': 'تم رفع ملف مشبوه',
    'unauthorized_file_access': 'محاولة وصول غير مصرح لملف',
    'suspicious_activity': 'تم اكتشاف نشاط مشبوه',
    'brute_force_attempt': 'تم اكتشاف محاولة هجوم بقوة الغاشمة'
  };
  
  return descriptionMap[type] || 'تم اكتشاف نشاط أمني مشبوه';
};

/**
 * دالة مساعدة للتحقق من صلاحية الوصول للملف
 */
const checkFileAccess = async (user, file) => {
  try {
    // الروت والإدارة يمكنهم الوصول لكل الملفات
    if (user.role === 'root' || user.role === 'admin') {
      return true;
    }
    
    // مالك الملف يمكنه الوصول إليه
    if (file.uploadedBy.toString() === user.id) {
      return true;
    }
    
    // إذا كان الملف مرتبطاً بمادة
    if (file.course) {
      const Course = require('../models/Course');
      const course = await Course.findById(file.course);
      
      if (!course) {
        return false;
      }
      
      // أستاذ المادة يمكنه الوصول لملفاتها
      if (user.role === 'professor' && course.professorId.toString() === user.id) {
        return true;
      }
      
      // الطلاب يمكنهم الوصول لملفات تخصصهم
      if (user.role === 'student' && user.department === course.department) {
        return true;
      }
      
      // الضيوف يمكنهم الوصول للملفات العامة فقط
      if (user.role === 'guest' && file.isPublic) {
        return true;
      }
    }
    
    // الملفات العامة يمكن للجميع الوصول إليها
    if (file.isPublic) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking file access:', error);
    return false;
  }
};

module.exports = {
  sqlInjectionProtection,
  xssProtection,
  floodProtection,
  csrfProtection,
  passwordStrengthCheck,
  pasteProtection,
  botDetection,
  uploadSecurity,
  fileAccessProtection,
  suspiciousActivityMonitor,
  requestLogger,
  helmetConfig,
  apiLimiter,
  authLimiter,
  
  // تصدير مكتبات الأمان للإعداد العام
  securityLibraries: {
    helmet,
    xss,
    hpp,
    mongoSanitize
  }
};
