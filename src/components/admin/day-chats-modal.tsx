'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, User, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ChatLog } from '@/lib/blob-db';

interface DayChatsModalProps {
  date: string | null;
  onClose: () => void;
  onViewChat: (chat: ChatLog) => void;
}

export default function DayChatsModal({ date, onClose, onViewChat }: DayChatsModalProps) {
  const [chats, setChats] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const chatsPerPage = 10;

  useEffect(() => {
    if (date) {
      fetchChatsForDate(date);
    }
  }, [date]);

  const fetchChatsForDate = async (dateStr: string) => {
    setLoading(true);
    try {
      const password = localStorage.getItem('adminPassword');
      const response = await fetch(`/api/admin/stats?date=${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!chats.length) return;

    const headers = ['User Name', 'Created At', 'Messages', 'Last Updated'];
    const rows = chats.map(chat => [
      chat.user_name,
      format(parseISO(chat.created_at), 'yyyy-MM-dd HH:mm:ss'),
      chat.messages.length.toString(),
      format(parseISO(chat.updated_at), 'yyyy-MM-dd HH:mm:ss'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chats-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!date) return null;

  const totalPages = Math.ceil(chats.length / chatsPerPage);
  const startIndex = (currentPage - 1) * chatsPerPage;
  const endIndex = startIndex + chatsPerPage;
  const paginatedChats = chats.slice(startIndex, endIndex);

  const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{formattedDate}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {chats.length} {chats.length === 1 ? 'chat' : 'chats'} on this day
            </p>
          </div>
          <div className="flex items-center gap-2">
            {chats.length > 0 && (
              <button
                onClick={exportToCSV}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p>No chats found for this day</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedChats.map((chat) => (
                <div
                  key={chat.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onViewChat(chat)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{chat.user_name}</span>
                        <span className="text-xs text-gray-400">
                          {format(parseISO(chat.created_at), 'h:mm a')}
                        </span>
                      </div>
                      {chat.messages.length > 0 && (
                        <div className="text-sm text-gray-600 line-clamp-2 ml-6">
                          {chat.messages[0].content}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 ml-6">
                        <span className="text-xs text-gray-500">
                          <MessageSquare className="w-3 h-3 inline mr-1" />
                          {chat.messages.length} {chat.messages.length === 1 ? 'message' : 'messages'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Last updated: {format(parseISO(chat.updated_at), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
