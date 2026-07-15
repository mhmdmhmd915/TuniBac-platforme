const path = require('path');

const prisma = require('../lib/prisma');
const { deleteObject, headObject, listObjects, putObject, toPublicUrlFromKey } = require('../lib/r2');
const { validateFileBuffer } = require('../utils/fileSecurity');
const { RESOURCE_MAX_SIZE_BYTES, RESOURCE_MIME_TYPES } = require('../utils/uploadPolicies');

const toPosix = (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');

const isSafeKey = (value) => {
  const str = String(value || '').trim();
  if (!str) return false;
  if (str.includes('..')) return false;
  if (str.startsWith('/')) return false;
  return true;
};

const inferKind = (key) => {
  const ext = path.extname(key).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.mp4') return 'video';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) return 'image';
  return 'file';
};

const buildVariants = (key) => {
  const rel = toPosix(key);
  const publicBase = process.env.R2_PUBLIC_URL ? String(process.env.R2_PUBLIC_URL).replace(/\/+$/, '') : '';
  return [
    rel,
    `/uploads/${rel}`,
    `uploads/${rel}`,
    publicBase ? `${publicBase}/${rel}` : null,
  ].filter(Boolean);
};

const isMissingOptionalColumnError = (error, field) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes(String(field || '').toLowerCase()) && message.includes('does not exist');
};

const findManyIfFieldExists = async (query, field) => {
  try {
    return await query();
  } catch (error) {
    if (isMissingOptionalColumnError(error, field)) {
      return [];
    }
    throw error;
  }
};

const updateManyIfFieldExists = async (query, field) => {
  try {
    return await query();
  } catch (error) {
    if (isMissingOptionalColumnError(error, field)) {
      return { count: 0 };
    }
    throw error;
  }
};

async function findReferences(variants) {
  const makeContains = (field) => ({
    OR: variants.map((value) => ({ [field]: { equals: value } })).concat(
      variants.map((value) => ({ [field]: { contains: value } }))
    ),
  });

  const courseContent = await prisma.course.findMany({
    where: makeContains('contentUrl'),
    select: { id: true, title: true },
  });
  const courseVideo = await prisma.course.findMany({
    where: makeContains('videoPath'),
    select: { id: true, title: true },
  });
  const courseAdvertisement = await findManyIfFieldExists(
    () =>
      prisma.course.findMany({
        where: makeContains('advertisementImage'),
        select: { id: true, title: true },
      }),
    'advertisementImage'
  );
  const exerciseContent = await prisma.exercise.findMany({
    where: makeContains('contentUrl'),
    select: { id: true, title: true },
  });
  const exerciseAdvertisement = await findManyIfFieldExists(
    () =>
      prisma.exercise.findMany({
        where: makeContains('advertisementImage'),
        select: { id: true, title: true },
      }),
    'advertisementImage'
  );
  const correctionContent = await prisma.correction.findMany({
    where: makeContains('contentUrl'),
    select: { id: true, title: true, exerciseId: true },
  });
  const parascolaireCover = await prisma.parascolaire.findMany({
    where: makeContains('coverImage'),
    select: { id: true, title: true },
  });
  const parascolairePdf = await prisma.parascolaire.findMany({
    where: makeContains('pdfUrl'),
    select: { id: true, title: true },
  });
  const homeworkFile = await prisma.homeworkSubmission.findMany({
    where: makeContains('fileUrl'),
    select: { id: true },
  });
  const homeworkCorrection = await prisma.homeworkSubmission.findMany({
    where: makeContains('correctionUrl'),
    select: { id: true },
  });
  const courseRes = await prisma.courseResource.findMany({
    where: makeContains('url'),
    select: { id: true, title: true, courseId: true },
  });
  const exerciseRes = await prisma.exerciseResource.findMany({
    where: makeContains('url'),
    select: { id: true, title: true, exerciseId: true },
  });
  const commAttachments = await prisma.communicationAttachment.findMany({
    where: makeContains('filePath'),
    select: { id: true, communicationId: true },
  });

  return {
    coursesContent: courseContent,
    coursesVideo: courseVideo,
    coursesAdvertisement: courseAdvertisement,
    exercisesContent: exerciseContent,
    exercisesAdvertisement: exerciseAdvertisement,
    corrections: correctionContent,
    parascolairesCover: parascolaireCover,
    parascolairesPdf: parascolairePdf,
    homeworkFiles: homeworkFile,
    homeworkCorrections: homeworkCorrection,
    courseResources: courseRes,
    exerciseResources: exerciseRes,
    communicationAttachments: commAttachments,
  };
}

const hasAnyReference = (refs) =>
  Object.values(refs).some((value) => Array.isArray(value) && value.length > 0);

