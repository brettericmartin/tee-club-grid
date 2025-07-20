import { useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Quote, Code, Link2, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export default function PostEditor({
  value,
  onChange,
  placeholder = "Write your post...",
  disabled = false,
  minHeight = "150px"
}: PostEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea - optimized to prevent focus loss
  useEffect(() => {
    if (textareaRef.current) {
      // Store current selection before resize
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      // Calculate new height without resetting to 'auto' first
      const scrollHeight = textareaRef.current.scrollHeight;
      const currentHeight = parseInt(textareaRef.current.style.height || '0');
      const minHeightPx = parseInt(minHeight);
      const newHeight = Math.max(scrollHeight, minHeightPx);
      
      // Only update if height actually needs to change
      if (currentHeight !== newHeight) {
        textareaRef.current.style.height = `${newHeight}px`;
        
        // Restore selection after resize
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(start, end);
          }
        });
      }
    }
  }, [value, minHeight]);

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = 
      value.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      value.substring(end);

    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Add keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('*', '*');
          break;
        case 'k':
          e.preventDefault();
          insertFormatting('[', '](url)');
          break;
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-white/5 rounded-lg border border-white/10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting('**', '**')}
          disabled={disabled}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting('*', '*')}
          disabled={disabled}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting('> ')}
          disabled={disabled}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting('`', '`')}
          disabled={disabled}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => insertFormatting('[', '](url)')}
          disabled={disabled}
          title="Link (Ctrl+K)"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 px-2">
          Markdown supported
        </span>
      </div>

      {/* Editor */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "resize-none bg-white/5 border-white/10",
          "placeholder:text-gray-500",
          "focus:border-[#10B981]",
          "transition-none" // Disable transitions to prevent focus issues
        )}
        style={{ minHeight, height: minHeight }} // Set initial height
      />

      {/* Preview Note */}
      <p className="text-xs text-gray-400">
        Use **bold**, *italic*, `code`, [links](url), and {'>'} quotes for formatting
      </p>
    </div>
  );
}