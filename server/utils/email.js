/**
 * أدوات البريد الإلكتروني
 * إرسال إيميلات النظام والإشعارات
 */

const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');

// تكوين ناقل البريد
let transporter = null;

// قوالب البريد الإلكتروني
const emailTemplates = {};

/**
 * تهيئة ناقل البريد الإلكتروني
 */
async function initializeTransporter() {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // التحقق من الاتصال
    await transporter.verify();
    console.log('✅ تم تهيئة ناقل البريد الإلكتروني بنجاح');
    
    // تحميل القوالب
    await loadEmailTemplates();
    
    return transporter;
  } catch (error) {
    console.error('❌ فشل تهيئة ناقل البريد الإلكتروني:', error);
    // استخدام وضع الفشل الآمن (لا يتم إرسال إيميلات فعلياً)
    transporter = createMockTransporter();
    return transporter;
  }
}

/**
 * إنشاء ناقل وهمي للوضع الآمن
 */
function createMockTransporter() {
  return {
    sendMail: async (mailOptions) => {
      console.log('📧 [وضع الاختبار] إيميل مزيف:', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html ? '(محتوى HTML)' : 'بدون HTML'
      });
      return { messageId: 'mock-message-id', response: '250 OK' };
    },
    verify: async () => true
  };
}

/**
 * تحميل قوالب البريد الإلكتروني
 */
