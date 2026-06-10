import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';

async function getAccessToken() {
  const authConfig = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? {
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
        scopes: ['https://www.googleapis.com/auth/drive'],
      }
    : {
        keyFile: 'service-account-key.json',
        scopes: ['https://www.googleapis.com/auth/drive'],
      };

  const auth = new GoogleAuth(authConfig);
  const client = await auth.getClient();
  return (await client.getAccessToken()).token;
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string || undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('No token');

    const metadata: any = {
      name: file.name,
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileSize = fileBuffer.length;

    // Use resumable upload for better reliability with larger files (recommended by Google for >5MB or long uploads)
    const initiateUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,modifiedTime,size,webViewLink,webContentLink,iconLink,parents`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min timeout

    try {
      const initiateRes = await fetch(initiateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': file.type || 'application/octet-stream',
          'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify(metadata),
        signal: controller.signal,
      });

      if (!initiateRes.ok) {
        const err = await initiateRes.text();
        throw new Error(`Initiate upload error: ${initiateRes.status} ${err}`);
      }

      const sessionUrl = initiateRes.headers.get('Location');
      if (!sessionUrl) throw new Error('No upload session URL received from Google');

      const uploadRes = await fetch(sessionUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: fileBuffer,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(`Upload error: ${uploadRes.status} ${err}`);
      }

      const newFile = await uploadRes.json();
      return NextResponse.json({ success: true, file: newFile });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Upload timed out after 10 minutes. For very large files, upload directly in Google Drive or split the file.');
      }
      throw fetchErr;
    }
  } catch (err: any) {
    console.error('Drive upload error:', err);
    return NextResponse.json({ error: err.message || 'Error uploading file' }, { status: 500 });
  }
}
