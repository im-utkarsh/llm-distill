// frontend/src/features/chat-list/ChatList.tsx

import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useChatState } from '../../providers/ChatProvider';
import ChatListItem from './ChatListItem';

interface ChatListProps {
  setIsSidebarOpen: (isOpen: boolean) => void;
  setShowModal: (isOpen: boolean) => void;
}

export default function ChatList({ setIsSidebarOpen, setShowModal }: ChatListProps) {
  const { chats, activeChatId } = useChatState();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats.filter(chat => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    const inTitle = chat.title.toLowerCase().includes(term);
    const inContext = chat.context.toLowerCase().includes(term);
    const inMessages = chat.messages.some(msg => msg.content.toLowerCase().includes(term));
    return inTitle || inContext || inMessages;
  });


  return (
    <div className="flex flex-col h-full bg-transparent text-crt-text">
      <div className="p-3 border-b-2 border-crt-border flex items-center gap-4">
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-crt-border hover:bg-crt-orange hover:text-crt-bg transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
          NEW SESSION
        </button>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 hover:bg-crt-border md:hidden"
          aria-label="Close sidebar"
        >
          <X size={24} />
        </button>
      </div>

      <div className="p-3 border-b-2 border-crt-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-crt-text" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-crt-bg border-2 border-crt-border focus:outline-none focus:border-crt-orange caret-crt-orange"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <nav className="p-1 space-y-1">
          {filteredChats.map(chat => (
            <ChatListItem
              key={chat.id}
              id={chat.id}
              title={chat.title}
              isActive={chat.id === activeChatId}
              onClick={() => setIsSidebarOpen(false)}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}