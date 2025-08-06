// frontend/src/features/chat-view/MessageInput.tsx

// ... (imports are unchanged)
import { ArrowRight, Square } from 'lucide-react';
import { useChatDispatch, useChatState } from '../../providers/ChatProvider';
import { useEffect, useRef } from 'react';

export default function MessageInput() {
  const { activeChatId, chats } = useChatState();
  const dispatch = useChatDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const isStreaming = activeChat?.isStreaming ?? false;
  const prompt = activeChat?.draftMessage ?? '';

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleStop = () => {
    // pass
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeChat) {
      dispatch({
        type: 'UPDATE_DRAFT_MESSAGE',
        payload: { chatId: activeChat.id, text: e.target.value }
      });
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
        onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
            }
        }}
        placeholder="Type your question here..."
        className="w-full p-2 bg-transparent text-crt-orange resize-none focus:outline-none caret-crt-orange max-h-40 text-xl"
        disabled={isStreaming || !activeChat}
        autoFocus
      />
      <div className="flex items-center gap-2 mt-0.5">
        {isStreaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="p-2 bg-red-800 text-white hover:bg-red-600 border-2 border-red-500"
            aria-label="Stop Generation"
          >
            <Square size={20} />
          </button>
        ) : (
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