async function listUploads(req, res) {
  const { q, kind, prefix } = req.query;
  const maxItems = Math.min(Number(req.query.limit || 2000) || 2000, 5000);

  const qValue = typeof q === 'string' ? q.trim().toLowerCase() : '';
  const kindValue = typeof kind === 'string' ? kind.trim().toLowerCase() : '';
  const prefixValue = typeof prefix === 'string' ? prefix.trim() : '';
  const safePrefix = prefixValue && isSafeKey(prefixValue) ? toPosix(prefixValue) : '';

  try {
    const items = [];
    let token = null;

    while (items.length < maxItems) {
      const result = await listObjects({ prefix: safePrefix, continuationToken: token, maxKeys: 1000 });
      const contents = Array.isArray(result.Contents) ? result.Contents : [];

      for (const obj of contents) {
        if (!obj || !obj.Key) continue;
        const key = String(obj.Key);
        const rel = toPosix(key);
        const item = {
          path: rel,
          url: toPublicUrlFromKey(rel),
          kind: inferKind(rel),
          size: Number(obj.Size || 0),
          modifiedAt: obj.LastModified ? new Date(obj.LastModified).toISOString() : null,
        };
        items.push(item);
        if (items.length >= maxItems) break;
      }

      if (!result.IsTruncated) break;
      token = result.NextContinuationToken || null;
      if (!token) break;
    }

    const filtered = items.filter((item) => {
      if (kindValue && kindValue !== 'all' && item.kind !== kindValue) return false;
      if (qValue && !item.path.toLowerCase().includes(qValue)) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(b.modifiedAt || 0).getTime() - new Date(a.modifiedAt || 0).getTime());

    return res.json({ items: filtered, total: filtered.length });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to list uploads' });
  }
}

async function deleteUpload(req, res) {
  const { path: key, force } = req.body || {};

  if (!isSafeKey(key)) {
    return res.status(400).json({ message: 'Invalid path' });
  }

  const rel = toPosix(key);
  const exists = await headObject(rel);
  if (!exists) {
    return res.status(404).json({ message: 'File not found' });
  }
  const variants = buildVariants(rel);
  const references = await findReferences(variants);

  if (hasAnyReference(references) && !force) {
    return res.status(409).json({
      message: 'File is in use',
      references,
    });
  }

  if (force) {
    if (references.homeworkFiles.length > 0) {
      return res.status(409).json({
        message: 'File is used by homework submissions and cannot be force-deleted safely',
        references,
      });
    }

    await Promise.all([
      prisma.course.updateMany({ where: { OR: variants.map((value) => ({ contentUrl: { equals: value } })) }, data: { contentUrl: null } }),
      prisma.course.updateMany({ where: { OR: variants.map((value) => ({ videoPath: { equals: value } })) }, data: { videoPath: null } }),
      updateManyIfFieldExists(
        () =>
          prisma.course.updateMany({
            where: { OR: variants.map((value) => ({ advertisementImage: { equals: value } })) },
            data: { advertisementImage: null },
          }),
        'advertisementImage'
      ),
      prisma.exercise.updateMany({ where: { OR: variants.map((value) => ({ contentUrl: { equals: value } })) }, data: { contentUrl: null } }),
      updateManyIfFieldExists(
        () =>
          prisma.exercise.updateMany({
            where: { OR: variants.map((value) => ({ advertisementImage: { equals: value } })) },
            data: { advertisementImage: null },
          }),
        'advertisementImage'
      ),
      prisma.courseResource.deleteMany({ where: { OR: variants.map((value) => ({ url: { equals: value } })) } }),
      prisma.exerciseResource.deleteMany({ where: { OR: variants.map((value) => ({ url: { equals: value } })) } }),
      prisma.correction.deleteMany({ where: { OR: variants.map((value) => ({ contentUrl: { equals: value } })) } }),
      prisma.parascolaire.updateMany({ where: { OR: variants.map((value) => ({ coverImage: { equals: value } })) }, data: { coverImage: null } }),
      prisma.parascolaire.updateMany({ where: { OR: variants.map((value) => ({ pdfUrl: { equals: value } })) }, data: { pdfUrl: null, hasPdf: false, pdfPrice: null } }),
      prisma.homeworkSubmission.updateMany({ where: { OR: variants.map((value) => ({ correctionUrl: { equals: value } })) }, data: { correctionUrl: null } }),
      prisma.communicationAttachment.updateMany({ where: { OR: variants.map((value) => ({ filePath: { equals: value } })) }, data: { filePath: null } }),
    ]);
  }

  await deleteObject(rel);
  return res.json({ deleted: true });
}

async function replaceUpload(req, res) {
  const targetPath = req.body?.targetPath;
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  if (!isSafeKey(targetPath)) {
    return res.status(400).json({ message: 'Invalid targetPath' });
  }

  const rel = toPosix(targetPath);

  try {
    const validationError = validateFileBuffer({
      buffer: req.file.buffer,
      filename: rel,
      mimeType: req.file.mimetype,
      allowedMimeTypes: RESOURCE_MIME_TYPES,
      maxSizeBytes: RESOURCE_MAX_SIZE_BYTES,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    await putObject({
      key: rel,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });

    return res.json({
      item: {
        path: rel,
        url: toPublicUrlFromKey(rel),
        kind: inferKind(rel),
        size: req.file.size || null,
        modifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to replace file' });
  }
}

module.exports = {
  listUploads,
  deleteUpload,
  replaceUpload,
};
