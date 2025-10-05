const Ticket = require('../../models/Ticket');
const User = require('../../models/User');

describe('Ticket Model Tests', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }).save();
  });

  describe('Ticket Creation', () => {
    test('should create a valid ticket', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'open',
        priority: 'medium',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      expect(savedTicket._id).toBeDefined();
      expect(savedTicket.title).toBe(ticketData.title);
      expect(savedTicket.description).toBe(ticketData.description);
      expect(savedTicket.status).toBe(ticketData.status);
      expect(savedTicket.priority).toBe(ticketData.priority);
      expect(savedTicket.created_by).toEqual(testUser._id);
      expect(savedTicket.version).toBe(1);
      expect(savedTicket.created_at).toBeDefined();
      expect(savedTicket.updated_at).toBeDefined();
      expect(savedTicket.due_at).toBeDefined();
    });

    test('should set default status to open', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      expect(savedTicket.status).toBe('open');
    });

    test('should set default priority to medium', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      expect(savedTicket.priority).toBe('medium');
    });

    test('should set default version to 1', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      expect(savedTicket.version).toBe(1);
    });

    test('should automatically set due_at to 24 hours from creation', async () => {
      const beforeCreate = new Date();
      
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      const afterCreate = new Date();
      const expectedDueDate = new Date(beforeCreate.getTime() + 24 * 60 * 60 * 1000);
      const laterExpectedDueDate = new Date(afterCreate.getTime() + 24 * 60 * 60 * 1000);

      expect(savedTicket.due_at.getTime()).toBeGreaterThanOrEqual(expectedDueDate.getTime());
      expect(savedTicket.due_at.getTime()).toBeLessThanOrEqual(laterExpectedDueDate.getTime());
    });

    test('should update updated_at on save', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();
      const firstUpdateTime = savedTicket.updated_at;

      // Wait a bit and update
      await new Promise(resolve => setTimeout(resolve, 10));
      savedTicket.title = 'Updated Ticket';
      await savedTicket.save();

      expect(savedTicket.updated_at.getTime()).toBeGreaterThan(firstUpdateTime.getTime());
    });
  });

  describe('Ticket Validation', () => {
    test('should require title', async () => {
      const ticketData = {
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow(/title.*required/i);
    });

    test('should require description', async () => {
      const ticketData = {
        title: 'Test Ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow(/description.*required/i);
    });

    test('should require created_by', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket'
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow(/created_by.*required/i);
    });

    test('should validate status enum', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'invalid-status',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow();
    });

    test('should validate priority enum', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        priority: 'invalid-priority',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow();
    });

    test('should validate title max length', async () => {
      const ticketData = {
        title: 'x'.repeat(201), // Too long
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow(/Title cannot exceed 200 characters/i);
    });

    test('should validate description max length', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'x'.repeat(2001), // Too long
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      
      await expect(ticket.save()).rejects.toThrow(/Description cannot exceed 2000 characters/i);
    });
  });

  describe('Ticket Virtual Fields', () => {
    test('should correctly calculate SLA breach status - not breached', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'open',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();

      expect(savedTicket.is_sla_breached).toBe(false);
    });

    test('should correctly calculate SLA breach status - breached', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'open',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();
      
      // Manually set due_at to past after saving (to bypass pre-save hook)
      savedTicket.due_at = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      
      expect(savedTicket.is_sla_breached).toBe(true);
    });

    test('should not be breached if resolved even past due date', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        status: 'resolved',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      // Manually set due_at to past
      ticket.due_at = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const savedTicket = await ticket.save();

      expect(savedTicket.is_sla_breached).toBe(false);
    });
  });

  describe('Ticket References', () => {
    test('should populate created_by user', async () => {
      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();
      
      const populatedTicket = await Ticket.findById(savedTicket._id).populate('created_by');

      expect(populatedTicket.created_by.username).toBe(testUser.username);
      expect(populatedTicket.created_by.email).toBe(testUser.email);
    });

    test('should populate assigned_to user when assigned', async () => {
      const assignedUser = await new User({
        username: 'agent',
        email: 'agent@example.com',
        password: 'password123',
        role: 'agent'
      }).save();

      const ticketData = {
        title: 'Test Ticket',
        description: 'This is a test ticket',
        created_by: testUser._id,
        assigned_to: assignedUser._id
      };

      const ticket = new Ticket(ticketData);
      const savedTicket = await ticket.save();
      
      const populatedTicket = await Ticket.findById(savedTicket._id).populate('assigned_to');

      expect(populatedTicket.assigned_to.username).toBe(assignedUser.username);
      expect(populatedTicket.assigned_to.role).toBe('agent');
    });
  });
});