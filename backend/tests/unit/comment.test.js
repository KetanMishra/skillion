const Comment = require('../../models/Comment');
const Ticket = require('../../models/Ticket');
const User = require('../../models/User');

describe('Comment Model Tests', () => {
  let testUser;
  let testTicket;

  beforeEach(async () => {
    testUser = await new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    }).save();

    testTicket = await new Ticket({
      title: 'Test Ticket',
      description: 'This is a test ticket',
      created_by: testUser._id
    }).save();
  });

  describe('Comment Creation', () => {
    test('should create a valid comment', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'This is a test comment'
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment._id).toBeDefined();
      expect(savedComment.ticket_id).toEqual(testTicket._id);
      expect(savedComment.user_id).toEqual(testUser._id);
      expect(savedComment.text).toBe(commentData.text);
      expect(savedComment.parent_id).toBeNull();
      expect(savedComment.created_at).toBeDefined();
    });

    test('should create a threaded comment with parent', async () => {
      // Create parent comment first
      const parentComment = await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Parent comment'
      }).save();

      const replyData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Reply to parent comment',
        parent_id: parentComment._id
      };

      const reply = new Comment(replyData);
      const savedReply = await reply.save();

      expect(savedReply.parent_id).toEqual(parentComment._id);
      expect(savedReply.text).toBe(replyData.text);
    });

    test('should set default parent_id to null', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'This is a test comment'
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment.parent_id).toBeNull();
    });
  });

  describe('Comment Validation', () => {
    test('should require ticket_id', async () => {
      const commentData = {
        user_id: testUser._id,
        text: 'This is a test comment'
      };

      const comment = new Comment(commentData);
      
      await expect(comment.save()).rejects.toThrow(/ticket_id.*required/i);
    });

    test('should require user_id', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        text: 'This is a test comment'
      };

      const comment = new Comment(commentData);
      
      await expect(comment.save()).rejects.toThrow(/user_id.*required/i);
    });

    test('should require text', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id
      };

      const comment = new Comment(commentData);
      
      await expect(comment.save()).rejects.toThrow(/Comment text is required/i);
    });

    test('should validate text max length', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'x'.repeat(1001) // Too long
      };

      const comment = new Comment(commentData);
      
      await expect(comment.save()).rejects.toThrow(/Comment cannot exceed 1000 characters/i);
    });

    test('should trim text whitespace', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: '  This is a test comment  '
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();

      expect(savedComment.text).toBe('This is a test comment');
    });
  });

  describe('Comment References', () => {
    test('should populate user_id', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'This is a test comment'
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();
      
      const populatedComment = await Comment.findById(savedComment._id).populate('user_id');

      expect(populatedComment.user_id.username).toBe(testUser.username);
      expect(populatedComment.user_id.email).toBe(testUser.email);
    });

    test('should populate ticket_id', async () => {
      const commentData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'This is a test comment'
      };

      const comment = new Comment(commentData);
      const savedComment = await comment.save();
      
      const populatedComment = await Comment.findById(savedComment._id).populate('ticket_id');

      expect(populatedComment.ticket_id.title).toBe(testTicket.title);
    });

    test('should populate parent_id when it exists', async () => {
      // Create parent comment
      const parentComment = await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Parent comment'
      }).save();

      // Create reply
      const replyData = {
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Reply comment',
        parent_id: parentComment._id
      };

      const reply = new Comment(replyData);
      const savedReply = await reply.save();
      
      const populatedReply = await Comment.findById(savedReply._id).populate('parent_id');

      expect(populatedReply.parent_id.text).toBe('Parent comment');
      expect(populatedReply.parent_id._id).toEqual(parentComment._id);
    });
  });

  describe('Comment Queries', () => {
    test('should find comments by ticket_id', async () => {
      // Create multiple comments for the ticket
      await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'First comment'
      }).save();

      await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Second comment'
      }).save();

      const comments = await Comment.find({ ticket_id: testTicket._id });

      expect(comments).toHaveLength(2);
      expect(comments[0].text).toBe('First comment');
      expect(comments[1].text).toBe('Second comment');
    });

    test('should sort comments by created_at in descending order', async () => {
      // Create comments with slight delay
      const comment1 = await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'First comment'
      }).save();

      await new Promise(resolve => setTimeout(resolve, 10));

      const comment2 = await new Comment({
        ticket_id: testTicket._id,
        user_id: testUser._id,
        text: 'Second comment'
      }).save();

      const comments = await Comment.find({ ticket_id: testTicket._id }).sort({ created_at: -1 });

      expect(comments[0]._id).toEqual(comment2._id); // Most recent first
      expect(comments[1]._id).toEqual(comment1._id);
    });
  });
});