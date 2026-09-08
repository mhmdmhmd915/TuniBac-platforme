const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { getAllowedOrigins } = require('./allowedOrigins');
const { loadAuthenticatedUser } = require('../middleware/authMiddleware');
const { logger } = require('../utils/logger');
const {
  ingestHeartbeatInternal,
  awardBadges,
} = require('../controllers/liveStudyController');

function resolveVerifySquadSessionAccess() {
  try {
    const mod = require('../controllers/liveStudyController');
    if (mod && typeof mod.verifySquadSessionAccess === 'function') return mod.verifySquadSessionAccess;
  } catch (_e) {}
  return async () => ({ ok: true });
}

let io = null;

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

const emitSquadInvitation = async (userId, payload) => {
  try {
    const ioInstance = getIO();
    const sockets = await ioInstance.fetchSockets();
    for (const sock of sockets) {
      if (sock.data?.user?.id === userId) {
        sock.emit('study-squad:invitations:new', payload);
        sock.emit('study-squad:update', { type: 'invitations' });
      }
    }
  } catch (_e) { /* ignore */ }
};
module.exports.emitSquadInvitation = emitSquadInvitation;

const broadcastSquadChat = (squadId, payload) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`squad:${squadId}`).emit('study-squad:chat', payload);
    ioInstance.to(`squad:${squadId}`).emit(`study-squad:chat:${squadId}`, payload);
  } catch (_e) { /* ignore */ }
};
module.exports.broadcastSquadChat = broadcastSquadChat;

const broadcastSquadUpdate = (squadId, payload) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`squad:${squadId}`).emit('study-squad:update', { squadId, ...(payload || {}) });
  } catch (_e) { /* ignore */ }
};
module.exports.broadcastSquadUpdate = broadcastSquadUpdate;

const emitSessionClosed = (sessionId, reason) => {
  const ioInstance = getIO();
  const closeReason = typeof reason === 'string' && reason.trim()
    ? reason.trim()
    : 'Closed by admin';
  const payload = { sessionId, reason: closeReason };
  ioInstance.to(`session:${sessionId}`).emit('session:closed', payload);
  ioInstance.to(`session:${sessionId}`).emit('live-study:session:closed', payload);
  ioInstance.to(`session:${sessionId}`).emit(`live-study:session:closed:${sessionId}`, payload);
  ioInstance.emit('live-study:list:update', { type: 'removed', sessionId });
  ioInstance.emit('admin:live-study:update', { type: 'removed', sessionId });
};

module.exports.emitSessionClosed = emitSessionClosed;

const emitSessionEnded = (sessionId, reason) => {
  const ioInstance = getIO();
  const payload = { sessionId, reason: reason || 'Session ended' };
  ioInstance.to(`session:${sessionId}`).emit('session:ended', payload);
  ioInstance.to(`session:${sessionId}`).emit('live-study:session:ended', payload);
  ioInstance.to(`session:${sessionId}`).emit(`live-study:session:ended:${sessionId}`, payload);
  ioInstance.to(`session:${sessionId}`).emit('session:closed', payload);
  ioInstance.to(`session:${sessionId}`).emit('live-study:session:closed', payload);
  ioInstance.to(`session:${sessionId}`).emit(`live-study:session:closed:${sessionId}`, payload);
  ioInstance.emit('live-study:list:update', { type: 'removed', sessionId });
  ioInstance.emit('admin:live-study:update', { type: 'removed', sessionId });
};
module.exports.emitSessionEnded = emitSessionEnded;

const emitParticipantLeft = (sessionId, userId) => {
  const ioInstance = getIO();
  const payload = { sessionId, userId };
  ioInstance.to(`session:${sessionId}`).emit('participant:left', payload);
  ioInstance.to(`session:${sessionId}`).emit('live-study:participant:left', payload);
  ioInstance.emit('live-study:list:update', { type: 'participant:changed', sessionId, userId });
}
module.exports.emitParticipantLeft = emitParticipantLeft;

const emitParticipantJoined = (sessionId, userId) => {
  const ioInstance = getIO();
  ioInstance.emit('live-study:list:update', { type: 'participant:changed', sessionId, userId });
}
module.exports.emitParticipantJoined = emitParticipantJoined;

