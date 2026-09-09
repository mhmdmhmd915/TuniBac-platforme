const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { resolveSectionList } = require('../utils/bacSection');

const socketEm = () => { try { return require('../config/socketServer'); } catch (_e) { return null; } };

async function verifySquadSessionAccess(session, userId) {
  if (!session?.studySquadId) return { ok: true };
  const member = await prisma.studySquadMember.findFirst({
    where: {
      squadId: session.studySquadId,
      userId,
      squad: { status: 'ACTIVE' },
    },
    select: { id: true },
  });
  if (member) return { ok: true };
  return { ok: false, status: 403, message: 'Access denied: not a member of this squad' };
}
module.exports.verifySquadSessionAccess = verifySquadSessionAccess;

const autoCloseIfEmpty = async (sessionId) => {
  try {
    const count = await prisma.sessionParticipant.count({ where: { sessionId, isActive: true } });
    // #region debug-point SQSS-AUTOCL-01
    logger.info('[DBG-SQSS-AUTOCL]', { sessionId, activeCount: count });
    // #endregion
    if (count > 0) return false;
    const session = await prisma.studySession.findUnique({
      where: { id: sessionId },
      select: { status: true, bacSection: true, startedAt: true },
    });
    if (!session || session.status === 'CLOSED') return false;
    const ageMs = session.startedAt ? (Date.now() - new Date(session.startedAt).getTime()) : -1;
    // #region debug-point SQSS-AUTOCL-02
    logger.info('[DBG-SQSS-AUTOCL] age-check', { sessionId, ageMs, startedAt: session.startedAt, status: session.status });
    // #endregion
    if (ageMs < 10000) {
      // #region debug-point SQSS-AUTOCL-03
      logger.info('[DBG-SQSS-AUTOCL] age < 10s PROTECTED (skip close)', { sessionId });
      // #endregion
      return false;
    }
    const now = new Date();
    await prisma.studySession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', endedAt: now },
    });
    const io = socketEm();
    if (io && io.emitSessionEnded) io.emitSessionEnded(sessionId, 'Session automatically closed (no participants)');
    return true;
  } catch (e) {
    logger.warn('autoCloseIfEmpty error', { sessionId, error: e?.message });
    return false;
  }
};

const stopActiveParticipants = async (sessionId) => {
  try {
    const now = new Date();
    await prisma.sessionParticipant.updateMany({
      where: { sessionId, isActive: true },
      data: { isActive: false, leftAt: now, lastSeenAt: now },
    });
  } catch (_e) { /* ignore */ }
};

const getLiveStudyEnabled = async () => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'liveStudyEnabled' },
    });
    if (!setting) return true;
    return setting.value !== 'false';
  } catch (err) {
    logger.warn('Error reading liveStudyEnabled setting, defaulting to true', err);
    return true;
  }
};

const shapeSessionWithCreator = (session) => {
  if (!session) return session;
  const firstName = session.createdBy?.firstName || '';
  const lastName = session.createdBy?.lastName || '';
  const creatorName = `${firstName} ${lastName}`.trim() || (session.creatorName || 'Anonymous');
  return {
    ...session,
    creatorId: session.creatorId || session.createdById || null,
    ownerId: session.ownerId || session.createdById || null,
    creatorName,
  };
};

