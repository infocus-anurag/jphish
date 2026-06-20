'use client';

import { useRef, useState, type DragEvent } from 'react';
import { I } from '@/components/ui/Icons';

interface FileDropProps {
  /** Called with the file's text contents and the file name once read. */
  onFile: (text: string, fileName: string) => void;
  /** Accept attribute, e.g. ".csv,.txt,text/csv". */
  accept?: string;
  /** Max size in bytes (default 5 MB). */
  maxSize?: number;
  title?: string;
  hint?: string;
}

const DEFAULT_MAX = 5 * 1024 * 1024;

export function FileDrop({
  onFile,
  accept = '.csv,.txt,text/csv',
  maxSize = DEFAULT_MAX,
  title = 'Drop a CSV file here',
  hint = 'or click to browse — .csv or .txt',
}: FileDropProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined): void {
    setError(null);
    if (!file) return;
    if (file.size > maxSize) {
      setError(`File is too large (max ${(maxSize / 1024 / 1024).toFixed(0)} MB).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onFile(String(reader.result ?? ''), file.name);
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsText(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={`filedrop${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="filedrop-icon">
          <I.upload size={20} />
        </div>
        <div className="filedrop-title">{title}</div>
        <div className="filedrop-hint">{hint}</div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
