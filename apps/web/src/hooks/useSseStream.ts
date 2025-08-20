// apps/web/src/hooks/useSseStream.ts
import { useRef, useCallback, useEffect } from 'react';
import { useChatDispatch, useChatState } from '../providers/ChatProvider';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const useSseStream = () => {
  const dispatch = useChatDispatch();
  const { chats } = useChatState();
  const eventSourcesRef = useRef<Record<string, EventSource>>({});

  const stopStream = useCallback((chatId: string, options: { isManualStop?: boolean } = {}) => {
    const eventSource = eventSourcesRef.current[chatId];
    if (eventSource) {
      eventSource.close();
      delete eventSourcesRef.current[chatId];

      const chat = chats.find(c => c.id === chatId);
      const startTime = chat?.streamingStartTime;

      if (startTime) {
        dispatch({ type: 'SET_STREAMING_START_TIME', payload: { chatId, startTime: undefined } });
      }

      dispatch({ type: 'SET_CHAT_STREAMING_STATUS', payload: { chatId, isStreaming: false } });
      
      if (options.isManualStop) {
        dispatch({ type: 'ROLLBACK_LAST_EXCHANGE', payload: { chatId } });
      }
      console.log(`Stream stopped for chat ${chatId}.`);
    }
  }, [dispatch, chats]);

  useEffect(() => {
    const activeStreamIds = Object.keys(eventSourcesRef.current);
    const existingChatIds = new Set(chats.map(c => c.id));
    
    activeStreamIds.forEach(streamId => {
      if (!existingChatIds.has(streamId)) {
        console.log(`Chat ${streamId} was deleted. Cleaning up its active stream.`);
        stopStream(streamId);
      }
    });
  }, [chats, stopStream]);

  const startStream = useCallback(async (chatId: string, prompt: string, context: string) => {
    if (eventSourcesRef.current[chatId]) {
      stopStream(chatId, { isManualStop: true });
    }

    dispatch({ type: 'SET_STREAMING_START_TIME', payload: { chatId, startTime: Date.now() }});
    dispatch({ type: 'ADD_USER_MESSAGE', payload: { chatId, content: prompt }});
    dispatch({ type: 'ADD_MODEL_PLACEHOLDER', payload: { chatId }});
    dispatch({ type: 'SET_CHAT_STREAMING_STATUS', payload: { chatId, isStreaming: true } });

    const clientId = crypto.randomUUID();
    const streamUrl = `${API_URL}/api/v1/chat/stream/${clientId}`;

    const eventSource = new EventSource(streamUrl);
    eventSourcesRef.current[chatId] = eventSource;

    eventSource.onopen = async () => {
      console.log(`SSE connection opened for chat ${chatId}. Submitting job...`);
      try {
        const response = await fetch(`${API_URL}/api/v1/chat/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, context, client_id: clientId }),
        });
        if (!response.ok) throw new Error('Failed to submit chat job');
      } catch (error) {
        console.error(`Error submitting job for chat ${chatId}:`, error);
        stopStream(chatId);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.token) {
          dispatch({ type: 'APPEND_STREAM_TOKEN', payload: { chatId, token: data.token } });
        }
      } catch (e) {
        console.error("Failed to parse SSE message data:", event.data, "with error:", e);
      }
    };

    eventSource.addEventListener('end', () => {
      console.log(`Received 'end' event from server for chat ${chatId}.`);
      stopStream(chatId);
    });

    eventSource.onerror = (error) => {
      console.error(`EventSource failed for chat ${chatId}:`, error);
      stopStream(chatId);
    };
  }, [dispatch, stopStream]);

  return { startStream, stopStream };
};