const createSession = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can create sessions' });
    }

    const liveStudyEnabled = await getLiveStudyEnabled();
    if (!liveStudyEnabled) {
      return res.status(400).json({ message: 'Live study is currently disabled' });
    }

    const { title, studySquadId, subjectId, topic } = req.body || {};
  const bacSection = req.user.bacSection;

  const session = await prisma.$transaction(async (tx) => {
    let squadIdForSession = null;
    if (studySquadId) {
      if (typeof studySquadId !== 'string') throw Object.assign(new Error('Invalid squad id'), { statusCode: 400 });
      const membership = await tx.studySquadMember.findFirst({
        where: { squadId: studySquadId, userId: req.user.id, squad: { status: 'ACTIVE', bacSection: req.user.bacSection } },
        include: { squad: true },
      });
      if (!membership) throw Object.assign(new Error('Not authorized to create a session for this squad'), { statusCode: 403 });
      squadIdForSession = membership.squad.id;
    }
    // #region debug-point SQSS-CREATE-01
    logger.info('[DBG-SQSS-CREATE] pre-tx', { userId: req.user.id, bacSection: req.user.bacSection, studySquadId, title });
    // #endregion
    const createdSession = await tx.studySession.create({
      data: {
        title: title || 'Live Study Session',
        bacSection,
        subjectId: subjectId || null,
        topic: topic || null,
        createdById: req.user.id,
        studySquadId: squadIdForSession,
        status: 'ACTIVE',
      },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      try {
        const now = new Date();
        const pt = await tx.sessionParticipant.create({
          data: {
            sessionId: createdSession.id,
            userId: req.user.id,
            bacSection: req.user.bacSection,
            joinedAt: now,
            isActive: true,
            micEnabled: false,
            camEnabled: false,
            lastSeenAt: now,
          },
        });
        // #region debug-point SQSS-CREATE-02
        logger.info('[DBG-SQSS-CREATE] participant created inside tx', { sessionId: createdSession.id, participantId: pt.id, userId: pt.userId, isActive: pt.isActive });
        // #endregion
      } catch (_p) {
        // #region debug-point SQSS-CREATE-03
        logger.warn('[DBG-SQSS-CREATE] participant create skipped/dup', { sessionId: createdSession.id, errMsg: _p?.message, code: _p?.code });
        // #endregion
      }

      return createdSession;
    });
    // #region debug-point SQSS-CREATE-04
    logger.info('[DBG-SQSS-CREATE] post-tx session returned', { sessionId: session?.id, status: session?.status, studySquadId: session?.studySquadId, startedAt: session?.startedAt, responseKeys: Object.keys(session || {}) });
    // #endregion

    res.json(shapeSessionWithCreator(session));
    try {
      const socket = socketEm();
      if (socket && socket.emitParticipantJoined) {
        try {
          socket.emitParticipantJoined(session.id, req.user.id);
          const ioRef = socket.getIO?.();
          if (ioRef) ioRef.emit('live-study:list:update', { type: 'added', sessionId: session.id });
        } catch (_u) { /* ignore */ }
      }
    } catch (_e) { /* ignore */ }
  } catch (error) {
    logger.error('Error creating study session', error);
    sendError(res, 500, 'Error creating study session', error);
  }
};

const listMySectionSessions = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can list sessions' });
    }

    const sections = await resolveSectionList(req);
    const where = { status: 'ACTIVE', studySquadId: null };

    if (sections) {
      where.bacSection = { in: sections };
    }

    const liveStudyEnabled = await getLiveStudyEnabled();

    const sessions = await prisma.studySession.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        _count: {
          select: {
            participants: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const shaped = sessions.map((s) => ({
      id: s.id,
      bacSection: s.bacSection,
      subject: s.title || s.subjectName || 'Study',
      subjectName: s.subjectName,
      subjectId: s.subjectId,
      topic: s.topic,
      title: s.title,
      creatorName: `${s.createdBy?.firstName || ''} ${s.createdBy?.lastName || ''}`.trim() || 'Anonymous',
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      status: s.status,
      isActive: s.status === 'ACTIVE',
      participantCount: s._count.participants,
    }));

    res.json({
      enabled: liveStudyEnabled,
      sessions: shaped,
    });
  } catch (error) {
    logger.error('Error listing study sessions', error);
    sendError(res, 500, 'Error listing study sessions', error);
  }
};

const getStudentStatus = async (req, res) => {
  try {
    const liveStudyEnabled = await getLiveStudyEnabled();
    res.json({
      enabled: liveStudyEnabled,
      bacSection: req.user.bacSection || null,
    });
  } catch (error) {
    sendError(res, 500, 'Error fetching status', error);
  }
};

const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.studySession.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Session is closed' });
    }

    if (req.user.role === 'STUDENT' && session.bacSection !== req.user.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }

    if (req.user.role === 'STUDENT') {
      const squadAccess = await verifySquadSessionAccess(session, req.user.id);
      if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });
    }

    const participants = await prisma.sessionParticipant.findMany({
      where: {
        sessionId: id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bacSection: true,
          },
        },
      },
    });

    const enrichedParticipants = participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      bacSection: p.bacSection,
      joinedAt: p.joinedAt,
      isActive: p.isActive,
      micEnabled: p.micEnabled,
      camEnabled: p.camEnabled,
      lastSeenAt: p.lastSeenAt,
      user: p.user,
    }));

    const chatMessages = await prisma.sessionChatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
      take: 100,
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    res.json({
      ...shapeSessionWithCreator(session),
      participants: enrichedParticipants,
      chatMessages,
    });
  } catch (error) {
    logger.error('Error fetching study session', error);
    sendError(res, 500, 'Error fetching study session', error);
  }
};

