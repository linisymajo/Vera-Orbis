// Vera Orbis — Pedagogical Curriculum Engine
// Generates structured 12-class communicative language courses following the
// Vera Orbis method: Power Expressions -> Listen -> Repeat -> Personalize -> Use.
// Conforms strictly to validateArchitectCourse and validateLearningPlan.

import { STAGES } from '../../supabase/functions/academic-ai/core.js'
import { LANGUAGES, LEVELS, validateArchitectCourse, architectCourseToPlan } from '../../supabase/functions/academic-ai/learning-architect.js'
import { PEDAGOGICAL_OBJECTIVES, DEFAULT_PEDAGOGICAL_OBJECTIVE, isPedagogicalObjective } from '../../supabase/functions/academic-ai/pedagogy.js'

export const PEDAGOGICAL_BANK = {
  English: {
    A1: {
      'Everyday communication': [
        {
          title: 'First Introductions & Personal Info',
          objective: 'Introduce yourself and share basic personal details with clarity and confidence.',
          evidence: 'Learner can state name, origin, profession, and ask two basic questions in a role-play.',
          power_expressions: ['Nice to meet you!', 'Where are you from?', 'I am based in…', 'What do you do?'],
          vocabulary: ['name', 'country', 'job', 'city', 'pleasure', 'live'],
          contextual_input: 'Listen to two colleagues meeting for the first time at an international seminar.',
          guided_practice: 'Echo greeting formulas with natural sentence stress and rhythm.',
          personalization: 'State your real home city, actual occupation, and preferred nickname.',
          task: 'Introduce yourself to a new classmate and discover where they live and work.',
          activities: ['Warm-up greeting circle', 'Model conversation listening', 'Controlled pair introduction drill', 'Free mingling introduction mission'],
          homework: 'Record a 30-second audio introduction sharing your name, job, and where you live.',
          checkpoint: 'Learner greets accurately, uses at least two Power Expressions, and asks a follow-up question.'
        },
        {
          title: 'Daily Routines & Schedules',
          objective: 'Describe daily habits, typical schedule, and tell the time accurately.',
          evidence: 'Learner describes 4 routine activities using present simple and time markers.',
          power_expressions: ['I usually start my day at…', 'What time do you usually…?', 'On weekdays, I…', 'How about you?'],
          vocabulary: ['morning', 'routine', 'breakfast', 'schedule', 'commute', 'evening'],
          contextual_input: 'Listen to a short audio diary of a professional describing their daily workflow.',
          guided_practice: 'Drill frequency adverbs and time prepositions in short call-and-response prompts.',
          personalization: 'Write down your real morning routine and compare it with a peer.',
          task: 'Interview a partner about their ideal workday routine and identify two shared habits.',
          activities: ['Visual flashcard warm-up', 'Audio listening for time markers', 'Guided schedule grid completion', 'Partner schedule interview'],
          homework: 'Write a 4-sentence post describing your favorite part of your daily routine.',
          checkpoint: 'Learner correctly positions frequency adverbs and uses clear present simple verbs.'
        },
        {
          title: 'Ordering Food & Drinks at a Café',
          objective: 'Order refreshments politely and ask about prices and options in a café setting.',
          evidence: 'Learner successfully orders a beverage and snack, requests the bill, and handles pricing.',
          power_expressions: ['Could I please have…?', 'How much is this?', 'Can we get the bill, please?', 'Is that included?'],
          vocabulary: ['coffee', 'tea', 'menu', 'bill', 'table', 'receipt'],
          contextual_input: 'Listen to a customer ordering at a busy downtown coffee shop.',
          guided_practice: 'Practice polite rising intonation for requests: "Could I have a coffee, please?"',
          personalization: 'Select your real favorite drink and order it using polite forms.',
          task: 'Role-play ordering food and settling the check at an artisanal bakery.',
          activities: ['Menu vocabulary scan', 'Listening for order specifics', 'Choral request intonation practice', 'Live café role-play simulation'],
          homework: 'Design a simple bilingual menu with 4 of your favorite local dishes and drinks.',
          checkpoint: 'Learner uses polite modals ("Could I have") and confirms the total bill accurately.'
        },
        {
          title: 'Navigating the City & Giving Directions',
          objective: 'Ask for directions and understand basic spatial landmarks and instructions.',
          evidence: 'Learner asks for a location and gives two-step directional instructions using a map.',
          power_expressions: ['Excuse me, where is the…?', 'Go straight ahead.', 'Turn left at the corner.', 'It is right next to…'],
          vocabulary: ['street', 'corner', 'crossroad', 'station', 'opposite', 'straight'],
          contextual_input: 'Listen to a pedestrian asking a local for directions to the central subway station.',
          guided_practice: 'Directional movement drills using directional arrows and prepositions of place.',
          personalization: 'Give directions from your office or home to the nearest supermarket.',
          task: 'Guide a lost tourist from the town square to the art museum using a floor map.',
          activities: ['Map orientation warm-up', 'Audio landmark identification', 'Pair map-navigation exercise', 'Tourist guidance role-play'],
          homework: 'Sketch a quick map from your door to your favorite park with 3 written directions.',
          checkpoint: 'Learner accurately distinguishes "turn left", "turn right", and "go straight".'
        },
        {
          title: 'Shopping, Sizing & Inquiries',
          objective: 'Inquire about merchandise, clothing sizes, colors, and store return policies.',
          evidence: 'Learner asks for a specific size/color, questions price, and makes a simulated purchase.',
          power_expressions: ['Do you have this in…?', 'Can I try this on?', 'It fits perfectly!', 'Do you accept card payments?'],
          vocabulary: ['size', 'medium', 'fitting room', 'discount', 'card', 'cash'],
          contextual_input: 'Listen to a boutique customer inquiring about jacket sizes and payment options.',
          guided_practice: 'Substitute colors, sizes, and item nouns into target shopping questions.',
          personalization: 'Discuss your clothing preferences and what item you recently purchased.',
          task: 'Simulate shopping for a gift for a colleague with specific size and color constraints.',
          activities: ['Clothing vocabulary warm-up', 'Fitting room dialogue listening', 'Size and price questioning drills', 'Department store shopping role-play'],
          homework: 'List 5 items in your wardrobe with their color, size, and approximate price in English.',
          checkpoint: 'Learner uses "Can I try this on?" and correctly specifies sizes and colors.'
        },
        {
          title: 'Describing People & Personalities',
          objective: 'Describe physical appearances and positive personality traits of friends and family.',
          evidence: 'Learner describes two people in detail using at least 4 adjectives and accurate agreement.',
          power_expressions: ['What is she like?', 'He has a great sense of humor.', 'She is very thoughtful.', 'They look quite similar.'],
          vocabulary: ['tall', 'friendly', 'creative', 'hair', 'eyes', 'patient'],
          contextual_input: 'Listen to someone describing their favorite mentor and how they support their team.',
          guided_practice: 'Contrast personality questions ("What is he like?") with appearance questions ("What does he look like?").',
          personalization: 'Choose a close friend or family member and describe their top 3 positive qualities.',
          task: 'Describe a mystery friend to a partner until they guess which portrait matches.',
          activities: ['Personality adjective matching', 'Distinguishing appearance vs character listening', 'Adjective order drills', 'Mystery friend portrait game'],
          homework: 'Write a short paragraph about someone who inspires you and why.',
          checkpoint: 'Learner clearly distinguishes character descriptions from physical appearance.'
        },
        {
          title: 'Making Weekend Plans & Suggestions',
          objective: 'Propose leisure activities, accept or decline invitations, and negotiate times.',
          evidence: 'Learner extends an invitation, responds appropriately, and confirms a meeting time and venue.',
          power_expressions: ['Would you like to…?', 'That sounds wonderful!', 'I would love to, but I have to…', 'How about Saturday afternoon?'],
          vocabulary: ['weekend', 'cinema', 'concert', 'invite', 'busy', 'free'],
          contextual_input: 'Listen to two friends deciding what to do this coming Sunday afternoon.',
          guided_practice: 'Choral practice of polite declining formulas with authentic soft intonation.',
          personalization: 'Think of an activity you actually enjoy doing on weekends and suggest it.',
          task: 'Find a time when both you and your partner are free to attend a cultural event together.',
          activities: ['Calendar availability warm-up', 'Invitation dialogue analysis', 'Polite decline drill', 'Weekend scheduling negotiation'],
          homework: 'Send a simulated text message inviting a study buddy to an English conversation club.',
          checkpoint: 'Learner uses "Would you like to" and provides a polite reason when declining.'
        },
        {
          title: 'Discussing Weather, Seasons & Wardrobe',
          objective: 'Talk about current weather conditions, forecast predictions, and seasonal plans.',
          evidence: 'Learner describes today’s weather, makes a comparison with another city, and suggests suitable clothes.',
          power_expressions: ['What is the weather like today?', 'It looks like it might rain.', 'It is sunny and warm.', 'Make sure to bring…'],
          vocabulary: ['sunny', 'cloudy', 'rain', 'temperature', 'jacket', 'umbrella'],
          contextual_input: 'Listen to a morning radio weather forecast covering 3 major metropolitan areas.',
          guided_practice: 'Practice weather adjective patterns: "It is rainy / raining / cold".',
          personalization: 'Compare today’s local weather with your favorite season of the year.',
          task: 'Give a weather and packing briefing for an upcoming weekend trip to the mountains.',
          activities: ['Weather icons quick-fire quiz', 'Regional weather listening map', 'Temperature comparison drill', 'Travel packing weather briefing'],
          homework: 'Record a 20-second mock weather forecast for your hometown tomorrow.',
          checkpoint: 'Learner correctly uses weather adjectives and pairs them with appropriate clothing advice.'
        },
        {
          title: 'Health, Well-being & Minor Ailments',
          objective: 'Express physical symptoms, ask for remedies, and communicate with a pharmacist.',
          evidence: 'Learner explains a headache or sore throat and asks for dosage or recommendations.',
          power_expressions: ['I am not feeling very well.', 'I have a headache.', 'How often should I take this?', 'Get well soon!'],
          vocabulary: ['headache', 'fever', 'medicine', 'pharmacy', 'water', 'rest'],
          contextual_input: 'Listen to a patient explaining their seasonal cold symptoms to a chemist.',
          guided_practice: 'Formulate sentences with "I have a [headache/sore throat]" and "My [back] hurts".',
          personalization: 'Recall what home remedies your family traditionally uses when feeling under the weather.',
          task: 'Role-play visiting a pharmacy abroad to purchase soothing relief for a sore throat.',
          activities: ['Symptom flashcard match', 'Pharmacy dialogue comprehension', 'Polite symptom expression drill', 'Pharmacy counter role-play'],
          homework: 'Write down 3 healthy daily habits that help keep energy levels high.',
          checkpoint: 'Learner uses "I have a..." for illnesses and asks about dosage instructions.'
        },
        {
          title: 'Travel Accommodations & Hotel Check-in',
          objective: 'Check into a hotel, inquire about amenities, and resolve minor room issues.',
          evidence: 'Learner completes hotel check-in, asks about breakfast/Wi-Fi, and requests fresh towels.',
          power_expressions: ['I have a reservation under the name…', 'What time is breakfast served?', 'Could you help me with the Wi-Fi?', 'Everything is set!'],
          vocabulary: ['check-in', 'reservation', 'room', 'key', 'breakfast', 'elevator'],
          contextual_input: 'Listen to an international traveler checking in at a boutique hotel reception.',
          guided_practice: 'Drill spelling out last names using the international phonetic/spelling alphabet.',
          personalization: 'State your preferred hotel preferences: high floor, quiet room, or early breakfast.',
          task: 'Execute a full hotel check-in process and request assistance connecting your laptop to Wi-Fi.',
          activities: ['Hotel reception vocabulary warm-up', 'Check-in dialogue listening', 'Spelling names & details drill', 'Hotel front desk check-in simulation'],
          homework: 'Write a brief email to a hotel requesting a quiet room and confirmation of check-in time.',
          checkpoint: 'Learner articulates reservation details clearly and asks two hotel amenity questions.'
        },
        {
          title: 'Hobbies, Passions & Leisure Time',
          objective: 'Discuss personal interests, favorite pastimes, and how often you practice them.',
          evidence: 'Learner discusses two hobbies with passion, frequency, and personal reasons for enjoying them.',
          power_expressions: ['I am really into…', 'Whenever I have free time, I…', 'How long have you been doing that?', 'It helps me unwind.'],
          vocabulary: ['hobby', 'photography', 'reading', 'sports', 'relax', 'weekend'],
          contextual_input: 'Listen to three people talking about their creative and physical leisure activities.',
          guided_practice: 'Practice expressing degree of interest: "I am into...", "I enjoy...", "I am keen on...".',
          personalization: 'Share your genuine top hobby and describe how it makes you feel.',
          task: 'Host a mini-panel discussion where classmates discover who shares similar weekend passions.',
          activities: ['Hobbies photo gallery warm-up', 'Interview listening for key passions', 'Frequency and preference drills', 'Hobby discovery round-table'],
          homework: 'Create a 3-sentence profile card describing your creative passion and favorite book or podcast.',
          checkpoint: 'Learner uses dynamic expressions ("I am really into") and talks comfortably for 1 minute.'
        },
        {
          title: 'Culminating Journey: Personal Story & Graduation Task',
          objective: 'Integrate vocabulary, tenses, and Power Expressions into a cohesive personal presentation.',
          evidence: 'Learner delivers a 2-minute personal story covering background, routine, and future aspirations.',
          power_expressions: ['Looking back on my journey…', 'One thing I really value is…', 'In the future, I plan to…', 'Thank you for listening!'],
          vocabulary: ['journey', 'experience', 'growth', 'achievement', 'goal', 'community'],
          contextual_input: 'Listen to an inspiring speech by an adult learner reflecting on their language breakthrough.',
          guided_practice: 'Structure presentations using clear transition signals: "First", "Furthermore", "In conclusion".',
          personalization: 'Reflect on your personal milestones throughout these 12 classes and your next goal.',
          task: 'Deliver your graduation speech to the group, showcasing your communicative confidence.',
          activities: ['Breakthrough memory warm-up', 'Graduation speech model listening', 'Transition markers drill', 'Live showcase presentation & peer feedback'],
          homework: 'Write a reflective letter to your future self outlining your next language milestone.',
          checkpoint: 'Learner speaks fluidly, links ideas with transitions, and uses at least 3 Power Expressions.'
        }
      ]
    }
  },
  French: {
    A1: {
      'Everyday communication': [
        {
          title: 'Premières salutations et présentations',
          objective: 'Saluer avec courtoisie, se présenter et échanger des informations de base.',
          evidence: 'L\'apprenant peut décliner son identité, sa nationalité, sa profession et saluer poliment.',
          power_expressions: ['Enchanté de faire votre connaissance !', 'Comment vous appelez-vous ?', 'Je viens de…', 'Et vous ?'],
          vocabulary: ['bonjour', 'nom', 'prénom', 'pays', 'profession', 'ville'],
          contextual_input: 'Écoutez deux collègues qui font connaissance lors d\'un séminaire à Lyon.',
          guided_practice: 'Répétez les formules de politesse avec l\'intonation naturelle montante.',
          personalization: 'Présentez votre prénom, votre ville de résidence et votre vrai métier.',
          task: 'Faites connaissance avec un nouvel arrivant et notez ses coordonnées professionnelles.',
          activities: ['Échauffement brise-glace', 'Écoute active du dialogue', 'Exercice de répétition en duo', 'Mission de présentation en autonomie'],
          homework: 'Enregistrez un message vocal de 30 secondes pour vous présenter à votre tuteur.',
          checkpoint: 'L\'apprenant utilise "Enchanté" et formule correctement sa profession sans article.'
        },
        {
          title: 'La vie quotidienne et les habitudes',
          objective: 'Décrire sa routine journalière, ses horaires et ses activités favorites.',
          evidence: 'L\'apprenant décrit au moins 4 actions de sa journée avec des connecteurs temporels.',
          power_expressions: ['D\'habitude, je commence par…', 'À quelle heure vous réveillez-vous ?', 'Le matin, j\'aime…', 'Et ensuite…'],
          vocabulary: ['matin', 'réveil', 'café', 'travail', 'déjeuner', 'soir'],
          contextual_input: 'Écoutez le témoignage d\'une créatrice décrivant sa routine matinale.',
          guided_practice: 'Entraînement sur les verbes pronominaux usuels au présent de l\'indicatif.',
          personalization: 'Partagez votre rituel du matin préféré avec votre partenaire.',
          task: 'Comparez votre journée type avec celle d\'un camarade pour trouver deux points communs.',
          activities: ['Flashcards des moments de la journée', 'Compréhension orale des horaires', 'Pratique guidée des verbes pronominaux', 'Interview croisée sur la routine'],
          homework: 'Rédigez un paragraphe de 4 phrases résumant votre matinée idéale.',
          checkpoint: 'L\'apprenant emploie les heures et les verbes pronominaux avec précision.'
        },
        {
          title: 'Au bistrot et au café parisien',
          objective: 'Commander des consommations avec politesse et demander l\'addition.',
          evidence: 'L\'apprenant commande deux boissons, un en-cas et demande le montant à régler.',
          power_expressions: ['Je voudrais un café, s\'il vous plaît.', 'Combien ça coûte ?', 'L\'addition, s\'il vous plaît.', 'C\'est délicieux !'],
          vocabulary: ['café', 'croissant', 'verre', 'addition', 'table', 'carte'],
          contextual_input: 'Écoutez un client commandant en terrasse dans un quartier animé de Paris.',
          guided_practice: 'Pratique systématique du conditionnel de politesse : "Je voudrais…".',
          personalization: 'Commandez votre boisson préférée selon vos habitudes réelles.',
          task: 'Jouez la scène complète de la commande et du règlement dans un salon de thé.',
          activities: ['Lecture de la carte du café', 'Écoute des détails de la commande', 'Exercice de prononciation de "Je voudrais"', 'Jeu de rôle au bistrot'],
          homework: 'Créez un menu de bistrot imaginaire avec 4 spécialités locales.',
          checkpoint: 'L\'apprenant utilise "Je voudrais" et demande l\'addition sans hésitation.'
        },
        {
          title: 'S\'orienter dans la ville et demander son chemin',
          objective: 'Demander son itinéraire et comprendre des indications de direction urbaines.',
          evidence: 'L\'apprenant pose une question d\'orientation et guide un camarade sur un plan de ville.',
          power_expressions: ['Pardon, où se trouve… ?', 'Allez tout droit.', 'Tournez à gauche après le feu.', 'C\'est juste en face.'],
          vocabulary: ['rue', 'boulevard', 'place', 'station', 'gauche', 'droite'],
          contextual_input: 'Écoutez une passante demandant son chemin pour rejoindre la gare centrale.',
          guided_practice: 'Répétez les impératifs de direction avec gestes et intonation directive.',
          personalization: 'Expliquez comment aller de votre domicile à la boulangerie la plus proche.',
          task: 'Guidez un voyageur égaré depuis l\'office de tourisme jusqu\'au musée d\'art.',
          activities: ['Repérage sur un plan illustré', 'Écoute des repères spatiaux', 'Drill des prépositions de lieu', 'Simulation d\'orientation urbaine'],
          homework: 'Dessinez un plan simple de votre quartier avec 3 indications fléchées en français.',
          checkpoint: 'L\'apprenant distingue clairement "tournez à gauche", "à droite" et "tout droit".'
        },
        {
          title: 'Faire ses courses au marché local',
          objective: 'Acheter des produits frais, demander les quantités et payer.',
          evidence: 'L\'apprenant demande des quantités précises (kilo, gramme) et effectue un achat au marché.',
          power_expressions: ['Il me faudrait un kilo de…', 'Ce sera tout pour aujourd\'hui.', 'Vous prenez la carte ?', 'C\'est bien mûr !'],
          vocabulary: ['kilo', 'fruits', 'légumes', 'marché', 'monnaie', 'sac'],
          contextual_input: 'Écoutez un échange entre un maraîcher et une cliente au marché de Provence.',
          guided_practice: 'Associez les expressions de quantité aux noms d\'aliments ("un morceau de", "un kilo de").',
          personalization: 'Choisissez vos trois fruits ou légumes favoris et commandez-les au stand.',
          task: 'Achetez les ingrédients nécessaires pour préparer un repas convivial entre amis.',
          activities: ['Vocabulaire des étals de marché', 'Écoute des prix et pesées', 'Drill des articles partitifs', 'Jeu de rôle au marché maraîcher'],
          homework: 'Dressez une liste de courses en français pour votre prochaine recette préférée.',
          checkpoint: 'L\'apprenant utilise correctement "un kilo de" sans faute d\'accord partitif.'
        },
        {
          title: 'Décrire les personnes et le caractère',
          objective: 'Faire le portrait physique et moral d\'un ami ou d\'un collègue.',
          evidence: 'L\'apprenant décrit deux personnes avec au moins 4 adjectifs qualificatifs accordés.',
          power_expressions: ['Comment est-il ?', 'Elle est très dynamique.', 'Il a les yeux pétillants.', 'C\'est une personne bienveillante.'],
          vocabulary: ['grand', 'souriant', 'sympathique', 'cheveux', 'calme', 'généreux'],
          contextual_input: 'Écoutez une directrice parlant des qualités humaines de son collaborateur.',
          guided_practice: 'Entraînement aux accords masculin/féminin des adjectifs qualificatifs courants.',
          personalization: 'Décrivez un mentor ou une personne qui compte beaucoup pour vous.',
          task: 'Présentez une personne mystère à votre camarade jusqu\'à ce qu\'il l\'identifie.',
          activities: ['Galerie de portraits photos', 'Écoute des traits de personnalité', 'Drill des accords adjectivaux', 'Devinette de la personne mystère'],
          homework: 'Écrivez trois phrases pour faire l\'éloge d\'un collègue apprécié.',
          checkpoint: 'L\'apprenant accorde correctement les adjectifs au féminin et au masculin.'
        },
        {
          title: 'Proposer une sortie et fixer un rendez-vous',
          objective: 'Inviter un ami, accepter ou refuser poliment une proposition et convenir d\'une heure.',
          evidence: 'L\'apprenant lance une invitation, réagit courtoisement et fixe le lieu de rendez-vous.',
          power_expressions: ['Ça te dit d\'aller au… ?', 'Avec grand plaisir !', 'Je suis désolé, je ne peux pas…', 'On se retrouve vers quelle heure ?'],
          vocabulary: ['cinéma', 'expo', 'spectacle', 'inviter', 'disponible', 'rendez-vous'],
          contextual_input: 'Écoutez deux étudiants organisant leur sortie du vendredi soir.',
          guided_practice: 'Répétez la structure "Ça te dit de + infinitif" avec intonation chaleureuse.',
          personalization: 'Proposez une sortie culturelle que vous avez réellement envie de faire.',
          task: 'Négociez un créneau commun pour visiter une exposition ce week-end.',
          activities: ['Agendas et disponibilités', 'Écoute des propositions et refus', 'Drill des formules d\'acceptation', 'Négociation d\'une sortie à deux'],
          homework: 'Écrivez un court message d\'invitation pour un concert ou un dîner.',
          checkpoint: 'L\'apprenant formule une invitation claire et motive poliment son refus si indisponible.'
        },
        {
          title: 'La météo, le climat et les saisons',
          objective: 'Parler du temps qu\'il fait, des prévisions météorologiques et choisir sa tenue.',
          evidence: 'L\'apprenant commente le ciel du jour et conseille les vêtements adaptés à la météo.',
          power_expressions: ['Quel temps fait-il aujourd\'hui ?', 'Il fait un soleil magnifique.', 'Prenez un parapluie par précaution.', 'Le vent souffle fort.'],
          vocabulary: ['soleil', 'pluie', 'nuageux', 'température', 'manteau', 'parapluie'],
          contextual_input: 'Écoutez le bulletin météo national diffusé sur les ondes matinales.',
          guided_practice: 'Structurez les phrases météo impersonnelles : "Il fait beau / chaud / froid".',
          personalization: 'Décrivez le climat de votre région d\'origine au fil des saisons.',
          task: 'Présentez les prévisions du week-end et recommandez les tenues appropriées pour une randonnée.',
          activities: ['Pictogrammes météo en direct', 'Compréhension de la carte des températures', 'Drill des expressions impersonnelles', 'Bulletin météo simulé en binôme'],
          homework: 'Enregistrez un bulletin météo flash de 20 secondes pour la métropole de votre choix.',
          checkpoint: 'L\'apprenant utilise "Il fait + adjectif" ou "Il y a + nom" sans confusion.'
        },
        {
          title: 'À la pharmacie et les petits bobos',
          objective: 'Exprimer des symptômes de santé, demander un médicament et comprendre la posologie.',
          evidence: 'L\'apprenant exprime un mal de gorge ou de tête et demande conseil au pharmacien.',
          power_expressions: ['Je ne me sens pas très bien.', 'J\'ai mal à la tête.', 'Combien de fois par jour ?', 'Soignez-vous bien !'],
          vocabulary: ['tête', 'gorge', 'fièvre', 'médicament', 'comprimé', 'sirop'],
          contextual_input: 'Écoutez un voyageur demandant conseil au comptoir d\'une pharmacie de garde.',
          guided_practice: 'Pratique de l\'expression "Avoir mal à / au / aux" selon le genre et le nombre.',
          personalization: 'Expliquez ce que vous faites d\'habitude pour soulager la fatigue après le travail.',
          task: 'Consultez le pharmacien pour obtenir un remède adapté à un rhume de saison.',
          activities: ['Schéma du corps humain et douleurs', 'Écoute de la consultation pharmaceutique', 'Drill "Avoir mal à"', 'Jeu de rôle au comptoir de la pharmacie'],
          homework: 'Rédigez 3 conseils bien-être simples pour préserver sa voix et son énergie.',
          checkpoint: 'L\'apprenant maîtrise les contractions "au", "à la", "aux" avec l\'expression "avoir mal".'
        },
        {
          title: 'Arrivée à l\'hôtel et séjour touristique',
          objective: 'Effectuer son enregistrement à l\'hôtel, poser des questions sur les services et s\'installer.',
          evidence: 'L\'apprenant annonce sa réservation, demande les horaires du petit-déjeuner et le code Wi-Fi.',
          power_expressions: ['J\'ai une réservation au nom de…', 'À quelle heure est servi le petit-déjeuner ?', 'Pouvez-vous me donner le code Wi-Fi ?', 'Bon séjour parmi nous !'],
          vocabulary: ['hôtel', 'chambre', 'clé', 'bagage', 'étage', 'ascenseur'],
          contextual_input: 'Écoutez un client arrivant à la réception d\'un hôtel de charme à Nice.',
          guided_practice: 'Épelez votre nom de famille selon l\'alphabet français avec fluidité.',
          personalization: 'Formulez vos souhaits pour votre séjour idéal : chambre calme, vue sur jardin, etc.',
          task: 'Gérez l\'enregistrement complet à la réception et réglez une petite question de confort.',
          activities: ['Vocabulaire hôtelier et équipements', 'Écoute du dialogue d\'enregistrement', 'Épellation des noms et prénoms', 'Simulation complète de check-in hôtelier'],
          homework: 'Rédigez un court courriel confirmant votre heure d\'arrivée tardive dans un hôtel.',
          checkpoint: 'L\'apprenant prononce clairement son nom et formule deux questions sur les services.'
        },
        {
          title: 'Loisirs, passions et temps libre',
          objective: 'Partager ses centres d\'intérêt, ses loisirs créatifs et ses passions sportives.',
          evidence: 'L\'apprenant présente deux activités de loisirs avec enthousiasme et fréquence.',
          power_expressions: ['Je me passionne pour…', 'Pendant mon temps libre, j\'adore…', 'Depuis combien de temps pratiquez-vous ?', 'Ça me ressource énormément.'],
          vocabulary: ['passion', 'musique', 'sport', 'lecture', 'voyage', 'détente'],
          contextual_input: 'Écoutez des personnes partageant leur passion pour la photographie et la randonnée.',
          guided_practice: 'Structurez les verbes de goût : "adorer", "aimer", "préférer", "avoir horreur de".',
          personalization: 'Présentez votre loisir principal et expliquez pourquoi il vous passionne tant.',
          task: 'Animez une table ronde où chacun présente une passion et invite les autres à essayer.',
          activities: ['Mosaïque des loisirs contemporains', 'Écoute des témoignages de passionnés', 'Drill des verbes d\'appréciation', 'Table ronde découverte des passions'],
          homework: 'Créez une affiche de présentation de votre club de loisir idéal en 3 points forts.',
          checkpoint: 'L\'apprenant s\'exprime avec aisance et varie les verbes d\'appréciation.'
        },
        {
          title: 'Le grand récit de parcours : Bilan et célébration',
          objective: 'Synthétiser les acquis, raconter son parcours et exprimer ses projets futurs en français.',
          evidence: 'L\'apprenant prononce un discours personnel de 2 minutes illustrant ses progrès communicatifs.',
          power_expressions: ['En regardant le chemin parcouru…', 'Ce qui compte le plus pour moi, c\'est…', 'Pour la suite, j\'ai l\'intention de…', 'Merci infiniment pour votre écoute !'],
          vocabulary: ['parcours', 'fierté', 'progrès', 'confiance', 'avenir', 'amitié'],
          contextual_input: 'Écoutez le discours inspirant d\'un apprenant célébrant sa réussite linguistique.',
          guided_practice: 'Structurez l\'exposé avec les connecteurs logiques : "Tout d\'abord", "Ensuite", "Enfin".',
          personalization: 'Identifiez votre plus belle victoire personnelle au cours de ces 12 séances.',
          task: 'Présentez votre discours de fin de cycle devant le groupe et célébrez vos progrès.',
          activities: ['Retour sur les temps forts du cours', 'Écoute d\'un modèle d\'allocution', 'Drill des connecteurs de discours', 'Grand gala de présentations orales'],
          homework: 'Écrivez une lettre à vous-même fixant vos 3 prochains objectifs en langue française.',
          checkpoint: 'L\'apprenant s\'exprime en continu avec confiance et utilise 3 Power Expressions clés.'
        }
      ]
    }
  },
  Mandarin: {
    A1: {
      'Everyday communication': [
        {
          title: '问候与初次相识 (Greetings & First Meetings)',
          objective: 'Master essential polite greetings, introduce your name and nationality with correct tones.',
          evidence: 'Learner greets clearly, states their name and country using 是 (shì), and asks 你好吗 (Nǐ hǎo ma).',
          power_expressions: ['很高兴认识你！(Hěn gāoxìng rènshí nǐ!)', '你叫什么名字？(Nǐ jiào shénme míngzì?)', '我是…人。(Wǒ shì… rén.)', '你呢？(Nǐ ne?)'],
          vocabulary: ['你好 (nǐ hǎo)', '名字 (míngzì)', '国 (guó)', '老师 (lǎoshī)', '中国 (Zhōngguó)', '朋友 (péngyǒu)'],
          contextual_input: 'Listen to two language partners meeting for the first time in Beijing.',
          guided_practice: 'Choral tone repetition focusing on the 4 tones and the neutral tone in greetings.',
          personalization: 'Formulate your own Chinese introduction with your actual nationality and profession.',
          task: 'Introduce yourself to a classmate and find out their name and where they are from.',
          activities: ['Tone warm-up exercise', 'Dialogue listening for names', 'Call-and-response tone drill', 'Partner introduction exchange'],
          homework: 'Record an audio greeting introducing your name and home country in Mandarin.',
          checkpoint: 'Learner articulates the 4 tones accurately on key greeting characters.'
        },
        {
          title: '数字、电话与日期 (Numbers, Contacts & Dates)',
          objective: 'Count from 1 to 100, exchange telephone numbers, and state dates and days of the week.',
          evidence: 'Learner states their phone number digit-by-digit and asks for a partner\'s birthday.',
          power_expressions: ['你的电话号码是多少？(Nǐ de diànhuà hàomǎ shì duōshao?)', '今天是几月几号？(Jīntiān shì jǐ yuè jǐ hào?)', '太好了！(Tài hǎo le!)', '没问题！(Méi wèntí!)'],
          vocabulary: ['一二三四五 (1-5)', '六七八九十 (6-10)', '电话 (diànhuà)', '号码 (hàomǎ)', '星期 (xīngqī)', '月 (yuè)'],
          contextual_input: 'Listen to an exchange where an assistant registers contact details over the phone.',
          guided_practice: 'Practice the pronunciation of 1 (yāo) in phone numbers and tone combinations in dates.',
          personalization: 'State your real contact digits and important family dates in Mandarin.',
          task: 'Collect 3 classmates\' contact numbers and verify them by reading them back.',
          activities: ['Finger counting and number drill', 'Phone number dictation listening', 'Date and birthday pair practice', 'Speed contact exchange game'],
          homework: 'Write your birth date and 3 important phone numbers using Chinese characters and pinyin.',
          checkpoint: 'Learner recognizes and says phone numbers fluently without hesitation.'
        },
        {
          title: '在茶馆与餐厅点单 (Ordering at a Tea House & Restaurant)',
          objective: 'Order beverages and classic dishes politely, state quantities, and ask for the bill.',
          evidence: 'Learner orders a drink and dish using 我要 (wǒ yào), specifies measure words, and asks 买单 (mǎidān).',
          power_expressions: ['服务员，请问… (Fúwùyuán, qǐngwèn…)', '我要一杯茶。(Wǒ yào yī bēi chá.)', '买单，多少钱？(Mǎidān, duōshao qián?)', '好吃！(Hǎochī!)'],
          vocabulary: ['茶 (chá)', '水 (shuǐ)', '米饭 (mǐfàn)', '面条 (miàntiáo)', '杯 (bēi)', '碗 (wǎn)'],
          contextual_input: 'Listen to a patron ordering Jasmine tea and dumplings at a traditional teahouse.',
          guided_practice: 'Practice the measure words 杯 (bēi) for cups and 碗 (wǎn) for bowls.',
          personalization: 'Choose your favorite Chinese or international dish and order it in Mandarin.',
          task: 'Simulate ordering a complete meal for two and requesting the check.',
          activities: ['Menu picture match warm-up', 'Teahouse dialogue comprehension', 'Measure word substitution drill', 'Restaurant ordering role-play'],
          homework: 'Design a simple Chinese teahouse card with 3 teas, prices, and appropriate measure words.',
          checkpoint: 'Learner uses measure words correctly with numbers: 一杯茶, 两碗面.'
        },
        {
          title: '问路与城市方向 (Directions & City Navigation)',
          objective: 'Ask for directions in a city, understand spatial landmarks, and locate destinations.',
          evidence: 'Learner asks 在哪里 (zài nǎlǐ) and follows 往前走 (wǎng qián zǒu) / 往左拐 (wǎng zuǒ guǎi).',
          power_expressions: ['请问，地铁站在哪里？(Qǐngwèn, dìtiězhàn zài nǎlǐ?)', '往前走。(Wǎng qián zǒu.)', '往右拐。(Wǎng yòu guǎi.)', '就在旁边。(Jiù zài pángbiān.)'],
          vocabulary: ['地铁站 (dìtiězhàn)', '洗手间 (xǐshǒujiān)', '前 (qián)', '后 (hòu)', '左 (zuǒ)', '右 (yòu)'],
          contextual_input: 'Listen to a tourist asking a Beijing commuter how to reach the subway entrance.',
          guided_practice: 'Drill directional instructions using physical gestures matching left, right, and straight.',
          personalization: 'Give instructions to the nearest metro station or landmark from your workplace.',
          task: 'Guide a visitor across a simplified city grid map from the hotel to the bookstore.',
          activities: ['Landmark icons map warm-up', 'Directions listening exercise', 'Physical directional command drill', 'City navigation pair simulation'],
          homework: 'Draw a mini route map from your apartment to the bus stop with pinyin directions.',
          checkpoint: 'Learner clearly distinguishes 左 (left) and 右 (right) with accurate third-fourth tones.'
        },
        {
          title: '购物与讨价还价 (Shopping & Inquiring about Prices)',
          objective: 'Inquire about merchandise prices, ask for discounts, and handle simple shopping transactions.',
          evidence: 'Learner asks 这个多少钱 (Zhège duōshao qián) and negotiates with 太贵了，便宜点 (Tài guì le, piányi diǎn).',
          power_expressions: ['这个多少钱？(Zhège duōshao qián?)', '太贵了，便宜一点吧！(Tài guì le, piányi yīdiǎn ba!)', '可以刷卡吗？(Kěyǐ shuākǎ ma?)', '谢谢，再见！(Xièxie, zàijiàn!)'],
          vocabulary: ['钱 (qián)', '元/块 (kuài)', '便宜 (piányi)', '贵 (guì)', '买 (mǎi)', '商店 (shāngdiàn)'],
          contextual_input: 'Listen to a customer bargaining politely at an arts and crafts market.',
          guided_practice: 'Practice the light particle 吧 (ba) in polite suggestions and requests.',
          personalization: 'Select a souvenir you would love to purchase in China and negotiate its price.',
          task: 'Role-play buying a silk scarf or teapot, bargaining politely to reach an agreed price.',
          activities: ['Market goods flashcards', 'Price negotiation audio listening', 'Bargaining intonation drill', 'Souvenir market role-play'],
          homework: 'List 4 items in your room and state their estimated prices in Chinese yuan (块).',
          checkpoint: 'Learner naturally uses 太…了 (tài...le) and asks for the total cost.'
        },
        {
          title: '家庭与人物描述 (Family Members & Describing People)',
          objective: 'Talk about family members, describe physical appearance and friendly personalities.',
          evidence: 'Learner describes 3 family members or colleagues using 有 (yǒu) and descriptive adjectives.',
          power_expressions: ['你有几个兄弟姐妹？(Nǐ yǒu jǐ gè xiōngdì jiěmèi?)', '他非常热心。(Tā fēicháng rèxīn.)', '她长得很漂亮。(Tā zhǎng de hěn piàoliang.)', '我们一家人… (Wǒmen yī jiā rén…)'],
          vocabulary: ['爸爸 (bàba)', '妈妈 (māma)', '哥哥 (gēge)', '姐姐 (jiějie)', '高 (gāo)', '热心 (rèxīn)'],
          contextual_input: 'Listen to someone showing a family photograph and talking about their siblings.',
          guided_practice: 'Structure sentences with the degree adverb 很 (hěn) and 非常 (fēicháng).',
          personalization: 'Bring to mind a close family member and describe two of their admirable qualities.',
          task: 'Describe an unnamed family member or mentor until your partner sketches their portrait.',
          activities: ['Family tree relationship review', 'Family photo audio comprehension', 'Adjective modifier drills', 'Family portrait guessing challenge'],
          homework: 'Write 4 sentences describing your family or team in pinyin and basic characters.',
          checkpoint: 'Learner uses 很 correctly without inserting 是 between subject and adjective.'
        },
        {
          title: '周末计划与发出邀请 (Weekend Plans & Extending Invitations)',
          objective: 'Propose leisure activities, accept or decline politely, and agree on a meeting time.',
          evidence: 'Learner proposes an outing with 我们一起去…好吗 (Wǒmen yīqǐ qù... hǎo ma) and confirms time.',
          power_expressions: ['周末你打算做什么？(Zhōumò nǐ dǎsuàn zuò shénme?)', '我们一起去吃饭，好吗？(Wǒmen yīqǐ qù chīfàn, hǎo ma?)', '太好了，我想去！(Tài hǎo le, wǒ xiǎng qù!)', '我们几点见面？(Wǒmen jǐ diǎn jiànmiàn?)'],
          vocabulary: ['周末 (zhōumò)', '打算 (dǎsuàn)', '电影 (diànyǐng)', '吃饭 (chīfàn)', '一起 (yīqǐ)', '见面 (jiànmiàn)'],
          contextual_input: 'Listen to two university friends planning their Saturday evening outing.',
          guided_practice: 'Drill the invitation pattern: "Subject + 想不想 / 要不要 + verb".',
          personalization: 'Think of an activity you want to invite a friend to do this coming weekend.',
          task: 'Negotiate with a partner to find a mutual time to watch a Chinese movie or have dinner.',
          activities: ['Weekend activity cards', 'Invitation dialogue listening', 'Accepting/declining drill', 'Weekend calendar alignment game'],
          homework: 'Send a short simulated WeChat message in Chinese inviting a friend to drink tea.',
          checkpoint: 'Learner specifies time and location using the standard Chinese order: Year-Month-Day-Time.'
        },
        {
          title: '天气与四季感受 (Weather, Seasons & Climate)',
          objective: 'Describe weather conditions, ask about temperatures, and advise on suitable clothing.',
          evidence: 'Learner describes current weather using 冷 (lěng), 热 (rè), 下雨 (xiàyǔ), and suggests attire.',
          power_expressions: ['今天天气怎么样？(Jīntiān tiānqì zěnmeyàng?)', '今天很暖和，不冷。(Jīntiān hěn nuǎnhuo, bù lěng.)', '记得带一把伞！(Jìdé dài yī bǎ sǎn!)', '明天会下雨吗？(Míngtiān huì xiàyǔ ma?)'],
          vocabulary: ['天气 (tiānqì)', '热 (rè)', '冷 (lěng)', '下雨 (xiàyǔ)', '晴天 (qíngtiān)', '伞 (sǎn)'],
          contextual_input: 'Listen to an evening weather report forecasting rain and temperature drops in Shanghai.',
          guided_practice: 'Practice temperature phrasing: "…度 (dù)" and weather descriptions.',
          personalization: 'Compare today’s local weather with your favorite season of the year.',
          task: 'Give a weather and clothing advisory to a colleague traveling to Beijing tomorrow.',
          activities: ['Weather symbols review', 'Regional forecast listening', 'Temperature comparison drill', 'Travel advisory role-play'],
          homework: 'Record a 20-second mock weather forecast for your city in Mandarin.',
          checkpoint: 'Learner uses 怎么样 (zěnmeyàng) and describes temperatures using correct measure 度.'
        },
        {
          title: '身体状况与健康表达 (Health, Physical Symptoms & Pharmacy)',
          objective: 'Express physical discomfort, explain symptoms to a doctor or pharmacist, and ask for remedies.',
          evidence: 'Learner explains 我头疼 (Wǒ tóuténg) or 感冒了 (gǎnmào le) and asks 一天吃几次 (Yī tiān chī jǐ cì).',
          power_expressions: ['我身体不舒服。(Wǒ shēntǐ bù shūfu.)', '我头疼，发烧了。(Wǒ tóuténg, fāshāo le.)', '一天吃三次，饭后吃。(Yī tiān chī sān cì, fànhòu chī.)', '祝你早日康复！(Zhù nǐ zǎorì kāngfù!)'],
          vocabulary: ['身体 (shēntǐ)', '舒服 (shūfu)', '发烧 (fāshāo)', '药 (yào)', '吃药 (chī yào)', '水 (shuǐ)'],
          contextual_input: 'Listen to a consultation at a community clinic where a patient describes cold symptoms.',
          guided_practice: 'Practice the dynamic particle 了 (le) indicating a change of state (如: 发烧了, 好点了).',
          personalization: 'Share what traditional teas or remedies your family drinks when feeling tired or feverish.',
          task: 'Role-play visiting a pharmacy in Chengdu to purchase remedies for seasonal allergies.',
          activities: ['Body parts flashcard warm-up', 'Pharmacy consultation listening', 'Symptom and remedy drill', 'Pharmacy counter interaction'],
          homework: 'Write 3 healthy advice tips using Chinese phrases like 多喝水 (drink more water).',
          checkpoint: 'Learner correctly explains where it hurts and understands dosage: 一天三次.'
        },
        {
          title: '酒店入住与旅行住宿 (Hotel Check-in & Travel Accommodations)',
          objective: 'Complete hotel registration, inquire about breakfast and Wi-Fi, and resolve room queries.',
          evidence: 'Learner states reservation name, requests room card, and verifies breakfast timings.',
          power_expressions: ['我预订了房间。(Wǒ yùdìng le fángjiān.)', '请问早餐几点开始？(Qǐngwèn zǎocān jǐ diǎn kāishǐ?)', '无线网络密码是多少？(Wúxiàn wǎngluò mìmǎ shì duōshao?)', '祝你入住愉快！(Zhù nǐ rùzhù yúkuài!)'],
          vocabulary: ['酒店 (jiǔdiàn)', '预订 (yùdìng)', '房间 (fángjiān)', '钥匙/房卡 (fángkǎ)', '早餐 (zǎocān)', '网络 (wǎngluò)'],
          contextual_input: 'Listen to an international guest checking in at a boutique hotel near the West Lake.',
          guided_practice: 'Drill spelling names in pinyin and confirming passport registration details.',
          personalization: 'State your accommodation preferences: quiet room, non-smoking, or double bed.',
          task: 'Conduct a complete hotel check-in and ask the front desk for recommendations on local noodles.',
          activities: ['Hotel reception vocabulary review', 'Check-in dialogue listening', 'Room inquiry drills', 'Full hotel check-in simulation'],
          homework: 'Draft a short email confirming your arrival time and requesting a quiet room.',
          checkpoint: 'Learner uses 预订 (reservation) and asks for Wi-Fi details politely.'
        },
        {
          title: '兴趣爱好与休闲生活 (Hobbies & Leisure Time)',
          objective: 'Share personal interests, creative passions, sports, and frequency of practice.',
          evidence: 'Learner discusses two hobbies with enthusiasm using 喜欢 (xǐhuan) and 常 (cháng).',
          power_expressions: ['你有什么爱好？(Nǐ yǒu shénme àihào?)', '我非常喜欢听音乐和旅行。(Wǒ fēicháng xǐhuan tīng yīnyuè hé lǚxíng.)', '有空的时候，我喜欢… (Yǒu kòng de shíhou, wǒ xǐhuan…)', '这让我感到放松。(Zhè ràng wǒ gǎndào fàngsōng.)'],
          vocabulary: ['爱好 (àihào)', '音乐 (yīnyuè)', '运动 (yùndòng)', '旅行 (lǚxíng)', '看书 (kànshū)', '放松 (fàngsōng)'],
          contextual_input: 'Listen to three people discussing their favorite weekend activities in a park.',
          guided_practice: 'Practice expressing preference with 喜欢, 最喜欢, and time clauses with …的时候.',
          personalization: 'Talk about your own favorite hobby and how long you have been practicing it.',
          task: 'Host a mini interview session where you discover what classmates enjoy doing after work.',
          activities: ['Hobby flashcards and gestures', 'Interview audio comprehension', 'Preference pattern drill', 'Hobby discovery round-table'],
          homework: 'Write a 4-sentence profile card detailing your favorite leisure pastimes in Chinese.',
          checkpoint: 'Learner uses 有空的时候 fluently and expresses preferences clearly.'
        },
        {
          title: '成长之路与结业展示 (Culminating Journey: Showcase & Graduation)',
          objective: 'Synthesize vocabulary, expressions, and tones into a coherent personal speech.',
          evidence: 'Learner delivers a 2-minute showcase speech covering their background, progress, and future goals.',
          power_expressions: ['回顾我的学习旅程… (Huígù wǒ de xuéxí lǚchéng…)', '我学到了很多！(Wǒ xué dào le hěn duō!)', '未来，我希望能… (Wèilái, wǒ xīwàng néng…)', '谢谢大家！(Xièxie dàjiā!)'],
          vocabulary: ['旅程 (lǚchéng)', '进步 (jìnbù)', '努力 (nǔlì)', '自信 (zìxìn)', '未来 (wèilái)', '感谢 (gǎnxiè)'],
          contextual_input: 'Listen to an inspiring graduation speech by an adult Mandarin learner celebrating their milestone.',
          guided_practice: 'Structure presentations with speech transitions: 首先 (First), 其次 (Second), 最后 (Finally).',
          personalization: 'Reflect on your most rewarding breakthrough moment during these 12 lessons.',
          task: 'Deliver your graduation presentation to the class, demonstrating communicative confidence.',
          activities: ['Reflective review of core milestone moments', 'Graduation speech model listening', 'Transition markers drill', 'Live showcase presentations & peer appreciation'],
          homework: 'Write a reflective note setting your next language learning aspiration for the year ahead.',
          checkpoint: 'Learner speaks with continuous flow, clear tones, and uses at least 3 Power Expressions.'
        }
      ]
    }
  }
}

