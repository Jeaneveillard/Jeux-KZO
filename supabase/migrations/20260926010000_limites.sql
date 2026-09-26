-- Limites : essais de codes inconnus (contre la recherche de codes au hasard) et plafond de parties sans course.

create table public.essais_code (
  joueur uuid not null references auth.users (id) on delete cascade,
  le timestamptz not null default now()
);

create index essais_code_joueur_le_idx on public.essais_code (joueur, le);

-- Table interne : aucune règle d'accès, donc invisible pour l'app.
alter table public.essais_code enable row level security;
revoke all on public.essais_code from anon, authenticated;

-- Un code inconnu ne lève plus d'erreur (elle annulerait l'essai compté) : la fonction ne renvoie alors aucune ligne.
drop function public.rejoindre_partie(text, text);

create function public.rejoindre_partie(p_code text, p_pseudo text) returns setof public.parties
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  nom text;
  partie public.parties;
begin
  if moi is null then
    raise exception 'non_connecte';
  end if;
  if (select count(*) from public.essais_code where joueur = moi and le > now() - interval '10 minutes') >= 20 then
    raise exception 'trop_d_essais';
  end if;
  select * into partie from public.parties where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    insert into public.essais_code (joueur) values (moi);
    return;
  end if;
  if moi = partie.blancs or moi = partie.noirs then
    return next partie;
    return;
  end if;
  if partie.statut <> 'attente' then
    raise exception 'partie_complete';
  end if;
  nom := public.pseudo_propre(p_pseudo);
  if partie.blancs is null then
    update public.parties set blancs = moi, pseudo_blancs = nom, statut = 'en_cours' where id = partie.id returning * into partie;
  else
    update public.parties set noirs = moi, pseudo_noirs = nom, statut = 'en_cours' where id = partie.id returning * into partie;
  end if;
  return next partie;
end $$;

revoke all on function public.rejoindre_partie(text, text) from public, anon;
grant execute on function public.rejoindre_partie(text, text) to authenticated;

-- Plafond de 20 parties non terminées : un verrou par joueur empêche deux créations simultanées de le dépasser.
create or replace function public.creer_partie(p_jeu text, p_couleur text, p_pseudo text) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  nom text;
  partie public.parties;
begin
  if moi is null then
    raise exception 'non_connecte';
  end if;
  if coalesce(p_jeu, '') not in ('chess', 'draughts') or coalesce(p_couleur, '') not in ('white', 'black') then
    raise exception 'entree_invalide';
  end if;
  nom := public.pseudo_propre(p_pseudo);
  perform pg_advisory_xact_lock(hashtext('creer_partie:' || moi::text));
  if (select count(*) from public.parties where moi in (blancs, noirs) and statut <> 'terminee') >= 20 then
    raise exception 'trop_de_parties';
  end if;
  insert into public.parties (code, jeu, depart, blancs, noirs, pseudo_blancs, pseudo_noirs)
  values (
    public.nouveau_code(),
    p_jeu,
    case p_jeu when 'chess' then 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' else 'W:W31-50:B1-20' end,
    case when p_couleur = 'white' then moi end,
    case when p_couleur = 'black' then moi end,
    case when p_couleur = 'white' then nom end,
    case when p_couleur = 'black' then nom end
  )
  returning * into partie;
  return partie;
end $$;

-- Nettoyage des essais de plus d'un jour.
select cron.schedule(
  'nettoyage-essais-code',
  '27 3 * * *',
  $$ delete from public.essais_code where le < now() - interval '1 day' $$
);
