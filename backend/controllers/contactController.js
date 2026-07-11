const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');

const CONTACT_LIMITS = {
  name: 120,
  email: 255,
  message: 5000,
};

const normalizeField = (value, limit) => String(value || '').trim().slice(0, limit);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const submitContact = async (req, res) => {
  try {
    const name = normalizeField(req.body?.name, CONTACT_LIMITS.name);
    const email = normalizeField(req.body?.email, CONTACT_LIMITS.email).toLowerCase();
    const message = normalizeField(req.body?.message, CONTACT_LIMITS.message);

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const contact = await prisma.contact.create({
      data: { name, email, message },
    });
    res.status(201).json({ message: 'Message sent successfully', contact });
  } catch (error) {
    return sendError(res, 500, 'Error sending message', error);
  }
};

const getAllMessages = async (req, res) => {
  try {
    const messages = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(messages);
  } catch (error) {
    return sendError(res, 500, 'Error fetching messages', error);
  }
};

module.exports = { submitContact, getAllMessages };

