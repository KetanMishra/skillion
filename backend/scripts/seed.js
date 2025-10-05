require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk-mini');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await Comment.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const users = await User.create([
      {
        username: 'john_user',
        email: 'john@example.com',
        password: 'password123',
        role: 'user'
      },
      {
        username: 'jane_agent',
        email: 'jane@example.com',
        password: 'password123',
        role: 'agent'
      },
      {
        username: 'admin_user',
        email: 'admin@mail.com',
        password: 'admin123',
        role: 'admin'
      }
    ]);

    console.log('Created users:', users.map(u => ({ username: u.username, role: u.role })));

    // Create tickets
    const tickets = await Ticket.create([
      {
        title: 'Login Issue - Cannot access my account',
        description: 'I\'ve been trying to log into my account for the past hour but keep getting an "Invalid credentials" error. I\'m sure my password is correct.',
        status: 'open',
        priority: 'high',
        created_by: users[0]._id // john_user
      },
      {
        title: 'Feature Request - Dark mode support',
        description: 'It would be great if the application had a dark mode option. Many users prefer dark themes, especially when working late hours.',
        status: 'in_progress',
        priority: 'medium',
        created_by: users[0]._id, // john_user
        assigned_to: users[1]._id // jane_agent
      },
      {
        title: 'Bug Report - Page loading slowly',
        description: 'The dashboard page takes more than 10 seconds to load. This seems to be a recent issue as it was working fine last week.',
        status: 'resolved',
        priority: 'low',
        created_by: users[0]._id, // john_user
        assigned_to: users[1]._id // jane_agent
      }
    ]);

    console.log('Created tickets:', tickets.map(t => ({ title: t.title, status: t.status })));

    // Create comments
    const comments = await Comment.create([
      {
        ticket_id: tickets[0]._id,
        user_id: users[1]._id, // jane_agent
        text: 'Hi John, I\'ve received your ticket. Can you please try clearing your browser cache and cookies, then attempt to log in again?'
      },
      {
        ticket_id: tickets[0]._id,
        user_id: users[0]._id, // john_user
        text: 'Hi Jane, I tried clearing the cache but still having the same issue. Could it be a server-side problem?'
      },
      {
        ticket_id: tickets[1]._id,
        user_id: users[1]._id, // jane_agent
        text: 'Thanks for this suggestion! Dark mode is indeed a popular request. I\'ve added this to our development roadmap and will update you on progress.'
      },
      {
        ticket_id: tickets[2]._id,
        user_id: users[1]._id, // jane_agent
        text: 'This issue has been resolved. We optimized the database queries and the dashboard should now load much faster. Please let me know if you experience any further issues.'
      }
    ]);

    console.log('Created comments:', comments.length);

    console.log('\n🎉 Seed data created successfully!');
    console.log('\n📧 Test Credentials:');
    console.log('User: john@example.com / password123 (role: user)');
    console.log('Agent: jane@example.com / password123 (role: agent)');
    console.log('Admin: admin@mail.com / admin123 (role: admin)');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seedData();