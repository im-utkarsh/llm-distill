// apps/web/src/App.tsx
import { useState, useRef, useEffect } from 'react';
import { useChatDispatch } from './providers/ChatProvider';
import { ChatProvider } from './providers/ChatProvider';
import Starfield from './components/Starfield';
import CrtFilters from './components/CrtFilters';
import ChatList from './features/chat-list/ChatList'; // Import the real ChatList

function AppWrapper() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [newChatContext, setNewChatContext] = useState('');

  const dispatch = useChatDispatch();
  const contextInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => contextInputRef.current?.focus(), 100);
    }
  }, [showModal]);

  const handleCreateChat = () => {
    if (newChatContext.trim()) {
      dispatch({
        type: 'CREATE_CHAT',
        payload: { context: newChatContext.trim(), title: newChatTitle.trim() }
      });
      setShowModal(false);
      setNewChatTitle('');
      setNewChatContext('');
      setIsSidebarOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCreateChat();
    }
  };

  // ChatView is STILL a placeholder for this commit
  const ChatView = () => (
      <div className="flex-1 flex flex-col items-center justify-center text-crt-text p-2">
        <h2 className="text-3xl text-crt-orange">[INTERFACE STANDBY]</h2>
      </div>
  );

  return (
    <div className="relative h-screen w-full p-2 sm:p-4 flex items-center justify-center bg-crt-bg overflow-hidden">
      <CrtFilters />
      <Starfield />
      <div className={`relative z-10 w-full h-full max-w-7xl flex flex-col bg-crt-panel border-2 border-crt-border-green shadow-crt-glow-border shadow-crt-glow-neon-green ${!showModal ? 'animate-flicker crt-effect' : ''}`}>
        {/* Header remains the same */}
        <div className="px-4 py-2 border-b-2 border-crt-border">
          <h1 className="text-crt-orange tracking-widest text-xl">LLM DISTILLATION INTERFACE</h1>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar now uses the REAL ChatList component */}
          <aside className={`w-72 md:w-64 lg:w-72 xl:w-72 bg-crt-panel border-r-2 border-crt-border z-20 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 absolute top-0 left-0 h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <ChatList setIsSidebarOpen={setIsSidebarOpen} setShowModal={setShowModal} />
          </aside>

          {/* Main content uses the placeholder */}
          <main className="flex-1 flex flex-col min-w-0">
            <ChatView />
          </main>
        </div>

        {/* The "New Session" modal JSX */}
        {showModal && (
          <div className="fixed inset-0 bg-crt-bg/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-crt-panel border-2 border-crt-orange w-full max-w-2xl flex flex-col max-h-[90vh] shadow-crt-glow shadow-crt-glow-orange" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b-2 border-crt-orange">
                <h2 className="text-2xl text-crt-orange tracking-widest">[NEW DISTILLATION SESSION]</h2>
              </div>
              <div className="p-4 flex flex-col flex-1 overflow-y-auto min-h-0">
                <label className="block text-crt-text mb-4">
                  SESSION TITLE (OPTIONAL):
                  <input type="text" placeholder="e.g. Experiment v1.2" value={newChatTitle} onChange={(e) => setNewChatTitle(e.target.value)} className="mt-1 w-full px-3 py-2 bg-crt-bg text-crt-orange border-2 border-crt-border focus:outline-none focus:border-crt-orange caret-crt-orange" />
                </label>
                <label className="block text-crt-text flex-1 flex flex-col min-h-0">
                  CONTEXTUAL DATA (REQUIRED):
                  <textarea ref={contextInputRef} placeholder="Paste context here..." value={newChatContext} onChange={(e) => setNewChatContext(e.target.value)} onKeyDown={handleKeyDown} className="mt-1 w-full px-3 py-2 bg-crt-bg text-crt-orange border-2 border-crt-border focus:outline-none focus:border-crt-orange caret-crt-orange h-[45vh] resize-none" />
                </label>
              </div>
              <div className="p-4 border-t-2 border-crt-orange flex justify-center sm:justify-end items-center gap-4">
                <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-crt-border text-crt-text hover:bg-crt-text hover:text-crt-bg">ABORT</button>
                <button onClick={handleCreateChat} className="px-6 py-2 bg-crt-orange/80 text-crt-bg hover:bg-crt-orange disabled:bg-crt-border disabled:text-crt-text/50 disabled:cursor-not-allowed" disabled={!newChatContext.trim()}>INITIALIZE</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// The main App component remains the same
function App() {
  return (
    <ChatProvider>
      <AppWrapper />
    </ChatProvider>
  );
}

export default App;