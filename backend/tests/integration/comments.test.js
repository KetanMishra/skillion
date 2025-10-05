const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const Comment = require('../../models/Comment');
const commentRoutes = require('../../routes/comments');
const { authenticateToken } = require('../../middleware/auth');

// Create express app for testing
const app = express();
app.use(express.json());
app.use(authenticateToken);
app.use('/api/tickets', commentRoutes);

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' });
};

describe('Comment API Tests', () => {
  let testUser, testAgent, testAdmin;
  let userToken, agentToken, adminToken;
  let testTicket, agentTicket;

  beforeEach(async () => {
    // Create test users
    testUser = await new User({
      username: 'testuser',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    }).save();

    testAgent = await new User({
      username: 'testagent',
      email: 'agent@example.com',
      password: 'password123',
      role: 'agent'
    }).save();

    testAdmin = await new User({
      username: 'testadmin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    }).save();

    // Generate tokens
    userToken = generateToken(testUser._id);
    agentToken = generateToken(testAgent._id);
    adminToken = generateToken(testAdmin._id);

    // Create test tickets
    testTicket = await new Ticket({
      title: 'User Ticket',
      description: 'Ticket created by user',
      created_by: testUser._id
    }).save();

    agentTicket = await new Ticket({
      title: 'Agent Ticket',
      description: 'Ticket created by agent',
      created_by: testAgent._id
    }).save();
  });

  describe('POST /api/tickets/:ticketId/comments', () => {
    test('should create a comment successfully', async () => {
      const commentData = {
        text: 'This is a test comment'
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.comment).toBeDefined();
      expect(response.body.comment.text).toBe(commentData.text);
      expect(response.body.comment.ticket_id).toBe(testTicket._id.toString());
      expect(response.body.comment.user_id.username).toBe(testUser.username);
      expect(response.body.comment.parent_id).toBeNull();
      expect(response.body.comment.created_at).toBeDefined();
    });

    test('should create a threaded comment (reply)', async () => {
      // First create a parent comment
      const parentComment = await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Parent comment'
      }).save();

      const replyData = {
        text: 'This is a reply',
        parent_id: parentComment._id.toString()
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(replyData);

      expect(response.status).toBe(201);
      expect(response.body.comment.text).toBe(replyData.text);
      expect(response.body.comment.parent_id).toBeDefined();
    });

    test('should allow agent to comment on any ticket', async () => {
      const commentData = {
        text: 'Agent comment on user ticket'
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment.text).toBe(commentData.text);
      expect(response.body.comment.user_id.role).toBe('agent');
    });

    test('should allow admin to comment on any ticket', async () => {
      const commentData = {
        text: 'Admin comment on user ticket'
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment.text).toBe(commentData.text);
      expect(response.body.comment.user_id.role).toBe('admin');
    });

    test('should not allow user to comment on other users tickets', async () => {
      const commentData = {
        text: 'User trying to comment on agent ticket'
      };

      const response = await request(app)
        .post(`/api/tickets/${agentTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(response.body.error.message).toBe('You can only comment on your own tickets');
    });

    test('should return error for missing text', async () => {
      const commentData = {};

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('text');
      expect(response.body.error.message).toBe('Comment text is required');
    });

    test('should return error for non-existent ticket', async () => {
      const fakeTicketId = '507f1f77bcf86cd799439011';
      const commentData = {
        text: 'Comment on non-existent ticket'
      };

      const response = await request(app)
        .post(`/api/tickets/${fakeTicketId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    test('should return error for non-existent parent comment', async () => {
      const fakeParentId = '507f1f77bcf86cd799439011';
      const commentData = {
        text: 'Reply to non-existent comment',
        parent_id: fakeParentId
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PARENT_COMMENT_NOT_FOUND');
    });

    test('should return error for parent comment from different ticket', async () => {
      // Create a comment on a different ticket
      const otherTicket = await new Ticket({
        title: 'Other Ticket',
        description: 'Another ticket',
        created_by: testUser._id
      }).save();

      const parentComment = await new Comment({
        ticket_id: otherTicket._id,
        user_id: testUser._id,
        text: 'Comment on other ticket'
      }).save();

      const commentData = {
        text: 'Trying to reply to comment from different ticket',
        parent_id: parentComment._id.toString()
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_PARENT_COMMENT');
      expect(response.body.error.message).toBe('Parent comment does not belong to this ticket');
    });

    test('should validate comment text length', async () => {
      const commentData = {
        text: 'x'.repeat(1001) // Exceeds 1000 character limit
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toMatch(/Comment cannot exceed 1000 characters/i);
    });

    test('should trim whitespace from comment text', async () => {
      const commentData = {
        text: '  This comment has extra whitespace  '
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(201);
      expect(response.body.comment.text).toBe('This comment has extra whitespace');
    });

    test('should require authentication', async () => {
      const commentData = {
        text: 'Unauthenticated comment'
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .send(commentData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });

    test('should return error for invalid ticket ID format', async () => {
      const commentData = {
        text: 'Comment with invalid ticket ID'
      };

      const response = await request(app)
        .post('/api/tickets/invalid-id/comments')
        .set('Authorization', `Bearer ${userToken}`)
        .send(commentData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('Comment Threading', () => {
    test('should create multi-level threaded comments', async () => {
      // Create parent comment
      const parentComment = await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Parent comment'
      }).save();

      // Create first level reply
      const level1Reply = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          text: 'Level 1 reply',
          parent_id: parentComment._id.toString()
        });

      expect(level1Reply.status).toBe(201);

      // Create second level reply (reply to reply)
      const level2Reply = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${testUser._id}`)
        .send({
          text: 'Level 2 reply',
          parent_id: level1Reply.body.comment._id
        });

      expect(level2Reply.status).toBe(201);
      expect(level2Reply.body.comment.parent_id).toBe(level1Reply.body.comment._id);
    });

    test('should populate parent comment information', async () => {
      // Create parent comment
      const parentComment = await new Comment({
        ticket_id: testTicket._id,
        user_id: testAgent._id,
        text: 'Parent comment from agent'
      }).save();

      const replyData = {
        text: 'Reply to agent comment',
        parent_id: parentComment._id.toString()
      };

      const response = await request(app)
        .post(`/api/tickets/${testTicket._id}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(replyData);

      expect(response.status).toBe(201);
      expect(response.body.comment.parent_id).toBeDefined();
      // Note: The populated parent would be checked in the ticket detail endpoint test
    });
  });

  describe('Comment Permissions', () => {
    test('should show correct user roles in comments', async () => {
      const responses = await Promise.all([
        request(app)
          .post(`/api/tickets/${testTicket._id}/comments`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ text: 'User comment' }),
        
        request(app)
          .post(`/api/tickets/${testTicket._id}/comments`)
          .set('Authorization', `Bearer ${agentToken}`)
          .send({ text: 'Agent comment' }),
        
        request(app)
          .post(`/api/tickets/${testTicket._id}/comments`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ text: 'Admin comment' })
      ]);

      expect(responses[0].body.comment.user_id.role).toBe('user');
      expect(responses[1].body.comment.user_id.role).toBe('agent');
      expect(responses[2].body.comment.user_id.role).toBe('admin');
    });
  });
});