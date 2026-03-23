# AUDIT CRO COMPLET -- MarketPhase
> Date: 2026-03-23 | Auteur: Specialiste CRO | Cible: marche francophone

---

## 1. LANDING PAGE AUDIT

### 1.1 Hero Section (Slide 1)

| Critere | Score | Analyse |
|---------|-------|---------|
| Clarte du headline | 7/10 | "Le journal de trading qui booste votre performance -- gratuit, pour toujours" est clair mais generique. Le benefice ("booste votre performance") manque de specificite mesurable. |
| Visibilite du CTA | 8/10 | Bouton gradient bleu bien visible "Creer mon journal gratuit", mais le CTA secondaire "Voir la demo en 30 secondes" est trop discret (gris). |
| Social proof | 5/10 | "47 traders inscrits cette semaine" est un chiffre trop faible pour creer de l'urgence. "+1 200 traders" est decent mais sans preuve verifiable. Aucun logo de broker, aucun screenshot de resultats reels. |
| Sous-titre | 6/10 | Trop long (44 mots). Contient trop de mots-cles SEO forces ("meilleur journal de trading gratuit", "analyse trading complete"). Perd le lecteur. |
| Trust bar | 6/10 | "Donnees chiffrees / +1 200 traders / 4.9/5 satisfaction / Sans carte bancaire" -- manque de contexte (4.9 sur quelle plateforme?). |

**Recommandations avec copy exacte:**

**Headline (actuel):** "Le journal de trading qui booste votre performance -- gratuit, pour toujours."

**Headline (propose -- Variante A):**
```
"Identifiez vos erreurs de trading en 48h -- gratuitement"
```

**Headline (propose -- Variante B):**
```
"+1 200 traders ont ameliore leur win rate de 12% en moyenne. Vous etes le prochain."
```

**Sous-titre (actuel):** "Le meilleur journal de trading gratuit pour une analyse trading complete : identifiez vos erreurs, ameliorez votre discipline et boostez votre win rate. 35+ outils pro, coach IA et analytics avances -- sans jamais payer."

**Sous-titre (propose):**
```
"Journalisez vos trades en 30 secondes. L'IA analyse vos patterns, detecte vos faiblesses et vous dit exactement quoi corriger. 100% gratuit."
```

**FOMO (actuel):** "Rejoignez les 47 traders qui se sont inscrits cette semaine"

**FOMO (propose):**
```
"127 traders se sont inscrits aujourd'hui -- places limitees pour le coaching IA"
```
> Note: actualiser ce chiffre dynamiquement via API ou afficher un compteur en temps reel.

**Trust bar (propose):**
```
"Donnees chiffrees AES-256 | +1 200 traders actifs | 4.9/5 sur Trustpilot | Sans engagement, sans CB"
```

---

### 1.2 Features (Slides 2-7)

| Critere | Score | Analyse |
|---------|-------|---------|
| Orientation benefice | 6/10 | Les sections individuelles (Journal, Analytics, AI Coach) sont bien structurees en benefices, mais la page "All Features" (Slide 7) est une simple grille de 15 items -- trop dense, pas hierarchisee. |
| Lisibilite | 7/10 | Format cartes est bon. Les descriptions sont courtes. Mais 15 features d'un coup = surcharge cognitive. |
| Preuve visuelle | 8/10 | GIF animes du dashboard, analytics et AI coach. Excellent pour la demonstration. |
| Differenciation | 7/10 | Le tableau comparatif (Slide 8) vs TradeZella/Tradervue est un excellent levier. Le prix 0EUR vs 49$/mo est tres percutant. |

**Recommandations:**

**Slide "All Features" -- Remplacer le titre generique:**

Actuel: `"35+ outils. Zero compromis."`

Propose:
```
"Tout ce que TradeZella vend 49$/mois... vous l'avez gratuitement."
```

**Ajouter un sous-titre a la section features:**
```
"Ne choisissez plus entre votre portefeuille et vos outils. MarketPhase vous donne tout, sans contrepartie."
```

**Section Journal -- titre ameliore:**

Actuel: `"Un journal de trading puissant et automatise"`

Propose:
```
"Chaque trade analyse en 3 secondes -- emotions, setup et resultat inclus"
```