const joinSession = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can join sessions' });
    }

    const { id } = req.params;
    // #region debug-point SQSS-JOIN-01
    logger.info('[DBG-SQSS-JOIN] request', { userId: req.user.id, sessionId: id });
    // #endregion

    const session = await prisma.studySession.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // #region debug-point SQSS-JOIN-02
    logger.info('[DBG-SQSS-JOIN] session loaded', { sessionId: id, status: session.status, studySquadId: session.studySquadId, bacSection: session.bacSection, startedAt: session.startedAt });
    // #endregion

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Session is closed' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Session is not active' });
    }

    if (req.user.bacSection !== session.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }

    const squadAccess = await verifySquadSessionAccess(session, req.user.id);
    // #region debug-point SQSS-JOIN-03
    logger.info('[DBG-SQSS-JOIN] squadAccess', { sessionId: id, userId: req.user.id, ok: squadAccess?.ok, msg: squadAccess?.message });
    // #endregion
    if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });

    const now = new Date();

    const existing = await prisma.sessionParticipant.findFirst({
      where: { sessionId: id, userId: req.user.id },
    });
    // #region debug-point SQSS-JOIN-04
    logger.info('[DBG-SQSS-JOIN] existing', { sessionId: id, userId: req.user.id, foundExisting: !!existing });
    // #endregion

    let participant;
    if (existing) {
      participant = await prisma.sessionParticipant.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          lastSeenAt: now,
          leftAt: null,
        },
      });
    } else {
      try {
        participant = await prisma.sessionParticipant.create({
          data: {
            sessionId: id,
            userId: req.user.id,
            bacSection: req.user.bacSection,
            joinedAt: now,
            isActive: true,
            micEnabled: false,
            camEnabled: false,
            lastSeenAt: now,
          },
        });
        // #region debug-point SQSS-JOIN-05
        logger.info('[DBG-SQSS-JOIN] participant created', { sessionId: id, userId: req.user.id, participantId: participant.id, isActive: participant.isActive });
        // #endregion
      } catch (createErr) {
        if (createErr && createErr.code === 'P2002') {
          await prisma.sessionParticipant.updateMany({
            where: { sessionId: id, userId: req.user.id },
            data: {
              isActive: true,
              lastSeenAt: now,
              leftAt: null,
            },
          });
          participant = await prisma.sessionParticipant.findFirst({
            where: { sessionId: id, userId: req.user.id },
          });
        } else {
          throw createErr;
        }
      }
    }

    res.json({ participant, session: shapeSessionWithCreator(session) });
    try {
      const socket = socketEm();
      if (socket && socket.emitParticipantJoined) socket.emitParticipantJoined(id, req.user.id);
    } catch (_e) { /* ignore */ }
  } catch (error) {
    logger.error('Error joining study session', error);
    sendError(res, 500, 'Error joining study session', error);
  }
};

const leaveSession = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can leave sessions' });
    }

    const { id } = req.params;

    const session = await prisma.studySession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (req.user.bacSection !== session.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }

    const squadAccess = await verifySquadSessionAccess(session, req.user.id);
    if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });

    const now = new Date();
    await prisma.sessionParticipant.updateMany({
      where: {
        sessionId: id,
        userId: req.user.id,
      },
      data: {
        isActive: false,
        leftAt: now,
        lastSeenAt: now,
      },
    });

    try {
      const socket = socketEm();
      if (socket && socket.emitParticipantLeft) socket.emitParticipantLeft(id, req.user.id);
    } catch (_e) { /* ignore */ }

    const autoClosed = await autoCloseIfEmpty(id);

    res.json({ ok: true, autoClosed: !!autoClosed });
  } catch (error) {
    logger.error('Error leaving study session', error);
    sendError(res, 500, 'Error leaving study session', error);
  }
};

