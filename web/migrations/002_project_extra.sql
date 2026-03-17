alter table projects add column if not exists seq integer;
alter table projects add column if not exists developer text;
alter table projects add column if not exists unit_type text;
alter table projects add column if not exists unit_count integer;
alter table projects add column if not exists avg_price_cny_per_sqm integer;
alter table projects add column if not exists heat_score double precision;
alter table projects add column if not exists heat_label text;
alter table projects add column if not exists unlock_window text;
