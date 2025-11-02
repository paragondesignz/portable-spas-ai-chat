'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ChartData {
  date: string;
  chats: number;
  messages: number;
  users: string[];
}

interface UsageChartProps {
  data: ChartData[];
  range: number;
  onRangeChange: (range: number) => void;
  onBarClick: (date: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = parseISO(label as string);
    const formattedDate = format(date, 'EEEE, MMM d, yyyy');
    const chatsData = payload.find((p: any) => p.dataKey === 'chats');
    const messagesData = payload.find((p: any) => p.dataKey === 'messages');

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]">
        <p className="font-semibold text-gray-900 mb-2">{formattedDate}</p>
        <div className="space-y-1">
          {chatsData && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">Chats</span>
              </div>
              <span className="font-semibold text-gray-900">{chatsData.value}</span>
            </div>
          )}
          {messagesData && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Messages</span>
              </div>
              <span className="font-semibold text-gray-900">{messagesData.value}</span>
            </div>
          )}
          {chatsData && messagesData && chatsData.value > 0 && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-gray-500">Avg messages/chat</span>
                <span className="text-sm font-medium text-gray-700">
                  {(messagesData.value / chatsData.value).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">Click to view chats</p>
      </div>
    );
  }

  return null;
};

export default function UsageChart({ data, range, onRangeChange, onBarClick }: UsageChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  const ranges = [
    { value: 7, label: '7 Days' },
    { value: 30, label: '30 Days' },
    { value: 90, label: '90 Days' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Usage Over Time</h2>
        <div className="flex gap-2">
          {ranges.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onRangeChange(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          onClick={(e) => {
            if (e && e.activeLabel) {
              onBarClick(e.activeLabel);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(parseISO(date), 'MMM d')}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
          <Legend
            wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
            onClick={(e) => handleLegendClick(e.dataKey as string)}
            formatter={(value, entry: any) => (
              <span
                style={{
                  color: hiddenSeries.has(entry.dataKey) ? '#9ca3af' : '#374151',
                  textDecoration: hiddenSeries.has(entry.dataKey) ? 'line-through' : 'none',
                }}
              >
                {value}
              </span>
            )}
          />
          {!hiddenSeries.has('chats') && (
            <Bar
              dataKey="chats"
              fill="url(#colorChats)"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              animationBegin={0}
              cursor="pointer"
            />
          )}
          {!hiddenSeries.has('messages') && (
            <Bar
              dataKey="messages"
              fill="url(#colorMessages)"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              animationBegin={100}
              cursor="pointer"
            />
          )}
          <defs>
            <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.8} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center text-sm text-gray-500">
        Click on any bar to view chats from that day
      </div>
    </div>
  );
}
