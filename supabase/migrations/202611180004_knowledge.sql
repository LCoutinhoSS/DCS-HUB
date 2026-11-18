-- DCS HUB v0.5: biblioteca de referências M365 e wiki de procedimentos.
-- APLICAR APENAS NO SUPABASE NOVO DO DCS HUB, APÓS migrações 001, 002 e 003.
-- Não cria bucket, não copia arquivos externos e não altera Autoridades SP.
begin;

alter table public.documents
  add column if not exists description text not null default '',
  add column if not exists tags text[] not null default '{}'::text[];

alter table public.documents
  add constraint documents_description_limit check (length(description) <= 600);

create index if not exists idx_documents_provider on public.documents(provider);
create index if not exists idx_documents_kind on public.documents(kind);

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(btrim(title)) between 3 and 160),
  summary text not null default '' check(length(summary) <= 350),
  body text not null check(length(btrim(body)) between 10 and 30000),
  category text not null default 'geral'
    check(category in ('geral','cerimonial','exposicoes','visitas','comunicacao')),
  status text not null default 'draft' check(status in ('draft','published')),
  tags text[] not null default '{}'::text[],
  event_id uuid references public.events(id) on delete set null,
  author_id uuid not null default auth.uid() references public.profiles(id),
  version integer not null default 1 check(version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_articles_category_status_idx on public.knowledge_articles(category,status);
create index knowledge_articles_event_idx on public.knowledge_articles(event_id);
create index knowledge_articles_recent_idx on public.knowledge_articles(updated_at desc);

create table public.knowledge_article_revisions (
  id bigint generated always as identity primary key,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  version integer not null,
  title text not null,
  summary text not null,
  body text not null,
  category text not null,
  status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(article_id,version)
);
create index knowledge_revisions_recent_idx on public.knowledge_article_revisions(article_id,version desc);

create function public.knowledge_guard_article()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'UPDATE' then
    if new.author_id is distinct from old.author_id then
      raise exception 'Autoria do artigo é imutável';
    end if;
    if new.created_at is distinct from old.created_at then
      raise exception 'Data de criação é imutável';
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
  else
    new.version := 1;
  end if;
  return new;
end;
$$;
create trigger knowledge_article_guard
before insert or update on public.knowledge_articles
for each row execute function public.knowledge_guard_article();

create function public.knowledge_log_version()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.knowledge_article_revisions
    (article_id,version,title,summary,body,category,status,actor_id)
  values (new.id,new.version,new.title,new.summary,new.body,new.category,new.status,auth.uid());
  return new;
end;
$$;
create trigger knowledge_article_version
after insert or update on public.knowledge_articles
for each row execute function public.knowledge_log_version();

alter table public.knowledge_articles enable row level security;
alter table public.knowledge_article_revisions enable row level security;

create policy knowledge_articles_read on public.knowledge_articles
for select to authenticated
using (
  (select public.is_member())
  and (status='published' or author_id=(select auth.uid()) or (select public.is_manager()))
);
create policy knowledge_articles_insert on public.knowledge_articles
for insert to authenticated
with check ((select public.is_editor()) and author_id=(select auth.uid()));
create policy knowledge_articles_update on public.knowledge_articles
for update to authenticated
using ((select public.is_manager()) or ((select public.is_editor()) and author_id=(select auth.uid())))
with check ((select public.is_manager()) or ((select public.is_editor()) and author_id=(select auth.uid())));
create policy knowledge_articles_delete on public.knowledge_articles
for delete to authenticated
using ((select public.is_manager()) or ((select public.is_editor()) and author_id=(select auth.uid())));

create policy knowledge_article_revisions_read on public.knowledge_article_revisions
for select to authenticated
using (
  (select public.is_member())
  and exists(
    select 1 from public.knowledge_articles a
    where a.id=article_id
  )
);

revoke all on public.knowledge_articles,public.knowledge_article_revisions from public,anon,authenticated;
grant select,insert,update,delete on public.knowledge_articles to authenticated;
grant select on public.knowledge_article_revisions to authenticated;

revoke all on function public.knowledge_guard_article(),public.knowledge_log_version() from public,anon,authenticated;

commit;
