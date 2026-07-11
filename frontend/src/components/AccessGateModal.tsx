import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Lock, Sparkles, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

interface AccessGateModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

const AccessGateModal = ({
  isOpen,
  onClose,
  title = 'Unlock the full learning experience',
  message = 'Create your account to access all courses and platform resources.',
}: AccessGateModalProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const buildState = () => ({
    from: {
      pathname: location.pathname,
      search: location.search,
    },
  })

  const handleNavigate = (path: '/register' | '/login') => {
    onClose()
    navigate(path, { state: buildState() })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 text-white shadow-2xl shadow-accent/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_52%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_36%)]" />

            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/30">
                    <Lock size={24} />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                      <Sparkles size={14} />
                      Premium Access
                    </div>
                    <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{title}</h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close access modal"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">{message}</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleNavigate('/register')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-base font-semibold text-primary transition-all hover:scale-[1.01] hover:bg-accent/90"
                >
                  <span>Create Account</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigate('/login')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-base font-semibold text-white transition-all hover:scale-[1.01] hover:bg-white/10"
                >
                  <span>Login</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                Access includes courses, exercises, videos, PDFs, downloads, homework, dashboard tools, and platform resources after administrator approval.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AccessGateModal
