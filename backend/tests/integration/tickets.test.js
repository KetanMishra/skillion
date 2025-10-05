const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const ticketRoutes = require('../../routes/tickets');
const { authenticateToken } = require('../../middleware/auth');
const createRateLimiter = require('../../middleware/rateLimiter');

// Create express app for testing
const app = express();
app.use(express.json());
app.use(createRateLimiter());
app.use(authenticateToken);
app.use('/api/tickets', ticketRoutes);

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '7d' });
};

describe('Ticket API Tests', () => {
  let testUser, testAgent, testAdmin;
  let userToken, agentToken, adminToken;

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
  });

  describe('POST /api/tickets', () => {
    test('should create a ticket successfully', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Ticket created successfully');
      expect(response.body.ticket).toBeDefined();
      expect(response.body.ticket.title).toBe(ticketData.title);
      expect(response.body.ticket.description).toBe(ticketData.description);
      expect(response.body.ticket.priority).toBe(ticketData.priority);
      expect(response.body.ticket.status).toBe('open');
      expect(response.body.ticket.version).toBe(1);
      expect(response.body.ticket.created_by).toBeDefined();
      expect(response.body.ticket.due_at).toBeDefined();
    });

    test('should use default priority if not provided', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData);

      expect(response.status).toBe(201);
      expect(response.body.ticket.priority).toBe('medium');
    });

    test('should require authentication', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket'
      };

      const response = await request(app)
        .post('/api/tickets')
        .send(ticketData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_REQUIRED');
    });

    test('should return error for missing title', async () => {
      const ticketData = {
        description: 'This is a test ticket'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('title');
    });

    test('should return error for missing description', async () => {
      const ticketData = {
        title: 'Test Ticket'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('description');
    });

    test('should handle idempotency key', async () => {
      const ticketData = {
        title: 'Idempotent Ticket',
        description: 'This is an idempotent test ticket'
      };

      const idempotencyKey = 'test-key-123';

      // First request
      const response1 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(ticketData);

      expect(response1.status).toBe(201);

      // Second request with same key should return cached response
      const response2 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(ticketData);

      expect(response2.status).toBe(201);
      expect(response2.body.ticket._id).toBe(response1.body.ticket._id);
    });
  });

  describe('GET /api/tickets', () => {
    beforeEach(async () => {
      // Create test tickets
      await new Ticket({
        title: 'First Ticket',
        description: 'First test ticket',
        priority: 'high',
        created_by: testUser._id
      }).save();

      await new Ticket({
        title: 'Second Ticket',
        description: 'Second test ticket',
        priority: 'low',
        created_by: testUser._id
      }).save();

      await new Ticket({
        title: 'Agent Ticket',
        description: 'Ticket created by agent',
        priority: 'medium',
        created_by: testAgent._id
      }).save();
    });

    test('should list tickets for user (own tickets only)', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2); // User can only see their own tickets
      expect(response.body.items[0].created_by.username).toBe(testUser.username);
      expect(response.body.items[1].created_by.username).toBe(testUser.username);
    });

    test('should list all tickets for agent', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(3); // Agent can see all tickets
    });

    test('should list all tickets for admin', async () => {
      const response = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(3); // Admin can see all tickets
    });

    test('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/tickets?limit=1&offset=0')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.next_offset).toBe(1);
    });

    test('should support search by title', async () => {
      const response = await request(app)
        .get('/api/tickets?q=First')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].title).toBe('First Ticket');
    });

    test('should support search by description', async () => {
      const response = await request(app)
        .get('/api/tickets?q=agent')
        .set('Authorization', `Bearer ${agentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].description).toContain('agent');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/tickets');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tickets/:id', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = await new Ticket({
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      }).save();
    });

    test('should get ticket details with comments', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ticket).toBeDefined();
      expect(response.body.comments).toBeDefined();
      expect(response.body.ticket._id).toBe(testTicket._id.toString());
      expect(response.body.ticket.title).toBe(testTicket.title);
    });

    test('should allow agent to view any ticket', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ticket._id).toBe(testTicket._id.toString());
    });

    test('should not allow user to view other users tickets', async () => {
      const otherUserTicket = await new Ticket({
        title: 'Other User Ticket',
        description: 'Ticket by other user',
        created_by: testAgent._id
      }).save();

      const response = await request(app)
        .get(`/api/tickets/${otherUserTicket._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should return 404 for non-existent ticket', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/tickets/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket._id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/tickets/:id', () => {
    let testTicket;

    beforeEach(async () => {
      testTicket = await new Ticket({
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id,
        version: 1
      }).save();
    });

    test('should allow agent to update ticket', async () => {
      const updateData = {
        status: 'in_progress',
        priority: 'high',
        version: 1
      };

      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Ticket updated successfully');
      expect(response.body.ticket.status).toBe('in_progress');
      expect(response.body.ticket.priority).toBe('high');
      expect(response.body.ticket.version).toBe(2); // Version incremented
    });

    test('should allow admin to update ticket', async () => {
      const updateData = {
        status: 'resolved',
        version: 1
      };

      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.ticket.status).toBe('resolved');
    });

    test('should not allow user to update ticket', async () => {
      const updateData = {
        status: 'resolved',
        version: 1
      };

      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should handle optimistic locking conflict', async () => {
      const updateData = {
        status: 'in_progress',
        version: 999 // Wrong version
      };

      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData);

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('VERSION_CONFLICT');
      expect(response.body.error.current_version).toBe(1);
    });

    test('should update assigned_to field', async () => {
      const updateData = {
        assigned_to: testAgent._id.toString(),
        version: 1
      };

      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.ticket.assigned_to._id).toBe(testAgent._id.toString());
    });

    test('should return 404 for non-existent ticket', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = { status: 'resolved', version: 1 };

      const response = await request(app)
        .patch(`/api/tickets/${fakeId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    test('should require authentication', async () => {
      const updateData = { status: 'resolved', version: 1 };

      const response = await request(app)
        .patch(`/api/tickets/${testTicket._id}`)
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting', async () => {
      const ticketData = {
        title: 'Rate Limited Ticket',
        description: 'Testing rate limits'
      };

      // Make many requests quickly (this test may be flaky depending on timing)
      const requests = [];
      for (let i = 0; i < 65; i++) { // Exceed the 60 request limit
        requests.push(
          request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ ...ticketData, title: `${ticketData.title} ${i}` })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error.code).toBe('RATE_LIMIT');
      }
    }, 10000); // Increase timeout for this test
  });
});