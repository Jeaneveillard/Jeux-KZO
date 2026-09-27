-- Jeu en ligne entre amis : parties, règles d'accès, fonctions, temps réel, nettoyage.
create extension if not exists pg_cron with schema pg_catalog;

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  jeu text not null check (jeu in ('chess', 'draughts')),
  depart text not null,
  coups text[] not null default '{}',
  blancs uuid references auth.users (id) on delete set null,
  noirs uuid references auth.users (id) on delete set null,
  pseudo_blancs text check (char_length(pseudo_blancs) between 1 and 20),
  pseudo_noirs text check (char_length(pseudo_noirs) between 1 and 20),
  statut text not null default 'attente' check (statut in ('attente', 'en_cours', 'terminee')),
  resultat jsonb,
  nulle_proposee_par text check (nulle_proposee_par in ('white', 'black')),
  revanche_code text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);

create index parties_blancs_idx on public.parties (blancs);
create index parties_noirs_idx on public.parties (noirs);
create index parties_maj_le_idx on public.parties (maj_le);

alter table public.parties enable row level security;

create policy "les joueurs lisent leurs parties"
  on public.parties for select to authenticated
  using ((select auth.uid()) in (blancs, noirs));

-- Aucune écriture directe : tout passe par les fonctions ci-dessous.
revoke insert, update, delete on public.parties from anon, authenticated;

create function public.parties_maj() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.maj_le := now();
  return new;
end $$;

create trigger parties_maj before update on public.parties
  for each row execute function public.parties_maj();

-- Aides internes -------------------------------------------------------------

create function public.nouveau_code() returns text
language plpgsql set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidat text;
begin
  loop
    candidat := '';
    for i in 1..6 loop
      candidat := candidat || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
    exit when not exists (select 1 from public.parties where code = candidat);
  end loop;
  return candidat;
end $$;

