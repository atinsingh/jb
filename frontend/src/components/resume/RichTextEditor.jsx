'use client'

import { useState, useEffect, useRef } from 'react';
import { 
  BoldIcon, 
  ItalicIcon, 
  ListBulletIcon,
  NumberedListIcon,
} from '@heroicons/react/24/outline';

export default function RichTextEditor({ value, onChange, placeholder = 'Start typing...' }) {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize content on mount
  useEffect(() => {
    if (isMounted && editorRef.current && value) {
      editorRef.current.innerHTML = value;
    }
  }, [isMounted]);

  // Sync content when value prop changes (but not during user typing)
  useEffect(() => {
    if (editorRef.current && isMounted && value !== undefined && !isUpdatingRef.current) {
      const currentContent = editorRef.current.innerHTML;
      // Only update if content actually differs
      if (currentContent !== value) {
        isUpdatingRef.current = true;
        editorRef.current.innerHTML = value || '';
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 50);
      }
    }
  }, [value, isMounted]);

  const handleInput = () => {
    if (editorRef.current && !isUpdatingRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  const checkFormatting = () => {
    if (editorRef.current) {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
    }
  };

  if (!isMounted) {
    return (
      <div className="border border-zinc-300 rounded-lg bg-white min-h-[200px]">
        <div className="flex items-center gap-1 p-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
          <div className="p-2 rounded">
            <BoldIcon className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="p-2 rounded">
            <ItalicIcon className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="p-2 rounded">
            <ListBulletIcon className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="p-2 rounded">
            <NumberedListIcon className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-zinc-400">{placeholder}</div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-zinc-200 bg-zinc-50 rounded-t-lg">
        <button
          type="button"
          onClick={() => {
            execCommand('bold');
            setTimeout(checkFormatting, 10);
          }}
          className={`p-2 rounded hover:bg-zinc-200 transition-colors ${
            isBold ? 'bg-zinc-300' : ''
          }`}
          title="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            execCommand('italic');
            setTimeout(checkFormatting, 10);
          }}
          className={`p-2 rounded hover:bg-zinc-200 transition-colors ${
            isItalic ? 'bg-zinc-300' : ''
          }`}
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 rounded hover:bg-zinc-200 transition-colors"
          title="Bullet List"
        >
          <ListBulletIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 rounded hover:bg-zinc-200 transition-colors"
          title="Numbered List"
        >
          <NumberedListIcon className="h-4 w-4" />
        </button>
      </div>
      
      {/* Editor Content - Using contentEditable */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={checkFormatting}
        onKeyUp={checkFormatting}
        onMouseUp={checkFormatting}
        className="prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 text-sm text-zinc-700 leading-relaxed"
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      {/* Placeholder styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #a1a1aa;
          pointer-events: none;
        }
        [contenteditable] ul,
        [contenteditable] ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable] li {
          margin-bottom: 0.25rem;
        }
        [contenteditable] p {
          margin-bottom: 0.5rem;
        }
        [contenteditable] strong {
          font-weight: 600;
        }
        [contenteditable] em {
          font-style: italic;
        }
      `}} />
    </div>
  );
}

