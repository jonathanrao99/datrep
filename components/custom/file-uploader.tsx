'use client'

import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface FileUploaderProps {
  onDrop: (file: File) => void
  onError?: (error: string) => void
  maxSize?: number // in bytes
  acceptedTypes?: string[]
  className?: string
}

export function FileUploader({ 
  onDrop, 
  onError, 
  maxSize = 100 * 1024 * 1024, // 100MB default
  acceptedTypes = ['.csv', '.xlsx', '.xls'],
  className 
}: FileUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0]
        const message = error.code === 'file-too-large' 
          ? 'File is too large. Maximum size is 100MB.'
          : error.code === 'file-invalid-type'
          ? 'Invalid file type. Please upload CSV or Excel files.'
          : 'File upload failed. Please try again.'
        
        setErrorMessage(message)
        setUploadStatus('error')
        onError?.(message)
        return
      }

      if (acceptedFiles?.[0]) {
        setUploadStatus('success')
        setErrorMessage('')
        onDrop(acceptedFiles[0])
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize,
    maxFiles: 1,
    multiple: false,
  })

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-emerald-600" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />
      default:
        return <Upload className="h-8 w-8 text-slate-400" />
    }
  }

  const getStatusText = () => {
    if (uploadStatus === 'success') {
      return 'File selected successfully!'
    }
    if (uploadStatus === 'error') {
      return errorMessage
    }
    if (isDragActive) {
      return 'Drop your file here...'
    }
    return 'Drag and drop or click to select a file'
  }

  const getAcceptedTypesText = () => {
    return `Accepted formats: ${acceptedTypes.join(', ')}`
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
          'hover:border-slate-400 hover:bg-slate-50',
          isDragActive && !isDragReject && 'border-slate-500 bg-slate-100',
          isDragReject && 'border-red-300 bg-red-50',
          uploadStatus === 'success' && 'border-emerald-300 bg-emerald-50',
          uploadStatus === 'error' && 'border-red-300 bg-red-50',
          'bg-slate-50/50 border-slate-300'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {getStatusIcon()}
          
          <div className="space-y-2">
            <p className={cn(
              'text-sm font-medium',
              uploadStatus === 'success' && 'text-emerald-700',
              uploadStatus === 'error' && 'text-red-700',
              uploadStatus === 'idle' && 'text-slate-700'
            )}>
              {getStatusText()}
            </p>
            
            <p className="text-xs text-slate-500">
              {getAcceptedTypesText()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}