import { apiClient } from './apiClient';

export interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export const uploadService = {
  async uploadFile(file: File, category: 'DAMAGE_PHOTO' | 'CUSTOMS_DOC' | 'GATE_PASS' | 'GENERAL'): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return apiClient<UploadResult>('/uploads', {
      method: 'POST',
      body: formData,
      // Let browser set the multipart boundary
      headers: {},
    });
  },

  async getFileMetadata(fileId: string): Promise<UploadResult> {
    return apiClient<UploadResult>(`/uploads/${fileId}`);
  },
};

export default uploadService;

