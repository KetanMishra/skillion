# HelpDesk Mini - Test Documentation

This document provides comprehensive information about the test suite for HelpDesk Mini application.

## Test Structure

```
backend/tests/
├── setup.js                    # Test environment setup
├── utils.js                    # Test utilities and helpers
├── unit/                       # Unit tests
│   ├── user.test.js            # User model tests
│   ├── ticket.test.js          # Ticket model tests
│   ├── comment.test.js         # Comment model tests
│   └── auth.middleware.test.js # Authentication middleware tests
├── integration/                # Integration tests
│   ├── auth.test.js           # Authentication API tests
│   ├── tickets.test.js        # Tickets API tests
│   ├── comments.test.js       # Comments API tests
│   └── health.test.js         # Health check tests
└── e2e/                       # End-to-end tests
    └── workflows.test.js      # Complete workflow tests
```

## Test Categories

### 1. Unit Tests
Tests individual components in isolation without external dependencies.

#### User Model Tests (`user.test.js`)
- ✅ User creation with valid data
- ✅ Password hashing on save
- ✅ Password comparison method
- ✅ Input validation (email format, required fields)
- ✅ Unique constraints (username, email)
- ✅ Role validation
- ✅ toJSON method (password exclusion)

#### Ticket Model Tests (`ticket.test.js`)
- ✅ Ticket creation with valid data
- ✅ SLA deadline calculation based on priority
- ✅ Status transitions and timestamps
- ✅ Input validation (title, description, priority)
- ✅ User association and population
- ✅ Version field for optimistic locking
- ✅ Virtual fields (comments, timeToResolve)

#### Comment Model Tests (`comment.test.js`)
- ✅ Comment creation with valid data
- ✅ Ticket and user associations
- ✅ Content validation
- ✅ Cascading deletion when ticket is removed
- ✅ Timestamp tracking

#### Authentication Middleware Tests (`auth.middleware.test.js`)
- ✅ Token validation and user authentication
- ✅ Invalid token handling
- ✅ Missing token handling
- ✅ Expired token handling
- ✅ Role-based access control
- ✅ Permission enforcement

### 2. Integration Tests
Tests API endpoints with real HTTP requests and database interactions.

#### Authentication API Tests (`auth.test.js`)
- ✅ User registration with valid data
- ✅ User login with correct credentials
- ✅ Profile retrieval with valid token
- ✅ Password change functionality
- ✅ Input validation errors
- ✅ Duplicate registration prevention
- ✅ Invalid login attempts

#### Tickets API Tests (`tickets.test.js`)
- ✅ Ticket creation (authenticated users)
- ✅ Ticket retrieval (with pagination)
- ✅ Ticket updates (role-based permissions)
- ✅ Ticket deletion (admin only)
- ✅ Search functionality
- ✅ Filtering by status, priority, category
- ✅ Assignment to agents
- ✅ Idempotency key handling
- ✅ Rate limiting enforcement

#### Comments API Tests (`comments.test.js`)
- ✅ Comment creation on tickets
- ✅ Comment retrieval with pagination
- ✅ Comment updates (author only)
- ✅ Comment deletion (author/admin only)
- ✅ Ticket association validation
- ✅ Permission enforcement

#### Health Check Tests (`health.test.js`)
- ✅ Server health endpoint
- ✅ Database connectivity check
- ✅ Service status reporting

### 3. End-to-End Tests
Tests complete user workflows and business processes.

#### Complete Workflow Tests (`workflows.test.js`)
- ✅ **Complete Ticket Lifecycle**
  - User creates ticket
  - Agent views and assigns ticket
  - Agent adds comments
  - User responds with follow-up
  - Agent resolves ticket
  - User closes ticket

- ✅ **Permission Workflows**
  - Role-based access control
  - User restrictions on ticket assignment
  - Agent permissions for all tickets
  - Admin privileges

- ✅ **Search and Pagination**
  - Multi-page ticket browsing
  - Search functionality across fields
  - Combined filtering options
  - Result sorting

- ✅ **Rate Limiting**
  - Request throttling enforcement
  - Rate limit reset behavior

- ✅ **Idempotency**
  - Duplicate request prevention
  - Consistent response handling

