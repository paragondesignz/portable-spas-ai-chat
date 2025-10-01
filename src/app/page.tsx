import ChatInterface from '@/components/chat-interface';

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[calc(100vh-2rem)]">
        <ChatInterface />
      </div>
    </main>
  );
}

