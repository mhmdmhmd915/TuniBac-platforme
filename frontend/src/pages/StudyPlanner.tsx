import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Clock,
  Target,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Timer,
  X,
  Settings
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { plannerAPI, subjectsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { logger } from '../lib/logger';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  subject: Subject;
  date: string;
  startTime?: string;
  endTime?: string;
  priority?: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  title: string;
  description: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: string;
}

interface PomodoroSettings {
  studyDuration: number;
  breakDuration: number;
  longBreakDuration: number;
}

const PriorityColors: Record<string, string> = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
};

const BAC_DATE = new Date("2027-06-09");

const StudyPlanner = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    subjectId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    priority: 'MEDIUM'
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    return saved ? JSON.parse(saved) : {
      studyDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15
    };
  });
  const [pomodoroPhase, setPomodoroPhase] = useState<'study' | 'break'>(() => {
    const saved = localStorage.getItem('pomodoroPhase');
    return (saved as 'study' | 'break') || 'study';
  });
  const [pomodoroTime, setPomodoroTime] = useState<number>(() => {
    const saved = localStorage.getItem('pomodoroTime');
    return saved ? parseInt(saved, 10) : 25 * 60;
  });
  const [pomodoroRunning, setPomodoroRunning] = useState<boolean>(() => {
    const saved = localStorage.getItem('pomodoroRunning');
    return saved === 'true';
  });
  const [todaysPomodoros, setTodaysPomodoros] = useState<number>(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`todaysPomodoros_${today}`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [pomodoroNotification, setPomodoroNotification] = useState<string | null>(null);
  const [stopwatchTime, setStopwatchTime] = useState<number>(() => {
    const saved = localStorage.getItem('studyStopwatchTime');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [stopwatchRunning, setStopwatchRunning] = useState<boolean>(() => {
    const saved = localStorage.getItem('studyStopwatchRunning');
    return saved === 'true';
  });
  const [bacDaysRemaining, setBacDaysRemaining] = useState<number>(0);
  const calendarRef = useRef<FullCalendar>(null);
  const stopwatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pomodoroIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksRes, subjectsRes] = await Promise.all([
        plannerAPI.getTasks(),
        subjectsAPI.getAll({
          activeOnly: true,
          bacSection: user?.role === 'ADMIN' ? undefined : user?.bacSection,
        })
      ]);
      setTasks(tasksRes.data);
      setSubjects(subjectsRes.data);
      if (subjectsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, subjectId: subjectsRes.data[0].id }));
      }
    } catch (err) {
      logger.error('Error fetching data', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.bacSection, user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getEvents = useCallback((): EventInput[] => {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      start: task.startTime ? `${task.date.split('T')[0]}T${task.startTime}` : task.date.split('T')[0],
      end: task.endTime ? `${task.date.split('T')[0]}T${task.endTime}` : undefined,
      backgroundColor: task.completed ? '#6B7280' : task.subject?.color || '#3B82F6',
      borderColor: task.completed ? '#6B7280' : task.subject?.color || '#3B82F6',
      textColor: '#FFFFFF',
      extendedProps: {
        description: task.description,
        subjectId: task.subjectId,
        priority: task.priority,
        completed: task.completed
      }
    }));
  }, [tasks]);

  const calculateBacDaysRemaining = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bacDateOnly = new Date(BAC_DATE);
    bacDateOnly.setHours(0, 0, 0, 0);
    const diffTime = bacDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setBacDaysRemaining(diffDays);
  }, []);

  useEffect(() => {
    calculateBacDaysRemaining();
    const interval = setInterval(calculateBacDaysRemaining, 60000);
    return () => clearInterval(interval);
  }, [calculateBacDaysRemaining]);

  const getStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    };

    return { total, completed, pending, completionRate, studyTime: formatTime(stopwatchTime), pomodoros: todaysPomodoros };
  };

  const getTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.date.split('T')[0] === today);
  };

  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return tasks
      .filter(t => t.date.split('T')[0] >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 7);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      description: '',
      subjectId: subjects.length > 0 ? subjects[0].id : '',
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      priority: 'MEDIUM'
    });
    setIsEditMode(false);
    setEditingTaskId(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setFormData({
      title: task.title,
      description: task.description || '',
      subjectId: task.subjectId,
      date: task.date.split('T')[0],
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      priority: task.priority || 'MEDIUM'
    });
    setIsEditMode(true);
    setEditingTaskId(task.id);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (isEditMode && editingTaskId) {
        await plannerAPI.updateTask(editingTaskId, formData);
        setSuccess('Task updated successfully!');
      } else {
        await plannerAPI.createTask(formData);
        setSuccess('Task created successfully!');
      }
      await fetchData();
      setIsModalOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      logger.error('Error saving task', err);
      const errorMsg = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMsg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await plannerAPI.deleteTask(id);
      await fetchData();
      setSuccess('Task deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      logger.error('Error deleting task', err);
    }
  };

  const handleToggleComplete = async (id: string) => {
    try {
      await plannerAPI.toggleComplete(id);
      await fetchData();
    } catch (err) {
      logger.error('Error toggling task complete', err);
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const date = selectInfo.startStr.split('T')[0];
    setFormData(prev => ({ 
      ...prev, 
      date, 
      subjectId: subjects.length > 0 ? subjects[0].id : '' 
    }));
    setIsEditMode(false);
    setEditingTaskId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const task = tasks.find(t => t.id === clickInfo.event.id);
    if (task) {
      handleOpenEditModal(task);
    }
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const task = tasks.find(t => t.id === dropInfo.event.id);
    if (task) {
      const newDate = dropInfo.event.startStr.split('T')[0];
      let newStartTime = task.startTime;
      let newEndTime = task.endTime;
      
      if (dropInfo.event.start && task.startTime) {
        newStartTime = dropInfo.event.start.toISOString().split('T')[1].substring(0, 5);
      }
      
      if (dropInfo.event.end && task.endTime) {
        newEndTime = dropInfo.event.end.toISOString().split('T')[1].substring(0, 5);
      }

      try {
        await plannerAPI.updateTask(task.id, {
          ...task,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime
        });
        await fetchData();
      } catch (err) {
        logger.error('Error updating task', err);
        dropInfo.revert();
      }
    }
  };

  const handleEventResize = async (resizeInfo: any) => {
    const task = tasks.find(t => t.id === resizeInfo.event.id);
    if (task) {
      const newEndTime = resizeInfo.event.end?.toISOString().split('T')[1].substring(0, 5);
      try {
        await plannerAPI.updateTask(task.id, {
          ...task,
          endTime: newEndTime
        });
        await fetchData();
      } catch (err) {
        logger.error('Error resizing task', err);
        resizeInfo.revert();
      }
    }
  };

  const formatStopwatchTime = (time: number) => {
    const hours = Math.floor(time / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const toggleStopwatch = () => {
    setStopwatchRunning(!stopwatchRunning);
  };

  const resetStopwatch = () => {
    if (confirm('Are you sure you want to reset the stopwatch?')) {
      setStopwatchTime(0);
      setStopwatchRunning(false);
    }
  };

  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(prev => {
          const newTime = prev + 1;
          localStorage.setItem('studyStopwatchTime', newTime.toString());
          return newTime;
        });
      }, 1000);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    }

    localStorage.setItem('studyStopwatchRunning', stopwatchRunning.toString());
    localStorage.setItem('studyStopwatchLastUpdate', Date.now().toString());

    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [stopwatchRunning]);

  const formatPomodoroTime = (time: number) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      logger.error('Error playing sound', e);
    }
  };

  const togglePomodoro = () => {
    setPomodoroRunning(!pomodoroRunning);
  };

  const resetPomodoro = () => {
    const duration = pomodoroPhase === 'study' ? pomodoroSettings.studyDuration : pomodoroSettings.breakDuration;
    setPomodoroTime(duration * 60);
    setPomodoroRunning(false);
    setPomodoroNotification(null);
  };

  const skipBreak = () => {
    setPomodoroPhase('study');
    setPomodoroTime(pomodoroSettings.studyDuration * 60);
    setPomodoroRunning(false);
    setPomodoroNotification(null);
  };

  const saveSettings = () => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings));
    if (!pomodoroRunning) {
      const duration = pomodoroPhase === 'study' ? pomodoroSettings.studyDuration : pomodoroSettings.breakDuration;
      setPomodoroTime(duration * 60);
    }
    setIsSettingsModalOpen(false);
    setSuccess('Settings saved successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  useEffect(() => {
    if (pomodoroRunning && pomodoroTime > 0) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            playNotificationSound();
            if (pomodoroPhase === 'study') {
              const today = new Date().toISOString().split('T')[0];
              const newCount = todaysPomodoros + 1;
              setTodaysPomodoros(newCount);
              localStorage.setItem(`todaysPomodoros_${today}`, newCount.toString());
              setPomodoroNotification('Study session completed.\nTime for a break.');
              setPomodoroPhase('break');
              return pomodoroSettings.breakDuration * 60;
            } else {
              setPomodoroNotification('Break finished.\nReady to study.');
              setPomodoroPhase('study');
              return pomodoroSettings.studyDuration * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    }

    localStorage.setItem('pomodoroPhase', pomodoroPhase);
    localStorage.setItem('pomodoroTime', pomodoroTime.toString());
    localStorage.setItem('pomodoroRunning', pomodoroRunning.toString());

    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [pomodoroRunning, pomodoroTime, pomodoroPhase, pomodoroSettings, todaysPomodoros]);

  const stats = getStats();
  const todayTasks = getTodayTasks();
  const upcomingTasks = getUpcomingTasks();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-24 bg-secondary-light/40 dark:bg-secondary/40 rounded-3xl"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-secondary-light/40 dark:bg-secondary/40 rounded-3xl"></div>
            ))}
          </div>
          <div className="h-96 bg-secondary-light/40 dark:bg-secondary/40 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-center font-medium">
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center font-medium">
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      
      <header className="text-center space-y-4 mb-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-light dark:text-text flex items-center justify-center gap-3">
            <CalendarIcon size={40} />
            Study Planner
          </h1>
        </motion.div>
        <p className="text-base sm:text-lg text-text-muted-light dark:text-text-muted max-w-2xl mx-auto leading-relaxed">
          Organize your bac revision schedule efficiently.
        </p>
        <div className="flex justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenCreateModal}
            className="px-6 sm:px-8 py-3 rounded-full text-sm sm:text-base font-semibold bg-accent text-primary hover:bg-accent/90 hover:shadow-xl hover:shadow-accent/30 transition-all duration-250 flex items-center gap-2"
          >
            <Plus size={18} />
            New Task
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-6 sm:px-8 py-3 rounded-full text-sm sm:text-base font-semibold bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-all duration-250 flex items-center gap-2 border border-black/5 dark:border-white/5"
          >
            <Settings size={18} />
            Settings
          </motion.button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
              <CalendarIcon size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted">Total Tasks</p>
              <p className="text-2xl font-bold text-text-light dark:text-text">{stats.total}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-500/10 text-green-400">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted">Completed</p>
              <p className="text-2xl font-bold text-text-light dark:text-text">{stats.completed}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400">
              <XCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted">Pending</p>
              <p className="text-2xl font-bold text-text-light dark:text-text">{stats.pending}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
              <Target size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted">Completion</p>
              <p className="text-2xl font-bold text-text-light dark:text-text">{stats.completionRate}%</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted">Study Time</p>
              <p className="text-2xl font-bold text-text-light dark:text-text">{stats.studyTime}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400">
              <Timer size={24} />
            </div>
            <div>
              <p className="text-sm text-text-muted-light dark:text-text-muted">Today's Pomodoros</p>
              <p className="text-2xl font-bold text-text-light dark:text-text">{stats.pomodoros}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <Target size={32} className="text-purple-400" />
            </div>
            <p className="text-sm text-text-muted-light dark:text-text-muted mb-1">
              {bacDaysRemaining > 0 ? 'Days Until Bac' : 'The exam has started'}
            </p>
            <p className="text-4xl font-bold text-purple-400">
              {bacDaysRemaining > 0 ? bacDaysRemaining : '🎉'}
            </p>
            {bacDaysRemaining > 0 && <p className="text-xs text-text-muted-light dark:text-text-muted mt-1">2027-06-09</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <h3 className="text-lg font-semibold text-text-light dark:text-text mb-4 flex items-center justify-center gap-2">
            <Clock size={20} />
            Study Stopwatch
          </h3>
          <div className="text-center mb-4">
            <p className="text-4xl font-mono font-bold text-text-light dark:text-text">{formatStopwatchTime(stopwatchTime)}</p>
          </div>
          <div className="flex justify-center gap-3">
            <button onClick={toggleStopwatch} className="px-4 py-2 rounded-xl bg-accent text-primary font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2">
              {stopwatchRunning ? <Pause size={18} /> : <Play size={18} />}
              {stopwatchRunning ? 'Pause' : 'Start'}
            </button>
            <button onClick={resetStopwatch} className="px-4 py-2 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text font-semibold hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-colors flex items-center gap-2">
              <RotateCcw size={18} />
              Reset
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
          <h3 className="text-lg font-semibold text-text-light dark:text-text mb-4 flex items-center justify-center gap-2">
            <Timer size={20} />
            Pomodoro Timer
          </h3>
          
          {pomodoroNotification && (
            <div className="mb-4 p-3 rounded-xl bg-accent/10 text-center text-sm font-semibold text-accent whitespace-pre-line">
              {pomodoroNotification}
            </div>
          )}
          
          <div className="text-center mb-4">
            <p className="text-xs text-text-muted-light dark:text-text-muted mb-1 uppercase tracking-wider">
              {pomodoroPhase === 'study' ? 'Study Session' : 'Break Session'}
            </p>
            <p className="text-4xl font-mono font-bold text-text-light dark:text-text">{formatPomodoroTime(pomodoroTime)}</p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <button onClick={togglePomodoro} className="px-4 py-2 rounded-xl bg-accent text-primary font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2">
              {pomodoroRunning ? <Pause size={18} /> : <Play size={18} />}
              {pomodoroRunning ? 'Pause' : 'Start'}
            </button>
            <button onClick={resetPomodoro} className="px-4 py-2 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text font-semibold hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-colors flex items-center gap-2">
              <RotateCcw size={18} />
              Reset
            </button>
            {pomodoroPhase === 'break' && (
              <button onClick={skipBreak} className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 font-semibold hover:bg-green-500/20 transition-colors flex items-center gap-2">
                <SkipForward size={18} />
                Skip Break
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.55 }} className="space-y-4">
          <div className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
            <h3 className="text-lg font-semibold text-text-light dark:text-text mb-4 flex items-center gap-2">
              <CalendarIcon size={20} />
              Today's Tasks
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-text-muted-light dark:text-text-muted text-sm">No tasks for today. Enjoy your day!</p>
            ) : (
              <div className="space-y-3">
                {todayTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-2xl bg-secondary-light/40 dark:bg-secondary/40">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleComplete(task.id)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200" style={{ borderColor: task.completed ? '#6B7280' : task.subject?.color, backgroundColor: task.completed ? '#6B7280' : 'transparent' }}>
                        {task.completed && <CheckCircle size={14} color="#FFFFFF" />}
                      </button>
                      <div>
                        <p className={`text-sm font-semibold ${task.completed ? 'line-through text-text-muted-light dark:text-text-muted' : 'text-text-light dark:text-text'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${(task.completed ? '#6B7280' : task.subject?.color)}20`, color: task.completed ? '#6B7280' : task.subject?.color, border: `1px solid ${(task.completed ? '#6B7280' : task.subject?.color)}30` }}>
                            {task.subject?.name}
                          </span>
                          {task.startTime && <span className="text-xs text-text-muted-light dark:text-text-muted flex items-center gap-1"><Clock size={10} />{task.startTime}</span>}
                          {task.priority && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${PriorityColors[task.priority]}20`, color: PriorityColors[task.priority] }}>
                            {task.priority}
                          </span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenEditModal(task)} className="p-1.5 rounded-lg hover:bg-secondary-light/60 dark:hover:bg-secondary/60 transition-colors"><Edit size={16} className="text-text-muted-light dark:text-text-muted" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={16} className="text-red-400" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-morphism p-6 rounded-3xl border border-black/5 dark:border-white/5">
            <h3 className="text-lg font-semibold text-text-light dark:text-text mb-4 flex items-center gap-2">
              <CalendarIcon size={20} />
              Upcoming Tasks
            </h3>
            {upcomingTasks.length === 0 ? (
              <p className="text-text-muted-light dark:text-text-muted text-sm">No upcoming tasks scheduled.</p>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-2xl bg-secondary-light/40 dark:bg-secondary/40">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: task.completed ? '#6B7280' : task.subject?.color }}></div>
                      <div>
                        <p className={`text-sm font-semibold ${task.completed ? 'line-through text-text-muted-light dark:text-text-muted' : 'text-text-light dark:text-text'}`}>{task.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted-light dark:text-text-muted">
                            {new Date(task.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          {task.priority && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${PriorityColors[task.priority]}20`, color: PriorityColors[task.priority] }}>
                            {task.priority}
                          </span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="lg:col-span-2">
          <div className="glass-morphism p-6 sm:p-7 rounded-3xl border border-black/5 dark:border-white/5">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              height="auto"
              events={getEvents()}
              selectable={true}
              editable={true}
              eventStartEditable={true}
              eventDurationEditable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              buttonText={{
                today: 'Today',
                month: 'Month',
                week: 'Week',
                day: 'Day'
              }}
            />
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="glass-morphism w-full max-w-md rounded-3xl border border-black/5 dark:border-white/5 p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-light dark:text-text">{isEditMode ? 'Edit Task' : 'New Task'}</h2>
                <button onClick={handleCloseModal} className="p-2 rounded-full hover:bg-secondary-light/40 dark:hover:bg-secondary/40 transition-colors"><X size={24} className="text-text-muted-light dark:text-text-muted" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Title</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} required className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" placeholder="Enter task title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" rows={3} placeholder="Enter task description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Subject</label>
                  <select value={formData.subjectId} onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50">
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Date</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} required className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Start Time</label>
                    <input type="time" value={formData.startTime} onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text mb-2">End Time</label>
                    <input type="time" value={formData.endTime} onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text font-semibold hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-accent text-primary font-semibold hover:bg-accent/90 transition-colors">
                    {isEditMode ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsSettingsModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="glass-morphism w-full max-w-md rounded-3xl border border-black/5 dark:border-white/5 p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-light dark:text-text">Pomodoro Settings</h2>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 rounded-full hover:bg-secondary-light/40 dark:hover:bg-secondary/40 transition-colors"><X size={24} className="text-text-muted-light dark:text-text-muted" /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Study Duration (minutes)</label>
                  <input type="number" value={pomodoroSettings.studyDuration} onChange={(e) => setPomodoroSettings(prev => ({ ...prev, studyDuration: parseInt(e.target.value) }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Break Duration (minutes)</label>
                  <input type="number" value={pomodoroSettings.breakDuration} onChange={(e) => setPomodoroSettings(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-light dark:text-text mb-2">Long Break Duration (minutes)</label>
                  <input type="number" value={pomodoroSettings.longBreakDuration} onChange={(e) => setPomodoroSettings(prev => ({ ...prev, longBreakDuration: parseInt(e.target.value) }))} className="w-full px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text border border-black/5 dark:border-white/5 focus:outline-none focus:border-accent/50" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsSettingsModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl bg-secondary-light/40 dark:bg-secondary/40 text-text-light dark:text-text font-semibold hover:bg-secondary-light/70 dark:hover:bg-secondary/70 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveSettings} className="flex-1 px-4 py-3 rounded-xl bg-accent text-primary font-semibold hover:bg-accent/90 transition-colors">
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudyPlanner;
