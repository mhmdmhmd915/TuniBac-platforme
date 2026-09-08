import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowRight, Copy, Check, CheckCircle2, XCircle, Loader2, Ticket, Crown } from 'lucide-react';
import { studySquadAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../lib/socketClient';

type Squad = {
  id: string;
  name: string;
  invitationCode: string;
  ownerId: string;
  status: string;
  bacSection: string;
  createdAt: string;
  memberCount?: number;
  activeSessionCount?: number;
  myRole?: 'OWNER' | 'MEMBER';
};

type Invitation = {
  id: string;
  squadId: string;
  inviterId: string;
  squad?: { id: string; name: string; invitationCode: string };
  inviter?: { id: string; firstName: string; lastName: string };
  status: string;
  createdAt: string;
  expiresAt: string;
};

const ListPage = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [acceptIds, setAcceptIds] = useState<Record<string, boolean>>({});
  const [declineIds, setDeclineIds] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [sq, inv] = await Promise.all([studySquadAPI.listMySquads(), studySquadAPI.listMyInvitations()]);
      setSquads(Array.isArray(sq) ? sq : sq?.squads || []);
      setInvitations(Array.isArray(inv) ? inv : inv?.invitations || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      const s = getSocket();
      const onUpdate = () => refresh();
      s.on('study-squad:update', onUpdate);
      s.on('study-squad:invitations:new', onUpdate);
      return () => {
        s.off('study-squad:update', onUpdate);
        s.off('study-squad:invitations:new', onUpdate);
      };
    } catch (_e) { /* ignore socket not ready */ }
  }, [refresh]);

  const copyCode = (code: string) => {
    try { navigator.clipboard.writeText(code); } catch {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const createSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      setError(null);
      setCreating(true);
      const created = await studySquadAPI.createSquad({ name });
      if (created?.id) nav(`/study-squads/${created.id}`);
      else await refresh();
      setNewName('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create squad');
    } finally {
      setCreating(false);
    }
  };

  const joinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      setJoinError(null);
      setJoining(true);
      const joined = await studySquadAPI.joinByCode({ code });
      if (joined?.id) nav(`/study-squads/${joined.id}`);
      else await refresh();
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err?.response?.data?.message || 'Failed to join squad');
    } finally {
      setJoining(false);
    }
  };

  const accept = async (invId: string) => {
    try {
      setAcceptIds((p) => ({ ...p, [invId]: true }));
      const joined = await studySquadAPI.acceptInvitation(invId);
      if (joined?.id) {
        setInvitations((p) => p.filter((x) => x.id !== invId));
        nav(`/study-squads/${joined.id}`);
      } else {
        await refresh();
      }
    } finally {
      setAcceptIds((p) => ({ ...p, [invId]: false }));
    }
  };

  const decline = async (invId: string) => {
    try {
      setDeclineIds((p) => ({ ...p, [invId]: true }));
      await studySquadAPI.declineInvitation(invId);
      setInvitations((p) => p.filter((x) => x.id !== invId));
    } finally {
      setDeclineIds((p) => ({ ...p, [invId]: false }));
    }
  };

  const isOwner = (s: Squad) => s.ownerId === user?.id || s.myRole === 'OWNER';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center shadow-md">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">Study Squad</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Private groups to study with close friends</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <form onSubmit={createSquad} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Plus size={18} /> Create a Squad</h2>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Squad name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Math Warriors"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm"
            maxLength={60}
          />
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <button
            disabled={creating || !newName.trim()}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
          >
            {creating && <Loader2 size={16} className="animate-spin" />}
            Create Squad
          </button>
        </form>

        <form onSubmit={joinByCode} className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2"><Ticket size={18} /> Join with code</h2>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Invitation code</label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="TB-8K4P2"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 text-sm uppercase tracking-widest font-mono"
            maxLength={30}
          />
          {joinError && <p className="text-xs text-red-500 mt-2">{joinError}</p>}
          <button
            disabled={joining || !joinCode.trim()}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
          >
            {joining && <Loader2 size={16} className="animate-spin" />}
            Join Squad
          </button>
        </form>

        <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-900 dark:to-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-2xl p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">How it works</h2>
          <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2"><CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" /> Create a private squad and give it a name</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" /> Invite friends by phone or share the invitation code</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" /> Set shared goals and track study time together</li>
            <li className="flex gap-2"><CheckCircle2 size={16} className="text-sky-600 shrink-0 mt-0.5" /> Start a private Live Study in one click</li>
          </ul>
        </div>
      </div>

      {invitations.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="relative inline-flex">
              <Mail size={20} />
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">{invitations.length}</span>
            </span>
            Pending invitations
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {invitations.map((inv) => (
              <div key={inv.id} className="bg-white dark:bg-slate-900/60 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={14} className="text-amber-500" />
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{inv.squad?.name || 'Study Squad'}</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Invited by {inv.inviter?.firstName || ''} {inv.inviter?.lastName || ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => decline(inv.id)}
                    disabled={declineIds[inv.id]}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
                    title="Decline"
                  >
                    {declineIds[inv.id] ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={16} />}
                  </button>
                  <button
                    onClick={() => accept(inv.id)}
                    disabled={acceptIds[inv.id]}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold"
                  >
                    {acceptIds[inv.id] ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">My Squads</h2>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2"><Loader2 size={18} className="animate-spin" /> Loading...</div>
        ) : squads.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
            <Users size={36} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 mb-2">You aren't in any squads yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Create one above or ask a friend for an invitation code</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {squads.map((s) => (
              <Link
                key={s.id}
                to={`/study-squads/${s.id}`}
                className="group bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-sky-400 dark:hover:border-sky-700 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex gap-3 items-start min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white flex items-center justify-center font-bold shrink-0">
                      {s.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{s.name}</h3>
                        {isOwner(s) && <span title="Owner"><Crown size={14} className="text-amber-500 shrink-0" /></span>}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {s.memberCount || 1} member{(s.memberCount || 1) !== 1 ? 's' : ''}
                        {typeof s.activeSessionCount === 'number' && s.activeSessionCount > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {s.activeSessionCount} live
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-300 group-hover:text-sky-600 dark:text-slate-600 dark:group-hover:text-sky-400 shrink-0 mt-1 transition-colors" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 tracking-wide">
                    {s.invitationCode}
                    <button
                      onClick={(e) => { e.preventDefault(); copyCode(s.invitationCode); }}
                      className="hover:text-sky-600 dark:hover:text-sky-400"
                      title="Copy code"
                    >
                      {copiedCode === s.invitationCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

function Mail(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default ListPage;
