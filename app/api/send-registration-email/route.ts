import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY!);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tu-email@ejemplo.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AMPASA CALIDAD <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log('Webhook received body:', JSON.stringify(body, null, 2));

    // Support both custom payload and default Supabase webhook payload
    const record = body.record || body;
    const { email, full_name } = record;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const registrationDate = new Date().toLocaleString('es-MX');

    // Email to the ADMIN
    const adminEmailHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c2410f; margin-bottom: 20px;">Nuevo usuario registrado en AMPASA CALIDAD</h2>
        
        <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 8px 0;"><strong>Nombre:</strong> ${full_name || 'Sin nombre'}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 8px 0;"><strong>Fecha de registro:</strong> ${registrationDate}</p>
        </div>

        <p style="margin-bottom: 24px;">Este usuario se ha registrado y está pendiente de aprobación.</p>
        
        <a href="${APP_URL}/admin/users" 
           style="display: inline-block; background: #c2410f; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 10px;">
          Revisar y aprobar usuarios →
        </a>
        <a href="${APP_URL}/api/approve-user?id=${record.id}&email=${encodeURIComponent(email)}" 
           style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: 500;">
          Aprobar este usuario directamente →
        </a>
        
        <p style="margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 16px;">
          Este es un correo automático del sistema AMPASA CALIDAD.
        </p>
      </div>
    `;

    // Email to the NEW USER
    const userEmailHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c2410f;">¡Gracias por registrarte en AMPASA CALIDAD!</h2>
        
        <p>Hola ${full_name || ''},</p>
        
        <p>Tu solicitud de acceso ha sido recibida correctamente.</p>
        
        <p>Un administrador revisará tu cuenta en las próximas <strong>24-48 horas</strong>. 
        Recibirás un correo cuando tu acceso sea aprobado.</p>
        
        <p style="margin-top: 32px; font-size: 14px; color: #555;">
          Si tienes alguna duda, puedes responder a este correo.
        </p>
        
        <p style="margin-top: 40px; font-size: 12px; color: #888;">
          AMPASA CALIDAD — Sistema de Gestión de Documentos
        </p>
      </div>
    `;

    // Send to Admin (this works with Resend test mode)
    const adminResult = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: 'Nuevo usuario registrado - AMPASA CALIDAD',
      html: adminEmailHtml,
    });

    // Send the user confirmation to the applicant.
    // In Resend test mode this will fail (and log) unless the applicant's email matches your Resend account's verified email.
    // We always also send a copy/preview to ADMIN_EMAIL so you can see what the user would receive.
    let userResult;
    try {
      userResult = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: 'Tu solicitud de acceso a AMPASA CALIDAD ha sido recibida',
        html: userEmailHtml,
      });
    } catch (userErr: any) {
      console.error('Direct send to applicant failed (Resend test mode limitation - only to your verified account email):', userErr);
      userResult = { data: null, error: userErr.message };
    }

    // Always send a copy of the user confirmation to the admin (as preview)
    const previewHtml = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #c2410f;">[COPIA/PREVIEW para admin] Confirmación enviada a: ${email}</h2>
        <p><strong>Este es el correo que se envió (o intentó enviar) al solicitante.</strong></p>
        <p>En modo prueba de Resend, los envíos a otros emails fallan a menos que verifiques un dominio. El solicitante recibirá el real una vez que configures un dominio verificado en Resend y uses from@tu-dominio.com.</p>
        <hr/>
        ${userEmailHtml}
      </div>
    `;
    const adminUserCopy = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `[Copia para admin] Confirmación de registro para: ${email} - AMPASA CALIDAD`,
      html: previewHtml,
    });

    return NextResponse.json({ 
      success: true, 
      admin: adminResult,
      user: userResult,
      note: 'User confirmation sent to admin for testing. Verify domain in Resend for production.'
    });

  } catch (error: any) {
    console.error('Error sending registration emails:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
