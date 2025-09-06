// frontend/src/features/chat-list/ChatListItem.tsx
import { Trash2 } from 'lucide-react';
import { useChatDispatch } from '../../providers/ChatProvider';

/**
 * Props for the ChatListItem component.
 * @typedef {object} ChatListItemProps
 * @property {string} id - The unique ID of the chat session.
 * @property {string} title - The title of the chat session.
 * @property {boolean} isActive - Whether this is the currently active chat.
 * @property {() => void} onClick - Callback function executed when the item is clicked.
 */
interface ChatListItemProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Renders a single item in the chat session list.
 * Handles chat selection and deletion.
 * @param {ChatListItemProps} props - The component props.
 * @returns {React.ReactElement} A single chat list item.
 */
export default function ChatListItem({ id, title, isActive, onClick }: ChatListItemProps) {
  const dispatch = useChatDispatch();

  /** Handles selecting this chat as the active one. */
  const handleSelect = () => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: { chatId: id } });
    onClick(); // Propagate click event (e.g., to close sidebar).
  };

  /** Handles the deletion of this chat session with confirmation. */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent handleSelect from firing.
    if (window.confirm(`DELETE SESSION: "${title}"? This cannot be undone.`)) {
        dispatch({ type: 'DELETE_CHAT', payload: { chatId: id } });
    }
  };

  // Dynamically set CSS classes based on active state.
  const activeClasses = 'bg-crt-orange text-crt-bg';
  const inactiveClasses = 'hover:bg-crt-border/50 text-crt-text';
  const deleteIconColor = isActive ? 'text-crt-bg' : 'text-crt-text/50';

  return (
    <div
      onClick={handleSelect}
      className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center w-full text-left px-2 py-1.5 cursor-pointer ${isActive ? activeClasses : inactiveClasses}`}
    >
      <span className="truncate">{`> ${title}`}</span>
      
      {/* Delete button, visible on hover */}
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