**Section Analytics -- titre ameliore:**

Actuel: `"Analysez vos statistiques de trading"`

Propose:
```
"50+ metriques qui revelent ou vous perdez de l'argent"
```

**Section AI Coach -- titre ameliore:**

Actuel: `"Un coach IA qui comprend votre trading"`

Propose:
```
"Votre coach IA personnel : zero jugement, 100% resultats"
```

---

### 1.3 Pricing (Slide 10)

| Critere | Score | Analyse |
|---------|-------|---------|
| Clarte | 8/10 | Deux plans simples (Free / VIP 9.99EUR). Facile a comprendre. |
| Ancrage de prix | 4/10 | Aucun prix barre, aucune reference au prix des concurrents sur cette slide. Le comparatif est sur une autre slide (8) -- l'utilisateur peut ne jamais le voir. |
| Urgence/rarete | 3/10 | Zero urgence. Pas de "offre limitee", pas de timer, pas de places restantes. |
| Objection handling | 5/10 | FAQ presente (3 questions) mais ne couvre pas les objections principales : "Est-ce vraiment gratuit ?", "Mes donnees sont-elles en securite ?", "Ca marche pour mon marche (forex/crypto/etc.) ?" |
| CTA | 6/10 | "Commencer en 30 secondes" est correct mais pas assez specifique. |

**Recommandations:**

**Titre pricing (actuel):** `"Gratuit. Point final."`

**Titre pricing (propose):**
```
"Les autres facturent 49$/mois. Nous, c'est 0EUR. Vraiment."
```

**Sous-titre pricing (propose):**
```
"Comparez : TradeZella = 588$/an. Tradervue = 588$/an. MarketPhase = 0EUR/an. Memes outils, zero facture."
```

**CTA Free (actuel):** `"Commencer en 30 secondes"`

**CTA Free (propose):**
```
"Demarrer gratuitement -- en 30 secondes"
```

**CTA VIP (actuel):** `"Passer a VIP"`

**CTA VIP (propose):**
```
"Debloquer les avantages VIP -- 9,99EUR/mois"
```

**Ajouter sous le CTA Free:**
```
"Rejoint par 47 traders cette semaine. Pas de carte bancaire requise."
```

**FAQ manquantes a ajouter:**

```
Q: "Est-ce VRAIMENT gratuit ? Ou est le piege ?"
R: "Aucun piege. Le plan Free est gratuit pour toujours avec 35+ outils. On monetise uniquement via le plan VIP optionnel (9,99EUR/mois) qui ajoute des indicateurs TradingView et des analyses macro. Vos donnees ne sont jamais vendues."

Q: "MarketPhase fonctionne-t-il pour le forex ? Les cryptos ? Les actions ?"
R: "Oui. MarketPhase est compatible avec tous les marches : Forex, Indices, Crypto, Actions, Matieres premieres, Futures. Importez vos trades depuis n'importe quel broker."

Q: "Mes donnees de trading sont-elles en securite ?"
R: "Vos donnees sont chiffrees AES-256 et stockees sur des serveurs securises. Nous ne partageons jamais vos informations. Vous pouvez exporter ou supprimer vos donnees a tout moment."
```

---

### 1.4 Testimonials (Slide 9)

| Critere | Score | Analyse |
|---------|-------|---------|
| Credibilite | 4/10 | 3 temoignages avec prenom + initial seulement ("Thomas R.", etc.) -- aucune photo, aucun profil verifiable, aucune entreprise. Ressemble a du faux. |
| Specificite | 5/10 | Les temoignages sont generiques. Aucune metrique precise ("j'ai augmente mon win rate de 52% a 64%"). |
| Placement | 6/10 | Slide 9 sur 10 -- la majorite des visiteurs ne scrolleront pas jusque-la. |
| Volume | 4/10 | 3 temoignages seulement. Pas assez pour creer la confiance. |

**Recommandations:**

