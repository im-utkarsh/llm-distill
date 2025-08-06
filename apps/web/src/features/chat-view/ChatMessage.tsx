// apps/web/src/features/chat-view/ChatMessage.tsx
import type { Message } from '../../types';
import { Copy, Check } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  // Placeholder for copy functionality
  const isCopied = false;
  const copy = () => alert("Copy functionality to be added!");

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
            </p>
          </div>
        </div>
      )}
    </div>
  );
}