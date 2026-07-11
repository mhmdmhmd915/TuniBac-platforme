import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const response = await authAPI.login({ email, password })
      const nextUser = response.data.user
      const fromState = location.state as { from?: { pathname?: string; search?: string } } | null
      const fallbackPath = nextUser.role === 'ADMIN' ? '/admin' : '/dashboard'
      const fromPath = fromState?.from?.pathname
        ? `${fromState.from.pathname}${fromState.from.search || ''}`
        : fallbackPath

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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass-morphism p-10 rounded-[32px] space-y-8"
      >
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-text-light dark:text-text">Welcome Back</h2>
          <p className="text-text-muted-light dark:text-text-muted">Continue your learning journey</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                placeholder="mouhamed@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-sm font-medium text-text-muted-light dark:text-text-muted ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted" size={20} />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-secondary-light/50 dark:bg-secondary/50 border border-black/10 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-text-light dark:text-text focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <span className="text-sm text-text-muted-light dark:text-text-muted">
              Password resets are handled by admin support.
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent text-primary py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:bg-opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                <span>Login</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-text-muted-light dark:text-text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent font-bold hover:underline">
            Register Now
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Login
