const { buildLearningPathTree } = require('../utils/learningPath');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');

const getLearningPath = async (req, res) => {
  try {
    const tree = await buildLearningPathTree(req);
    res.json(tree);
  } catch (error) {
    logger.error('Error building learning path', error);
    sendError(res, 500, 'Error building learning path', error);
  }
};

module.exports = { getLearningPath };
