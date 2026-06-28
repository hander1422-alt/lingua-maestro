-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LinguaMaestro — Base de datos (Etapa 1)                           ║
-- ║                                                                    ║
-- ║  CÓMO USAR:                                                        ║
-- ║  1. Supabase → menú izquierdo → "SQL Editor" → "New query"        ║
-- ║  2. Pega TODO este archivo y dale a "Run"                          ║
-- ║  3. Debe decir "Success".                                          ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────
-- TABLA 1: profiles  (un registro por usuario: su rol y datos básicos)
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'student',   -- 'admin' o 'student'
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────
-- TABLA 2: student_state  (progreso + conversación de cada estudiante)
-- ─────────────────────────────────────────────────────────────────
create table if not exists public.student_state (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────
-- Función auxiliar: ¿el usuario actual es admin?
-- (SECURITY DEFINER evita problemas de recursión en las políticas)
-- ─────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────
-- Trigger: cuando alguien se registra, crear su perfil automáticamente
-- ─────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', ''), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────
-- Seguridad a nivel de fila (RLS)
-- ─────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.student_state enable row level security;

-- profiles: cada quien ve/edita su perfil; el admin ve todos
drop policy if exists "p_select" on public.profiles;
create policy "p_select" on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "p_update" on public.profiles;
create policy "p_update" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

drop policy if exists "p_insert" on public.profiles;
create policy "p_insert" on public.profiles for insert
  with check (auth.uid() = id);

-- student_state: cada estudiante ve/edita SOLO lo suyo; el admin ve todo
drop policy if exists "s_select" on public.student_state;
create policy "s_select" on public.student_state for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "s_insert" on public.student_state;
create policy "s_insert" on public.student_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "s_update" on public.student_state;
create policy "s_update" on public.student_state for update
  using (auth.uid() = user_id);

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  DESPUÉS de crear TU cuenta en la app, vuelve aquí y ejecuta esto  ║
-- ║  (cambia el correo por el tuyo) para convertirte en ADMIN:        ║
-- ║                                                                    ║
-- ║    update public.profiles set role = 'admin'                       ║
-- ║    where email = 'TU_CORREO_AQUI@ejemplo.com';                     ║
-- ╚══════════════════════════════════════════════════════════════════╝
