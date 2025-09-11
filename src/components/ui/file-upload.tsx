"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"

interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileChange: (file: File) => void
  acceptedFileTypes?: string[]
  maxSize?: number
}

export function FileUpload({
  onFileChange,
  acceptedFileTypes = [".pdf", ".txt", ".md"],
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  ...props
}: FileUploadProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0]
        setFile(selectedFile)
        setError(null)
        onFileChange(selectedFile)
      }
    },
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    maxSize,
    maxFiles: 1,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0]
      if (rejection.errors[0].code === "file-too-large") {
        setError(`File is too large. Max size is ${maxSize / (1024 * 1024)}MB.`)
      } else if (rejection.errors[0].code === "file-invalid-type") {
        setError(`Invalid file type. Accepted types: ${acceptedFileTypes.join(", ")}`)
      } else {
        setError("Error uploading file. Please try again.")
      }
    },
  })

  return (
    <div className={cn("w-full", className)} {...props}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center rounded-md border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-primary/50 bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="M12 12v9" />
              <path d="m16 16-4-4-4 4" />
            </svg>
          </div>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {file ? file.name : "Drag & drop a file here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">
              {file
                ? `${(file.size / 1024).toFixed(2)} KB`
                : `Supported formats: ${acceptedFileTypes.join(", ")} (Max ${maxSize / (1024 * 1024)}MB)`}
            </p>
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}