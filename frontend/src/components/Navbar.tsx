import { Link } from 'react-router-dom'
import { GraduationCap, Menu, X, Sun, Moon, LogOut, BookOpen, FileText, Settings, Calendar, Megaphone } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'
import { usePlatformSettings } from '../context/PlatformSettingsContext'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const { settings } = usePlatformSettings()
  const platformName = settings.platformName || 'TuniBac'
  const hasStudentAccess = !!user && (user.role === 'ADMIN' || user.status === 'APPROVED')
  const pendingOnly = !!user && user.role !== 'ADMIN' && user.status !== 'APPROVED'

  return (
    <nav className="glass-morphism sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-accent">
          <GraduationCap size={32} />
          <span className="hidden sm:inline">{platformName}</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/courses" className="text-text-light dark:text-text hover:text-accent transition-colors">Courses</Link>
          <Link to="/exercises" className="text-text-light dark:text-text hover:text-accent transition-colors">Exercises</Link>
          <Link to="/parascolaires" className="text-text-light dark:text-text hover:text-accent transition-colors">Parascolaires</Link>
          
          {hasStudentAccess && (
            <>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <Link to="/dashboard" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <BookOpen size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/homework" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <FileText size={18} />
                <span>Homework</span>
              </Link>
              <Link to="/study-planner" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <Calendar size={18} />
                <span>Study Planner</span>
              </Link>
              {user?.role === 'ADMIN' && (
                <>
                  <Link to="/admin" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                    <Settings size={18} />
                    <span>Admin</span>
                  </Link>
                  <Link to="/admin/communications" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                    <Megaphone size={18} />
                    <span>Comms</span>
                  </Link>
                </>
              )}
            </>
          )}
          
          {!user && <div className="h-6 w-px bg-black/10 dark:bg-white/10" />}

          <button 
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-text-muted-light dark:text-text-muted hover:text-accent"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user ? (
            <div className="flex items-center space-x-6">
              {pendingOnly && (
                <Link to="/pending-approval" className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm font-semibold text-yellow-500 transition-colors hover:bg-yellow-500/15">
                  Pending Approval
                </Link>
              )}
              <Link to={hasStudentAccess ? '/dashboard' : '/pending-approval'} className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center font-bold">
                  {user.firstName[0]}
                </div>
                <span className="font-medium text-text-light dark:text-text group-hover:text-accent transition-colors">{user.firstName}</span>
              </Link>
              <button 
                onClick={logout}
                aria-label="Log out"
                className="p-2 hover:bg-red-500/10 text-text-muted-light dark:text-text-muted hover:text-red-500 rounded-xl transition-all"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="bg-accent text-primary px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition-all">
              Login
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center space-x-4 md:hidden">
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 text-text-muted-light dark:text-text-muted"
          >
            {isDark ? <Sun size={24} /> : <Moon size={24} />}
          </button>
          <button
            className="text-text-light dark:text-text"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 w-full bg-primary-light dark:bg-primary border-t border-black/10 dark:border-white/10 p-6 flex flex-col space-y-4"
          >
            <Link to="/courses" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Courses</Link>
            <Link to="/exercises" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Exercises</Link>
            <Link to="/parascolaires" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Parascolaires</Link>
            {hasStudentAccess && (
              <>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Dashboard</Link>
                <Link to="/homework" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Homework</Link>
                <Link to="/study-planner" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Study Planner</Link>
                {user?.role === 'ADMIN' && (
                  <>
                    <Link to="/admin" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Admin Panel</Link>
                    <Link to="/admin/communications" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Communication Center</Link>
                  </>
                )}
              </>
            )}
            {pendingOnly && (
              <Link to="/pending-approval" onClick={() => setIsOpen(false)} className="text-lg text-yellow-500">
                Pending Approval
              </Link>
            )}
            {user ? (
              <button
                onClick={logout}
                className="text-left text-lg text-red-500"
              >
                Logout
              </button>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="bg-accent text-primary px-6 py-3 rounded-xl font-bold text-center">
                Login
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar
