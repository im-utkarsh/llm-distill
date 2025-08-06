// frontend/src/features/chat-view/ChatView.tsx

import { useEffect, useRef } from 'react';
import { Menu, Terminal } from 'lucide-react';
import { useChatState } from '../../providers/ChatProvider';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';

interface ChatViewProps {
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function ChatView({ setIsSidebarOpen }: ChatViewProps) {
  const { chats, activeChatId } = useChatState();
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    if (activeChat?.messages.length) {
        scrollToBottom();
    }
  }, [activeChat?.messages]);
  
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-crt-text p-2">
        <Terminal size={64} className="mb-4 text-crt-orange" />
        <h2 className="text-3xl text-crt-orange">[INTERFACE STANDBY]</h2>
        <pre className="mt-4 text-center whitespace-pre-wrap text-crt-text/80">
          AWAITING SESSION INITIALIZATION...
          <br />
          SELECT A SESSION OR CREATE A NEW ONE TO BEGIN.
        </pre>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* ✨ CHANGED: Removed max-h and overflow-y-auto from the header itself. */}
      <header className="p-3 border-b-2 border-crt-border flex items-start gap-4">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 mt-1 hover:bg-crt-border md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>

        <div className="flex-1 truncate min-w-0">
          <h2 className="font-bold text-xl text-crt-orange truncate">{activeChat.title}</h2>
          {/* ✨ CHANGED: Applied max-h and overflow-y-auto directly to the context paragraph. */}
          <p className="text-sm text-crt-text/80 mt-0.5 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
            {activeChat.context}
          </p>
        </div>
      </header>

      <div className="flex-1 p-3 overflow-y-auto min-h-0">
        {/* ✨ FIX: Removed `space-y-4` from this container. */}
        <div className="flex flex-col">
          {activeChat.messages.map((message, index) => {
            // ✨ FIX: Add logic to conditionally apply margin based on message order.
            let marginTopClass = 'mt-6'; // Default large space between conversation turns.
            if (index > 0) {
              const prevMessage = activeChat.messages[index - 1];
              // If it's a model's response immediately after a user's prompt, use a smaller margin.
              if (message.role === 'model' && prevMessage.role === 'user') {
                marginTopClass = 'mt-1'; // Small space for a direct reply.
              }
            } else {
              marginTopClass = ''; // No margin for the very first message.
            }

            return (
              <div key={message.id} className={marginTopClass}>
            <ChatMessage
              message={message}
              isStreaming={!!activeChat.isStreaming && index === activeChat.messages.length - 1}
              streamingStartTime={activeChat.streamingStartTime}
            />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-3 border-t-2 border-crt-border">
        <MessageInput />
      </div>
    </div>
  );
}