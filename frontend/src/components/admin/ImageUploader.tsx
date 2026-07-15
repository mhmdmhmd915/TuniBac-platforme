import { useState, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { logger } from '../../lib/logger';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  placeholder?: string;
}

export const ImageUploader = ({
  value,
  onChange,
  onUpload,
  placeholder = 'Click or drag image here',
}: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (error) {
      logger.error('Image upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
        transition-all duration-200
        ${
          isDragging
            ? 'border-[#0B5ED7] bg-[#0B5ED7]/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-[#0B5ED7]'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await handleFile(file);
        }}
      />

      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Uploaded"
            className="max-h-48 mx-auto rounded-xl object-cover"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeImage();
            }}
            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full w-fit mx-auto">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B5ED7]"></div>
            ) : (
              <ImageIcon className="text-gray-400" size={32} />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {isUploading ? 'Uploading...' : placeholder}
          </p>
        </div>
      )}
    </div>
  );
};

