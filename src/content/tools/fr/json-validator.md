---
locale: fr
toolId: json-validator
title: JSON Validator
description: "Validez la syntaxe JSON dans le navigateur et obtenez la ligne et la colonne exactes de chaque erreur, avec des explications claires. Rien n’est envoyé."
summary: "Vérifiez si un document est du JSON valide et découvrez précisément où et pourquoi il échoue lorsque ce n’est pas le cas."
steps:
  - "Collez du JSON dans le volet d’entrée ou déposez un fichier .json sur la page. Le bouton Exemple charge un document court que vous pouvez casser volontairement."
  - "Cliquez sur Valider ou appuyez sur Ctrl/Cmd+Entrée. La validation est un contrôle de syntaxe, elle se termine donc en quelques millisecondes même sur un gros document."
  - "Lisez le résultat. Un JSON valide affiche le nombre d’objets, de tableaux, de clés et de valeurs ; un JSON invalide indique la ligne, la colonne et une correction suggérée."
example:
  caption: "Une virgule finale est signalée à la ligne et à la colonne où l’analyseur s’est arrêté."
  input: |
    {
      "name": "JSON Bits",
      "private": true,
    }
  output: |
    JSON invalide
    Ligne 4, colonne 1
    Piste : supprimez la virgule finale avant l’accolade fermante.
mistakes:
  - "Une virgule finale après la dernière propriété est l’échec le plus courant. JSON autorise une virgule seulement entre les membres, jamais après le dernier."
  - "Les commentaires, les clés sans guillemets et les chaînes entre apostrophes viennent des habitudes JavaScript et sont rejetés par la grammaire JSON."
  - "Les retours à la ligne ou tabulations littéraux dans une chaîne sont invalides ; utilisez les formes échappées \\n et \\t."
  - "Deux valeurs côte à côte, ou une virgule manquante entre deux propriétés, produisent une erreur qui pointe vers la seconde valeur plutôt que vers la virgule absente."
faq:
  - q: "Est-ce un validateur de schéma JSON ?"
    a: "Pas encore. Cette page vérifie uniquement la syntaxe JSON, ce qui fait échouer la plupart des documents cassés. Un validateur de schéma JSON séparé est prévu comme outil ultérieur."
  - q: "La validation envoie-t-elle mes données quelque part ?"
    a: "Non. Le contrôle s’exécute dans un Web Worker de cet onglet, et la page est conçue pour ne pas pouvoir effectuer de requête réseau pendant qu’un outil est ouvert."
  - q: "Quelle est la précision de l’emplacement de l’erreur ?"
    a: "Le validateur indique la ligne et la colonne où l’analyse s’est arrêtée, montre un extrait avec le caractère fautif et ajoute une piste nommant la cause probable."
  - q: "Puis-je valider un gros fichier ?"
    a: "Oui. Les fichiers jusqu’à 100 Mo sont acceptés. Les documents volumineux s’exécutent à la demande avec un état de progression, et le résultat reste un résumé au lieu d’afficher le fichier en texte."
  - q: "Un JSON valide signifie-t-il que les données sont correctes ?"
    a: "Non. La validité syntaxique signifie seulement que le document suit la grammaire JSON. Les champs obligatoires, les types et les règles métier demandent un schéma ou vos propres contrôles."
---

Le Validateur JSON répond précisément à une question : ce document suit-il la grammaire JSON et, sinon, où se casse-t-il ? Collez un document, déposez un fichier ou chargez l’exemple, puis cliquez sur Valider. Le contrôle s’exécute dans un Web Worker, donc même un fichier de plusieurs mégaoctets est examiné sans bloquer le défilement ni la saisie dans la page.

Pour une entrée valide, le résultat résume le document : combien d’objets et de tableaux il contient, combien de valeurs et de clés ont été comptées et combien de temps le contrôle a pris. Pour une entrée invalide, le panneau indique la ligne et la colonne où l’analyse s’est arrêtée, montre les caractères environnants et explique la cause probable en termes clairs, par exemple qu’une virgule avant une accolade fermante n’est pas autorisée.

La validation ne modifie pas vos données et ne les stocke pas. Rien n’est envoyé, et le document disparaît à la fermeture de l’onglet. Utilisez le formateur lorsque vous voulez le même contrôle plus une sortie indentée, ou JSON Repair lorsque les erreurs sont mécaniques et que vous préférez les corriger automatiquement.
