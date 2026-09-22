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
const DevoirDetail = lazy(() => import('./pages/DevoirDetail'))
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
const StudySquadDetail = lazy(() => import('./pages/study-squads/Detail'))
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
          <Routes>
            <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            <Route path="/register" element={<Suspense fallback={<PageLoader />}><RegisterEntry /></Suspense>} />
            <Route path="/register/form" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
            <Route path="/pending-approval" element={<Suspense fallback={<PageLoader />}><PendingApproval /></Suspense>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/learning-path"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><LearningPath /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute teacherOnly>
                  <Suspense fallback={<PageLoader />}><TeacherWorkspace /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="/teachers/:id" element={<Suspense fallback={<PageLoader />}><TeacherPublicProfile /></Suspense>} />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><TeachersList /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><ShopList /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/:id"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><ProductDetail /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}><ProgressPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tips"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><TipsPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-planner"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}><StudyPlanner /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-study"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}><SessionsList /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-study/:sessionId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}><StudyRoom /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subjects"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><SubjectsPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/uploads"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><UploadsPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/platform-offer"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><PlatformOfferPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/content-tree"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><ContentTreePage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/content-tree/course/:id"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><ContentItemEditor /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/content-tree/exercise/:id"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><ContentItemEditor /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/content-tree/devoir/:id"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><ContentItemEditor /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teachers"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><TeachersPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/teacher-ads"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><TeacherAdsPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shop"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><ShopPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><CourseList /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><CourseDetail /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><ExerciseList /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exercises/:id"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><ExerciseDetail /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/devoirs/:id"
              element={
                <ProtectedRoute bacTrackOnly>
                  <Suspense fallback={<PageLoader />}><DevoirDetail /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="/faq" element={<Suspense fallback={<PageLoader />}><FAQ /></Suspense>} />
            <Route path="/parascolaires" element={<Suspense fallback={<PageLoader />}><ParascolairesList /></Suspense>} />
            <Route path="/parascolaires/:id" element={<Suspense fallback={<PageLoader />}><ParascolaireDetail /></Suspense>} />
            <Route
              path="/admin/live-study"
              element={
                <ProtectedRoute adminOnly>
                  <Suspense fallback={<PageLoader />}><AdminLiveStudyPage /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-squads/:id"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}><StudySquadDetail /></Suspense>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default App
