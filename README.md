# HelpDesk Mini 🎫

A full-stack mini ticketing system with CRUD APIs, authentication, pagination, idempotency, rate limiting, and role-based access control.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access (user, agent, admin)
- **Ticket Management**: Create, read, update tickets with status tracking
- **Threaded Comments**: Add and view comments on tickets
- **Search & Pagination**: Search tickets by title, description, or comments with pagination
- **SLA Tracking**: 24-hour SLA timer with breach detection
- **Optimistic Locking**: Version-based concurrency control for ticket updates
- **Idempotency**: Idempotency-Key header support for safe retries
- **Rate Limiting**: 60 requests per minute per user
- **Responsive UI**: Clean, modern interface built with React and TailwindCSS

## 🏗️ Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs, helmet, CORS
- **Rate Limiting**: express-rate-limit

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Date Formatting**: date-fns

## 📋 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Error Response Format
All errors follow this consistent format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "field": "fieldName", // optional
    "message": "Human readable error message"
  }
}
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/register
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user" // optional: user, agent, admin (default: user)
}
```

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2023-09-01T12:00:00.000Z"
  }
}
```

### Login User
```http
POST /api/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2023-09-01T12:00:00.000Z"
  }
}
```

---

## 🎫 Ticket Endpoints

All ticket endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Create Ticket
```http
POST /api/tickets
```

**Headers:**
```
Authorization: Bearer <token>
Idempotency-Key: unique-key-123 (optional)
```

**Request Body:**
```json
{
  "title": "Login Issue - Cannot access my account",
  "description": "I've been trying to log into my account but keep getting an error",
  "priority": "high" // optional: low, medium, high, urgent (default: medium)
}
```

**Success Response (201):**
```json
{
  "message": "Ticket created successfully",
  "ticket": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "title": "Login Issue - Cannot access my account",
    "description": "I've been trying to log into my account but keep getting an error",
    "status": "open",
    "priority": "high",
    "created_by": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user"
    },
    "assigned_to": null,
    "version": 1,
    "created_at": "2023-09-01T12:00:00.000Z",
    "updated_at": "2023-09-01T12:00:00.000Z",
    "due_at": "2023-09-02T12:00:00.000Z",
    "is_sla_breached": false
  }
}
```

### List Tickets
```http
GET /api/tickets?limit=10&offset=0&q=search_term
```

**Query Parameters:**
- `limit` (optional): Number of tickets to return (default: 10)
- `offset` (optional): Number of tickets to skip (default: 0)
- `q` (optional): Search query for title, description, or comments

**Success Response (200):**
```json
{
  "items": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
      "title": "Login Issue - Cannot access my account",
      "description": "I've been trying to log into my account...",
      "status": "open",
      "priority": "high",
      "created_by": {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
        "username": "john_doe",
        "role": "user"
      },
      "assigned_to": null,
      "created_at": "2023-09-01T12:00:00.000Z",
      "is_sla_breached": false
    }
  ],
  "next_offset": 10,
  "total_returned": 1
}
```

### Get Single Ticket
```http
GET /api/tickets/:id
```

**Success Response (200):**
```json
{
  "ticket": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "title": "Login Issue - Cannot access my account",
    "description": "I've been trying to log into my account...",
    "status": "open",
    "priority": "high",
    "created_by": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "username": "john_doe",
      "role": "user"
    },
    "assigned_to": null,
    "version": 1,
    "created_at": "2023-09-01T12:00:00.000Z",
    "updated_at": "2023-09-01T12:00:00.000Z",
    "due_at": "2023-09-02T12:00:00.000Z",
    "is_sla_breached": false
  },
  "comments": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j2",
      "ticket_id": "64f8a1b2c3d4e5f6g7h8i9j0",
      "user_id": {
        "_id": "64f8a1b2c3d4e5f6g7h8i9j3",
        "username": "jane_agent",
        "role": "agent"
      },
      "text": "Hi, I can help you with this issue...",
      "parent_id": null,
      "created_at": "2023-09-01T12:30:00.000Z"
    }
  ]
}
```

### Update Ticket (Agents/Admins Only)
```http
PATCH /api/tickets/:id
```

**Request Body:**
```json
{
  "status": "in_progress", // optional: open, in_progress, resolved, closed
  "priority": "medium", // optional: low, medium, high, urgent
  "assigned_to": "64f8a1b2c3d4e5f6g7h8i9j3", // optional: user ID or null
  "version": 1 // required for optimistic locking
}
```

**Success Response (200):**
```json
{
  "message": "Ticket updated successfully",
  "ticket": {
    // Updated ticket object
  }
}
```

**Version Conflict Response (409):**
```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Ticket has been modified by another user. Please refresh and try again.",
    "current_version": 2
  }
}
```

---

## 💬 Comment Endpoints

### Add Comment to Ticket
```http
POST /api/tickets/:ticketId/comments
```

**Request Body:**
```json
{
  "text": "This is a comment on the ticket",
  "parent_id": "64f8a1b2c3d4e5f6g7h8i9j2" // optional: for threaded replies
}
```

**Success Response (201):**
```json
{
  "message": "Comment added successfully",
  "comment": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j4",
    "ticket_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "user_id": {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
      "username": "john_doe",
      "role": "user"
    },
    "text": "This is a comment on the ticket",
    "parent_id": null,
    "created_at": "2023-09-01T13:00:00.000Z"
  }
}
```

