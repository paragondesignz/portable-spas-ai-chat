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
const STORAGE_KEY_USER_NAME = 'ps_user_name';
const STORAGE_KEY_SESSION_ID = 'ps_session_id';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [nameInput, setNameInput] = useState('');
  const [sessionId, setSessionId] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      const savedName = localStorage.getItem(STORAGE_KEY_USER_NAME);
      if (savedName) {
        setUserName(savedName);
      }
      let savedSessionId = localStorage.getItem(STORAGE_KEY_SESSION_ID);
      if (!savedSessionId) {
        // Generate a new session ID
        savedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(STORAGE_KEY_SESSION_ID, savedSessionId);
      }
      setSessionId(savedSessionId);
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when messages change
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }
    }
  }, [messages, isInitialized]);

  // Scroll to bottom of chat smoothly
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

  // Auto-scroll when new messages arrive (but not when loading state changes)
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

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

    const userMessage: Message = {
      role: 'user',
      content: userInput
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const contextualMessages = [...messages, userMessage];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: contextualMessages,
          sessionId: sessionId,
          userName: userName || 'Anonymous'
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
      setMessages([]);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      const name = nameInput.trim();
      setUserName(name);
      localStorage.setItem(STORAGE_KEY_USER_NAME, name);
    }
  };

  // Show name collection dialog if no name is set
  if (!userName && isInitialized) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-normal text-gray-800 mb-4">
              Welcome!
            </h1>
            <p className="text-gray-600 text-base leading-relaxed">
              Before we get started, may I have your name?
            </p>
          </div>

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                className="w-full px-6 py-4 text-lg border-gray-300 rounded-2xl focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
            </div>
            <Button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full py-4 text-base rounded-2xl bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400"
            >
              Continue
            </Button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-6">
            Your name will be used to personalize your experience and help us assist you better.
          </p>
        </div>
      </div>
    );
  }

  // Show centered layout when no messages
  const showCenteredLayout = messages.length === 0;

  if (showCenteredLayout) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-3xl">
          {/* Large greeting */}
          <h1 className="text-5xl md:text-6xl font-normal text-gray-800 text-center mb-6">
            Hey there
          </h1>

          {/* Description */}
          <div className="text-center mb-12 px-4">
            <p className="text-gray-600 text-base leading-relaxed mb-3">
              I'm your MSpa specialist assistant, here to provide expert guidance on finding the perfect portable spa for your home. Whether you're exploring options, need setup advice, have water care questions, or require troubleshooting support, I'm available to help.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              Ask me anything about our MSpa range, accessories, maintenance, or spa ownership - I'm here to ensure you have all the information you need.
            </p>
          </div>

          {/* Centered input */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-3 items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How can I help you today?"
                disabled={isLoading}
                className="flex-1 px-6 py-6 text-lg border-gray-300 rounded-3xl focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-14 w-14 rounded-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </Button>
            </div>
          </form>

          {/* Quick start suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {[
              'What models of spa pool do you sell?',
              'How do I balance my water chemistry?',
              'What accessories are available for my MSpa Bergen?',
              'Do you offer an installation service?',
              'I\'m getting an F1 error, how can I resolve this?'
            ].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInput(suggestion)}
                disabled={isLoading}
                className="text-left px-4 py-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {suggestion}
              </button>
            ))}
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-white">
      {/* Header - fixed at top */}
      <div className="flex-shrink-0 p-4 border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Chat with us</h2>
            <p className="text-sm text-gray-600">Portable Spas New Zealand{userName && ` • ${userName}`}</p>
          </div>
          <button
            onClick={handleClearChat}
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            Clear chat
          </button>
        </div>
      </div>

      {/* Messages - grows with content */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 bg-white relative">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                ref={(el) => { messageRefs.current[index] = el; }}
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
                          // Handle different link types
                          if (!href) return <a {...props}>{children}</a>;

                          // mailto links open in same window
                          if (href.startsWith('mailto:')) {
                            return (
                              <a
                                href={href}
                                className="text-blue-600 hover:underline font-medium underline"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          }

                          // Check if link is internal (portablespas.co.nz)
                          const isInternal = (() => {
                            try {
                              const url = new URL(href, window.location.href);
                              return url.hostname.includes('portablespas.co.nz');
                            } catch {
                              // If URL parsing fails, assume it's a relative URL (internal)
                              return !href.startsWith('http');
                            }
                          })();

                          return (
                            <a
                              href={href}
                              target={isInternal ? '_parent' : '_blank'}
                              rel={isInternal ? undefined : 'noopener noreferrer'}
                              className="text-blue-600 hover:underline font-medium underline"
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
        
            {/* Scroll to latest message button */}
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
                className="w-full px-4 py-3 text-base border-gray-300 rounded-3xl focus:ring-2 focus:ring-gray-400 focus:border-transparent resize-none"
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
              className="h-11 w-11 rounded-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
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

