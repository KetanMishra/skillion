# HelpDesk Mini - Project Overview

A full-stack mini ticketing system with modern architecture and comprehensive features.

## Project Structure

```
helpdesk-mini/
├── backend/                 # Node.js + Express API
│   ├── models/             # Mongoose data models
│   │   ├── User.js         # User model with auth
│   │   ├── Ticket.js       # Ticket model with SLA
│   │   ├── Comment.js      # Comment model (threaded)
│   │   └── IdempotencyKey.js # Idempotency tracking
│   ├── routes/             # API route handlers
│   │   ├── auth.js         # Authentication routes
│   │   ├── tickets.js      # Ticket CRUD routes
│   │   └── comments.js     # Comment routes
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js         # JWT authentication
│   │   └── rateLimiter.js  # Rate limiting
│   ├── scripts/            # Utility scripts
│   │   └── seed.js         # Database seeding
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment template
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   │   ├── Navbar.jsx  # Navigation component
│   │   │   └── ProtectedRoute.jsx # Route protection
│   │   ├── pages/          # Page components
│   │   │   ├── Login.jsx   # Login page
│   │   │   ├── Register.jsx # Registration page
│   │   │   ├── TicketList.jsx # Ticket listing
│   │   │   ├── NewTicket.jsx # Ticket creation
│   │   │   └── TicketDetail.jsx # Ticket details
│   │   ├── context/        # React context providers
│   │   │   └── AuthContext.jsx # Authentication state
│   │   ├── utils/          # Utility functions
│   │   │   └── api.js      # API client setup
│   │   ├── App.jsx         # Main app component
│   │   └── main.jsx        # React entry point
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.js      # Vite configuration
│   ├── tailwind.config.js  # TailwindCSS config
│   └── .env.example        # Environment template
└── README.md               # Comprehensive documentation
```

## Quick Start

See the main README.md for detailed setup instructions, API documentation, and deployment guidelines.