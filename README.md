# Mouhamed Academy - Full Stack Tunisian Educational Platform

A modern, premium quality full stack educational platform built for Tunisian students, focusing on Mathematics, Physics, and Science.

## 📚 Tech Stack

### Frontend
- **React 18** (with TypeScript)
- **Vite** for blazing fast development & build
- **Tailwind CSS** for beautiful, responsive styling
- **Framer Motion** for smooth animations
- **React Router DOM** for routing
- **Axios** for HTTP requests
- **Lucide React** for modern icons

### Backend
- **Node.js & Express.js** for a robust REST API
- **PostgreSQL** for relational database
- **Prisma ORM** for database management
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for file uploads

## 🚀 Quick Start

### Prerequisites
1. Install Node.js (LTS recommended)
2. Install PostgreSQL
3. Create a PostgreSQL database named `mouhamed_academy` (or update the .env file if using another name)

### Installation & Setup

**1. Clone the repository**
```bash
git clone <your-repo-url>
cd new
```

**2. Backend Setup**
```bash
cd backend
npm install
```

**Update the .env file** in `backend/.env` with your PostgreSQL credentials.

Then run migrations and start the backend server:
```bash
npx prisma migrate dev
npm run dev
```

**3. Frontend Setup**
```bash
cd ../frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application!

## ✨ Features

- **Modern Landing Page**: Animated, glassmorphism design
- **Student Authentication**: Secure login/registration with JWT
- **Student Dashboard**: Learning overview, statistics, & recent activity
- **Course System**: Browse courses, view videos & PDFs, track progress
- **Exercise System**: Practice problems by subject & difficulty
- **Homework Upload System**: Submit homework files for review
- **Admin Dashboard**: Manage courses, exercises, students
- **Dark Mode**: System-aware or manual toggle
- **Responsive Design**: Mobile, tablet, & desktop optimized
- **Search & Filtering**: Find courses & exercises quickly
- **PDF Viewer**: View learning materials directly in-browser

## 📝 Project Structure

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── routes/
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── exercises.js
│   │   ├── homework.js
│   │   ├── contact.js
│   │   └── users.js
│   ├── controllers/
│   │   └── ...
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── index.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── context/
    │   ├── hooks/
    │   ├── services/
    │   └── App.tsx
    ├── index.html
    └── package.json
```

## 🔐 Environment Variables
Create .env files in both backend and frontend directories if needed!

### Backend .env Example
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mouhamed_academy?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
PORT=5000
```

## 📧 Contact
For inquiries, reach out to [support@mouhamed-academy.tn](mailto:support@mouhamed-academy.tn)
