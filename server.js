const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const path = require('path');
require('dotenv').config();
 
const app = express();

// الحماية
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});

app.use(helmet());
app.use('/api', limiter);
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());

// قاعدة البيانات
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/engineering_library', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// إنشاء حساب الروت
const User = require('./models/User');
const createRootUser = async () => {
  try {
    const rootExists = await User.findOne({ username: 'zero' });
    if (!rootExists) {
      const rootUser = new User({
        username: 'zero',
        password: '975312468qq',
        role: 'root',
        fullName: 'System Administrator'
      });
      await rootUser.save();
      console.log('✅ Root user created');
    }
  } catch (error) {
    console.error('Root user error:', error);
  }
};

// الروت
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/admin', require('./routes/admin'));

// الملفات
app.use('/uploads', express.static('uploads'));

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    message: 'Engineering Library API - Red Sea University',
    version: '1.0.0'
  });
});

// التشغيل
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await createRootUser();
});

module.exports = app;
