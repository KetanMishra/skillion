# HelpDesk Mini - Deployment Guide

This guide covers deploying the HelpDesk Mini application to production using Render (backend) and Vercel (frontend).

## 🚀 Backend Deployment (Render)

### Prerequisites
- GitHub account with your code pushed
- MongoDB Atlas database (already configured)
- Render account (free tier available)

### Step 1: Prepare for Deployment

1. **Push your code to GitHub** (if not already done):
```bash
cd C:\Users\digital\Desktop\skillion\helpdesk-mini
git init
git add .
git commit -m "Initial commit - HelpDesk Mini"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/helpdesk-mini.git
git push -u origin main
```

### Step 2: Deploy to Render

1. **Go to [Render.com](https://render.com)** and sign up/login

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository:**
   - Select your `helpdesk-mini` repository
   - Choose the `backend` folder as root directory

4. **Configure the service:**
   - **Name**: `helpdesk-mini-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

5. **Set Environment Variables:**
   Click "Advanced" and add these environment variables:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://noobdanoobda86_db_user:eZ1IoWAtxUx8RwOJ@cluster0.wk0gala.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   JWT_SECRET=your-super-secure-production-jwt-secret-key-here
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

6. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your backend will be available at: `https://helpdesk-mini-backend.onrender.com`

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

1. **Update the API URL for production:**

Create or update `frontend/.env.production`:
```env
VITE_API_URL=https://helpdesk-mini-backend.onrender.com/api
```

2. **Optimize build configuration:**

Update `frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173
  }
})
```

### Step 2: Deploy to Vercel

1. **Go to [Vercel.com](https://vercel.com)** and sign up/login

2. **Import your project:**
   - Click "New Project"
   - Import from GitHub: select your `helpdesk-mini` repository
   - Set **Root Directory** to `frontend`

3. **Configure build settings:**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Set Environment Variables:**
   In project settings, add:
   ```
   VITE_API_URL=https://helpdesk-mini-backend.onrender.com/api
   ```

5. **Deploy:**
   - Click "Deploy"
   - Your frontend will be available at: `https://helpdesk-mini.vercel.app`

### Step 3: Update Backend CORS

After frontend deployment, update your backend environment variable:
```
FRONTEND_URL=https://helpdesk-mini.vercel.app
```

## 🔧 Post-Deployment Setup

### 1. Seed Production Database
Run the seed script on your production backend:
```bash
curl -X POST https://helpdesk-mini-backend.onrender.com/api/seed
```

Or create a manual seed endpoint:

```javascript
// Add to backend/server.js (remove after seeding)
app.post('/api/seed-prod', async (req, res) => {
  try {
    // Run seed script logic here
    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Test Production Deployment

**Backend Health Check:**
```bash
curl https://helpdesk-mini-backend.onrender.com/api/health
```

**Frontend Access:**
Visit `https://helpdesk-mini.vercel.app`

**Test Login:**
Use the seeded credentials:
- Email: `john@example.com`
- Password: `password123`

## 🛡️ Security Checklist

- ✅ JWT_SECRET is secure and different from development
- ✅ MongoDB Atlas has proper network access rules
- ✅ CORS is configured for production frontend URL only
- ✅ Rate limiting is enabled
- ✅ Helmet security headers are active
- ✅ Environment variables are properly set
- ✅ No sensitive data in source code

## 📊 Monitoring

### Render Monitoring
- View logs in Render dashboard
- Set up health check monitoring
- Monitor resource usage

### Vercel Monitoring
- Check deployment status
- Monitor build times
- Review function logs

## 🔄 CI/CD (Optional)

Both Render and Vercel support automatic deployments:
- **Render**: Auto-deploys on git push to main branch
- **Vercel**: Auto-deploys on git push to main branch

## 💡 Production Tips

1. **Database Optimization:**
   - Use MongoDB Atlas connection pooling
   - Set appropriate indexes
   - Monitor query performance

2. **Performance:**
   - Enable gzip compression
   - Use CDN for static assets
   - Implement caching strategies

3. **Monitoring:**
   - Set up error tracking (Sentry)
   - Monitor uptime (UptimeRobot)
   - Track user analytics

4. **Backup:**
   - Configure MongoDB Atlas automated backups
   - Export important configurations

## 🐛 Troubleshooting

### Common Issues:

**Backend Won't Start:**
- Check environment variables are set correctly
- Verify MongoDB URI is accessible
- Check Render logs for detailed errors

**Frontend Can't Connect:**
- Verify API URL is correct
- Check CORS configuration
- Ensure backend is deployed and running

**Database Connection Issues:**
- Verify MongoDB Atlas network access
- Check connection string format
- Ensure user has correct permissions

### Support Resources:
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)

## 🎉 Success!

Once deployed, your HelpDesk Mini application will be:
- **Backend**: `https://helpdesk-mini-backend.onrender.com`
- **Frontend**: `https://helpdesk-mini.vercel.app`
- **Database**: MongoDB Atlas (cloud)

Your application is now live and accessible worldwide! 🌍