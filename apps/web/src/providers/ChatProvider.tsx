// apps/web/src/providers/ChatProvider.tsx

import { useReducer, useEffect, type ReactNode } from 'react';
import { chatReducer } from './chatReducer';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ChatStateContext, ChatDispatchContext } from './ChatContext'; 
import type { AppState, Action } from '../types';

// The initial state for the chat application.
const initialState: AppState = {
  chats: [],
  activeChatId: null,
};

/**
 * Provides the chat state and dispatch function to its children.
 * This component exports the provider.
 */
export const ChatProvider = ({ children }: { children: ReactNode }) => {
  // `useLocalStorage` hook to persist the entire app state.
  const [persistedState, setPersistedState] = useLocalStorage<AppState>('chat-history', initialState);
  
  // A wrapper around the original reducer to also update localStorage on every action.
  const reducerWithPersistence = (state: AppState, action: Action): AppState => {
    const newState = chatReducer(state, action);
    setPersistedState(newState);
    return newState;
  };
  
  const [state, dispatch] = useReducer(reducerWithPersistence, persistedState);

  // Effect to ensure there's always an active chat if chats exist.
  useEffect(() => {
    // If there is no active chat but there are chats in the list, set the first one as active.
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