const finishSession = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can finish sessions' });
    }
    const { id } = req.params;
    const session = await prisma.studySession.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status !== 'ACTIVE') return res.status(400).json({ message: 'Session already closed' });
    if (session.createdById !== req.user.id) return res.status(403).json({ message: 'Only the session owner can finish this session' });

    await stopActiveParticipants(id);
    const now = new Date();
    const updated = await prisma.studySession.update({
      where: { id },
      data: { status: 'CLOSED', endedAt: now },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
    try {
      const socket = socketEm();
      if (socket && socket.emitSessionEnded) socket.emitSessionEnded(id, 'Session finished by host');
    } catch (_e) { /* ignore */ }
    res.json({ ok: true, session: shapeSessionWithCreator(updated) });
  } catch (error) {
    logger.error('Error finishing study session', error);
    sendError(res, 500, 'Error finishing study session', error);
  }
};

const updateMediaState = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can update media state' });
    }

    const { id } = req.params;
    const { micEnabled, camEnabled, mic, camera } = req.body || {};

    const session = await prisma.studySession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (req.user.bacSection !== session.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }

    const squadAccess = await verifySquadSessionAccess(session, req.user.id);
    if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });

    const updateData = {};
    const resolvedMic = typeof micEnabled === 'boolean' ? micEnabled : typeof mic === 'boolean' ? mic : undefined;
    const resolvedCam = typeof camEnabled === 'boolean' ? camEnabled : typeof camera === 'boolean' ? camera : undefined;
    if (typeof resolvedMic === 'boolean') updateData.micEnabled = resolvedMic;
    if (typeof resolvedCam === 'boolean') updateData.camEnabled = resolvedCam;
    updateData.lastSeenAt = new Date();

    await prisma.sessionParticipant.updateMany({
      where: {
        sessionId: id,
        userId: req.user.id,
      },
      data: updateData,
    });

    res.json({ ok: true });
  } catch (error) {
    logger.error('Error updating media state', error);
    sendError(res, 500, 'Error updating media state', error);
  }
};

const sendChatMessage = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can send chat messages' });
    }

    const { id } = req.params;
    const { content } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ message: 'Message content exceeds 1000 characters' });
    }

    const session = await prisma.studySession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Session is closed' });
    }

    if (req.user.bacSection !== session.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }

    const squadAccess = await verifySquadSessionAccess(session, req.user.id);
    if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });

    const message = await prisma.sessionChatMessage.create({
      data: {
        sessionId: id,
        userId: req.user.id,
        bacSection: req.user.bacSection,
        content,
      },
      include: {
        user: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const senderName =
      [message.user?.firstName || '', message.user?.lastName || ''].filter(Boolean).join(' ').trim() ||
      'Student';

    const shaped = {
      id: message.id,
      senderId: message.userId,
      senderName,
      content: message.content,
      createdAt: message.createdAt,
    };

    try {
      const { getIO } = require('../config/socketServer');
      const io = getIO();
      io.to(`session:${id}`).emit('chat:new', shaped);
      io.to(`session:${id}`).emit('live-study:chat', { sessionId: id, message: shaped });
      io.to(`session:${id}`).emit(`live-study:chat:${id}`, { sessionId: id, message: shaped });
    } catch (_e) {
      /* ignore if socket not initialized */
    }

    res.json(shaped);
  } catch (error) {
    logger.error('Error sending chat message', error);
    sendError(res, 500, 'Error sending chat message', error);
  }
};

const floorToMinute = (date) => {
  const d = new Date(date);
  d.setUTCSeconds(0);
  d.setUTCMilliseconds(0);
  return d;
};

const startOfDayUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const startOfWeekUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = day === 1 ? 0 : day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
};

const startOfMonthUTC = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(1);
  return d;
};

