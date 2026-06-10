import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import path from 'path';

const DRIVE_FOLDER_ID = '11QDUwYFkgjHY5GyiyO9BXz7TC2QK7vDb'; // default, but accept query
const KEY_FILE_PATH = path.resolve(process.cwd(), 'service-account-key.json');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || DRIVE_FOLDER_ID;
  const searchTerm = searchParams.get('search');

  // Require authenticated user (the page already checks, but double protect the API)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = new GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
      throw new Error('Failed to obtain access token from service account');
    }

    let q = '';
    if (searchTerm) {
      const safeSearch = searchTerm.replace(/'/g, "\\'");
      q = `fullText contains '${safeSearch}'`;
      if (folderId) {
        q += ` and '${folderId}' in parents and trashed = false`;
      }
    } else if (folderId) {
      q = `'${folderId}' in parents and trashed = false`;
    } else {
      q = 'trashed = false';
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,size,webViewLink,webContentLink,iconLink,thumbnailLink,parents)&pageSize=1000&orderBy=modifiedTime%20desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const files = data.files || [];

    return NextResponse.json({ files });
  } catch (err: any) {
    console.error('Drive list error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to list Drive files' },
      { status: 500 }
    );
  }
}
