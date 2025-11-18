import api from "./http";

export type ChatRole = "user" | "assistant";

export interface ChatAction {
  type: "link";
  label: string;
  url: string;
}

export interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  model?: string;
  actions?: ChatAction[];
}

export const chatAPI = {
  sendMessage: async (payload: { message: string; history?: ChatHistoryItem[] }) => {
    const response = await api.post<ChatResponse>("/chat", payload);
    return response.data;
  },
};
