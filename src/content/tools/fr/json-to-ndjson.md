---
locale: fr
toolId: json-to-ndjson
title: JSON to JSON Lines
description: Transformez un tableau JSON en JSON délimité par des retours à la ligne, un enregistrement compact par ligne, prêt pour les journaux et les pipelines.
summary: Séparez un tableau JSON en une valeur JSON compacte par ligne. Le résultat est facile à compléter, facile à diffuser en flux, et accepté par les outils de journaux et de données qui attendent du JSON Lines.
steps:
  - Collez un tableau JSON, ou déposez un fichier .json, dans le volet d’entrée.
  - Appuyez sur Exécuter. Chaque élément devient une ligne de JSON compact.
  - Copiez les lignes ou téléchargez-les sous forme de fichier .ndjson.
example:
  caption: Un tableau devient deux enregistrements.
  input: "[{\"id\":1},{\"id\":2}]"
  output: "{\"id\":1}\\n{\"id\":2}"
mistakes:
  - Fournir un objet au lieu d’un tableau ; NDJSON exige une séquence de valeurs au premier niveau.
  - Attendre une indentation dans la sortie ; chaque enregistrement est volontairement une ligne compacte.
  - Ajouter des lignes à un fichier qui conserve encore le crochet fermant d’un export précédent.
faq:
  - q: Pourquoi l’entrée doit-elle être un tableau ?
    a: "NDJSON représente une séquence d’enregistrements. Un tableau est la source naturelle, car ses éléments forment déjà une séquence ordonnée. Un objet unique produirait une ligne, ce qui est du JSON Lines légal mais presque jamais ce que l’on attend de cette conversion : l’outil explique donc la règle au lieu de deviner."
  - q: Pourquoi chaque enregistrement est-il sur une seule ligne ?
    a: La ligne est la frontière de l’enregistrement. Si un enregistrement était formaté sur plusieurs lignes, un lecteur ne pourrait plus découper un flux sur les retours à la ligne. Une sortie compacte est une exigence du format, pas un choix esthétique.
  - q: Les grands nombres survivent-ils à la conversion ?
    a: Oui. Le générateur sérialise les valeurs à partir de l’arbre syntaxique analysé en utilisant leur texte numérique d’origine. Un entier 64 bits ou un long décimal est écrit tel quel, sans être arrondi par une conversion en nombre JavaScript.
  - q: Puis-je convertir des tableaux ou objets imbriqués ?
    a: "Oui. Chaque élément peut être n’importe quelle valeur JSON : un objet, un tableau, une chaîne ou un nombre. Les structures imbriquées restent dans leur propre ligne. Seul le tableau de premier niveau est aplati en lignes."
  - q: Que se passe-t-il avec un tableau vide ?
    a: "La sortie est vide. C’est cohérent avec le format : zéro enregistrement produit zéro ligne. Ajoutez au moins un élément si vous attendiez du contenu."
  - q: Mes données sont-elles envoyées ?
    a: Non. L’analyse et la sérialisation s’exécutent dans un Web Worker du navigateur. Il n’y a aucune requête tiers, aucune analyse du contenu et rien n’est écrit dans le stockage persistant.
---

Un tableau JSON est un document complet. Un fichier JSON Lines est une suite de documents indépendants qui se trouvent stockés un par ligne. La différence paraît faible, mais elle change la façon dont les données sont produites et consommées. Vous pouvez ajouter un enregistrement à un fichier JSON Lines en écrivant une ligne de plus ; l’ajouter à un tableau suppose de modifier le crochet fermant. Les outils de journaux et les frameworks de streaming préfèrent la forme lignée, car ils peuvent commencer à lire avant que le fichier soit terminé.

## Ce que fait le convertisseur

L’outil analyse l’entrée en arbre syntaxique typé, puis parcourt le tableau de premier niveau et écrit chaque élément comme une valeur JSON compacte suivie d’un retour à la ligne. Comme l’écriture utilise l’arbre analysé plutôt qu’un sérialiseur d’objets générique, les tokens numériques sont préservés exactement. Un long entier reste long, et un décimal à beaucoup de chiffres n’est pas raccourci. Les chaînes sont échappées selon les règles JSON : une valeur contenant un retour à la ligne devient `\n` à l’intérieur de sa propre ligne plutôt que de rompre l’enregistrement.

La sortie est construite de façon incrémentale. Pour un grand tableau, le worker émet les lignes au fur et à mesure et signale sa progression, ce qui laisse le fil principal libre. Quand le résultat dépasse quatre mégaoctets, la page le propose au téléchargement au lieu de l’afficher dans un éditeur. Le téléchargement utilise le type de contenu `.ndjson` pour que les outils en aval reconnaissent le format.

## Comment l’utiliser

1. Collez un tableau JSON dans le volet d’entrée ou déposez un fichier `.json` sur la page.
2. Appuyez sur Exécuter. L’outil vérifie que la valeur racine est un tableau.
3. Copiez les lignes obtenues ou téléchargez-les sous forme de fichier `.ndjson`.

## Pourquoi la racine doit être un tableau

C’est une protection délibérée. Si l’entrée était un objet, l’outil devrait décider s’il écrit l’objet lui-même, ses valeurs ou quelque chose de dérivé de ses clés. Chaque choix serait une supposition, et une mauvaise supposition produirait silencieusement un fichier à la mauvaise forme. Signaler une erreur claire est plus sûr. Si vous voulez une seule ligne à partir d’un objet, enveloppez-le vous-même dans un tableau : `[{"a":1}]` produit `{"a":1}`.

Une erreur courante consiste à fournir à l’outil un fichier qui ressemble à du NDJSON mais conserve encore `[` et `]` autour de l’ensemble. Ces crochets en font un tableau JSON, qui est précisément ce que cet outil attend. Les retirer serait une autre opération : ce convertisseur considère que le tableau est intentionnel.

## Travailler avec le résultat

Vérifiez la première et la dernière ligne de la sortie avant de la transmettre à un autre système. Chaque ligne doit pouvoir s’analyser seule. Si vous comptez modifier le fichier à la main, gardez des lignes courtes et n’ajoutez pas de commentaire : JSON Lines n’a pas de syntaxe de commentaire. Un marqueur comme `_comment` dans un enregistrement est une convention comprise par certains outils, mais reste une simple donnée.

Pour la direction inverse, JSON Lines vers JSON rassemble les enregistrements en tableau. Les deux conversions ne sont pas parfaitement symétriques si des lignes vides étaient présentes, car les enregistrements sont des positions dans une séquence. Documentez si votre pipeline conserve les lignes vides et réglez l’option de suppression en conséquence.

## Confidentialité

Vos données restent sur cet appareil. L’analyse et la sérialisation se déroulent dans un Web Worker, le site n’effectue aucune requête réseau pendant l’utilisation de l’outil, et aucun contenu n’est placé dans l’URL ni écrit dans le stockage. La page de confidentialité décrit les mêmes garanties en langage clair.

## Erreurs fréquentes

Une erreur de syntaxe à la première ligne signifie généralement que l’entrée n’est pas du JSON du tout, ou qu’elle contient une virgule finale. Le message « doit être un tableau de premier niveau » signifie que la valeur racine est un objet, une chaîne ou un nombre. Enveloppez-la dans un tableau si c’était votre intention.
