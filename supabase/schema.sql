-- Schema do FitLife no Supabase (rodar no SQL Editor do projeto).
-- Uma única tabela espelha todos os registros locais, protegida por RLS:
-- cada usuário só enxerga e altera as próprias linhas.

create table if not exists public.sync_registros (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tabela     text not null,
  uuid       uuid not null,
  data       jsonb,
  updated_at timestamptz not null default now(),
  deleted    boolean not null default false,
  primary key (user_id, tabela, uuid)
);

create index if not exists sync_registros_updated_idx
  on public.sync_registros (user_id, updated_at);

alter table public.sync_registros enable row level security;

drop policy if exists "usuario le os proprios registros" on public.sync_registros;
create policy "usuario le os proprios registros"
  on public.sync_registros for select
  using (auth.uid() = user_id);

drop policy if exists "usuario escreve os proprios registros" on public.sync_registros;
create policy "usuario escreve os proprios registros"
  on public.sync_registros for insert
  with check (auth.uid() = user_id);

drop policy if exists "usuario atualiza os proprios registros" on public.sync_registros;
create policy "usuario atualiza os proprios registros"
  on public.sync_registros for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usuario apaga os proprios registros" on public.sync_registros;
create policy "usuario apaga os proprios registros"
  on public.sync_registros for delete
  using (auth.uid() = user_id);
