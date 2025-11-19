import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type EditorMode = 'edit' | 'preview' | 'split';

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('split');

  return (
    <Card className={cn('p-4 space-y-3 bg-white', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Content</span>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('edit')}
          >
            Edit
          </Button>
          <Button
            variant={mode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>
          <Button
            variant={mode === 'split' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('split')}
          >
            Split
          </Button>
        </div>
      </div>

      <div
        className={cn('grid gap-4', {
          'md:grid-cols-2': mode === 'split',
        })}
      >
        {(mode === 'edit' || mode === 'split') && (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Markdown input
            </label>
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              rows={mode === 'split' ? 16 : 20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            />
            <p className="mt-2 text-xs text-gray-500">
              Supports standard Markdown syntax. Examples: <code># Heading</code>,{' '}
              <code>**bold text**</code>, <code>- bullet item</code>, <code>`code`</code>.
            </p>
          </div>
        )}

        {(mode === 'preview' || mode === 'split') && (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Live preview
            </label>
            <div className="border border-gray-200 rounded-md bg-gray-50 p-4 prose prose-sm max-w-none overflow-y-auto">
              {value.trim() ? (
                <ReactMarkdown>{value}</ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">Start typing to preview your content…</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

