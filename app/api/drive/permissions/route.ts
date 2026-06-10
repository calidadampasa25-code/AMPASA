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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'fileId es requerido' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('No token');

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,displayName,type)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive permissions list error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return NextResponse.json({ permissions: data.permissions || [] });
  } catch (err: any) {
    console.error('Drive permissions GET error:', err);
    return NextResponse.json({ error: err.message || 'Error al listar permisos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { fileId, emailAddress, role = 'reader', type = 'user' } = await request.json();

  if (!fileId || (!emailAddress && type !== 'anyone')) {
    return NextResponse.json({ error: 'fileId y emailAddress (o type=anyone) son requeridos' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('No token');

    const body: any = { role, type };
    if (type === 'user' && emailAddress) {
      body.emailAddress = emailAddress;
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive add permission error: ${res.status} ${err}`);
    }

    const permission = await res.json();
    return NextResponse.json({ success: true, permission });
  } catch (err: any) {
    console.error('Drive permissions POST error:', err);
    return NextResponse.json({ error: err.message || 'Error al agregar permiso' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const permissionId = searchParams.get('permissionId');

  if (!fileId || !permissionId) {
    return NextResponse.json({ error: 'fileId y permissionId son requeridos' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('No token');

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive delete permission error: ${res.status} ${err}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Drive permissions DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar permiso' }, { status: 500 });
  }
}
