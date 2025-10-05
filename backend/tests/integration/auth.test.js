const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api', authRoutes);

describe('Authentication API Tests', () => {
  describe('POST /api/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.role).toBe(userData.role);
      expect(response.body.user.password).toBeUndefined();
    });

    test('should set default role to user if not provided', async () => {
      const userData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('user');
    });

    test('should return error for missing username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('username');
      expect(response.body.error.message).toBe('Username is required');
    });

    test('should return error for missing email', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('email');
      expect(response.body.error.message).toBe('Email is required');
    });

    test('should return error for missing password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('password');
      expect(response.body.error.message).toBe('Password is required');
    });

    test('should return error for duplicate email', async () => {
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

      await request(app).post('/api/register').send(userData1);

      const response = await request(app)
        .post('/api/register')
        .send(userData2);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_DUPLICATE');
      expect(response.body.error.field).toBe('email');
    });

    test('should return error for duplicate username', async () => {
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

      await request(app).post('/api/register').send(userData1);

      const response = await request(app)
        .post('/api/register')
        .send(userData2);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_DUPLICATE');
      expect(response.body.error.field).toBe('username');
    });

    test('should return validation error for invalid email format', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return validation error for short password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '12345' // Too short
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toMatch(/Password must be at least 6 characters/i);
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      }).save();
    });

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    test('should return error for missing email', async () => {
      const loginData = {
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('email');
      expect(response.body.error.message).toBe('Email is required');
    });

    test('should return error for missing password', async () => {
      const loginData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('FIELD_REQUIRED');
      expect(response.body.error.field).toBe('password');
      expect(response.body.error.message).toBe('Password is required');
    });

    test('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    test('should return error for wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token on registration', async () => {
      const userData = {
        username: 'tokentest',
        email: 'token@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should generate valid JWT token on login', async () => {
      // First register a user
      await new User({
        username: 'tokentest2',
        email: 'token2@example.com',
        password: 'password123'
      }).save();

      const loginData = {
        email: 'token2@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/login')
        .send(loginData);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });
});