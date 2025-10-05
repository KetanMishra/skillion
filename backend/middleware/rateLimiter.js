const rateLimit = require('express-rate-limit');

// Rate limiting: 60 requests per minute per user
const createRateLimiter = () => {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // Limit each user to 60 requests per windowMs
    
    // Use user ID for authenticated requests, IP for unauthenticated
    keyGenerator: (req) => {
      return req.user ? req.user._id.toString() : req.ip;
    },
    
    // Custom error response
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests. Please try again later.',
          retry_after: Math.ceil(req.rateLimit.resetTime / 1000)
        }
      });
    },
    
    // Include rate limit info in response headers
    standardHeaders: true,
    legacyHeaders: false,
    
    // Skip successful requests from counting
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
};

module.exports = createRateLimiter;