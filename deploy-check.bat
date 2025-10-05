@echo off
echo 🚀 HelpDesk Mini Deployment Preparation
echo =======================================
echo.

REM Check if we're in the right directory
if not exist "DEPLOYMENT.md" (
    echo ❌ Please run this script from the project root directory
    pause
    exit /b 1
)

echo 📋 Deployment Checklist:
echo.

REM Backend checks
echo 🔧 Backend Checks:
if exist "backend\.env" (
    echo ✅ Backend .env file exists
    
    REM Check for MongoDB URI
    findstr /C:"MONGODB_URI" backend\.env >nul
    if %errorlevel%==0 (
        echo ✅ MongoDB URI configured
    ) else (
        echo ❌ MongoDB URI missing in backend\.env
    )
    
    REM Check for JWT Secret
    findstr /C:"JWT_SECRET" backend\.env >nul
    if %errorlevel%==0 (
        echo ✅ JWT Secret configured
    ) else (
        echo ❌ JWT Secret missing in backend\.env
    )
) else (
    echo ❌ Backend .env file missing
)

if exist "backend\render.yaml" (
    echo ✅ Render configuration ready
) else (
    echo ❌ Render configuration missing
)

echo.

REM Frontend checks
echo 🌐 Frontend Checks:
if exist "frontend\.env.production" (
    echo ✅ Frontend production config exists
) else (
    echo ❌ Frontend production config missing
)

if exist "frontend\vercel.json" (
    echo ✅ Vercel configuration ready
) else (
    echo ❌ Vercel configuration missing
)

echo.

REM Git checks
echo 📦 Git Repository:
if exist ".git" (
    echo ✅ Git repository initialized
    
    REM Check for uncommitted changes
    git status --porcelain >nul 2>&1
    if %errorlevel%==0 (
        echo ⚠️  Check git status for uncommitted changes
        echo    Run: git add . ^&^& git commit -m "Prepare for deployment"
    )
    
    REM Check if remote is set
    git remote get-url origin >nul 2>&1
    if %errorlevel%==0 (
        echo ✅ Git remote configured
        for /f "tokens=*" %%i in ('git remote get-url origin') do echo    Remote: %%i
    ) else (
        echo ❌ Git remote not configured
        echo    Run: git remote add origin https://github.com/YOUR_USERNAME/helpdesk-mini.git
    )
) else (
    echo ❌ Git repository not initialized
    echo    Run: git init
)

echo.
echo 📝 Next Steps:
echo 1. Push your code to GitHub
echo 2. Deploy backend to Render (see DEPLOYMENT.md)
echo 3. Deploy frontend to Vercel (see DEPLOYMENT.md)
echo 4. Update environment variables with production URLs
echo 5. Test your deployed application
echo.
echo 📖 Full deployment guide: DEPLOYMENT.md
echo.
pause