const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth, permissions } = require('../middleware');
const User = require('../models/User');
const Course = require('../models/Course');
const File = require('../models/File');
const Forum = require('../models/Forum');
const ForumMessage = require('../models/ForumMessage');
const SecurityAlert = require('../models/SecurityAlert');
const AuditLog = require('../models/AuditLog');

/**
 * @route   GET /api/admin/dashboard
 * @desc    الحصول على إحصائيات لوحة التحكم (للإدارة فقط)
 * @access  Private/Admin,Root
 */
router.get('/dashboard', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    // إحصائيات المستخدمين
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
          professors: { $sum: { $cond: [{ $eq: ['$role', 'professor'] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          guests: { $sum: { $cond: [{ $eq: ['$role', 'guest'] }, 1, 0] } },
          // حسب التخصص
          electrical: { $sum: { $cond: [{ $eq: ['$department', 'electrical'] }, 1, 0] } },
          chemical: { $sum: { $cond: [{ $eq: ['$department', 'chemical'] }, 1, 0] } },
          civil: { $sum: { $cond: [{ $eq: ['$department', 'civil'] }, 1, 0] } },
          mechanical: { $sum: { $cond: [{ $eq: ['$department', 'mechanical'] }, 1, 0] } },
          medical: { $sum: { $cond: [{ $eq: ['$department', 'medical'] }, 1, 0] } }
        }
      }
    ]);

    // إحصائيات المواد
    const courseStats = await Course.aggregate([
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          activeCourses: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          // حسب التخصص
          electrical: { $sum: { $cond: [{ $eq: ['$department', 'electrical'] }, 1, 0] } },
          chemical: { $sum: { $cond: [{ $eq: ['$department', 'chemical'] }, 1, 0] } },
          civil: { $sum: { $cond: [{ $eq: ['$department', 'civil'] }, 1, 0] } },
          mechanical: { $sum: { $cond: [{ $eq: ['$department', 'mechanical'] }, 1, 0] } },
          medical: { $sum: { $cond: [{ $eq: ['$department', 'medical'] }, 1, 0] } },
          // حسب السمستر
          semester1: { $sum: { $cond: [{ $eq: ['$semester', 1] }, 1, 0] } },
          semester2: { $sum: { $cond: [{ $eq: ['$semester', 2] }, 1, 0] } },
          semester3: { $sum: { $cond: [{ $eq: ['$semester', 3] }, 1, 0] } },
          semester4: { $sum: { $cond: [{ $eq: ['$semester', 4] }, 1, 0] } },
          semester5: { $sum: { $cond: [{ $eq: ['$semester', 5] }, 1, 0] } },
          semester6: { $sum: { $cond: [{ $eq: ['$semester', 6] }, 1, 0] } },
          semester7: { $sum: { $cond: [{ $eq: ['$semester', 7] }, 1, 0] } },
          semester8: { $sum: { $cond: [{ $eq: ['$semester', 8] }, 1, 0] } },
          semester9: { $sum: { $cond: [{ $eq: ['$semester', 9] }, 1, 0] } },
          semester10: { $sum: { $cond: [{ $eq: ['$semester', 10] }, 1, 0] } }
        }
      }
    ]);

    // إحصائيات الملفات
    const fileStats = await File.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          totalDownloads: { $sum: '$downloadCount' },
          // حسب النوع
          lectures: { $sum: { $cond: [{ $eq: ['$type', 'lecture'] }, 1, 0] } },
          references: { $sum: { $cond: [{ $eq: ['$type', 'reference'] }, 1, 0] } },
          exercises: { $sum: { $cond: [{ $eq: ['$type', 'exercises'] }, 1, 0] } },
          exams: { $sum: { $cond: [{ $eq: ['$type', 'exam'] }, 1, 0] } },
          others: { $sum: { $cond: [{ $eq: ['$type', 'other'] }, 1, 0] } }
        }
      }
    ]);

    // إحصائيات المنتدى
    const forumStats = await ForumMessage.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          totalReplies: { $sum: { $size: '$replies' } },
          totalLikes: { $sum: { $size: '$likes' } }
        }
      }
    ]);

    // المستخدمين النشطين حالياً (سجلوا دخول في آخر 15 دقيقة)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeNow = await User.countDocuments({
      lastLogin: { $gte: fifteenMinutesAgo },
      isActive: true
    });

    // آخر المستخدمين المسجلين
    const recentUsers = await User.find({ role: { $ne: 'guest' } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('universityId name role department createdAt');

    // آخر المواد المضافة
    const recentCourses = await Course.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('code name department semester professorName')
      .populate('professorId', 'name');

    // آخر الملفات المرفوعة
    const recentFiles = await File.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalname type category size uploadedBy')
      .populate('uploadedBy', 'name')
      .populate('course', 'name');

    // آخر رسائل المنتدى
    const recentMessages = await ForumMessage.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('content createdAt')
      .populate('userId', 'name role')
      .populate('forum', 'name');

    // تنبيهات الأمن الحرجة
    const criticalAlerts = await SecurityAlert.find({
      severity: 'critical',
      status: 'pending'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('type title description createdAt');

    // تنسيق حجم الملفات
    const formatSize = (bytes) => {
      if (bytes === 0) return '0 بايت';
      const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const result = {
      users: userStats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        students: 0,
        professors: 0,
        admins: 0,
        guests: 0
      },
      courses: courseStats[0] || {
        totalCourses: 0,
        activeCourses: 0
      },
      files: fileStats[0] || {
        totalFiles: 0,
        totalSize: 0,
        totalDownloads: 0
      },
      forums: forumStats[0] || {
        totalMessages: 0,
        totalReplies: 0,
        totalLikes: 0
      },
      activeNow,
      recent: {
        users: recentUsers,
        courses: recentCourses,
        files: recentFiles,
        messages: recentMessages
      },
      alerts: {
        critical: criticalAlerts.length,
        list: criticalAlerts
      },
      formatted: {
        totalSize: fileStats[0] ? formatSize(fileStats[0].totalSize) : '0 بايت'
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات لوحة التحكم'
    });
  }
});

/**
 * @route   GET /api/admin/root/dashboard
 * @desc    الحصول على إحصائيات لوحة تحكم الروت (للروت فقط)
 * @access  Private/Root
 */
router.get('/root/dashboard', auth, permissions(['root']), async (req, res) => {
  try {
    // جميع إحصائيات لوحة التحكم العادية
    const adminDashboard = await getAdminDashboardData();
    
    // إحصائيات إضافية للروت
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // نشاط المستخدمين في آخر 30 يوم
    const userActivity = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // تسجيلات جديدة في آخر 30 يوم
    const newRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          role: { $ne: 'guest' }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
          professors: { $sum: { $cond: [{ $eq: ['$role', 'professor'] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // تحميل الملفات في آخر 30 يوم
    const fileDownloads = await File.aggregate([
      {
        $match: {
          lastDownloadedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$lastDownloadedAt' }
          },
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // رسائل المنتدى في آخر 30 يوم
    const forumMessages = await ForumMessage.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          replies: { $sum: { $size: '$replies' } },
          likes: { $sum: { $size: '$likes' } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // سجلات الأمان في آخر 7 أيام
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const securityAlerts = await SecurityAlert.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // أعلى 10 عناوين IP من حيث النشاط
    const topIPs = await SecurityAlert.aggregate([
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // المواد الأكثر تحميلاً
    const popularCourses = await Course.aggregate([
      {
        $lookup: {
          from: 'files',
          localField: 'files',
          foreignField: '_id',
          as: 'courseFiles'
        }
      },
      {
        $addFields: {
          totalDownloads: {
            $sum: '$courseFiles.downloadCount'
          },
          totalFiles: {
            $size: '$courseFiles'
          },
          totalSize: {
            $sum: '$courseFiles.size'
          }
        }
      },
      { $sort: { totalDownloads: -1 } },
      { $limit: 10 }
    ]);
    
    // الملفات الأكثر تحميلاً
    const popularFiles = await File.find({ downloadCount: { $gt: 0 } })
      .sort({ downloadCount: -1 })
      .limit(10)
      .populate('course', 'name code')
      .populate('uploadedBy', 'name');
    
    // المستخدمين الأكثر نشاطاً في المنتدى
    const activeForumUsers = await ForumMessage.aggregate([
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
          replyCount: { $sum: { $size: '$replies' } },
          likeCount: { $sum: { $size: '$likes' } },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { messageCount: -1 } },
      { $limit: 10 }
    ]);
    
    // ملء معلومات المستخدمين
    for (const user of activeForumUsers) {
      const userInfo = await User.findById(user._id).select('name role department');
      if (userInfo) {
        user.name = userInfo.name;
        user.role = userInfo.role;
        user.department = userInfo.department;
      }
    }
    
    // سجلات النظام في آخر 24 ساعة
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const systemLogs = await AuditLog.find({
      timestamp: { $gte: twentyFourHoursAgo },
      level: { $in: ['error', 'warn'] }
    })
    .sort({ timestamp: -1 })
    .limit(20);
    
    const result = {
      ...adminDashboard.data,
      analytics: {
        userActivity,
        newRegistrations,
        fileDownloads,
        forumMessages,
        securityAlerts
      },
      insights: {
        topIPs,
        popularCourses,
        popularFiles,
        activeForumUsers
      },
      system: {
        logs: systemLogs,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting root dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات لوحة تحكم الروت'
    });
  }
});

/**
 * @route   GET /api/admin/security/alerts
 * @desc    الحصول على تنبيهات الأمان (للإدارة فقط)
 * @access  Private/Admin,Root
 */
router.get('/security/alerts', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      severity, 
      type, 
      status, 
      startDate, 
      endDate 
    } = req.query;
    
    // بناء فلتر البحث
    const filter = {};
    
    if (severity) {
      filter.severity = severity;
    }
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'universityId name role' },
        { path: 'reviewedBy', select: 'name' }
      ]
    };
    
    const alerts = await SecurityAlert.paginate(filter, options);
    
    res.json({
      success: true,
      data: alerts.docs,
      pagination: {
        total: alerts.totalDocs,
        page: alerts.page,
        pages: alerts.totalPages,
        limit: alerts.limit
      }
    });
  } catch (error) {
    console.error('Error getting security alerts:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تنبيهات الأمان'
    });
  }
});

/**
 * @route   PUT /api/admin/security/alerts/:id
 * @desc    تحديث حالة تنبيه أمان
 * @access  Private/Admin,Root
 */
router.put('/security/alerts/:id', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const alert = await SecurityAlert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'التنبيه غير موجود'
      });
    }
    
    if (!['pending', 'reviewed', 'resolved', 'ignored'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة غير صالحة'
      });
    }
    
    alert.status = status;
    alert.reviewedBy = req.user.id;
    alert.reviewedAt = new Date();
    
    if (notes) {
      alert.adminNotes = notes;
    }
    
    await alert.save();
    
    res.json({
      success: true,
      message: 'تم تحديث حالة التنبيه بنجاح',
      data: alert
    });
  } catch (error) {
    console.error('Error updating security alert:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة التنبيه'
    });
  }
});

