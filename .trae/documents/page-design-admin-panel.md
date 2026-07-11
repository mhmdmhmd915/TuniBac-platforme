# Page Design — Admin Panel (desktop-first)

## Global Styles (design tokens)
- Layout: Desktop-first, conteneur max-width 1200–1440px, grille 12 colonnes, sidebar fixe.
- Couleurs: fond `#0B1220` (ou `slate-950`), surfaces `#111827`, bordures `#1F2937`, texte `#E5E7EB`.
- Accent primaire: `#3B82F6` (hover `#2563EB`), danger `#EF4444`, succès `#22C55E`, warning `#F59E0B`.
- Typo: Inter/System, échelle 12/14/16/20/24/32, titres semi-bold.
- Composants: boutons (Primary/Secondary/Danger), inputs avec états (default/focus/error/disabled), badges de statut, toasts.
- Transitions: 150–200ms (hover/focus), drawers/modals 200–250ms.

---

## 1) Page — Connexion Admin
### Meta Information
- Title: "Admin — Connexion"
- Description: "Authentification administrateur"
- Open Graph: `og:title`, `og:type=website`

### Layout
- CSS: Flexbox centré vertical/horizontal, carte (card) de 420–480px.
- Responsive: sur <768px, pleine largeur avec padding 16px.

### Page Structure
1. Header minimal (logo + nom produit)
2. Card Connexion
3. Footer discret (version / lien support)

### Sections & Components
- Form:
  - Champ email
  - Champ mot de passe (toggle show/hide)
  - Bouton "Se connecter" (loading)
  - Zone d’erreur (message clair: identifiants invalides / accès interdit)
- Comportement:
  - Enter = submit
  - Après succès: redirection vers `/admin`

---

## 2) Page — Console Admin (Entités)
### Meta Information
- Title: "Admin — Console"
- Description: "Gestion complète des entités"
- Open Graph: `og:title`, `og:type=website`

### Layout
- CSS: Grille hybride (sidebar + contenu).
  - Sidebar: largeur 260px, sticky.
  - Contenu: header + toolbar + table + panneau détails.
- Responsive: sur <1024px, sidebar devient drawer; panneau détails devient modal.

### Page Structure
1. Sidebar navigation
2. Top bar (breadcrumb + actions globales)
3. Zone principale: sélecteur d’entité + tableau
4. Panneau latéral (drawer) pour Create/Edit/Details

### Sections & Components
- Sidebar
  - Entrées: "Entités", "Settings"
  - Section "Entité courante" (liste des entités disponibles)
- Toolbar (au-dessus de la table)
  - Search bar (q)
  - Filtres (chips + popover)
  - Tri (dropdown)
  - Bouton "Créer" (ouvre drawer)
  - Bouton "Rafraîchir"
- Data Table
  - Colonnes configurables par entité (min: ID/titre/createdAt/statut)
  - Pagination (page/pageSize)
  - Actions ligne: Voir / Éditer / Supprimer
  - Badges de statut (brouillon/en attente/publié)
- Drawer Create/Edit/Details
  - Form dynamique (champs texte, select, date, textarea)
  - Bloc Upload:
    - zone drag&drop + bouton sélectionner
    - barre de progression
    - liste des assets attachés (preview + supprimer)
  - Actions:
    - Enregistrer (PUT/POST)
    - Supprimer (confirmation)
    - Approuver/Rejeter (si applicable)
- États
  - Loading skeletons (table + drawer)
  - Empty state (aucun résultat + CTA "Créer")
  - Toast succès/erreur (message backend)

---

## 3) Page — Settings
### Meta Information
- Title: "Admin — Settings"
- Description: "Paramètres et journal d’actions"
- Open Graph: `og:title`, `og:type=website`

### Layout
- CSS: 2 colonnes (form settings à gauche, audit log à droite) via CSS Grid.
- Responsive: sur <1024px, empilement vertical.

### Page Structure
1. Header de page (titre + bouton sauvegarder)
2. Section Paramètres (cards)
3. Section Sécurité (card)
4. Section Audit log (table)

### Sections & Components
- Paramètres applicatifs (cards)
  - Limites upload (taille max, extensions autorisées)
  - Branding (titre/nom affiché)
  - Mode maintenance (toggle)
- Sécurité & accès (card)
  - Rappel des règles: accès admin uniquement
  - Bouton "Forcer déconnexion" (si exposé par API)
- Audit log (table)
  - Filtres: entité, action, période
  - Colonnes: date, acteur, action, entité, id
  - Détail (modal) pour voir `payload_json` si nécessaire