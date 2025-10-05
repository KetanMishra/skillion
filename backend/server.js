require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const commentRoutes = require('./routes/comments');
const { authenticateToken } = require('./middleware/auth');
const createRateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration - open for testing
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware - apply after auth to get user ID
const rateLimiter = createRateLimiter();

// Hackathon project info endpoint (must be before /api middleware)
app.get('/.well-known/hackathon.json', (req, res) => {
  res.json({
    problem_statement: 3,
    approach: "Full-stack ticketing system with Node.js/Express backend, React frontend, MongoDB database",
    repo_url: "https://github.com/KetanMishra/skillion.git",
    demo_url: "https://skillion-omega.vercel.app",
    video_url: "",
    tech_stack: ["Node.js", "Express", "MongoDB", "React", "JWT", "Vite"],
    team_members: [
      {
        name: "Developer",
        email: "developer@hackathon.com",
        role: "Full-stack Developer"
      }
    ]
  });
});

// Health check endpoint (no rate limiting) - Updated for hackathon
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Hackathon meta endpoint
app.get('/api/_meta', (req, res) => {
  res.json({
    name: "HelpDesk Mini",
    problem_statement: 3,
    description: "Ticketing system with SLA timers, assignments, threaded comments, and role-based access",
    version: "1.0.0",
    endpoints: [
      "POST /api/tickets",
      "GET /api/tickets",
      "GET /api/tickets/:id", 
      "PATCH /api/tickets/:id",
      "POST /api/tickets/:id/comments",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/health",
      "GET /api/_meta"
    ],
    demo_credentials: {
      admin: { email: "admin@mail.com", password: "admin123" },
      agent: { email: "jane@example.com", password: "password123" },
      user: { email: "john@example.com", password: "password123" }
    },
    features: [
      "SLA deadline tracking",
      "Role-based access control (user, agent, admin)",
      "Optimistic locking for concurrent updates", 
      "Threaded comments",
      "Search functionality",
      "Pagination with offset/limit",
      "Rate limiting (60 req/min/user)",
      "Idempotency key support",
      "JWT authentication"
    ]
  });
});

// Temporary seed endpoint for production setup
app.post('/api/seed-production', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({ error: 'Only available in production' });
    }

    const User = require('./models/User');
    const bcrypt = require('bcryptjs');

    // Clear existing users
    await User.deleteMany({});

    // Create demo users with hackathon credentials
    const users = await User.create([
      {
        username: 'john_user',
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'user'
      },
      {
        username: 'jane_agent',
        email: 'jane@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'agent'
      },
      {
        username: 'admin_user',
        email: 'admin@mail.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin'
      }
    ]);

    res.json({
      message: 'Production database seeded successfully',
      users: users.map(u => ({ email: u.email, role: u.role }))
    });

  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apply authentication middleware for protected routes
app.use('/api', (req, res, next) => {
  // Skip auth for public routes
  if (req.path === '/register' || req.path === '/login' || req.path === '/health' || req.path === '/_meta') {
    return next();
  }
  
  // Apply auth middleware
  authenticateToken(req, res, next);
});

// Apply rate limiting after authentication (so we can use user ID)
app.use('/api', rateLimiter);

// Routes
app.use('/api', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', commentRoutes);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk-mini', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

module.exports = app;