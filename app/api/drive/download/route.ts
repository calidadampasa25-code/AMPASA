import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { createSupabaseServerClient } from '@/app/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const inline = searchParams.get('inline') === 'true';
  const fileName = searchParams.get('name') || 'documento';
  const mimeType = searchParams.get('mimeType') || '';

  if (!fileId) {
    return NextResponse.json({ error: 'fileId es requerido' }, { status: 400 });
  }

  // Require authenticated user
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
      throw new Error('No se pudo obtener token de acceso del service account');
    }

    const isGoogleNative = mimeType.startsWith('application/vnd.google-apps.');

    let downloadUrl: string;
    let responseMime: string | null = null;

    if (isGoogleNative) {
      // For Google Docs/Sheets/Slides: export. For inline/preview prefer PDF for rendering in iframe
      if (mimeType.includes('document')) {
        responseMime = inline ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (mimeType.includes('spreadsheet')) {
        responseMime = inline ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (mimeType.includes('presentation')) {
        responseMime = inline ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      } else {
        responseMime = 'application/pdf';
      }
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(responseMime)}`;
    } else {
      // Regular binary files (PDF, images, etc.)
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Error al obtener archivo de Drive (${res.status}): ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const contentType = responseMime || res.headers.get('content-type') || 'application/octet-stream';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    const dispositionType = inline ? 'inline' : 'attachment';
    // Sanitize filename for header
    const safeName = fileName.replace(/"/g, '');
    headers.set('Content-Disposition', `${dispositionType}; filename="${encodeURIComponent(safeName)}"`);

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Drive download error:', err);
    return NextResponse.json(
      { error: err.message || 'Error al descargar el archivo' },
      { status: 500 }
    );
  }
}
