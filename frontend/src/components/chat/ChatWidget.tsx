import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { chatAPI, type ChatHistoryItem, type ChatAction } from "../../services/chat";
import "../../style/chat-widget.css";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status?: "error";
  actions?: ChatAction[];
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const RESPONSE_DELAY_MS = 800;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatMessageContent = (raw: string) => {
  const escaped = escapeHtml(raw);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*(?!\*)(.+?)\*(?!\*)/gs, "<em>$1</em>");
  const withLineBreaks = withItalic.replace(/\n/g, "<br />");
  return withLineBreaks;
};

const welcomeMessage: ChatMessage = {
  id: "welcome-message",
  role: "assistant",
  content:
    "Xin chào! Mình là ShanBus Copilot. Bạn cần hỗ trợ tìm chuyến, đặt vé hay voucher cứ nhắn nhé.",
};

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isOpen]);

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      if (!containerRef.current || !isOpen) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsThinking(false);
      }
    };

    document.addEventListener("mousedown", clickHandler);
    return () => document.removeEventListener("mousedown", clickHandler);
  }, [isOpen]);

  const historyPayload = useMemo<ChatHistoryItem[]>(() => {
    return messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }, [messages]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed || isSending) {
      return;
    }

    const currentMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, currentMessage]);
    setInputValue("");
    setIsSending(true);
    setIsThinking(true);
    setErrorHint(null);

    try {
      const response = await chatAPI.sendMessage({
        message: trimmed,
        history: historyPayload,
      });

      const replyText =
        response?.reply?.trim() || "Xin lỗi, mình chưa có thông tin cho câu hỏi này.";

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: "assistant",
            content: replyText,
            actions: response.actions,
          },
        ]);
        setIsThinking(false);
      }, RESPONSE_DELAY_MS);
    } catch (error) {
      console.error("[ChatWidget] send error", error);
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: "assistant",
          content: "Hiện tại hệ thống đang bận. Bạn hãy thử lại sau ít phút nhé.",
          status: "error",
        },
      ]);
      setErrorHint("Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối và thử lại.");
      setIsThinking(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setErrorHint(null);
    if (isOpen) {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  };

  return (
    <div className="chatbot-wrapper" ref={containerRef}>
      {isOpen && (
        <div className="chatbot-panel" role="dialog" aria-label="ShanBus Copilot">
          <header className="chatbot-header">
            <div>
              <p className="chatbot-title">ShanBus Copilot</p>
              <p className="chatbot-subtitle">Hỗ trợ 24/7 (beta)</p>
            </div>
            <button className="chatbot-close" onClick={handleToggle} aria-label="Đóng chat">
              ×
            </button>
          </header>
          <div className="chatbot-messages" ref={messageListRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-message message-${message.role} ${
                  message.status === "error" ? "message-error" : ""
                }`}
              >
                <span className="chat-author">{message.role === "assistant" ? "Copilot" : "Bạn"}</span>
                <p
                  className="chat-content"
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                />
                {message.actions?.length ? (
                  <div className="chat-actions">
                    {message.actions.map((action) => (
                      <a
                        key={`${message.id}-${action.label}`}
                        className="chat-action-link"
                        href={action.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isThinking && (
              <div className="chatbot-typing" aria-live="polite">
                <span />
                <span />
                <span />
                <p>Copilot đang soạn trả lời...</p>
              </div>
            )}
          </div>
          <form className="chatbot-input-area" onSubmit={sendMessage}>
            <textarea
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Nhập câu hỏi về chuyến xe, vé, voucher..."
              rows={2}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" disabled={isSending || !inputValue.trim()}>
              {isSending ? "Đang gửi..." : "Gửi"}
            </button>
          </form>
          {errorHint && <p className="chatbot-error">{errorHint}</p>}
          <p className="chatbot-hint">Tin nhắn có thể được ghi lại để cải thiện trải nghiệm.</p>
        </div>
      )}
      {!isOpen && (
        <button
          className="chatbot-launcher"
          type="button"
          aria-label="Mở chat ShanBus Copilot"
          onClick={handleToggle}
          aria-expanded={isOpen}
        >
          💬
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
