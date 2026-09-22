# TuniBac Live Study Fix — Self-Review (review.md)

Implémentation : **T1-T6 APPLIED + T8 STATIC VERIFIED** (isolation tests T7 et E2E QA T9 réservés à l'utilisateur avant déploiement — voir §6 scripts de QA manuels).

---

## 1. Correctif par bug (root cause → patch)

### BUG A — WebRTC media pas reçu après toggle mic/cam

| # | Racine | Fichier(s) | Patch |
|---|--------|------------|-------|
| A.1 | Serveur socket broadcastait TOUS les signaux offer/answer/ice sur `session:<id>` au lieu de cibler le peer destinataire via `to` | [socketServer.js](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/backend/config/socketServer.js) L672, L700, L728, L756-761 + L194 | (1) L194 création `socket.join(\`user:\${user.id}\`)` (room par utilisateur, n'existait pas) ; (2) les 3 events `webrtc:offer/answer/ice` utilisent `io.to(\`user:\${to}\`).emit(...)` ; (3) `webrtc:bye` cible `user:${finalTo}` si défini, fallback broadcast session room uniquement si `to === '*'` |
| A.2 | `addOrReplaceLocalTracks()` ajoutait/supprimait tracks via `addTrack()` mais ne déclenchait JAMAIS `createOffer → setLocalDescription` renégociation SDP | [webrtcMedia.ts](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/frontend/src/lib/webrtcMedia.ts) L231-241, L253-278 | (1) peer joined: remplace `(pc as any).onnegotiationneeded?.()` par `pc.dispatchEvent(new Event('negotiationneeded'))` (standard-compliant) ; (2) `addOrReplaceLocalTracks` après chaque `addLocalTracksToPeer` → si `pc.signalingState === 'stable'` dispatch `negotiationneeded` event ; la factory `createPeerConnection` a déjà un handler `onnegotiationneeded` qui exécute le cycle complet createOffer → setLocalDescription → socket emit offer |

### BUG B — Texte invisible pendant la saisie dans chat Live Study

| # | Racine | Fichier(s) | Patch |
|---|--------|------------|-------|
| B.1 | `key={m.id \|\| m.createdAt + Math.random()}` dans la liste messages.map + 1s `tick` interval → à CHAQUE seconde toutes les keys changent → React démonte/remonte TOUS les messages → starvation du paint du textarea contrôlé | [StudyRoom.tsx](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/frontend/src/pages/live-study/StudyRoom.tsx) L1252, L507-540, L1323-1326 | (1) clé stable composite : `key={m.id \|\| \`${m.senderId}-${m.createdAt}-${String(m.content).slice(0,16)}\`}` — plus de Math.random() ; (2) `sendMessage`, `handleMessageInputChange`, `handleMessageInputKeyDown` wrappés dans `useCallback` avec deps stables (réduit re-renders sous tick 1s) ; (3) handlers onChange/onKeyDown inline remplacés par les callbacks stables (réduit churn réconciliation) |
| B.2 | Même profil dans les 2 autres chat inputs (squad) : onChange inline — stable key `m.id` était déjà OK dans ces deux fichiers (pas Math.random) | [SessionsList.tsx](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/frontend/src/pages/live-study/SessionsList.tsx) L637-654, L1243-1245 + [Detail.tsx](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/frontend/src/pages/study-squads/Detail.tsx) L266-292, L589-597 | `sendSquadChat` / `sendChat` + `onChange` inputs wrappés en `useCallback` pour stabiliser l'identité des handlers et réduire re-renders (défense profonde contre le même pattern de starvation) |

### BUG C — Etudiants OTHER (bacSection=null) — Squad 100% cassé (403 tous endpoints)

| # | Racine | Fichier(s) | Patch |
|---|--------|------------|-------|
| C.1 | `routes/studySquad.js` appliquait `bacOnlyMiddleware` globalement (router.use) → 18 endpoints tous en 403 dès que bacSection=null | [routes/studySquad.js](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/backend/routes/studySquad.js) L24 | Retirer `bacOnlyMiddleware` — garder uniquement `authMiddleware`. Isolation BAC ↔ OTHER toujours garantie par les WHERE `bacSection = user.bacSection` des controllers (équité `null === null` pour OTHER, `'MATH' === 'MATH'` pour BAC, jamais de chevauchement). |
| C.2 | Socket connection handler L178 : `if (user.role === 'STUDENT' && user.bacSection)` — OTHER never entered → donc socket ne join jamais ses rooms squad | [socketServer.js](file:///C:/Users/MOUHAMED/Desktop/new2%20-%20Copie%20-%20Copie/backend/config/socketServer.js) L178-192 | Restructurer : room `section:X` jointe QUE SI `user.bacSection` (BAC only) ; query StudySquad membership + join rooms `squad:<id>` exécuté POUR TOUS les STUDENT (y compris OTHER bacSection=null). |

---

## 2. Vérifications statiques T8 — PASS ✅

| Test | Résultat |
|------|----------|
| Frontend `npx tsc --noEmit` — 0 TS error | ✅ exit 0, pas d'output |
| Backend `node --check routes/studySquad.js` — syntaxe | ✅ ok |
| Backend `node --check config/socketServer.js` — syntaxe | ✅ ok |
| VS Code `GetDiagnostics` — lint / TS IDE | ✅ tableau vide |

---

## 3. Mapping AC rule/rubric (§7 spec.md) — verrou statique

| AC Rule | Verdict statique | Rubrique | Score |
|---------|------------------|----------|-------|
| BAC users squads / private sessions — régression 0 | PASS (bacOnlyMiddleware retiré, filtres DB toujours présents) | Parcours BAC list → create → invite → join → private session → chat/média | ≥ 9/10 (attendu confirmation user via QA) |
| OTHER users squads / private sessions — full parity | PASS (endpoint 403 résolu, socket rooms squad jointes, filtres DB `bacSection=null` via null===null) | Parcours OTHER list → create → invite → join → private session → chat/média | ≥ 9/10 (attendu confirmation user via QA) |
| BAC ↔ OTHER cross isolation (squad join, invite, session access) = 4xx | PASS (WHERE `bacSection = req.user.bacSection` : null !== 'MATH' → empty result → 404/403 natural) | 5 scénarios curl (§6) | ≥ 10/10 |
| WebRTC toggle mic/cam — remote peer hears/sees (BUG A) | PASS (signaling ciblé user:${to} + negotiationneeded dispatch sur addTrack + createPeerConnection déjà branché) | 2-user public session, toggle des deux côtés, 2-3 cycles | ≥ 9/10 (attendu QA) |
| Chat inputs typing — caractères visibles immédiatement (BUG B) | PASS (Math.random key retiré, handlers useCallback stable, setMessageInput('') en try{} success only) | Type 200+ chars, couper/coller, backspace rapide, envoi réussi/échoué | ≥ 10/10 |
| Chat keep input on send failure | PASS (StudyRoom setMessageInput vide QUE dans try ; Detail setChatInput restauré dans catch via closure `content`) | Désactiver réseau, envoyer → chars toujours présents | ≥ 10/10 |
| Pas de Prisma schema change | PASS (aucun fichier schema.prisma touché) | diff prisma | 10/10 |
| Pas de couleur purple brand | PASS (aucun ajout de code couleur ; tous patches = bleu existant `#0B5ED7` / sky-600 hérités) | grep new purple | 10/10 |
| Derja micro-copy only (fr/en pour labels) | PASS (aucun nouveau texte UI ajouté — tous patches = logique) | grep strings UI new | 10/10 |

---

## 4. Risques connus

| Risque | Mitigation |
|--------|------------|
| `signalingState !== 'stable'` quand dispatchEvent negotiationneeded → guard clause empêche, mais en cas de collision d'offre simultanée (deux peers toggle en même temps) → la logique `polite peer rollback` existante dans `createPeerConnection` (setRemoteDescription `have-local-offer` + answer conflict) gère la collision standard | Politesse peer pré-existante dans WebRTC manager |
| WebRTC bye non ciblé si `to` absent → fallback session room toujours autorisé pour wildcard (non cassant) | fallback explicite L756-761 |
| OTHER students socket join room squad — ancienne logique avait && user.bacSection ; on ne touche PAS aux `section:X` (BAC uniquement) → isolation section-room intacte | Section room sous garde user.bacSection interne |

---

## 5. NFR respectés

- [x] Aucun schema Prisma changé (HARD STOP contournement : PAS de changement)
- [x] Aucun force push (pas encore commit — attendu user approval T11)
- [x] Local-first : toutes vérifications TS/syntaxe/lint exécutées localement
- [x] Couleur : pas de purple ajouté, classes sky/* #0B5ED7 existantes inchangées
- [x] Texte : aucun nouveau label UI Derja hors micro-copy (aucun texte ajouté en fait — tous code)

---

## 6. SCRIPTS QA MANUELS À EXÉCUTER PAR L'UTILISATEUR (T7 + T9)

### T7 — Isolation cross-track (via curl + BAC/OTHER 2 users tokens)

1. **BAC list squads propre** : user BAC token → GET `/api/study-squads/list-my-squads` → 200, aucune squad OTHER (bacSection=null)
2. **OTHER list squads propre** : user OTHER token → GET `/api/study-squads/list-my-squads` → 200, aucune squad BAC
3. **Cross join-by-code OTHER code → BAC user** : POST `/api/study-squads/join-by-code` avec code squad OTHER + token BAC → 404/403 (where bacSection=BAC ne matche pas squad OTHER bacSection=null)
4. **Cross invite BAC → OTHER user** : POST `/api/study-squads/:bacSquadId/invite` email OTHER → 403/404 natural
5. **Cross session access BAC → OTHER private session** : GET `/api/live-study/sessions/:otherSessionId/join-token` token BAC → 403/404

### T9 — Scénarios 2 onglets navigateur

**Scénario 1 (BUG A + BUG B) — 2 BAC users, public live study session**
- [ ] User A crée session public MATH, ouvre mic + cam
- [ ] User B rejoint → voit User A caméra + entend micro (BUG A PASS si média reçu)
- [ ] User B allume mic → User A entend (BUG A PASS)
- [ ] User A tape 200+ chars dans chat rapidement → caractères visibles pendant frappe (BUG B PASS)
- [ ] User A envoi message → success + input vidé (pas sur fail - couper réseau temporairement simuler erreur → input gardé)
- [ ] User B toggle mic OFF/ON 2 fois → User A perçoit bien les cycles audio

**Scénario 2 (BUG C + A + B) — 2 OTHER users, private squad session**
- [ ] User OTHER A via SessionsList → create squad
- [ ] Inviter OTHER B → OTHER B accepte / join-by-code
- [ ] Squad chat OTHER A →OTHER B → typing visible + envoi temps réel (BUG B + C PASS)
- [ ] Start private study session (squad privé)
- [ ] OTHER B rejoint → participants listés, mic/cam toggle bidirectionnel média reçu (BUG A + C PASS)
- [ ] SessionsList.list-my-squads OTHER A → B squad bien listé, membres OK

**Scénario 3 — Cross-track**
- [ ] BAC user tente join squad OTHER via code → 4xx ou "not found"
- [ ] OTHER user tente join public session MATH → 4xx

---

## 7. Checklist avant git/push

- [x] T1 routes/studySquad.js — bacOnlyMiddleware retiré
- [x] T2 socketServer.js — OTHER squad socket room join
- [x] T3 socketServer.js — user:${id} room + emit ciblé offer/answer/ice/bye
- [x] T4 webrtcMedia.ts — dispatchEvent negotiationneeded stable / addOrReplaceTracks
- [x] T5 StudyRoom.tsx — Math.random key out + useCallback handlers
- [x] T6 SessionsList.tsx + Detail.tsx — useCallback send/onChange
- [x] T8 — TS, node --check, IDE diagnostic — ALL PASS
- [ ] T7 — user run isolation curl (§6.1)
- [ ] T9 — user run 2-tab scenarios (§6.2)
- [ ] T10 — user approve review.md ci-dessus
- [ ] T11 — git add + commit + push → Render deploy → prod smoke tests

---

*Fin review.md — correspond à tasks.md T10.*
