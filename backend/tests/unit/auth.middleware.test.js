const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { authenticateToken, requireRole } = require('../../middleware/auth');

// Mock express request/response objects
const mockRequest = (headers = {}, user = null) => ({
  headers,
  user
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Authentication Middleware Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authenticateToken', () => {
    test('should authenticate valid token', async () => {
      const testUser = await new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }).save();

      const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(testUser._id.toString());
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject request without token', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Access token is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request with invalid token', async () => {
      const req = mockRequest({ authorization: 'Bearer invalid-token' });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request with malformed authorization header', async () => {
      const req = mockRequest({ authorization: 'InvalidFormat' });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_REQUIRED',
          message: 'Access token is required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject token for non-existent user', async () => {
      const fakeUserId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId: fakeUserId }, process.env.JWT_SECRET);
      const req = mockRequest({ authorization: `Bearer ${token}` });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject expired token', async () => {
      const testUser = await new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }).save();

      const expiredToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const req = mockRequest({ authorization: `Bearer ${expiredToken}` });
      const res = mockResponse();

      await authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    test('should allow user with required role', () => {
      const req = mockRequest({}, { role: 'agent' });
      const res = mockResponse();
      const middleware = requireRole('agent');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should allow user with any of multiple required roles', () => {
      const req = mockRequest({}, { role: 'admin' });
      const res = mockResponse();
      const middleware = requireRole('agent', 'admin');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject user without required role', () => {
      const req = mockRequest({}, { role: 'user' });
      const res = mockResponse();
      const middleware = requireRole('agent');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject request without authenticated user', () => {
      const req = mockRequest();
      const res = mockResponse();
      const middleware = requireRole('agent');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should work with different role combinations', () => {
      const testCases = [
        { userRole: 'user', requiredRoles: ['user'], shouldPass: true },
        { userRole: 'agent', requiredRoles: ['agent', 'admin'], shouldPass: true },
        { userRole: 'admin', requiredRoles: ['admin'], shouldPass: true },
        { userRole: 'user', requiredRoles: ['agent', 'admin'], shouldPass: false },
        { userRole: 'agent', requiredRoles: ['admin'], shouldPass: false }
      ];

      testCases.forEach(({ userRole, requiredRoles, shouldPass }) => {
        const req = mockRequest({}, { role: userRole });
        const res = mockResponse();
        const middleware = requireRole(...requiredRoles);
        
        jest.clearAllMocks();
        middleware(req, res, mockNext);

        if (shouldPass) {
          expect(mockNext).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(403);
          expect(mockNext).not.toHaveBeenCalled();
        }
      });
    });
  });
});