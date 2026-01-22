const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const SecurityAlert = require('../models/SecurityAlert');
const { auth, permissions } = require('../middleware');
const { validateRegistration, validateUpdateProfile, validateChangePassword } = require('../utils/validators');
const { rateLimit } = require('../middleware/security');

/**
 * @route   GET /api/users
 * @desc    الحصول على جميع المستخدمين (للإدارة فقط)
 * @access  Private/Admin
 */
router.get('/', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, isActive, search } = req.query;
    
    // بناء فلتر البحث
    const filter = {};
    
    if (role) {
      filter.role = role;
    }
    
    if (department) {
      filter.department = department;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { universityId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // استبعاد المستخدم الحالي من النتائج إذا لم يكن رووت
    if (req.user.role !== 'root') {
      filter._id = { $ne: req.user.id };
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      select: '-password -refreshToken'
    };
    
    const users = await User.paginate(filter, options);
    
    res.json({
      success: true,
      data: users.docs,
      pagination: {
        total: users.totalDocs,
        page: users.page,
        pages: users.totalPages,
        limit: users.limit
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المستخدمين'
    });
  }
});

/**
 * @route   GET /api/users/me
 * @desc    الحصول على بيانات المستخدم الحالي
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -refreshToken -loginAttempts -lockedUntil')
      .populate('department', 'name description');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    الحصول على مستخدم بواسطة ID (للإدارة فقط)
 * @access  Private/Admin
 */
router.get('/:id', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('department', 'name description');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات المستخدم'
    });
  }
});

/**
 * @route   POST /api/users/register/student
 * @desc    تسجيل طالب جديد (للأساتذة والإدارة)
 * @access  Private/Professor,Admin
 */
router.post('/register/student', auth, permissions(['professor', 'admin', 'root']), async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const { error, value } = validateRegistration(req.body, 'student');
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    // التحقق من وجود الرقم الجامعي مسبقاً
    const existingUser = await User.findOne({ universityId: value.universityId });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الجامعي مسجل مسبقاً'
      });
    }
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
    const hashedPassword = await bcrypt.hash(value.password, salt);
    
    // إنشاء المستخدم
    const userData = {
      universityId: value.universityId,
      password: hashedPassword,
      name: value.name,
      email: value.email,
      role: 'student',
      department: value.department,
      semester: value.semester,
      createdBy: req.user.id
    };
    
    const user = new User(userData);
    await user.save();
    
    // تسجيل التنبيه الأمني
    await SecurityAlert.create({
      type: 'user_creation',
      severity: 'low',
      title: 'إنشاء حساب طالب جديد',
      description: `تم إنشاء حساب طالب جديد: ${value.name} (${value.universityId})`,
      user: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        createdUserId: user._id,
        createdUserName: value.name,
        role: 'student',
        department: value.department,
        semester: value.semester
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الطالب بنجاح',
      data: {
        id: user._id,
        universityId: user.universityId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        semester: user.semester,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الطالب'
    });
  }
});

/**
 * @route   POST /api/users/register/professor
 * @desc    تسجيل أستاذ جديد (للإدارة والروت فقط)
 * @access  Private/Admin,Root
 */
router.post('/register/professor', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const { error, value } = validateRegistration(req.body, 'professor');
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    // التحقق من وجود الرقم الجامعي مسبقاً
    const existingUser = await User.findOne({ universityId: value.universityId });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الجامعي مسجل مسبقاً'
      });
    }
    
    // التحقق من وجود البريد الإلكتروني مسبقاً
    if (value.email) {
      const existingEmail = await User.findOne({ email: value.email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل مسبقاً'
        });
      }
    }
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
    const hashedPassword = await bcrypt.hash(value.password, salt);
    
    // إنشاء المستخدم
    const userData = {
      universityId: value.universityId,
      password: hashedPassword,
      name: value.name,
      email: value.email,
      role: 'professor',
      department: value.department,
      createdBy: req.user.id
    };
    
    const user = new User(userData);
    await user.save();
    
    // تسجيل التنبيه الأمني
    await SecurityAlert.create({
      type: 'user_creation',
      severity: 'medium',
      title: 'إنشاء حساب أستاذ جديد',
      description: `تم إنشاء حساب أستاذ جديد: ${value.name} (${value.universityId})`,
      user: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        createdUserId: user._id,
        createdUserName: value.name,
        role: 'professor',
        department: value.department
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'تم تسجيل الأستاذ بنجاح',
      data: {
        id: user._id,
        universityId: user.universityId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering professor:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تسجيل الأستاذ'
    });
  }
});