- ✅ **SLA Tracking**
  - Deadline calculation based on priority
  - SLA compliance monitoring

- ✅ **Error Handling**
  - Invalid input handling
  - Resource not found scenarios
  - Unauthorized access attempts

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'models/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Test Setup (`setup.js`)
- MongoDB Memory Server initialization
- Database connection setup
- Global test environment configuration
- Cleanup procedures

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Custom Test Runner
```bash
node run-tests.js
```

### Individual Test Suites
```bash
# Unit tests only
npx jest tests/unit

# Integration tests only
npx jest tests/integration

# E2E tests only
npx jest tests/e2e

# Specific test file
npx jest tests/unit/user.test.js
```

## Test Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| Models | 100% | ✅ Complete |
| Routes | 95% | ✅ Complete |
| Middleware | 100% | ✅ Complete |
| Server | 90% | ✅ Complete |
| **Overall** | **95%** | **✅ Complete** |

## Test Data Management

### Test Utilities (`tests/utils.js`)
Provides helper functions for:
- Creating test users with different roles
- Generating JWT tokens
- Mocking Express req/res objects
- Generating test data
- Asserting response formats
- Cleaning up test data

### Database Management
- Each test suite uses isolated database
- Automatic cleanup after each test
- MongoDB Memory Server for fast testing
- Transaction support for data integrity

## Continuous Integration

### Pre-commit Checks
1. Lint code style
2. Run all unit tests
3. Check test coverage
4. Validate API documentation

### Build Pipeline
1. Install dependencies
2. Run full test suite
3. Generate coverage reports
4. Run security audit
5. Build and deploy (if tests pass)

## Common Test Patterns

### Authentication Testing
```javascript
const { createAuthenticatedUser } = require('../utils');

test('should require authentication', async () => {
  const { user, token } = await createAuthenticatedUser();
  
  const response = await request(app)
    .get('/api/protected-endpoint')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
});
```

### Error Response Testing
```javascript
const { assertErrorResponse } = require('../utils');

test('should handle validation errors', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({ /* invalid data */ });
    
  assertErrorResponse(response, 400, 'VALIDATION_ERROR');
});
```

### Database Testing
```javascript
test('should save to database', async () => {
  const ticket = new Ticket(validTicketData);
  await ticket.save();
  
  const savedTicket = await Ticket.findById(ticket._id);
  expect(savedTicket).toBeTruthy();
  expect(savedTicket.title).toBe(validTicketData.title);
});
```

## Debugging Tests

### Debug Mode
```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Specific test with debugging
node --inspect-brk node_modules/.bin/jest tests/unit/user.test.js --runInBand
```

### Verbose Output
```bash
# Verbose test output
npm test -- --verbose

# Show all test results
npm test -- --verbose --no-coverage
```

### Test Logs
```bash
# Enable debug logs
DEBUG=test npm test

# MongoDB query logs
DEBUG=mongoose npm test
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Data Cleanup**: Always clean up test data to prevent interference
3. **Mocking**: Use mocks for external dependencies (emails, external APIs)
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Arrange-Act-Assert**: Follow the AAA pattern for test structure
6. **Edge Cases**: Test both happy path and error scenarios
7. **Performance**: Keep tests fast by using in-memory database
8. **Coverage**: Aim for high coverage but focus on quality over quantity

## Test Maintenance

### Regular Updates
- Update tests when adding new features
- Refactor tests when code structure changes
- Keep test dependencies up to date
- Review and optimize slow tests

### Test Reviews
- Include tests in code reviews
- Verify test coverage for new code
- Check for test redundancy
- Ensure proper error handling tests

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Check MongoDB Memory Server setup
   - Verify test database cleanup
   - Ensure proper async/await usage

2. **JWT Token Issues**
   - Verify JWT_SECRET in test environment
   - Check token expiration in long tests
   - Ensure proper token format

3. **Rate Limiting in Tests**
   - Use different IP addresses for tests
   - Reset rate limits between test suites
   - Mock rate limiter for unit tests

4. **Timeout Issues**
   - Increase Jest timeout for slow tests
   - Optimize database operations
   - Use proper cleanup procedures

### Getting Help

- Check test logs for detailed error messages
- Use Jest's debugging capabilities
- Verify test environment setup
- Review similar working tests for patterns