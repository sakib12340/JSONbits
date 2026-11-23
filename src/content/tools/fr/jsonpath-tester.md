---
locale: fr
toolId: jsonpath-tester
title: JSONPath Tester
description: Testez des requêtes JSONPath sur votre JSON et voyez chaque correspondance avec son chemin et sa valeur. Filtres, tranches et unions. Rien n’est envoyé.
summary: Exécutez une expression JSONPath sur un document et lisez chaque correspondance avec son chemin exact, sa valeur, le temps écoulé et les détails de troncature.
steps:
  - Collez un document et une expression comme $.store.books[?(@.price < 10)], ou chargez l’exemple pour voir les filtres et les tranches à l’œuvre.
  - Appuyez sur Exécuter ou sur Ctrl/Cmd+Entrée. Le résultat liste chaque correspondance avec son chemin et sa valeur, le total et le temps écoulé.
  - Copiez le résultat complet ou téléchargez-le en .json, puis collez l’expression dans la bibliothèque ou le test qui l’exécutera.
example:
  caption: Un filtre renvoie une seule correspondance, et le résultat conserve l’expression, le chemin, la valeur et le temps écoulé.
  input: |
    {
      "store": {
        "books": [
          { "title": "A", "price": 8 },
          { "title": "B", "price": 14 }
        ]
      }
    }
  output: |
    {
      "expression": "$.store.books[?(@.price < 10)]",
      "matches": [
        { "path": "$.store.books[0]", "value": { "title": "A", "price": 8 } }
      ],
      "total": 1,
      "truncated": false,
      "timeMs": 1
    }
mistakes:
  - "Regrouper les conditions d’un filtre entre parenthèses. Ce sous-ensemble accepte && et || sans parenthèses : divisez la condition composée."
  - Laisser les chaînes sans guillemets dans un filtre. Comparez directement à un nombre, mais écrivez [?(@.status == 'open')] pour une chaîne.
  - "Supposer que toutes les implémentations JSONPath se valent. Descente récursive, unions et filtres diffèrent selon les bibliothèques : vérifiez dans la cible."
  - Écrire une expression trop large comme $..* et tout attendre en retour. Les correspondances sont plafonnées à 2 000 et le résultat à environ 2 Mo.
faq:
  - q: Quelle syntaxe JSONPath est prise en charge ?
    a: La racine $, les clés avec point et crochets, les index de tableau y compris négatifs, les jokers, la descente récursive, les tranches, les unions et les filtres avec opérateurs de comparaison, tests d’existence, négation, && et ||.
  - q: Les filtres peuvent-ils comparer des chaînes ?
    a: Oui, avec des guillemets simples ou doubles, contre des chaînes, des nombres, true, false et null. Un nom de membre seul comme @.id teste l’existence, et ! la nie.
  - q: Pourquoi le résultat indique-t-il qu’il est tronqué ?
    a: Chaque valeur est plafonnée à 20 000 caractères, les correspondances à 2 000 et le résultat entier à environ 2 Mo. Quand une limite s’applique, l’indicateur est activé pour qu’une réponse partielle ne soit jamais prise pour une réponse complète.
  - q: Où sont affichées les erreurs de syntaxe ?
    a: "Directement sous le champ de requête : un crochet manquant ou un opérateur non pris en charge est signalé à côté de l’expression qui l’a provoqué."
  - q: Le document quitte-t-il le navigateur ?
    a: Non. La requête s’exécute dans un Web Worker de cet onglet. Le document et le résultat restent sur l’appareil et rien n’est écrit dans le stockage.
---

JSONPath est un petit langage de requête pour JSON, l’équivalent d’un sélecteur CSS pour un document. Le testeur JSONPath exécute une expression sur vos données et renvoie un résultat structuré plutôt qu’un mur de correspondances, ce qui permet de vérifier une expression avant de l’intégrer dans un test, une règle de surveillance ou du code applicatif.

Le sous-ensemble pris en charge couvre la syntaxe sur laquelle la plupart des bibliothèques s’accordent. `$` est la racine, `.key` et `['key']` lisent un membre, `[0]` et `[-1]` indexent un tableau, et `[*]` ou `.*` sélectionne tous les enfants. La descente récursive avec `..key` ou `..*` cherche à tous les niveaux, les tranches comme `[1:4:2]` prennent une plage, et les unions comme `[0,2]` ou `['a','b']` combinent des sélections. Les filtres utilisent `[?(@.price < 10)]` avec `==`, `!=`, `<`, `<=`, `>` et `>=`, en comparant à des chaînes, des nombres, `true`, `false` ou `null`. Une expression comme `[?(@.id)]` teste l’existence, `!` la nie, et `&&` et `||` joignent les conditions sans parenthèses.

La sortie est du JSON que vous pouvez conserver. Elle enregistre l’expression, un tableau de correspondances avec un `path` et une `value`, le total, un indicateur `truncated` et le temps en millisecondes. Cette forme s’insère facilement dans un rapport de bogue ou un instantané de test, et les chemins utilisent la même notation que ceux que copie le visualiseur, donc une correspondance peut être retracée jusqu’au document.

Deux habitudes rendent une expression fiable. Exécutez d’abord la version la plus large de la requête, comme `$.items[*]`, et comparez le nombre de correspondances à quelque chose que vous pouvez vérifier à la main. Un filtre qui renvoie moins de lignes que prévu révèle généralement une incompatibilité de type : `"10"` et `10` sont des valeurs différentes, et une comparaison numérique ne correspondra pas à une chaîne. Exécutez ensuite la même expression dans l’outil et dans la bibliothèque qui l’exécutera en production. La descente récursive et les unions sont les points où les implémentations divergent le plus : une requête qui fonctionne ici peut nécessiter une petite réécriture dans un client Python ou Java.

La taille du résultat est volontairement bornée. Une seule valeur s’arrête à 20 000 caractères, la liste des correspondances à 2 000 entrées et le résultat entier à environ 2 Mo, avec `truncated` activé dès qu’une limite s’applique. Une expression large sur un grand document renvoie donc rapidement un résultat au lieu de figer l’onglet.

Les requêtes s’exécutent dans un Web Worker sur un document qui ne quitte jamais le navigateur. Pour explorer un document à la main, le [Visualiseur JSON](/json-viewer) affiche les mêmes chemins sous forme d’arbre, et le [Validateur de schéma JSON](/json-schema-validator) vérifie la forme des données trouvées.
