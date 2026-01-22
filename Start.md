#!/bin/bash

# ============================================
# سكريبت تشغيل مكتبة كلية الهندسة
# ============================================

echo "🚀 تشغيل مكتبة كلية الهندسة..."

# 1. تشغيل MongoDB
echo "🗄️ تشغيل MongoDB..."
sudo systemctl start mongodb 2>/dev/null || echo "⚠️ MongoDB يعمل أو غير مثبت"

# 2. الانتقال لمجلد المشروع
cd /var/www/engineering-library/server

# 3. التحقق من وجود node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 تثبيت مكتبات Node.js..."
    npm install --production
fi

# 4. تشغيل التطبيق مع PM2
echo "⚡ تشغيل Backend..."
pm2 delete engineering-library-api 2>/dev/null || true
pm2 start server.js --name "engineering-library-api" --watch

# 5. حفظ إعدادات PM2
pm2 save 2>/dev/null || true

# 6. عرض المعلومات
echo ""
echo "========================================="
echo "✅ التطبيق يعمل بنجاح!"
echo "========================================="
echo ""
echo "🌐 روابط الوصول:"
echo "   • http://localhost:9000"
echo "   • http://192.168.83.219:9000"
echo "   • http://192.168.111.129:9000"
echo ""
echo "🔑 حساب المدير:"
echo "   مستخدم: zero"
echo "   كلمة مرور: 975312468qq"
echo ""
echo "📊 أوامر التحكم:"
echo "   • السجلات: pm2 logs engineering-library-api"
echo "   • الحالة: pm2 status"
echo "   • إيقاف: pm2 stop engineering-library-api"
echo "   • إعادة تشغيل: pm2 restart engineering-library-api"
echo ""
echo "💾 قاعدة البيانات: mongodb://localhost:27017/engineering_library"
echo "========================================="

# 7. عرض السجلات الأخيرة
echo ""
echo "📋 آخر 5 سجلات:"
pm2 logs engineering-library-api --lines 5 --raw 2>/dev/null | tail -5 || echo "لا توجد سجلات بعد"
