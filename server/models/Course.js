const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    unique: true,
    required: true
  },
  semester: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  department: {
    type: String,
    enum: ['electrical', 'chemical', 'civil', 'mechanical', 'medical'],
    required: true
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: String,
  
  files: [{
    name: String,
    originalName: String,
    type: {
      type: String,
      enum: ['lecture', 'reference', 'exercises', 'exams']
    },
    path: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    downloads: {
      type: Number,
      default: 0
    }
  }],
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Course', courseSchema);
