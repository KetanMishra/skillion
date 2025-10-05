const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Ticket = require('../../models/Ticket');
const Comment = require('../../models/Comment');

describe('End-to-End Workflow Tests', () => {
  let userToken, agentToken, adminToken;
  let userId, agentId, adminId;

  beforeAll(async () => {
    // Create users for testing
    const user = await new User({
      username: 'testuser',
      email: 'user@test.com',
      password: 'password123',
      role: 'user'
    }).save();

    const agent = await new User({
      username: 'testagent',
      email: 'agent@test.com',
      password: 'password123',
      role: 'agent'
    }).save();

    const admin = await new User({
      username: 'testadmin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    }).save();

    userId = user._id;
    agentId = agent._id;
    adminId = admin._id;

    // Get authentication tokens
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    userToken = userLogin.body.token;

    const agentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agent@test.com', password: 'password123' });
    agentToken = agentLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;
  });

  describe('Complete Ticket Lifecycle', () => {
    test('should handle complete ticket workflow from creation to closure', async () => {
      // 1. User creates a ticket
      const createResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'E2E Test Ticket',
          description: 'This is a test ticket for E2E testing',
          priority: 'high',
          category: 'technical'
        })
        .expect(201);

      const ticketId = createResponse.body.ticket._id;
      expect(createResponse.body.ticket.status).toBe('open');
      expect(createResponse.body.ticket.assignedTo).toBeNull();

      // 2. Agent views the ticket
      await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      // 3. Agent assigns ticket to themselves
      const assignResponse = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          assignedTo: agentId,
          status: 'in_progress'
        })
        .expect(200);

      expect(assignResponse.body.ticket.assignedTo).toBe(agentId.toString());
      expect(assignResponse.body.ticket.status).toBe('in_progress');

      // 4. Agent adds a comment
      const commentResponse = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          content: 'I am working on this issue. Will update shortly.'
        })
        .expect(201);

      expect(commentResponse.body.comment.content).toContain('working on this issue');

      // 5. User adds a follow-up comment
      await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Thank you! Let me know if you need more information.'
        })
        .expect(201);

      // 6. Agent resolves the ticket
      const resolveResponse = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: 'resolved'
        })
        .expect(200);

      expect(resolveResponse.body.ticket.status).toBe('resolved');
      expect(resolveResponse.body.ticket.resolvedAt).toBeDefined();

      // 7. User closes the ticket
      const closeResponse = await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'closed'
        })
        .expect(200);

      expect(closeResponse.body.ticket.status).toBe('closed');
      expect(closeResponse.body.ticket.closedAt).toBeDefined();

      // 8. Verify complete ticket with comments
      const finalTicket = await request(app)
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(finalTicket.body.ticket.status).toBe('closed');
      expect(finalTicket.body.ticket.comments).toHaveLength(2);
    });
  });

  describe('User Permission Workflows', () => {
    test('should enforce proper role-based access control', async () => {
      // Create ticket as user
      const createResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Permission Test Ticket',
          description: 'Testing permissions',
          priority: 'low'
        })
        .expect(201);

      const ticketId = createResponse.body.ticket._id;

      // User should NOT be able to assign tickets
      await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          assignedTo: agentId
        })
        .expect(403);

      // Agent should be able to assign tickets
      await request(app)
        .put(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          assignedTo: agentId
        })
        .expect(200);

      // User should NOT be able to view other users' tickets
      const otherUserTicket = await new Ticket({
        title: 'Other User Ticket',
        description: 'This belongs to someone else',
        userId: agentId, // Different user
        priority: 'medium'
      }).save();

      await request(app)
        .get(`/api/tickets/${otherUserTicket._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Agent should be able to view all tickets
      await request(app)
        .get(`/api/tickets/${otherUserTicket._id}`)
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);
    });
  });

  describe('Search and Pagination Workflows', () => {
    beforeAll(async () => {
      // Create multiple tickets for testing
      const ticketPromises = [];
      for (let i = 1; i <= 15; i++) {
        ticketPromises.push(
          new Ticket({
            title: `Search Test Ticket ${i}`,
            description: `Description for ticket ${i}`,
            userId: i % 2 === 0 ? userId : agentId,
            priority: i % 3 === 0 ? 'high' : 'medium',
            category: i % 2 === 0 ? 'technical' : 'billing',
            status: i % 4 === 0 ? 'closed' : 'open'
          }).save()
        );
      }
      await Promise.all(ticketPromises);
    });

    test('should handle search and pagination correctly', async () => {
      // Test basic pagination
      const page1 = await request(app)
        .get('/api/tickets?page=1&limit=5')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(page1.body.tickets).toHaveLength(5);
      expect(page1.body.totalPages).toBeGreaterThan(1);
      expect(page1.body.currentPage).toBe(1);

      // Test search functionality
      const searchResults = await request(app)
        .get('/api/tickets?search=Search Test')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      expect(searchResults.body.tickets.length).toBeGreaterThan(0);
      searchResults.body.tickets.forEach(ticket => {
        expect(ticket.title).toContain('Search Test');
      });

      // Test filtering by status
      const openTickets = await request(app)
        .get('/api/tickets?status=open')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      openTickets.body.tickets.forEach(ticket => {
        expect(ticket.status).toBe('open');
      });

      // Test filtering by priority
      const highPriorityTickets = await request(app)
        .get('/api/tickets?priority=high')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      highPriorityTickets.body.tickets.forEach(ticket => {
        expect(ticket.priority).toBe('high');
      });

      // Test combined filters
      const combinedFilter = await request(app)
        .get('/api/tickets?status=open&priority=medium&category=technical')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(200);

      combinedFilter.body.tickets.forEach(ticket => {
        expect(ticket.status).toBe('open');
        expect(ticket.priority).toBe('medium');
        expect(ticket.category).toBe('technical');
      });
    });
  });

  describe('Rate Limiting Workflow', () => {
    test('should enforce rate limiting', async () => {
      // Make requests up to the limit (60 per minute)
      const requests = [];
      for (let i = 0; i < 65; i++) {
        requests.push(
          request(app)
            .get('/api/tickets')
            .set('Authorization', `Bearer ${userToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotency Workflow', () => {
    test('should handle idempotent ticket creation', async () => {
      const idempotencyKey = 'test-idempotency-key-123';
      
      // First request should create ticket
      const firstResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Idempotency Test Ticket',
          description: 'Testing idempotency',
          priority: 'medium'
        })
        .expect(201);

      const ticketId = firstResponse.body.ticket._id;

      // Second request with same idempotency key should return same ticket
      const secondResponse = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          title: 'Different Title', // Different data
          description: 'Different description',
          priority: 'high'
        })
        .expect(200);

      expect(secondResponse.body.ticket._id).toBe(ticketId);
      expect(secondResponse.body.ticket.title).toBe('Idempotency Test Ticket'); // Original data
    });
  });

  describe('SLA Tracking Workflow', () => {
    test('should track SLA compliance correctly', async () => {
      // Create high priority ticket (should have 4 hour SLA)
      const response = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'High Priority SLA Test',
          description: 'Testing SLA tracking',
          priority: 'high'
        })
        .expect(201);

      const ticket = response.body.ticket;
      expect(ticket.slaDeadline).toBeDefined();
      
      // Calculate expected SLA deadline (4 hours for high priority)
      const createdAt = new Date(ticket.createdAt);
      const expectedDeadline = new Date(createdAt.getTime() + (4 * 60 * 60 * 1000));
      
      expect(new Date(ticket.slaDeadline)).toBeInstanceOf(Date);
      // Allow for small time differences in test execution
      expect(Math.abs(new Date(ticket.slaDeadline) - expectedDeadline)).toBeLessThan(1000);
    });
  });

  describe('Error Handling Workflow', () => {
    test('should handle various error scenarios gracefully', async () => {
      // Test invalid ticket ID
      await request(app)
        .get('/api/tickets/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      // Test non-existent ticket
      await request(app)
        .get('/api/tickets/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // Test invalid ticket data
      await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Missing required fields
          description: 'No title provided'
        })
        .expect(400);

      // Test unauthorized access
      await request(app)
        .get('/api/tickets')
        .expect(401); // No token provided
    });
  });
});