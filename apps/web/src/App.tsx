// apps/web/src/App.tsx
import { ChatProvider, useChatDispatch } from './providers/ChatProvider';
import Starfield from './components/Starfield';
import CrtFilters from './components/CrtFilters';
import { useState } from 'react';

function AppWrapper() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dispatch = useChatDispatch();

  // Placeholder components for now
  const ChatList = () => <div>[Chat List Placeholder]</div>;
  const ChatView = () => <div>[Chat View Placeholder]</div>;

  return (
    <div className="relative h-screen w-full p-2 sm:p-4 flex items-center justify-center bg-crt-bg overflow-hidden">
      <CrtFilters />
      <Starfield />

      <div className="relative z-10 w-full h-full max-w-7xl flex flex-col bg-crt-panel border-2 border-crt-border-green shadow-crt-glow-border shadow-crt-glow-neon-green animate-flicker">
        <div className="px-4 py-2 border-b-2 border-crt-border">
          <h1 className="text-crt-orange tracking-widest text-xl">LLM DISTILLATION INTERFACE</h1>
        </div>
        <div className="flex flex-1 min-h-0">
          <aside className="w-72 bg-crt-panel border-r-2 border-crt-border">
            <ChatList />
          </aside>
          <main className="flex-1 flex flex-col min-w-0">
            <ChatView />
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ChatProvider>
      <AppWrapper />
    </ChatProvider>
  );
}

export default App;