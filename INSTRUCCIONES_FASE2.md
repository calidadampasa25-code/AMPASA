# Instrucciones Completas - Fase 2 + Email + Presencia (Hecho por mí)

## PASO 1: Ejecuta esto en Supabase SQL Editor (Obligatorio)

Copia y pega **todo** este código:

```sql
-- 1. Agregar columna de última actividad
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

-- 2. Activar RLS de forma segura
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Limpiar políticas antiguas
DROP POLICY IF EXISTS "Enable read access for users to their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 4. Políticas limpias y seguras
CREATE POLICY "Users can read their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## PASO 2: Notificaciones por Correo al registrarse (Recomendado)

Hemos cambiado el enfoque a una **Next.js API Route** (más fácil de usar con el SDK oficial de Resend que prefieres).

Se envían dos correos:
- Uno al administrador cuando alguien nuevo se registra.
- Uno al nuevo usuario confirmando que su solicitud está en revisión.

### 2.1 Instala el paquete (ya lo hice por ti)

El paquete `resend` ya está instalado.

### 2.2 Agrega las variables de entorno

Crea o edita el archivo `.env.local` en la raíz del proyecto y agrega:

```env
RESEND_API_KEY=re_tu_clave_real_aqui
ADMIN_EMAIL=calidadampasa25@gmail.com
RESEND_FROM_EMAIL=AMPASA CALIDAD <onboarding@resend.dev>
```

> **Importante**: Reemplaza `re_tu_clave_real_aqui` con tu verdadera API key de Resend.
> 
> RESEND_FROM_EMAIL es opcional; en producción verifica un dominio en Resend y cambia a from@tu-dominio.com .

### 2.3 (Opcional pero recomendado) Prueba localmente

Para probar el endpoint localmente puedes llamar:

```bash
curl -X POST http://localhost:3000/api/send-registration-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Prueba Usuario"}'
```

### 2.4 Conectar con Supabase (Webhook)

1. Despliega tu aplicación (Vercel, etc.) o usa **ngrok** para exponer tu localhost.
2. En Supabase ve a **Database → Webhooks**
3. Crea un nuevo webhook:
   - **Table**: `profiles`
   - **Events**: Solo **INSERT**
   - **Type**: **HTTP Request**
   - **URL**: `https://tu-dominio.com/api/send-registration-email` (o la URL de ngrok)
4. En **Custom Payload** usa:

```json
{
  "email": "{{record.email}}",
  "full_name": "{{record.full_name}}"
}
```

¡Listo! Cada nuevo registro enviará los dos correos automáticamente.

**Nota sobre modo prueba de Resend (importante para que el solicitante reciba el email):**
- Actualmente (con onboarding@resend.dev), el código intenta enviar el correo de confirmación directamente al email del solicitante.
- Si falla (por limitación de prueba de Resend: solo a tu email verificado), envía una copia/preview al ADMIN_EMAIL para que veas qué recibiría el solicitante.
- Para que el solicitante reciba el correo REAL (no preview): 
  1. Ve a resend.com/domains y verifica un dominio que controles (ej. ampasa.me o subdominio -- gratis y rápido, agrega registros DNS).
  2. Una vez verificado, actualiza en .env.local:
     RESEND_FROM_EMAIL=AMPASA CALIDAD <no-reply@tu-dominio-verificado.com>
  3. (Yo reinicio el server por ti si me dices "reinicia el server").
  4. Ahora el envío directo al solicitante funcionará y llegará al buzón del solicitante (incluso en modo "test" de Resend).

El admin siempre recibe su notificación + la copia del correo del usuario.

**Cómo verificar dominio en Resend (para que el solicitante reciba el email directamente):**
1. En Resend dashboard, ve a "Domains" > "Add Domain".
2. Agrega un dominio que controles (ej. ampasa.me o un subdominio como mail.ampasa.me).
3. Sigue las instrucciones para agregar los registros DNS (TXT, etc.) en tu proveedor de dominio.
4. Espera verificación (puede tomar minutos).
5. Una vez verificado, actualiza en .env.local:
   RESEND_FROM_EMAIL=AMPASA CALIDAD <no-reply@tu-dominio-verificado.com>
6. Reinicia el servidor (yo lo hago por ti si me dices).
7. Ahora los correos al solicitante se enviarán desde el dominio verificado y llegarán sin problema (incluso en "test" mode de Resend).

**Nuevo:** El email al admin ahora incluye un link "Aprobar este usuario directamente" que aprueba al instante y redirige a la lista (útil para testing; en prod considera agregar auth o tokens).

## PASO 3: Ver Usuarios en Línea

Ya está implementado.

Solo entra a:

**http://localhost:3000/admin/users**

Ahí verás:
- Quién está en línea ahora (si estuvo activo en los últimos ~3 minutos)
- Última vez que cada usuario estuvo activo
- Rol y estado de aprobación

**Nota**: El sistema de "última vez activo" se actualiza automáticamente mientras la persona esté en el Dashboard o en las páginas de Planta 1 / Planta 2.

---

## PASO 4: Próximos pasos recomendados

Una vez que tengas las notificaciones por correo funcionando, lo más útil que falta es implementar la **subida real de archivos** (actualmente las secciones de "Hojas de Cálculo" y "Formatos" son solo placeholders).

¿Quieres que continúe con eso?
