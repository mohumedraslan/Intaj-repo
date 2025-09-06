import { createClient } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { decode } from 'base64-arraybuffer';

interface FileMetadata {
  fileName: string;
  fileType: string;
  size: number;
}

export class StorageService {
  private supabase = createClient();
  private readonly BUCKET_NAME = 'documents';
  private readonly ALLOWED_TYPES = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
  ];

  async uploadFile(
    file: File,
    chatbotId: string,
    userId: string
  ): Promise<string> {
    // Validate file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type not supported');
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${chatbotId}/${uuidv4()}.${fileExt}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    // Add file record to data_sources table
    const { error: dbError } = await this.supabase
      .from('data_sources')
      .insert({
        chatbot_id: chatbotId,
        type: file.type,
        path: filePath,
        metadata: {
          originalName: file.name,
          size: file.size,
          type: file.type,
        },
      });

    if (dbError) {
      // Cleanup uploaded file if database insert fails
      await this.supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);
      throw new Error(`Error saving file metadata: ${dbError.message}`);
    }

    return filePath;
  }

  async deleteFile(filePath: string): Promise<void> {
    // Delete from storage
    const { error: storageError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filePath]);

    if (storageError) {
      throw new Error(`Error deleting file: ${storageError.message}`);
    }

    // Delete from data_sources
    const { error: dbError } = await this.supabase
      .from('data_sources')
      .delete()
      .eq('path', filePath);

    if (dbError) {
      throw new Error(`Error deleting file metadata: ${dbError.message}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    const { data } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (!data?.signedUrl) {
      throw new Error('Error generating signed URL');
    }

    return data.signedUrl;
  }

  async getFileContent(filePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .download(filePath);

    if (error) {
      throw new Error(`Error downloading file: ${error.message}`);
    }

    // Convert blob to text
    return await data.text();
  }
}
