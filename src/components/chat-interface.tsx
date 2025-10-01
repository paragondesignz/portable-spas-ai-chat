'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

const STORAGE_KEY_MESSAGES = 'ps_chat_messages';
const STORAGE_KEY_NAME = 'ps_user_name';

// Extract name from common phrases
function extractName(input: string): string {
  const text = input.trim();
  
  // Common patterns people use when introducing themselves
  const patterns = [
    /^(?:I'm|I am|Im)\s+(.+)$/i,
    /^(?:My name is|My name's)\s+(.+)$/i,
    /^(?:It's|Its)\s+(.+)$/i,
    /^(?:Call me|You can call me)\s+(.+)$/i,
    /^(?:This is)\s+(.+)$/i,
    /^(?:Name is|Name's)\s+(.+)$/i,
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // If no pattern matches, assume the whole input is the name
  return text;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [askingForName, setAskingForName] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
      const savedName = localStorage.getItem(STORAGE_KEY_NAME);
      
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else if (savedName) {
        setMessages([{
          role: 'assistant',
          content: `Welcome back, ${savedName}! 👋\n\nHow can I assist you today?`
        }]);
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Hello! Welcome to Portable Spas New Zealand. 👋\n\nBefore we start, may I know your name?'
        }]);
        setAskingForName(true);
      }
      
      if (savedName) {
        setUserName(savedName);
      }
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
      setMessages([{
        role: 'assistant',
        content: 'Hello! Welcome to Portable Spas New Zealand. 👋\n\nBefore we start, may I know your name?'
      }]);
      setAskingForName(true);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when messages or userName change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
        if (userName) {
          localStorage.setItem(STORAGE_KEY_NAME, userName);
        }
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
    }
  }, [messages, userName, isInitialized]);

  // Scroll to bottom of chat
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior
        });
      }
    }
  };

  // Check if user has scrolled up
  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom && messages.length > 1);
      }
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading]);

  // Attach scroll listener
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', checkScrollPosition);
        return () => scrollContainer.removeEventListener('scroll', checkScrollPosition);
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');

    // Handle name collection
    if (askingForName) {
      const extractedName = extractName(userInput);
      setUserName(extractedName);
      setMessages(prev => [
        ...prev,
        { role: 'user', content: userInput },
        { 
          role: 'assistant', 
          content: `Great to meet you, ${extractedName}! 😊\n\nHow can I help you with our portable spas today?` 
        }
      ]);
      setAskingForName(false);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: userInput
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Add system context with user's name if available
      const contextualMessages = userName ? [
        { role: 'assistant', content: `[Context: The customer's name is ${userName}. Address them naturally by name when appropriate.]` },
        ...messages,
        userMessage
      ] : [...messages, userMessage];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: contextualMessages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        citations: data.citations
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear your chat history?')) {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
      
      if (userName) {
        setMessages([{
          role: 'assistant',
          content: `Chat cleared, ${userName}! 🔄\n\nHow can I help you today?`
        }]);
      } else {
        setMessages([{
          role: 'assistant',
          content: 'Hello! Welcome to Portable Spas New Zealand. 👋\n\nBefore we start, may I know your name?'
        }]);
        setAskingForName(true);
      }
    }
  };

  const handleChangeName = () => {
    const newName = prompt('What would you like me to call you?', userName);
    if (newName && newName.trim()) {
      setUserName(newName.trim());
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Got it! I'll call you ${newName.trim()} from now on. 😊`
      }]);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white">
      {/* Header - fixed at top */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Chat with us</h2>
            <p className="text-sm text-gray-600">
              {userName ? `Hi ${userName}!` : 'Portable Spas New Zealand'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearChat}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-600 transition-colors"
            >
              Clear chat
            </button>
            {userName && (
              <button
                onClick={handleChangeName}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                Change name
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - grows with content */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 bg-white relative">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        a: ({ node, href, children, ...props }) => {
                          // Check if link is internal (portablespas.co.nz)
                          const isInternal = href ? (() => {
                            try {
                              const url = new URL(href, window.location.href);
                              return url.hostname.includes('portablespas.co.nz');
                            } catch {
                              // If URL parsing fails, assume it's a relative URL (internal)
                              return !href.startsWith('http');
                            }
                          })() : false;
                          
                          return (
                            <a
                              href={href}
                              target={isInternal ? '_self' : '_blank'}
                              rel={isInternal ? undefined : 'noopener noreferrer'}
                              className="text-primary hover:underline font-medium"
                              {...props}
                            >
                              {children}
                            </a>
                          );
                        },
                        p: ({ node, ...props }) => (
                          <p {...props} className="mb-2 last:mb-0" />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="list-disc ml-4 mb-2 space-y-1" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="list-decimal ml-4 mb-2 space-y-1" />
                        ),
                        li: ({ node, ...props }) => (
                          <li {...props} className="ml-0" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong {...props} className="font-semibold" />
                        ),
                        code: ({ node, ...props }) => (
                          <code {...props} className="bg-gray-200 px-1 rounded text-xs" />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              </div>
            </div>
          )}
        </div>
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all flex items-center gap-2 text-sm text-gray-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 13l5 5 5-5M7 6l5 5 5-5"/>
            </svg>
            <span>New messages</span>
          </button>
        )}
      </ScrollArea>

      {/* Input - centered like Claude */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Portable Spas..."
                disabled={isLoading}
                className="w-full px-4 py-3 text-base border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-3">
            AI can make mistakes. Check important info.
          </p>
        </form>
      </div>
    </div>
  );
}

