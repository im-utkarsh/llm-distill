// frontend/src/providers/chatReducer.ts

import type { AppState, Action, Chat, Message } from '../types';
import { generateUUID } from '../lib/utils';

export const chatReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'CREATE_CHAT': {
      const newChat: Chat = {
        id: generateUUID(),
        title: action.payload.title || `Chat - ${new Date().toLocaleTimeString()}`,
        context: action.payload.context,
        messages: [],
        createdAt: Date.now(),
        isStreaming: false,
        draftMessage: '', // ✨ INITIALIZE THE DRAFT MESSAGE
      };
      const newChats = [newChat, ...state.chats];
      return {
        ...state,
        chats: newChats,
        activeChatId: newChat.id,
      };
    }

    case 'DELETE_CHAT': {
      const updatedChats = state.chats.filter(c => c.id !== action.payload.chatId);
      let newActiveChatId = state.activeChatId;
      // If the deleted chat was the active one, activate the first chat in the list or null.
      if (state.activeChatId === action.payload.chatId) {
        newActiveChatId = updatedChats[0]?.id || null;
      }
      return { ...state, chats: updatedChats, activeChatId: newActiveChatId };
    }

    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChatId: action.payload.chatId };

    case 'ADD_USER_MESSAGE': {
      const { chatId, content } = action.payload;
      const newUserMessage: Message = { id: generateUUID(), role: 'user', content };
      
      const updatedChats = state.chats.map(chat =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, newUserMessage] }
          : chat
      );
      return { ...state, chats: updatedChats };
    }

    case 'ADD_MODEL_PLACEHOLDER': {
        const { chatId } = action.payload;
        const newModelMessage: Message = { id: generateUUID(), role: 'model', content: '' };
        
        const updatedChats = state.chats.map(chat =>
            chat.id === chatId
            ? { ...chat, messages: [...chat.messages, newModelMessage] }
            : chat
        );
        return { ...state, chats: updatedChats };
    }

    case 'APPEND_STREAM_TOKEN': {
        const { chatId, token } = action.payload;
        
      // This is an immutable update. Instead of modifying the existing state,
      // we create a new `chats` array. For the target chat, we create a new
      // `messages` array, updating only the last message. This is crucial for
      // React's change detection to work correctly.
        return {
            ...state,
            chats: state.chats.map(chat => {
          if (chat.id !== chatId) return chat;

                const lastMessage = chat.messages[chat.messages.length - 1];
          if (lastMessage?.role !== 'model') return chat;
          const isFirstToken = lastMessage.content === '';
                let generationTime;

                if (isFirstToken && chat.streamingStartTime) {
                  // Calculate time to first token and set it
                  generationTime = (Date.now() - chat.streamingStartTime) / 1000;
                }

                const updatedLastMessage = {
                    ...lastMessage,
                    content: lastMessage.content + token,
                    // Set generationTime if it was just calculated
                    ...(generationTime !== undefined && { generationTime }),
                };

                return {
                    ...chat,
                    messages: [
              ...chat.messages.slice(0, -1),
              updatedLastMessage,
                    ],
                };
            }),
        };
    }
    
    case 'SET_CHAT_STREAMING_STATUS': {
      const { chatId, isStreaming } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, isStreaming } : chat
        ),
      };
    }

    case 'ROLLBACK_LAST_EXCHANGE': {
      const { chatId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id === chatId) {
            // Ensure there are messages to remove
            if (chat.messages.length >= 2) {
              return { ...chat, messages: chat.messages.slice(0, -2) };
            }
          }
          return chat;
        }),
      };
    }

    case 'SET_STREAMING_START_TIME': {
      const { chatId, startTime } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, streamingStartTime: startTime } : chat
        ),
      };
    }

    case 'UPDATE_DRAFT_MESSAGE': {
      const { chatId, text } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => 
          chat.id === chatId ? { ...chat, draftMessage: text } : chat
        ),
      };
    }

    default:
      return state;
  }
};