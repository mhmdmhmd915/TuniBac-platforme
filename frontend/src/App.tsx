import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const RegisterEntry = lazy(() => import('./pages/RegisterEntry'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CourseList = lazy(() => import('./pages/CourseList'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const ExerciseList = lazy(() => import('./pages/ExerciseList'))
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail'))
const FAQ = lazy(() => import('./pages/FAQ'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const LearningPath = lazy(() => import('./pages/LearningPath'))
const TeacherWorkspace = lazy(() => import('./pages/TeacherWorkspace'))
const TeacherPublicProfile = lazy(() => import('./pages/TeacherPublicProfile'))
const ContentTreePage = lazy(() => import('./pages/admin/ContentTreePage'))
const ContentItemEditor = lazy(() => import('./pages/admin/ContentItemEditor'))
const TeachersPage = lazy(() => import('./pages/admin/TeachersPage'))
const TeacherAdsPage = lazy(() => import('./pages/admin/TeacherAdsPage'))
const ShopPage = lazy(() => import('./pages/admin/ShopPage'))
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
const PlatformOfferPage = lazy(() => import('./pages/admin/PlatformOfferPage'))
const TeachersList = lazy(() => import('./pages/TeachersList'))
const ShopList = lazy(() => import('./pages/ShopList'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const TipsPage = lazy(() => import('./pages/admin/TipsPage'))
const SessionsList = lazy(() => import('./pages/live-study/SessionsList'))
const StudyRoom = lazy(() => import('./pages/live-study/StudyRoom'))
const AdminLiveStudyPage = lazy(() => import('./pages/admin/AdminLiveStudyPage'))

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
        <ErrorBoundary>
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
              path="/learning-path"
              element={
                <ProtectedRoute>
                  <LearningPath />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute teacherOnly>
                  <TeacherWorkspace />
                </ProtectedRoute>
              }
            />
            <Route path="/teachers/:id" element={<TeacherPublicProfile />} />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute>
                  <TeachersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute>
                  <ShopList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/:id"
              element={
                <ProtectedRoute>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tips"
              element={
                <ProtectedRoute adminOnly>
                  <TipsPage />
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
              path="/live-study"
              element={
                <ProtectedRoute>
                  <SessionsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-study/:sessionId"
              element={
                <ProtectedRoute>
                  <StudyRoom />
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
              path="/admin/content-tree"
              element={
                <ProtectedRoute adminOnly>
                  <ContentTreePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/content-tree/course/:id"
              element={
                <ProtectedRoute adminOnly>
                  <ContentItemEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/content-tree/exercise/:id"
              element={
                <ProtectedRoute adminOnly>
                  <ContentItemEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute adminOnly>
                  <TeachersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teacher-ads"
              element={
                <ProtectedRoute adminOnly>
                  <TeacherAdsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shop"
              element={
                <ProtectedRoute adminOnly>
                  <ShopPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <CourseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises"
              element={
                <ProtectedRoute>
                  <ExerciseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises/:id"
              element={
                <ProtectedRoute>
                  <ExerciseDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/parascolaires" element={<ParascolairesList />} />
            <Route path="/parascolaires/:id" element={<ParascolaireDetail />} />
            <Route
              path="/admin/live-study"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLiveStudyPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default App
