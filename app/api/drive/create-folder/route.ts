import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { name, parentId } = await request.json();

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
    const accessToken = (await client.getAccessToken()).token;

    if (!accessToken) {
      throw new Error('No se pudo obtener token');
    }

    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime,parents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Create folder error: ${res.status} ${err}`);
    }

    const folder = await res.json();
    return NextResponse.json({ success: true, folder });
  } catch (err: any) {
    console.error('Drive create folder error:', err);
    return NextResponse.json({ error: err.message || 'Error al crear carpeta' }, { status: 500 });
  }
}
