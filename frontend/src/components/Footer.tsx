import { GraduationCap, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlatformSettings } from '../context/PlatformSettingsContext'
import { useAuth } from '../context/AuthContext'

const Footer = () => {
  const { settings } = usePlatformSettings()
  const { user } = useAuth()
  const platformName = settings.platformName || 'TuniBac'
  const isAdmin = user?.role === 'ADMIN'
  const socialItems = [
    { label: 'Facebook link not configured', icon: Facebook },
    { label: 'Twitter link not configured', icon: Twitter },
    { label: 'Instagram link not configured', icon: Instagram },
    { label: 'LinkedIn link not configured', icon: Linkedin },
  ]

  return (
    <footer className="bg-primary-light dark:bg-primary pt-16 pb-8 border-t border-black/10 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <Link to="/" className="flex items-center space-x-2 text-2xl font-bold text-accent">
            <GraduationCap size={32} />
            <span>{platformName}</span>
          </Link>
          <p className="text-text-muted-light dark:text-text-muted">
            The leading educational platform for Tunisian students. Master Mathematics, Physics, and Science with expert guidance.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-6 text-text-light dark:text-text">Quick Links</h3>
          <ul className="space-y-4 text-text-muted-light dark:text-text-muted">
            {!isAdmin && (
              <>
                <li><Link to="/courses" className="hover:text-accent">Courses</Link></li>
                <li><Link to="/exercises" className="hover:text-accent">Exercises</Link></li>
              </>
            )}
            <li><Link to="/faq" className="hover:text-accent">FAQ</Link></li>
            {!isAdmin && <li><Link to="/study-planner" className="hover:text-accent">Study Planner</Link></li>}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-6 text-text-light dark:text-text">Platform</h3>
          <ul className="space-y-4 text-text-muted-light dark:text-text-muted">
            {!isAdmin && (
              <>
                <li><Link to="/dashboard" className="hover:text-accent">Dashboard</Link></li>
                <li><Link to="/parascolaires" className="hover:text-accent">Parascolaires</Link></li>
                <li><Link to="/homework" className="hover:text-accent">Homework</Link></li>
              </>
            )}
            {isAdmin && <li><Link to="/admin" className="hover:text-accent">Admin Workspace</Link></li>}
          </ul>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-6 text-text-light dark:text-text">Connect With Us</h3>
          <div className="flex space-x-4">
            {socialItems.map(({ label, icon: Icon }) => (
              <span
                key={label}
                title={label}
                aria-label={label}
                className="p-3 bg-secondary-light dark:bg-secondary rounded-full text-text-muted-light dark:text-text-muted"
              >
                <Icon size={20} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-black/10 dark:border-white/10 text-center text-text-muted-light dark:text-text-muted">
        <p>&copy; {new Date().getFullYear()} {platformName}. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