const ingestHeartbeat = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only students can send heartbeats' });
    }

    const { sessionId } = req.body || {};
    const now = new Date();

    if (sessionId) {
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        select: { bacSection: true, status: true, studySquadId: true },
      });
      if (!session || session.status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Session not active' });
      }
      if (req.user.bacSection !== session.bacSection) {
        return res.status(403).json({ message: 'Session belongs to a different section' });
      }
      const squadAccess = await verifySquadSessionAccess(session, req.user.id);
      if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });
    }

    const minuteKey = floorToMinute(now);

    const existing = await prisma.studyHeartbeat.findUnique({
      where: {
        userId_minuteKey: {
          userId: req.user.id,
          minuteKey,
        },
      },
    });

    let minutesAdded;
    if (existing) {
      await prisma.studyHeartbeat.update({
        where: { id: existing.id },
        data: { minutes: existing.minutes + 1 },
      });
      minutesAdded = 1;
    } else {
      await prisma.studyHeartbeat.create({
        data: {
          userId: req.user.id,
          sessionId: sessionId || null,
          bacSection: req.user.bacSection,
          minuteKey,
          minutes: 1,
        },
      });
      minutesAdded = 1;
    }

    let awarded = [];
    try {
      awarded = await awardBadges(req.user.id);
    } catch (badgeErr) {
      logger.warn('Award badges error after heartbeat', badgeErr);
    }

    const newlyAwardedBadges = awarded.map((a) => ({
      id: a.badgeId,
      slug: a.badge?.slug,
      name: a.badge?.name,
      awardedAt: a.awardedAt,
    }));

    const response = { minutesAdded, newlyAwardedBadges };

    if (sessionId) {
      try {
        const parts = await prisma.sessionParticipant.findMany({
          where: { sessionId, isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
          orderBy: { joinedAt: 'asc' },
        });
        const { shapeAllParticipants } = require('../config/socketServer');
        response.participants = shapeAllParticipants(parts);
      } catch (_e) { /* ignore */ }
    }

    res.json(response);
  } catch (error) {
    logger.error('Error ingesting heartbeat', error);
    sendError(res, 500, 'Error ingesting heartbeat', error);
  }
};

const getRanking = async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    let startDate;

    switch (period) {
      case 'daily':
        startDate = startOfDayUTC();
        break;
      case 'weekly':
        startDate = startOfWeekUTC();
        break;
      case 'monthly':
        startDate = startOfMonthUTC();
        break;
      default:
        startDate = startOfDayUTC();
    }

    const where = {
      minuteKey: { gte: startDate },
    };

    if (req.user.role === 'STUDENT') {
      where.bacSection = req.user.bacSection;
    }

    const aggregates = await prisma.studyHeartbeat.groupBy({
      by: ['userId'],
      where,
      _sum: { minutes: true },
      orderBy: { _sum: { minutes: 'desc' } },
      take: 30,
    });

    const userIds = aggregates.map((a) => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bacSection: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const ranking = aggregates.map((a, idx) => ({
      rank: idx + 1,
      userId: a.userId,
      firstName: userMap.get(a.userId)?.firstName || '',
      lastName: userMap.get(a.userId)?.lastName || '',
      bacSection: userMap.get(a.userId)?.bacSection || null,
      totalMinutes: a._sum.minutes || 0,
    }));

    res.json({ period, ranking });
  } catch (error) {
    logger.error('Error fetching ranking', error);
    sendError(res, 500, 'Error fetching ranking', error);
  }
};

const listBadges = async (req, res) => {
  try {
    const badges = await prisma.studyBadge.findMany({
      orderBy: { order: 'asc' },
    });

    if (req.user.role === 'STUDENT') {
      const awarded = await prisma.userStudyBadge.findMany({
        where: { userId: req.user.id },
        select: { badgeId: true, awardedAt: true },
      });
      const awardedMap = new Map(awarded.map((a) => [a.badgeId, a]));

      const result = badges.map((b) => ({
        ...b,
        awarded: awardedMap.has(b.id),
        awardedAt: awardedMap.get(b.id)?.awardedAt || null,
      }));

      return res.json(result);
    }

    res.json(badges);
  } catch (error) {
    logger.error('Error listing badges', error);
    sendError(res, 500, 'Error listing badges', error);
  }
};

const listSessionParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.studySession.findUnique({ where: { id }, select: { id: true, bacSection: true, studySquadId: true, status: true } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (req.user.role === 'STUDENT' && session.bacSection !== req.user.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }
    if (req.user.role === 'STUDENT') {
      const squadAccess = await verifySquadSessionAccess(session, req.user.id);
      if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });
    }
    const rows = await prisma.sessionParticipant.findMany({
      where: { sessionId: id, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const { shapeAllParticipants } = require('../config/socketServer');
    res.json(shapeAllParticipants(rows));
  } catch (error) {
    logger.error('Error listing session participants', error);
    sendError(res, 500, 'Error listing session participants', error);
  }
};

const listSessionChatHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.studySession.findUnique({ where: { id }, select: { id: true, bacSection: true, studySquadId: true, status: true } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (req.user.role === 'STUDENT' && session.bacSection !== req.user.bacSection) {
      return res.status(403).json({ message: 'Session belongs to a different section' });
    }
    if (req.user.role === 'STUDENT') {
      const squadAccess = await verifySquadSessionAccess(session, req.user.id);
      if (!squadAccess.ok) return res.status(squadAccess.status).json({ message: squadAccess.message });
    }
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const rows = await prisma.sessionChatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    const shaped = rows
      .reverse()
      .map((m) => {
        const u = m.user || {};
        const first = u.firstName || m.firstName || '';
        const last = u.lastName || m.lastName || '';
        const senderName =
          (typeof m.senderName === 'string' && m.senderName.trim()) ||
          [first, last].filter(Boolean).join(' ').trim() ||
          'Student';
        return {
          id: m.id,
          senderId: m.userId,
          senderName,
          content: m.content,
          createdAt: m.createdAt,
        };
      });
    res.json(shaped);
  } catch (error) {
    logger.error('Error fetching chat history', error);
    sendError(res, 500, 'Error fetching chat history', error);
  }
};

const ingestHeartbeatForSession = async (req, res) => {
  req.body = { ...(req.body || {}), sessionId: req.params.id };
  return ingestHeartbeat(req, res);
};

const awardBadges = async (userId, prismaTrx) => {
  const tx = prismaTrx || prisma;
  const newlyAwarded = [];

  try {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, bacSection: true },
    });

    if (!user) return newlyAwarded;

    const badges = await tx.studyBadge.findMany({
      orderBy: { order: 'asc' },
    });

    const existing = await tx.userStudyBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const existingBadgeIds = new Set(existing.map((e) => e.badgeId));

    const startOfISOWeek = startOfWeekUTC();
    const weekEnd = new Date(startOfISOWeek);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    for (const badge of badges) {
      if (existingBadgeIds.has(badge.id)) continue;

      let qualifies = false;
      let evidenceRef = null;

      switch (badge.thresholdUnit) {
        case 'SINGLE_SESSION_MINUTES': {
          const sessionAggs = await tx.studyHeartbeat.groupBy({
            by: ['sessionId'],
            where: {
              userId,
              sessionId: { not: null },
            },
            _sum: { minutes: true },
          });

          const maxSession = sessionAggs.reduce(
            (max, curr) => Math.max(max, curr._sum.minutes || 0),
            0
          );

          if (maxSession >= badge.thresholdMinutes) {
            qualifies = true;
            evidenceRef = `max_session:${maxSession}min`;
          }
          break;
        }
        case 'WEEKLY_TOTAL_MINUTES': {
          const weekAgg = await tx.studyHeartbeat.aggregate({
            where: {
              userId,
              minuteKey: { gte: startOfISOWeek, lt: weekEnd },
            },
            _sum: { minutes: true },
          });

          const weekTotal = weekAgg._sum.minutes || 0;
          if (weekTotal >= badge.thresholdMinutes) {
            qualifies = true;
            evidenceRef = `week:${weekTotal}min`;
          }
          break;
        }
        case 'TOTAL_MINUTES': {
          const totalAgg = await tx.studyHeartbeat.aggregate({
            where: { userId },
            _sum: { minutes: true },
          });

          const total = totalAgg._sum.minutes || 0;
          if (total >= badge.thresholdMinutes) {
            qualifies = true;
            evidenceRef = `total:${total}min`;
          }
          break;
        }
      }

      if (qualifies) {
        try {
          const awarded = await tx.userStudyBadge.create({
            data: {
              userId,
              badgeId: badge.id,
              bacSection: user.bacSection,
              evidenceRef,
            },
          });
          newlyAwarded.push({ ...awarded, badge });
        } catch (dupErr) {
          if (dupErr?.code !== 'P2002') {
            throw dupErr;
          }
        }
      }
    }

    return newlyAwarded;
  } catch (error) {
    logger.error('Error in awardBadges', error);
    if (prismaTrx) throw error;
    return newlyAwarded;
  }
};

