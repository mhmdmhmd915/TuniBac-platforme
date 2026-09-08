const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');

const socketEm = () => {
  try {
    return require('../config/socketServer');
  } catch (_e) {
    return null;
  }
};

function normalizePhone(raw) {
  if (!raw) return null;
  let v = String(raw).trim().replace(/\s+/g, '').replace(/[\-\(\)\.]/g, '');
  if (v.startsWith('00')) v = '+' + v.slice(2);
  if (/^\d{8}$/.test(v)) v = '+216' + v;
  if (/^216\d{8}$/.test(v)) v = '+' + v;
  return v;
}

function genInvitationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'TB-';
  for (let i = 0; i < 6; i += 1) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return out;
}

async function ensureActiveSquadMember(squadId, userId) {
  const member = await prisma.studySquadMember.findFirst({
    where: {
      squadId,
      userId,
      squad: { status: 'ACTIVE' },
    },
    include: { squad: true },
  });
  return member || null;
}

async function listMySquads(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const rows = await prisma.studySquadMember.findMany({
      where: { userId: req.user.id, squad: { status: 'ACTIVE', bacSection: req.user.bacSection } },
      include: {
        squad: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { members: true, studySessions: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    const list = rows.map((m) => ({
      id: m.squad.id,
      name: m.squad.name,
      invitationCode: m.squad.invitationCode,
      bacSection: m.squad.bacSection,
      ownerId: m.squad.ownerId,
      ownerName: `${m.squad.owner.firstName || ''} ${m.squad.owner.lastName || ''}`.trim(),
      memberCount: m.squad._count.members,
      sessionCount: m.squad._count.studySessions,
      myRole: m.role,
      joinedAt: m.joinedAt,
      createdAt: m.squad.createdAt,
    }));
    res.json({ squads: list });
  } catch (e) {
    logger.error('listMySquads', e);
    sendError(res, 500, 'Failed to list squads', e);
  }
}

async function listMyInvitations(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const rows = await prisma.studySquadInvitation.findMany({
      where: {
        inviteeId: req.user.id,
        status: { in: ['PENDING'] },
        squad: { status: 'ACTIVE', bacSection: req.user.bacSection },
      },
      include: {
        squad: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true } },
            _count: { select: { members: true } },
          },
        },
        inviter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const list = rows.map((inv) => ({
      id: inv.id,
      squadId: inv.squadId,
      squadName: inv.squad.name,
      inviterName: `${inv.inviter.firstName || ''} ${inv.inviter.lastName || ''}`.trim(),
      memberCount: inv.squad._count.members,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
    res.json({ invitations: list });
  } catch (e) {
    logger.error('listMyInvitations', e);
    sendError(res, 500, 'Failed to list invitations', e);
  }
}

async function createSquad(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Only students can create squads' });
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 60) {
      return res.status(400).json({ message: 'Invalid squad name (2-60 chars)' });
    }
    const now = new Date();
    const code = genInvitationCode();
    const squad = await prisma.$transaction(async (tx) => {
      const created = await tx.studySquad.create({
        data: {
          name: name.trim(),
          bacSection: req.user.bacSection,
          ownerId: req.user.id,
          invitationCode: code,
          status: 'ACTIVE',
        },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      await tx.studySquadMember.create({
        data: { squadId: created.id, userId: req.user.id, role: 'OWNER', joinedAt: now },
      });
      return created;
    });
    res.json({
      squad: {
        id: squad.id,
        name: squad.name,
        invitationCode: squad.invitationCode,
        bacSection: squad.bacSection,
        ownerId: squad.ownerId,
        ownerName: `${squad.owner.firstName || ''} ${squad.owner.lastName || ''}`.trim(),
        memberCount: 1,
        sessionCount: 0,
        myRole: 'OWNER',
        joinedAt: now,
        createdAt: squad.createdAt,
      },
    });
  } catch (e) {
    logger.error('createSquad', e);
    sendError(res, 500, 'Failed to create squad', e);
  }
}

async function getSquadDetail(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id } = req.params;
    const member = await ensureActiveSquadMember(id, req.user.id);
    if (!member) return res.status(403).json({ message: 'Not a member of this squad' });
    const squad = await prisma.studySquad.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        invitations: {
          where: { status: 'PENDING' },
          include: {
            inviter: { select: { id: true, firstName: true, lastName: true } },
            invitee: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        goal: true,
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        studySessions: {
          where: { status: 'ACTIVE' },
          orderBy: { startedAt: 'desc' },
          include: {
            createdBy: { select: { firstName: true, lastName: true } },
            _count: { select: { participants: { where: { isActive: true } } } },
          },
          take: 3,
        },
        _count: { select: { studySessions: true } },
      },
    });
    if (!squad) return res.status(404).json({ message: 'Squad not found' });
    const myRow = squad.members.find((m) => m.userId === req.user.id);
    const stats = await (async () => {
      const sessionIds = (await prisma.studySession.findMany({ where: { studySquadId: id }, select: { id: true } })).map((s) => s.id);
      const completedSessions = await prisma.studySession.count({ where: { studySquadId: id, status: 'CLOSED' } });
      const activeSessionCount = squad.studySessions.length;
      let totalMinutes = 0;
      if (sessionIds.length) {
        const rows = await prisma.studyHeartbeat.findMany({ where: { sessionId: { in: sessionIds } }, select: { minutes: true } });
        totalMinutes = rows.reduce((acc, r) => acc + (r.minutes || 0), 0);
      }
      const perMember = await prisma.studyHeartbeat.groupBy({
        by: ['userId'],
        _sum: { minutes: true },
        where: { sessionId: { in: sessionIds } },
      });
      return {
        totalStudyMinutes: totalMinutes,
        completedSessions,
        activeSessions: activeSessionCount,
        totalSessions: squad._count.studySessions,
        perMemberMinutes: Object.fromEntries(perMember.map((p) => [p.userId, p._sum.minutes || 0])),
      };
    })();
    res.json({
      squad: {
        id: squad.id,
        name: squad.name,
        invitationCode: squad.invitationCode,
        bacSection: squad.bacSection,
        ownerId: squad.ownerId,
        ownerName: `${squad.owner.firstName || ''} ${squad.owner.lastName || ''}`.trim(),
        myRole: myRow?.role || 'MEMBER',
        status: squad.status,
        members: squad.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim(),
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        pendingInvitations: squad.invitations.map((inv) => ({
          id: inv.id,
          inviterId: inv.inviterId,
          inviterName: `${inv.inviter.firstName || ''} ${inv.inviter.lastName || ''}`.trim(),
          inviteeId: inv.inviteeId,
          inviteeName: `${inv.invitee.firstName || ''} ${inv.invitee.lastName || ''}`.trim(),
          createdAt: inv.createdAt,
        })),
        goal: squad.goal
          ? {
              id: squad.goal.id,
              title: squad.goal.title,
              description: squad.goal.description || null,
              targetDate: squad.goal.targetDate || null,
              progress: squad.goal.progress,
              completed: squad.goal.completed,
              createdAt: squad.goal.createdAt,
            }
          : null,
        chatMessages: [...squad.chatMessages]
          .reverse()
          .map((m) => ({
            id: m.id,
            userId: m.userId,
            name: `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim(),
            content: m.content,
            createdAt: m.createdAt,
          })),
        activeSessions: squad.studySessions.map((s) => ({
          id: s.id,
          title: s.title,
          topic: s.topic || null,
          startedAt: s.startedAt,
          creatorName: `${s.createdBy?.firstName || ''} ${s.createdBy?.lastName || ''}`.trim(),
          participantCount: s._count.participants,
        })),
        stats,
        createdAt: squad.createdAt,
      },
    });
  } catch (e) {
    logger.error('getSquadDetail', e);
    sendError(res, 500, 'Failed to load squad', e);
  }
}

async function inviteByPhone(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const { phone } = req.body || {};
    const norm = normalizePhone(phone);
    if (!norm) return res.status(400).json({ message: 'Phone number required' });
    const myMembership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!myMembership) return res.status(403).json({ message: 'Not a member of this squad' });
    if (myMembership.squad.bacSection !== req.user.bacSection) return res.status(403).json({ message: 'Section mismatch' });
    const target = await prisma.user.findFirst({
      where: { phone: norm, role: 'STUDENT', status: 'APPROVED' },
      select: { id: true, firstName: true, lastName: true, bacSection: true, phone: true },
    });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.bacSection !== myMembership.squad.bacSection) {
      return res.status(400).json({ message: 'User is in a different Bac section' });
    }
    if (target.id === req.user.id) return res.status(400).json({ message: "You can't invite yourself" });
    const already = await prisma.studySquadMember.findFirst({ where: { squadId, userId: target.id } });
    if (already) return res.status(400).json({ message: 'User is already a member' });
    const pendingExists = await prisma.studySquadInvitation.findFirst({
      where: { squadId, inviteeId: target.id, status: 'PENDING' },
    });
    if (pendingExists) return res.status(400).json({ message: 'Invitation already pending for this user' });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.studySquadInvitation.create({
      data: {
        squadId,
        inviterId: req.user.id,
        inviteeId: target.id,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        inviter: { select: { id: true, firstName: true, lastName: true } },
        invitee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const sock = socketEm();
    if (sock?.emitSquadInvitation) {
      try {
        sock.emitSquadInvitation(target.id, {
          id: invitation.id,
          squadId,
          squadName: myMembership.squad.name,
          inviterName: `${invitation.inviter.firstName || ''} ${invitation.inviter.lastName || ''}`.trim(),
        });
      } catch (_u) {
        /* ignore */
      }
    }
    res.json({
      invitation: {
        id: invitation.id,
        inviteeName: `${target.firstName || ''} ${target.lastName || ''}`.trim(),
        status: 'PENDING',
        expiresAt,
      },
    });
  } catch (e) {
    logger.error('inviteByPhone', e);
    sendError(res, 500, 'Failed to invite user', e);
  }
}

async function cancelInvitation(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId, invitationId } = req.params;
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Owner only' });
    const inv = await prisma.studySquadInvitation.findFirst({ where: { id: invitationId, squadId, status: 'PENDING' } });
    if (!inv) return res.status(404).json({ message: 'Invitation not found' });
    await prisma.studySquadInvitation.update({ where: { id: inv.id }, data: { status: 'CANCELLED' } });
    res.json({ ok: true });
  } catch (e) {
    logger.error('cancelInvitation', e);
    sendError(res, 500, 'Failed to cancel', e);
  }
}

async function acceptInvitation(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { invitationId } = req.params;
    const inv = await prisma.studySquadInvitation.findUnique({
      where: { id: invitationId },
      include: { squad: true },
    });
    if (!inv) return res.status(404).json({ message: 'Invitation not found' });
    if (inv.inviteeId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (inv.status !== 'PENDING') return res.status(400).json({ message: 'Invitation not pending' });
    if (inv.squad.bacSection !== req.user.bacSection) return res.status(400).json({ message: 'Different Bac section' });
    if (inv.expiresAt && inv.expiresAt.getTime() < Date.now()) {
      await prisma.studySquadInvitation.update({ where: { id: inv.id }, data: { status: 'EXPIRED' } });
      return res.status(400).json({ message: 'Invitation expired' });
    }
    await prisma.$transaction(async (tx) => {
      await tx.studySquadInvitation.update({ where: { id: inv.id }, data: { status: 'ACCEPTED' } });
      try {
        await tx.studySquadMember.create({
          data: { squadId: inv.squadId, userId: req.user.id, role: 'MEMBER', joinedAt: new Date() },
        });
      } catch (dup) {
        if (dup?.code !== 'P2002') throw dup;
      }
    });
    res.json({ ok: true, squadId: inv.squadId });
  } catch (e) {
    logger.error('acceptInvitation', e);
    sendError(res, 500, 'Failed to accept invitation', e);
  }
}

async function declineInvitation(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { invitationId } = req.params;
    const inv = await prisma.studySquadInvitation.findUnique({ where: { id: invitationId } });
    if (!inv) return res.status(404).json({ message: 'Invitation not found' });
    if (inv.inviteeId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (inv.status !== 'PENDING') return res.status(400).json({ message: 'Invitation not pending' });
    await prisma.studySquadInvitation.update({ where: { id: inv.id }, data: { status: 'DECLINED' } });
    res.json({ ok: true });
  } catch (e) {
    logger.error('declineInvitation', e);
    sendError(res, 500, 'Failed to decline', e);
  }
}

async function joinByCode(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') return res.status(400).json({ message: 'Code required' });
    const clean = code.trim().toUpperCase();
    const squad = await prisma.studySquad.findFirst({
      where: { invitationCode: clean, status: 'ACTIVE' },
    });
    if (!squad) return res.status(404).json({ message: 'Code not found' });
    if (squad.bacSection !== req.user.bacSection) return res.status(403).json({ message: 'Different Bac section' });
    const member = await prisma.studySquadMember.findFirst({ where: { squadId: squad.id, userId: req.user.id } });
    if (member) return res.json({ ok: true, squadId: squad.id, alreadyMember: true });
    await prisma.studySquadMember.create({
      data: { squadId: squad.id, userId: req.user.id, role: 'MEMBER', joinedAt: new Date() },
    });
    res.json({ ok: true, squadId: squad.id, alreadyMember: false });
  } catch (e) {
    logger.error('joinByCode', e);
    sendError(res, 500, 'Failed to join by code', e);
  }
}

async function removeMember(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId, userId } = req.params;
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Owner only' });
    if (userId === membership.squad.ownerId) return res.status(400).json({ message: "Can't remove owner" });
    const target = await prisma.studySquadMember.findFirst({ where: { squadId, userId } });
    if (!target) return res.status(404).json({ message: 'Member not found' });
    await prisma.studySquadMember.delete({ where: { id: target.id } });
    res.json({ ok: true });
  } catch (e) {
    logger.error('removeMember', e);
    sendError(res, 500, 'Failed to remove member', e);
  }
}

async function leaveSquad(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const me = await prisma.studySquadMember.findFirst({
      where: { squadId, userId: req.user.id, squad: { status: 'ACTIVE' } },
      include: { squad: true },
    });
    if (!me) return res.status(404).json({ message: 'Not a member' });
    if (me.role === 'OWNER') return res.status(400).json({ message: 'Owner cannot leave — disband or transfer ownership first' });
    await prisma.studySquadMember.delete({ where: { id: me.id } });
    res.json({ ok: true });
  } catch (e) {
    logger.error('leaveSquad', e);
    sendError(res, 500, 'Failed to leave squad', e);
  }
}

async function renameSquad(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 60) {
      return res.status(400).json({ message: 'Invalid squad name (2-60 chars)' });
    }
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Owner only' });
    const updated = await prisma.studySquad.update({ where: { id: squadId }, data: { name: name.trim() } });
    res.json({ squad: { id: updated.id, name: updated.name } });
  } catch (e) {
    logger.error('renameSquad', e);
    sendError(res, 500, 'Failed to rename', e);
  }
}

async function disbandSquad(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    if (membership.role !== 'OWNER') return res.status(403).json({ message: 'Owner only' });
    await prisma.$transaction(async (tx) => {
      await tx.studySquadInvitation.updateMany({ where: { squadId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
      await tx.studySession.updateMany({ where: { studySquadId: squadId, status: 'ACTIVE' }, data: { status: 'CLOSED', endedAt: new Date() } });
      await tx.studySquad.update({ where: { id: squadId }, data: { status: 'DISBANDED' } });
    });
    res.json({ ok: true });
  } catch (e) {
    logger.error('disbandSquad', e);
    sendError(res, 500, 'Failed to disband', e);
  }
}

async function upsertGoal(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    const { title, description, targetDate, progress, completed } = req.body || {};
    if (!title || typeof title !== 'string' || title.trim().length < 2 || title.length > 140) {
      return res.status(400).json({ message: 'Invalid goal title (2-140 chars)' });
    }
    const td = targetDate ? new Date(targetDate) : null;
    const p = typeof progress === 'number' ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
    const done = typeof completed === 'boolean' ? completed : false;
    const existing = await prisma.studySquadGoal.findUnique({ where: { squadId } });
    const data = {
      title: title.trim(),
      description: description || null,
      targetDate: td,
      progress: p,
      completed: done,
      createdById: existing?.createdById || req.user.id,
    };
    const goal = existing
      ? await prisma.studySquadGoal.update({ where: { id: existing.id }, data })
      : await prisma.studySquadGoal.create({ data: { ...data, squadId } });
    res.json({
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description || null,
        targetDate: goal.targetDate || null,
        progress: goal.progress,
        completed: goal.completed,
        createdAt: goal.createdAt,
      },
    });
  } catch (e) {
    logger.error('upsertGoal', e);
    sendError(res, 500, 'Failed to save goal', e);
  }
}

async function listChat(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    const messages = await prisma.studySquadChatMessage.findMany({
      where: { squadId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json({
      messages: messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim(),
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    logger.error('listChat', e);
    sendError(res, 500, 'Failed to load chat', e);
  }
}

async function sendChatMessage(req, res) {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Students only' });
    const { id: squadId } = req.params;
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) return res.status(400).json({ message: 'Message required' });
    if (content.length > 1000) return res.status(400).json({ message: 'Message exceeds 1000 characters' });
    const membership = await ensureActiveSquadMember(squadId, req.user.id);
    if (!membership) return res.status(403).json({ message: 'Not a member' });
    const message = await prisma.studySquadChatMessage.create({
      data: { squadId, userId: req.user.id, content: content.trim() },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    const payload = {
      id: message.id,
      squadId,
      userId: message.userId,
      name: `${message.user.firstName || ''} ${message.user.lastName || ''}`.trim(),
      content: message.content,
      createdAt: message.createdAt,
    };
    const sock = socketEm();
    if (sock?.broadcastSquadChat) {
      try { sock.broadcastSquadChat(squadId, payload); } catch (_u) { /* ignore */ }
    }
    res.json({ message: payload });
  } catch (e) {
    logger.error('sendChatMessage', e);
    sendError(res, 500, 'Failed to send message', e);
  }
}

module.exports = {
  listMySquads,
  listMyInvitations,
  createSquad,
  getSquadDetail,
  inviteByPhone,
  cancelInvitation,
  acceptInvitation,
  declineInvitation,
  joinByCode,
  removeMember,
  leaveSquad,
  renameSquad,
  disbandSquad,
  upsertGoal,
  listChat,
  sendChatMessage,
  ensureActiveSquadMember,
};
