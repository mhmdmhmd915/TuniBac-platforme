import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Users, ArrowLeft, Crown, Copy, Check, Loader2, Plus, X, Trash2, Settings,
  LogOut, Pencil, CheckCircle2, Send, PlayCircle, Clock, Target, CalendarDays,
  MessageCircle, ClipboardList, UserX, RefreshCw, ArrowRight,
} from 'lucide-react';
import { studySquadAPI, liveStudyAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socketClient';

type Member = { id: string; userId: string; role: 'OWNER' | 'MEMBER'; joinedAt: string; user?: { id: string; firstName: string; lastName: string; bacSection?: string } };
type Invitation = { id: string; inviterId: string; inviteeId: string; status: string; createdAt: string; expiresAt: string; inviter?: { firstName: string; lastName: string }; invitee?: { firstName: string; lastName: string; phone: string } };
type SquadGoal = { id: string; title: string; description?: string; targetDate?: string; progress: number; completed: boolean; createdAt: string; updatedAt: string };
type ChatMsg = { id: string; squadId: string; userId: string; content: string; createdAt: string; user?: { id: string; firstName: string; lastName: string } };
type SquadSession = { id: string; title: string; status: string; startedAt: string; endedAt?: string; participantCount?: number };
type Stats = { totalMinutes: number; completedSessions: number; activeSessions: number; activeMembers: number; perMemberMinutes?: Record<string, number> };

type SquadDetail = {
  id: string; name: string; invitationCode: string; ownerId: string; bacSection: string; status: string;
  createdAt: string; updatedAt: string;
  owner?: { id: string; firstName: string; lastName: string };
  members: Member[]; invitations: Invitation[]; goal?: SquadGoal | null;
  chatMessages?: ChatMsg[]; studySessions?: SquadSession[]; stats?: Stats;
  myRole?: 'OWNER' | 'MEMBER';
};

const fmtMin = (m?: number) => {
  const n = Number(m || 0);
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const mm = n % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
};
const fmtDate = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
};
const fmtTime = (d?: string) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    const now = new Date();
    const diff = now.getTime() - dt.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return dt.toLocaleDateString();
  } catch { return d; }
};

