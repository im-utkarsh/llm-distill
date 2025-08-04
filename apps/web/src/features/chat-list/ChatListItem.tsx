// frontend/src/features/chat-list/ChatListItem.tsx

import { Trash2 } from 'lucide-react';
import { useChatDispatch } from '../../providers/ChatProvider';

interface ChatListItemProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

export default function ChatListItem({ id, title, isActive, onClick }: ChatListItemProps) {
  const dispatch = useChatDispatch();

  const handleSelect = () => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: { chatId: id } });
    onClick();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`DELETE SESSION: "${title}"? This cannot be undone.`)) {
        dispatch({ type: 'DELETE_CHAT', payload: { chatId: id } });
    }
  };

  const activeClasses = 'bg-crt-orange text-crt-bg';
  const inactiveClasses = 'hover:bg-crt-border/50 text-crt-text';

  // ✨ FIX #2: Conditionally set the delete icon color based on the active state
  const deleteIconColor = isActive ? 'text-crt-bg' : 'text-crt-text/50';

  return (
    <div
      onClick={handleSelect}
      className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center w-full text-left px-2 py-1.5 cursor-pointer ${isActive ? activeClasses : inactiveClasses}`}
    >
      <span className="truncate">{`> ${title}`}</span>
      
      <button
        onClick={handleDelete}
        className={`ml-2 p-1 md:opacity-0 group-hover:opacity-100 transition-opacity ${deleteIconColor}`}
        aria-label={`Delete chat ${title}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}