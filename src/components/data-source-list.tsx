'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteDataSource } from '@/app/dashboard/chatbots/data-sources/actions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

type DataSourceType = 'website' | 'file' | 'text'
type DataSourceStatus = 'pending' | 'training' | 'ready' | 'error'

interface DataSource {
  id: string
  chatbot_id: string
  user_id: string
  type: DataSourceType
  content: string
  status: DataSourceStatus
  created_at: string
}

interface DataSourceListProps {
  dataSources: DataSource[]
  chatbotId: string
  onDelete: () => void
}

export function DataSourceList({ dataSources, chatbotId, onDelete }: DataSourceListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteDataSource(id, chatbotId)
      if (result.success) {
        onDelete()
      }
    } catch (error) {
      console.error('Error deleting data source:', error)
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const getStatusBadge = (status: DataSourceStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'training':
        return <Badge variant="info">Training</Badge>
      case 'ready':
        return <Badge variant="success">Ready</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTypeIcon = (type: DataSourceType) => {
    switch (type) {
      case 'website':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        )
      case 'file':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )
      case 'text':
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  if (dataSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-3">
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
            className="h-6 w-6"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-semibold">No data sources</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Add websites, files, or text to train your chatbot.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dataSources.map((source) => (
        <div
          key={source.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center space-x-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              {getTypeIcon(source.type)}
            </div>
            <div>
              <div className="flex items-center">
                <div className="flex items-center">
                  <span className="font-medium">{source.type.charAt(0).toUpperCase() + source.type.slice(1)}</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  {getStatusBadge(source.status)}
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                <span className="block truncate max-w-[300px]" title={source.content}>
                  {source.content}
                </span>
                <span className="mt-1 block text-xs">
                  Added {formatDate(source.created_at)}
                </span>
              </div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setDeletingId(source.id)}
                disabled={isDeleting && deletingId === source.id}
              >
                {isDeleting && deletingId === source.id ? (
                  <>Deleting...</>
                ) : (
                  <>Delete</>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Data Source</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this data source? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(source.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  )
}