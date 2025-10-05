const User = require('../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model Tests', () => {
  describe('User Creation', () => {
    test('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.created_at).toBeDefined();
    });

    test('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const isPasswordHashed = await bcrypt.compare('password123', user.password);
      expect(isPasswordHashed).toBe(true);
    });

    test('should set default role to user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('user');
    });

    test('should validate email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    test('should require unique email', async () => {
      const userData1 = {
        username: 'user1',
        email: 'test@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'user2',
        email: 'test@example.com',
        password: 'password123'
      };

      await new User(userData1).save();
      
      await expect(new User(userData2).save()).rejects.toThrow();
    });

    test('should require unique username', async () => {
      const userData1 = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      };

      const userData2 = {
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password123'
      };

      await new User(userData1).save();
      
      await expect(new User(userData2).save()).rejects.toThrow();
    });

    test('should validate role enum', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'invalid-role'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    test('should compare password correctly', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const isValid = await user.comparePassword('password123');
      const isInvalid = await user.comparePassword('wrongpassword');

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('should exclude password from JSON output', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await user.save();

      const userJSON = user.toJSON();

      expect(userJSON.password).toBeUndefined();
      expect(userJSON.username).toBeDefined();
      expect(userJSON.email).toBeDefined();
    });
  });

  describe('User Validation', () => {
    test('should require username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/username.*required/i);
    });

    test('should require email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/email.*required/i);
    });

    test('should require password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/password.*required/i);
    });

    test('should validate minimum username length', async () => {
      const userData = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/Username must be at least 3 characters/i);
    });

    test('should validate minimum password length', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345' // Too short
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/Password must be at least 6 characters/i);
    });
  });
});