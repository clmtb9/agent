-- ============================================================================
-- MANDALA BRAIN — Seed : crée la grille complète (1 centre + 8 domaines + 64 actions)
-- pour l'utilisateur courant. Aucune donnée n'est dupliquée si relancé.
--
-- Usage : SQL Editor Supabase → colle TOUT ce fichier → Run.
-- Prérequis : 1) schema.sql déjà exécuté  2) ton compte créé (Authentication → Add User)
-- ============================================================================

do $$
declare
  -- Par défaut : le 1er utilisateur du projet (toi, app perso).
  -- Plusieurs comptes ? Colle ton UUID à la place :
  --   Authentication → Users → copier l'UUID → uid uuid := 'ton-uuid';
  uid uuid := (select id from auth.users order by created_at asc limit 1);
  center_id uuid;
  d_id uuid;
begin
  if uid is null then
    raise exception 'Aucun utilisateur trouvé. Crée d''abord ton compte : Authentication → Add User.';
  end if;

  -- ---------- CENTRE ----------
  insert into mandala_goals (user_id, level, code, title, full_text, color, position)
  values (uid, 'center', 'C0', 'CHARPENTIER-CONFIRME',
          'Fondations solides pour ma famille', '#1E293B', 0)
  on conflict do nothing
  returning id into center_id;

  if center_id is null then
    select id into center_id from mandala_goals
     where user_id = uid and level = 'center' limit 1;
  end if;

  -- ---------- B1 — Maîtriser les techniques de charpente ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B1', 'Maîtriser les techniques de charpente',
          '« La précision du geste fait la solidité de l''ouvrage. »', '#3B82F6', 1)
  on conflict do nothing
  returning id into d_id;
  select id into d_id from mandala_goals where user_id=uid and code='B1' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B1.1', 'Trait & dessin technique', 'Étudier le trait de charpente et le dessin technique 1 h 30, 1 séance par week-end (le samedi)', '#3B82F6', 1),
   (uid, d_id, 'action', 'B1.2', 'Logiciel de charpente', 'Pratiquer 1 h 30 toutes les deux semaines sur le logiciel de charpente (licence étudiant), le samedi des semaines paires', '#3B82F6', 2),
   (uid, d_id, 'action', 'B1.3', 'Contrôle des assemblages', 'Contrôler chaque assemblage avant de passer au suivant (équerrage, jeux, traits) et noter 1 point à améliorer par semaine', '#3B82F6', 3),
   (uid, d_id, 'action', 'B1.4', 'Structure complexe du mois', 'Étudier 1 structure complexe par mois (lucarne, croupe, tourelle, escalier) en la dessinant ou en la modélisant, pendant ma séance du week-end', '#3B82F6', 4),
   (uid, d_id, 'action', 'B1.5', 'Retour du patron', 'Demander un retour à mon patron à la fin de chaque chantier et noter ce qu''il m''a dit', '#3B82F6', 5),
   (uid, d_id, 'action', 'B1.6', 'Entretien des outils', 'Entretenir, affûter et régler mes outils 30 min, 1 fois par mois (et avant un examen pratique)', '#3B82F6', 6),
   (uid, d_id, 'action', 'B1.7', 'Épures chronométrées', 'Refaire de A à Z 1 à 2 épures par mois en atelier, en chronométrant mon temps', '#3B82F6', 7),
   (uid, d_id, 'action', 'B1.8', 'Visite d''ouvrages bois', 'Visiter 1 ouvrage bois ou 1 atelier de charpentier par trimestre', '#3B82F6', 8)
  on conflict do nothing;

  -- ---------- B2 — Obtenir mes certifications ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B2', 'Obtenir mes certifications',
          '« La reconnaissance de tes compétences t''ouvre toutes les portes. »', '#22C55E', 2)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B2' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B2.1', 'Suites après le BP', 'Me renseigner sur les suites possibles après le BP (Brevet de Maîtrise, titres pro, concours de meilleur apprenti) et noter 2 options d''ici fin décembre', '#22C55E', 1),
   (uid, d_id, 'action', 'B2.2', 'Révision de la techno', 'Réviser la technologie de la charpente (normes, calculs, vocabulaire) 30 min, 1 soir par semaine', '#22C55E', 2),
   (uid, d_id, 'action', 'B2.3', 'Simulations d''examen', 'Faire 1 simulation complète d''épreuve pratique (sujet d''annale, temps réel de l''examen) tous les 2 mois, en atelier', '#22C55E', 3),
   (uid, d_id, 'action', 'B2.4', 'Dossier de BP', 'Constituer mon dossier de BP en ajoutant 1 chantier ou 1 pièce par mois (photos, croquis, épures), dossier complet fin mai pour la remise début juin', '#22C55E', 4),
   (uid, d_id, 'action', 'B2.5', 'Planification hebdo', 'Planifier ma semaine chaque samedi soir (5 min) : noter dans mon agenda mes créneaux de trait, logiciel, techno et épure, avec une alarme', '#22C55E', 5),
   (uid, d_id, 'action', 'B2.6', 'Habilitations', 'Lister mes habilitations actuelles (SST, travail en hauteur, montage d''échafaudage) avec leur date de validité d''ici fin novembre, et passer celles qui manquent d''ici fin juin', '#22C55E', 6),
   (uid, d_id, 'action', 'B2.7', 'Certification logiciel', 'Me renseigner sur une certification de mon logiciel de charpente d''ici fin décembre, et la passer avant la fin de l''année scolaire si elle existe', '#22C55E', 7),
   (uid, d_id, 'action', 'B2.8', 'Réussir le BP', 'Réussir mon BP, avec la mention comme bonus si possible, et relever mes résultats après chaque contrôle', '#22C55E', 8)
  on conflict do nothing;

  -- ---------- B3 — Prendre des responsabilités sur chantier ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B3', 'Prendre des responsabilités sur chantier',
          '« Prendre des initiatives, c''est montrer que l''on est prêt à mener. »', '#F97316', 3)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B3' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B3.1', 'Liste matériel J-1', 'Établir ma liste de matériel et d''outillage 24h avant chaque chantier, la recouper avec celle de mon patron, puis charger', '#F97316', 1),
   (uid, d_id, 'action', 'B3.2', 'Briefing d''équipe', 'Faire un point de 10 minutes avec l''apprenti dès l''arrivée sur chantier (tâches du jour, ordre des opérations, répartition, consignes de sécurité)', '#F97316', 2),
   (uid, d_id, 'action', 'B3.3', 'Implantation & traçage', 'Réaliser moi-même l''implantation et le traçage d''au moins 1 nouveau chantier sur 2, avec vérification de mon patron avant de commencer, puis passer à tous les chantiers d''ici juin', '#F97316', 3),
   (uid, d_id, 'action', 'B3.4', 'Imprévu + solution', 'Face à un imprévu technique, noter le problème et au moins 1 solution avant d''appeler mon patron, puis lui présenter les deux ensemble', '#F97316', 4),
   (uid, d_id, 'action', 'B3.5', 'Journal de bord', 'Chaque jour, noter mon estimation de durée avant les tâches importantes, puis en fin de journée (5 min) le temps réel, l''avancement, les problèmes rencontrés et ce qu''il reste à faire', '#F97316', 5),
   (uid, d_id, 'action', 'B3.6', 'Check-list fin de chantier', 'Avant de quitter chaque chantier, contrôler ma check-list de fin de chantier (pièces serrées, protections en place, matériel complet, zone rangée) et prendre 3 photos de l''ouvrage terminé', '#F97316', 6),
   (uid, d_id, 'action', 'B3.7', 'Bilans vendredi / chantier', 'Chaque vendredi, faire seul mon bilan de la semaine à partir de mon journal de bord, et à la fin de chaque chantier présenter à mon patron un bilan de 5 minutes (travail fait, temps réel vs estimé, problèmes, reste à faire)', '#F97316', 7),
   (uid, d_id, 'action', 'B3.8', 'Assumer mes erreurs', 'Quand je fais une erreur, la signaler à mon patron dès que je la repère, dire ce qui s''est passé et comment je la corrige, puis la noter dans mon journal de bord avec la leçon à retenir', '#F97316', 8)
  on conflict do nothing;

  -- ---------- B4 — Apprendre à diriger une équipe ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B4', 'Apprendre à diriger une équipe',
          '« Un bon leader inspire, forme et élève ses coéquipiers. »', '#A855F7', 4)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B4' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B4.1', 'Consignes & contrôle', 'Donner chaque consigne importante en précisant le quoi, le comment et le pour quand, puis vérifier régulièrement le travail en cours (à chaque étape clé) pour corriger tôt si besoin', '#A855F7', 1),
   (uid, d_id, 'action', 'B4.2', 'Corriger à l''écart', 'Quand je dois corriger ou reprendre quelqu''un, le faire à l''écart des autres, en parlant du travail et non de la personne, sur un ton calme, en disant ce que j''attends à la place', '#A855F7', 2),
   (uid, d_id, 'action', 'B4.3', 'Donner du sens aux tâches', 'Quand je confie une tâche, expliquer à quoi elle sert, comment elle s''intègre dans l''ouvrage et quelle sera l''étape suivante, pour que la personne comprenne ce qu''elle fait et puisse anticiper', '#A855F7', 3),
   (uid, d_id, 'action', 'B4.4', 'Répartition & progression', 'Répartir les tâches selon les compétences de chacun et, quand c''est possible, confier à l''apprenti ou à un ouvrier une tâche légèrement plus exigeante en restant disponible pour l''aider', '#A855F7', 4),
   (uid, d_id, 'action', 'B4.5', 'Valoriser l''équipe', 'Chaque semaine, relever 1 bonne initiative ou 1 travail bien fait dans l''équipe et le dire à la personne en précisant ce qui était bien', '#A855F7', 5),
   (uid, d_id, 'action', 'B4.6', 'Livre leadership', 'Lire 1 livre sur le leadership ou la gestion d''équipe d''ici fin juin (15 min par soir ou quelques pages le week-end) et noter 1 idée à appliquer par chapitre', '#A855F7', 6),
   (uid, d_id, 'action', 'B4.7', 'Gérer les tensions', 'Quand une tension apparaît dans l''équipe, interrompre calmement le travail concerné, écouter chaque personne séparément, puis trancher en expliquant ma décision', '#A855F7', 7),
   (uid, d_id, 'action', 'B4.8', 'Exemplarité', 'Être exemplaire en termes de rythme, de ponctualité et de rigueur', '#A855F7', 8)
  on conflict do nothing;

  -- ---------- B5 — Gérer mes finances ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B5', 'Gérer mes finances',
          '« L''indépendance financière se bâtit pierre par pierre, euro par euro. »', '#EAB308', 5)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B5' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B5.1', 'Épargne auto 10 %', 'Mettre en place un virement automatique de 10 % de mon salaire le jour de la paie vers un compte d''épargne séparé, à augmenter après le BP', '#EAB308', 1),
   (uid, d_id, 'action', 'B5.2', 'Revue hebdo des dépenses', 'Chaque samedi soir, relire mes dépenses de la semaine sur mon appli bancaire (10 min), noter le total des dépenses variables et le comparer à mon budget du mois', '#EAB308', 2),
   (uid, d_id, 'action', 'B5.3', 'Fonds de sécurité 3 mois', 'Constituer un fonds de sécurité équivalent à 3 mois de charges d''ici fin 2028, alimenté par mon épargne automatique, avec un point de recalcul après le BP', '#EAB308', 3),
   (uid, d_id, 'action', 'B5.4', 'Règle des 48 h', 'Pour tout achat non prévu de plus de 30 €, attendre 48h avant de l''acheter, le noter dans mon téléphone et ne l''acheter que s''il est toujours utile après ce délai', '#EAB308', 4),
   (uid, d_id, 'action', 'B5.5', 'Bilan financier mensuel', 'Chaque mois, faire un bilan de mes finances (10 à 15 min) : charges fixes payées, dépenses variables, épargne virée, progression du fonds de sécurité, et ajuster mon budget du mois suivant', '#EAB308', 5),
   (uid, d_id, 'action', 'B5.6', 'Liste d''outils', 'Tenir une liste d''outils à acquérir classés par priorité (utilité sur chantier ou à l''examen) et acheter chaque outil quand le besoin est là, en le budgétant dans mon bilan mensuel', '#EAB308', 6),
   (uid, d_id, 'action', 'B5.7', 'Éducation financière', 'D''ici fin juin, lire 1 livre ou suivre 1 cours gratuit sur les bases de la finance personnelle (budget, épargne, crédit, assurances) et noter 1 idée à appliquer par chapitre ou module', '#EAB308', 7),
   (uid, d_id, 'action', 'B5.8', 'Négociation post-BP', 'Préparer d''ici fin mai un dossier d''arguments (BP, habilitations, responsabilités prises, journal de bord, retours de mon patron), puis demander un rendez-vous à mon patron à la fin de mon contrat pour parler de mon poste et de mon salaire après le BP', '#EAB308', 8)
  on conflict do nothing;

  -- ---------- B6 — Soigner ma santé physique ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B6', 'Soigner ma santé physique',
          '« Ton corps est ton premier outil de travail : protège-le pour durer. »', '#EF4444', 6)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B6' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B6.1', 'Gestes de manutention', 'Avant chaque manutention lourde (poutre, panne, matériel), appliquer 3 réflexes : plier les jambes, garder le dos droit, demander de l''aide ou utiliser un moyen de levage quand la charge est trop lourde pour moi seul', '#EF4444', 1),
   (uid, d_id, 'action', 'B6.2', 'Étirements du soir', 'Faire 10 minutes d''étirements et de mobilité (dos, hanches, épaules, poignets) chaque soir de travail, juste après la douche', '#EF4444', 2),
   (uid, d_id, 'action', 'B6.3', 'Renforcement musculaire', 'Faire 2 séances de 20 minutes par semaine à la maison (gainage, squats, fentes, pont fessier), sans matériel, en augmentant doucement', '#EF4444', 3),
   (uid, d_id, 'action', 'B6.4', 'Sommeil 22h15', 'Être couché à 22h15 au plus tard les soirs de travail pour dormir au moins 7h30, et poser mon téléphone 30 minutes avant', '#EF4444', 4),
   (uid, d_id, 'action', 'B6.5', 'Hydratation', 'Emporter 2 gourdes d''eau sur chantier chaque jour de travail, en finir une le matin et une l''après-midi, et boire davantage quand il fait chaud', '#EF4444', 5),
   (uid, d_id, 'action', 'B6.6', 'Repas du midi préparés', 'Préparer mes repas du midi à l''avance pour tous les jours de travail (le samedi pour plusieurs jours, ou la veille au soir), avec une source de protéines, des légumes et des féculents', '#EF4444', 6),
   (uid, d_id, 'action', 'B6.7', 'Protections (EPI)', 'Garder mes protections auditives et mon masque sur moi, et les mettre à chaque machine bruyante (scie, rabot, cloueur) ou tâche poussiéreuse (sciage, ponçage)', '#EF4444', 7),
   (uid, d_id, 'action', 'B6.8', 'Bilan kiné / ostéo', 'Prendre rendez-vous d''ici fin décembre chez un kiné ou un ostéopathe pour un bilan de mon dos, de mes épaules et de mes articulations, et lui demander 2 ou 3 exercices adaptés à mon métier', '#EF4444', 8)
  on conflict do nothing;

  -- ---------- B7 — Cultiver mes valeurs et mon caractère ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B7', 'Cultiver mes valeurs et mon caractère',
          '« La valeur d''un homme se mesure à sa parole et à sa tenue. »', '#78350F', 7)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B7' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B7.1', 'Tenir mes engagements', 'Noter chaque engagement pris dans la semaine (promesse, rendez-vous, service rendu) dans mon agenda, et vérifier chaque vendredi, pendant mon bilan, que je l''ai tenu', '#78350F', 1),
   (uid, d_id, 'action', 'B7.2', 'Respect de tous', 'Traiter chaque personne rencontrée avec respect et politesse', '#78350F', 2),
   (uid, d_id, 'action', 'B7.3', 'Décharge du soir', '3 à 4 soirs par semaine, faire 5 minutes de « décharge » dans mon journal : noter ce qui m''a frustré ou gêné dans la journée, nommer l''émotion, et décider d''une issue (en parler, laisser passer, ou aborder la personne concernée dans les 48h)', '#78350F', 3),
   (uid, d_id, 'action', 'B7.4', 'Écouter la critique', 'Quand je reçois une critique, écouter jusqu''au bout sans me justifier, noter ce que j''ai à en retenir, et décider d''1 changement concret avant la fin de la semaine', '#78350F', 4),
   (uid, d_id, 'action', 'B7.5', 'Honnêteté', 'Dire la vérité en toute situation : annoncer une mauvaise nouvelle (erreur, retard, oubli) dès que je la connais, et dire calmement mon désaccord au lieu de me taire', '#78350F', 5),
   (uid, d_id, 'action', 'B7.6', 'Rendre service', 'Rendre service sans attendre de contrepartie', '#78350F', 6),
   (uid, d_id, 'action', 'B7.7', 'Temps avec Dieu', 'Chaque soir, pendant les 30 minutes sans téléphone avant le coucher, faire un temps avec Dieu : prière, lecture et méditation', '#78350F', 7),
   (uid, d_id, 'action', 'B7.8', 'Discipline', 'Développer ma discipline personnelle en faisant ce qui doit être fait sans procrastiner', '#78350F', 8)
  on conflict do nothing;

  -- ---------- B8 — Préparer ma vie de couple et de famille ----------
  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position)
  values (uid, center_id, 'domain', 'B8', 'Préparer ma vie de couple et de famille',
          '« Construire son foyer demande la même rigueur que construire un édifice. »', '#94A3B8', 8)
  on conflict do nothing;
  select id into d_id from mandala_goals where user_id=uid and code='B8' limit 1;

  insert into mandala_goals (user_id, parent_id, level, code, title, full_text, color, position) values
   (uid, d_id, 'action', 'B8.1', 'Valeurs du foyer', 'Définir clairement mes critères et valeurs non négociables pour mon futur foyer', '#94A3B8', 1),
   (uid, d_id, 'action', 'B8.2', 'Présentation & hygiène', 'Prendre soin de ma présentation, de mon style et de mon hygiène au quotidien', '#94A3B8', 2),
   (uid, d_id, 'action', 'B8.3', 'Moment de qualité à deux', 'Chaque semaine, passer 1 moment de qualité avec ma partenaire, planifié à l''avance dans mon agenda (sortie, repas, activité à deux), téléphone rangé, avec un temps de prière partagé', '#94A3B8', 3),
   (uid, d_id, 'action', 'B8.4', 'Rangement & ménage', 'Chaque soir de travail, ranger 5 minutes (vaisselle, surfaces, vêtements), et chaque samedi faire 1 séance de ménage de 45 minutes (sols, salle de bain, cuisine, linge)', '#94A3B8', 4),
   (uid, d_id, 'action', 'B8.5', 'Communication de couple', 'D''ici fin juin, lire 1 livre ou suivre 1 cours sur la communication dans le couple, et appliquer 1 idée par mois avec ma partenaire', '#94A3B8', 5),
   (uid, d_id, 'action', 'B8.6', 'Recette du mois', 'Chaque mois, apprendre 1 nouvelle recette saine et la cuisiner pour ma partenaire ou pour moi, le samedi', '#94A3B8', 6),
   (uid, d_id, 'action', 'B8.7', 'Dimanche de repos', 'Garder chaque dimanche entier sans travail, sans révision et sans écran professionnel, réservé au repos, à ma partenaire ou à mes proches, et ne jamais le sacrifier pour une séance de trait ou un chantier', '#94A3B8', 7),
   (uid, d_id, 'action', 'B8.8', 'Point de couple mensuel', 'Chaque mois, prendre 30 minutes à deux (le dimanche) pour faire le point sur le couple : ce qui va bien, ce qui pèse, ce que chacun voudrait changer, et y dire ce que je garde pour moi au lieu de l''enfouir', '#94A3B8', 8)
  on conflict do nothing;

end $$;
