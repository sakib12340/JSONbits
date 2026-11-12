---
locale: fr
toolId: json-viewer
title: JSON Viewer
description: "Explorez de grands JSON dans un arbre virtualisé et rapide, dans le navigateur. Recherchez clés et valeurs, copiez des chemins JSONPath, ouvrez au besoin."
summary: "Lisez un grand document JSON sous forme d’arbre avec ouverture différée, recherche et chemins copiables au lieu d’un mur de texte."
steps:
  - "Collez du JSON ou déposez un fichier, puis cliquez sur Voir l’arbre ou appuyez sur Ctrl/Cmd+Entrée. L’exemple charge un document imbriqué avec des tableaux, des objets et des valeurs mixtes."
  - "Ouvrez les lignes avec les flèches ou un clic. Développer jusqu’au niveau ouvre plusieurs niveaux d’un coup ; Tout replier revient à la racine."
  - "Utilisez Rechercher pour trouver des clés ou des valeurs, puis copiez un chemin JSONPath ou la valeur de la ligne sélectionnée."
example:
  caption: "Une ligne par nœud, avec des badges de type, le nombre d’enfants et le chemin JSONPath de la sélection."
  input: |
    {
      "team": [
        { "name": "Ada", "role": "engineer" },
        { "name": "Grace", "role": "admiral" }
      ]
    }
  output: |
    team                 array (2)
      0                  objet (2)
        name             "Ada"
        role             "engineer"
      1                  objet (2)
mistakes:
  - "Coller du JSON avec une virgule finale empêche la construction de l’arbre ; l’erreur indique la ligne exacte."
  - "Attendre que tous les nœuds soient rendus d’un coup. Les grands documents s’ouvrent à la demande, donc les branches repliées ne sont pas dans le DOM."
  - "Copier une valeur encore repliée. Ouvrez d’abord le nœud, ou copiez le chemin et inspectez-le ailleurs."
faq:
  - q: "Quelle taille de document le visualiseur peut-il ouvrir ?"
    a: "Les fichiers jusqu’à 100 Mo sont acceptés. L’arbre est virtualisé et récupéré par tranches depuis le worker, donc seules les lignes visibles existent dans la page à un instant donné."
  - q: "Le visualiseur se fige-t-il sur les gros fichiers ?"
    a: "Non. L’analyse et l’indexation se font dans un Web Worker, et le résultat est rendu sous forme de liste virtualisée, donc le défilement reste fluide au lieu de bloquer le fil principal."
  - q: "Quel format utilisent les chemins copiés ?"
    a: "Les chemins sont des expressions JSONPath comme $.team[0].name, prêtes à être collées dans un outil de requête, un test ou une documentation."
  - q: "Puis-je rechercher des valeurs en plus des clés ?"
    a: "Oui. La recherche correspond aux clés et aux valeurs scalaires, indique combien de résultats ont été trouvés et permet de passer de l’un à l’autre."
  - q: "Le visualiseur envoie-t-il ou stocke-t-il mon JSON ?"
    a: "Non. Le document est analysé dans votre navigateur et abandonné à la fermeture de l’onglet. Rien n’est envoyé à un serveur et rien n’est écrit dans le stockage."
---

Le Visualiseur JSON présente un document comme un arbre de lignes plutôt que comme un bloc de texte. Chaque ligne affiche une clé, son type et un aperçu de la valeur, avec un compteur pour les objets et les tableaux. Les branches s’ouvrent à la demande, donc un document de dizaines de milliers de nœuds s’affiche instantanément et reste fluide pendant le défilement.

L’arbre est construit dans un Web Worker et servi à la page par tranches. Cette architecture libère le fil principal : la page ne contient que les lignes actuellement visibles, pas le document entier. La recherche s’exécute dans le même worker et correspond aux clés comme aux valeurs scalaires, en renvoyant un nombre de résultats et un moyen de les parcourir.

Les chemins sont affichés en JSONPath, par exemple `$.team[0].name`, et peuvent être copiés en une action, avec la valeur elle-même. Le visualiseur est donc utile pour déboguer une réponse d’API, vérifier quel champ a changé ou transmettre un chemin précis à un collègue. Tout reste sur votre appareil : aucun envoi, aucun compte et aucun document stocké.