---

## 🏥 Health Check

### Health Status
```http
GET /api/health
```

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2023-09-01T12:00:00.000Z",
  "uptime": 3600.123,
  "environment": "development"
}
```

---

## 🔒 Role-Based Access Control

### User Permissions
- **user**: Can create tickets, view their own tickets, comment on their own tickets
- **agent**: All user permissions + can view all tickets, update any ticket, comment on any ticket
- **admin**: All agent permissions + full system access

### Accessing Protected Endpoints
Include the JWT token in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⚡ Rate Limiting

- **Limit**: 60 requests per minute per user
- **Identification**: Authenticated users by user ID, unauthenticated by IP
- **Headers**: Rate limit info included in response headers
- **Exceeded Response (429)**:
```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many requests. Please try again later.",
    "retry_after": 60
  }
}
```

---

## 🔄 Idempotency

For safe retries, include an `Idempotency-Key` header with ticket creation:
```
Idempotency-Key: unique-key-12345
```

- Keys are stored for 1 hour
- Duplicate requests return the cached response
- Only applies to ticket creation endpoint

---

## 🕐 SLA Management

- **SLA Duration**: 24 hours from ticket creation
- **Breach Detection**: Automatic flagging when current time > due_at and status != 'resolved'
- **SLA Field**: `is_sla_breached` virtual field in ticket responses

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB 4.4+
- npm or yarn

### Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/helpdesk-mini
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

Start the server:
```bash
# Development with auto-reload
npm run dev

# Production
npm start

# Seed database with test data
npm run seed
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Access the application at `http://localhost:5173`

---

## 🧪 Test Credentials

After running `npm run seed` in the backend, you can use these test accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **User** | john@example.com | password123 | Regular user account |
| **Agent** | jane@example.com | password123 | Support agent account |
| **Admin** | admin@example.com | password123 | Administrator account |

---

## 📊 Sample Data

The seed script creates:
- **3 users** (one for each role)
- **3 tickets** with different statuses and priorities
- **4 comments** demonstrating threaded conversations

---

## 🛠️ Development Notes

### Optimistic Locking
- Ticket updates use version-based optimistic locking
- Include current `version` in PATCH requests
- 409 response indicates version conflict

### Search Functionality
- Searches across ticket title, description, and comment text
- Case-insensitive regex matching
- Results include tickets with matching comments

### Pagination
- Uses offset-based pagination
- `next_offset` field indicates more results available
- `null` value means no more results

### Error Handling
- Consistent error response format
- Proper HTTP status codes
- Field-specific validation errors

---

## 📝 API Testing Examples

### Using curl

**Register a new user:**
```bash
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "user"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Create a ticket:**
```bash
curl -X POST http://localhost:5000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Idempotency-Key: test-key-123" \
  -d '{
    "title": "Test Ticket",
    "description": "This is a test ticket",
    "priority": "medium"
  }'
```

**List tickets:**
```bash
curl -X GET "http://localhost:5000/api/tickets?limit=5&offset=0&q=test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚀 Deployment

### Backend (Render)
1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables
4. Deploy as web service

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

### Environment Variables
```env
# Backend
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/helpdesk-mini
JWT_SECRET=your-production-jwt-secret-key
FRONTEND_URL=https://your-frontend-domain.vercel.app
NODE_ENV=production

# Frontend
VITE_API_URL=https://your-backend-domain.render.com/api
```

---

## 🧪 Testing

HelpDesk Mini includes a comprehensive test suite covering all functionalities.

### Test Structure
- **Unit Tests**: Models and middleware testing
- **Integration Tests**: API endpoint testing  
- **End-to-End Tests**: Complete workflow testing

### Running Tests

**All Tests:**
```bash
cd backend
npm test
```

**Watch Mode (Development):**
```bash
npm run test:watch
```

**Coverage Report:**
```bash
npm run test:coverage
```

**Custom Test Runner:**
```bash
node run-tests.js
```

### Test Coverage
- **Models**: 100% coverage (User, Ticket, Comment validation)
- **API Routes**: 95+ coverage (Auth, Tickets, Comments endpoints)
- **Middleware**: 100% coverage (Authentication, authorization)
- **Workflows**: Complete E2E testing (Ticket lifecycle, permissions, SLA)

### Test Features Covered
✅ **Authentication & Authorization**
- User registration and login
- JWT token validation
- Role-based access control
- Password hashing and verification

✅ **Ticket Management**
- CRUD operations for all user roles
- Search and filtering functionality
- Pagination with large datasets
- Optimistic locking for concurrent updates
- SLA tracking and deadline calculation

✅ **Comment System**
- Comment creation and retrieval
- Threaded comment support
- Permission-based access control
- Ticket association validation

✅ **Advanced Features**
- Rate limiting enforcement
- Idempotency key handling
- Error handling and validation
- Database relationship integrity

✅ **Complete Workflows**
- Full ticket lifecycle (creation → assignment → resolution → closure)
- User permission enforcement
- Agent workflow management
- Admin system administration

### Test Documentation
Detailed test documentation available in `backend/TESTING.md`

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 📞 Support

For questions or issues, please create an issue in the GitHub repository.