---
locale: fr
toolId: json-repair
title: JSON Repair
description: "Réparez du JSON invalide dans le navigateur : virgules finales, commentaires, guillemets et littéraux Python, avec le détail des corrections."
summary: "Corrigez les erreurs mécaniques qui rendent un JSON invalide et voyez exactement quelles réparations ont été appliquées avant d’utiliser le résultat."
steps:
  - "Collez le document cassé ou déposez un fichier. Appuyez sur Réparer ou sur Ctrl/Cmd+Entrée ; l’exemple réunit plusieurs erreurs courantes à la fois."
  - "Parcourez la liste des corrections appliquées, comme les virgules finales supprimées ou les guillemets typographiques remplacés, à côté de la sortie réparée."
  - "Copiez ou téléchargez le JSON propre, puis passez-le dans le validateur pour confirmer le résultat avant de le publier."
example:
  caption: "Le rapport de réparation nomme chaque changement pour que rien ne soit corrigé en silence."
  input: |
    {
      name: 'JSON Bits',   // product name
      "private": True,
    }
  output: |
    {
      "name": "JSON Bits",
      "private": true
    }
mistakes:
  - "Réparer un document auquel il manque une valeur ou un crochet. Les corrections mécaniques ne peuvent pas inventer de données, le résultat échoue donc encore à la validation."
  - "Supposer que la sortie réparée est sémantiquement correcte. Parcourez la liste des corrections ; un commentaire supprimé pouvait porter une information."
  - "Utiliser la réparation sur un document qui n’est pas du JSON, comme un module JavaScript avec des imports et des expressions."
faq:
  - q: "Quelles erreurs peuvent être réparées automatiquement ?"
    a: "Les commentaires, les virgules finales, les chaînes entre guillemets simples, les guillemets typographiques, les clés sans guillemets et les littéraux Python comme None, True et False. Chaque réparation est listée pour que vous puissiez la vérifier."
  - q: "La réparation modifie-t-elle mes données ?"
    a: "Elle ne réécrit que la syntaxe. Les clés, les valeurs et leur ordre restent identiques, et les jetons numériques sont conservés plutôt que recalculés."
  - q: "La réparation peut-elle fermer un crochet manquant ?"
    a: "Pas de manière fiable. L’outil corrige les erreurs courantes de ponctuation et de guillemets ; un document structurellement incomplet demande une correction manuelle, et le validateur indique où il casse."
  - q: "Puis-je faire confiance à la sortie réparée ?"
    a: "Parcourez d’abord la liste des corrections. Les réparations sont déterministes et affichées explicitement, mais supprimer un commentaire ou convertir True en true est une décision que vous devez confirmer."
  - q: "Le JSON cassé est-il envoyé à un serveur ?"
    a: "Non. La réparation s’exécute dans un Web Worker de cet onglet, donc les documents invalides comme les documents valides restent sur votre appareil."
---

JSON Repair traite les erreurs qui rendent un document invalide pour des raisons mécaniques et ennuyeuses. Les commentaires, les virgules finales, les guillemets simples, les guillemets typographiques d’un traitement de texte, les clés sans guillemets et les littéraux Python comme `True` ou `None` sont réécrits en JSON valide, et chaque changement est listé pour que le résultat ne soit jamais une boîte noire.

La réparation s’exécute dans un Web Worker, la page reste donc réactive même avec une entrée volumineuse. Les jetons numériques sont copiés en texte, ce qui signifie qu’un document réparé conserve intacts ses entiers de 64 bits et ses décimales longues. La sortie peut être copiée ou téléchargée immédiatement.

Réparer est une commodité, pas un remplacement de la relecture. Si un commentaire portait un sens, ou si un littéral Python était volontaire, la liste des corrections indique ce qui a changé pour que vous puissiez décider. Après la réparation, passez le document dans le validateur JSON pour confirmer qu’il est analysé, puis continuez avec le formateur ou la visionneuse. Rien n’est envoyé à aucun moment.