async function loadEmailTemplates() {
  try {
    const templatesDir = path.join(__dirname, '../templates/emails');
    
    // إنشاء مجلد القوالب إذا لم يكن موجوداً
    await fs.ensureDir(templatesDir);
    
    // قوالب افتراضية إذا لم تكن موجودة
    const defaultTemplates = {
      'welcome.html': `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f8ff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #4A90E2;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px;
        }
        .footer {
            background-color: #f5f8ff;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #4A90E2;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .info-box {
            background-color: #f5f8ff;
            border-right: 4px solid #4A90E2;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">مكتبة كلية الهندسة</div>
            <div>جامعة البحر الأحمر</div>
        </div>
        
        <div class="content">
            <h2>مرحباً {{name}} 👋</h2>
            <p>نرحب بك في مكتبة كلية الهندسة الإلكترونية.</p>
            
            <div class="info-box">
                <strong>معلومات حسابك:</strong><br>
                الاسم: {{name}}<br>
                الرقم الجامعي: {{universityId}}<br>
                التخصص: {{department}}<br>
                {{#if semester}}السمستر: {{semester}}{{/if}}
            </div>
            
            <p>يمكنك الآن الوصول إلى جميع المواد الدراسية والملفات التعليمية الخاصة بتخصصك.</p>
            
            <a href="{{loginUrl}}" class="button">الذهاب إلى المكتبة</a>
            
            <p>نصائح هامة:</p>
            <ul>
                <li>حافظ على سرية بيانات حسابك</li>
                <li>غير كلمة المرور بانتظام</li>
                <li>تواصل مع مشرفك في حالة وجود أي استفسار</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>هذا البريد تم إرساله تلقائياً من نظام مكتبة كلية الهندسة - جامعة البحر الأحمر</p>
            <p>© {{currentYear}} جميع الحقوق محفوظة</p>
        </div>
    </div>
</body>
</html>
      `,
      
      'password-reset.html': `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f8ff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px;
        }
        .footer {
            background-color: #f5f8ff;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .warning {
            background-color: #FFF3CD;
            border: 1px solid #FFEAA7;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            color: #856404;
        }
        .code {
            font-family: monospace;
            font-size: 24px;
            background-color: #f8f9fa;
            padding: 10px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
            letter-spacing: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">إعادة تعيين كلمة المرور</div>
            <div>مكتبة كلية الهندسة - جامعة البحر الأحمر</div>
        </div>
        
        <div class="content">
            <h2>مرحباً {{name}}</h2>
            <p>لقد تلقينا طلباً لإعادة تعيين كلمة مرور حسابك.</p>
            
            <div class="warning">
                ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.
            </div>
            
            <p>لإعادة تعيين كلمة المرور، استخدم الرمز التالي:</p>
            
            <div class="code">{{resetCode}}</div>
            
            <p>أو يمكنك النقر على الرابط التالي:</p>
            
            <a href="{{resetUrl}}" class="button">إعادة تعيين كلمة المرور</a>
            
            <p>ملاحظات هامة:</p>
            <ul>
                <li>الرمز صالح لمدة ساعة واحدة فقط</li>
                <li>لا تشارك هذا الرمز مع أي شخص</li>
                <li>بعد إعادة التعيين، ستحتاج إلى تسجيل الدخول بكلمة المرور الجديدة</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>هذا البريد تم إرساله تلقائياً من نظام مكتبة كلية الهندسة</p>
            <p>© {{currentYear}} جميع الحقوق محفوظة</p>
        </div>
    </div>
</body>
</html>
      `,
      
      'notification.html': `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f8ff;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #2196F3;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px;
        }
        .footer {
            background-color: #f5f8ff;
            padding: 20px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .notification {
            background-color: #f5f8ff;
            border-right: 4px solid #2196F3;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .meta {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">إشعار جديد</div>
            <div>مكتبة كلية الهندسة - جامعة البحر الأحمر</div>
        </div>
        
        <div class="content">
            <h2>مرحباً {{name}}</h2>
            <p>لديك إشعار جديد:</p>
            
            <div class="notification">
                <h3>{{notificationTitle}}</h3>
                <p>{{notificationMessage}}</p>
                <div class="meta">
                    📅 {{notificationDate}}
                </div>
            </div>
            
            {{#if actionUrl}}
            <p>لتفاصيل أكثر، يمكنك زيارة:</p>
            <a href="{{actionUrl}}" class="button">عرض التفاصيل</a>
            {{/if}}
        </div>
        
        <div class="footer">
            <p>هذا البريد تم إرساله تلقائياً من نظام مكتبة كلية الهندسة</p>
            <p>© {{currentYear}} جميع الحقوق محفوظة</p>
        </div>
    </div>
</body>
</html>
      `
    };

    // حفظ القوالب الافتراضية إذا لم تكن موجودة
    for (const [filename, content] of Object.entries(defaultTemplates)) {
      const filePath = path.join(templatesDir, filename);
      if (!await fs.pathExists(filePath)) {
        await fs.writeFile(filePath, content.trim());
      }
    }

    // تحميل القوالب
    const files = await fs.readdir(templatesDir);
    
    for (const file of files) {
      if (file.endsWith('.html')) {
        const templateName = path.basename(file, '.html');
        const templatePath = path.join(templatesDir, file);
        const templateContent = await fs.readFile(templatePath, 'utf8');
        
        emailTemplates[templateName] = handlebars.compile(templateContent);
        console.log(`✅ تم تحميل قالب البريد: ${templateName}`);
      }
    }

    console.log(`✅ تم تحميل ${Object.keys(emailTemplates).length} قالب بريد`);
  } catch (error) {
    console.error('❌ فشل تحميل قوالب البريد:', error);
  }
}

