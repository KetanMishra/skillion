const express = require('express');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const IdempotencyKey = require('../models/IdempotencyKey');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// POST /api/tickets - Create a new ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    // Validation
    if (!title) {
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: 'title',
          message: 'Title is required'
        }
      });
    }

    if (!description) {
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: 'description',
          message: 'Description is required'
        }
      });
    }

    // Check idempotency key if provided
    if (idempotencyKey) {
      const existingKey = await IdempotencyKey.findOne({
        key: idempotencyKey,
        user_id: req.user._id
      });

      if (existingKey) {
        // Return the cached response
        return res.status(201).json(existingKey.response);
      }
    }

    // Create ticket
    const ticket = new Ticket({
      title,
      description,
      priority: priority || 'medium',
      created_by: req.user._id
    });

    await ticket.save();

    // Populate the created_by field
    await ticket.populate('created_by', 'username email role');

    const response = {
      message: 'Ticket created successfully',
      ticket
    };

    // Store idempotency key if provided
    if (idempotencyKey) {
      const idempotencyRecord = new IdempotencyKey({
        key: idempotencyKey,
        user_id: req.user._id,
        response
      });
      await idempotencyRecord.save();
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Create ticket error:', error);
    
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          field,
          message: error.errors[field].message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// GET /api/tickets - List tickets with pagination and search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const searchQuery = req.query.q;

    // Build search filter
    let filter = {};
    
    if (searchQuery) {
      // Search in title, description, and latest comment
      const commentTicketIds = await Comment.find({
        text: { $regex: searchQuery, $options: 'i' }
      }).distinct('ticket_id');

      filter = {
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { _id: { $in: commentTicketIds } }
        ]
      };
    }

    // For regular users, only show their own tickets
    if (req.user.role === 'user') {
      filter.created_by = req.user._id;
    }

    // Get tickets with pagination
    const tickets = await Ticket.find(filter)
      .populate('created_by', 'username email role')
      .populate('assigned_to', 'username email role')
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit + 1); // Get one extra to check if there are more

    const hasMore = tickets.length > limit;
    const items = hasMore ? tickets.slice(0, limit) : tickets;
    const next_offset = hasMore ? offset + limit : null;

    res.json({
      items,
      next_offset,
      total_returned: items.length
    });
  } catch (error) {
    console.error('List tickets error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// GET /api/tickets/:id - Get single ticket with comments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const ticketId = req.params.id;

    const ticket = await Ticket.findById(ticketId)
      .populate('created_by', 'username email role')
      .populate('assigned_to', 'username email role');

    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      });
    }

    // Check permissions - users can only view their own tickets
    if (req.user.role === 'user' && ticket.created_by._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only view your own tickets'
        }
      });
    }

    // Get comments for this ticket
    const comments = await Comment.find({ ticket_id: ticketId })
      .populate('user_id', 'username email role')
      .populate('parent_id')
      .sort({ created_at: 1 });

    res.json({
      ticket,
      comments
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

// PATCH /api/tickets/:id - Update ticket (agents/admins only)
router.patch('/:id', authenticateToken, requireRole('agent', 'admin'), async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status, assigned_to, priority, version } = req.body;

    // Find the current ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      });
    }

    // Optimistic locking - check version
    if (version !== undefined && ticket.version !== version) {
      return res.status(409).json({
        error: {
          code: 'VERSION_CONFLICT',
          message: 'Ticket has been modified by another user. Please refresh and try again.',
          current_version: ticket.version
        }
      });
    }

    // Update fields
    const updates = {};
    if (status) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (priority) updates.priority = priority;
    
    // Increment version for optimistic locking
    updates.version = ticket.version + 1;
    updates.updated_at = new Date();

    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      updates,
      { new: true, runValidators: true }
    )
      .populate('created_by', 'username email role')
      .populate('assigned_to', 'username email role');

    res.json({
      message: 'Ticket updated successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    
    if (error.name === 'CastError') {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      });
    }

    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          field,
          message: error.errors[field].message
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

module.exports = router;