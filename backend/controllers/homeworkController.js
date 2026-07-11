const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { toPublicUrlFromKey } = require('../lib/r2');

const uploadHomework = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        message: 'No file uploaded',
      });
    }

    const submission = await prisma.homeworkSubmission.create({
      data: {
        userId,
        bacSection: req.user.bacSection,
        fileUrl: String(file.storageKey || ''),
        fileType: file.mimetype,
      },
    });

    return res.status(200).json({
      ...submission,
      fileUrl: toPublicUrlFromKey(submission.fileUrl),
      correctionUrl: submission.correctionUrl ? toPublicUrlFromKey(submission.correctionUrl) : null,
    });
  } catch (error) {
    return sendError(res, 500, 'Error uploading homework', error);
  }
};

const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        userId: userId,
        bacSection: req.user.bacSection,
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    return res.json(
      submissions.map((submission) => ({
        ...submission,
        fileUrl: toPublicUrlFromKey(submission.fileUrl),
        correctionUrl: submission.correctionUrl ? toPublicUrlFromKey(submission.correctionUrl) : null,
      }))
    );

  } catch (error) {
    return sendError(res, 500, 'Error fetching submissions', error);
  }
};

module.exports = {
  uploadHomework,
  getMySubmissions
}; 

