-- DCS HUB 0.7: espaços ALESP, equipes, notificações internas e imagens editoriais.
-- NÃO EXECUTAR no projeto de produção Autoridades SP.
-- Este arquivo prepara uma instância ISOLADA do DCS HUB, após as migrações 001–004.
begin;

create table public.venues (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 3 and 160),
 kind text not null check(kind in ('Plenário','Auditório','Salão','Espaço cultural','Sala de reunião','Área externa','Outro')),
 authority text not null default 'A confirmar com o setor responsável'
   check(authority in ('DCS','Secretaria Geral Parlamentar','Presidência','A confirmar com o setor responsável')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index venues_name_unique on public.venues(lower(btrim(name)));
create trigger venue_timestamp before update on public.venues
for each row execute function public.set_updated_at();

-- Fonte: https://www.al.sp.gov.br/institucional/assembleia/plenarios-auditorios/
-- Competência: Ato da Mesa 24/2023; espaços culturais citados em notícia institucional de 03/07/2026.
-- "Salão Nobre Campos Machado" e espaços culturais podem exigir confirmação operacional da unidade.
insert into public.venues(name,kind,authority) values
('Plenário Juscelino Kubitschek','Plenário','Secretaria Geral Parlamentar'),
('Plenário José Bonifácio','Plenário','Secretaria Geral Parlamentar'),
('Plenário Tiradentes','Plenário','Secretaria Geral Parlamentar'),
('Plenário Dom Pedro I','Plenário','Secretaria Geral Parlamentar'),
('Auditório Teotônio Vilela','Auditório','Secretaria Geral Parlamentar'),
('Auditório Franco Montoro','Auditório','Secretaria Geral Parlamentar'),
('Auditório Paulo Kobayashi','Auditório','Secretaria Geral Parlamentar'),
('Salão Waldemar Lopes Ferraz (Salão dos Espelhos)','Salão','Presidência'),
('Salão Nobre Campos Machado','Salão','A confirmar com o setor responsável'),
('Hall Nobre 23 de Maio (Hall Monumental)','Espaço cultural','DCS'),
('Café São Paulo','Espaço cultural','DCS'),
('Espaço Heróis de 32','Espaço cultural','A confirmar com o setor responsável'),
('Espaço Cultural V Centenário','Espaço cultural','A confirmar com o setor responsável'),
('Sala de Reunião T42 (Anexo, térreo)','Sala de reunião','DCS'),
('Sala de Reunião T43 (Anexo, térreo)','Sala de reunião','DCS'),
('Sala de Reunião 159 (Anexo, 1º andar)','Sala de reunião','DCS'),
('Sala de Reunião 160 (Anexo, 1º andar)','Sala de reunião','DCS'),
('Sala de Reunião 248 (Anexo, 2º andar)','Sala de reunião','DCS'),
('Sala de Reunião 249 (Anexo, 2º andar)','Sala de reunião','DCS'),
('Estacionamento dos Funcionários (área interna)','Área externa','DCS')
on conflict do nothing;

alter table public.events add column venue_id uuid references public.venues(id) on delete restrict;
create index events_venue_id_idx on public.events(venue_id);

create function public.validate_event_venue()
returns trigger language plpgsql set search_path='' as $$
declare v public.venues%rowtype;
begin
 if new.venue_id is null then
   if tg_op='INSERT' then raise exception 'Selecione um espaço cadastrado da ALESP'; end if;
   return new; -- Eventos legados sem vínculo permanecem consultáveis.
 end if;
 select * into v from public.venues where id=new.venue_id;
 if not found then raise exception 'Espaço não encontrado'; end if;
 if (tg_op='INSERT' or new.venue_id is distinct from old.venue_id) and not v.active then
   raise exception 'Espaço desativado: selecione outro';
 end if;
 new.location:=v.name; -- Sempre mantém nome canônico, mesmo que o cliente envie texto diferente.
 return new;
end;
$$;
create trigger enforce_venue before insert or update on public.events
for each row execute function public.validate_event_venue();

-- Se o administrador corrigir o nome oficial, atualizar os vínculos existentes.
create function public.sync_venue_event_names()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.name is distinct from old.name then
  update public.events set location=new.name where venue_id=new.id;
 end if;
 return new;
end;
$$;
create trigger sync_venue_name after update of name on public.venues
for each row execute function public.sync_venue_event_names();

alter table public.tasks add column team text
 check (team in ('DCS','Cerimonial'));
update public.tasks t set team=coalesce(
 (select p.department from public.profiles p where p.id=t.assignee_id),
 (select p.department from public.profiles p where p.id=t.created_by),
 'DCS'
);
create index tasks_team_idx on public.tasks(team,status);

create function public.validate_task_team()
returns trigger language plpgsql set search_path='' as $$
declare v_dept text; v_active boolean; v_role text;
begin
 if new.team is null then
   select p.department into new.team from public.profiles p where p.id=new.assignee_id;
   new.team:=coalesce(new.team,'DCS');
 end if;
 if new.assignee_id is not null then
   select p.department,p.active,p.role into v_dept,v_active,v_role
   from public.profiles p where p.id=new.assignee_id;
   if not found or not v_active or v_role='reader' then
     raise exception 'Responsável inativo ou sem permissão';
   end if;
   if new.team is distinct from v_dept then
     raise exception 'O responsável deve pertencer à equipe da tarefa';
   end if;
 end if;
 return new;
end;
$$;
create trigger enforce_task_team before insert or update on public.tasks
for each row execute function public.validate_task_team();

-- Alterar equipe de servidor atualiza o agrupamento de suas tarefas em aberto.
-- Desativar uma conta não apaga tarefas; elas voltam à fila da equipe, sem responsável.
create function public.sync_profile_task_assignments()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.active=false or new.role='reader' then
  update public.tasks set assignee_id=null
  where assignee_id=new.id and status not in ('completed','canceled');
 elsif new.department is distinct from old.department then
  update public.tasks set team=new.department
  where assignee_id=new.id;
 end if;
 return new;
end;
$$;
create trigger sync_profile_assignment
after update of department,active,role on public.profiles
for each row execute function public.sync_profile_task_assignments();

create table public.task_notifications (
 id uuid primary key default gen_random_uuid(),
 task_id uuid not null references public.tasks(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 assigned_by uuid references public.profiles(id) on delete set null,
 kind text not null check(kind in ('assigned','reassigned')),
 title text not null check (length(title) between 1 and 240),
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index task_notifications_recipient_idx on public.task_notifications(recipient_id,created_at desc);

create function public.notify_task_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.assignee_id is not null and (tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id) then
  insert into public.task_notifications(task_id,recipient_id,assigned_by,kind,title)
  values(new.id,new.assignee_id,auth.uid(),
    case when tg_op='INSERT' then 'assigned' else 'reassigned' end,
    left('Tarefa atribuída: '||new.title,240));
 end if;
 return new;
end;
$$;
create trigger notify_task_assignee after insert or update of assignee_id on public.tasks
for each row execute function public.notify_task_assignment();

alter table public.venues enable row level security;
create policy venue_read on public.venues for select to authenticated using ((select public.is_member()));
create policy venue_insert on public.venues for insert to authenticated
with check ((select public.is_admin()));
create policy venue_update on public.venues for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
-- Exclusão física propositalmente negada: desativar preserva histórico.

alter table public.task_notifications enable row level security;
create policy task_notifications_read on public.task_notifications for select to authenticated
using ((select public.is_member()) and recipient_id=(select auth.uid()));
create policy task_notifications_mark_read on public.task_notifications for update to authenticated
using ((select public.is_member()) and recipient_id=(select auth.uid()))
with check ((select public.is_member()) and recipient_id=(select auth.uid()));
-- Trigger cria as mensagens; ninguém pode criar notificações manualmente pela API.

revoke all on public.venues,public.task_notifications from public,anon,authenticated;
grant select,insert on public.venues to authenticated;
grant update(name,kind,authority,active) on public.venues to authenticated;
grant select,update(read_at) on public.task_notifications to authenticated;
revoke all on function public.notify_task_assignment(),public.validate_event_venue(),public.validate_task_team(),public.sync_venue_event_names(),public.sync_profile_task_assignments()
 from public,anon,authenticated;

alter table public.knowledge_articles add column media jsonb not null default '[]'::jsonb;
alter table public.knowledge_articles add constraint knowledge_media_limit
 check (jsonb_typeof(media)='array' and jsonb_array_length(media)<=6);
alter table public.knowledge_article_revisions add column media jsonb not null default '[]'::jsonb;
create or replace function public.knowledge_log_version()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.knowledge_article_revisions
  (article_id,version,title,summary,body,category,status,actor_id,media)
 values(new.id,new.version,new.title,new.summary,new.body,new.category,new.status,auth.uid(),new.media);
 return new;
end;
$$;
revoke all on function public.knowledge_log_version() from public,anon,authenticated;

-- Imagens editoriais para a operação autenticada. Os arquivos são privados.
-- Nome do objeto no padrão "<auth.uid()>/<article_id>/<uuid>.webp".
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values('dcs-editorial','dcs-editorial',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy dcs_editorial_read on storage.objects for select to authenticated
 using (
  bucket_id='dcs-editorial' and (select public.is_member())
  and exists (
    select 1 from public.knowledge_articles a
    where a.id::text=(storage.foldername(name))[2]
      and (a.status='published' or a.author_id=(select auth.uid()) or (select public.is_manager()))
  )
 );
create policy dcs_editorial_insert on storage.objects for insert to authenticated
 with check (
  bucket_id='dcs-editorial' and (select public.is_editor())
  and (storage.foldername(name))[1]=(select auth.uid())::text
 );
-- Imagens anexadas não são sobrescritas nem excluídas pelo cliente; uma limpeza
-- operacional futura deve tratar órfãos por processo administrativo.

commit;