-- =========================================================
-- Tienda Rojas 8284 · esquema de base de datos (Supabase)
-- Pegá todo este archivo en Supabase -> SQL Editor -> Run
-- =========================================================

create extension if not exists pgcrypto;

-- Configuración de la tienda (una sola fila)
create table if not exists config (
  id int primary key default 1 check (id = 1),
  nombre text not null default 'Tienda Rojas 8284',
  slogan text default 'Elegí, pagá con Mercado Pago o reservá y pagá en efectivo o transferencia.',
  whatsapp text default '',
  alias text default '',
  cbu text default '',
  titular text default '',
  retiro text default '',
  horario text default '',
  actualizado timestamptz default now()
);
insert into config (id) values (1) on conflict (id) do nothing;

-- Productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text not null default '',
  categoria text not null default '',
  precio numeric(12,2) not null default 0 check (precio >= 0),
  imagenes text[] not null default '{}',
  publicado boolean not null default false,
  stock int check (stock is null or stock >= 0),   -- null = sin control de stock
  orden int not null default 0,
  creado timestamptz not null default now()
);

-- Clientes
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null default '',
  telefono_norm text unique,                         -- solo dígitos, formato 549...
  email text not null default '',
  direccion text not null default '',
  cumple text not null default '',                   -- formato MM-DD
  como_nos_conocio text not null default '',
  acepta_novedades boolean not null default false,
  notas text not null default '',
  origen text not null default 'manual' check (origen in ('registro','compra','manual')),
  creado timestamptz not null default now()
);

-- Pedidos
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nombre text not null default '',
  cliente_telefono text not null default '',
  items jsonb not null default '[]',                 -- [{producto_id, nombre, precio, cantidad}]
  total numeric(12,2) not null default 0,
  metodo text not null check (metodo in ('mercadopago','efectivo','transferencia')),
  estado text not null default 'reservado'
    check (estado in ('pendiente_pago','reservado','pagado','entregado','cancelado')),
  nota text not null default '',
  origen text not null default 'web' check (origen in ('web','manual')),
  mp_preference_id text,
  mp_init_point text,
  mp_payment_id text,
  stock_descontado boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists pedidos_creado_idx on pedidos (creado desc);
create index if not exists pedidos_cliente_idx on pedidos (cliente_id);

-- Ajuste de stock atómico (null = sin control, nunca baja de 0)
create or replace function ajustar_stock(p_id uuid, delta int)
returns void language sql as $$
  update productos set stock = greatest(0, stock + delta)
  where id = p_id and stock is not null;
$$;

-- Seguridad: nadie entra directo desde el navegador.
-- Todo pasa por el servidor de la app con la clave secreta (service role).
alter table config   enable row level security;
alter table productos enable row level security;
alter table clientes enable row level security;
alter table pedidos  enable row level security;
revoke execute on function ajustar_stock(uuid, int) from public, anon, authenticated;
grant execute on function ajustar_stock(uuid, int) to service_role;

-- Fotos de productos (lectura pública)
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;
