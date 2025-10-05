const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Test utilities for HelpDesk Mini application
 */

/**
 * Create a test user with specified role
 * @param {Object} userData - User data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email
 * @param {string} userData.password - Password
 * @param {string} userData.role - User role (user, agent, admin)
 * @returns {Promise<Object>} Created user object
 */
const createTestUser = async (userData = {}) => {
  const defaultUserData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    role: 'user'
  };

  const user = await new User({
    ...defaultUserData,
    ...userData
  }).save();

  return user;
};

/**
 * Generate JWT token for a user
 * @param {string} userId - User ID
 * @param {Object} options - JWT options
 * @returns {string} JWT token
 */
const generateTestToken = (userId, options = {}) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h', ...options }
  );
};

/**
 * Create authenticated test user with token
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Object with user and token
 */
const createAuthenticatedUser = async (userData = {}) => {
  const user = await createTestUser(userData);
  const token = generateTestToken(user._id);
  
  return { user, token };
};

/**
 * Create multiple test users with different roles
 * @returns {Promise<Object>} Object with users and tokens for each role
 */
const createTestUsers = async () => {
  const user = await createAuthenticatedUser({ role: 'user' });
  const agent = await createAuthenticatedUser({ 
    role: 'agent',
    username: `agent_${Date.now()}`,
    email: `agent_${Date.now()}@example.com`
  });
  const admin = await createAuthenticatedUser({ 
    role: 'admin',
    username: `admin_${Date.now()}`,
    email: `admin_${Date.now()}@example.com`
  });

  return { user, agent, admin };
};

/**
 * Mock Express request object
 * @param {Object} options - Request options
 * @param {Object} options.headers - Request headers
 * @param {Object} options.body - Request body
 * @param {Object} options.params - Request params
 * @param {Object} options.query - Request query
 * @param {Object} options.user - Authenticated user
 * @returns {Object} Mock request object
 */
const mockRequest = (options = {}) => {
  const { headers = {}, body = {}, params = {}, query = {}, user = null } = options;
  
  return {
    headers,
    body,
    params,
    query,
    user,
    get: jest.fn((header) => headers[header.toLowerCase()])
  };
};

/**
 * Mock Express response object
 * @returns {Object} Mock response object with chainable methods
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.render = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  
  return res;
};

/**
 * Mock Express next function
 * @returns {Function} Mock next function
 */
const mockNext = jest.fn();

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the specified time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const randomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate test ticket data
 * @param {Object} overrides - Data to override defaults
 * @returns {Object} Ticket data
 */
const generateTicketData = (overrides = {}) => {
  const defaultData = {
    title: `Test Ticket ${randomString(5)}`,
    description: `Test description ${randomString(10)}`,
    priority: 'medium',
    category: 'general',
    status: 'open'
  };

  return { ...defaultData, ...overrides };
};

/**
 * Generate test comment data
 * @param {Object} overrides - Data to override defaults
 * @returns {Object} Comment data
 */
const generateCommentData = (overrides = {}) => {
  const defaultData = {
    content: `Test comment ${randomString(10)}`
  };

  return { ...defaultData, ...overrides };
};

/**
 * Assert error response format
 * @param {Object} response - Response object
 * @param {number} statusCode - Expected status code
 * @param {string} errorCode - Expected error code
 * @param {string} errorMessage - Expected error message (optional)
 */
const assertErrorResponse = (response, statusCode, errorCode, errorMessage) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.error).toBeDefined();
  expect(response.body.error.code).toBe(errorCode);
  
  if (errorMessage) {
    expect(response.body.error.message).toContain(errorMessage);
  }
};

/**
 * Assert success response format
 * @param {Object} response - Response object
 * @param {number} statusCode - Expected status code
 * @param {string} dataKey - Key where data should be found
 */
const assertSuccessResponse = (response, statusCode, dataKey) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  
  if (dataKey) {
    expect(response.body[dataKey]).toBeDefined();
  }
};

/**
 * Clean up test data - remove all test documents
 * @returns {Promise} Promise that resolves when cleanup is complete
 */
const cleanupTestData = async () => {
  const User = require('../models/User');
  const Ticket = require('../models/Ticket');
  const Comment = require('../models/Comment');
  const IdempotencyKey = require('../models/IdempotencyKey');

  await Promise.all([
    User.deleteMany({}),
    Ticket.deleteMany({}),
    Comment.deleteMany({}),
    IdempotencyKey.deleteMany({})
  ]);
};

/**
 * Validate pagination response
 * @param {Object} response - API response
 * @param {number} expectedPage - Expected current page
 * @param {number} expectedLimit - Expected limit per page
 */
const validatePaginationResponse = (response, expectedPage, expectedLimit) => {
  expect(response.body.currentPage).toBe(expectedPage);
  expect(response.body.limit).toBe(expectedLimit);
  expect(response.body.totalPages).toBeDefined();
  expect(response.body.totalCount).toBeDefined();
  expect(typeof response.body.hasNextPage).toBe('boolean');
  expect(typeof response.body.hasPrevPage).toBe('boolean');
};

/**
 * Validate ticket object structure
 * @param {Object} ticket - Ticket object to validate
 * @param {Object} expectedFields - Expected field values
 */
const validateTicketStructure = (ticket, expectedFields = {}) => {
  // Required fields
  expect(ticket._id).toBeDefined();
  expect(ticket.title).toBeDefined();
  expect(ticket.description).toBeDefined();
  expect(ticket.status).toBeDefined();
  expect(ticket.priority).toBeDefined();
  expect(ticket.createdAt).toBeDefined();
  expect(ticket.updatedAt).toBeDefined();
  expect(ticket.userId).toBeDefined();

  // Check expected field values
  Object.keys(expectedFields).forEach(field => {
    expect(ticket[field]).toBe(expectedFields[field]);
  });
};

/**
 * Validate comment object structure
 * @param {Object} comment - Comment object to validate
 * @param {Object} expectedFields - Expected field values
 */
const validateCommentStructure = (comment, expectedFields = {}) => {
  // Required fields
  expect(comment._id).toBeDefined();
  expect(comment.content).toBeDefined();
  expect(comment.userId).toBeDefined();
  expect(comment.ticketId).toBeDefined();
  expect(comment.createdAt).toBeDefined();
  expect(comment.updatedAt).toBeDefined();

  // Check expected field values
  Object.keys(expectedFields).forEach(field => {
    expect(comment[field]).toBe(expectedFields[field]);
  });
};

module.exports = {
  createTestUser,
  generateTestToken,
  createAuthenticatedUser,
  createTestUsers,
  mockRequest,
  mockResponse,
  mockNext,
  wait,
  randomString,
  generateTicketData,
  generateCommentData,
  assertErrorResponse,
  assertSuccessResponse,
  cleanupTestData,
  validatePaginationResponse,
  validateTicketStructure,
  validateCommentStructure
};