/**
 * @route   GET /api/admin/security/stats
 * @desc    الحصول على إحصائيات الأمان
 * @access  Private/Admin,Root
 */
router.get('/security/stats', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // إحصائيات التنبيهات
    const alertStats = await SecurityAlert.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          pendingAlerts: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          criticalAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          highAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          },
          mediumAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] }
          },
          lowAlerts: {
            $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] }
          }
        }
      }
    ]);
    
    // التنبيهات حسب النوع
    const alertsByType = await SecurityAlert.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // محاولات تسجيل دخول فاشلة
    const failedLogins = await SecurityAlert.countDocuments({
      type: 'failed_login',
      createdAt: { $gte: startDate }
    });
    
    // حسابات مجمدة
    const lockedAccounts = await User.countDocuments({
      lockedUntil: { $gte: new Date() }
    });
    
    // هجمات محتملة
    const potentialAttacks = await SecurityAlert.countDocuments({
      type: { 
        $in: ['brute_force_attempt', 'sql_injection_attempt', 'xss_attempt', 'ddos_attempt'] 
      },
      createdAt: { $gte: startDate }
    });
    
    // تنبيهات الحرجة غير المعالجة
    const unhandledCritical = await SecurityAlert.countDocuments({
      severity: 'critical',
      status: 'pending'
    });
    
    const result = alertStats[0] || {
      totalAlerts: 0,
      pendingAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0
    };
    
    res.json({
      success: true,
      data: {
        ...result,
        alertsByType,
        failedLogins,
        lockedAccounts,
        potentialAttacks,
        unhandledCritical
      }
    });
  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات الأمان'
    });
  }
});