const shapeParticipant = (row) => {
  if (!row) return null;
  const user = row.user || {};
  const first = user.firstName || row.firstName || '';
  const last = user.lastName || row.lastName || '';
  const name = typeof row.name === 'string' && row.name.trim()
    ? row.name.trim()
    : [first, last].filter(Boolean).join(' ').trim() || row.userId || user.id || 'Student';
  const userId = row.userId || user.id || row.id;
  const isActive = typeof row.isActive === 'boolean' ? row.isActive : row.active !== false;
  const mic = typeof row.mic === 'boolean' ? row.mic : (typeof row.micEnabled === 'boolean' ? row.micEnabled : false);
  const camera = typeof row.camera === 'boolean' ? row.camera : (typeof row.camEnabled === 'boolean' ? row.camEnabled : false);
  return {
    id: userId,
    name,
    active: isActive,
    mic,
    camera,
  };
};
const shapeAllParticipants = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(shapeParticipant).filter(Boolean);
};

module.exports.shapeParticipant = shapeParticipant;
module.exports.shapeAllParticipants = shapeAllParticipants;

const attachSocketServer = (httpServer, options = {}) => {
  const allowedOrigins = getAllowedOrigins();

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    ...options,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const loaded = await loadAuthenticatedUser(decoded);

      if (!loaded.user) {
        return next(new Error(loaded.errorMessage || 'Invalid token'));
      }

      const user = loaded.user;

      if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
        return next(new Error('Access denied'));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      logger.warn('Socket auth failed', err);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    if (user.role === 'STUDENT' && user.bacSection) {
      socket.join(`section:${user.bacSection}`);

      try {
        const memberships = await prisma.studySquadMember.findMany({
          where: { userId: user.id, squad: { status: 'ACTIVE' } },
          select: { squadId: true },
        });
        for (const m of memberships) {
          socket.join(`squad:${m.squadId}`);
        }
      } catch (_e) { /* ignore */ }
    }

    socket.on('session:join-room', async (sessionIdStr, callback) => {
      try {
        const sessionId = String(sessionIdStr || '');
        if (!sessionId) {
          return callback?.({ ok: false, error: 'Session ID required' });
        }

        if (user.role !== 'ADMIN') {
          const session = await prisma.studySession.findUnique({
            where: { id: sessionId },
            select: { bacSection: true, status: true, studySquadId: true },
          });
          if (!session) {
            return callback?.({ ok: false, error: 'Session not found' });
          }
          if (session.status !== 'ACTIVE') {
            return callback?.({ ok: false, error: 'SessionClosed', message: 'Session is closed' });
          }
          if (session.bacSection !== user.bacSection) {
            return callback?.({ ok: false, error: 'Access denied' });
          }
          const verifyFn = resolveVerifySquadSessionAccess();
          const squadAccess = await verifyFn(session, user.id);
          if (!squadAccess.ok) {
            return callback?.({ ok: false, error: 'Access denied' });
          }
        } else {
          const session = await prisma.studySession.findUnique({
            where: { id: sessionId },
            select: { status: true },
          });
          if (session && session.status !== 'ACTIVE') {
            return callback?.({ ok: false, error: 'SessionClosed', message: 'Session is closed' });
          }
        }

        socket.join(`session:${sessionId}`);

        // Ensure socket.user has participant record; upsert active participant state
        try {
          const updated = await prisma.sessionParticipant.updateMany({
            where: { sessionId, userId: user.id },
            data: {
              isActive: true,
              lastSeenAt: new Date(),
              leftAt: null,
            },
          });
          if (updated.count === 0) {
            try {
              await prisma.sessionParticipant.create({
                data: {
                  sessionId,
                  userId: user.id,
                  bacSection: user.bacSection,
                  joinedAt: new Date(),
                  isActive: true,
                  micEnabled: false,
                  camEnabled: false,
                  lastSeenAt: new Date(),
                },
              });
            } catch (_u) {
              // Unique constraint race — ignore
            }
          }
        } catch (e) {
          // Ignore
        }

        // Broadcast FULL participants list to all users in the session room (for instant UI update after join)
        try {
          const all = await prisma.sessionParticipant.findMany({
            where: { sessionId, isActive: true },
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
            orderBy: { joinedAt: 'asc' },
          });
          io.to(`session:${sessionId}`).emit('live-study:presence', { sessionId, participants: shapeAllParticipants(all) });
          io.to(`session:${sessionId}`).emit(`live-study:presence:${sessionId}`, { sessionId, participants: shapeAllParticipants(all) });
        } catch (_e) { /* ignore */ }

        callback?.({ ok: true });
      } catch (err) {
        logger.error('session:join-room error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('session:leave-room', async (sessionIdStr) => {
      const sessionId = String(sessionIdStr || '');
      if (!sessionId) return;
      socket.leave(`session:${sessionId}`);
      if (user.role === 'STUDENT') {
        const now = new Date();
        try {
          await prisma.sessionParticipant.updateMany({
            where: { sessionId, userId: user.id },
            data: { isActive: false, leftAt: now, lastSeenAt: now },
          });
          try { if (emitParticipantLeft) emitParticipantLeft(sessionId, user.id); } catch (_u) { /* ignore */ }
          const all = await prisma.sessionParticipant.findMany({
            where: { sessionId, isActive: true },
            include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
            orderBy: { joinedAt: 'asc' },
          });
          io.to(`session:${sessionId}`).emit('live-study:presence', { sessionId, participants: shapeAllParticipants(all) });
          io.to(`session:${sessionId}`).emit(`live-study:presence:${sessionId}`, { sessionId, participants: shapeAllParticipants(all) });
          try {
            const { autoCloseIfEmpty } = require('../controllers/liveStudyController');
            if (autoCloseIfEmpty) await autoCloseIfEmpty(sessionId);
          } catch (_e) { /* ignore */ }
        } catch (_e) { /* ignore */ }
      }
    });

    socket.on('chat:send', async (payload, callback) => {
      try {
        const { sessionId, content } = payload || {};
        if (!sessionId || !content) {
          return callback?.({ ok: false, error: 'Missing data' });
        }
        if (typeof content !== 'string' || content.length > 1000) {
          return callback?.({ ok: false, error: 'Invalid content' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can chat' });
        }

        const session = await prisma.studySession.findUnique({
          where: { id: sessionId },
          select: { bacSection: true, status: true, studySquadId: true },
        });
        if (!session) {
          return callback?.({ ok: false, error: 'Session not found' });
        }
        if (session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        if (session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }

        const message = await prisma.sessionChatMessage.create({
          data: {
            sessionId,
            userId: user.id,
            bacSection: user.bacSection,
            content,
          },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        });

        const messageSenderName =
          [message.user?.firstName || user.firstName || '', message.user?.lastName || user.lastName || ''].filter(Boolean).join(' ').trim() ||
          'Student';
        const shapedMessage = {
          id: message.id,
          senderId: message.userId,
          senderName: messageSenderName,
          content: message.content,
          createdAt: message.createdAt,
        };

        io.to(`session:${sessionId}`).emit('chat:new', shapedMessage);
        io.to(`session:${sessionId}`).emit('live-study:chat', { sessionId, message: shapedMessage });
        io.to(`session:${sessionId}`).emit(`live-study:chat:${sessionId}`, { sessionId, message: shapedMessage });

        try {
          await awardBadges(user.id);
        } catch (_b) {
          /* ignore */
        }

        callback?.({ ok: true, message: shapedMessage });
      } catch (err) {
        logger.error('chat:send error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('media:update', async (payload, callback) => {
      try {
        const { sessionId, micEnabled, camEnabled } = payload || {};
        if (!sessionId) {
          return callback?.({ ok: false, error: 'Session ID required' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can update media' });
        }

        const session = await prisma.studySession.findUnique({
          where: { id: sessionId },
          select: { bacSection: true, status: true, studySquadId: true },
        });
        if (!session || session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        if (session && session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        if (session) {
          const verifyFn = resolveVerifySquadSessionAccess();
          const squadAccess = await verifyFn(session, user.id);
          if (!squadAccess.ok) {
            return callback?.({ ok: false, error: 'Access denied' });
          }
        }

        const updateData = { lastSeenAt: new Date() };
        if (typeof micEnabled === 'boolean') updateData.micEnabled = micEnabled;
        if (typeof camEnabled === 'boolean') updateData.camEnabled = camEnabled;

        await prisma.sessionParticipant.updateMany({
          where: { sessionId, userId: user.id },
          data: updateData,
        });

        const allAfterMedia = await prisma.sessionParticipant.findMany({
          where: { sessionId, isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
          orderBy: { joinedAt: 'asc' },
        });

        io.to(`session:${sessionId}`).emit('presence:update', {
          userId: user.id,
          micEnabled: updateData.micEnabled,
          camEnabled: updateData.camEnabled,
          lastSeenAt: updateData.lastSeenAt,
        });
        io.to(`session:${sessionId}`).emit('live-study:presence', {
          sessionId,
          participants: shapeAllParticipants(allAfterMedia),
          participant: {
            userId: user.id,
            micEnabled: updateData.micEnabled,
            camEnabled: updateData.camEnabled,
            lastSeenAt: updateData.lastSeenAt,
          },
        });
        io.to(`session:${sessionId}`).emit(`live-study:presence:${sessionId}`, {
          sessionId,
          participants: shapeAllParticipants(allAfterMedia),
          participant: {
            userId: user.id,
            micEnabled: updateData.micEnabled,
            camEnabled: updateData.camEnabled,
            lastSeenAt: updateData.lastSeenAt,
          },
        });

        callback?.({ ok: true });
      } catch (err) {
        logger.error('media:update error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('heartbeat', async (payload, callback) => {
      try {
        const { sessionId } = payload || {};
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can send heartbeat' });
        }

        if (sessionId) {
          const session = await prisma.studySession.findUnique({
            where: { id: sessionId },
            select: { bacSection: true, status: true, studySquadId: true },
          });
          if (!session || session.status !== 'ACTIVE') {
            return callback?.({ ok: false, error: 'Session not active' });
          }
          if (session.bacSection !== user.bacSection) {
            return callback?.({ ok: false, error: 'Access denied' });
          }
          const verifyFn = resolveVerifySquadSessionAccess();
          const squadAccess = await verifyFn(session, user.id);
          if (!squadAccess.ok) {
            return callback?.({ ok: false, error: 'Access denied' });
          }
        }

        const { minutesAdded } = await ingestHeartbeatInternal(
          user.id,
          user.bacSection,
          sessionId || null
        );

        if (sessionId) {
          io.to(`session:${sessionId}`).emit('presence:update', {
            userId: user.id,
            lastSeenAt: new Date(),
          });
          io.to(`session:${sessionId}`).emit('live-study:presence', {
            sessionId,
            participant: { userId: user.id, lastSeenAt: new Date() },
          });
          io.to(`session:${sessionId}`).emit(`live-study:presence:${sessionId}`, {
            sessionId,
            participant: { userId: user.id, lastSeenAt: new Date() },
          });
        }

        let newBadges = [];
        try {
          newBadges = await awardBadges(user.id);
        } catch (_b) {
          /* ignore */
        }

        callback?.({ ok: true, minutesAdded, newBadges });
      } catch (err) {
        logger.error('heartbeat error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('presence:poke', async (payload, callback) => {
      try {
        const { sessionId } = payload || {};
        if (!sessionId) {
          return callback?.({ ok: false, error: 'Session ID required' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: true });
        }

        const session = await prisma.studySession.findUnique({
          where: { id: sessionId },
          select: { bacSection: true, status: true, studySquadId: true },
        });
        if (!session || session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session not active' });
        }
        if (session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }

        const now = new Date();
        await prisma.sessionParticipant.updateMany({
          where: { sessionId, userId: user.id },
          data: { lastSeenAt: now },
        });

        const all = await prisma.sessionParticipant.findMany({
          where: { sessionId, isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
          orderBy: { joinedAt: 'asc' },
        });
        io.to(`session:${sessionId}`).emit('presence:update', {
          userId: user.id,
          lastSeenAt: now,
        });
        io.to(`session:${sessionId}`).emit('live-study:presence', { sessionId, participants: shapeAllParticipants(all) });
        io.to(`session:${sessionId}`).emit(`live-study:presence:${sessionId}`, { sessionId, participants: shapeAllParticipants(all) });

        callback?.({ ok: true });
      } catch (err) {
        logger.error('presence:poke error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (user.role !== 'STUDENT') return;

        const roomNames = [...socket.rooms].filter((r) => r.startsWith('session:'));

        for (const room of roomNames) {
          const sessionId = room.slice('session:'.length);
          const now = new Date();

          await prisma.sessionParticipant.updateMany({
            where: { sessionId, userId: user.id },
            data: { isActive: false, leftAt: now, lastSeenAt: now },
          });

          try { if (emitParticipantLeft) emitParticipantLeft(sessionId, user.id); } catch (_u) { /* ignore */ }

          io.to(room).emit('presence:update', {
            userId: user.id,
            isActive: false,
            lastSeenAt: now,
          });

          io.to(room).emit(`webrtc:peer-left:${sessionId}`, { userId: user.id, sessionId });
          socket.to(room).emit('webrtc:bye', { from: user.id, to: '*', sessionId });

          try {
            const all = await prisma.sessionParticipant.findMany({
              where: { sessionId, isActive: true },
              include: { user: { select: { id: true, firstName: true, lastName: true, bacSection: true } } },
              orderBy: { joinedAt: 'asc' },
            });
            io.to(room).emit('live-study:presence', { sessionId, participants: shapeAllParticipants(all) });
            io.to(room).emit(`live-study:presence:${sessionId}`, { sessionId, participants: shapeAllParticipants(all) });
          } catch (_e) { /* ignore */ }

          try {
            const { autoCloseIfEmpty } = require('../controllers/liveStudyController');
            if (autoCloseIfEmpty) await autoCloseIfEmpty(sessionId);
          } catch (_e) { /* ignore */ }
        }
      } catch (err) {
        logger.error('Socket disconnect handling error', err);
      }
    });

    socket.on('webrtc:hello', async (payload, callback) => {
      try {
        const { sessionId } = payload || {};
        if (!sessionId) {
          return callback?.({ ok: false, error: 'Session ID required' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can send media' });
        }
        const session = await prisma.studySession.findUnique({ where: { id: sessionId }, select: { bacSection: true, status: true, studySquadId: true } });
        if (!session || session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        if (session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        socket.to(`session:${sessionId}`).emit(`webrtc:peer-joined:${sessionId}`, { userId: user.id, sessionId });
        callback?.({ ok: true });
      } catch (err) {
        logger.error('webrtc:hello error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('webrtc:offer', async (payload, callback) => {
      try {
        const { sessionId, to, sdp } = payload || {};
        if (!sessionId || !to || !sdp) {
          return callback?.({ ok: false, error: 'Missing data' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can send media' });
        }
        const session = await prisma.studySession.findUnique({ where: { id: sessionId }, select: { bacSection: true, status: true, studySquadId: true } });
        if (!session || session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        if (session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        io.to(`session:${sessionId}`).emit('webrtc:offer', { from: user.id, to, sessionId, sdp });
        callback?.({ ok: true });
      } catch (err) {
        logger.error('webrtc:offer error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('webrtc:answer', async (payload, callback) => {
      try {
        const { sessionId, to, sdp } = payload || {};
        if (!sessionId || !to || !sdp) {
          return callback?.({ ok: false, error: 'Missing data' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can send media' });
        }
        const session = await prisma.studySession.findUnique({ where: { id: sessionId }, select: { bacSection: true, status: true, studySquadId: true } });
        if (!session || session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        if (session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        io.to(`session:${sessionId}`).emit('webrtc:answer', { from: user.id, to, sessionId, sdp });
        callback?.({ ok: true });
      } catch (err) {
        logger.error('webrtc:answer error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('webrtc:ice', async (payload, callback) => {
      try {
        const { sessionId, to, candidate } = payload || {};
        if (!sessionId || !to) {
          return callback?.({ ok: false, error: 'Missing data' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can send media' });
        }
        const session = await prisma.studySession.findUnique({ where: { id: sessionId }, select: { bacSection: true, status: true, studySquadId: true } });
        if (!session || session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        if (session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        io.to(`session:${sessionId}`).emit('webrtc:ice', { from: user.id, to, sessionId, candidate });
        callback?.({ ok: true });
      } catch (err) {
        logger.error('webrtc:ice error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });

    socket.on('webrtc:bye', async (payload, callback) => {
      try {
        const { sessionId, to } = payload || {};
        if (!sessionId) {
          return callback?.({ ok: false, error: 'Missing data' });
        }
        if (user.role !== 'STUDENT') {
          return callback?.({ ok: false, error: 'Only students can send media' });
        }
        const session = await prisma.studySession.findUnique({ where: { id: sessionId }, select: { bacSection: true, status: true, studySquadId: true } });
        if (!session || session.bacSection !== user.bacSection) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        if (session.status !== 'ACTIVE') {
          return callback?.({ ok: false, error: 'Session closed' });
        }
        const squadAccess = await verifySquadSessionAccess(session, user.id);
        if (!squadAccess.ok) {
          return callback?.({ ok: false, error: 'Access denied' });
        }
        io.to(`session:${sessionId}`).emit('webrtc:bye', { from: user.id, to: to || '*', sessionId });
        callback?.({ ok: true });
      } catch (err) {
        logger.error('webrtc:bye error', err);
        callback?.({ ok: false, error: 'Server error' });
      }
    });
  });

  return io;
};

module.exports = attachSocketServer;
module.exports.getIO = getIO;
module.exports.emitSessionClosed = emitSessionClosed;
module.exports.emitSessionEnded = emitSessionEnded;
module.exports.emitParticipantLeft = emitParticipantLeft;
module.exports.emitParticipantJoined = emitParticipantJoined;
module.exports.shapeParticipant = shapeParticipant;
module.exports.shapeAllParticipants = shapeAllParticipants;
module.exports.attachSocketServer = attachSocketServer;
module.exports.default = attachSocketServer;
module.exports.emitSquadInvitation = emitSquadInvitation;
module.exports.broadcastSquadChat = broadcastSquadChat;
module.exports.broadcastSquadUpdate = broadcastSquadUpdate;
