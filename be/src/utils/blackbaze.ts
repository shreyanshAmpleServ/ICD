import B2 from 'backblaze-b2';

// 1. Initialize Backblaze client
const b2 = new B2({
  applicationKeyId: process.env.BACKBLAZE_B2_KEY_ID || '',
  applicationKey: process.env.BACKBLAZE_B2_APPLICATION_KEY || '',
});

let authPromise: Promise<void> | null = null;
let authExpiry: number = 0;

// 2. Authorize with token caching (prevents re-authorizing on every single request)
export async function authorizeB2(): Promise<void> {
  const now = Date.now();
  // If token is still valid for more than 5 minutes, reuse it
  if (authExpiry > now + 5 * 60 * 1000) {
    return;
  }
  if (authPromise) {
    return authPromise;
  }
  authPromise = (async () => {
    try {
      await b2.authorize();
      authExpiry = now + 60 * 60 * 1000; // Cache for 1 hour
      console.log('B2 Authorization successful');
    } catch (error: any) {
      authExpiry = 0;
      throw new Error(`B2 Authorization failed: ${error.message}`);
    } finally {
      authPromise = null;
    }
  })();
  return authPromise;
}

// 3. Upload File Function
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    await authorizeB2();
    // Step A: Request a dedicated upload URL from Backblaze
    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: process.env.BACKBLAZE_B2_BUCKET_ID!,
    });
    if (!uploadUrlResponse.data) {
      throw new Error('Failed to get B2 upload URL');
    }
    const { uploadUrl, authorizationToken } = uploadUrlResponse.data;
    // Step B: Upload file buffer
    const uploadResponse = await b2.uploadFile({
      uploadUrl,
      uploadAuthToken: authorizationToken,
      fileName,
      data: fileBuffer,
      mime: mimeType,
      info: {
        src_last_modified_millis: String(Date.now()),
      },
    });
    if (!uploadResponse.data) {
      throw new Error('Upload response missing data');
    }
    // Step C: Construct and return the public URL
    const bucketName = process.env.BACKBLAZE_B2_BUCKET_NAME;
    const bucketUrl = process.env.BACKBLAZE_BUCKET_URL;
    const fileUrl = bucketUrl
      ? `${bucketUrl.replace(/\/$/, '')}/${fileName}`
      : `https://f005.backblazeb2.com/file/${bucketName}/${fileName}`;
    return fileUrl;
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('Upload failed:', { fileName, error: errorMsg });
    throw new Error(`Failed to upload file: ${errorMsg}`);
  }
}

export default {
  authorizeB2,
  uploadFile,
};
