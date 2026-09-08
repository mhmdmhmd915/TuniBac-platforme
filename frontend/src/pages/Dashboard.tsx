import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Target,
  Award,
  Zap,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logger } from '../lib/logger'
import { usersAPI } from '../services/api'
import BrandLogo from '../components/BrandLogo'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ coursesCompleted: 0, exercisesCompleted: 0 })

  useEffect(() => {
    let isCurrent = true

    const fetchDashboardData = async () => {
      try {
        const statsResponse = await usersAPI.getStats()

        if (!isCurrent) {
          return
        }

        setStats(statsResponse.data)
      } catch (error) {
        if (!isCurrent) {
          return
        }

        logger.error('Error loading dashboard', error)
      }
    }

    void fetchDashboardData()

    return () => {
      isCurrent = false
    }
  }, [])

  // Students now live on the Learning Path home page.
  if (user?.role === 'STUDENT') {
    return <Navigate to="/learning-path" replace />
  }

  const totalProgress = Math.min(100, Math.round(
    ((stats.coursesCompleted * 5 + stats.exercisesCompleted * 2) / 100) * 100
  ))

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-brand-blue/15 bg-brand-blue/10 px-4 py-2">
            <BrandLogo variant="icon" className="h-9 w-9" alt="TuniBac student mark" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Student Interface</span>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-text-light dark:text-text">Welcome back, {user?.firstName}!</h1>
          <p className="text-text-muted-light dark:text-text-muted text-lg">
            Track your progress and keep pushing toward your academic goals.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="glass-morphism px-6 py-3 rounded-2xl flex items-center space-x-3">
            <div className="p-2 bg-success/20 text-success rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="text-sm text-text-muted-light dark:text-text-muted">Current Rank</div>
              <div className="font-bold text-text-light dark:text-text">Pro Learner</div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[36px] border border-black/10 bg-gradient-to-br from-brand-blue via-[#1e3a8a] to-[#0f172a] px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.32)] dark:border-white/10 md:px-10 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.16),transparent_38%)]" />
        <div className="relative">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                <Target size={14} />
                Learning Progress
              </div>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                You're making great progress!
              </h2>
              <p className="text-sm text-slate-200 md:text-base">
                Every course you complete and every exercise you solve gets you closer to success. Keep the momentum going.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Weekly Streak</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Zap size={20} className="text-amber-300" />
                    <span className="text-2xl font-bold">5 days</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.2em] text-emerald-100">Achievements</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Award size={20} className="text-amber-300" />
                    <span className="text-2xl font-bold text-emerald-50">12</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Overall Progress</span>
                <span className="text-2xl font-bold">{totalProgress}%</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${totalProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-300">Goals Set</div>
                  <div className="mt-1 text-2xl font-bold">8</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-300">Completed</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-300">5</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Courses Completed', value: stats.coursesCompleted, icon: <BookOpen />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Exercises Solved', value: stats.exercisesCompleted, icon: <CheckCircle />, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Study Hours', value: '24h', icon: <Clock />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Platform Points', value: '1,250', icon: <TrendingUp />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="glass-morphism p-6 rounded-3xl flex items-center space-x-4"
          >
            <div className={`p-4 ${stat.bg} ${stat.color} rounded-2xl`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-text-muted-light dark:text-text-muted text-sm">{stat.label}</div>
              <div className="text-2xl font-bold text-text-light dark:text-text">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
