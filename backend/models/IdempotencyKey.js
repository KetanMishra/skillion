const mongoose = require('mongoose');

// Store processed idempotency keys to prevent duplicate operations
const idempotencySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  response: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 3600 // Expire after 1 hour
  }
});

module.exports = mongoose.model('IdempotencyKey', idempotencySchema);