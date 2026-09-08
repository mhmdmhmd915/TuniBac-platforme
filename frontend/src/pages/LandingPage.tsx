import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  PlayCircle,
  FileCheck,
  FileText,
  Flag,
  GraduationCap,
  MapPin,
  Megaphone,
  MessageCircle,
  MonitorPlay,
  Pencil,
  ShoppingBag,
  ShoppingCart,
  Star,
  User,
  FileQuestion,
  Sparkles,
  Target,
  ExternalLink,
  Clock,
  Users,
  Radio,
  Zap,
  Lock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { teacherAdsAPI, shopAPI, teacherAPI } from '../services/api'
import { toAssetUrl } from '../lib/assets'

interface TeacherAd {
  id: string
  image?: string | null
  teacherName: string
  subject?: string | null
  description?: string | null
  whatsapp?: string | null
  externalLink?: string | null
}

interface ShopProduct {
  id: string
  name: string
  description?: string | null
  image?: string | null
  price?: number | null
  whatsapp?: string | null
  externalLink?: string | null
}

interface PublicTeacher {
  id: string
  firstName: string
  lastName: string
  profile: { photo?: string | null; bio?: string | null; whatsapp?: string | null }
}

const formatWhatsAppLink = (value?: string | null) => {
  if (!value) return null
  const digits = String(value).replace(/\D+/g, '')
  if (!digits) return null
  const full = digits.length === 8 ? `216${digits}` : digits
  return `https://wa.me/${full}`
}

/* -------------------------------------------------------------------------- */
/* REUSABLE TUNIBAC NODE STYLES — matches LearningPath.tsx                       */
/* -------------------------------------------------------------------------- */

const LP_STEP_COLOR = '#071840'
const LP_SUBJECT_COLOR = '#1d4ed8'
const LP_COURSE_COLOR = '#0ea5e9'
const LP_EXERCISE_COLOR = '#059669'

