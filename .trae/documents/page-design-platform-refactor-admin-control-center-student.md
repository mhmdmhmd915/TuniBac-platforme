# Page Design Specification (Desktop-first)

## Global Styles (all pages)
- Layout system: CSS Grid for main app shells (sidebar + header + content), Flexbox inside components.
- Grid: 12-column content grid, max-width 1200–1320px for centered content areas; full-width shells for admin dashboards.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Typography: Inter/system; base 14–16px; headings 24/20/18; strong contrast for dashboards.
- Colors (tokens):
  - Background: #0B1220 (admin optional dark) or #F7F8FA (student light)
  - Surface: #FFFFFF; Elevated: #FFFFFF with subtle shadow
  - Text: #0F172A, muted #64748B
  - Primary: #2563EB; Success: #16A34A; Warning: #D97706; Danger: #DC2626
  - Border: #E2E8F0
- Buttons:
  - Primary filled, secondary outline, tertiary ghost.
  - Hover: +4% darken, focus ring 2px primary at 30%.
  - Destructive actions require confirmation modal.
- States:
  - Loading: skeletons in tables/cards.
  - Empty: friendly guidance + primary CTA.
  - Error: inline message + retry; preserve details for admin.

---

## 1) Authentication Page
### Meta Information
- Title: "Sign in"
- Description: "Access your account securely."
- OG: title + description, no indexable sensitive parameters.

### Page Structure
- Centered card layout on neutral background.
- Two-column optional marketing/benefits panel on desktop; collapses to single column on smaller screens.

### Sections & Components
1. Top area
   - Logo (left aligned in card header).
   - Optional language selector if it exists today.
2. Auth form card
   - Tabs: Sign in / Sign up (only if both exist today).
   - Inputs: Email/username, password, optional existing MFA fields.
   - Primary CTA: "Sign in" / "Create account".
   - Secondary actions: "Forgot password", "Back".
   - Inline validation + server error banner.
3. Compliance/footer
   - Terms/privacy links.

Interactions
- Press Enter submits.
- Disable CTA while submitting; show spinner.
- Preserve redirect target after successful auth.

---

## 2) Student App (Premium UX Shell)
### Meta Information
- Title: "Student"
- Description: "Your personalized student experience."
- OG: Student landing preview.

### Page Structure
- App shell: header + (optional) left nav + main content.
- Main content uses stacked sections and card grids.

### Sections & Components
1. Header
   - Left: product name + breadcrumb (when deeper than root).
   - Center: global search (only if it exists today; otherwise omit).
   - Right: notifications icon (only if it exists today), profile menu (avatar + name).
2. Navigation
   - Primary nav items map to existing student features.
   - Active state + keyboard focus.
3. Dashboard content
   - Hero summary card: next-step guidance (generic), key stats if they exist today.
   - Primary cards grid: entry points to existing student features (2–3 columns on desktop).
   - Recent activity list: only if the platform already supports it.
4. Profile & settings
   - Form sections with clear grouping; save/cancel pattern.
   - Avatar uploader only if supported today.

UX quality requirements
- Consistent spacing, typography, and component library usage across all student screens.
- Keep functional behavior identical; improvements focus on clarity, speed, and visual polish.

---

## 3) Admin Control Center (Production-ready)
### Meta Information
- Title: "Admin Control Center"
- Description: "Operate and manage the platform."
- OG: Admin dashboard preview.

### Page Structure
- Dashboard shell (full-width):
  - Left sidebar nav (fixed)
  - Top header (sticky)
  - Main content (scroll)
- Uses dense information design with readable tables and filters.

### Sections & Components
1. Sidebar
   - Sections: Overview, Users, Settings, Operations, Audit, Parity.
   - Collapsible groups; icons + labels.
2. Header
   - Environment badge (e.g., Production/Staging if available).
   - Quick search (users/settings) if supported.
   - Admin profile menu with sign out.
3. Overview
   - KPI cards (only for existing metrics).
   - Alerts panel: errors/failures surfaced prominently.
4. Users (User management)
   - Table: sortable columns, pagination, filters.
   - User details drawer: key fields + actions.
   - Actions are gated by role; destructive actions require confirm + reason.
5. Settings (Platform configuration)
   - Settings grouped into categories.
   - Edit with validation, diff preview (before/after), confirm modal.
6. Operations
   - Status views: list existing operational entities (jobs/logs/statuses only if they exist today).
   - Failure drill-down: timestamps, correlation ids if available.
7. Audit
   - Immutable log table with filters (actor, action, date range).
8. Parity Checklist
   - List of features with status badges (pass/fail/unknown).
   - Row opens details: last run time, link to E2E report, related route.

Admin interaction requirements
- All privileged actions: explicit permissions + audit entry.
- Consistent table patterns and bulk actions (only where safe).
- Fast navigation: keep key actions within 1–2 clicks from overview.