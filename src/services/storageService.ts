import { supabase } from '../lib/supabase';

export const StorageService = {
  /**
   * Uploads a file to a Supabase bucket.
   * @param bucket The name of the bucket (e.g., 'schools', 'users')
   * @param path The path within the bucket (e.g., 'school_id/logo.png')
   * @param file The file object or Blob
   */
  async uploadFile(bucket: string, path: string, file: File | Blob) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      });

    if (error) {
      console.error(`Error uploading to ${bucket}/${path}:`, error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  },

  /**
   * Deletes a file from a Supabase bucket.
   */
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error(`Error deleting ${bucket}/${path}:`, error);
      throw error;
    }
  }
};
