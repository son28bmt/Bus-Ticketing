'use strict';

const { createChatCompletion } = require('../../services/chat.service');
const { buildChatContext } = require('../../services/chatContext.service');

const extractUserMetadata = (req) => {
  if (!req?.user) {
    return null;
  }

  const { id, email, fullName, name } = req.user;

  return {
    id,
    email,
    name: fullName || name || null,
  };
};

const handleChatRequest = async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn không hợp lệ',
      });
    }

    const { context, actions } = await buildChatContext(message, history);

    const metadata = {
      user: extractUserMetadata(req),
      context,
    };

    const result = await createChatCompletion({
      message,
      history,
      metadata,
    });

    return res.json({
      success: true,
      reply: result.reply,
      usage: result.usage,
      model: result.model,
      actions,
    });
  } catch (error) {
    console.error('[chat] error', error);

    const noKeyConfigured = error.message?.includes('GEMINI_API_KEY');
    const isQuotaExceeded =
      Number(error?.status) === 429 ||
      error?.code === 'insufficient_quota' ||
      error?.code === 'RESOURCE_EXHAUSTED';

    if (noKeyConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Chưa cấu hình Gemini API key. Liên hệ quản trị hệ thống.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    if (isQuotaExceeded) {
      return res.status(429).json({
        success: false,
        message: 'Đã vượt hạn mức Gemini. Vui lòng kiểm tra gói sử dụng hoặc thử lại sau.',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Không thể kết nối tới Gemini. Vui lòng thử lại sau.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  handleChatRequest,
};