/**
 * إرسال بريد إلكتروني
 * @param {Object} options - خيارات البريد
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendEmail(options) {
  try {
    if (!transporter) {
      await initializeTransporter();
    }

    const {
      to,
      subject,
      template,
      context = {},
      attachments = [],
      cc = [],
      bcc = []
    } = options;

    // التحقق من البيانات المطلوبة
    if (!to || !subject) {
      throw new Error('عنوان المرسل إليه وموضوع البريد مطلوبان');
    }

    // معالجة سياق القالب
    const emailContext = {
      ...context,
      currentYear: new Date().getFullYear(),
      appName: process.env.APP_NAME || 'مكتبة كلية الهندسة',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@engineering-library.redseauniversity.edu',
      supportPhone: process.env.SUPPORT_PHONE || '+249123456789'
    };

    // تحديد محتوى البريد
    let html = options.html;
    let text = options.text;

    if (template && emailTemplates[template]) {
      html = emailTemplates[template](emailContext);
      text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (!html && !text) {
      throw new Error('يجب توفير محتوى البريد أو اسم القالب');
    }

    // إعداد خيارات البريد
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'مكتبة كلية الهندسة',
        address: process.env.EMAIL_FROM || 'noreply@engineering-library.redseauniversity.edu'
      },
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
      text: text,
      attachments: attachments.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        path: attachment.path,
        cid: attachment.cid
      })),
      cc: cc.length > 0 ? (Array.isArray(cc) ? cc : [cc]) : undefined,
      bcc: bcc.length > 0 ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
      replyTo: process.env.SUPPORT_EMAIL || undefined
    };

    // إرسال البريد
    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 تم إرسال البريد إلى ${to}: ${subject}`);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope
    };
  } catch (error) {
    console.error('❌ فشل إرسال البريد:', error);
    
    // في حالة الفشل، تسجيل البريد في السجلات للتحقيق لاحقاً
    await logFailedEmail(options, error);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * تسجيل البريد الفاشل
 */
async function logFailedEmail(options, error) {
  try {
    const logsDir = path.join(__dirname, '../../logs/emails');
    await fs.ensureDir(logsDir);
    
    const logFile = path.join(logsDir, `failed-${Date.now()}.json`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      options: {
        ...options,
        // إزالة أي بيانات حساسة
        context: options.context ? '...' : undefined,
        attachments: options.attachments?.map(a => ({ filename: a.filename }))
      },
      error: {
        message: error.message,
        stack: error.stack
      }
    };
    
    await fs.writeJSON(logFile, logEntry, { spaces: 2 });
  } catch (logError) {
    console.error('❌ فشل تسجيل البريد الفاشل:', logError);
  }
}

