# Page Design — Communication Center

## Global Styles (Desktop-first)
- Design tokens
  - Background: #0B1020 (app shell) / surfaces: #111A33
  - Texte: #E8EEFF, secondaire: #A9B4D0
  - Accent primaire: #4F7DFF, hover: #3E6CF0
  - Danger: #FF4D4F
  - Border: rgba(255,255,255,0.08)
  - Radius: 12px (cards/modals), 8px (inputs)
- Typographie
  - H1 28/36, H2 20/28, Body 14/22, Caption 12/18
- Boutons
  - Primary: fond accent, texte blanc, hover +4% luminosité
  - Secondary: surface + border, hover border accent
  - Tertiary/link: texte accent, underline au hover
- Responsive
  - Desktop (>=1200): layout en colonnes, panneaux latéraux possibles
  - Tablet (768–1199): colonnes réduites, modals plein écran possibles
  - Mobile (<768): carousel en swipe natif, toolbar sticky

---

## 1) Dashboard Étudiant (modifié)

### Meta Information
- Title: Dashboard — Communication Center
- Description: Consulte tes communications importantes et pièces jointes.
- Open Graph: titre + description + type="website"

### Layout
- Page shell existant (top nav + contenu).
- Grille principale en CSS Grid (2 colonnes sur desktop si la page avait des widgets), mais le bloc Communication Center doit rester visible « above the fold ».

### Page Structure
1. En-tête de page (titre Dashboard) — inchangé.
2. Bloc « Communication Center » (nouveau / remplace Announcements).
3. Reste des widgets du dashboard, **sans** « Continue learning » et **sans** « Weekly goal ».

### Sections & Components
#### A. Section « Communication Center » (carousel)
- Container: card pleine largeur, padding 16–20.
- Header row:
  - Titre: “Communication Center”
  - Compteur optionnel (ex: “3 nouvelles”) si déjà disponible dans l’app; sinon omettre.
- Carousel:
  - Desktop: carousel horizontal avec flèches gauche/droite + pagination (dots).
  - Touch: support du swipe.
  - Une carte = 320–360px de large, hauteur auto.
- Communication Card (dans le carousel):
  - Titre (2 lignes max)
  - Extrait du contenu (3 lignes max)
  - Métadonnées: date de publication (format court)
  - Badge optionnel “Important” si priorité élevée (seuil géré côté produit/dev, sans exposer un contrôle étudiant)
  - CTA: “Lire” (ouvre modal)

#### B. Détail communication (modal/panneau)
- Desktop: modal centrée (max-width 720px), scroll interne.
- Mobile: full-screen sheet.
- Contenu:
  - Titre + date
  - Body (texte long)
  - Pièces jointes: liste verticale de liens/boutons (nom + taille)
  - Actions: “Fermer” + “Ouvrir” (par fichier)

#### C. Retrait des sections
- “Continue learning” et “Weekly goal”
  - Supprimer du layout (pas seulement masquer) pour éviter les espaces vides.
  - Ré-allouer l’espace à la section Communication Center ou aux autres widgets existants.

---

## 2) Admin — Communication Center

### Meta Information
- Title: Admin — Communication Center
- Description: Gérer, programmer et prioriser les communications.
- Open Graph: non critique (admin), peut être minimal.

### Layout
- Desktop: layout 2 zones (Flexbox)
  - Zone gauche (liste) ~60–70%
  - Zone droite (éditeur/preview) ~30–40% (ou bien éditeur en modal si l’app admin est déjà modal-centric)
- Tablet/mobile: pile verticale; éditeur en plein écran.

### Page Structure
1. Header (titre + action primaire)
2. Barre de filtres
3. Liste/table des communications
4. Éditeur (panneau latéral ou modal)

### Sections & Components
#### A. Header
- Titre: “Communication Center”
- Bouton primaire: “Nouvelle communication”

#### B. Barre de filtres
- Filtre Statut: Draft / Scheduled / Published / Archived (select)
- Recherche: input texte (placeholder “Rechercher par titre…”) + clear
- Tri: select (Updated récemment / Date de publication / Priorité)

#### C. Liste/Table
- Table desktop (colonnes):
  - Titre
  - Statut (badge couleur)
  - Priorité
  - Publish_at
  - Expire_at
  - Updated_at
  - Actions (… menu): Éditer / Publier / Archiver / Supprimer
- États:
  - Empty state: “Aucune communication” + CTA création
  - Loading skeleton

#### D. Éditeur (Create/Edit)
- Champs
  - Titre (required)
  - Contenu (textarea rich text **uniquement si déjà présent dans l’app**, sinon textarea simple)
  - Priorité (input number, helper “Plus élevé = plus visible”)
  - Publish_at (date-time picker)
  - Expire_at (date-time picker, optionnel)
  - Statut (lecture + actions dédiées via boutons)
- Actions (footer)
  - “Enregistrer” (draft)
  - “Publier maintenant”
  - “Programmer” (si publish_at futur)
  - “Archiver”
  - “Supprimer” (danger)

#### E. Pièces jointes
- Bloc “Pièces jointes” dans l’éditeur
  - Upload (multi-fichiers)
  - Liste des fichiers déjà attachés (nom, type, taille)
  - Action par fichier: “Retirer”
  - Règle UX: afficher progression d’upload et erreurs par fichier

#### F. Prévisualisation (optionnel mais recommandé si panneau latéral)
- Carte de preview reprenant le rendu étudiant (titre + extrait)
- Aperçu du détail (scroll)

