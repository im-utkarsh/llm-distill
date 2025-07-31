// apps/web/src/providers/ChatProvider.tsx

import React, { createContext, useReducer, useContext, ReactNode, Dispatch, useEffect } from 'react';
import type { AppState, Action } from '../types';
import { chatReducer } from './chatReducer';

// The initial state remains the same.
const initialState: AppState = {
  chats: [],
  activeChatId: null,
};

const ChatStateContext = createContext<AppState | undefined>(undefined);
const ChatDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  // We use the simple, non-persistent reducer for now.
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // This effect correctly sets the first chat as active on initial load.
  useEffect(() => {
    if (!state.activeChatId && state.chats.length > 0) {
      dispatch({ type: 'SET_ACTIVE_CHAT', payload: { chatId: state.chats[0].id } });
    }
  }, [state.chats, state.activeChatId]);

  return (
    <ChatStateContext.Provider value={state}>
      <ChatDispatchContext.Provider value={dispatch}>
        {children}
      </ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  );
};

// The custom hooks to access the context remain the same.
export const useChatState = () => {
  const context = useContext(ChatStateContext);
  if (!context) throw new Error('useChatState must be used within a ChatProvider');
  return context;
};

export const useChatDispatch = () => {
  const context = useContext(ChatDispatchContext);
  if (!context) throw new Error('useChatDispatch must be used within a ChatProvider');
  return context;
};