// apps/web/src/providers/chatReducer.ts
import type { AppState, Action, Chat, Message } from '../types';
import { generateUUID } from '../lib/utils';

/**
 * The main reducer function for managing chat state.
 * It takes the current state and an action, and returns the new state.
 *
 * @param {AppState} state - The current application state.
 * @param {Action} action - The action to be performed.
 * @returns {AppState} The new application state.
 */
export const chatReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    // Creates a new chat session and sets it as active.
    case 'CREATE_CHAT': {
      const newChat: Chat = {
        id: generateUUID(),
        title: action.payload.title || `Session ${new Date().toLocaleTimeString()}`,
        context: action.payload.context,
        messages: [],
        createdAt: Date.now(),
        isStreaming: false,
        draftMessage: '',
      };
      const newChats = [newChat, ...state.chats]; // Add to the top of the list.
      return {
        ...state,
        chats: newChats,
        activeChatId: newChat.id,
      };
    }

    // Deletes a chat session.
    case 'DELETE_CHAT': {
      const updatedChats = state.chats.filter(c => c.id !== action.payload.chatId);
      let newActiveChatId = state.activeChatId;
      // If the deleted chat was active, activate the next one in the list.
      if (state.activeChatId === action.payload.chatId) {
        newActiveChatId = updatedChats[0]?.id || null;
      }
      return { ...state, chats: updatedChats, activeChatId: newActiveChatId };
    }

    // Sets the currently active chat session.
    case 'SET_ACTIVE_CHAT':
      return { ...state, activeChatId: action.payload.chatId };

    // Adds a new message from the user to the active chat.
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

    // Adds an empty placeholder for the model's response.
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

    // Appends a new token to the last model message in a chat.
    case 'APPEND_STREAM_TOKEN': {
      const { chatId, token } = action.payload;
      
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id !== chatId) return chat;

          const lastMessage = chat.messages[chat.messages.length - 1];
          if (lastMessage?.role !== 'model') return chat; // Should not happen

          const isFirstToken = lastMessage.content === '';
          let generationTime;

          // On receiving the first token, calculate the "time to first token".
          if (isFirstToken && chat.streamingStartTime) {
            generationTime = (Date.now() - chat.streamingStartTime) / 1000;
          }

          const updatedLastMessage = {
              ...lastMessage,
              content: lastMessage.content + token,
              // Conditionally add generationTime property.
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
    
    // Sets the streaming status (true/false) for a specific chat.
    case 'SET_CHAT_STREAMING_STATUS': {
      const { chatId, isStreaming } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, isStreaming } : chat
        ),
      };
    }

    // Removes the last user message and model response, e.g., on manual stop.
    case 'ROLLBACK_LAST_EXCHANGE': {
      const { chatId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat => {
          if (chat.id === chatId) {
            // Ensure there are at least two messages to remove.
            if (chat.messages.length >= 2) {
              return { ...chat, messages: chat.messages.slice(0, -2) };
            }
          }
          return chat;
        }),
      };
    }

    // Stores the timestamp when streaming begins for a chat.
    case 'SET_STREAMING_START_TIME': {
      const { chatId, startTime } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, streamingStartTime: startTime } : chat
        ),
      };
    }

    // Updates the draft message for a chat as the user types.
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