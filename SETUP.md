# Mouhamed Academy - Setup Guide

## Prerequisites
- Node.js (v18 or later)
- PostgreSQL (v13 or later)
- npm or yarn

## Setup Instructions

### 1. Database Setup
First, create a PostgreSQL database:
```sql
CREATE DATABASE mouhamed_academy;
```

### 2. Backend Setup

#### Configure Environment Variables
Update the `.env` file in the `backend` directory with your PostgreSQL credentials:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/mouhamed_academy?schema=public"
JWT_SECRET="your-very-secure-jwt-secret-key-at-least-32-characters-long"
CORS_ORIGIN="http://localhost:5174"
```

#### Install Dependencies and Run Migrations
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

#### Create Uploads Directory
```bash
mkdir -p uploads/homeworks
```

#### Seed Database (Optional)
You can seed the database with sample users, courses, and exercises:
1. Install tsx or ts-node globally or use npx
2. Run the seed script
```bash
# Using npx
npx tsx prisma/seed.ts
```

The seed creates:
- Admin user: `admin@mouhamed-academy.tn` / password: `admin123`
- Test student: `student@mouhamed-academy.tn` / password: `student123`
- Sample courses and exercises

#### Start Backend Server
```bash
npm run dev
```

### 3. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Start Frontend Dev Server
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:5000

## Features Implemented

### 🔐 Authentication
- User registration and login with JWT
- Protected routes
- Role-based access control (Student / Admin)
- Persistent login sessions
- Password hashing with bcrypt (12 rounds)

### 📚 Learning Platform
- Course catalog with filters
- Course details page
- Exercise library
- Homework submission system with file upload

### 📊 Admin Dashboard
- User management
- Course and exercise CRUD
- Homework submission review
- Platform statistics

### 🎨 UI/UX
- Modern glass-morphism design
- Complete light and dark mode
- Fully responsive layout
- Smooth animations with Framer Motion
- Professional typography

### 🔒 Security
- Rate limiting (in-memory for development)
- CORS protection
- SQL injection protection via Prisma ORM
- XSS protection headers
- Secure JWT storage

## API Endpoints
### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)

### Courses
- `GET /api/courses` - List all courses (with filters)
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create course (admin only)

### Exercises
- `GET /api/exercises` - List all exercises
- `GET /api/exercises/:id` - Get exercise by ID
- `POST /api/exercises` - Create exercise (admin only)

### Homework
- `POST /api/homework/upload` - Upload homework (protected)
- `GET /api/homework/my-submissions` - Get user's submissions (protected)

### Admin
- `GET /api/admin/stats` - Dashboard statistics (admin only)
- `GET /api/admin/users` - List users (admin only)
- `GET /api/admin/submissions` - Get all submissions (admin only)
- `PUT /api/admin/submissions/:id/review` - Review submission (admin only)

## User Roles
- **STUDENT**: Default role, access to courses, exercises, homework
- **ADMIN**: Full access, including admin dashboard and management