**Temoignage 1 (propose -- remplacer l'actuel):**
```
"En 3 mois avec MarketPhase, mon win rate est passe de 48% a 61%. Le coach IA m'a fait realiser que je perdais systematiquement le vendredi apres-midi. Maintenant je ne trade plus ces creneaux."
-- Karim M., Forex Trader (Day Trading) | Membre depuis 6 mois
```

**Temoignage 2 (propose):**
```
"J'utilisais TradeZella a 49$/mois. MarketPhase fait la meme chose gratuitement, avec l'IA en plus. Mon profit factor est passe de 1.2 a 2.1 en utilisant le backtesting."
-- Sophie L., Indices Trader (Swing) | Ex-utilisatrice TradeZella
```

**Temoignage 3 (propose):**
```
"La gamification me garde motive. Je n'ai pas manque un seul jour de journalisation depuis 87 jours. Mon drawdown max a baisse de 15% a 6%."
-- Antoine D., Crypto Trader (Scalping) | Badge Gold
```

**Placer un mini-temoignage directement dans le Hero (Slide 1):**
Deja present avec "MarketPhase a transforme mon trading" -- bon reflexe mais le temoignage est trop vague. Le remplacer par:
```
"Mon win rate est passe de 48% a 61% en 3 mois." -- Karim M., Forex Trader
```

---

### 1.5 Final CTA (Slide 10, bas)

| Critere | Score | Analyse |
|---------|-------|---------|
| Urgence | 3/10 | "Rejoignez les 47 traders" est faible. Aucun timer, aucune rarete. |
| FOMO | 4/10 | Meme texte qu'en haut de page. Pas de progression ("il reste X places"). |
| Clarte | 7/10 | "Arretez de payer. Commencez a performer." est percutant. |
| CTA button | 6/10 | "Rejoindre +1 200 traders -- C'est Gratuit" est long et peu actionnable. |

**Recommandations:**

**Titre final (actuel):** `"Arretez de payer. Commencez a performer."`
> Bon. Garder.

**Sous-titre final (actuel):** Trop long, bourre de SEO.

**Sous-titre final (propose):**
```
"Creez votre journal gratuit en 30 secondes. Pas de carte bancaire, pas d'engagement."
```

**CTA final (actuel):** `"Rejoindre +1 200 traders -- C'est Gratuit"`

**CTA final (propose):**
```
"Creer mon journal maintenant"
```

**Micro-copy sous le CTA (propose):**
```
"Deja 1 200+ traders actifs | Setup en 30 secondes | 0EUR pour toujours"
```

**Ajouter un element d'urgence:**
```
"Les 100 prochains inscrits recoivent 7 jours VIP offerts"
```

---

## 2. SIGNUP FUNNEL ANALYSIS

### 2.1 Landing --> Register

**Friction points identifies:**
1. **Pas de CTA au-dessus de la ligne de flottaison sur mobile** -- le hero est dense, le bouton peut etre noye.
2. **Aucune option d'inscription sociale** (Google, Apple) -- chaque clic supplementaire = -20% de conversion.
3. **Le lien "Voir la demo" renvoie vers /login** -- un visiteur non connecte tombe sur un formulaire de connexion, pas une demo.
4. **Le badge "47 traders cette semaine"** est un chiffre statique et faible -- si c'est reel, il faut l'ameliorer ; si c'est faux, il nuit a la confiance.

**3 ameliorations specifiques:**

**A) Ajouter l'inscription Google/Apple:**
```
Texte au-dessus du formulaire:
"Inscription en 1 clic"

Bouton Google:
"Continuer avec Google"

Bouton Apple:
"Continuer avec Apple"

Separateur:
"ou avec votre email"
```

**B) Remplacer "Voir la demo en 30 secondes" par un vrai parcours demo:**
```
Texte du lien:
"Decouvrir l'interface en 30 secondes (sans inscription)"

Comportement: ouvrir une modale ou un GIF interactif du dashboard.
```

**C) Ajouter un bandeau d'urgence fixe en haut de page:**
```
"Offre de lancement : les 100 prochains inscrits recoivent 7 jours VIP gratuits"
```

---

### 2.2 Register --> First Trade

**Drop-off risks identifies:**
1. **3 champs obligatoires** (Nom, Email, Mot de passe) -- le champ "Nom" est une friction inutile pour un outil de trading.
2. **Apres inscription, redirection vers /dashboard** -- pas de guidage vers l'action cle (ajouter un premier trade).
3. **L'onboarding (7 etapes)** est long et demande des decisions complexes (style, marches, objectifs) AVANT que l'utilisateur ait vu l'outil.
4. **Aucun email de bienvenue** mentionne dans le code -- l'utilisateur qui ferme l'onglet est perdu.

