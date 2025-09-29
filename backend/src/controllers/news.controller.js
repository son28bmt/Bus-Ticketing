const { News, User, sequelize } = require('../../models');
const { Op } = require('sequelize');

// ✅ Helper function to generate slug from title
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
};

// ✅ Get all news (admin only)
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
    const whereClause = {};

    if (status) whereClause.status = status;
    if (category) whereClause.category = category;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: news } = await News.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ Retrieved ${count} news articles`);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting all news:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get published news (public)
const getPublishedNews = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category,
      highlighted,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { 
      status: 'PUBLISHED',
      publishedAt: { [Op.lte]: new Date() }
    };

    if (category) whereClause.category = category;
    if (highlighted === 'true') whereClause.isHighlighted = true;
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: news } = await News.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name']
        }
      ],
      order: [
        ['isHighlighted', 'DESC'],
        ['publishedAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    console.log(`✅ Retrieved ${count} published news articles`);

    res.json({
      success: true,
      data: {
        news,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting published news:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get news by ID
const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const { increment = 'true' } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tin tức' });
    }

    const news = await News.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!news) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    // Increment view count if not admin request
    if (increment === 'true') {
      await news.increment('viewCount');
      news.viewCount += 1; // Update the local instance
    }

    console.log(`✅ Retrieved news: ${news.title}`);

    res.json({
      success: true,
      news: news.toJSON()
    });

  } catch (error) {
    console.error('❌ Error getting news by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Get news by slug (public)
const getNewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Thiếu slug tin tức' });
    }

    const news = await News.findOne({
      where: { 
        slug, 
        status: 'PUBLISHED',
        publishedAt: { [Op.lte]: new Date() }
      },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!news) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    // Increment view count
    await news.increment('viewCount');
    news.viewCount += 1;

    console.log(`✅ Retrieved news by slug: ${news.title}`);

    res.json({
      success: true,
      news: news.toJSON()
    });

  } catch (error) {
    console.error('❌ Error getting news by slug:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Create news (admin only)
const createNews = async (req, res) => {
  try {
    const {
      title,
      content,
      summary,
      category = 'OTHER',
      status = 'DRAFT',
      featuredImage,
      tags,
      isHighlighted = false,
      publishNow = false
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tiêu đề và nội dung là bắt buộc' 
      });
    }

    // Generate unique slug
    let baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await News.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newsData = {
      title: title.trim(),
      slug,
      content,
      summary: summary?.trim(),
      category,
      status,
      featuredImage,
      tags: Array.isArray(tags) ? tags : [],
      isHighlighted,
      authorId: req.user.id
    };

    // Set publishedAt if publishing now or status is PUBLISHED
    if (publishNow || status === 'PUBLISHED') {
      newsData.status = 'PUBLISHED';
      newsData.publishedAt = new Date();
    }

    const news = await News.create(newsData);

    const createdNews = await News.findOne({
      where: { id: news.id },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log(`✅ Created news: ${news.title}`);

    res.status(201).json({
      success: true,
      message: 'Tạo tin tức thành công',
      news: createdNews.toJSON()
    });

  } catch (error) {
    console.error('❌ Error creating news:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Update news (admin only)
const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      summary,
      category,
      status,
      featuredImage,
      tags,
      isHighlighted,
      publishNow
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tin tức' });
    }

    const news = await News.findByPk(id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    const updateData = {};

    // Update fields if provided
    if (title) {
      updateData.title = title.trim();
      // Update slug if title changed
      if (title.trim() !== news.title) {
        let baseSlug = generateSlug(title);
        let slug = baseSlug;
        let counter = 1;

        while (await News.findOne({ where: { slug, id: { [Op.ne]: id } } })) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        updateData.slug = slug;
      }
    }

    if (content) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary?.trim();
    if (category) updateData.category = category;
    if (status) updateData.status = status;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (isHighlighted !== undefined) updateData.isHighlighted = isHighlighted;

    // Handle publishing
    if (publishNow || status === 'PUBLISHED') {
      updateData.status = 'PUBLISHED';
      if (!news.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    await news.update(updateData);

    const updatedNews = await News.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log(`✅ Updated news: ${updatedNews.title}`);

    res.json({
      success: true,
      message: 'Cập nhật tin tức thành công',
      news: updatedNews.toJSON()
    });

  } catch (error) {
    console.error('❌ Error updating news:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ Delete news (admin only)
const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu mã tin tức' });
    }

    const news = await News.findByPk(id);
    if (!news) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    await news.destroy();

    console.log(`✅ Deleted news: ${news.title}`);

    res.json({
      success: true,
      message: 'Xóa tin tức thành công'
    });

  } catch (error) {
    console.error('❌ Error deleting news:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa tin tức',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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