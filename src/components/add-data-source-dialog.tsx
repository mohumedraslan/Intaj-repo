'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/ui/file-upload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createDataSource } from '@/app/dashboard/chatbots/data-sources/actions'

interface AddDataSourceDialogProps {
  agentId: string
  children: React.ReactNode
}

export function AddDataSourceDialog({ agentId, children }: AddDataSourceDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('website')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [fileContent, setFileContent] = useState<File | null>(null)
  const [rawText, setRawText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      let content = ''
      let type: 'website' | 'file' | 'text' = 'website'

      switch (activeTab) {
        case 'website':
          if (!websiteUrl) {
            setError('Please enter a valid URL')
            setIsLoading(false)
            return
          }
          content = websiteUrl
          type = 'website'
          break

        case 'file':
          if (!fileContent) {
            setError('Please select a file')
            setIsLoading(false)
            return
          }
          // For files, we'll need to upload to storage first
          // For now, just store the file name as a placeholder
          content = fileContent.name
          type = 'file'
          break

        case 'text':
          if (!rawText) {
            setError('Please enter some text')
            setIsLoading(false)
            return
          }
          content = rawText
          type = 'text'
          break
      }

      const result = await createDataSource({
        agentId,
        type,
        content,
      })

      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to add data source')
      }
    } catch (err) {
      console.error('Error adding data source:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (file: File) => {
    setFileContent(file)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Data Source</DialogTitle>
          <DialogDescription>
            Add knowledge to your agent by providing a website URL, uploading a file, or entering text directly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="website">Website URL</TabsTrigger>
                <TabsTrigger value="file">File Upload</TabsTrigger>
                <TabsTrigger value="text">Raw Text</TabsTrigger>
              </TabsList>
              <TabsContent value="website" className="mt-4">
                <div className="space-y-2">
                  <label htmlFor="website-url" className="text-sm font-medium">
                    Website URL
                  </label>
                  <Input
                    id="website-url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the URL of a website to extract content from.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="file" className="mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload File</label>
                  <FileUpload
                    onFileChange={handleFileChange}
                    acceptedFileTypes={[".pdf", ".txt", ".md"]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a PDF, TXT, or MD file to extract content from.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="text" className="mt-4">
                <div className="space-y-2">
                  <label htmlFor="raw-text" className="text-sm font-medium">
                    Raw Text
                  </label>
                  <Textarea
                    id="raw-text"
                    placeholder="Enter or paste text here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter or paste text directly to add as a knowledge source.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Data Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}