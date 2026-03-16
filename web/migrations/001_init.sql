create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  name text not null,
  district text not null,
  address text not null,
  lng double precision,
  lat double precision,
  triggered_at date,
  triggered_at_precision text not null default 'day',
  photo_url text,
  source_title text,
  source_url text,
  source_published_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists projects_year_name_addr_uq
  on projects (year, name, address);

create table if not exists project_prices (
  project_id uuid primary key references projects(id) on delete cascade,
  price_cny_per_sqm integer,
  price_total_cny bigint,
  price_source_title text,
  price_source_url text,
  price_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists dataset_meta (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

