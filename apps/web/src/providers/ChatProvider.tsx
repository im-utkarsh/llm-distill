// frontend/src/providers/ChatProvider.tsx

import React, { createContext, useReducer, useContext, ReactNode, Dispatch, useEffect } from 'react';
import type { AppState, Action } from '../types';
import { chatReducer } from './chatReducer';
import { useLocalStorage } from '../hooks/useLocalStorage';

const initialState: AppState = {
  chats: [],
  activeChatId: null,
};

const ChatStateContext = createContext<AppState | undefined>(undefined);
const ChatDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [persistedState, setPersistedState] = useLocalStorage<AppState>('chat-history', initialState);
  
  const reducerWithPersistence = (state: AppState, action: Action): AppState => {
    const newState = chatReducer(state, action);
    setPersistedState(newState);
    return newState;
  };
  
  const [state, dispatch] = useReducer(reducerWithPersistence, persistedState);

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