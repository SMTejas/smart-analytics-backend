const mongoose = require('mongoose');

const fileDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['csv', 'xlsx', 'xls']
  },
  fileSize: {
    type: Number,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  columns: {
    type: [{
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      }
    }],
    required: true
  },
  rowCount: {
    type: Number,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  isProcessed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
fileDataSchema.index({ userId: 1, uploadDate: -1 });

module.exports = mongoose.model('FileData', fileDataSchema);