/**
 * @route   POST /api/users/create-admin
 * @desc    إنشاء حساب إداري جديد (للروت فقط)
 * @access  Private/Root
 */
router.post('/create-admin', auth, permissions(['root']), async (req, res) => {
  try {
    const { universityId, password, name, email, department } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!universityId || !password || !name || !department) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة'
      });
    }
    
    // التحقق من وجود الرقم الجامعي مسبقاً
    const existingUser = await User.findOne({ universityId });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'الرقم الجامعي مسجل مسبقاً'
      });
    }
    
    // التحقق من وجود البريد الإلكتروني مسبقاً
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل مسبقاً'
        });
      }
    }
    
    // تشفير كلمة المرور
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // إنشاء المستخدم
    const userData = {
      universityId,
      password: hashedPassword,
      name,
      email,
      role: 'admin',
      department,
      createdBy: req.user.id
    };
    
    const user = new User(userData);
    await user.save();
    
    // تسجيل التنبيه الأمني
    await SecurityAlert.create({
      type: 'user_creation',
      severity: 'high',
      title: 'إنشاء حساب إداري جديد',
      description: `تم إنشاء حساب إداري جديد: ${name} (${universityId})`,
      user: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        createdUserId: user._id,
        createdUserName: name,
        role: 'admin',
        department
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب الإداري بنجاح',
      data: {
        id: user._id,
        universityId: user.universityId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الحساب الإداري'
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    تحديث الملف الشخصي للمستخدم
 * @access  Private
 */
router.put('/profile', auth, async (req, res) => {
  try {
    // التحقق من صحة البيانات
    const { error, value } = validateUpdateProfile(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة',
        errors: error.details.map(detail => detail.message)
      });
    }
    
    // الحصول على المستخدم الحالي
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // التحقق من البريد الإلكتروني إذا تم تغييره
    if (value.email && value.email !== user.email) {
      const existingEmail = await User.findOne({ 
        email: value.email,
        _id: { $ne: user._id }
      });
      
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مسجل مسبقاً'
        });
      }
    }
    
    // تحديث البيانات
    const updates = {};
    
    if (value.name) updates.name = value.name;
    if (value.email) updates.email = value.email;
    if (value.avatar) updates.avatar = value.avatar;
    
    // تحديث المستخدم
    Object.assign(user, updates);
    await user.save();
    
    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      data: {
        id: user._id,
        universityId: user.universityId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        department: user.department,
        semester: user.semester
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف الشخصي'
    });
  }
});

/**
 * @route   PUT /api/users/change-password
 * @desc    تغيير كلمة مرور المستخدم
 * @access  Private
 */
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية والجديدة مطلوبة'
      });
    }
    
    // الحصول على المستخدم
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // التحقق من كلمة المرور الحالية
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }
    
    // التحقق من أن كلمة المرور الجديدة مختلفة
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية'
      });
    }
    
    // تشفير كلمة المرور الجديدة
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS));
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // تحديث كلمة المرور
    user.password = hashedPassword;
    user.passwordChangedAt = Date.now();
    await user.save();
    
    // تسجيل التنبيه الأمني
    await SecurityAlert.create({
      type: 'password_change',
      severity: 'medium',
      title: 'تغيير كلمة المرور',
      description: 'تم تغيير كلمة مرور المستخدم',
      user: user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير كلمة المرور'
    });
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    تحديث حالة المستخدم (تفعيل/تعطيل) - للإدارة فقط
 * @access  Private/Admin,Root
 */