const Detail = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<SquadDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [startStudyLoading, setStartStudyLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState<Record<string, boolean>>({});
  const [cancelInvLoading, setCancelInvLoading] = useState<Record<string, boolean>>({});
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [disbandLoading, setDisbandLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [goalForm, setGoalForm] = useState<{ title: string; description: string; targetDate: string; progress: number; completed: boolean }>({ title: '', description: '', targetDate: '', progress: 0, completed: false });
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalLoading, setGoalLoading] = useState(false);
  const membershipGatesRef = useRef<{ hasChatListener: boolean; hasSquadUpdateListener: boolean }>({ hasChatListener: false, hasSquadUpdateListener: false });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErr(null);
      const data = await studySquadAPI.getSquad(id);
      setSquad(data?.id ? data : (data as any)?.squad || null);
      if (data && !data.id && (data as any)?.squad?.id) {
        // already handled
      }
      const sq = data?.id ? data : (data as any)?.squad || null;
      if (sq?.goal) {
        setGoalForm({
          title: sq.goal.title || '',
          description: sq.goal.description || '',
          targetDate: sq.goal.targetDate ? new Date(sq.goal.targetDate).toISOString().slice(0, 10) : '',
          progress: Number(sq.goal.progress || 0),
          completed: !!sq.goal.completed,
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load squad';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    try {
      const s = getSocket();
      const onChat = (payload: any) => {
        if (!payload) return;
        const squadId = payload.squadId || payload.message?.squadId;
        if (squadId && squadId !== id) return;
        const incoming = payload.message || payload;
        if (!incoming?.id) return;
        setSquad((prev) => {
          if (!prev) return prev;
          const msgs = Array.isArray(prev.chatMessages) ? prev.chatMessages.slice() : [];
          if (msgs.some((m) => m.id === incoming.id)) return prev;
          msgs.push(incoming);
          return { ...prev, chatMessages: msgs };
        });
      };
      const onUpdate = (payload: any) => {
        if (payload?.squadId && payload.squadId !== id) return;
        load();
      };
      const onInv = () => load();
      s.on(`study-squad:chat:${id}`, onChat);
      s.on('study-squad:chat', onChat);
      if (!membershipGatesRef.current.hasSquadUpdateListener) {
        s.on('study-squad:update', onUpdate);
        s.on('study-squad:invitations:new', onInv);
        membershipGatesRef.current.hasSquadUpdateListener = true;
      }
      return () => {
        s.off(`study-squad:chat:${id}`, onChat);
        s.off('study-squad:chat', onChat);
        // don't remove squad:update since singleton app, but safe to leave
      };
    } catch (_e) { /* ignore */ }
  }, [id, load]);

  useEffect(() => {
    try { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }, [squad?.chatMessages?.length]);

  const members = squad?.members || [];
  const invitations = squad?.invitations || [];
  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING');
  const chat = Array.isArray(squad?.chatMessages) ? squad.chatMessages : [];
  const sessions = Array.isArray(squad?.studySessions) ? squad.studySessions : [];
  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE');
  const stats = squad?.stats;
  const isOwner = squad?.myRole === 'OWNER' || squad?.ownerId === user?.id;

  const copyCode = async () => {
    if (!squad?.invitationCode) return;
    try { await navigator.clipboard.writeText(squad.invitationCode); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startStudy = async () => {
    if (!squad?.id) return;
    try {
      setStartStudyLoading(true);
      const session = await liveStudyAPI.createSession({
        title: `${squad.name} Live Study`,
        studySquadId: squad.id,
      });
      const sid = session?.id || session?.session?.id;
      if (sid) nav(`/live-study/${sid}`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to start study session');
    } finally {
      setStartStudyLoading(false);
    }
  };

  const inviteByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squad?.id || !invitePhone.trim()) return;
    try {
      setInviteError(null);
      setInviteSuccess(null);
      setInviteLoading(true);
      await studySquadAPI.inviteByPhone(squad.id, { phone: invitePhone.trim() });
      setInviteSuccess(`Invitation sent to ${invitePhone.trim()}`);
      setInvitePhone('');
      await load();
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (e: any) {
      setInviteError(e?.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const cancelInv = async (invId: string) => {
    if (!squad?.id) return;
    try {
      setCancelInvLoading((p) => ({ ...p, [invId]: true }));
      await studySquadAPI.cancelInvitation(squad.id, invId);
      await load();
    } finally {
      setCancelInvLoading((p) => ({ ...p, [invId]: false }));
    }
  };

  const removeMember = async (userId: string) => {
    if (!squad?.id || userId === user?.id) return;
    if (!confirm('Remove this member from the squad?')) return;
    try {
      setRemoveLoading((p) => ({ ...p, [userId]: true }));
      await studySquadAPI.removeMember(squad.id, userId);
      await load();
    } finally {
      setRemoveLoading((p) => ({ ...p, [userId]: false }));
    }
  };

  const doRename = async () => {
    if (!squad?.id || !renameValue.trim()) return;
    try {
      setRenameLoading(true);
      await studySquadAPI.renameSquad(squad.id, { name: renameValue.trim() });
      await load();
      setRenameOpen(false);
      setRenameValue('');
    } finally {
      setRenameLoading(false);
    }
  };

  const leaveSquad = async () => {
    if (!squad?.id) return;
    if (isOwner) { alert('Owner cannot leave the squad. Disband it instead or transfer ownership.'); return; }
    if (!confirm('Leave this squad?')) return;
    try {
      setLeaveLoading(true);
      await studySquadAPI.leaveSquad(squad.id);
      nav('/study-squads');
    } finally {
      setLeaveLoading(false);
    }
  };

  const disbandSquad = async () => {
    if (!squad?.id || !isOwner) return;
    if (!confirm(`Permanently disband "${squad.name}"? This cannot be undone. Active sessions will be closed.`)) return;
    try {
      setDisbandLoading(true);
      await studySquadAPI.disbandSquad(squad.id);
      nav('/study-squads');
    } finally {
      setDisbandLoading(false);
    }
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squad?.id || !chatInput.trim()) return;
    const content = chatInput.trim();
    setChatInput('');
    try {
      setChatLoading(true);
      const out = await studySquadAPI.sendChatMessage(squad.id, { content });
      if (out?.id) {
        setSquad((prev) => {
          if (!prev) return prev;
          const msgs = Array.isArray(prev.chatMessages) ? prev.chatMessages.slice() : [];
          if (!msgs.some((m) => m.id === out.id)) msgs.push(out);
          return { ...prev, chatMessages: msgs };
        });
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to send');
      setChatInput(content);
    } finally {
      setChatLoading(false);
    }
  };

  const saveGoal = async () => {
    if (!squad?.id) return;
    if (!goalForm.title.trim()) { alert('Goal title is required'); return; }
    try {
      setGoalLoading(true);
      const payload = {
        title: goalForm.title.trim(),
        description: goalForm.description.trim() || undefined,
        targetDate: goalForm.targetDate || undefined,
        progress: Math.max(0, Math.min(100, Number(goalForm.progress || 0))),
        completed: !!goalForm.completed,
      };
      const saved = await studySquadAPI.upsertGoal(squad.id, payload);
      if (saved) {
        setSquad((prev) => prev ? { ...prev, goal: saved } : prev);
      }
      setGoalEditOpen(false);
    } finally {
      setGoalLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center gap-2 text-slate-500"><Loader2 size={20} className="animate-spin" /> Loading squad...</div>;
  }
  if (err) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-500 flex items-center justify-center mb-4"><X size={28} /></div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Can't open this squad</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{err}</p>
          <Link to="/study-squads" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold">
            <ArrowLeft size={16} /> Back to Study Squads
          </Link>
        </div>
      </div>
    );
  }
  if (!squad) return null;

  const membersSorted = useMemo(() => members.slice().sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : 0)), [members]);
  const totalMin = Number(stats?.totalMinutes || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/study-squads" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Back">
          <ArrowLeft size={18} />
        </Link>
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
          {squad.name?.[0]?.toUpperCase() || 'S'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{squad.name}</h1>
            {isOwner && <span title="Owner"><Crown size={16} className="text-amber-500 shrink-0" /></span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono tracking-wide">
              {squad.invitationCode}
              <button onClick={copyCode} className="hover:text-sky-600 dark:hover:text-sky-400" title="Copy invitation code">
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </span>
            <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>Created {fmtDate(squad.createdAt)}</span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          {settingsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSettingsOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
                {isOwner && (
                  <button
                    onClick={() => { setRenameValue(squad.name); setRenameOpen(true); setSettingsOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Pencil size={15} /> Rename squad
                  </button>
                )}
                {!isOwner && (
                  <button
                    disabled={leaveLoading}
                    onClick={leaveSquad}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
                  >
                    <LogOut size={15} /> {leaveLoading ? 'Leaving...' : 'Leave squad'}
                  </button>
                )}
                {isOwner && (
                  <button
                    disabled={disbandLoading}
                    onClick={disbandSquad}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 border-t border-slate-100 dark:border-slate-800"
                  >
                    <Trash2 size={15} /> {disbandLoading ? 'Disbanding...' : 'Disband squad'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {renameOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Rename squad</h3>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
              maxLength={60}
            />
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setRenameOpen(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button disabled={renameLoading || !renameValue.trim()} onClick={doRename} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-semibold">
                {renameLoading ? <><Loader2 size={14} className="animate-spin inline mr-1" />Saving</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><PlayCircle size={18} className="text-emerald-500" /> Private Live Study</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Start the existing Live Study room - private to this squad only</p>
              </div>
              <button
                onClick={startStudy}
                disabled={startStudyLoading || activeSessions.length > 0}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all"
              >
                {startStudyLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                {activeSessions.length > 0 ? 'Session running' : 'Start Live Study'}
              </button>
            </div>
            {activeSessions.length > 0 && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-3">
                  <span className="relative flex w-2 h-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
                  Active private session{activeSessions.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-2">
                  {activeSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Started {fmtTime(s.startedAt)} · {s.participantCount || 0} participant{(s.participantCount || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Link to={`/live-study/${s.id}`} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
                        Join <ArrowRight size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeSessions.length === 0 && sessions.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none">
                  View past sessions ({sessions.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {sessions.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-950/40">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 dark:text-slate-200 text-sm truncate">{s.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(s.startedAt)} · {fmtTime(s.startedAt)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${s.status === 'CLOSED' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Target size={18} className="text-sky-600" /> Shared Goal
                {squad.goal?.completed && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold"><CheckCircle2 size={12} /> Completed</span>}
              </h2>
              <button
                onClick={() => setGoalEditOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium"
              >
                {goalEditOpen ? 'Cancel' : squad.goal ? <><Pencil size={12} /> Edit</> : <><Plus size={12} /> Add</>}
              </button>
            </div>
            {goalEditOpen ? (
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/30">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Goal title</label>
                  <input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="e.g. نكمل Math chapitre 4 قبل الجمعة" maxLength={140} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                  <textarea value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} rows={2} maxLength={1000} placeholder="Optional details..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30 text-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><CalendarDays size={12} /> Target date</label>
                    <input type="date" value={goalForm.targetDate} onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Progress {goalForm.progress || 0}%</label>
                    <input type="range" min={0} max={100} value={goalForm.progress} onChange={(e) => setGoalForm({ ...goalForm, progress: Number(e.target.value) })} className="w-full accent-sky-600 mt-2" />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input type="checkbox" checked={goalForm.completed} onChange={(e) => setGoalForm({ ...goalForm, completed: e.target.checked })} className="accent-emerald-600 w-4 h-4" />
                  Mark as completed
                </label>
                <div className="flex justify-end">
                  <button onClick={saveGoal} disabled={goalLoading || !goalForm.title.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-semibold">
                    {goalLoading && <Loader2 size={14} className="animate-spin" />} {squad.goal ? 'Save changes' : 'Add goal'}
                  </button>
                </div>
              </div>
            ) : squad.goal ? (
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{squad.goal.title}</p>
                    {squad.goal.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{squad.goal.description}</p>}
                    {squad.goal.targetDate && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1"><CalendarDays size={12} /> Due {fmtDate(squad.goal.targetDate)}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{squad.goal.progress || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${squad.goal.completed ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${squad.goal.progress || 0}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Target size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No shared goal yet</p>
                <button onClick={() => setGoalEditOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"><Plus size={12} /> Add the squad goal</button>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 520 }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><MessageCircle size={18} className="text-sky-600" /> Squad Chat</h2>
              <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Refresh"><RefreshCw size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/20">
              {chat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <MessageCircle size={32} className="text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Say hi to your squad!</p>
                </div>
              ) : chat.map((m) => {
                const isMe = m.userId === user?.id;
                const fn = m.user?.firstName || 'Member';
                const ln = m.user?.lastName || '';
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {!isMe && <span className="text-[11px] text-slate-500 dark:text-slate-400 px-1">{fn}{ln ? ` ${ln[0]}.` : ''}</span>}
                      <div className={`rounded-2xl px-3.5 py-2 text-sm ${isMe ? 'bg-sky-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-md shadow-sm'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                      <span className={`text-[10px] ${isMe ? 'text-sky-100/80' : 'text-slate-400 dark:text-slate-500'} px-1`}>{fmtTime(m.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={sendChat} className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80">
              <div className="flex items-center gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-sm"
                  maxLength={1000}
                />
                <button disabled={chatLoading || !chatInput.trim()} className="shrink-0 p-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white" title="Send">
                  {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><ClipboardList size={18} className="text-amber-500" /> Statistics</h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard icon={<Clock size={16} />} label="Total study" value={fmtMin(totalMin)} tone="sky" />
              <StatCard icon={<CheckCircle2 size={16} />} label="Completed" value={String(stats?.completedSessions || 0)} tone="emerald" />
              <StatCard icon={<PlayCircle size={16} />} label="Active sessions" value={String(activeSessions.length || 0)} tone="violet" />
              <StatCard icon={<Users size={16} />} label="Active members" value={String(stats?.activeMembers || members.length)} tone="amber" />
            </div>
            {stats?.perMemberMinutes && Object.keys(stats.perMemberMinutes).length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Per-member study time</p>
                <div className="space-y-2">
                  {membersSorted.map((m) => {
                    const min = Number(stats.perMemberMinutes?.[m.userId] || 0);
                    const max = Math.max(1, ...Object.values(stats.perMemberMinutes || {}).map((v) => Number(v || 0)));
                    const pct = Math.round((min / max) * 100);
                    const name = [m.user?.firstName || '', m.user?.lastName || ''].filter(Boolean).join(' ') || 'Member';
                    return (
                      <div key={m.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                            {name}
                            {m.role === 'OWNER' && <Crown size={10} className="text-amber-500" />}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono">{fmtMin(min)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Users size={18} className="text-sky-600" /> Members & Invitations</h2>

            <div className="space-y-1.5 mb-5">
              {membersSorted.map((m) => {
                const name = [m.user?.firstName || '', m.user?.lastName || ''].filter(Boolean).join(' ') || 'Member';
                const initials = name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{name}</p>
                        {m.role === 'OWNER' && <Crown size={12} className="text-amber-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Joined {fmtDate(m.joinedAt)}</p>
                    </div>
                    {isOwner && m.userId !== user?.id && (
                      <button
                        onClick={() => removeMember(m.userId)}
                        disabled={removeLoading[m.userId]}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 disabled:opacity-50"
                        title="Remove member"
                      >
                        {removeLoading[m.userId] ? <Loader2 size={14} className="animate-spin" /> : <UserX size={15} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {isOwner && (
              <>
                <form onSubmit={inviteByPhone} className="mb-5 border-t border-slate-100 dark:border-slate-800 pt-5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Invite by phone</label>
                  <div className="flex gap-2">
                    <input
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      placeholder="99000002"
                      maxLength={20}
                      inputMode="tel"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 text-sm"
                    />
                    <button
                      disabled={inviteLoading || !invitePhone.trim()}
                      className="shrink-0 inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
                      type="submit"
                    >
                      {inviteLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Invite
                    </button>
                  </div>
                  {inviteError && <p className="text-xs text-red-500 mt-2">{inviteError}</p>}
                  {inviteSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{inviteSuccess}</p>}
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Enter 8-digit Tunisian number (prefix not required)</p>
                </form>

                {pendingInvitations.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Pending ({pendingInvitations.length})</p>
                    <div className="space-y-2">
                      {pendingInvitations.map((inv) => {
                        const name = [inv.invitee?.firstName || '', inv.invitee?.lastName || ''].filter(Boolean).join(' ') || 'Unknown';
                        return (
                          <div key={inv.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Sent {fmtDate(inv.createdAt)}</p>
                            </div>
                            <button
                              onClick={() => cancelInv(inv.id)}
                              disabled={cancelInvLoading[inv.id]}
                              className="shrink-0 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-500 hover:text-red-500 disabled:opacity-50"
                              title="Cancel invitation"
                            >
                              {cancelInvLoading[inv.id] ? <Loader2 size={13} className="animate-spin" /> : <X size={14} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

const toneMap: Record<string, string> = {
  sky: 'from-sky-500/15 to-sky-500/5 text-sky-700 dark:text-sky-400 border-sky-200/60 dark:border-sky-900/40',
  emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40',
  violet: 'from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-900/40',
  amber: 'from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40',
};

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'sky' | 'emerald' | 'violet' | 'amber' }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${toneMap[tone]} p-3.5`}>
      <div className="flex items-center gap-2 mb-1 opacity-90">{icon}<span className="text-[11px] font-medium">{label}</span></div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

export default Detail;
