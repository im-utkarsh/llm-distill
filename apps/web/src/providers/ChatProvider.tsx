// apps/web/src/providers/ChatProvider.tsx
import React, { createContext, useReducer, useContext, type ReactNode, type Dispatch, useEffect } from 'react';
import type { AppState, Action } from '../types';
import { chatReducer } from './chatReducer';
import { useLocalStorage } from '../hooks/useLocalStorage';

// The initial state for the chat application.
const initialState: AppState = {
  chats: [],
  activeChatId: null,
};

// Create contexts for the state and the dispatch function.
const ChatStateContext = createContext<AppState | undefined>(undefined);
const ChatDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

/**
 * Provides the chat state and dispatch function to its children.
 * It integrates the reducer with `useLocalStorage` to persist the chat history.
 * @param {{ children: ReactNode }} props - The component props.
 * @returns {React.ReactElement} The provider component.
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

/**
 * Custom hook to access the chat state.
 * Throws an error if used outside of a ChatProvider.
 * @returns {AppState} The current chat state.
 */
export const useChatState = () => {
  const context = useContext(ChatStateContext);
  if (!context) throw new Error('useChatState must be used within a ChatProvider');
  return context;
};

/**
 * Custom hook to access the dispatch function for chat actions.
 * Throws an error if used outside of a ChatProvider.
 * @returns {Dispatch<Action>} The dispatch function.
 */
export const useChatDispatch = () => {
  const context = useContext(ChatDispatchContext);
  if (!context) throw new Error('useChatDispatch must be used within a ChatProvider');
  return context;
};