create function public.pseudo_propre(p_pseudo text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  propre text := btrim(coalesce(p_pseudo, ''), E' \t\r\n');
begin
  if char_length(propre) not between 1 and 20 then
    raise exception 'entree_invalide';
  end if;
  return propre;
end $$;

create function public.resultat_valide(p_resultat jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    case p_resultat ->> 'kind'
      when 'win' then (p_resultat ->> 'winner') in ('white', 'black') and (p_resultat ->> 'reason') in ('checkmate', 'no-moves')
      when 'draw' then (p_resultat ->> 'reason') in ('stalemate', 'repetition', 'fifty-moves', 'insufficient-material', 'king-moves', 'endgame-limit')
      else false
    end,
    false)
$$;

create function public.ma_partie(p_partie uuid) returns public.parties
language plpgsql set search_path = '' as $$
declare
  partie public.parties;
begin
  if auth.uid() is null then
    raise exception 'non_connecte';
  end if;
  select * into partie from public.parties where id = p_partie for update;
  if not found or not coalesce(auth.uid() in (partie.blancs, partie.noirs), false) then
    raise exception 'partie_introuvable';
  end if;
  return partie;
end $$;

create function public.ma_couleur(p_partie public.parties) returns text
language sql stable set search_path = '' as $$
  select case when p_partie.blancs = auth.uid() then 'white' else 'black' end
$$;

create function public.exiger_en_cours(p_partie public.parties) returns void
language plpgsql set search_path = '' as $$
begin
  if p_partie.statut = 'attente' then
    raise exception 'adversaire_absent';
  end if;
  if p_partie.statut = 'terminee' then
    raise exception 'partie_terminee';
  end if;
end $$;

-- Fonctions appelées par l'app ----------------------------------------------

create function public.creer_partie(p_jeu text, p_couleur text, p_pseudo text) returns public.parties
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

create function public.rejoindre_partie(p_code text, p_pseudo text) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  moi uuid := auth.uid();
  nom text;
  partie public.parties;
begin
  if moi is null then
    raise exception 'non_connecte';
  end if;
  select * into partie from public.parties where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then
    raise exception 'code_inconnu';
  end if;
  if moi = partie.blancs or moi = partie.noirs then
    return partie;
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
  return partie;
end $$;

create function public.jouer_coup(p_partie uuid, p_numero integer, p_coup text, p_resultat jsonb default null) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
  joues integer := coalesce(array_length(partie.coups, 1), 0);
  fin jsonb := case when p_resultat is null or jsonb_typeof(p_resultat) = 'null' then null else p_resultat end;
begin
  perform public.exiger_en_cours(partie);
  if p_numero is distinct from joues then
    raise exception 'conflit';
  end if;
  if public.ma_couleur(partie) <> (case when joues % 2 = 0 then 'white' else 'black' end) then
    raise exception 'pas_ton_tour';
  end if;
  if p_coup is null or not (
    case partie.jeu
      when 'chess' then p_coup ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'
      else p_coup ~ '^[0-9]{1,2}([-x][0-9]{1,2})+$'
    end
  ) then
    raise exception 'coup_invalide';
  end if;
  if fin is not null and not public.resultat_valide(fin) then
    raise exception 'resultat_invalide';
  end if;
  update public.parties
  set coups = array_append(coups, p_coup),
      nulle_proposee_par = null,
      statut = case when fin is null then 'en_cours' else 'terminee' end,
      resultat = fin
  where id = partie.id
  returning * into partie;
  return partie;
end $$;

create function public.proposer_nulle(p_partie uuid) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
  couleur text := public.ma_couleur(partie);
begin
  perform public.exiger_en_cours(partie);
  if partie.nulle_proposee_par is not null and partie.nulle_proposee_par <> couleur then
    update public.parties
    set statut = 'terminee', resultat = '{"kind": "draw", "reason": "agreement"}', nulle_proposee_par = null
    where id = partie.id returning * into partie;
  else
    update public.parties set nulle_proposee_par = couleur where id = partie.id returning * into partie;
  end if;
  return partie;
end $$;

create function public.repondre_nulle(p_partie uuid, p_accepte boolean) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
begin
  perform public.exiger_en_cours(partie);
  if partie.nulle_proposee_par is null or partie.nulle_proposee_par = public.ma_couleur(partie) then
    raise exception 'pas_de_proposition';
  end if;
  if coalesce(p_accepte, false) then
    update public.parties
    set statut = 'terminee', resultat = '{"kind": "draw", "reason": "agreement"}', nulle_proposee_par = null
    where id = partie.id returning * into partie;
  else
    update public.parties set nulle_proposee_par = null where id = partie.id returning * into partie;
  end if;
  return partie;
end $$;

create function public.abandonner(p_partie uuid) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
begin
  perform public.exiger_en_cours(partie);
  update public.parties
  set statut = 'terminee',
      nulle_proposee_par = null,
      resultat = jsonb_build_object(
        'kind', 'win',
        'winner', case when public.ma_couleur(partie) = 'white' then 'black' else 'white' end,
        'reason', 'resign')
  where id = partie.id
  returning * into partie;
  return partie;
end $$;

create function public.annuler_partie(p_partie uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
begin
  if partie.statut <> 'attente' then
    raise exception 'partie_commencee';
  end if;
  delete from public.parties where id = partie.id;
end $$;

create function public.lancer_revanche(p_partie uuid) returns public.parties
language plpgsql security definer set search_path = '' as $$
declare
  partie public.parties := public.ma_partie(p_partie);
  revanche public.parties;
begin
  if partie.statut <> 'terminee' then
    raise exception 'partie_en_cours';
  end if;
  if partie.revanche_code is not null then
    select * into revanche from public.parties where code = partie.revanche_code;
    if found then
      return revanche;
    end if;
  end if;
  if partie.blancs is null or partie.noirs is null then
    raise exception 'adversaire_absent';
  end if;
  insert into public.parties (code, jeu, depart, blancs, noirs, pseudo_blancs, pseudo_noirs, statut)
  values (public.nouveau_code(), partie.jeu, partie.depart, partie.noirs, partie.blancs, partie.pseudo_noirs, partie.pseudo_blancs, 'en_cours')
  returning * into revanche;
  update public.parties set revanche_code = revanche.code where id = partie.id;
  return revanche;
end $$;

-- Droits : seules les fonctions de l'app sont appelables, et seulement par un joueur connecté.
revoke all on function public.parties_maj() from public, anon, authenticated;
revoke all on function public.nouveau_code() from public, anon, authenticated;
revoke all on function public.pseudo_propre(text) from public, anon, authenticated;
revoke all on function public.resultat_valide(jsonb) from public, anon, authenticated;
revoke all on function public.ma_partie(uuid) from public, anon, authenticated;
revoke all on function public.ma_couleur(public.parties) from public, anon, authenticated;
revoke all on function public.exiger_en_cours(public.parties) from public, anon, authenticated;

revoke all on function public.creer_partie(text, text, text) from public, anon;
revoke all on function public.rejoindre_partie(text, text) from public, anon;
revoke all on function public.jouer_coup(uuid, integer, text, jsonb) from public, anon;
revoke all on function public.proposer_nulle(uuid) from public, anon;
revoke all on function public.repondre_nulle(uuid, boolean) from public, anon;
revoke all on function public.abandonner(uuid) from public, anon;
revoke all on function public.annuler_partie(uuid) from public, anon;
revoke all on function public.lancer_revanche(uuid) from public, anon;
grant execute on function public.creer_partie(text, text, text) to authenticated;
grant execute on function public.rejoindre_partie(text, text) to authenticated;
grant execute on function public.jouer_coup(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.proposer_nulle(uuid) to authenticated;
grant execute on function public.repondre_nulle(uuid, boolean) to authenticated;
grant execute on function public.abandonner(uuid) to authenticated;
grant execute on function public.annuler_partie(uuid) to authenticated;
grant execute on function public.lancer_revanche(uuid) to authenticated;

-- Temps réel : changements de la table (règles d'accès appliquées) et présence sur canal privé.
alter publication supabase_realtime add table public.parties;

create policy "joueurs : voir la présence de leur partie"
  on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('presence')
    and exists (
      select 1 from public.parties p
      where 'partie:' || p.id::text = (select realtime.topic())
        and (select auth.uid()) in (p.blancs, p.noirs)
    )
  );

create policy "joueurs : annoncer leur présence"
  on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension in ('presence')
    and exists (
      select 1 from public.parties p
      where 'partie:' || p.id::text = (select realtime.topic())
        and (select auth.uid()) in (p.blancs, p.noirs)
    )
  );

-- Nettoyage : chaque nuit, suppression des parties sans activité depuis 7 jours.
select cron.schedule(
  'nettoyage-parties',
  '17 3 * * *',
  $$ delete from public.parties where maj_le < now() - interval '7 days' $$
);
