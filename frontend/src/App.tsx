import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const RegisterEntry = lazy(() => import('./pages/RegisterEntry'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CourseList = lazy(() => import('./pages/CourseList'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const ExerciseList = lazy(() => import('./pages/ExerciseList'))
const FAQ = lazy(() => import('./pages/FAQ'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Homework = lazy(() => import('./pages/Homework'))
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'))
const ParascolairesList = lazy(() => import('./pages/ParascolairesList'))
const ParascolaireDetail = lazy(() => import('./pages/ParascolaireDetail'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const SubjectsPage = lazy(() =>
  import('./pages/admin/SubjectsPage').then((module) => ({ default: module.SubjectsPage }))
)
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const UploadsPage = lazy(() => import('./pages/admin/UploadsPage'))
const CommunicationsPage = lazy(() => import('./pages/admin/CommunicationsPage'))
const PlatformOfferPage = lazy(() => import('./pages/admin/PlatformOfferPage'))

const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
    Loading...
  </div>
)

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background text-text-light dark:text-text">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterEntry />} />
            <Route path="/register/form" element={<Register />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/homework"
              element={
                <ProtectedRoute>
                  <Homework />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-planner"
              element={
                <ProtectedRoute>
                  <StudyPlanner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects"
              element={
                <ProtectedRoute adminOnly>
                  <SubjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute adminOnly>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/uploads"
              element={
                <ProtectedRoute adminOnly>
                  <UploadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/platform-offer"
              element={
                <ProtectedRoute adminOnly>
                  <PlatformOfferPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/communications"
              element={
                <ProtectedRoute adminOnly>
                  <CommunicationsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/courses" element={<CourseList />} />
            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/exercises" element={<ExerciseList />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/parascolaires" element={<ParascolairesList />} />
            <Route path="/parascolaires/:id" element={<ParascolaireDetail />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

export default App
