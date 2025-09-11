import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DataSource {
  id: string
  chatbot_id: string
  user_id: string
  type: 'website' | 'file' | 'text'
  content: string
  status: 'pending' | 'training' | 'ready' | 'error'
  created_at: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: DataSource
  schema: string
  old_record: null | DataSource
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const payload: WebhookPayload = await req.json()
    
    // Only process INSERT events for data_sources table
    if (payload.type !== 'INSERT' || payload.table !== 'data_sources') {
      return new Response(JSON.stringify({ message: 'Not a data_source insert event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    const dataSource = payload.record
    
    // Create Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Update status to 'training'
    await supabaseAdmin
      .from('data_sources')
      .update({ status: 'training' })
      .eq('id', dataSource.id)
    
    // Process the data source based on its type
    let extractedText = ''
    
    try {
      switch (dataSource.type) {
        case 'website':
          extractedText = await extractWebsiteContent(dataSource.content)
          break
        case 'file':
          // For file processing, we would need to download from storage
          // This is a placeholder for now
          extractedText = `Content from file: ${dataSource.content}`
          break
        case 'text':
          extractedText = dataSource.content
          break
        default:
          throw new Error(`Unknown data source type: ${dataSource.type}`)
      }
      
      // Clean and chunk the text
      const chunks = chunkText(extractedText)
      
      // For each chunk, generate embeddings and store in vector database
      for (const chunk of chunks) {
        // Generate embedding (placeholder - would call OpenAI API in production)
        const embedding = await generateEmbedding(chunk)
        
        // Store in vector database
        await storeEmbedding(supabaseAdmin, dataSource.id, dataSource.chatbot_id, chunk, embedding)
      }
      
      // Update status to 'ready'
      await supabaseAdmin
        .from('data_sources')
        .update({ status: 'ready' })
        .eq('id', dataSource.id)
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (error) {
      console.error('Error processing data source:', error)
      
      // Update status to 'error'
      await supabaseAdmin
        .from('data_sources')
        .update({ status: 'error' })
        .eq('id', dataSource.id)
      
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  } catch (error) {
    console.error('Error handling webhook:', error)
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function extractWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove script and style elements
    $('script, style').remove()
    
    // Get text from body
    const text = $('body').text()
    
    // Clean up text (remove excessive whitespace, etc.)
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
  } catch (error) {
    console.error('Error extracting website content:', error)
    throw new Error(`Failed to extract content from ${url}: ${error.message}`)
  }
}

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = []
  let i = 0
  
  while (i < text.length) {
    // If this is not the first chunk, include overlap
    const start = i === 0 ? 0 : i - overlap
    const end = Math.min(start + chunkSize, text.length)
    
    chunks.push(text.slice(start, end))
    
    i = end
  }
  
  return chunks
}

async function generateEmbedding(text: string): Promise<number[]> {
  // In a real implementation, this would call OpenAI's embedding API
  // For now, return a placeholder embedding
  return Array(1536).fill(0).map(() => Math.random())
}

async function storeEmbedding(
  supabase: any,
  dataSourceId: string,
  chatbotId: string,
  text: string,
  embedding: number[]
) {
  // Store the embedding in the vector database
  // This assumes you have a table set up for embeddings
  await supabase.from('embeddings').insert({
    data_source_id: dataSourceId,
    chatbot_id: chatbotId,
    content: text,
    embedding,
  })
}