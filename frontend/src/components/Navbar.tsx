import { Link } from 'react-router-dom'
import { Menu, X, Sun, Moon, LogOut, BookOpen, MessageSquare, Settings, Calendar, GraduationCap, User, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'
import { usePlatformSettings } from '../context/PlatformSettingsContext'
import BrandLogo from './BrandLogo'
import { toDisplayTunisianPhone } from '../lib/phone'

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout, isLoading } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const { settings } = usePlatformSettings()
  const platformName = settings.platformName || 'TuniBac'
  const isAdmin = user?.role === 'ADMIN'
  const isTeacher = user?.role === 'TEACHER'
  const hasStudentAccess = !!user && !isAdmin && user.status === 'APPROVED'
  const pendingOnly = !!user && !isAdmin && user.status !== 'APPROVED'

  return (
    <nav className="glass-morphism sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <BrandLogo
            variant="horizontal"
            theme={isDark ? 'dark' : 'default'}
            className="h-10 w-auto sm:h-11"
            alt={`${platformName} home`}
          />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-8">
          {!isAdmin && (
            <>
              <Link to="/courses" className="text-text-light dark:text-text hover:text-accent transition-colors">Courses</Link>
              <Link to="/exercises" className="text-text-light dark:text-text hover:text-accent transition-colors">Exercises</Link>
              <Link to="/parascolaires" className="text-text-light dark:text-text hover:text-accent transition-colors">Parascolaires</Link>
            </>
          )}
          
          {hasStudentAccess && (
            <>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <Link to="/learning-path" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <BookOpen size={14} />
                <span>Learning Path</span>
              </Link>
              <Link to="/live-study" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <MessageSquare size={14} />
                <span>Live Study</span>
              </Link>
              <Link to="/study-planner" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <Calendar size={14} />
                <span>Planner</span>
              </Link>
              <Link to="/teachers" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <User size={14} className="text-teal-600" />
                <span>Enseignants</span>
              </Link>
              <Link to="/shop" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <ShoppingCart size={14} className="text-rose-600" />
                <span>Boutique</span>
              </Link>
              <Link to="/profile" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <User size={14} />
                <span>Profil</span>
              </Link>
            </>
          )}

          {isTeacher && (
            <>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <Link to="/teacher" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <GraduationCap size={18} />
                <span>Teacher Workspace</span>
              </Link>
            </>
          )}

          {isAdmin && (
            <>
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <Link to="/admin" className="flex items-center space-x-1 text-text-light dark:text-text hover:text-accent transition-colors">
                <Settings size={18} />
                <span>Admin</span>
              </Link>
            </>
          )}
          
          {!user && !isLoading && <div className="h-6 w-px bg-black/10 dark:bg-white/10" />}

          <button 
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-text-muted-light dark:text-text-muted hover:text-accent"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {isLoading ? (
            <div className="h-10 w-24 animate-pulse rounded-full bg-black/5 dark:bg-white/5" />
          ) : user ? (
            <div className="flex items-center space-x-6">
              {pendingOnly && (
                <Link to="/pending-approval" className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm font-semibold text-yellow-500 transition-colors hover:bg-yellow-500/15">
                  Pending Approval
                </Link>
              )}
              <Link to={isAdmin ? '/admin' : hasStudentAccess ? '/profile' : '/pending-approval'} className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-accent text-primary rounded-full flex items-center justify-center font-bold">
                  {user.firstName[0]}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-text-light dark:text-text group-hover:text-accent transition-colors">{user.firstName}</span>
                  {user.phone && (
                    <span className="text-xs text-text-muted-light dark:text-text-muted">{toDisplayTunisianPhone(user.phone)}</span>
                  )}
                </div>
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
            {!isAdmin && (
              <>
                <Link to="/courses" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Courses</Link>
                <Link to="/exercises" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Exercises</Link>
                <Link to="/parascolaires" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Parascolaires</Link>
              </>
            )}
            {hasStudentAccess && (
              <>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <Link to="/learning-path" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg text-text-light dark:text-text">
                  <BookOpen size={16} /> Learning Path
                </Link>
                <Link to="/live-study" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg text-text-light dark:text-text">
                  <MessageSquare size={16} /> Live Study
                </Link>
                <Link to="/study-planner" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg text-text-light dark:text-text">
                  <Calendar size={16} /> Study Planner
                </Link>
                <Link to="/teachers" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg text-text-light dark:text-text">
                  <User size={16} className="text-teal-600" /> Enseignants
                </Link>
                <Link to="/shop" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg text-text-light dark:text-text">
                  <ShoppingCart size={16} className="text-rose-600" /> Boutique
                </Link>
                <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg text-text-light dark:text-text">
                  <User size={16} /> Profil
                </Link>
              </>
            )}
            {isTeacher && (
              <>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <Link to="/teacher" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Teacher Workspace</Link>
              </>
            )}
            {isAdmin && (
              <>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <Link to="/admin" onClick={() => setIsOpen(false)} className="text-lg text-text-light dark:text-text">Admin Panel</Link>
              </>
            )}
            {pendingOnly && (
              <Link to="/pending-approval" onClick={() => setIsOpen(false)} className="text-lg text-yellow-500">
                Pending Approval
              </Link>
            )}
            {isLoading ? (
              <div className="h-11 rounded-xl bg-black/5 dark:bg-white/5" />
            ) : user ? (
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
