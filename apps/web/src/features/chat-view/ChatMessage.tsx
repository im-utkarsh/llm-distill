// apps/web/src/features/chat-view/ChatMessage.tsx
import type { Message } from '../../types';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import LiveTimer from './LiveTimer';
import ThinkingAnimation from './ThinkingAnimation';

/**
 * Props for the ChatMessage component.
 * @typedef {object} ChatMessageProps
 * @property {Message} message - The message object to display.
 * @property {boolean} isStreaming - True if this is the last message and it's currently being streamed.
 * @property {number} [streamingStartTime] - The timestamp when streaming started, for the live timer.
 */
interface ChatMessageProps {
  message: Message;
  isStreaming: boolean;
  streamingStartTime?: number;
}

/**
 * Renders a single chat message, either from the user or the model.
 * Handles displaying streaming state, timers, and copy functionality.
 * @param {ChatMessageProps} props - The component props.
 * @returns {React.ReactElement} A chat message element.
 */
export default function ChatMessage({ message, isStreaming, streamingStartTime }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { isCopied, copy } = useCopyToClipboard();

  // Condition to determine if the generation is complete and content is available to copy.
  const isGenerationComplete = message.role === 'model' && message.content.length > 0 && !isStreaming;
  const hasGenerationTime = message.generationTime !== undefined;

  return (
    <div className="flex flex-col">
      {isUser ? (
        // User message layout
        <div className="flex items-start">
          <span className="text-crt-orange mr-1.5">&gt;</span>
          <p className="whitespace-pre-wrap text-crt-orange flex-1 [text-shadow:0_0_5px_var(--tw-shadow-color)] shadow-crt-glow-orange">{message.content}</p>
        </div>
      ) : (
        // Model message layout
        <div className="pl-4">
          <div className="flex items-start">
            <p className={`whitespace-pre-wrap text-crt-model-green flex-1 [text-shadow:0_0_5px_var(--tw-shadow-color)] shadow-crt-glow-green`}>
              {message.content}
              {/* Show thinking animation before the first token arrives */}
              {isStreaming && !message.content && <ThinkingAnimation />}
              {/* Show blinking cursor while streaming */}
              {isStreaming && message.content && <span className="animate-blink bg-crt-model-green w-3 h-5 inline-block ml-1"></span>}
            </p>
          </div>

          {/* Metadata footer for the model's message */}
          <div className="h-4 mt-1 text-base text-crt-light-green flex items-center gap-4">
            {/* Show live timer while waiting for the first token */}
            {isStreaming && !message.content && streamingStartTime && (
              <LiveTimer startTime={streamingStartTime} />
            )}
            {/* Show final generation time once the first token arrives */}
            {hasGenerationTime && (
              <span>[Generated in {message.generationTime!.toFixed(2)}s]</span>
            )}
            {/* Show copy button only when streaming is complete */}
            {isGenerationComplete && (
              <button
                onClick={() => copy(message.content)}
                className="flex items-center gap-1 hover:text-crt-orange transition-colors"
              >
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