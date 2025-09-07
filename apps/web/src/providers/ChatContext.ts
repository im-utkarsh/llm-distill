// apps/web/src/providers/ChatContext.ts

import { createContext, useContext, type Dispatch } from 'react';
import type { AppState, Action } from '../types';

// Create and export the contexts directly from this file.
export const ChatStateContext = createContext<AppState | undefined>(undefined);
export const ChatDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

/**
 * Custom hook to access the chat state.
 * Throws an error if used outside of a ChatProvider.
 */
export const useChatState = () => {
  const context = useContext(ChatStateContext);
  if (!context) throw new Error('useChatState must be used within a ChatProvider');
  return context;
};

/**
 * Custom hook to access the dispatch function for chat actions.
 */
export const useChatDispatch = () => {
  const context = useContext(ChatDispatchContext);
  if (!context) throw new Error('useChatDispatch must be used within a ChatProvider');
  return context;
};