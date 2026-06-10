import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import path from 'path';

const KEY_FILE_PATH = path.resolve(process.cwd(), 'service-account-key.json');

export async function POST(request: NextRequest) {
  const { fileId, newParentId, removeParents } = await request.json();

  if (!fileId || !newParentId) {
    return NextResponse.json({ error: 'fileId y newParentId son requeridos' }, { status: 400 });
  }

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
      throw new Error('No token');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${newParentId}${removeParents ? `&removeParents=${removeParents}` : ''}&fields=id,name,parents`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Move error: ${res.status} ${err}`);
    }

    const updated = await res.json();
    return NextResponse.json({ success: true, file: updated });
  } catch (err: any) {
    console.error('Drive move error:', err);
    return NextResponse.json({ error: err.message || 'Error al mover' }, { status: 500 });
  }
}