router.put('/:id/status', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'حالة المستخدم يجب أن تكون true أو false'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // منع تعديل حالة الروت
    if (user.role === 'root') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن تعديل حالة حساب الروت'
      });
    }
    
    // منع الإدارة من تعديل بعضهم البعض
    if (user.role === 'admin' && req.user.role !== 'root') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن تعديل حالة حساب إداري'
      });
    }
    
    user.isActive = isActive;
    await user.save();
    
    // تسجيل التنبيه الأمني
    await SecurityAlert.create({
      type: isActive ? 'account_unlock' : 'account_lockout',
      severity: 'medium',
      title: isActive ? 'تفعيل حساب' : 'تعطيل حساب',
      description: `تم ${isActive ? 'تفعيل' : 'تعطيل'} حساب المستخدم: ${user.name}`,
      user: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        targetUserId: user._id,
        targetUserName: user.name,
        previousStatus: !isActive,
        newStatus: isActive
      }
    });
    
    res.json({
      success: true,
      message: `تم ${isActive ? 'تفعيل' : 'تعطيل'} الحساب بنجاح`,
      data: {
        id: user._id,
        name: user.name,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث حالة المستخدم'
    });
  }
});

/**
 * @route   PUT /api/users/:id/lock
 * @desc    تجميد أو إلغاء تجميد حساب - للإدارة فقط
 * @access  Private/Admin,Root
 */
router.put('/:id/lock', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { unlock } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // منع تعديل حالة الروت
    if (user.role === 'root') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن تعديل حالة حساب الروت'
      });
    }
    
    if (unlock) {
      // إلغاء التجميد
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.isActive = true;
      
      await SecurityAlert.create({
        type: 'account_unlock',
        severity: 'medium',
        title: 'إلغاء تجميد حساب',
        description: `تم إلغاء تجميد حساب المستخدم: ${user.name}`,
        user: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          targetUserId: user._id,
          targetUserName: user.name
        }
      });
    } else {
      // تجميد الحساب
      user.lockedUntil = new Date(Date.now() + parseInt(process.env.ACCOUNT_LOCKOUT_DURATION));
      user.isActive = false;
      
      await SecurityAlert.createAccountLockoutAlert(
        user._id,
        req.ip,
        req.get('User-Agent'),
        'تجميد يدوي من قبل المشرف',
        {
          lockedBy: req.user.id,
          lockedByName: req.user.name,
          duration: process.env.ACCOUNT_LOCKOUT_DURATION
        }
      );
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: unlock ? 'تم إلغاء تجميد الحساب بنجاح' : 'تم تجميد الحساب بنجاح',
      data: {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
        lockedUntil: user.lockedUntil
      }
    });
  } catch (error) {
    console.error('Error locking/unlocking user:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في عملية التجميد/الإلغاء'
    });
  }
});

/**
 * @route   PUT /api/users/:id/role
 * @desc    تغيير صلاحية المستخدم (للروت فقط)
 * @access  Private/Root
 */
router.put('/:id/role', auth, permissions(['root']), async (req, res) => {
  try {
    const { role } = req.body;
    
    // التحقق من الصلاحية المحددة
    const validRoles = ['student', 'professor', 'admin'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'الصلاحية غير صالحة'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // منع تعديل صلاحية الروت
    if (user.role === 'root') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن تعديل صلاحية حساب الروت'
      });
    }
    
    const oldRole = user.role;
    user.role = role;
    
    // إذا تم تغيير الطالب لأستاذ أو إدارة، إزالة السمستر
    if (oldRole === 'student' && (role === 'professor' || role === 'admin')) {
      user.semester = undefined;
    }
    
    // إذا تم تغيير أستاذ أو إدارة لطالب، إضافة السمستر الافتراضي
    if ((oldRole === 'professor' || oldRole === 'admin') && role === 'student') {
      user.semester = 1;
    }
    
    await user.save();
    
    // تسجيل التنبيه الأمني
    await SecurityAlert.create({
      type: 'role_change',
      severity: 'high',
      title: 'تغيير صلاحية مستخدم',
      description: `تم تغيير صلاحية المستخدم ${user.name} من ${oldRole} إلى ${role}`,
      user: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        targetUserId: user._id,
        targetUserName: user.name,
        oldRole,
        newRole: role
      }
    });
    
    res.json({
      success: true,
      message: 'تم تغيير صلاحية المستخدم بنجاح',
      data: {
        id: user._id,
        name: user.name,
        oldRole,
        newRole: role
      }
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير صلاحية المستخدم'
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    حذف مستخدم (للإدارة والروت فقط)
 * @access  Private/Admin,Root
 */
router.delete('/:id', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }
    
    // منع حذف الروت
    if (user.role === 'root') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن حذف حساب الروت'
      });
    }
    
    // منع الإدارة من حذف بعضهم البعض
    if (user.role === 'admin' && req.user.role !== 'root') {
      return res.status(403).json({
        success: false,
        message: 'لا يمكن حذف حساب إداري'
      });
    }
    
    // تسجيل التنبيه قبل الحذف
    await SecurityAlert.create({
      type: 'user_deletion',
      severity: 'high',
      title: 'حذف حساب مستخدم',
      description: `تم حذف حساب المستخدم: ${user.name} (${user.universityId})`,
      user: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        deletedUserId: user._id,
        deletedUserName: user.name,
        deletedUserRole: user.role,
        deletedUserDepartment: user.department
      }
    });
    
    // حذف المستخدم
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'تم حذف المستخدم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المستخدم'
    });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    الحصول على إحصائيات المستخدمين (للروت فقط)
 * @access  Private/Root
 */
