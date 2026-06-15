-- Nazareno Bets IA Web 3.2 - Supabase schema

create table if not exists nb_users (
  id text primary key,
  name text not null,
  email text unique not null,
  password_hash text,
  role text default 'user',
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists nb_bankrolls (
  user_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists nb_tickets (
  id text primary key,
  user_id text not null,
  title text,
  mode text,
  profile text,
  status text default 'Em andamento',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_nb_tickets_user_id on nb_tickets(user_id);
create index if not exists idx_nb_tickets_status on nb_tickets(status);

-- Usuário inicial opcional
insert into nb_users (id, name, email, password_hash, role, status)
values ('admin', 'Administrador', 'admin', 'admin123', 'admin', 'active')
on conflict (id) do nothing;