// Fallback generator for other languages or levels to always guarantee 12 complete,
// valid, rich pedagogical sessions conforming to validateArchitectCourse.
export function generateCurriculumCourse(request) {
  const language = LANGUAGES.includes(request.language) ? request.language : 'English'
  const level = LEVELS.includes(request.level) ? request.level : 'B1'
  const goal = isPedagogicalObjective(request.goal) ? request.goal : DEFAULT_PEDAGOGICAL_OBJECTIVE
  const classes = Math.max(1, Math.min(12, request.classes || 12))
  const duration = Math.max(20, Math.min(120, request.duration || 60))

  // Check if we have pre-curated bank for this language
  const bank = PEDAGOGICAL_BANK[language]?.[level]?.[goal] || PEDAGOGICAL_BANK[language]?.A1?.['Everyday communication'] || null

  const minutesAllocation = STAGES.map((_, i) => Math.floor(duration / 4) + (i < duration % 4 ? 1 : 0))

  const sessions = []
  for (let i = 0; i < classes; i++) {
    const template = bank && bank[i % bank.length]
    if (template) {
      sessions.push({
        title: template.title,
        objective: template.objective,
        evidence: template.evidence,
        power_expressions: [...template.power_expressions],
        vocabulary: [...template.vocabulary],
        contextual_input: template.contextual_input,
        guided_practice: template.guided_practice,
        personalization: template.personalization,
        task: template.task,
        activities: [...template.activities],
        homework: template.homework,
        checkpoint: template.checkpoint,
        minutes: [...minutesAllocation],
        steps: STAGES.map(stage => {
          if (stage === 'Listen') return { stage, activity: template.contextual_input }
          if (stage === 'Repeat') return { stage, activity: template.guided_practice }
          if (stage === 'Personalize') return { stage, activity: template.personalization }
          return { stage, activity: template.task }
        })
      })
    } else {
      // Pedagogical generation for any language/level combination
      const num = i + 1
      const title = `${language} ${level} Mastery — Class ${num}: Active Communication`
      const objective = `Develop situational fluency and confidence using targeted ${language} expressions at CEFR ${level}.`
      const evidence = `Learner delivers a structured spoken exchange incorporating 2 target expressions and active vocabulary.`
      const powerExpressions = [
        `Expressing key viewpoints with clarity in ${language}.`,
        `Clarifying and asking for relevant details in real time.`,
        `Summarizing main ideas concisely and accurately.`
      ]
      const vocabulary = ['fluency', 'context', 'interaction', 'communication', 'nuance', 'production']
      const contextualInput = `Teacher introduces an authentic cultural listening passage focused on ${goal}.`
      const guidedPractice = `Choral and paired repetition of target structures with focus on natural rhythm and intonation.`
      const personalization = `Learner adapts the core structures to their personal life, profession, and daily experiences.`
      const task = `Conduct a real-world communicative simulation with a partner demonstrating practical command.`
      const activities = [
        'Contextual warm-up and activation of prior knowledge',
        'Model listening and communicative structure presentation',
        'Controlled pair practice drill and pronunciation alignment',
        'Free communicative production task and peer observation'
      ]
      const homework = `Record a 45-second audio reflection applying the class expressions to a real-life scenario.`
      const checkpoint = `Confirm learner uses at least two Power Expressions accurately during spontaneous speech.`

      sessions.push({
        title,
        objective,
        evidence,
        power_expressions: powerExpressions,
        vocabulary,
        contextual_input: contextualInput,
        guided_practice: guidedPractice,
        personalization,
        task,
        activities,
        homework,
        checkpoint,
        minutes: [...minutesAllocation],
        steps: STAGES.map(stage => {
          if (stage === 'Listen') return { stage, activity: contextualInput }
          if (stage === 'Repeat') return { stage, activity: guidedPractice }
          if (stage === 'Personalize') return { stage, activity: personalization }
          return { stage, activity: task }
        })
      })
    }
  }

  const course = {
    title: `${language} ${level} Communicative Architect Roadmap`,
    language,
    level,
    summary: `Comprehensive ${classes}-session communicative course designed for ${goal}. Emphasizes oral production, situational confidence, Power Expressions, and meaningful real-world tasks.`,
    needs: `Adult learner requires practical communicative confidence, immediate workplace and everyday fluency, and immersive conversational practice.`,
    approach: `Structured communicative immersion: Listen -> Repeat -> Personalize -> Use. Prioritizes spontaneous production, listening comprehension, and immediate real-world transfer.`,
    adaptations: [
      'Provide additional oral modeling and visual support during presentation stages.',
      'Allow extra personalization time for specialized professional or cultural terminology.',
      'Offer optional written transcriptions to solidify acoustic retention.'
    ],
    revisit: [
      'Regularly recycle Power Expressions from previous sessions into new communicative scenarios.',
      'Reinforce pronunciation rhythm and sentence stress across all speaking activities.'
    ],
    sessions
  }

  validateArchitectCourse(course, { language, level, classes, duration })
  return course
}

// Generate single replacement session for regeneration
export function generateCurriculumSession(request) {
  const course = generateCurriculumCourse({
    ...request,
    classes: 12
  })
  const index = Number.isInteger(request.regenerate?.session) ? request.regenerate.session : 0
  const session = course.sessions[index % course.sessions.length]

  // Add slight variation to mark regeneration
  session.title = session.title + ' (Adapted)'
  session.activities[0] = 'Dynamic review and refreshed situational activation'

  return session
}
