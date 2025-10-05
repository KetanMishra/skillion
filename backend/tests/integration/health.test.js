const request = require('supertest');
const express = require('express');

// Mock server setup for testing health endpoint
const app = express();
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

describe('Server Health Tests', () => {
  describe('GET /api/health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.environment).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/api/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('should return current environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .get('/api/health');

      expect(response.body.environment).toBe('test');
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    test('should be accessible without authentication', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      // Health endpoint should not require authentication
    });

    test('should return consistent response structure', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(Object.keys(response.body)).toHaveLength(4);
    });
  });
});