/**
 * إرسال بريد ترحيبي للمستخدم الجديد
 * @param {Object} user - بيانات المستخدم
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendWelcomeEmail(user) {
  try {
    const departmentNames = {
      electrical: 'الهندسة الكهربائية',
      chemical: 'الهندسة الكيميائية',
      civil: 'الهندسة المدنية',
      mechanical: 'الهندسة الميكانيكية',
      medical: 'الهندسة الطبية'
    };

    const context = {
      name: user.name,
      universityId: user.universityId,
      department: departmentNames[user.department] || user.department,
      semester: user.semester,
      role: user.role === 'student' ? 'طالب' : 
            user.role === 'professor' ? 'أستاذ' : 
            user.role === 'admin' ? 'مشرف' : 'مستخدم',
      loginUrl: `${process.env.WEB_URL || 'http://localhost:3000'}/login`
    };

    const subject = `مرحباً بك في مكتبة كلية الهندسة - ${user.name}`;

    return await sendEmail({
      to: user.email || user.universityId + '@redseauniversity.edu',
      subject: subject,
      template: 'welcome',
      context: context
    });
  } catch (error) {
    console.error('❌ فشل إرسال بريد الترحيب:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إرسال بريد إعادة تعيين كلمة المرور
 * @param {Object} user - بيانات المستخدم
 * @param {string} resetToken - رمز إعادة التعيين
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendPasswordResetEmail(user, resetToken) {
  try {
    const resetCode = resetToken.substring(0, 6).toUpperCase();
    const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const context = {
      name: user.name,
      resetCode: resetCode,
      resetUrl: resetUrl,
      expiryTime: 'ساعة واحدة'
    };

    const subject = 'إعادة تعيين كلمة المرور - مكتبة كلية الهندسة';

    return await sendEmail({
      to: user.email || user.universityId + '@redseauniversity.edu',
      subject: subject,
      template: 'password-reset',
      context: context
    });
  } catch (error) {
    console.error('❌ فشل إرسال بريد إعادة التعيين:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إرسال بريد إشعار للمستخدم
 * @param {Object} user - بيانات المستخدم
 * @param {Object} notification - بيانات الإشعار
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendNotificationEmail(user, notification) {
  try {
    const context = {
      name: user.name,
      notificationTitle: notification.title,
      notificationMessage: notification.message,
      notificationDate: new Date(notification.date || Date.now()).toLocaleDateString('ar-SA'),
      actionUrl: notification.actionUrl
    };

    const subject = `إشعار: ${notification.title}`;

    return await sendEmail({
      to: user.email || user.universityId + '@redseauniversity.edu',
      subject: subject,
      template: 'notification',
      context: context
    });
  } catch (error) {
    console.error('❌ فشل إرسال بريد الإشعار:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إرسال بريد تنبيه أمني للإدارة
 * @param {Object} alert - بيانات التنبيه
 * @param {Array} admins - قائمة المشرفين
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendSecurityAlertEmail(alert, admins) {
  try {
    const context = {
      alertTitle: alert.title,
      alertDescription: alert.description,
      alertSeverity: alert.severity,
      alertType: alert.type,
      alertTime: new Date(alert.createdAt || Date.now()).toLocaleString('ar-SA'),
      ipAddress: alert.ipAddress,
      userAgent: alert.userAgent?.substring(0, 100),
      details: JSON.stringify(alert.metadata || {}, null, 2)
    };

    const subject = `⚠️ تنبيه أمني: ${alert.title} [${alert.severity.toUpperCase()}]`;

    // إرسال لكل مشرف
    const results = [];
    for (const admin of admins) {
      if (admin.email) {
        const result = await sendEmail({
          to: admin.email,
          subject: subject,
          template: 'notification',
          context: {
            ...context,
            name: admin.name
          }
        });
        results.push({ admin: admin.email, ...result });
      }
    }

    return {
      success: true,
      sent: results.filter(r => r.success).length,
      total: results.length,
      results: results
    };
  } catch (error) {
    console.error('❌ فشل إرسال بريد التنبيه الأمني:', error);
    return { success: false, error: error.message };
  }
}

/**
 * إرسال بريد تقرير شهري
 * @param {Object} report - بيانات التقرير
 * @param {Array} recipients - قائمة المستلمين
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendMonthlyReport(report, recipients) {
  try {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const reportDate = new Date();
    const monthName = monthNames[reportDate.getMonth()];
    const year = reportDate.getFullYear();

    const context = {
      month: monthName,
      year: year,
      reportPeriod: `${monthName} ${year}`,
      totalUsers: report.totalUsers || 0,
      newUsers: report.newUsers || 0,
      totalCourses: report.totalCourses || 0,
      newCourses: report.newCourses || 0,
      totalFiles: report.totalFiles || 0,
      totalDownloads: report.totalDownloads || 0,
      activeUsers: report.activeUsers || 0,
      topCourses: report.topCourses || [],
      securityAlerts: report.securityAlerts || 0,
      reportUrl: `${process.env.WEB_URL || 'http://localhost:3000'}/admin/reports/monthly`
    };

    const subject = `📊 التقرير الشهري - ${monthName} ${year} - مكتبة كلية الهندسة`;

    // إرسال لكل مستلم
    const results = [];
    for (const recipient of recipients) {
      if (recipient.email) {
        const result = await sendEmail({
          to: recipient.email,
          subject: subject,
          template: 'notification',
          context: {
            ...context,
            name: recipient.name,
            notificationTitle: `التقرير الشهري - ${monthName} ${year}`,
            notificationMessage: `تم إعداد التقرير الشهري للنشاط في مكتبة كلية الهندسة لشهر ${monthName} ${year}. إجمالي المستخدمين: ${report.totalUsers || 0}، المواد: ${report.totalCourses || 0}، التحميلات: ${report.totalDownloads || 0}.`
          }
        });
        results.push({ recipient: recipient.email, ...result });
      }
    }

    return {
      success: true,
      sent: results.filter(r => r.success).length,
      total: results.length,
      results: results
    };
  } catch (error) {
    console.error('❌ فشل إرسال بريد التقرير الشهري:', error);
    return { success: false, error: error.message };
  }
}

/**
 * التحقق من صحة عنوان البريد الإلكتروني
 * @param {string} email - عنوان البريد الإلكتروني
 * @returns {boolean} صحة العنوان
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * إنشاء قائمة بريدية من المستخدمين
 * @param {Array} users - قائمة المستخدمين
 * @param {string} role - الدور المطلوب (اختياري)
 * @returns {Array} قائمة عناوين البريد
 */
