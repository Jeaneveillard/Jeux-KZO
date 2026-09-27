# Étape 3 : jeu en ligne entre amis — Document de conception

**Date :** 2026-09-26
**Statut :** validé en discussion (4 sections approuvées), en attente de relecture finale
**Complète :** `2026-09-24-jeux-echecs-dames-design.md` §9 (grandes lignes de l'étape 3)

## 1. Objectif

Deux amis jouent aux échecs ou aux dames sur leurs téléphones, **en direct ou chacun à son rythme**, sans compte : l'un crée une partie et partage un code ou un lien, l'autre la rejoint. L'app est **mise en ligne** à une adresse HTTPS publique.

Critère de réussite (spec d'origine §11) : deux téléphones jouent une partie complète via un code, y compris après une coupure réseau.

## 2. Décisions prises

| Sujet | Décision |
|---|---|
| Hébergement | **GitHub Pages**, `https://jeaneveillard.github.io/Jeux-KZO/`, mise en ligne automatique par GitHub Actions ; le dépôt devient **public** (obligation GPL, confirmée avec l'utilisateur au moment de la mise en ligne) |
| Serveur | **Nouveau projet Supabase « jeux-kzo »** dans l'organisation de l'utilisateur (offre gratuite, 0 $/mois vérifié) |
| Rythme | **En direct et à son rythme** : la partie est gardée sur le serveur ; écran « Mes parties en ligne » |
| En plus de l'abandon | **Proposer la nulle**, **revanche**, **présence** de l'ami (en ligne / hors ligne) |
| Écarté pour cette étape | Notification « c'est ton tour » app fermée |
| Arbitrage des coups | **Approche A** : la base vérifie l'identité, le tour et l'ordre des coups ; les téléphones vérifient la légalité avec les règles existantes. Entre amis, la triche n'est pas un enjeu ; une validation serveur (Edge Function) reste possible plus tard sans refaire le reste |

## 3. Parcours et écrans

- **Menu de chaque jeu** : le bouton « En ligne » (grisé aujourd'hui) s'active. Au premier passage, l'app demande un **pseudo** (1 à 20 caractères), gardé dans les réglages et modifiable.
- **Écran « En ligne »** (`#/echecs/en-ligne`, `#/dames/en-ligne`) :
  - **Créer une partie** : choix de la couleur (Blancs / Noirs / Au hasard) → écran d'attente avec le **code** (6 caractères parmi `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sans O/0 ni I/1) et le bouton **Partager le lien** (menu de partage du téléphone via `navigator.share`, sinon copie) ; bouton **Annuler la partie** tant que personne ne l'a rejointe.
  - **Rejoindre avec un code** (saisie insensible à la casse et aux espaces).
  - **Mes parties en ligne** (de ce jeu) : d'abord « À toi de jouer », puis « Au tour de … », puis « En attente d'un adversaire », puis les parties terminées des 7 derniers jours.
- **Lien d'invitation** `#/rejoindre/K7M2QX` : pseudo demandé si besoin, puis arrivée dans la partie. Messages clairs : code inconnu, partie complète ; ouvrir sa propre partie mène simplement à la partie.
- **Écran de partie en ligne** (`#/echecs/en-ligne/K7M2QX`) : même plateau qu'en local ; pseudos des deux joueurs ; **point vert/gris** de présence de l'ami ; état (« À toi de jouer », « Au tour de Marie », « Marie est hors ligne : elle verra ton coup à son retour ») ; boutons **Proposer la nulle**, **Abandonner**, **Menu**. Pas d'indice ni d'annulation (spec d'origine §5.3).
- **Nulle proposée** : l'ami voit « Marie propose la nulle — Accepter / Refuser ». Jouer un coup vaut refus. Si les deux proposent, la nulle est conclue.
- **Revanche** : en fin de partie, **Revanche** crée une nouvelle partie avec les mêmes joueurs, couleurs inversées, déjà commencée ; l'ami voit « Marie lance une revanche — Jouer ». Si les deux cliquent, ils arrivent sur la même revanche.
- **Fin de partie** : nouveau résultat commun aux deux jeux, « Nulle d'un commun accord ».

## 4. Base de données (projet Supabase « jeux-kzo »)

### 4.1 Identité
Connexion **anonyme** Supabase : chaque téléphone reçoit un identifiant, gardé par la bibliothèque Supabase dans le stockage local. Effacer les données du navigateur fait perdre l'accès à ses parties ; un même joueur sur deux téléphones compte comme deux joueurs. Les connexions anonymes doivent être activées dans les réglages d'authentification du projet.

### 4.2 Table `parties`

| Colonne | Type | Rôle |
|---|---|---|
| `id` | `uuid` (clé, `gen_random_uuid()`) | identifiant interne |
| `code` | `text`, unique, 6 caractères | code à partager |
| `jeu` | `text` : `chess` \| `draughts` | jeu |
| `depart` | `text` | position de départ (FEN), celle du jeu |
| `coups` | `text[]`, défaut `{}` | coups encodés comme les sauvegardes locales (`e2e4`, `32-28`, `28x19x10`) |
| `blancs`, `noirs` | `uuid` (utilisateur, peut être vide) | joueurs |
| `pseudo_blancs`, `pseudo_noirs` | `text` | pseudos |
| `statut` | `text` : `attente` \| `en_cours` \| `terminee` | état |
| `resultat` | `jsonb` | résultat au format `GameStatus` de l'app |
| `nulle_proposee_par` | `text` : `white` \| `black` \| vide | nulle en attente de réponse |
| `revanche_code` | `text` | code de la revanche lancée |
| `cree_le`, `maj_le` | `timestamptz` | création, dernière activité (mise à jour par déclencheur) |

Les parties commencent toujours à la position initiale du jeu : les Blancs jouent les coups pairs (0, 2, …).

### 4.3 Règles d'accès (RLS)
- **Lecture** : seulement si l'utilisateur est `blancs` ou `noirs`.
- **Écriture directe interdite** (aucune règle `insert` / `update` / `delete`) : tout passe par les fonctions ci-dessous (`security definer`), qui vérifient chaque action.
- Les clés mises dans l'app sont l'URL du projet et la **clé publique** (publishable), prévues pour être visibles ; les règles d'accès protègent les données.

### 4.4 Fonctions (appelées par l'app)

| Fonction | Effet | Erreurs |
|---|---|---|
| `creer_partie(jeu, couleur, pseudo)` | crée la partie, génère un code unique | `trop_de_parties` (plus de 20 parties non terminées), `entree_invalide` |
| `rejoindre_partie(code, pseudo)` | occupe la place libre, passe `en_cours` ; renvoie la partie si l'appelant y joue déjà | `code_inconnu`, `partie_complete`, `entree_invalide` |
| `jouer_coup(partie, numero, coup, resultat)` | ajoute le coup si `numero` = nombre de coups déjà joués ; efface la nulle proposée ; si `resultat` est fourni, termine la partie | `partie_introuvable`, `pas_ton_tour`, `partie_terminee`, `conflit`, `coup_invalide` (format selon le jeu), `resultat_invalide` |
| `proposer_nulle(partie)` | enregistre la proposition ; si l'adversaire avait déjà proposé, conclut la nulle | `partie_introuvable`, `partie_terminee` |
| `repondre_nulle(partie, accepte)` | seul l'adversaire du proposant répond ; accepte → `{ kind: 'draw', reason: 'agreement' }` | `pas_de_proposition` |
| `abandonner(partie)` | victoire de l'adversaire, raison `resign` | `partie_terminee` |
| `annuler_partie(partie)` | le créateur supprime une partie encore `attente` | `partie_commencee` |
| `lancer_revanche(partie)` | partie terminée seulement ; crée (une seule fois) la revanche couleurs inversées, déjà `en_cours`, et renvoie sa ligne | `partie_en_cours` |

Toutes vérifient que l'appelant est connecté et, sauf création et arrivée, qu'il joue la partie. Entrées validées : pseudo de 1 à 20 caractères (espaces retirés aux bords), coup au format du jeu (échecs `^[a-h][1-8][a-h][1-8][qrbn]?$`, dames `^\d{1,2}([-x]\d{1,2})+$`), résultat de forme `GameStatus`.

### 4.5 Temps réel et présence
- La table est publiée dans Supabase Realtime ; chaque téléphone s'abonne aux changements de **sa** partie (les règles d'accès s'appliquent).
- Présence : canal Realtime **privé** `partie:<id>`, autorisé seulement aux deux joueurs (règle sur `realtime.messages`).

### 4.6 Nettoyage
Tâche `pg_cron` quotidienne : suppression des parties sans activité depuis **7 jours**.

### 4.7 Versionnement
Tout le schéma (table, déclencheur, règles, fonctions, publication, tâche planifiée) est dans `supabase/migrations/` et appliqué au projet par migrations.

## 5. App (téléphone)

### 5.1 Modules
Nouveau dossier `src/online/`, **chargé à la demande** (import dynamique) : les modes hors ligne ne téléchargent pas la bibliothèque Supabase.
- `client.ts` : création paresseuse du client Supabase (`@supabase/supabase-js` 2.x) à partir de `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ; connexion anonyme à la demande. Sans configuration, l'écran « En ligne » explique que le service n'est pas disponible.
- `api.ts` : une fonction par action (créer, rejoindre, jouer, nulle, réponse, abandon, annulation, revanche, relire une partie, lister mes parties) ; traduction des erreurs du serveur en messages français.
- `rows.ts` : **validation** de chaque ligne reçue du serveur (type `OnlineGame`), comme les sauvegardes locales.
- `code.ts` : normalisation et validation des codes, construction du lien d'invitation.
- `useOnlineGame` : état d'une partie ; abonnement aux changements et à la présence ; reconstruction de la position avec le kit du jeu (`restoreSession`) et **revérification** de chaque coup reçu ; envoi des coups avec le numéro attendu ; relecture au retour du réseau (`online`) ou au premier plan (`visibilitychange`).
- Réglages : `Settings` gagne `pseudo: string | null` (les réglages déjà enregistrés sans pseudo restent valides).

### 5.2 Réutilisation
Les kits de l'étape 2 fournissent règles, codec, plateau, pièces et textes. Le bloc « plateau + pièces prises + choix de promotion / de rafle » est extrait de `PlayScreen` en composant commun, utilisé par la partie locale et la partie en ligne.

### 5.3 Adresses
`#/echecs/en-ligne`, `#/dames/en-ligne` (écran « En ligne »), `#/echecs/en-ligne/<code>`, `#/dames/en-ligne/<code>` (partie), `#/rejoindre/<code>` (invitation ; le jeu est lu sur le serveur).

### 5.4 Fin de partie
Le joueur qui joue le coup final calcule le résultat avec les règles (`adapter.status`) et l'envoie avec le coup ; l'autre téléphone le recalcule. L'abandon, la nulle d'accord et la revanche passent par leurs fonctions.

### 5.5 Erreurs

| Situation | Comportement |
|---|---|
| Pas d'internet | « En ligne » indique l'absence de connexion ; en partie, bandeau « Connexion perdue, reconnexion… », coups bloqués jusqu'à la relecture |
| Coups croisés (`conflit`) | la partie est relue ; « La partie a changé : rejoue ton coup » |
| Coup reçu illégal | refusé (spec d'origine §8) : « Coup invalide reçu : la partie ne peut pas continuer » ; l'abandon reste possible |
| Serveur en pause ou injoignable | « Le jeu en ligne est momentanément indisponible » + Réessayer |
| Code inconnu, partie complète, trop de parties | message propre à chaque cas |

## 6. Mise en ligne

- Build GitHub Pages avec la base `/Jeux-KZO/` (variable d'environnement lue par `vite.config.ts` ; `/` en local et pour les tests). Manifeste, service worker, icônes et Stockfish suivent cette base.
- **GitHub Actions** (`.github/workflows/`) : sur chaque Pull Request, typage + tests unitaires + build ; à chaque fusion dans `main`, les mêmes étapes puis **déploiement** sur GitHub Pages.
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` : variables du dépôt GitHub (valeurs publiques par nature), et fichier `.env.local` ignoré par git en local.
- Avant la première mise en ligne : confirmation de l'utilisateur pour **rendre le dépôt public** et activer Pages (source : GitHub Actions). L'écran « À propos » des réglages donne le lien vers le code source (GPL).

## 7. Tests

- **Unitaires (Vitest)**, couverture ≥ 80 % sur `src/online` (hors `client.ts`) comme sur le reste : validation des lignes, codes et liens, messages d'erreur, logique de `useOnlineGame` avec un faux serveur (coups croisés, coup illégal reçu, nulle, revanche, reconnexion), adresses, écrans, réglages avec pseudo.
- **Base de données (à la demande, `npm run test:online`)**, contre le vrai projet : deux joueurs anonymes créent, rejoignent, jouent, se croisent (`conflit`), proposent et acceptent la nulle, abandonnent, lancent la revanche (une seule pour deux clics) ; un troisième joueur **ne peut pas lire** leur partie ; les entrées invalides sont refusées.
- **Bout en bout (à la demande, `npm run e2e:online`)**, deux téléphones simulés (deux contextes Playwright) contre le vrai projet : invitation par lien, coups vus en direct, présence, nulle, revanche, **coupure réseau d'un joueur puis retour** en pleine partie.
- Les 10 scénarios hors ligne existants restent verts ; la CI lance typage, tests unitaires et build.

## 8. Hors périmètre

Notification app fermée, pendules, chat, spectateurs, comptes et classement, recherche d'adversaires inconnus, validation serveur de la légalité des coups (approche B), plusieurs téléphones pour un même joueur.
