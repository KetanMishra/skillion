const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  due_at: {
    type: Date
  }
});

// Calculate SLA due date (24 hours from creation)
ticketSchema.pre('save', function(next) {
  if (this.isNew) {
    this.due_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  this.updated_at = new Date();
  next();
});

// Virtual field to check if SLA is breached
ticketSchema.virtual('is_sla_breached').get(function() {
  return this.status !== 'resolved' && new Date() > this.due_at;
});

// Ensure virtuals are included in JSON output
ticketSchema.set('toJSON', { virtuals: true });

// Index for search functionality
ticketSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);