router.get('/stats/overview', auth, permissions(['root']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          students: { $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] } },
          professors: { $sum: { $cond: [{ $eq: ['$role', 'professor'] }, 1, 0] } },
          admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
          guests: { $sum: { $cond: [{ $eq: ['$role', 'guest'] }, 1, 0] } },
          // حساب المستخدمين حسب التخصص
          electrical: { $sum: { $cond: [{ $eq: ['$department', 'electrical'] }, 1, 0] } },
          chemical: { $sum: { $cond: [{ $eq: ['$department', 'chemical'] }, 1, 0] } },
          civil: { $sum: { $cond: [{ $eq: ['$department', 'civil'] }, 1, 0] } },
          mechanical: { $sum: { $cond: [{ $eq: ['$department', 'mechanical'] }, 1, 0] } },
          medical: { $sum: { $cond: [{ $eq: ['$department', 'medical'] }, 1, 0] } }
        }
      }
    ]);
    
    // الحصول على آخر المستخدمين المسجلين
    const recentUsers = await User.find({ role: { $ne: 'guest' } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('universityId name role department createdAt lastLogin');
    
    // الحصول على المستخدمين النشطين حالياً (سجلوا دخول في آخر ساعة)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeNow = await User.countDocuments({
      lastLogin: { $gte: oneHourAgo },
      isActive: true
    });
    
    const result = stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      students: 0,
      professors: 0,
      admins: 0,
      guests: 0,
      electrical: 0,
      chemical: 0,
      civil: 0,
      mechanical: 0,
      medical: 0
    };
    
    res.json({
      success: true,
      data: {
        ...result,
        activeNow,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات المستخدمين'
    });
  }
});

/**
 * @route   GET /api/users/stats/activity
 * @desc    الحصول على إحصائيات نشاط المستخدمين (للروت فقط)
 * @access  Private/Root
 */
router.get('/stats/activity', auth, permissions(['root']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // نشاط تسجيل الدخول حسب اليوم
    const loginActivity = await User.aggregate([
      {
        $match: {
          lastLogin: { $gte: startDate }
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
    
    // تسجيلات جديدة حسب اليوم
    const newRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
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
    
    // المستخدمين حسب التخصص
    const usersByDepartment = await User.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // المستخدمين حسب السمستر (للطلاب فقط)
    const studentsBySemester = await User.aggregate([
      {
        $match: { role: 'student' }
      },
      {
        $group: {
          _id: '$semester',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        loginActivity,
        newRegistrations,
        usersByDepartment,
        studentsBySemester
      }
    });
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إحصائيات النشاط'
    });
  }
});

/**
 * @route   GET /api/users/search
 * @desc    البحث في المستخدمين
 * @access  Private/Admin,Root
 */
router.get('/search/quick', auth, permissions(['admin', 'root']), async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'يرجى إدخال كلمة بحث مكونة من حرفين على الأقل'
      });
    }
    
    const users = await User.find({
      $or: [
        { universityId: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      role: { $ne: 'root' } // استبعاد الروت من نتائج البحث
    })
    .limit(parseInt(limit))
    .select('universityId name email role department semester isActive createdAt')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث'
    });
  }
});

module.exports = router;
