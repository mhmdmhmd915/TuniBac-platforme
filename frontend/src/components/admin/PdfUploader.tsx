import { useRef, useState } from 'react';
import { FileText, X } from 'lucide-react';
import { logger } from '../../lib/logger';

interface PdfUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  placeholder?: string;
}

export const PdfUploader = ({
  value,
  onChange,
  onUpload,
  placeholder = 'Click or drag PDF here',
}: PdfUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      logger.warn('Only PDF files are allowed', { fileType: file.type });
      return;
    }

    setIsUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (error) {
      logger.error('PDF upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
          await handleFile(file);
        }
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
        isDragging
          ? 'border-[#0B5ED7] bg-[#0B5ED7]/10'
          : 'border-gray-300 dark:border-gray-600 hover:border-[#0B5ED7]'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await handleFile(file);
          }
        }}
      />

      {value ? (
        <div className="relative rounded-2xl bg-gray-50 p-5 dark:bg-white/5">
          <div className="flex items-center justify-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            <FileText size={22} className="text-[#0B5ED7]" />
            <span className="truncate">{value.split('/').pop()}</span>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            className="absolute right-3 top-3 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="mx-auto w-fit rounded-full bg-gray-100 p-4 dark:bg-white/5">
            {isUploading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0B5ED7]" />
            ) : (
              <FileText className="text-gray-400" size={30} />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isUploading ? 'Uploading PDF...' : placeholder}
          </p>
        </div>
      )}
    </div>
  );
};

