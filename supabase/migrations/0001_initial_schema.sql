-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists vector;
create extension if not exists pg_trgm;

-- ============================================================
-- Enums (spec had typo: 'enu' → 'enum')
-- ============================================================
create type post_status as enum ('pending', 'fetching', 'processing', 'ready', 'failed');
create type content_type as enum ('image', 'video', 'reel', 'carousel', 'unknown');
create type source_platform as enum ('instagram', 'tiktok', 'pinterest', 'web', 'screenshot', 'other');

-- ============================================================
-- posts
-- ============================================================
create table posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,

  source_platform source_platform not null default 'instagram',
  source_url text not null,
  source_post_id text,

  author_handle text,
  author_display_name text,

  caption text,
  media_urls text[] default '{}',
  thumbnail_url text,
  media_storage_paths text[] default '{}',

  status post_status not null default 'pending',
  error_message text,

  shared_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  last_viewed_at timestamptz,
  view_count int not null default 0,

  unique (user_id, source_url)
);

create index posts_user_id_idx on posts (user_id);
create index posts_status_idx on posts (status) where status != 'ready';
create index posts_shared_at_idx on posts (user_id, shared_at desc);
create index posts_last_viewed_idx on posts (user_id, last_viewed_at nulls first);

-- ============================================================
-- post_metadata
-- ============================================================
create table post_metadata (
  post_id uuid primary key references posts(id) on delete cascade,

  summary text,
  primary_category text check (primary_category in (
    'Food', 'Travel', 'Fashion', 'Home', 'Fitness', 'Beauty',
    'Art', 'Music', 'Tech', 'Education', 'Humor', 'Business',
    'Nature', 'Sports', 'Other'
  )),
  sub_tags text[] default '{}',
  entities jsonb default '{}'::jsonb,

  content_type content_type not null default 'unknown',
  extracted_text text,
  audio_transcript text,

  extraction_model text,
  extraction_version int not null default 1,
  extracted_at timestamptz not null default now(),

  search_tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(summary, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(extracted_text, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(sub_tags, ' ')), 'C')
  ) stored
);

create index post_metadata_category_idx on post_metadata (primary_category);
create index post_metadata_tags_idx on post_metadata using gin (sub_tags);
create index post_metadata_entities_idx on post_metadata using gin (entities);
create index post_metadata_search_idx on post_metadata using gin (search_tsv);

-- ============================================================
-- post_embeddings
-- ============================================================
create table post_embeddings (
  post_id uuid primary key references posts(id) on delete cascade,
  embedding vector(1536) not null,
  embedding_model text not null default 'text-embedding-3-small',
  text_hash text not null,
  created_at timestamptz not null default now()
);

create index post_embeddings_vec_idx on post_embeddings
  using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- collections
-- ============================================================
create table collections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  cover_post_id uuid references posts(id) on delete set null,
  is_smart boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index collections_user_idx on collections (user_id);

create table collection_posts (
  collection_id uuid not null references collections(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by text not null default 'user' check (added_by in ('user', 'auto')),
  primary key (collection_id, post_id)
);

create index collection_posts_post_idx on collection_posts (post_id);

-- ============================================================
-- processing_jobs
-- ============================================================
create table processing_jobs (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  stage text not null check (stage in ('fetch', 'transcribe', 'vision', 'embed')),
  status text not null check (status in ('pending', 'running', 'success', 'failed')),
  attempt int not null default 1,
  error text,
  payload jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index processing_jobs_post_idx on processing_jobs (post_id, created_at desc);
create index processing_jobs_status_idx on processing_jobs (status) where status in ('pending', 'failed');
create index processing_jobs_stage_status_idx on processing_jobs (stage, status);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger posts_updated_at before update on posts
  for each row execute function set_updated_at();
create trigger collections_updated_at before update on collections
  for each row execute function set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table posts enable row level security;
alter table post_metadata enable row level security;
alter table post_embeddings enable row level security;
alter table collections enable row level security;
alter table collection_posts enable row level security;
alter table processing_jobs enable row level security;

create policy posts_owner on posts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy post_metadata_owner on post_metadata
  for all using (
    exists (select 1 from posts p where p.id = post_metadata.post_id and p.user_id = auth.uid())
  );

create policy post_embeddings_owner on post_embeddings
  for all using (
    exists (select 1 from posts p where p.id = post_embeddings.post_id and p.user_id = auth.uid())
  );

create policy collections_owner on collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy collection_posts_owner on collection_posts
  for all using (
    exists (select 1 from collections c where c.id = collection_posts.collection_id and c.user_id = auth.uid())
  );

create policy processing_jobs_owner on processing_jobs
  for select using (
    exists (select 1 from posts p where p.id = processing_jobs.post_id and p.user_id = auth.uid())
  );

-- ============================================================
-- Hybrid search RPC (semantic + full-text, RRF fusion with k=60)
-- ============================================================
create or replace function search_posts(
  p_user_id uuid,
  p_query text,
  p_query_embedding vector(1536),
  p_category text default null,
  p_limit int default 20
)
returns table (
  post_id uuid,
  score float
) language sql stable as $$
  with semantic as (
    select pe.post_id,
           1 - (pe.embedding <=> p_query_embedding) as sim,
           row_number() over (order by pe.embedding <=> p_query_embedding) as rank
    from post_embeddings pe
    join posts p on p.id = pe.post_id
    join post_metadata pm on pm.post_id = p.id
    where p.user_id = p_user_id
      and (p_category is null or pm.primary_category = p_category)
    limit 100
  ),
  fulltext as (
    select pm.post_id,
           ts_rank(pm.search_tsv, websearch_to_tsquery('english', p_query)) as ts_score,
           row_number() over (order by ts_rank(pm.search_tsv, websearch_to_tsquery('english', p_query)) desc) as rank
    from post_metadata pm
    join posts p on p.id = pm.post_id
    where p.user_id = p_user_id
      and (p_category is null or pm.primary_category = p_category)
      and pm.search_tsv @@ websearch_to_tsquery('english', p_query)
    limit 100
  )
  select coalesce(s.post_id, f.post_id) as post_id,
         coalesce(1.0 / (60 + s.rank), 0) + coalesce(1.0 / (60 + f.rank), 0) as score
  from semantic s
  full outer join fulltext f on s.post_id = f.post_id
  order by score desc
  limit p_limit;
$$;