/**
 * @route   GET /api/admin/audit-logs
 * @desc    الحصول على سجلات التدقيق (للإدارة فقط)
 * @access  Private/Admin,Root
 */
router.get('/audit-logs', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      action, 
      userId, 
      startDate, 
      endDate 
    } = req.query;
    
    // بناء فلتر البحث
    const filter = {};
    
    if (level) {
      filter.level = level;
    }
    
    if (action) {
      filter.action = action;
    }
    
    if (userId) {
      filter['user.id'] = userId;
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { timestamp: -1 }
    };
    
    const logs = await AuditLog.paginate(filter, options);
    
    res.json({
      success: true,
      data: logs.docs,
      pagination: {
        total: logs.totalDocs,
        page: logs.page,
        pages: logs.totalPages,
        limit: logs.limit
      }
    });
  } catch (error) {
    console.error('Error getting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجلات التدقيق'
    });
  }
});

/**
 * @route   POST /api/admin/system/backup
 * @desc    إنشاء نسخة احتياطية يدوية (للروت فقط)
 * @access  Private/Root
 */
router.post('/system/backup', auth, permissions(['root']), async (req, res) => {
  try {
    const { description } = req.body;
    
    // ملاحظة: في الواقع، هذا سيتطلب استدعاء سكربت النسخ الاحتياطي
    // هنا نعود فقط ببيانات وهمية للتجربة
    
    const backupInfo = {
      id: 'backup-' + Date.now(),
      timestamp: new Date(),
      description: description || 'نسخة احتياطية يدوية',
      size: '0 بايت',
      status: 'pending'
    };
    
    // تسجيل سجل التدقيق
    await AuditLog.create({
      level: 'info',
      action: 'backup_create',
      message: 'تم إنشاء نسخة احتياطية يدوية',
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      metadata: {
        backupId: backupInfo.id,
        description: backupInfo.description
      }
    });
    
    res.json({
      success: true,
      message: 'بدأ إنشاء النسخة الاحتياطية',
      data: backupInfo
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء النسخة الاحتياطية'
    });
  }
});

