import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

import { MAX_CV_FILE_NAME_LENGTH, MAX_CV_SIZE_BYTES } from '@/constants/cv'
import { cn } from '@/utils/cn'
import { formatFileSize } from '@/utils/format'

export interface CvDropzoneProps {
  onFile: (file: File) => void
}

/** Vùng kéo thả hoặc bấm để chọn một file PDF. Kiểm tra file nằm ở cvService, không ở đây. */
export function CvDropzone({ onFile }: CvDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    // dragleave cũng bắn khi chuột đi vào phần tử con, chỉ tắt khi thật sự ra ngoài vùng.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Chọn hoặc kéo thả file CV"
      onClick={() => inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-dashed px-6 py-12 text-center transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        isDragging
          ? 'border-brand-500 bg-brand-50'
          : 'border-border-strong bg-surface hover:border-brand-400',
      )}
    >
      <div className="flex h-14 w-12 items-end justify-center rounded-control border border-border-strong bg-surface pb-2 text-[11px] font-bold text-danger-700">
        PDF
      </div>
      <div>
        <p className="font-semibold text-content">Kéo thả CV vào đây</p>
        <p className="mt-1 text-sm text-content-muted">hoặc bấm để chọn file từ máy</p>
      </div>
      <span className="inline-flex h-8 items-center rounded-control bg-surface px-3 text-sm font-medium text-content ring-1 ring-border-strong">
        Chọn file
      </span>
      <p className="text-xs text-content-subtle">
        Chỉ nhận PDF &middot; tối đa {formatFileSize(MAX_CV_SIZE_BYTES)} &middot; tên file tối đa{' '}
        {MAX_CV_FILE_NAME_LENGTH} ký tự
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFile(file)
          // Reset để chọn lại đúng file vừa chọn vẫn kích hoạt onChange.
          event.target.value = ''
        }}
      />
    </div>
  )
}