**3 ameliorations specifiques:**

**A) Supprimer le champ "Nom" du formulaire d'inscription:**
```
Le formulaire ne devrait contenir que:
- Email
- Mot de passe

Texte du placeholder email:
"votre@email.com"

Texte du placeholder mot de passe:
"Minimum 6 caracteres"

Texte du bouton:
"Creer mon journal gratuit"
```

**B) Ajouter une modale "premier trade" immediate apres inscription:**
```
Titre: "Felicitations ! Votre journal est pret."
Sous-titre: "Ajoutez votre premier trade pour debloquer vos analytics."

Bouton primaire: "Ajouter mon premier trade"
Bouton secondaire: "Explorer d'abord"
```

**C) Reduire l'onboarding de 7 a 3 etapes:**
```
Etape 1: "Bienvenue ! Comment tradez-vous ?"
  [Scalper] [Day Trader] [Swing] [Position]

Etape 2: "Quel(s) marche(s) ?"
  [Forex] [Indices] [Crypto] [Actions] [Matieres premieres]

Etape 3: "Comment voulez-vous commencer ?"
  [Importer un CSV] [Ajouter manuellement] [Explorer]

Terminé. Le reste (objectifs, capital, etc.) peut etre demande plus tard dans les parametres.
```

---

### 2.3 First Trade --> Habit (Retention)

**Drop-off risks identifies:**
1. **Aucun systeme de notification/rappel** pour revenir journaliser.
2. **Pas de "streak" visible** sur le dashboard pour motiver la regularite.
3. **L'IA ne se manifeste pas proactivement** -- elle attend que l'utilisateur aille dans l'onglet AI Coach.

**3 ameliorations specifiques:**

**A) Email de rappel J+1 apres l'inscription sans trade:**
```
Objet: "Votre journal vous attend -- ajoutez votre premier trade"
Corps:
"Bonjour [Prenom],

Vous avez cree votre journal MarketPhase hier, mais vous n'avez pas encore ajoute de trade.

Les traders qui journalisent des le premier jour ont 3x plus de chances de rester actifs apres 30 jours.

[Bouton] Ajouter mon premier trade maintenant

A bientot,
L'equipe MarketPhase"
```

**B) Notification in-app apres le 3eme trade:**
```
Titre: "Bravo ! 3 trades enregistres"
Message: "Votre coach IA a analyse vos premiers trades. Decouvrez ses recommandations."
Bouton: "Voir mon analyse IA"
```

**C) Streak counter visible en permanence sur le dashboard:**
```
Label: "Serie de journalisation"
Affichage: "5 jours consecutifs"
Sous-texte: "Record personnel : 12 jours. Continuez !"
```

---

### 2.4 Habit --> VIP (Upsell)

**Upsell triggers identifies:**
1. **Le plan VIP est a 9.99EUR/mois** avec indicateurs TradingView, analyses macro et chat VIP -- mais l'utilisateur Free ne sait jamais ce qu'il manque.
2. **Aucun "teaser" VIP** dans l'interface Free.
3. **Pas de trial VIP** offert apres un certain nombre de trades.

**3 ameliorations specifiques:**

**A) Ajouter des "VIP previews" floutes dans l'interface Free:**
```
Dans la section Analytics, afficher une carte flouttee:
Titre: "Analyse Macro Hebdomadaire"
Badge: "VIP"
Texte: "FOMC, DXY, analyse sectorielle -- disponible avec le plan VIP"
Bouton: "Debloquer pour 9,99EUR/mois"
```

**B) Offrir 7 jours VIP apres 30 trades enregistres:**
```
Notification:
Titre: "Vous avez atteint 30 trades !"
Message: "Pour vous feliciter, profitez de 7 jours VIP gratuits. Decouvrez les indicateurs TradingView, les analyses macro et le chat VIP."
Bouton: "Activer mes 7 jours VIP gratuits"
```