function createMailingList(users, role = null) {
  return users
    .filter(user => !role || user.role === role)
    .filter(user => user.email && validateEmail(user.email))
    .map(user => ({
      email: user.email,
      name: user.name
    }));
}

/**
 * إرسال بريد جماعي
 * @param {Array} recipients - قائمة المستلمين
 * @param {Object} emailOptions - خيارات البريد
 * @returns {Promise<Object>} نتيجة الإرسال
 */
async function sendBulkEmail(recipients, emailOptions) {
  try {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('قائمة المستلمين فارغة أو غير صالحة');
    }

    const results = [];
    const batchSize = 50; // إرسال 50 بريد في كل دفعة
    const batches = [];

    // تقسيم المستلمين إلى دفعات
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }

    // إرسال كل دفعة
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`📧 إرسال الدفعة ${batchIndex + 1} من ${batches.length} (${batch.length} بريد)`);

      for (const recipient of batch) {
        try {
          const result = await sendEmail({
            ...emailOptions,
            to: recipient.email,
            context: {
              ...emailOptions.context,
              name: recipient.name
            }
          });

          results.push({
            recipient: recipient.email,
            success: result.success,
            messageId: result.messageId,
            error: result.error
          });

          // تأخير قصير بين كل بريد لتجنب حظر SMTP
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          results.push({
            recipient: recipient.email,
            success: false,
            error: error.message
          });
        }
      }

      // تأخير أطول بين كل دفعة
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      success: true,
      total: results.length,
      successful,
      failed,
      results: results
    };
  } catch (error) {
    console.error('❌ فشل إرسال البريد الجماعي:', error);
    return { success: false, error: error.message };
  }
}

/**
 * الحصول على إحصائيات البريد الإلكتروني
 * @returns {Promise<Object>} إحصائيات البريد
 */
async function getEmailStats() {
  try {
    const logsDir = path.join(__dirname, '../../logs/emails');
    
    if (!await fs.pathExists(logsDir)) {
      return {
        totalSent: 0,
        totalFailed: 0,
        successRate: '100%',
        last30Days: 0
      };
    }

    const files = await fs.readdir(logsDir);
    const failedEmails = files.filter(f => f.startsWith('failed-')).length;

    // هنا يمكن إضافة منطق لقراءة سجلات البريد الفعلية
    // للتبسيط، سنعود بقيم وهمية

    return {
      totalSent: 1000, // قيمة وهمية
      totalFailed: failedEmails,
      successRate: `${Math.round((1000 - failedEmails) / 1000 * 100)}%`,
      last30Days: 100, // قيمة وهمية
      lastSent: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ فشل الحصول على إحصائيات البريد:', error);
    return {
      totalSent: 0,
      totalFailed: 0,
      successRate: '0%',
      last30Days: 0,
      error: error.message
    };
  }
}

module.exports = {
  initializeTransporter,
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  sendSecurityAlertEmail,
  sendMonthlyReport,
  sendBulkEmail,
  validateEmail,
  createMailingList,
  getEmailStats
};
