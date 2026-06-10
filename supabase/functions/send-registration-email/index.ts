import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "tu-email@ejemplo.com"

// You can change this "from" address later once you verify a domain in Resend
const FROM_EMAIL = "AMPASA CALIDAD <onboarding@resend.dev>"

serve(async (req) => {
  try {
    const payload = await req.json()
    const { email, full_name } = payload

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), { status: 400 })
    }

    const registrationDate = new Date().toLocaleString('es-MX')

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
        
        <a href="http://localhost:3000/admin/users" 
           style="display: inline-block; background: #c2410f; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; font-weight: 500;">
          Revisar y aprobar usuarios →
        </a>
        
        <p style="margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 16px;">
          Este es un correo automático del sistema AMPASA CALIDAD.
        </p>
      </div>
    `

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
    `

    // Send email to ADMIN
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: "Nuevo usuario registrado - AMPASA CALIDAD",
        html: adminEmailHtml,
      }),
    })

    // Send welcome/pending email to the NEW USER
    const userRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: "Tu solicitud de acceso a AMPASA CALIDAD ha sido recibida",
        html: userEmailHtml,
      }),
    })

    const adminData = await adminRes.json()
    const userData = await userRes.json()

    return new Response(JSON.stringify({ 
      success: true, 
      adminEmail: adminData,
      userEmail: userData 
    }), { status: 200 })

  } catch (error) {
    console.error("Error sending registration emails:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
