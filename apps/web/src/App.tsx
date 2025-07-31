// apps/web/src/App.tsx
import { ChatProvider } from './providers/ChatProvider';

function AppWrapper() {
    return <h1>LLM Distillation Interface</h1>
}

function App() {
  return (
    <ChatProvider>
      <AppWrapper />
    </ChatProvider>
  )
}

export default App;