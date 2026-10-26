# Tienda Rojas 8284

Tienda online con panel de administración.

**Para tus clientes**
- Catálogo con fotos, precios, categorías, buscador y stock.
- Carrito y compra con **Mercado Pago** (tarjeta, dinero en cuenta, cuotas). El pago se confirma solo.
- **Reserva** para pagar en efectivo al retirar o por transferencia (muestra alias/CBU).
- **Registro de clientes** en `/registro`, con link y QR para compartir.
- Botón de WhatsApp para consultas y para avisar de cada pedido.

**Para vos (`/admin`)**
- Inicio: lo que tenés por cobrar, para entregar, lo cobrado en el mes y los cumpleaños del mes.
- Pedidos: los de la web aparecen solos. Cambiás el estado (reservado, pagado, entregado, cancelado) y podés cargar ventas a mano.
- Productos: alta y edición con fotos, publicar u ocultar, stock y orden.
- Clientes: lista con compras y total gastado, alta manual, link + QR de registro y exportación a Excel.
- Ajustes: nombre, WhatsApp, alias, CBU, dirección de retiro y horario.

El stock se descuenta cuando se confirma una reserva o se aprueba un pago, y se repone si cancelás el pedido.

---

## Cómo ponerla online (una sola vez, ~1 hora)

Vas a crear tres cuentas: **Supabase** (base de datos y fotos), **GitHub** (donde se guarda el código) y **Vercel** (donde funciona la web). Hacelo desde una computadora.

### 1. Base de datos en Supabase

1. Entrá a [supabase.com](https://supabase.com), creá una cuenta y tocá **New project**. Región: **South America (São Paulo)**. Anotá la contraseña que te pida.
2. Abrí **SQL Editor** → **New query**, pegá todo el contenido del archivo `supabase/schema.sql` y tocá **Run**. Tiene que decir *Success*.
3. **Authentication → Users → Add user → Create new user**: poné tu email y una contraseña, y marcá *Auto Confirm User*. Con esto vas a entrar al panel.
4. **Authentication → Sign In / Providers**: desactivá **Allow new users to sign up**, así nadie más puede crearse un usuario.
5. **Project Settings → API Keys** (o **API**): copiá estos tres datos y guardalos.
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key**
   - **service_role / secret key** (esta es secreta: no la compartas con nadie).

### 2. Mercado Pago

1. Entrá a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) con tu cuenta de Mercado Pago → **Tus integraciones → Crear aplicación**.
   - Tipo: *Pagos online* · Producto: *Checkout Pro*.
2. Dentro de la aplicación: **Credenciales de producción** → copiá el **Access Token** (empieza con `APP_USR-`).
3. Las notificaciones de pago se configuran en el paso 5, cuando ya tengas la dirección de la tienda.

> Para probar sin cobrar de verdad podés usar primero las **credenciales de prueba** y las tarjetas de prueba que muestra Mercado Pago.

### 3. Subir el código a GitHub

1. Creá una cuenta en [github.com](https://github.com) → **New repository** → nombre `tienda-rojas` → **Private** → *Create*.
2. En la página del repositorio tocá **uploading an existing file**. Arrastrá **todo el contenido** de la carpeta descomprimida (no la carpeta en sí) y tocá **Commit changes**.

### 4. Publicar en Vercel

1. Entrá a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New → Project** → elegí `tienda-rojas` → **Import**.
2. Abrí **Environment Variables** y cargá estas variables (ver `.env.example`):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago |
| `ADMIN_EMAILS` | el email que creaste en Supabase (si son varios, separalos con coma) |
| `NEXT_PUBLIC_SITE_URL` | por ahora `https://tienda-rojas.vercel.app` |

3. Tocá **Deploy**. Cuando termine, Vercel te muestra la dirección real (por ejemplo `https://tienda-rojas-abc.vercel.app`).
4. Si la dirección es distinta a la que pusiste: **Settings → Environment Variables**, corregí `NEXT_PUBLIC_SITE_URL` y después **Deployments → ⋯ → Redeploy**.

### 5. Activar las notificaciones de pago

1. En Mercado Pago → tu aplicación → **Webhooks → Configurar notificaciones** (modo productivo).
2. URL: `https://TU-DIRECCION/api/mp/webhook` · Evento: **Pagos** → Guardar.
3. Copiá la **clave secreta** que aparece. En Vercel, agregá la variable `MP_WEBHOOK_SECRET` con ese valor y hacé **Redeploy**.

### 6. Primeros pasos

1. Entrá a `https://TU-DIRECCION/admin` con tu email y contraseña.
2. **Ajustes**: cargá WhatsApp, alias, CBU, titular, dirección y horario.
3. **Productos**: cargá tus productos con fotos.
4. **Clientes**: descargá el QR o copiá el link de registro y compartilo.
5. Hacé una compra de prueba de punta a punta.

---

## Costos y límites

- **Supabase (plan gratis)**: 500 MB de base de datos y 1 GB de fotos, que alcanza para miles de clientes y pedidos. Si el proyecto pasa una semana sin ninguna visita, se pausa y se reactiva con un clic desde el panel de Supabase.
- **Vercel**: el plan gratuito (Hobby) es para uso personal y no comercial. Para una tienda corresponde el plan **Pro** (USD 20/mes). Otra opción es publicarla en **Netlify**, que también funciona con este proyecto.
- **Mercado Pago**: cobra su comisión habitual por cada venta.
- **Dominio propio** (opcional, por ejemplo `tiendarojas.com.ar`): se compra en NIC Argentina y se conecta en Vercel → Settings → Domains. Después actualizá `NEXT_PUBLIC_SITE_URL` y la URL del webhook.

## Para quien la mantenga (técnico)

- Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage) + Mercado Pago Checkout Pro (SDK `mercadopago`).
- `npm install` y `npm run dev` con un `.env.local` basado en `.env.example`.
- La seguridad está en el servidor. Todas las tablas tienen RLS activado y no tienen políticas públicas: el navegador nunca accede directo a la base. Las rutas públicas (`/api/pedidos`, `/api/registro`) validan los datos y toman precios y stock de la base, nunca del navegador. El panel y sus acciones verifican la sesión de Supabase y que el email esté en `ADMIN_EMAILS`.
- El pago se confirma consultando la API de Mercado Pago, tanto en el webhook como al volver del checkout. No se confía en los parámetros de la URL.
