// apps/web/src/types/index.ts
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  generationTime?: number;
}

export interface Chat {
  id: string;
  title: string;
  context: string;
  messages: Message[];
  createdAt: number;
  isStreaming?: boolean;
  streamingStartTime?: number;
  draftMessage?: string;
}

export interface AppState {
  chats: Chat[];
  activeChatId: string | null;
}

// All possible actions our app can take to change the state
export type Action =
  | { type: 'CREATE_CHAT'; payload: { context: string; title: string } }
  | { type: 'DELETE_CHAT'; payload: { chatId: string } }
  | { type: 'SET_ACTIVE_CHAT'; payload: { chatId: string | null } }
  | { type: 'ADD_USER_MESSAGE'; payload: { chatId: string; content: string } }
  | { type: 'ADD_MODEL_PLACEHOLDER'; payload: { chatId: string } }
  | { type: 'APPEND_STREAM_TOKEN'; payload: { chatId: string; token: string } }
  | { type: 'SET_CHAT_STREAMING_STATUS'; payload: { chatId: string; isStreaming: boolean } }
  | { type: 'SET_STREAMING_START_TIME'; payload: { chatId: string; startTime: number | undefined } }
  | { type: 'ROLLBACK_LAST_EXCHANGE'; payload: { chatId: string } }
  | { type: 'UPDATE_DRAFT_MESSAGE'; payload: { chatId: string; text: string } };