"use strict";

const fetch = require("node-fetch");

const allowedRoles = new Set(["user", "assistant"]);
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const MAX_HISTORY_ITEMS = 10;
const GEMINI_BASE_URL =
  process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";

const baseSystemPrompt = `Bạn là **ShanBus Copilot**, trợ lý AI hỗ trợ người dùng trong ứng dụng đặt vé xe khách *ShanBus*.

========================
1) Tông giọng & phong cách
- Trả lời tiếng Việt thân thiện, rõ ràng, chuyên nghiệp.
- Ngôn từ ngắn gọn, vào thẳng kết quả, không lan man.
- Không xin lỗi trừ khi thực sự cần thiết.
- Không dùng emoji trừ khi người dùng dùng trước.
- Ưu tiên trình bày sạch, giống giao diện ứng dụng.

========================
2) Quy tắc trình bày trả lời
Luôn sử dụng format:

**[Tiêu đề ngắn gọn]**

1. Bước 1…
2. Bước 2…
3. Bước 3…

**Ghi chú**
- Bullet 1
- Bullet 2

Kết thúc bằng câu hỏi nhẹ:
“Bạn cần mình kiểm tra giúp chuyến cụ thể nào không?”  
hoặc  
“Bạn muốn mình hỗ trợ thêm bước nào nữa không?”

Quy ước:
- Dùng **in đậm** cho nút, chức năng, tên trang: **Home**, **Tìm chuyến**, **Thanh toán**, **MyTickets**.
- Dùng *nghiêng* cho tên ứng dụng *ShanBus*.
- Không mở đầu bằng "Chào bạn" nếu người dùng không chào.

========================
3) Khả năng truy vấn dữ liệu thật (QUAN TRỌNG)
Bạn có quyền gọi API/function để:
- Lấy danh sách chuyến xe
- Kiểm tra ghế trống
- Kiểm tra/áp dụng voucher
- Kiểm tra vé đã mua
- Lịch sử đặt vé
- Xem thông tin tài khoản
- Truy vấn trạng thái chuyến
- Hỗ trợ validate thanh toán

Quy tắc khi dùng dữ liệu:
- **Nếu có function/API**, ưu tiên gọi trước khi trả lời.
- **Không tự bịa dữ liệu** nếu API không trả về.
- Nếu API không có thông tin → trả lời:
  “Hiện mình chưa có dữ liệu trong hệ thống, bạn vui lòng thử lại hoặc liên hệ mục Contact nhé.”

========================
4) Quy tắc về Voucher
- Khi người dùng nhập mã/voucher → dùng API để kiểm tra.
- Nếu valid: giải thích rõ điều kiện, mức giảm, đơn tối thiểu…
- Nếu invalid: trả lời lý do từ API (không suy đoán).
- Nếu chưa rõ dữ liệu: báo “Chưa có thông tin”.

========================
5) Quy tắc cho tìm chuyến
Khi người dùng hỏi “Đà Nẵng → Hà Nội hôm nay còn xe không?”:
1. Dùng API tìm chuyến theo điểm đi/điểm đến/ngày.
2. Nếu có chuyến:
   - Trả lời danh sách theo format rõ ràng.
3. Nếu không có:
   - Thông báo không có chuyến.
- Tuyệt đối không tự tạo dữ liệu chuyến.

========================
6) Hạn chế & an toàn
- Không tiết lộ thông tin nội bộ, code backend, secrets hoặc cấu trúc DB.
- Không trả lời ngoài phạm vi chức năng *ShanBus*.
- Không nhận đặt vé trực tiếp trừ khi được gọi qua function “createBooking”.
- Không đưa lời khuyên tài chính.

========================
7) Ví dụ trả lời đúng chuẩn

**Kết quả kiểm tra chuyến Đà Nẵng → Hà Nội**

1. Mình đã kiểm tra trên hệ thống, hiện có X chuyến trong ngày:
   - 08:00 — Nhà xe ABC — Còn 12 ghế
   - 14:30 — Nhà xe XYZ — Còn 4 ghế
2. Để đặt vé:
   - Vào trang **Home**
   - Chọn Đà Nẵng → Hà Nội
   - Chọn giờ chạy bạn muốn
   - Nhấn **Thanh toán**

Bạn muốn mình kiểm tra chuyến khác không?

========================

Luôn sẵn sàng hỗ trợ người dùng.  
Ưu tiên **thông tin đúng**, **format rõ**, **dựa trên dữ liệu thật** và **không suy đoán**.
`;

const ensureApiKey = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return process.env.GEMINI_API_KEY;
};

const normalizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        allowedRoles.has(item.role) &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000),
    }));
};

const buildSystemPrompt = (metadata = {}) => {
  const sections = [baseSystemPrompt];

  const userMeta = [];
  if (metadata?.user?.id) userMeta.push(`UserId: ${metadata.user.id}`);
  if (metadata?.user?.email) userMeta.push(`Email: ${metadata.user.email}`);
  if (metadata?.user?.name) userMeta.push(`Ten: ${metadata.user.name}`);

  if (userMeta.length > 0) {
    sections.push("Ngu canh nguoi dung:");
    sections.push(userMeta.join("\n"));
  }

  if (metadata?.context) {
    sections.push('========================');
    sections.push('Du lieu phan tich tu he thong:');
    sections.push(metadata.context);
  }

  return sections.join("\n\n");
};

const mapRoleToGemini = (role) => (role === "assistant" ? "model" : "user");

const toGeminiContents = (items) =>
  items.map((item) => ({
    role: mapRoleToGemini(item.role),
    parts: [{ text: item.content }],
  }));

const buildPayload = ({ history, message, metadata }) => {
  const trimmedMessage = message.trim();

  const contents = [
    {
      role: 'user',
      parts: [{ text: buildSystemPrompt(metadata) }],
    },
    ...toGeminiContents(history),
    {
      role: 'user',
      parts: [{ text: trimmedMessage }],
    },
  ];

  const generationConfig = {
    temperature: Number(process.env.GEMINI_TEMPERATURE ?? 0.3),
    maxOutputTokens: Number(process.env.GEMINI_MAX_TOKENS ?? 500),
  };

  return {
    contents,
    generationConfig,
  };
};

const extractReply = (data) => {
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    return null;
  }

  const parts = candidate.content?.parts || [];
  const text = parts
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  return text || null;
};

const mapUsage = (usage = {}) => {
  if (!usage) return null;
  return {
    prompt_tokens: usage.promptTokenCount ?? null,
    completion_tokens: usage.candidatesTokenCount ?? null,
    total_tokens: usage.totalTokenCount ?? null,
  };
};

const createChatCompletion = async ({
  message,
  history = [],
  metadata = {},
}) => {
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  if (!trimmedMessage) {
    throw new Error("Message content is required");
  }

  const apiKey = ensureApiKey();
  const normalizedHistory = normalizeHistory(history);
  const payload = buildPayload({
    history: normalizedHistory,
    message: trimmedMessage,
    metadata,
  });
  const model = DEFAULT_MODEL;

  const response = await fetch(
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(
      model
    )}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = null;
    }

    const error = new Error(
      parsed?.error?.message || `Gemini API error (${response.status})`
    );
    error.status = response.status;
    error.code = parsed?.error?.status || parsed?.error?.code;
    error.details = parsed || text;
    throw error;
  }

  const data = await response.json();
  const reply =
    extractReply(data) ||
    "Xin loi, hien tai minh chua co thong tin phu hop. Ban co the thu cach hoi khac nhe.";

  return {
    reply,
    usage: mapUsage(data?.usageMetadata),
    model,
  };
};

module.exports = {
  createChatCompletion,
};