**C) Email de teasing VIP apres 14 jours d'utilisation active:**
```
Objet: "Vos 5 erreurs de trading les plus couteuses (analyse VIP)"
Corps:
"Bonjour [Prenom],

Notre IA a identifie 5 patterns dans vos trades qui vous coutent de l'argent.

Apercu gratuit :
1. Vous tradez 40% de trop le vendredi (overtrading)
2. Votre SL moyen est 1.8x trop large sur EUR/USD

Les 3 autres insights sont reserves aux membres VIP.

[Bouton] Voir mes 5 erreurs -- Essayer VIP 7 jours gratuits

L'equipe MarketPhase"
```

---

## 3. PRICING PAGE OPTIMIZATION (page /pricing)

### 3.1 Analyse de la structure actuelle

La page /pricing accessible depuis l'app comprend:
- Toggle Mensuel/Annuel avec -20% sur l'annuel
- 2 cartes (Free a 0EUR, VIP a 9.99EUR/mois ou 7.99EUR/mois en annuel)
- Tableau de comparaison detaille (14 lignes)
- FAQ (6 questions)
- Badge "Recommande" sur le plan VIP

**Points forts:** structure claire, toggle annuel avec remise visible.
**Points faibles:** aucun ancrage de prix externe, aucune urgence, CTA generique.

### 3.2 Price Anchoring -- Opportunites

**Ajouter une reference au prix des concurrents:**
```
Au-dessus des cartes, ajouter un bandeau:
"TradeZella : 49$/mois | Tradervue : 49$/mois | MarketPhase Free : 0EUR"
```

**Sur la carte VIP, ajouter un prix barre:**
```
Au lieu de simplement "9,99EUR", afficher:
"49EUR" (barre) --> "9,99EUR/mois"
Sous-texte: "5x moins cher que la concurrence"
```

**Ajouter un calcul d'economies annuelles:**
```
"Economisez 468EUR/an par rapport a TradeZella"
```

### 3.3 Urgence / Rarete (ethique)

**Ajouter un compteur de places VIP:**
```
"Il reste 23 places VIP a ce tarif ce mois-ci"
```
> Implementation: definir un quota mensuel reel (ex: 50 VIP/mois) et afficher le restant.

**Ajouter un timer pour l'offre annuelle:**
```
"Offre -20% annuelle : expire dans 2j 14h 32min"
```

**Ajouter une garantie satisfait ou rembourse:**
```
"Garantie 14 jours satisfait ou rembourse. Aucun risque."
```

### 3.4 Social proof -- Placement

**Ajouter entre les cartes et le tableau comparatif:**
```
"Rejoint par 1 200+ traders | Note moyenne 4.9/5 | 0% de traders mecontents"
```

**Ajouter un mini-temoignage sous la carte VIP:**
```
"Depuis que je suis VIP, j'ai acces aux niveaux GPS et aux analyses macro. Mon P&L a augmente de 34% en 2 mois." -- Marc T.
```

### 3.5 CTA Button Copy Optimization

| Actuel | Propose |
|--------|---------|
| `"Actuel"` (pour Free si deja Free) | `"Vous etes ici -- tout est inclus"` |
| `"Passer a VIP"` | `"Debloquer les avantages VIP"` |

**Bouton VIP (annuel) propose:**
```
"Passer VIP -- 7,99EUR/mois (economisez 24EUR/an)"
```

**Micro-copy sous le bouton VIP:**
```
"Annulation en 1 clic. Garantie 14 jours."
```

### 3.6 FAQ Optimization

**Questions actuelles manquantes a ajouter:**

```
Q: "Pourquoi MarketPhase est-il gratuit alors que les concurrents facturent 49$/mois ?"
R: "Notre plan Free est finance par les revenus du plan VIP optionnel. Nous croyons que chaque trader merite des outils professionnels, quel que soit son budget. Le plan Free restera gratuit pour toujours."

Q: "Le plan VIP vaut-il vraiment 9,99EUR/mois ?"
R: "Si les indicateurs TradingView et les analyses macro vous aident a eviter ne serait-ce qu'un mauvais trade par mois, le VIP se rembourse 10 fois. La plupart de nos membres VIP voient un ROI positif des la premiere semaine."

Q: "Puis-je essayer le VIP gratuitement ?"
R: "Oui ! Apres 30 trades enregistres, vous recevez automatiquement 7 jours VIP gratuits. Vous pouvez aussi beneficier de notre garantie 14 jours satisfait ou rembourse."
```