const StepNode: React.FC<{ label: string; subtitle?: string; size?: 'md' | 'lg'; active?: boolean; percent?: number }> = ({
  label,
  subtitle,
  size = 'lg',
  active,
  percent,
}) => {
  const sz = size === 'lg' ? 'h-16 w-16 rounded-2xl' : 'h-14 w-14 rounded-2xl'
  const ic = size === 'lg' ? 28 : 22
  const backCls = 'absolute inset-0 ' + sz + ' opacity-20'
  const frontCls = 'relative flex ' + sz + ' items-center justify-center text-white ring-4 ring-white shadow-lg'
  const labelCls = 'font-extrabold text-[#071840] text-lg truncate'
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <span
          className={backCls}
          style={{ backgroundColor: LP_STEP_COLOR }}
        />
        <span
          className={frontCls}
          style={{ backgroundColor: LP_STEP_COLOR }}
        >
          <MapPin size={ic} strokeWidth={2.2} />
        </span>
        {active && (
          <span className="absolute -inset-2 rounded-3xl ring-2 ring-brand-blue/60 animate-pulse pointer-events-none" />
        )}
      </div>
      <div className="min-w-0">
        <div className={labelCls}>{label}</div>
        {subtitle && <div className="text-xs text-slate-500 truncate">{subtitle}</div>}
        {typeof percent === 'number' && (
          <div className="mt-1.5 h-2 w-32 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-gradient-to-r from-[#071840] via-brand-blue to-sky-500"
              style={{ width: percent + '%' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const SubjectNode: React.FC<{ label: string; subtitle?: string; color?: string }> = ({ label, subtitle, color }) => {
  const c = color || LP_SUBJECT_COLOR
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0 shadow-[0_8px_20px_-8px_rgba(29,78,216,0.55)] ring-2 ring-white"
        style={{ backgroundColor: c }}
      >
        <BookMarked size={19} strokeWidth={2.1} />
      </span>
      <div className="min-w-0">
        <div className="font-bold text-[#0f172a] text-sm">{label}</div>
        {subtitle && <div className="text-[11px] text-slate-500">{subtitle}</div>}
      </div>
    </div>
  )
}

const CourseNode: React.FC<{ label: string; variant?: 'video' | 'pdf' | 'link' | 'default'; completed?: boolean }> = ({
  label,
  variant = 'default',
  completed,
}) => {
  const Icon = variant === 'video' ? PlayCircle : variant === 'pdf' ? FileText : variant === 'link' ? ExternalLink : BookOpenCheck
  const c = completed ? 'bg-emerald-500' : 'bg-sky-500'
  const spanCls = 'flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0 ' + c
  return (
    <button type="button" className="group flex w-full items-center gap-2 rounded-xl border border-sky-100 bg-white px-2.5 py-1.5 text-left hover:border-sky-400 hover:bg-sky-50 transition-colors">
      <span className={spanCls}>
        <Icon size={14} />
      </span>
      <span className="flex-1 min-w-0 truncate text-xs font-medium text-slate-800 group-hover:text-sky-700">
        {label}
      </span>
      {completed ? (
        <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
      ) : null}
    </button>
  )
}

const ExerciseNode: React.FC<{ label: string; completed?: boolean }> = ({ label, completed }) => {
  const Icon = completed ? FileCheck : Pencil
  const c = completed ? 'bg-emerald-500' : 'bg-emerald-600'
  const spanCls = 'flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0 ' + c
  return (
    <button type="button" className="group flex w-full items-center gap-2 rounded-xl border border-emerald-100 bg-white px-2.5 py-1.5 text-left hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
      <span className={spanCls}>
        <Icon size={14} />
      </span>
      <span className="flex-1 min-w-0 truncate text-xs font-medium text-slate-800 group-hover:text-emerald-700">
        {label}
      </span>
      {completed ? <CheckCircle2 size={14} className="shrink-0 text-emerald-500" /> : null}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* DECORATIVE LP PREVIEW — mindmap visual for Landing                           */
/* -------------------------------------------------------------------------- */

const LpMindmapPreview: React.FC = () => {
  const steps = [
    { id: 't1', label: 'Trimestre 1', percent: 68 },
    { id: 't2', label: 'Trimestre 2', percent: 32 },
    { id: 't3', label: 'Trimestre 3' },
    { id: 'sport', label: 'Bac Sport' },
    { id: 'blanc', label: 'Bac Blanc' },
    { id: 'bac', label: 'Bac Principale' },
  ]

  const subjects = [
    { color: '#1d4ed8', name: 'Mathématiques' },
    { color: '#0ea5e9', name: 'Physique' },
    { color: '#4f46e5', name: 'Informatique' },
    { color: '#0891b2', name: 'Science' },
    { color: '#7c3aed', name: 'Français' },
    { color: '#dc2626', name: 'Arabe' },
  ]

  return (
    <div className="relative w-full">
      {/* BACKGROUND GRID LINES */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 10% 10%, rgba(29,78,216,0.08) 0, rgba(29,78,216,0.08) 1px, transparent 1px), radial-gradient(circle at 80% 30%, rgba(7,24,64,0.06) 0, rgba(7,24,64,0.06) 1px, transparent 1px)',
            backgroundSize: '22px 22px, 28px 28px',
          }}
        />
      </div>

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.35fr)] items-center">
        {/* LEFT: Step timeline vertical */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="relative space-y-5 pl-2 py-6"
        >
          {steps.map((step, i) => (
            <div key={step.id} className="relative">
              {i < steps.length - 1 && (
                <div
                  className="absolute left-[38px] top-16 bottom-[-20px] w-0.5 rounded-full bg-gradient-to-b from-[#071840]/50 to-transparent"
                />
              )}
              <motion.div
                variants={{
                  hidden: { opacity: 0, x: -22 },
                  visible: { opacity: 1, x: 0, transition: { duration: 0.45, delay: i * 0.08 } },
                }}
              >
                <StepNode
                  label={step.label}
                  subtitle={
                    i === 0 ? 'Septembre – Décembre' :
                    i === 1 ? 'Janvier – Mars' :
                    i === 2 ? 'Avril – Mai' :
                    i === 3 ? 'Épreuve sportive' :
                    i === 4 ? 'Session blanche' :
                    i === 5 ? '🚀 Session principale 🇹🇳' : ''
                  }
                  size={i === 0 ? 'lg' : 'md'}
                  percent={step.percent}
                />
              </motion.div>
            </div>
          ))}
        </motion.div>

        {/* RIGHT: Expanded Trimestre 1 branch (subjects → courses/exercises) */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.15 },
            },
          }}
          className="relative"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-[#071840] border border-blue-100">
            <Flag size={13} /> Aperçu — Trimestre 1 détaillé
          </div>

          {/* Subjects column */}
          <div className="grid sm:grid-cols-2 gap-3">
            {subjects.slice(0, 4).map((s) => (
              <div
                key={s.name}
                className="rounded-3xl border border-slate-200 bg-white shadow-md p-3.5"
              >
                <div className="mb-3">
                  <SubjectNode label={s.name} color={s.color} subtitle="2 cours · 3 exercices" />
                </div>
                <div className="space-y-1.5 border-l border-dashed border-slate-200 pl-3 ml-5">
                  <CourseNode label="Chapitre 1 — Fonctions" variant="video" completed />
                  <CourseNode label="Chapitre 2 — Limites" variant="pdf" />
                  <ExerciseNode label="Exercice 01 — Fonctions" completed />
                  <ExerciseNode label="Exercice 02 — Limites" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md ring-2 ring-white shrink-0">
                <CalendarDays size={18} />
              </span>
              <div>
                <div className="text-sm font-bold text-amber-900">Planning</div>
                <div className="text-xs text-amber-800/70">4 séances · 3h30</div>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 p-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md ring-2 ring-white shrink-0">
                <BarChart3 size={18} />
              </span>
              <div>
                <div className="text-sm font-bold text-sky-900">Progression</div>
                <div className="text-xs text-sky-900/70">Trimestre 1 — 68%</div>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-teal-100 p-3 flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md ring-2 ring-white shrink-0">
                <User size={18} />
              </span>
              <div>
                <div className="text-sm font-bold text-teal-900">Profs</div>
                <div className="text-xs text-teal-900/70">6 enseignants</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* HERO                                                                      */
/* -------------------------------------------------------------------------- */

const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#071840]/[0.06] to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-24 w-[520px h-[520px] rounded-full bg-gradient-to-tl from-brand-blue/[0.10] to-transparent blur-3xl" />
        <div
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-blue-50/60" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-12 sm:pt-16 lg:pt-20 lg:pb-20">
        <div className="grid gap-10 lg:gap-12 items-center lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="relative"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-brand-blue/8 px-3.5 py-1.5 text-xs font-bold text-[#071840]">
              <Sparkles size={13} className="text-brand-blue" />
              طبقة 2025 / 2026 — باك تونس 🇹🇳
            </div>

            <h1 className="mt-5 font-black text-[44px] leading-[1.05] tracking-tight text-[#071840] sm:text-6xl lg:text-[72px]">
              طريقك للباك
              <br />
              <span className="bg-gradient-to-r from-[#071840] via-brand-blue to-sky-500 bg-clip-text text-transparent">
                يبدأ من هنا 🚀
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-xl font-semibold text-[#071840]/80 sm:text-2xl" dir="auto">
              Cours، exercices، planning ومراجعة منظمة في بلاصة وحدة.
            </p>

            <div className="mt-4 flex flex-wrap gap-3 text-base font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <BookOpenCheck size={16} className="text-sky-600" /> Cours complets
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <Pencil size={16} className="text-emerald-600" /> Exercices + corrections
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <CalendarDays size={16} className="text-amber-600" /> Study planner
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                <BarChart3 size={16} className="text-brand-blue" /> Progression
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-full bg-[#071840] px-8 py-4 text-lg font-extrabold text-white shadow-[0_18px_40px_-14px_rgba(7,24,64,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-14px_rgba(7,24,64,0.9)]"
              >
                إبدأ توا
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#apercu-parcours"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-4 text-lg font-bold text-[#071840] transition-colors hover:border-[#071840]/40 hover:bg-slate-50"
              >
                <MonitorPlay size={19} className="text-brand-blue" />
                شوف كيفاش تخدم المنصة
              </a>
            </div>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-5">
              <div>
                <div className="text-3xl font-black text-[#071840]">+500</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Cours & exercices</div>
              </div>
              <div>
                <div className="text-3xl font-black text-[#071840]">6</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Sections bac</div>
              </div>
              <div>
                <div className="text-3xl font-black text-[#071840]">24/7</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Accessible sur mobile</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            id="apercu-parcours"
            className="relative"
          >
            <div className="absolute -inset-2 rounded-[44px] bg-gradient-to-br from-[#071840]/[0.08] via-brand-blue/10 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[36px border border-slate-200 bg-white shadow-[0_40px_80px_-30px_rgba(7,24,64,0.35)] p-5 sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-3 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                    app.tunibac.tn / learning-path
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-500/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Session élève
                </span>
              </div>
              <LpMindmapPreview />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="inline-flex items-center gap-1.5">
                <Target size={14} className="text-brand-blue" />
                Parcours adapté selon ta section
              </span>
              <span className="inline-flex items-center gap-1">
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <Star size={14} className="text-amber-500 fill-amber-500" />
                <Star size={14} className="text-amber-500 fill-amber-500" />
                Trusted by Tunisian students
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* LEARNING PATH SECTION                                                     */
/* -------------------------------------------------------------------------- */

const LearningPathSection: React.FC = () => {
  return (
    <section id="learning-path" className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-blue">
            <MapPin size={13} /> Learning Path
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
            راجع خطوة بخطوة
          </h2>
          <p className="mt-4 text-xl font-semibold text-slate-700" dir="auto">
            وما تضيعش فين وصلت — كل شيء مرتب ليك على شكل مراحل.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[36px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 p-6 sm:p-10 shadow-[0_30px_70px_-30px_rgba(7,24,64,0.28)]">
          <LpMindmapPreview />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: MapPin, label: 'Étapes clés', desc: 'Trimestres + Bac Sport + Bac Blanc + Bac Principale.', color: LP_STEP_COLOR },
            { Icon: BookMarked, label: 'Matières', desc: 'Chaque matière organisée selon ta section (Math, Sci, Eco, Tech, Lettres, Sport, Infirmier…).', color: LP_SUBJECT_COLOR },
            { Icon: PlayCircle, label: 'Cours', desc: 'Vidéos, PDFs et liens — tout est groupé par chapitre.', color: LP_COURSE_COLOR },
            { Icon: Pencil, label: 'Exercices', desc: 'Entraîne-toi puis ألقِ correction détaillée.', color: LP_EXERCISE_COLOR },
          ].map(({ Icon, label, desc, color }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white mb-3"
                style={{ backgroundColor: color }}
              >
                <Icon size={20} />
              </span>
              <h3 className="font-extrabold text-[#071840]">{label}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* COURSES + EXERCISES                                                        */
/* -------------------------------------------------------------------------- */

const CoursesExercisesSection: React.FC = () => (
  <section className="relative bg-slate-50/60 py-16 sm:py-24">
    <div className="mx-auto max-w-7xl px-6">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-sky-700">
          <BookOpen size={13} /> Cours &amp; Exercices
        </div>
        <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
          الكورسات والتمارين في بلاصة وحدة
        </h2>
        <p className="mt-4 text-xl font-semibold text-slate-700" dir="auto">
          إلقى ما تحتاجوه بسرعة — Cours structurés + exercices corrigés.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {/* COURSE VIEWER PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SubjectNode label="Mathématiques" subtitle="Chapitre 3 — Les fonctions" color="#1d4ed8" />
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700">
              72% terminé
            </span>
          </div>

          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#071840] via-brand-blue/90 to-sky-500 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-[#071840] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-transform hover:scale-105">
                <PlayCircle size={44} strokeWidth={1.7} />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
              <div className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold backdrop-blur-sm">
                ▶ 00:00 / 24:18
              </div>
              <div className="h-1.5 w-[58%] rounded-full bg-white/70" />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#071840] px-3 py-2.5 text-sm font-bold text-white">
              <PlayCircle size={15} /> Vidéo
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:border-sky-400/40 hover:text-sky-700">
              <FileText size={15} /> PDF
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 hover:border-sky-400/40 hover:text-sky-700">
              <BookOpen size={15} /> Notes
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            Dans ce chapitre tu découvriras les <b>domaine de définition</b>, la <b>parité</b>, le <b>sens de variation</b> puis les <b>limites usuelles</b> indispensables pour les sujets du Bac.
          </p>

          <div className="mt-4 space-y-1.5">
            <CourseNode label="1 · Définition et vocabulaire" variant="video" completed />
            <CourseNode label="2 · Parité et courbes représentatives" variant="pdf" completed />
            <CourseNode label="3 · Sens de variation &amp; tableau de variations" variant="video" />
            <CourseNode label="4 · Limites usuelles &amp; asymptotes" variant="link" />
          </div>
        </motion.div>

        {/* EXERCISE PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0 shadow-[0_8px_20px_-8px_rgba(5,150,105,0.6)] ring-2 ring-white"
                style={{ backgroundColor: LP_EXERCISE_COLOR }}
              >
                <Pencil size={19} />
              </span>
              <div>
                <div className="text-[11px] font-bold text-emerald-700">Exercice 01</div>
                <div className="text-sm font-bold text-[#0f172a]">Fonctions — étude d'une fonction</div>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
              ⏱ ~25 min
            </span>
          </div>

          <div className="space-y-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 p-4">
            {[
              { q: 'Déterminer le domaine de définition de la fonction f(x) = (2x + 1)/(x² - 4).', id: 'q1' },
              { q: 'Étudier la parité de f puis tracer le tableau de signe de variation.', id: 'q2' },
              { q: 'Calculer les limites de f en +∞ et en -∞. En déduire les asymptotes.', id: 'q3' },
            ].map((it, i) => (
              <div key={it.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-black text-emerald-700 border border-emerald-200/80 shadow-sm">
                  Q{i + 1}
                </span>
                <p className="text-sm text-slate-800 leading-relaxed pt-0.5">{it.q}</p>
              </div>
            ))}
            <div className="flex items-start gap-2 rounded-xl bg-white/80 border border-dashed border-emerald-200/70 p-3">
              <FileQuestion size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600">
                لما تخلص، اضغط <b>« تصحيح </b> شوف النموذج كامل مع شرح مفصل وطريق الحل.
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#071840] px-4 py-2.5 text-sm font-bold text-white hover:opacity-95">
              <FileCheck size={15} /> Correction détaillée
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                <Pencil size={14} /> Répondre
              </button>
              <button className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                <BookOpenCheck size={14} /> Relire cours
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-3.5 text-xs text-slate-600">
            <div className="mb-2 font-extrabold text-slate-800 flex items-center gap-1.5">
              <BarChart3 size={14} className="text-sky-700" />
              Résultats de la dernière tentative
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white border border-slate-100 py-1.5 text-center">
                <div className="text-base font-black text-emerald-600">16/20</div>
                <div className="text-[10px]">Note</div>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 py-1.5 text-center">
                <div className="text-base font-black text-amber-600">18 min</div>
                <div className="text-[10px]">Durée</div>
              </div>
              <div className="rounded-lg bg-white border border-slate-100 py-1.5 text-center">
                <div className="text-base font-black text-brand-blue">100%</div>
                <div className="text-[10px]">Complété</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-lg font-semibold text-slate-700" dir="auto">
          " تمرّن أكثر، وافهم أغلاطك — بدون ما تعاود نفس الخطأ.
        </p>
      </div>
    </div>
  </section>
)

/* -------------------------------------------------------------------------- */
/* LIVE STUDY                                                                 */
/* -------------------------------------------------------------------------- */

const LiveStudySection: React.FC = () => {
  const LIVE_STUDY_DEMO = {
    publicSession: {
      id: 'demo-public-001',
      subject: 'Mathématiques',
      topic: 'Dérivation — Exercices Type Bac',
      timer: '42:18',
      participants: [
        { name: 'Ahmed', subject: 'Math', color: '#1d4ed8' },
        { name: 'Yassine', subject: 'Physics', color: '#0ea5e9' },
        { name: 'Sara', subject: 'Français', color: '#7c3aed' },
        { name: 'Oussema', subject: 'SVT', color: '#059669' },
      ],
      creatorName: 'Ahmed B.',
    },
    squad: {
      id: 'demo-squad-001',
      name: 'Math Warriors',
      sharedGoal: 'Terminer Chapitre 1 avant le weekend',
      members: [
        { name: 'Ahmed', color: '#1d4ed8' },
        { name: 'Yassine', color: '#0ea5e9' },
        { name: 'Sara', color: '#7c3aed' },
      ],
    },
  } as const

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 py-16 sm:py-24">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand-blue/10 blur-3xl opacity-50" />
      <div className="pointer-events-none absolute top-10 right-6 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute bottom-10 left-6 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-brand-blue ring-1 ring-brand-blue/20"
          >
            <Radio size={13} className="animate-pulse" />
            Live Study · الدراسة الجماعية
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-5 text-4xl font-black leading-tight text-[#071840] sm:text-5xl sm:leading-[1.1]"
          >
            ما عادش تقرى وحدك.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-xl font-semibold text-slate-700 sm:text-2xl"
            dir="auto"
          >
            ادخل Live Study، لوج على صحابك، واقراو مع بعضكم live.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-3 text-base font-semibold text-slate-500 sm:text-lg"
            dir="auto"
          >
            ركّز، شارك وقت القراية، وشوف شكون يقرا معاك.
          </motion.p>
        </div>

        <div className="mt-16 grid gap-8 items-stretch lg:grid-cols-2">
          {/* ======================= PUBLIC LIVE STUDY CARD ======================= */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: 18 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 ring-1 ring-sky-500/20">
                <Zap size={12} className="text-sky-600" />
                Public Live Study
              </span>
            </div>

            <div className="relative rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)] sm:p-7">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700">
                      {LIVE_STUDY_DEMO.publicSession.subject}
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-[#071840] leading-snug">
                    {LIVE_STUDY_DEMO.publicSession.topic}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    by {LIVE_STUDY_DEMO.publicSession.creatorName}
                  </p>
                </div>

                <div className="shrink-0 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 px-4 py-3 text-center min-w-[110px]">
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-brand-blue/70">
                    <Clock size={11} />
                    Timer
                  </div>
                  <div className="mt-1.5 text-2xl font-black tabular-nums text-brand-blue font-mono tracking-tight">
                    {LIVE_STUDY_DEMO.publicSession.timer}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                    Study Session
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    Étudiants en ligne
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2.5 py-0.5 text-[10px] font-black text-slate-700">
                    <Users size={11} className="text-brand-blue" />
                    {LIVE_STUDY_DEMO.publicSession.participants.length}
                  </div>
                </div>

                <ul className="space-y-2.5">
                  {LIVE_STUDY_DEMO.publicSession.participants.map((p, i) => (
                    <motion.li
                      key={p.name}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.18 + i * 0.07 }}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-white transition-colors"
                    >
                      <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white shadow-sm" style={{ backgroundColor: p.color }}>
                        {p.name.charAt(0)}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-[#071840] leading-none">
                          {p.name}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
                          {p.subject}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        En ligne
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Users size={13} className="text-emerald-600" />
                  <span>{LIVE_STUDY_DEMO.publicSession.participants.length} participants actifs</span>
                </div>
                <button
                  type="button"
                  aria-label="Join Study preview (landing demo)"
                  onClick={(e) => e.preventDefault()}
                  className="group inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(11,94,215,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#094fb8] hover:shadow-[0_18px_34px_-14px_rgba(11,94,215,0.9)]"
                >
                  <MessageCircle size={14} />
                  Join Study
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <div className="mt-5 text-[11px] font-semibold text-slate-500" dir="auto">
                💡 اقرى مع طلبة آخرين في نفس الـBac Section.
              </div>
            </div>
          </motion.div>

          {/* ======================= PRIVATE STUDY SQUAD CARD ======================= */}
          <motion.div
            initial={{ opacity: 0, x: 20, y: 18 }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="relative"
          >
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700 ring-1 ring-amber-500/20">
                <Lock size={12} />
                Private · Study Squad
              </span>
            </div>

            <div className="relative h-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)] sm:p-7">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#071840] via-[#0a2460] to-[#0B5ED7] p-6 text-white">
                <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />

                <div className="relative flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                    <GraduationCap size={11} />
                    My Study Squad
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-300 ring-1 ring-emerald-400/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ready
                  </span>
                </div>

                <h3 className="relative mt-5 text-2xl font-black tracking-tight">
                  {LIVE_STUDY_DEMO.squad.name}
                </h3>

                <div className="relative mt-6 flex -space-x-3">
                  {LIVE_STUDY_DEMO.squad.members.map((m, i) => (
                    <motion.span
                      key={m.name}
                      initial={{ opacity: 0, scale: 0.7, y: 10 }}
                      whileInView={{ opacity: 1, scale: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: 0.22 + i * 0.09 }}
                      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white ring-3 ring-[#0a2460] shadow-lg"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.charAt(0)}
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a2460]" />
                    </motion.span>
                  ))}
                  <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white ring-3 ring-[#0a2460] backdrop-blur-sm">
                    +2
                  </span>
                </div>

                <div className="relative mt-7 rounded-xl bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-amber-300 ring-1 ring-white/10">
                      <Target size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/60">
                        Shared Goal
                      </div>
                      <div className="mt-1 text-sm font-bold text-white/95 leading-snug" dir="auto">
                        {LIVE_STUDY_DEMO.squad.sharedGoal}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 space-y-2">
                  {LIVE_STUDY_DEMO.squad.members.map((m, i) => (
                    <motion.div
                      key={`row-${m.name}`}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.32 + i * 0.08 }}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2 -mx-2 bg-white/0 hover:bg-white/5 transition-colors"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]" />
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white ring-2 ring-white/10" style={{ backgroundColor: m.color }}>
                        {m.name.charAt(0)}
                      </span>
                      <span className="flex-1 text-sm font-bold text-white/95">
                        {m.name}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-400/20">
                        Prêt
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Users size={13} className="text-amber-600" />
                  <span>{LIVE_STUDY_DEMO.squad.members.length} membres privés</span>
                </div>
                <button
                  type="button"
                  aria-label="Start Study preview (landing demo)"
                  onClick={(e) => e.preventDefault()}
                  className="group inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#071840] px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(7,24,64,0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#0a1f54] hover:shadow-[0_18px_34px_-14px_rgba(7,24,64,0.9)]"
                >
                  <PlayCircle size={14} />
                  Start Study
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <div className="mt-5 text-[11px] font-semibold text-slate-500" dir="auto">
                🔒 اعمل groupe privé مع صحابك واقراو مع بعضكم.
              </div>
            </div>
          </motion.div>
        </div>

        {/* ======================= CTA BAND ======================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)] sm:p-10">
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl opacity-70" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl opacity-60" />

            <div className="relative flex flex-col items-center justify-between gap-6 sm:flex-row sm:gap-8">
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  <Zap size={12} />
                  جرّب Live Study
                </span>
                <h3 className="mt-3 text-2xl font-black text-[#071840] sm:text-3xl" dir="auto">
                  ما تضيعش وقت — ابدأ توا.
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base" dir="auto">
                  Crée ton compte gratuitement et rejoins les étudiants tunisiens qui révisent ensemble live.
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <Link
                  to="/register"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#071840] px-8 py-4 text-lg font-extrabold text-white shadow-[0_18px_40px_-14px_rgba(7,24,64,0.75)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-14px_rgba(7,24,64,0.9)] sm:w-auto"
                >
                  ابدأ توا
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* PLANNER + PROGRESS                                                         */
/* -------------------------------------------------------------------------- */

const PlannerProgressSection: React.FC = () => {
  const planner = [
    { h: '08:00', d: 'Maths — Fonctions', dur: '45 min', done: true, color: '#1d4ed8' },
    { h: '10:00', d: 'Physique — Électricité', dur: '30 min', done: true, color: '#0ea5e9' },
    { h: '13:30', d: 'Pause 🥙', dur: '60 min', done: false, color: '#64748b', break: true },
    { h: '16:00', d: 'Exercice — Maths', dur: '20 min', done: false, color: '#059669' },
    { h: '17:00', d: 'Français — Dissertation', dur: '40 min', done: false, color: '#7c3aed' },
  ]

  return (
    <section className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">
            <CalendarDays size={13} /> Planning &amp; Progression
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
            نظّم وقتك وشوف تقدمك
          </h2>
          <p className="mt-4 text-xl font-semibold text-slate-700" dir="auto">
            خلي مراجعتك واضحة كل يوم — وكتّم شكل وين وصلت.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
          {/* PLANNER CARD */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0 shadow-[0_8px_18px_-6px_rgba(217,119,6,0.6)] ring-2 ring-white bg-amber-500">
                  <CalendarDays size={19} />
                </span>
                <div>
                  <div className="font-extrabold text-[#071840] text-lg">Aujourd'hui</div>
                  <div className="text-xs text-slate-500">Lundi · 24 novembre 2025</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-amber-700">3h 15min prévus</div>
                <div className="text-[11px] text-amber-600/80">
                  2/4 séances terminées</div>
              </div>
            </div>

            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-amber-100/60">
              <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
            </div>

            <ul className="space-y-2.5">
              {planner.map((p, i) => {
                const dotCls = 'flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ' +
                  (p.break ? 'bg-slate-100 text-slate-500' : 'bg-white ring-1 shadow-sm')
                const titleCls = 'font-bold text-sm ' +
                  (p.done ? 'text-slate-500 line-through decoration-slate-300/70' : 'text-[#071840]')
                const durCls = 'text-[11px] font-bold ' + (p.done ? 'text-emerald-600' : 'text-slate-500')
                return (
              <li key={i} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-black text-slate-500">{p.h}</span>
                <span className="relative">
                  <span
                    className={dotCls}
                    style={!p.break ? { backgroundColor: p.color + '15', boxShadow: 'inset 0 0 0 1px ' + p.color + '33' } : undefined}
                  >
                    {p.done ? <CheckCircle2 size={18} className="text-emerald-600" /> : p.break ? null : (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    )}
                  </span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className={titleCls}>
                    {p.d}
                  </div>
                </div>
                <span className={durCls}>
                  {p.dur}
                </span>
              </li>
            )})}
            </ul>

            <div className="mt-5 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 py-2 text-center">
                <div className="font-black text-lg text-sky-700">11</div>
                <div>Séances / semaine</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 py-2 text-center">
                <div className="font-black text-lg text-amber-600">~14h</div>
                <div>Par semaine</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 py-2 text-center">
                <div className="font-black text-lg text-emerald-600">87%</div>
                <div>Régularité</div>
              </div>
            </div>
          </motion.div>

          {/* PROGRESS CARD */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-28px_rgba(7,24,64,0.28)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white shrink-0 shadow-[0_8px_18px_-6px_rgba(3,105,161,0.6)] ring-2 ring-white bg-sky-700">
                  <BarChart3 size={19} />
                </span>
                <div>
                  <div className="font-extrabold text-[#071840] text-lg">Ma progression</div>
                  <div className="text-xs text-slate-500">Vue d'ensemble</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#071840] via-brand-blue to-sky-500 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70">Trimestre 1</div>
                  <div className="text-4xl font-black mt-1">68%</div>
                </div>
                <div className="relative h-20 w-20">
                  <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 40 * 0.68} ${2 * Math.PI * 40}`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black">T1</div>
                </div>
              </div>
            </div>

            <ul className="mt-5 space-y-3.5">
              {[
                { name: 'Mathématiques', p: 72, c: '#1d4ed8' },
                { name: 'Physique', p: 61, c: '#0ea5e9' },
                { name: 'Sciences', p: 54, c: '#0891b2' },
                { name: 'Français', p: 48, c: '#7c3aed' },
              ].map((s) => (
                <li key={s.name}>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{s.name}</span>
                  <span style={{ color: s.c }}>{s.p}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full" style={{ width: s.p + '%', backgroundColor: s.c }} />
                </div>
              </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl border border-dashed border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 to-white p-4 text-sm text-slate-700 flex gap-2 items-start">
              <Sparkles size={17} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <b>🔥 Objectif de la semaine :</b> termine « Sens de variation (Maths) + chapitre « Électricité » (Physique) — gagner ~6% supplémentaires.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* TEACHERS + SHOP — reuse real API                                          */
/* -------------------------------------------------------------------------- */

const TeachersShowcase: React.FC = () => {
  const [teachers, setTeachers] = useState<PublicTeacher[]>([])
  useEffect(() => {
    teacherAPI
      .listPublic({ limit: 6 })
      .then((res) => setTeachers((res.data as any)?.teachers || []))
      .catch(() => {})
  }, [])

  if (teachers.length === 0) {
    return (
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">
              <GraduationCap size={13} /> Enseignants
            </div>
            <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
              إلقى الأستاذ المناسب ليك
            </h2>
            <p className="mt-4 text-lg font-semibold text-slate-700" dir="auto">
              تطبيق خاص للتعليم الخصوصي في المستقبل.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { fn: 'Ahmed', ln: 'Ben Salah', subj: 'Prof de Maths', bio: '10 ans d’expérience. Cours particuliers + séries corrigées.' },
              { fn: 'Sarra', ln: 'Mnasri', subj: 'Prof de Physique', bio: 'Explication claire • Bac • Sciences expérimentales.' },
              { fn: 'Khalil', ln: 'Gharbi', subj: 'Prof d’Informatique', bio: 'Algorithmique, Python, bases de données.' },
            ].map((t, i) => (
              <article key={i} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 overflow-hidden">
                    <GraduationCap size={26} className="text-teal-600" />
                  </div>
                  <div>
                    <div className="font-extrabold text-[#071840]">{t.fn} {t.ln}</div>
                    <div className="text-sm font-bold text-teal-700">{t.subj}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{t.bio}</p>
                <div className="mt-5 flex justify-end">
                  <Link to="/teachers" className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-600/20">
                    Voir les profs <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">
            <User size={13} /> L'équipe pédagogique
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
            إلقى الأستاذ المناسب ليك
          </h2>
          <p className="mt-4 text-lg font-semibold text-slate-700">
            Des professeurs prêts à t'aider — cours particuliers et contenus.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((t, index) => (
            <motion.article
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-500/10"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 overflow-hidden">
                  {t.profile?.photo ? (
                    <img src={toAssetUrl(t.profile.photo)} alt={t.firstName} className="h-full w-full object-cover" />
                  ) : (
                    <GraduationCap size={26} className="text-teal-600" />
                  )}
                </div>
                <div>
                  <div className="font-extrabold text-[#071840]">
                    {t.firstName} {t.lastName}
                  </div>
                  {t.profile?.bio && (
                    <p className="line-clamp-2 mt-1 text-sm text-slate-500">{t.profile.bio}</p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Link
                  to={`/teachers/${t.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/10 px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-600/20"
                >
                  Voir le profil <ArrowRight size={15} />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

const TeacherAdsSection: React.FC = () => {
  const [ads, setAds] = useState<TeacherAd[]>([])
  useEffect(() => {
    teacherAdsAPI
      .getPublic()
      .then((res) => setAds(Array.isArray(res.data) ? res.data : (res.data as any)?.items || []))
      .catch(() => {})
  }, [])

  if (ads.length === 0) return null

  return (
    <section className="bg-slate-50/60 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-700/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-700">
            <Megaphone size={13} /> Annonces profs
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
            Des cours particuliers proches
          </h2>
          <p className="mt-4 text-lg font-semibold text-slate-700">
            Contacte-les directement sur WhatsApp.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ads.slice(0, 3).map((ad, index) => {
            const waLink = formatWhatsAppLink(ad.whatsapp)
            return (
              <motion.article
                key={ad.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-blue/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 overflow-hidden">
                    {ad.image ? (
                      <img src={toAssetUrl(ad.image)} alt={ad.teacherName} className="h-14 w-14 rounded-2xl object-cover" />
                    ) : (
                      <GraduationCap size={24} className="text-teal-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-[#071840]">{ad.teacherName}</div>
                    {ad.subject && <div className="text-sm font-bold text-teal-700">{ad.subject}</div>}
                  </div>
                </div>
                {ad.description && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{ad.description}</p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                  {ad.externalLink && (
                    <a href={ad.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-teal-700/10 px-4 py-2 text-sm font-bold text-teal-800 hover:bg-teal-700/20">
                      <ExternalLink size={16} /> Voir
                    </a>
                  )}
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const ShopSection: React.FC = () => {
  const [products, setProducts] = useState<ShopProduct[]>([])
  useEffect(() => {
    shopAPI
      .getPublic()
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : (res.data as any)?.items || []))
      .catch(() => {})
  }, [])

  const hasProducts = products.length > 0
  const demoProducts: ShopProduct[] = [
    { id: 'demo1', name: 'Calculatrice scientifique Casio FX-92', price: 45, description: 'Spéciale lycée / Bac. Mode examen autorisé.' },
    { id: 'demo2', name: 'Cahier 200 pages format A4', price: 8, description: 'Ligné · 90g. Spécial révision Bac.' },
    { id: 'demo3', name: 'Lot fiches de révision', price: 18, description: 'Lot 6 fiches Maths + Physique + Science imprimées.' },
  ]
  const list = hasProducts ? products.slice(0, 3) : demoProducts

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/10 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-rose-700">
            <ShoppingCart size={13} /> Boutique TuniBac
          </div>
          <h2 className="mt-4 text-4xl font-black text-[#071840] sm:text-5xl">
            Fournitures indispensables
          </h2>
          <p className="mt-4 text-lg font-semibold text-slate-700">
            Commande directe sur WhatsApp — livraison partout en Tunisie 🇹🇳.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, index) => {
            const waLink = formatWhatsAppLink(p.whatsapp)
            return (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="aspect-[4/3] w-full bg-gradient-to-br from-blue-50 to-white">
                  {p.image ? (
                    <img
                      src={toAssetUrl(p.image)}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-rose-600/40">
                      <ShoppingBag size={56} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-extrabold text-[#071840]">{p.name}</h3>
                    {typeof p.price === 'number' && (
                      <div className="text-lg font-black text-rose-700">{p.price} DT</div>
                    )}
                    {typeof p.price === 'undefined' && (
                      <div className="text-lg font-black text-rose-700">{demoProducts.find(d => d.id === p.id)?.price ?? ''}</div>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {waLink ? (
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">
                        <MessageCircle size={16} /> Commander
                      </a>
                    ) : (
                      <Link to="/shop" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600">
                        <MessageCircle size={16} /> Commander
                      </Link>
                    )}
                    {p.externalLink && (
                      <a href={p.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-rose-700/10 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-700/20">
                        <ExternalLink size={16} /> Plus d'infos
                      </a>
                    )}
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* FINAL CTA + FOOTER                                                         */
/* -------------------------------------------------------------------------- */

const FinalCTA: React.FC = () => (
  <section className="relative px-6 py-20">
    <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] bg-gradient-to-br from-[#071840] via-[#0c2a70] to-brand-blue-dark px-8 py-14 text-center shadow-[0_30px_80px_rgba(7,29,73,0.35)] md:px-16 relative">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
      <motion.p className="relative text-3xl font-black leading-tight text-white md:text-5xl" dir="auto">
        « ما تبقاش وحدك في المراجعة 🇹🇳 — تونيباك معاك خطوة بخطوة للباك. »
      </motion.p>
      <p className="relative mt-4 text-base text-blue-100 md:text-lg">
        Inscris-toi gratuitement. Commence dès aujourd'hui.
      </p>
      <Link
        to="/register"
        className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-black text-[#071840] transition-transform hover:scale-[1.03]"
      >
        ابدأ توا <ArrowRight size={20} />
      </Link>
    </div>
  </section>
)

const Footer: React.FC = () => (
  <footer className="bg-slate-50/60 border-t border-slate-200/70 py-10 px-6">
    <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#071840] text-white">
            <GraduationCap size={20} />
          </span>
          <span className="font-black text-lg text-[#071840]">TuniBac</span>
        </div>
        <p className="text-sm text-slate-600" dir="auto">
          منصة تونسية للباك — كل ما تحتاجوه للنجاح منظمة وملاك.
        </p>
        <div className="text-xs text-slate-500">© {new Date().getFullYear()} TuniBac · 🇹🇳</div>
      </div>
      <div>
        <h4 className="text-sm font-black text-[#071840] mb-3">Plateforme</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li><Link to="/learning-path" className="hover:text-brand-blue">Parcours</Link></li>
          <li><Link to="/courses" className="hover:text-brand-blue">Cours</Link></li>
          <li><Link to="/study-planner" className="hover:text-brand-blue">Planner</Link></li>
          <li><Link to="/teachers" className="hover:text-brand-blue">Profs</Link></li>
          <li><Link to="/shop" className="hover:text-brand-blue">Boutique</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-black text-[#071840] mb-3">Sections</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>Mathématiques</li>
          <li>Sciences expérimentales</li>
          <li>Économie &amp; Gestion</li>
          <li>Lettres</li>
          <li>Techniques &amp; Sport</li>
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-black text-[#071840] mb-3">Contact</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="inline-flex items-center gap-1.5"><MessageCircle size={14} className="text-emerald-600" /> WhatsApp +216 00 000 000</li>
          <li className="inline-flex items-center gap-1.5"><Megaphone size={14} className="text-brand-blue" /> Annonces &amp; nouveautés</li>
          <li className="inline-flex items-center gap-1.5"><User size={14} className="text-teal-700" /> Espace enseignants</li>
        </ul>
      </div>
    </div>
  </footer>
)

/* -------------------------------------------------------------------------- */
/* ROOT                                                                       */
/* -------------------------------------------------------------------------- */

const LandingPage = () => {
  return (
    <div className="overflow-hidden bg-white">
      <Hero />
      <LearningPathSection />
      <CoursesExercisesSection />
      <LiveStudySection />
      <PlannerProgressSection />
      <TeachersShowcase />
      <TeacherAdsSection />
      <ShopSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}

export default LandingPage
