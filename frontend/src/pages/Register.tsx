import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { BAC_SECTION_OPTIONS, DEFAULT_BAC_SECTION } from '../constants/bacSections'
import BrandLogo from '../components/BrandLogo'
import { normalizeTunisianPhone } from '../lib/phone'

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    bacSection: DEFAULT_BAC_SECTION,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedPhone = normalizeTunisianPhone(formData.phone)

    if (!normalizedPhone) {
      setError('Enter a valid Tunisian mobile number (8 digits).')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirm password must match.')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await authAPI.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: normalizedPhone,
        password: formData.password,
        bacSection: formData.bacSection,
      })
      const nextUser = response.data.user
      const fromState = location.state as { from?: { pathname?: string; search?: string } } | null
      const fromPath = fromState?.from?.pathname
        ? `${fromState.from.pathname}${fromState.from.search || ''}`
        : '/dashboard'

      login(response.data.token, nextUser)

      if (nextUser.role !== 'ADMIN' && nextUser.status !== 'APPROVED') {
        navigate('/pending-approval', { replace: true })
        return
      }

      navigate(fromPath, { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full glass-morphism p-10 rounded-[32px] space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <BrandLogo variant="horizontal" className="h-12 w-auto" alt="TuniBac registration logo" />
          </div>
          <div className="mx-auto inline-flex items-center rounded-full border border-brand-blue/15 bg-brand-blue/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Official Registration
          </div>
          <h2 className="text-3xl font-bold text-text-light dark:text-text">Create Account</h2>
          <p className="text-text-muted-light dark:text-text-muted">Join the premium Tunisian Bac learning community on TuniBac.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="register-first-name" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">First Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
                <input
                  id="register-first-name"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  placeholder="Mouhamed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="register-last-name" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Last Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
                <input
                  id="register-last-name"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  placeholder="Academy"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-phone" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
              <input
                id="register-phone"
                type="tel"
                inputMode="numeric"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                placeholder="20123456"
              />
            </div>
            <p className="text-xs text-text-muted-light dark:text-text-muted ml-1">
              Enter 8 digits. We automatically store it as `+216XXXXXXXX`.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-bac-section" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Bac Section</label>
            <select
              id="register-bac-section"
              name="bacSection"
              value={formData.bacSection}
              onChange={(e) => setFormData({ ...formData, bacSection: e.target.value as typeof formData.bacSection })}
              required
              className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 px-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
            >
              {BAC_SECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-password" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
              <input
                id="register-password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="register-confirm-password" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
              <input
                id="register-confirm-password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent text-primary py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                <span>Create Account</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-text-muted-light dark:text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-bold hover:underline">
            Login Now
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Register
