const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  ticket_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  parent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
commentSchema.index({ ticket_id: 1, created_at: -1 });
commentSchema.index({ parent_id: 1 });

module.exports = mongoose.model('Comment', commentSchema);