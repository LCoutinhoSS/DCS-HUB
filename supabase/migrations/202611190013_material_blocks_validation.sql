-- DCS HUB 0.13 — validação server-side de todos os blocos do documento.
-- Complementa a migração 012 já aplicada, sem alterar os sistemas originais.
begin;
create function public.dcs_valid_material_blocks(p_blocks jsonb)
returns boolean language plpgsql immutable set search_path='' as $dcs$
declare b jsonb;
begin
 if p_blocks is null or jsonb_typeof(p_blocks) is distinct from 'array'
 then return false; end if;
 if jsonb_array_length(p_blocks) not between 2 and 140
   or pg_column_size(p_blocks)>90000 then return false; end if;
 for b in select value from jsonb_array_elements(p_blocks) loop
  if jsonb_typeof(b) is distinct from 'object'
   or (b->>'kind') not in ('title','subtitle','heading','text','bullet','time','meta','note')
   or (b->>'kind') is null
   or jsonb_typeof(b->'text') is distinct from 'string'
   or length(btrim(b->>'text')) not between 1 and 2000
  then return false;end if;
 end loop;
 return true;
end;
$dcs$;
alter table public.event_materials
 add constraint event_materials_blocks_valid check(public.dcs_valid_material_blocks(blocks));
revoke all on function public.dcs_valid_material_blocks(jsonb) from public,anon,authenticated;
commit;