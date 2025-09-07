// apps/web/src/hooks/useSseStream.ts
import { useRef, useCallback, useEffect } from 'react';
import { useChatDispatch, useChatState } from '../providers/ChatContext';

// Get API URL from environment variables, with a fallback for local development.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * A custom hook to manage Server-Sent Events (SSE) connections for chat streaming.
 * It handles starting, stopping, and cleaning up EventSource connections, and
 * dispatches actions to update the chat state based on stream events.
 *
 * @returns {{
 * startStream: (chatId: string, prompt: string, context: string) => Promise<void>,
 * stopStream: (chatId: string, options?: { isManualStop?: boolean }) => void
 * }} An object with functions to control the stream.
 */
export const useSseStream = () => {
  const dispatch = useChatDispatch();
  const { chats } = useChatState();
  // Use a ref to store active EventSource instances, keyed by chatId.
  // This persists across re-renders without causing them.
  const eventSourcesRef = useRef<Record<string, EventSource>>({});

  /**
   * Stops and cleans up an active SSE stream for a given chat ID.
   */
  const stopStream = useCallback((chatId: string, options: { isManualStop?: boolean } = {}) => {
    const eventSource = eventSourcesRef.current[chatId];
    if (eventSource) {
      eventSource.close(); // Close the connection.
      delete eventSourcesRef.current[chatId]; // Remove from active connections ref.

      // Reset streaming-related state for the chat.
      dispatch({ type: 'SET_STREAMING_START_TIME', payload: { chatId, startTime: undefined } });
      dispatch({ type: 'SET_CHAT_STREAMING_STATUS', payload: { chatId, isStreaming: false } });
      
      // If the stop was triggered by the user, roll back the last user message and model placeholder.
      if (options.isManualStop) {
        dispatch({ type: 'ROLLBACK_LAST_EXCHANGE', payload: { chatId } });
      }
      console.log(`Stream stopped for chat ${chatId}.`);
    }
  }, [dispatch]);

  // Effect to clean up active streams if a chat is deleted.
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

  /**
   * Starts a new SSE stream for a given chat.
   */
  const startStream = useCallback(async (chatId: string, prompt: string, context: string) => {
    // If a stream is already running for this chat, stop it first.
    if (eventSourcesRef.current[chatId]) {
      stopStream(chatId, { isManualStop: true });
    }

    // Dispatch actions to update the UI to a "streaming" state.
    dispatch({ type: 'SET_STREAMING_START_TIME', payload: { chatId, startTime: Date.now() }});
    dispatch({ type: 'ADD_USER_MESSAGE', payload: { chatId, content: prompt }});
    dispatch({ type: 'ADD_MODEL_PLACEHOLDER', payload: { chatId }});
    dispatch({ type: 'SET_CHAT_STREAMING_STATUS', payload: { chatId, isStreaming: true } });

    // Generate a unique client ID for this specific connection instance.
    const clientId = crypto.randomUUID();
    const streamUrl = `${API_URL}/api/v1/chat/stream/${clientId}`;

    const eventSource = new EventSource(streamUrl);
    eventSourcesRef.current[chatId] = eventSource;

    // `onopen`: Once the SSE connection is established, submit the actual chat job.
    eventSource.onopen = async () => {
      console.log(`SSE connection opened for chat ${chatId}. Submitting job...`);
      try {
        const response = await fetch(`${API_URL}/api/v1/chat/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, context, client_id: clientId }),
        });
        if (!response.ok) throw new Error(`Failed to submit chat job: ${response.statusText}`);
      } catch (error) {
        console.error(`Error submitting job for chat ${chatId}:`, error);
        stopStream(chatId);
      }
    };

    // `onmessage`: Handles incoming data packets (tokens).
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

    // `end` event: Custom event sent by the server to signal the end of the stream.
    eventSource.addEventListener('end', () => {
      console.log(`Received 'end' event from server for chat ${chatId}.`);
      stopStream(chatId);
    });

    // `onerror`: Handles connection errors.
    eventSource.onerror = (error) => {
      console.error(`EventSource failed for chat ${chatId}:`, error);
      stopStream(chatId);
    };
  }, [dispatch, stopStream]);

  return { startStream, stopStream };
};