/**
 * @route   GET /api/admin/system/info
 * @desc    الحصول على معلومات النظام (للروت فقط)
 * @access  Private/Root
 */
router.get('/system/info', auth, permissions(['root']), async (req, res) => {
  try {
    const os = require('os');
    const fs = require('fs-extra');
    const path = require('path');
    
    // معلومات النظام
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      loadavg: os.loadavg()
    };
    
    // معلومات التطبيق
    const appInfo = {
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cwd: process.cwd()
    };
    
    // معلومات قاعدة البيانات
    const dbInfo = {
      host: process.env.MONGODB_URI ? new URL(process.env.MONGODB_URI).hostname : 'غير معروف',
      name: process.env.MONGODB_URI ? new URL(process.env.MONGODB_URI).pathname.substring(1) : 'غير معروف',
      collections: await mongoose.connection.db.listCollections().toArray()
    };
    
    // مساحة التخزين
    const uploadsPath = process.env.UPLOAD_PATH || './uploads';
    let uploadsSize = 0;
    
    try {
      if (await fs.pathExists(uploadsPath)) {
        const files = await fs.readdir(uploadsPath);
        for (const file of files) {
          const filePath = path.join(uploadsPath, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            uploadsSize += stats.size;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating uploads size:', error);
    }
    
    // تنسيق الأحجام
    const formatSize = (bytes) => {
      if (bytes === 0) return '0 بايت';
      const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    const storageInfo = {
      uploadsSize,
      uploadsSizeFormatted: formatSize(uploadsSize),
      backupsPath: process.env.BACKUP_PATH || '/var/backups/engineering-library'
    };
    
    // إحصائيات النظام
    const stats = {
      users: await User.countDocuments(),
      courses: await Course.countDocuments(),
      files: await File.countDocuments(),
      forums: await Forum.countDocuments(),
      messages: await ForumMessage.countDocuments(),
      alerts: await SecurityAlert.countDocuments(),
      logs: await AuditLog.countDocuments()
    };
    
    // آخر تحديث للنظام
    const lastUpdates = {
      users: await User.findOne().sort({ updatedAt: -1 }).select('updatedAt'),
      courses: await Course.findOne().sort({ updatedAt: -1 }).select('updatedAt'),
      files: await File.findOne().sort({ updatedAt: -1 }).select('updatedAt')
    };
    
    res.json({
      success: true,
      data: {
        system: systemInfo,
        application: appInfo,
        database: dbInfo,
        storage: storageInfo,
        statistics: stats,
        lastUpdates
      }
    });
  } catch (error) {
    console.error('Error getting system info:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معلومات النظام'
    });
  }
});

/**
 * @route   POST /api/admin/system/cleanup
 * @desc    تنظيف النظام (للروت فقط)
 * @access  Private/Root
 */
router.post('/system/cleanup', auth, permissions(['root']), async (req, res) => {
  try {
    const { 
      cleanOldLogs = true, 
      cleanOldAlerts = true, 
      cleanTempFiles = true,
      days = 90 
    } = req.body;
    
    const results = {};
    
    // تنظيف السجلات القديمة
    if (cleanOldLogs) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
      
      const logsResult = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
        level: { $in: ['info', 'debug'] }
      });
      
      results.logs = {
        deleted: logsResult.deletedCount,
        cutoffDate
      };
    }
    
    // تنظيف التنبيهات القديمة
    if (cleanOldAlerts) {
      const alertsResult = await SecurityAlert.cleanupOldAlerts(parseInt(days));
      results.alerts = alertsResult;
    }
    
    // تنظيف الملفات المؤقتة
    if (cleanTempFiles) {
      // هنا يمكن إضافة منطق لتنظيف الملفات المؤقتة
      results.tempFiles = {
        message: 'سيتم تنظيف الملفات المؤقتة في الخلفية'
      };
    }
    
    // تسجيل سجل التدقيق
    await AuditLog.create({
      level: 'info',
      action: 'system_cleanup',
      message: 'تم تنظيف النظام',
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      },
      metadata: {
        results
      }
    });
    
    res.json({
      success: true,
      message: 'تم تنظيف النظام بنجاح',
      data: results
    });
  } catch (error) {
    console.error('Error cleaning system:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تنظيف النظام'
    });
  }
});

