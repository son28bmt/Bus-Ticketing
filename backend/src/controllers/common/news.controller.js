const { ROLES } = require('../../constants/roles');
const { News, User, sequelize } = require('../../../models');
const { Op } = require('sequelize');

// Helper: generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Runtime detection: does the 'news' table have companyId column?
let _newsHasCompanyId = null;
const newsHasCompanyId = async () => {
  if (_newsHasCompanyId !== null) return _newsHasCompanyId;
  try {
    const qi = sequelize.getQueryInterface();
    const desc = await qi.describeTable('news');
    _newsHasCompanyId = !!desc.companyId;
  } catch (err) {
    // If describeTable fails (table missing or permission), treat as false
    console.warn('Could not detect news.companyId column:', err.message);
    _newsHasCompanyId = false;
  }
  return _newsHasCompanyId;
};

const getAllNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const hasCompany = await newsHasCompanyId();
    if (hasCompany && req.user && req.user.role === ROLES.COMPANY && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const include = [
      { model: User, as: 'author', attributes: ['id', 'name', 'email'] }
    ];
    if (hasCompany && sequelize.models.BusCompany) {
      include.push({ model: sequelize.models.BusCompany, as: 'company', attributes: ['id', 'name', 'code'] });
    }

    const { count, rows } = await News.findAndCountAll({
      where,
      include,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.json({ success: true, data: { news: rows, pagination: { total: count, page: parseInt(page, 10), pages: Math.ceil(count / limit), limit: parseInt(limit, 10) } } });
  } catch (error) {
    console.error('Error getting all news:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy danh sách tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const getPublishedNews = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, highlighted, search } = req.query;
    const offset = (page - 1) * limit;
    const where = { status: 'PUBLISHED', publishedAt: { [Op.lte]: new Date() } };
    if (category) where.category = category;
    if (highlighted === 'true') where.isHighlighted = true;
    if (search) where[Op.or] = [{ title: { [Op.like]: `%${search}%` } }, { summary: { [Op.like]: `%${search}%` } }];

    const include = [{ model: User, as: 'author', attributes: ['id', 'name'] }];
    const hasCompany = await newsHasCompanyId();
    if (hasCompany && sequelize.models.BusCompany) include.push({ model: sequelize.models.BusCompany, as: 'company', attributes: ['id', 'name', 'code'] });

    const { count, rows } = await News.findAndCountAll({ where, include, order: [['isHighlighted', 'DESC'], ['publishedAt', 'DESC']], limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
    res.json({ success: true, data: { news: rows, pagination: { total: count, page: parseInt(page, 10), pages: Math.ceil(count / limit), limit: parseInt(limit, 10) } } });
  } catch (error) {
    console.error('Error getting published news:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const { increment = 'true' } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu mã tin tức' });
    const include = [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }];
    if (await newsHasCompanyId() && sequelize.models.BusCompany) include.push({ model: sequelize.models.BusCompany, as: 'company', attributes: ['id', 'name', 'code'] });
    const item = await News.findOne({ where: { id }, include });
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    if (increment === 'true') { await item.increment('viewCount'); }
    res.json({ success: true, news: item.toJSON() });
  } catch (error) {
    console.error('Error getting news by ID:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const getNewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ success: false, message: 'Thiếu slug tin tức' });
    const include = [{ model: User, as: 'author', attributes: ['id', 'name'] }];
    if (await newsHasCompanyId() && sequelize.models.BusCompany) include.push({ model: sequelize.models.BusCompany, as: 'company', attributes: ['id', 'name', 'code'] });
    const item = await News.findOne({ where: { slug, status: 'PUBLISHED', publishedAt: { [Op.lte]: new Date() } }, include });
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    await item.increment('viewCount');
    res.json({ success: true, news: item.toJSON() });
  } catch (error) {
    console.error('Error getting news by slug:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi lấy tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const createNews = async (req, res) => {
  try {
    const { title, content, summary, category = 'OTHER', status = 'DRAFT', featuredImage, tags, isHighlighted = false, publishNow = false } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
    let baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    while (await News.findOne({ where: { slug } })) { slug = `${baseSlug}-${counter}`; counter++; }
    const data = { title: title.trim(), slug, content, summary: summary?.trim(), category, status, featuredImage, tags: Array.isArray(tags) ? tags : [], isHighlighted, authorId: req.user.id };
    if (await newsHasCompanyId()) { data.companyId = req.user && req.user.role === ROLES.COMPANY ? req.user.companyId : req.body.companyId; }
    if (publishNow || status === 'PUBLISHED') { data.status = 'PUBLISHED'; data.publishedAt = new Date(); }
    const created = await News.create(data);
    const include = [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }];
    if (await newsHasCompanyId() && sequelize.models.BusCompany) include.push({ model: sequelize.models.BusCompany, as: 'company', attributes: ['id', 'name', 'code'] });
    const newsItem = await News.findOne({ where: { id: created.id }, include });
    res.status(201).json({ success: true, message: 'Tạo tin tức thành công', news: newsItem.toJSON() });
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi tạo tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, summary, category, status, featuredImage, tags, isHighlighted, publishNow } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu mã tin tức' });
    const item = await News.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    if (await newsHasCompanyId() && req.user && req.user.role === ROLES.COMPANY && item.companyId && item.companyId !== req.user.companyId) return res.status(403).json({ success: false, message: 'Không có quyền chỉnh sửa tin tức của nhà xe khác' });
    const update = {};
    if (title) { update.title = title.trim(); if (title.trim() !== item.title) { let base = generateSlug(title); let s = base; let c = 1; while (await News.findOne({ where: { slug: s, id: { [Op.ne]: id } } })) { s = `${base}-${c}`; c++; } update.slug = s; } }
    if (content) update.content = content;
    if (summary !== undefined) update.summary = summary?.trim();
    if (category) update.category = category;
    if (status) update.status = status;
    if (featuredImage !== undefined) update.featuredImage = featuredImage;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (isHighlighted !== undefined) update.isHighlighted = isHighlighted;
    if (publishNow || status === 'PUBLISHED') { update.status = 'PUBLISHED'; if (!item.publishedAt) update.publishedAt = new Date(); }
    await item.update(update);
    const include = [{ model: User, as: 'author', attributes: ['id', 'name', 'email'] }];
    if (await newsHasCompanyId() && sequelize.models.BusCompany) include.push({ model: sequelize.models.BusCompany, as: 'company', attributes: ['id', 'name', 'code'] });
    const updated = await News.findOne({ where: { id }, include });
    res.json({ success: true, message: 'Cập nhật tin tức thành công', news: updated.toJSON() });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu mã tin tức' });
    const item = await News.findByPk(id);
    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    if (await newsHasCompanyId() && req.user && req.user.role === ROLES.COMPANY && item.companyId && item.companyId !== req.user.companyId) return res.status(403).json({ success: false, message: 'Không có quyền xóa tin tức của nhà xe khác' });
    await item.destroy();
    res.json({ success: true, message: 'Xóa tin tức thành công' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ success: false, message: 'Lỗi server khi xóa tin tức', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Export will be declared after all functions (including getNewsStats) are defined
// ✅ Get news categories and statistics (admin)
const getNewsStats = async (req, res) => {
  try {
    const stats = await News.findAll({
      attributes: [
        'category',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category', 'status'],
      raw: true
    });

    const totalNews = await News.count();
    const publishedNews = await News.count({ where: { status: 'PUBLISHED' } });
    const draftNews = await News.count({ where: { status: 'DRAFT' } });
    const highlightedNews = await News.count({ where: { isHighlighted: true, status: 'PUBLISHED' } });

    res.json({
      success: true,
      stats: {
        total: totalNews,
        published: publishedNews,
        draft: draftNews,
        highlighted: highlightedNews,
        byCategory: stats.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = {};
          acc[item.category][item.status] = parseInt(item.count);
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('❌ Error getting news stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllNews,
  getPublishedNews,
  getNewsById,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews,
  getNewsStats
};


