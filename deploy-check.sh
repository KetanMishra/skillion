#!/bin/bash

# HelpDesk Mini Deployment Script
# This script helps prepare your project for deployment

echo "🚀 HelpDesk Mini Deployment Preparation"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "DEPLOYMENT.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

echo "📋 Deployment Checklist:"
echo ""

# Backend checks
echo "🔧 Backend Checks:"
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file exists"
    
    # Check for required environment variables
    if grep -q "MONGODB_URI" backend/.env; then
        echo "✅ MongoDB URI configured"
    else
        echo "❌ MongoDB URI missing in backend/.env"
    fi
    
    if grep -q "JWT_SECRET" backend/.env; then
        echo "✅ JWT Secret configured"
    else
        echo "❌ JWT Secret missing in backend/.env"
    fi
else
    echo "❌ Backend .env file missing"
fi

if [ -f "backend/render.yaml" ]; then
    echo "✅ Render configuration ready"
else
    echo "❌ Render configuration missing"
fi

echo ""

# Frontend checks
echo "🌐 Frontend Checks:"
if [ -f "frontend/.env.production" ]; then
    echo "✅ Frontend production config exists"
else
    echo "❌ Frontend production config missing"
fi

if [ -f "frontend/vercel.json" ]; then
    echo "✅ Vercel configuration ready"
else
    echo "❌ Vercel configuration missing"
fi

echo ""

# Git checks
echo "📦 Git Repository:"
if [ -d ".git" ]; then
    echo "✅ Git repository initialized"
    
    # Check if there are uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️  Uncommitted changes detected"
        echo "   Run: git add . && git commit -m 'Prepare for deployment'"
    else
        echo "✅ No uncommitted changes"
    fi
    
    # Check if remote is set
    if git remote get-url origin >/dev/null 2>&1; then
        echo "✅ Git remote configured"
        echo "   Remote: $(git remote get-url origin)"
    else
        echo "❌ Git remote not configured"
        echo "   Run: git remote add origin https://github.com/YOUR_USERNAME/helpdesk-mini.git"
    fi
else
    echo "❌ Git repository not initialized"
    echo "   Run: git init"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Push your code to GitHub"
echo "2. Deploy backend to Render (see DEPLOYMENT.md)"
echo "3. Deploy frontend to Vercel (see DEPLOYMENT.md)"
echo "4. Update environment variables with production URLs"
echo "5. Test your deployed application"
echo ""
echo "📖 Full deployment guide: DEPLOYMENT.md"