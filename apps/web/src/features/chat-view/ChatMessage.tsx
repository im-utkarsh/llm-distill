// apps/web/src/features/chat-view/ChatMessage.tsx
import type { Message } from '../../types';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

interface ChatMessageProps {
  message: Message;
  isStreaming: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { isCopied, copy } = useCopyToClipboard();

  const showCopyButton = message.role === 'model' && message.content.length > 0 && !isStreaming;

  return (
    <div className="flex flex-col">
      {isUser ? (
        <div className="flex items-start">
          <span className="text-crt-orange mr-1.5">&gt;</span>
          <p className="whitespace-pre-wrap text-crt-orange flex-1 [text-shadow:0_0_5px_var(--tw-shadow-color)] shadow-crt-glow-orange">{message.content}</p>
        </div>
      ) : (
        <div className="pl-4">
          <div className="flex items-start">
            <p className={`whitespace-pre-wrap text-crt-model-green flex-1 [text-shadow:0_0_5px_var(--tw-shadow-color)] shadow-crt-glow-green`}>
              {message.content}
              {/* The blinking cursor for streaming is added here */}
              {isStreaming && message.content && <span className="animate-blink bg-crt-model-green w-3 h-5 inline-block ml-1"></span>}
            </p>
          </div>

          {/* This section adds the copy button */}
          <div className="h-4 mt-1 text-base text-crt-light-green flex items-center gap-4">
            {showCopyButton && (
              <button onClick={() => copy(message.content)} className="flex items-center gap-1 hover:text-crt-orange transition-colors">
                {isCopied
                  ? <><Check size={14} /> [Copied]</>
                  : <><Copy size={14} /> [Copy]</>
                }
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}