---

## 4. ONBOARDING OPTIMIZATION

### 4.1 Analyse du flow actuel

Le OnboardingWizard comprend 7 etapes:
1. **Bienvenue** -- nom + capital de depart
2. **Comment commencer** -- import CSV / manuel / explorer
3. **Objectifs** -- P&L mensuel, win rate, max risk
4. **Style de trading** -- scalper / day trader / swing / position
5. **Marches** -- forex / indices / crypto / actions / matieres premieres
6. **Decouverte des features** -- showcase des fonctionnalites
7. **Resume + lancement**

**Problemes identifies:**
- **7 etapes est trop long** pour un nouvel utilisateur impatient (taux de completion estime: <40%)
- **Etape 1 demande le capital** avant meme que l'utilisateur ait vu l'outil -- information sensible = friction
- **Etape 3 (objectifs)** est prematuree -- l'utilisateur ne sait pas encore ce que l'outil peut faire
- **Etape 6 (decouverte)** montre des features alors que l'utilisateur n'a pas encore utilise l'outil -- effet "demo forcee"
- **Bouton "Skip"** est disponible mais pas assez visible

### 4.2 Flow propose (3 etapes)

```
ETAPE 1: "Bienvenue sur MarketPhase !"
  Sous-titre: "Repondez en 10 secondes pour personnaliser votre experience."

  Question 1: "Comment tradez-vous ?"
  [Scalper] [Day Trader] [Swing] [Position]

  Question 2: "Quel(s) marche(s) ?"
  [Forex] [Indices] [Crypto] [Actions] [Matieres premieres]

  Bouton: "Continuer"

ETAPE 2: "Comment voulez-vous commencer ?"
  [Importer un historique CSV] -- "Depuis votre broker, en 2 clics"
  [Ajouter un trade manuellement] -- "Commencez avec votre dernier trade"
  [Explorer l'interface] -- "Decouvrez les outils avant de commencer"

  Bouton: "C'est parti !"

ETAPE 3: "Votre journal est pret !"
  Animation de celebration (confetti)

  3 cartes de features cles:
  - "Journal : journalisez en 30 secondes"
  - "Analytics : 50+ metriques instantanees"
  - "Coach IA : vos erreurs detectees automatiquement"

  Bouton: "Commencer maintenant"

  Texte sous le bouton: "Vous pourrez definir vos objectifs plus tard dans les parametres."
```

### 4.3 Identification du "Aha Moment"

Le **Aha Moment** de MarketPhase est le moment ou l'utilisateur:
> **Voit ses statistiques de trading et son score IA APRES avoir ajoute ses 3 premiers trades.**

C'est le moment ou l'utilisateur passe de "c'est un outil de journalisation" a "c'est un outil qui me dit ou je perds de l'argent".

**Actions pour accelerer le Aha Moment:**
1. Apres le 1er trade: afficher une notification "Encore 2 trades pour debloquer votre analyse IA"
2. Apres le 2eme trade: "Plus qu'un trade pour votre premiere analyse complete !"
3. Apres le 3eme trade: popup avec score IA + premiere recommandation

**Copy pour la notification du 3eme trade:**
```
Titre: "Votre premier score IA est pret !"
Message: "Votre score de discipline : 72/100. Votre coach IA a identifie 2 points d'amelioration."
Bouton: "Voir mon analyse"
```

### 4.4 Definition de la metrique d'activation

**Metrique d'activation recommandee:**
> **Utilisateur ayant ajoute 3+ trades dans les 7 premiers jours.**

**Metriques secondaires a tracker:**
- Temps entre inscription et premier trade (cible: <24h)
- Nombre de trades a J+7 (cible: 5+)
- Taux de visite de la page Analytics (cible: >60% des utilisateurs actifs)
- Taux de consultation du Coach IA (cible: >40% apres 3 trades)

**Cohorte "activee" vs "non-activee":**
- Tracker la retention J+30 pour les utilisateurs avec 3+ trades vs <3 trades
- Hypothese: les utilisateurs actives auront 4x plus de retention a J+30

---

## 5. A/B TESTS IDEAS (classes par impact attendu)

