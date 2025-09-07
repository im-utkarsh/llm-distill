// apps/web/src/features/chat-view/ChatView.tsx
import { useEffect, useRef } from 'react';
import { Menu, Terminal } from 'lucide-react';
import { useChatState } from '../../providers/ChatContext';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';

/**
 * Props for the ChatView component.
 * @typedef {object} ChatViewProps
 * @property {(isOpen: boolean) => void} setIsSidebarOpen - Function to control sidebar visibility on mobile.
 */
interface ChatViewProps {
  setIsSidebarOpen: (isOpen: boolean) => void;
}

/**
 * The main view for a single chat session, displaying messages and the input form.
 * @param {ChatViewProps} props - The component props.
 * @returns {React.ReactElement} The main chat interface.
 */
export default function ChatView({ setIsSidebarOpen }: ChatViewProps) {
  const { chats, activeChatId } = useChatState();
  const activeChat = chats.find(chat => chat.id === activeChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /** Scrolls the message list to the bottom. */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  // Effect to scroll to the bottom whenever new messages are added.
  useEffect(() => {
    if (activeChat?.messages.length) {
        scrollToBottom();
    }
  }, [activeChat?.messages]);
  
  // Display a placeholder if no chat is active.
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
      {/* Chat header with title, context, and mobile menu button */}
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
          <p className="text-sm text-crt-text/80 mt-0.5 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
            {activeChat.context}
          </p>
        </div>
      </header>

      {/* Scrollable message container */}
      <div className="flex-1 p-3 overflow-y-auto min-h-0">
        <div className="flex flex-col">
          {activeChat.messages.map((message, index) => {
            // Logic to add vertical spacing between user/model exchanges.
            let marginTopClass = 'mt-6';
            if (index > 0) {
              const prevMessage = activeChat.messages[index - 1];
              // Reduce space if a model message directly follows a user message.
              if (message.role === 'model' && prevMessage.role === 'user') {
                marginTopClass = 'mt-1';
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
          {/* Empty div to act as a scroll target */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input area */}
      <div className="p-3 border-t-2 border-crt-border">
        <MessageInput />
      </div>
    </div>
  );
}