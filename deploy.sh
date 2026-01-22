#!/bin/bash

# ============================================
# سكريبت نشر مكتبة كلية الهندسة
# جامعة البحر الأحمر
# ============================================

set -e  # إيقاف عند أول خطأ

echo "========================================="
echo "🚀 بدء نشر مكتبة كلية الهندسة"
echo "========================================="

# الانتقال للمسار المطلوب
cd /var/www

# 1. استنساخ أو تحديث المشروع
if [ -d "engineering-library" ]; then
    echo "📂 تحديث المشروع من GitHub..."
    cd engineering-library
    git pull origin main
else
    echo "📂 استنساخ المشروع من GitHub..."
    git clone http://github.com/engmohammed2502-netizen/engineering-laibrary.git
    cd engineering-library
fi

# 2. تثبيت مكتبات Backend
echo "📦 تثبيت مكتبات Backend..."
cd server
npm install --production
npm audit fix --force

# 3. إنشاء مجلد uploads إذا لم يكن موجوداً
echo "📁 إنشاء مجلدات التحميل..."
mkdir -p uploads/courses
mkdir -p uploads/forum
mkdir -p uploads/courses/electrical
mkdir -p uploads/courses/chemical
mkdir -p uploads/courses/civil
mkdir -p uploads/courses/mechanical
mkdir -p uploads/courses/medical

# منح صلاحيات للمجلدات
chmod -R 755 uploads
chown -R $USER:$USER uploads

# 4. إنشاء ملف .env إذا لم يكن موجوداً
if [ ! -f ".env" ]; then
    echo "⚙️ إنشاء ملف البيئة..."
    cp .env.example .env
    
    # تعديل الإعدادات الأساسية
    sed -i "s/MONGODB_URI=.*/MONGODB_URI=mongodb:\/\/localhost:27017\/engineering_library/" .env
    sed -i "s/PORT=.*/PORT=9000/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -base64 32)/" .env
    sed -i "s/ROOT_PASSWORD=.*/ROOT_PASSWORD=975312468qq/" .env
    
    echo "✅ تم إنشاء ملف .env"
fi

# 5. العودة وتثبيت Frontend
echo "📦 تثبيت مكتبات Frontend..."
cd ../client
npm install
npm audit fix --force

# 6. بناء Frontend
echo "🔨 بناء تطبيق React..."
npm run build

# 7. تشغيل MongoDB
echo "🗄️ تشغيل قاعدة البيانات..."
sudo systemctl start mongodb
sudo systemctl enable mongodb

# انتظار تشغيل MongoDB
sleep 3

# 8. إنشاء قاعدة البيانات والمستخدم
echo "🔧 إعداد قاعدة البيانات..."
mongo --eval "
db = db.getSiblingDB('engineering_library');
db.createUser({
  user: 'engineering',
  pwd: 'library123',
  roles: [{ role: 'readWrite', db: 'engineering_library' }]
});
db.createCollection('users');
db.createCollection('courses');
db.createCollection('files');
db.createCollection('forums');
print('✅ تم إنشاء قاعدة البيانات');
" || echo "⚠️ قاعدة البيانات موجودة مسبقاً"

# 9. تشغيل Backend مع PM2
echo "⚡ تشغيل Backend..."
cd ../server

# إيقاف إذا كان يعمل
pm2 delete engineering-library-api 2>/dev/null || true

# التشغيل
pm2 start server.js --name "engineering-library-api" --watch

# حفظ ليعمل عند إقلاع النظام
pm2 save

# 10. فتح المنفذ في الجدار الناري
echo "🔥 إعداد الجدار الناري..."
sudo ufw allow 9000/tcp comment "Engineering Library" || true
sudo ufw --force enable || true

# 11. إعداد cron job للنسخ الاحتياطي
echo "💾 إعداد النسخ الاحتياطي التلقائي..."
(crontab -l 2>/dev/null | grep -v "engineering-library") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/engineering-library/scripts/backup.sh") | crontab -
(crontab -l 2>/dev/null; echo "@reboot /var/www/engineering-library/start.sh") | crontab -

# 12. اختبار التشغيل
echo "🧪 اختبار التشغيل..."
sleep 2

# اختبار Backend
if curl -s http://localhost:9000/api/health > /dev/null; then
    echo "✅ Backend يعمل بنجاح"
else
    echo "❌ Backend لا يعمل. تحقق من السجلات: pm2 logs engineering-library-api"
    pm2 logs engineering-library-api --lines 20
fi

# 13. عرض معلومات الوصول
echo ""
echo "========================================="
echo "🎉 النشر اكتمل بنجاح!"
echo "========================================="
echo ""
echo "🌐 روابط الوصول:"
echo "   من السيرفر:      http://localhost:9000"
echo "   من الويندوز:     http://192.168.83.219:9000"
echo "   من داخل VMWare:  http://192.168.111.129:9000"
echo ""
echo "🔑 بيانات الدخول:"
echo "   المستخدم: zero"
echo "   كلمة المرور: 975312468qq"
echo ""
echo "📊 إدارة التطبيق:"
echo "   مشاهدة السجلات: pm2 logs engineering-library-api"
echo "   إعادة التشغيل:  pm2 restart engineering-library-api"
echo "   حالة التطبيق:   pm2 status"
echo ""
echo "========================================="

# 14. إنشاء ملف start.sh للتشغيل السريع
cat > /var/www/engineering-library/start.sh << 'EOF'
#!/bin/bash
cd /var/www/engineering-library/server
pm2 start server.js --name "engineering-library-api" --watch
echo "✅ التطبيق يعمل على http://192.168.111.129:9000"
EOF

chmod +x /var/www/engineering-library/start.sh

echo "✅ تم إنشاء سكريبت التشغيل السريع: ./start.sh"