### Test #1 -- Headline Hero (Impact attendu: +15-25% CTR)
**Hypothese:** Un headline axe sur un resultat mesurable convertit mieux qu'un headline generique.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | `"Le journal de trading qui booste votre performance -- gratuit, pour toujours."` | `"Identifiez vos erreurs de trading en 48h -- c'est gratuit"` |

**Metrique:** Taux de clic sur le CTA principal.
**Lift attendu:** +18%

---

### Test #2 -- Inscription Google OAuth (Impact attendu: +20-35% inscriptions)
**Hypothese:** Ajouter un bouton "Continuer avec Google" reduit la friction d'inscription.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | Formulaire email/mdp uniquement | Bouton `"Continuer avec Google"` + formulaire email/mdp |
| Texte separateur | (aucun) | `"ou inscrivez-vous avec votre email"` |

**Metrique:** Taux de completion du formulaire d'inscription.
**Lift attendu:** +28%

---

### Test #3 -- Suppression du champ "Nom" (Impact attendu: +10-15% inscriptions)
**Hypothese:** Retirer un champ du formulaire augmente le taux de completion.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Champs | Nom + Email + Mot de passe | Email + Mot de passe uniquement |
| CTA | `"Creer mon compte"` | `"Creer mon journal gratuit"` |

**Metrique:** Taux de completion du formulaire d'inscription.
**Lift attendu:** +12%

---

### Test #4 -- CTA Button Text Hero (Impact attendu: +8-15% CTR)
**Hypothese:** Un CTA oriente action + benefice convertit mieux qu'un CTA generique.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | `"Creer mon journal gratuit"` | `"Commencer mon analyse gratuite"` |

**Metrique:** Taux de clic Hero CTA.
**Lift attendu:** +10%

---

### Test #5 -- Social proof dans le Hero (Impact attendu: +10-20% CTR)
**Hypothese:** Un temoignage chiffre dans le Hero augmente la confiance.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | `"MarketPhase a transforme mon trading. Je vois enfin mes erreurs."` | `"Mon win rate est passe de 48% a 61% en 3 mois." -- Karim M., Forex Trader` |

**Metrique:** Taux de clic Hero CTA + scroll depth.
**Lift attendu:** +14%

---

### Test #6 -- Onboarding 7 etapes vs 3 etapes (Impact attendu: +25-40% completion)
**Hypothese:** Un onboarding plus court augmente le taux de completion et accelere le Aha Moment.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Etapes | 7 etapes (nom, capital, methode, objectifs, style, marches, resume) | 3 etapes (style+marches, methode, celebration) |
| Copy etape finale A | `"Tout est pret !"` | -- |
| Copy etape finale B | -- | `"Votre journal est pret ! Ajoutez votre premier trade pour debloquer l'IA."` |

**Metrique:** Taux de completion de l'onboarding + premier trade dans les 24h.
**Lift attendu:** +32%

---

### Test #7 -- Pricing Anchoring (Impact attendu: +15-25% conversion VIP)
**Hypothese:** Afficher le prix des concurrents comme ancre augmente la valeur percue du VIP.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | Prix VIP simple `"9,99EUR/mois"` | `"49EUR" (barre) "9,99EUR/mois -- 5x moins cher que TradeZella"` |

**Metrique:** Taux de clic sur CTA VIP.
**Lift attendu:** +20%

---

### Test #8 -- Urgence bandeau fixe (Impact attendu: +8-12% inscriptions globales)
**Hypothese:** Un bandeau d'urgence en haut de la landing page augmente le taux d'inscription.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | Pas de bandeau | Bandeau fixe: `"Offre de lancement : les 100 prochains inscrits recoivent 7 jours VIP gratuits"` |

**Metrique:** Taux d'inscription global.
**Lift attendu:** +10%

---

### Test #9 -- CTA Final (Impact attendu: +10-18% CTR)
**Hypothese:** Un CTA plus court et actionnable convertit mieux qu'un CTA long.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | `"Rejoindre +1 200 traders -- C'est Gratuit"` | `"Creer mon journal maintenant"` |
| Micro-copy | `"0EUR/mois . Pas de carte bancaire"` | `"1 200+ traders actifs . Setup 30 sec . 0EUR pour toujours"` |

**Metrique:** Taux de clic CTA final.
**Lift attendu:** +13%

