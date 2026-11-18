-- Modelos institucionais operacionais (não são eventos nem dados reais).
insert into public.event_templates(category,name) values
  ('cer','Cerimonial'),('exp','Exposições'),('vis','Visitas guiadas'),('cv','Comunicação visual'),('reu','Reuniões')
on conflict (category) do nothing;

with seed(category,position,label) as (values
 ('cer',1,'Conferir informações do evento'),('cer',2,'Preparar roteiro'),('cer',3,'Elaborar nominata'),
 ('cer',4,'Confirmar autoridades'),('cer',5,'Organizar receptivo'),('cer',6,'Arquivar documentos'),
 ('exp',1,'Analisar solicitação'),('exp',2,'Verificar disponibilidade'),('exp',3,'Registrar autorização'),
 ('exp',4,'Organizar montagem'),('exp',5,'Coordenar desmontagem'),
 ('vis',1,'Verificar disponibilidade'),('vis',2,'Confirmar número de visitantes'),
 ('vis',3,'Designar responsável'),('vis',4,'Realizar visita'),('vis',5,'Registrar conclusão'),
 ('cv',1,'Elaborar briefing'),('cv',2,'Produzir material'),('cv',3,'Enviar para revisão'),
 ('cv',4,'Aprovar'),('cv',5,'Entregar'),
 ('reu',1,'Elaborar pauta'),('reu',2,'Registrar ata')
)
insert into public.template_items(template_id,position,label)
select t.id,s.position,s.label from seed s join public.event_templates t on t.category=s.category
on conflict (template_id,position) do nothing;
