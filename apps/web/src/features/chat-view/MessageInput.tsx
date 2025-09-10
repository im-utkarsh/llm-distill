// apps/web/src/features/chat-view/MessageInput.tsx
import { ArrowRight, Square } from 'lucide-react';
import { useChatDispatch, useChatState } from '../../providers/ChatContext';
import { useSseStream } from '../../hooks/useSseStream';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Renders the text input area for sending messages, along with
 * send/stop buttons. Manages the draft message state and stream control.
 * @returns {React.ReactElement} The message input form.
 */
export default function MessageInput() {
  const { activeChatId, chats } = useChatState();
  const dispatch = useChatDispatch();
  const { startStream, stopStream } = useSseStream();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const isStreaming = activeChat?.isStreaming ?? false;
  const prompt = activeChat?.draftMessage ?? '';
  
  // Placeholder Text State for responsiveness
  const [placeholder, setPlaceholder] = useState("Type your question here...");
  
  // Prompt History State
  const [historyIndex, setHistoryIndex] = useState(-1);
  const userPrompts = useMemo(() => 
    activeChat?.messages.filter(m => m.role === 'user').map(m => m.content).reverse() ?? [],
    [activeChat?.messages]
  );

  // Effect for responsive placeholder
  useEffect(() => {
    const updatePlaceholder = () => {
      setPlaceholder(window.innerWidth < 640 ? "Type question..." : "Type your question here...");
    };
    updatePlaceholder();
    window.addEventListener('resize', updatePlaceholder);
    return () => window.removeEventListener('resize', updatePlaceholder);
  }, []);

  // Effect to reset history when chat changes
  useEffect(() => {
    setHistoryIndex(-1);
  }, [activeChatId]);

  // Effect to auto-resize the textarea based on its content.
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto'; // Reset height
      el.style.height = `${el.scrollHeight}px`; // Set to scroll height
    }
  }, [prompt]);

  /** Handles form submission to start the stream. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPrompt = prompt.trim(); // Trim whitespace from prompt
    if (!trimmedPrompt || !activeChat || isStreaming) return;
    
    startStream(activeChat.id, trimmedPrompt, activeChat.context);
    
    // Clear the draft message from state after submission.
    dispatch({ type: 'UPDATE_DRAFT_MESSAGE', payload: { chatId: activeChat.id, text: '' } });
    setHistoryIndex(-1); // Reset history index on send
  };

  /** Handles stopping an in-progress stream. */
  const handleStop = () => {
    if (activeChat) {
      stopStream(activeChat.id, { isManualStop: true });
    }
  };

  /** Updates the draft message in the global state as the user types. */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeChat) {
      dispatch({
        type: 'UPDATE_DRAFT_MESSAGE',
        payload: { chatId: activeChat.id, text: e.target.value }
      });
      setHistoryIndex(-1); // Reset history navigation when user types
    }
  };
  
  /** Handles keyboard events for history and submission. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter, but allow newlines with Shift+Enter.
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
        return;
    }

    // Handle prompt history navigation with arrow keys
    if (userPrompts.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const newIndex = Math.min(historyIndex + 1, userPrompts.length - 1);
        setHistoryIndex(newIndex);
        dispatch({ type: 'UPDATE_DRAFT_MESSAGE', payload: { chatId: activeChat!.id, text: userPrompts[newIndex] } });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const newIndex = Math.max(historyIndex - 1, -1);
        setHistoryIndex(newIndex);
        const newPrompt = newIndex === -1 ? '' : userPrompts[newIndex];
        dispatch({ type: 'UPDATE_DRAFT_MESSAGE', payload: { chatId: activeChat!.id, text: newPrompt } });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-start gap-2">
      <span className="text-crt-orange mt-2 text-xl">&gt;</span>
      <textarea
        ref={textareaRef}
        rows={1}
        value={prompt}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full p-2 bg-transparent text-crt-orange resize-none focus:outline-none caret-crt-orange max-h-40 text-xl"
        disabled={isStreaming || !activeChat}
        autoFocus
      />
      <div className="flex items-center gap-2 mt-0.5">
        {isStreaming ? (
          // Show Stop button when streaming
          <button
            type="button"
            onClick={handleStop}
            className="p-2 bg-red-800 text-white hover:bg-red-600 border-2 border-red-500"
            aria-label="Stop Generation"
          >
            <Square size={20} />
          </button>
        ) : (
          // Show Send button otherwise
          <button
            type="submit"
            className="px-4 py-2 flex items-center gap-2 bg-crt-orange text-crt-bg hover:opacity-80 disabled:bg-crt-border disabled:text-crt-text/50 disabled:cursor-not-allowed"
            disabled={!prompt.trim() || !activeChat}
            aria-label="Send Message"
          >
            SEND <ArrowRight size={16} />
          </button>
        )}
      </div>
    </form>
  );
}