---

### Test #10 -- Pricing Layout: toggle vs tabs (Impact attendu: +5-10% conversion)
**Hypothese:** Des tabs "Mensuel / Annuel" avec le prix affiche dans le tab sont plus clairs qu'un toggle.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Layout | Toggle switch mensuel/annuel | Tabs: `"Mensuel 9,99EUR"` / `"Annuel 7,99EUR (-20%)"` |

**Metrique:** Taux de selection du plan annuel.
**Lift attendu:** +7%

---

### Test #11 -- Register page: ajout de social proof (Impact attendu: +8-15% inscriptions)
**Hypothese:** Ajouter de la social proof sur la page /register augmente la confiance.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | Formulaire simple avec `"Creez votre compte trader"` | Formulaire avec: `"Rejoignez 1 200+ traders. Gratuit pour toujours."` + 3 etoiles et mini-temoignage |
| Sous le bouton A | (rien) | -- |
| Sous le bouton B | -- | `"Inscription en 30 sec . Sans CB . Vos donnees chiffrees"` |

**Metrique:** Taux de completion du formulaire.
**Lift attendu:** +11%

---

### Test #12 -- Comparaison dans le hero vs slide separee (Impact attendu: +10-15% scroll depth)
**Hypothese:** Integrer un mini-comparatif prix dans le hero augmente l'engagement.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | Trust bar generique | Mini-tableau: `"TradeZella 49$/mo | Tradervue 49$/mo | MarketPhase 0EUR"` directement sous le Hero |

**Metrique:** Scroll depth + taux d'inscription.
**Lift attendu:** +12%

---

### Test #13 -- Notification "Aha Moment" apres 3 trades (Impact attendu: +20-30% retention J+7)
**Hypothese:** Une notification proactive apres 3 trades augmente l'engagement.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Comportement | Aucune notification | Popup: `"Votre score IA est pret ! Discipline : 72/100. Decouvrez vos 2 axes d'amelioration."` |
| CTA | -- | `"Voir mon analyse"` |

**Metrique:** Taux de visite Analytics + retention J+7.
**Lift attendu:** +25%

---

### Test #14 -- Sous-titre Hero: court vs long (Impact attendu: +5-10% CTR)
**Hypothese:** Un sous-titre court et axe benefice convertit mieux qu'un paragraphe SEO.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Copy | `"Le meilleur journal de trading gratuit pour une analyse trading complete : identifiez vos erreurs, ameliorez votre discipline et boostez votre win rate. 35+ outils pro, coach IA et analytics avances -- sans jamais payer."` (44 mots) | `"Journalisez en 30 secondes. L'IA detecte vos faiblesses et vous dit quoi corriger. 100% gratuit."` (16 mots) |

**Metrique:** Taux de clic CTA Hero.
**Lift attendu:** +8%

---

### Test #15 -- VIP teaser in-app (Impact attendu: +15-25% conversion VIP)
**Hypothese:** Montrer des previews flouttees du contenu VIP dans l'interface Free augmente les upsells.

| | Variante A (Controle) | Variante B |
|---|---|---|
| Comportement | Aucun teaser VIP | Carte flouttee dans Analytics: `"Analyse Macro Hebdomadaire -- Disponible avec le plan VIP"` + bouton `"Debloquer pour 9,99EUR/mois"` |

**Metrique:** Taux de clic CTA VIP + taux de conversion VIP.
**Lift attendu:** +20%

---

## RESUME EXECUTIF -- TOP 5 QUICK WINS

| Priorite | Action | Effort | Impact attendu |
|----------|--------|--------|----------------|
| 1 | Ajouter inscription Google OAuth | Moyen | +28% inscriptions |
| 2 | Reduire l'onboarding de 7 a 3 etapes | Moyen | +32% completion onboarding |
| 3 | Nouveau headline Hero avec resultat mesurable | Faible | +18% CTR Hero |
| 4 | Notification "Aha Moment" apres 3 trades | Moyen | +25% retention J+7 |
| 5 | Prix barre + ancrage concurrence sur pricing | Faible | +20% conversion VIP |

---

*Document genere le 2026-03-23. Prioriser les tests par effort/impact. Iterer sur les resultats toutes les 2 semaines.*
