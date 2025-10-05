const express = require('express');
const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// POST /api/tickets/:id/comments - Add comment to ticket
router.post('/:ticketId/comments', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { text, parent_id } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({
        error: {
          code: 'FIELD_REQUIRED',
          field: 'text',
          message: 'Comment text is required'
        }
      });
    }

    // Check if ticket exists
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      });
    }

    // Check permissions - users can only comment on their own tickets
    if (req.user.role === 'user' && ticket.created_by.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You can only comment on your own tickets'
        }
      });
    }

    // If parent_id is provided, verify it exists and belongs to the same ticket
    if (parent_id) {
      const parentComment = await Comment.findById(parent_id);
      if (!parentComment) {
        return res.status(404).json({
          error: {
            code: 'PARENT_COMMENT_NOT_FOUND',
            message: 'Parent comment not found'
          }
        });
      }

      if (parentComment.ticket_id.toString() !== ticketId) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARENT_COMMENT',
            message: 'Parent comment does not belong to this ticket'
          }
        });
      }
    }

    // Create comment
    const comment = new Comment({
      ticket_id: ticketId,
      user_id: req.user._id,
      text,
      parent_id: parent_id || null
    });

    await comment.save();

    // Populate user information
    await comment.populate('user_id', 'username email role');
    await comment.populate('parent_id');

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    
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

// GET /api/tickets/:id/comments - Get comments for a ticket
router.get('/:ticketId/comments', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Check if ticket exists
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found'
        }
      });
    }

    // Get comments for the ticket
    const comments = await Comment.find({ ticket_id: ticketId })
      .populate('author', 'username email role')
      .sort({ created_at: 1 });

    res.json({
      comments: comments.map(comment => ({
        id: comment._id,
        text: comment.text,
        author: comment.author,
        parent_id: comment.parent_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at
      }))
    });

  } catch (error) {
    console.error('Get comments error:', error);
    
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

module.exports = router;