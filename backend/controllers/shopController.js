const prisma = require('../lib/prisma');
const { sendError } = require('../utils/http');
const { logger } = require('../utils/logger');
const { sanitizeUrl } = require('../utils/sanitizeHtml');
const { normalizeStoredFileValueToKey, toPublicUrlFromStoredValue, deleteObject } = require('../lib/r2');
const { validateStoredUpload } = require('../utils/storedUploadSecurity');
const { IMAGE_MAX_SIZE_BYTES, IMAGE_MIME_TYPES } = require('../utils/uploadPolicies');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');
const optionalString = (value) => {
  const normalized = cleanString(value);
  return normalized ? normalized : null;
};
const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};
const normalizeWhatsapp = (value) => {
  const digits = String(value || '').replace(/\D+/g, '');
  return digits || null;
};
const parsePrice = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const serializeProduct = (product) => ({
  ...product,
  image: product.image ? toPublicUrlFromStoredValue(product.image) : null,
});

const buildProductData = async (req) => {
  const image = req.body.image ? normalizeStoredFileValueToKey(req.body.image) : null;
  if (image) {
    await validateStoredUpload({
      storedValue: image,
      allowedMimeTypes: IMAGE_MIME_TYPES,
      maxSizeBytes: IMAGE_MAX_SIZE_BYTES,
    });
  }

  return {
    name: optionalString(req.body.name),
    description: optionalString(req.body.description),
    image,
    price: parsePrice(req.body.price),
    whatsapp: normalizeWhatsapp(req.body.whatsapp),
    externalLink: sanitizeUrl(optionalString(req.body.externalLink)),
    isActive: parseBoolean(req.body.isActive, true),
    order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0,
  };
};

const getPublicProducts = async (req, res) => {
  try {
    const products = await prisma.shopProduct.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(products.map(serializeProduct));
  } catch (error) {
    logger.error('Error fetching shop products', error);
    sendError(res, 500, 'Error fetching shop products', error);
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.shopProduct.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(products.map(serializeProduct));
  } catch (error) {
    logger.error('Error fetching admin shop products', error);
    sendError(res, 500, 'Error fetching shop products', error);
  }
};

const createProduct = async (req, res) => {
  try {
    const data = await buildProductData(req);
    if (!data.name) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    const product = await prisma.shopProduct.create({ data });
    res.status(201).json({ message: 'Product created', product: serializeProduct(product) });
  } catch (error) {
    logger.error('Error creating shop product', error);
    sendError(res, 500, 'Error creating shop product', error);
  }
};

const updateProduct = async (req, res) => {
  try {
    const data = await buildProductData(req);
    const existing = await prisma.shopProduct.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const product = await prisma.shopProduct.update({
      where: { id: req.params.id },
      data,
    });
    if (existing.image && data.image !== existing.image) {
      await deleteObject(existing.image).catch(() => {});
    }
    res.json({ message: 'Product updated', product: serializeProduct(product) });
  } catch (error) {
    logger.error('Error updating shop product', error);
    sendError(res, 500, 'Error updating shop product', error);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const existing = await prisma.shopProduct.findUnique({
      where: { id: req.params.id },
      select: { id: true, image: true },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await prisma.shopProduct.delete({ where: { id: req.params.id } });
    if (existing.image) {
      await deleteObject(existing.image).catch(() => {});
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    logger.error('Error deleting shop product', error);
    sendError(res, 500, 'Error deleting shop product', error);
  }
};

const reorderProducts = async (req, res) => {
  try {
    const orderedItems = Array.isArray(req.body.orderedItems) ? req.body.orderedItems : [];
    if (orderedItems.length === 0) {
      return res.status(400).json({ message: 'orderedItems is required' });
    }
    await prisma.$transaction(
      orderedItems.map((item) =>
        prisma.shopProduct.update({
          where: { id: item.id },
          data: { order: Number(item.order) || 0 },
        })
      )
    );
    res.json({ message: 'Products reordered successfully' });
  } catch (error) {
    logger.error('Error reordering shop products', error);
    sendError(res, 500, 'Error reordering shop products', error);
  }
};

const getProductDetail = async (req, res) => {
  try {
    const product = await prisma.shopProduct.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ product: serializeProduct(product) });
  } catch (error) {
    logger.error('Error fetching shop product detail', error);
    sendError(res, 500, 'Error fetching product', error);
  }
};

module.exports = {
  getPublicProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
  getProductDetail,
};