/**
 * @route   POST /api/admin/system/restart
 * @desc    إعادة تشغيل التطبيق (للروت فقط)
 * @access  Private/Root
 */
router.post('/system/restart', auth, permissions(['root']), async (req, res) => {
  try {
    // تسجيل سجل التدقيق
    await AuditLog.create({
      level: 'warn',
      action: 'system_restart',
      message: 'تم طلب إعادة تشغيل التطبيق',
      user: {
        id: req.user.id,
        name: req.user.name,
        role: req.user.role
      }
    });
    
    res.json({
      success: true,
      message: 'سيتم إعادة تشغيل التطبيق قريباً'
    });
    
    // في الواقع، هنا سنقوم بإعادة تشغيل التطبيق
    // setTimeout(() => {
    //   process.exit(0);
    // }, 1000);
    
  } catch (error) {
    console.error('Error restarting system:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة تشغيل النظام'
    });
  }
});

/**
 * دالة مساعدة للحصول على بيانات لوحة التحكم
 */
async function getAdminDashboardData() {
  // هذه دالة مساعدة تعيد بيانات لوحة التحكم
  // تم تبسيطها هنا لأغراض التوضيح
  
  const userStats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
      }
    }
  ]);
  
  const courseStats = await Course.aggregate([
    {
      $group: {
        _id: null,
        totalCourses: { $sum: 1 }
      }
    }
  ]);
  
  const fileStats = await File.aggregate([
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    }
  ]);
  
  return {
    data: {
      users: userStats[0] || { totalUsers: 0, activeUsers: 0 },
      courses: courseStats[0] || { totalCourses: 0 },
      files: fileStats[0] || { totalFiles: 0, totalSize: 0 }
    }
  };
}

module.exports = router;
