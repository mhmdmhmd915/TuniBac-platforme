import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock3, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PendingApproval: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user.status === 'APPROVED') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.12),_transparent_30%)] px-4 py-10 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <section className="glass-morphism overflow-hidden rounded-[36px] border border-black/5 p-8 dark:border-white/10 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-500">
            <Clock3 size={16} />
            Status: Pending Approval
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-text-light dark:text-text sm:text-5xl">
            Your account is waiting for approval
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted-light dark:text-text-muted">
            Thank you for creating your account. Your registration has been received successfully and is currently waiting for administrator approval. You will gain access to all platform content once your account is approved.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-black/5 bg-white/40 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3 text-text-light dark:text-text">
                <ShieldCheck className="text-accent" size={22} />
                <span className="font-semibold">Approval workflow preserved</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted-light dark:text-text-muted">
                Access opens only after an administrator approves your student account.
              </p>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white/40 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-3 text-text-light dark:text-text">
                <Sparkles className="text-yellow-500" size={22} />
                <span className="font-semibold">What happens next</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-muted-light dark:text-text-muted">
                Check back later after approval to unlock courses, exercises, downloads, and your dashboard tools.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 font-semibold text-primary transition-all hover:scale-[1.01] hover:bg-accent/90"
            >
              <span>Back to Homepage</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black/5 px-6 py-4 font-semibold text-text-light transition-all hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:text-text dark:hover:bg-white/10"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </section>

        <aside className="glass-morphism rounded-[36px] border border-black/5 p-8 dark:border-white/10 sm:p-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20">
            <Clock3 size={42} />
          </div>

          <h2 className="mt-6 text-center text-2xl font-bold text-text-light dark:text-text">
            Waiting for administrator review
          </h2>

          <p className="mt-4 text-center text-sm leading-7 text-text-muted-light dark:text-text-muted">
            While your account is pending, you can still browse the public platform sections. Protected learning content will unlock automatically after approval.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-black/5 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="font-semibold text-text-light dark:text-text">Current status</div>
              <div className="mt-2 text-sm text-yellow-500">Pending Approval</div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white/40 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="font-semibold text-text-light dark:text-text">Access after approval</div>
              <div className="mt-2 text-sm text-text-muted-light dark:text-text-muted">
                Courses, exercises, videos, PDFs, homework, dashboard, study planner, and downloads.
              </div>
            </div>
          </div>
        </aside>
      </motion.div>
    </div>
  );
};

export default PendingApproval;
