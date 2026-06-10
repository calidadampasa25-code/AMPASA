import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';
import path from 'path';

const KEY_FILE_PATH = path.resolve(process.cwd(), 'service-account-key.json');

export async function POST(request: NextRequest) {
  const { fileId, name } = await request.json();

  if (!fileId || !name || typeof name !== 'string') {
    return NextResponse.json({ error: 'fileId y name son requeridos' }, { status: 400 });
  }

  // Require authenticated user
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
      throw new Error('No se pudo obtener token de acceso del service account');
    }

    const updateUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Error al renombrar en Drive (${res.status}): ${errText}`);
    }

    const updated = await res.json();
    return NextResponse.json({ success: true, file: { id: updated.id, name: updated.name } });
  } catch (err: any) {
    console.error('Drive rename error:', err);
    return NextResponse.json(
      { error: err.message || 'Error al renombrar el archivo' },
      { status: 500 }
    );
  }
}