const ingestHeartbeatInternal = async (userId, bacSection, sessionId) => {
  const now = new Date();
  const minuteKey = floorToMinute(now);

  const existing = await prisma.studyHeartbeat.findUnique({
    where: {
      userId_minuteKey: {
        userId,
        minuteKey,
      },
    },
  });

  let minutesAdded;
  if (existing) {
    await prisma.studyHeartbeat.update({
      where: { id: existing.id },
      data: { minutes: existing.minutes + 1 },
    });
    minutesAdded = 1;
  } else {
    await prisma.studyHeartbeat.create({
      data: {
        userId,
        sessionId: sessionId || null,
        bacSection,
        minuteKey,
        minutes: 1,
      },
    });
    minutesAdded = 1;
  }

  return { minutesAdded };
};

const adminListAllSessions = async (req, res) => {
  try {
    const statusFilter = req.query?.status;
    const where = {};
    if (statusFilter && statusFilter !== 'ALL' && statusFilter !== 'all') {
      if (statusFilter === 'ACTIVE') {
        where.status = 'ACTIVE';
      } else if (statusFilter === 'CLOSED') {
        where.status = 'CLOSED';
      }
    }

    const sessions = await prisma.studySession.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, bacSection: true },
        },
        _count: {
          select: {
            participants: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });

    const result = sessions.map((s) => ({
      ...s,
      participantCount: s._count.participants,
      _count: undefined,
    }));

    const liveStudyEnabled = await getLiveStudyEnabled();

    res.json({ sessions: result, liveStudyEnabled });
  } catch (error) {
    logger.error('Error listing all sessions (admin)', error);
    sendError(res, 500, 'Error listing sessions', error);
  }
};

const adminToggleGlobal = async (req, res) => {
  try {
    const { enabled } = req.body || {};
    const newValue = typeof enabled === 'boolean' ? enabled : true;
    const actorId = req.user?.id || null;

    await prisma.appSetting.upsert({
      where: { key: 'liveStudyEnabled' },
      create: {
        key: 'liveStudyEnabled',
        value: String(newValue),
        updatedBy: actorId,
      },
      update: {
        value: String(newValue),
        updatedBy: actorId,
      },
    });

    res.json({ enabled: newValue });
  } catch (error) {
    logger.error('Error toggling global live study (admin)', error);
    sendError(res, 500, 'Error toggling live study', error);
  }
};

const adminCloseSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const session = await prisma.studySession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await stopActiveParticipants(id);
    const updated = await prisma.studySession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        endedAt: new Date(),
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    try {
      const { emitSessionClosed, emitSessionEnded } = require('../config/socketServer');
      if (emitSessionEnded) emitSessionEnded(id, (typeof reason === 'string' && reason.trim()) ? reason.trim() : 'Closed by admin');
      if (emitSessionClosed) emitSessionClosed(id, reason);
    } catch (ioErr) {
      logger.warn('Failed to emit session:closed event', ioErr);
    }

    res.json({ session: updated });
  } catch (error) {
    logger.error('Error closing session (admin)', error);
    sendError(res, 500, 'Error closing session', error);
  }
};

const adminDeleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.studySession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.status === 'ACTIVE' || session.status === 'LIVE' || session.status === 'OPEN') {
      return res.status(400).json({ message: 'Cannot delete an active live session. Close it first.' });
    }
    await prisma.studySession.delete({ where: { id } });
    try {
      const ioRef = socketEm()?.getIO?.();
      if (ioRef) {
        ioRef.emit('admin:live-study:update', { type: 'removed', sessionId: id, permanent: true });
        ioRef.emit('live-study:list:update', { type: 'removed', sessionId: id, permanent: true });
      }
    } catch (_u) { /* ignore */ }
    res.json({ ok: true });
  } catch (error) {
    logger.error('Error deleting session (admin)', error);
    sendError(res, 500, 'Error deleting session', error);
  }
};

module.exports = {
  createSession,
  listMySectionSessions,
  getStudentStatus,
  getSessionById,
  joinSession,
  leaveSession,
  finishSession,
  updateMediaState,
  sendChatMessage,
  ingestHeartbeat,
  ingestHeartbeatForSession,
  getRanking,
  listBadges,
  awardBadges,
  ingestHeartbeatInternal,
  floorToMinute,
  listSessionParticipants,
  listSessionChatHistory,
  getLiveStudyEnabled,
  adminListAllSessions,
  adminToggleGlobal,
  adminCloseSession,
  adminDeleteSession,
  autoCloseIfEmpty,
};
