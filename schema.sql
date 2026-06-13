-- ============================================================
--  Yaadi – Supabase schema
--  Run this once on a fresh project.
-- ============================================================

-- Lists
create table if not exists public.lists (
  id          text primary key,
  title       text not null,
  description text not null default '',
  icon        text not null default '📝',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Sections
create table if not exists public.sections (
  id       text primary key,
  list_id  text not null references public.lists(id) on delete cascade,
  title    text not null,
  position integer not null default 0
);

-- Items
create table if not exists public.items (
  id           text primary key,
  section_id   text not null references public.sections(id) on delete cascade,
  text         text not null,
  checked      boolean not null default false,
  do_not_carry boolean not null default false,
  position     integer not null default 0
);

-- Stores (global definitions)
create table if not exists public.stores (
  id         text primary key,
  name       text not null,
  color      text not null default '#f59e0b',
  created_at timestamptz not null default now()
);

-- Item ↔ Store (many-to-many)
create table if not exists public.item_stores (
  item_id  text not null references public.items(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  primary key (item_id, store_id)
);

-- List ↔ Store (many-to-many)
create table if not exists public.list_stores (
  list_id  text not null references public.lists(id) on delete cascade,
  store_id text not null references public.stores(id) on delete cascade,
  primary key (list_id, store_id)
);

-- Section tags

create table if not exists public.section_stores (
  section_id text not null references public.sections(id) on delete cascade,
  store_id   text not null references public.stores(id) on delete cascade,
  primary key (section_id, store_id)
);


-- ── Indexes ──────────────────────────────────────────────────
create index if not exists sections_list_id_idx  on public.sections(list_id);
create index if not exists items_section_id_idx  on public.items(section_id);
create index if not exists item_stores_item_idx  on public.item_stores(item_id);
create index if not exists item_stores_store_idx on public.item_stores(store_id);
create index if not exists list_stores_list_idx  on public.list_stores(list_id);
create index if not exists list_stores_store_idx on public.list_stores(store_id);
create index if not exists section_stores_section_idx on public.section_stores(section_id);
create index if not exists section_stores_store_idx   on public.section_stores(store_id);

-- ── Auto-update updated_at on lists ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists lists_updated_at on public.lists;
create trigger lists_updated_at
  before update on public.lists
  for each row execute procedure public.set_updated_at();

-- ── Enable Realtime ──────────────────────────────────────────
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.sections;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.stores;
alter publication supabase_realtime add table public.item_stores;
alter publication supabase_realtime add table public.list_stores;
alter publication supabase_realtime add table public.section_stores;
