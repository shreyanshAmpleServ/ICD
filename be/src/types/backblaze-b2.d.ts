declare module "backblaze-b2" {
  export interface B2Options {
    applicationKeyId: string;
    applicationKey: string;
    retry?: any;
    axios?: any;
  }

  export interface UploadUrlResponse {
    data: {
      bucketId: string;
      uploadUrl: string;
      authorizationToken: string;
    };
  }

  export interface UploadFileOptions {
    uploadUrl: string;
    uploadAuthToken: string;
    fileName: string;
    data: Buffer | Uint8Array;
    mime?: string;
    contentLength?: number;
    info?: Record<string, string>;
    onUploadProgress?: (event: any) => void;
  }

  export interface UploadFileResponse {
    data: {
      fileId: string;
      fileName: string;
      contentLength: number;
      contentSha1: string;
      contentType: string;
      uploadTimestamp: number;
      [key: string]: any;
    };
  }

  export default class B2 {
    constructor(options: B2Options);
    authorize(): Promise<{ data: any }>;
    getUploadUrl(options: { bucketId: string }): Promise<UploadUrlResponse>;
    uploadFile(options: UploadFileOptions): Promise<UploadFileResponse>;
    [key: string]: any;
  }
}
