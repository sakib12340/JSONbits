---
locale: fr
toolId: ndjson-to-csv
title: JSON Lines to CSV
description: Convertissez des JSON Lines en CSV avec aplatissement des chemins pointés, citation RFC 4180, ligne d’en-tête facultative et protection des formules.
summary: Transformez des enregistrements JSON délimités par des retours à la ligne en CSV adapté aux tableurs. Les objets imbriqués deviennent des colonnes à chemin pointé, les valeurs sont citées selon la RFC 4180 et les cellules ressemblant à des formules peuvent être neutralisées.
steps:
  - Collez un fichier JSON Lines dont les lignes contiennent des objets, ou déposez-le.
  - Choisissez le délimiteur, l’aplatissement, la ligne d’en-tête et la protection contre les formules.
  - Appuyez sur Exécuter, puis copiez le CSV ou téléchargez-le.
example:
  caption: Les objets imbriqués deviennent des colonnes à chemin pointé.
  input: "{\"name\":\"Ada\",\"address\":{\"city\":\"London\"}}\\n{\"name\":\"Grace\",\"address\":{\"city\":\"New York\"}}"
  output: name,address.city\nAda,London\nGrace,"New York"
mistakes:
  - Supposer que chaque ligne est un objet ; les enregistrements scalaux ne peuvent pas devenir des lignes CSV et sont signalés comme erreurs.
  - Désactiver la protection contre les formules quand le CSV sera ouvert dans un tableur.
  - Oublier que l’aplatissement crée des noms de colonnes avec des points, parfois à renommer pour le système cible.
faq:
  - q: Comment traite-t-on les objets imbriqués ?
    a: Avec l’aplatissement activé, une clé imbriquée devient un nom de colonne pointé comme address.city. Les tableaux sont sérialisés en texte JSON dans une cellule, sauf si vous choisissez une représentation jointe. Sans aplatissement, une valeur objet est écrite en texte JSON.
  - q: Comment décide-t-on de la citation ?
    a: L’écrivain suit la RFC 4180. Un champ est entouré de guillemets doubles s’il contient le délimiteur, un guillemet, un retour chariot, un retour à la ligne ou des espaces en début ou fin. Les guillemets internes sont doublés. Les lignes se terminent par CRLF, comme l’attendent les tableurs.
  - q: Que fait la protection contre les formules ?
    a: Une cellule commençant par =, +, -, @, une tabulation ou un retour chariot peut être interprétée comme une formule par un tableur. La protection préfixe ces valeurs d’une apostrophe pour qu’elles soient lues comme du texte. Activez-la dès que le CSV sera ouvert dans Excel ou un logiciel similaire.
  - q: Que se passe-t-il si une ligne est invalide ?
    a: Par défaut, l’exécution s’arrête à cette ligne et la signale. Activez Ignorer les lignes invalides pour continuer avec les enregistrements restants. Les lignes qui s’analysent mais ne sont pas des objets sont signalées séparément, car un scalaire ne peut pas fournir de colonnes CSV.
  - q: Les noms de colonnes viennent-ils de tous les enregistrements ?
    a: Les colonnes sont collectées dans l’ordre de première apparition parmi les enregistrements conservés. Si une clé n’apparaît que dans un enregistrement ultérieur, les lignes précédentes ont simplement une cellule vide pour cette colonne. C’est le comportement courant des exportateurs CSV.
  - q: Mes données quittent-elles le navigateur ?
    a: Non. L’analyse et l’écriture du CSV se déroulent toutes deux dans un Web Worker. Il n’y a aucun envoi, aucune analyse de contenu ni requête tiers ; la politique de sécurité du contenu interdit les connexions sortantes.
---

CSV et JSON Lines résolvent des problèmes différents. JSON Lines est excellent pour les machines : chaque ligne est une valeur JSON complète et de nouveaux enregistrements peuvent être ajoutés à peu de frais. CSV est excellent pour les personnes : tableurs, bases de données et outils de rapport l’ouvrent directement. Convertir de l’un à l’autre est une étape fréquente d’un flux de données, et la partie délicate consiste à décider comment du JSON imbriqué devient des colonnes plates.

## Comment fonctionne l’aplatissement

Chaque ligne non vide est analysée comme du JSON. Les valeurs qui sont des objets deviennent une seule ligne CSV. Quand l’aplatissement est activé, une propriété imbriquée comme `address.city` devient une colonne portant ce nom pointé, et l’imbrication plus profonde suit le même modèle. Les tableaux sont écrits en texte JSON par défaut, ce qui préserve leur structure dans une seule cellule. Une valeur qui est elle-même un objet sans aplatissement est également écrite en texte JSON.

Les colonnes sont découvertes dans tous les enregistrements conservés, dans l’ordre de leur première apparition. La ligne d’en-tête utilise ces noms. Si une clé manque dans un enregistrement particulier, sa cellule est vide. C’est pourquoi un import dans un tableur affiche souvent des colonnes irrégulières : les données sous-jacentes n’avaient simplement pas de valeur à cet endroit.

## Citation et sécurité

L’écrivain suit la RFC 4180. Un champ est cité s’il contient le délimiteur, un guillemet double, un retour chariot, un retour à la ligne ou des espaces en début ou fin de chaîne. Les guillemets à l’intérieur d’un champ sont doublés. Les lignes se terminent par CRLF, comme l’attendent les applications de tableur. Choisir un point-virgule ou une tabulation comme délimiteur est utile dans les langues où la virgule est le séparateur décimal.

La protection contre les formules est une petite fonctionnalité mais importante. Les valeurs qui commencent par `=`, `+`, `-`, `@`, une tabulation ou un retour chariot peuvent être traitées comme des formules par un tableur. Une cellule habilement construite pourrait alors déclencher une action inattendue à l’ouverture du fichier. Préfixer ces valeurs par une apostrophe en fait du texte brut. Elle est désactivée par défaut, car elle modifie la valeur de la cellule, mais c’est le bon choix pour tout CSV issu d’une entrée non fiable.

## Comment l’utiliser

1. Collez des JSON Lines dans le volet d’entrée ou déposez un fichier `.ndjson` ou `.jsonl` sur la page.
2. Choisissez un délimiteur et décidez de l’aplatissement, de la ligne d’en-tête et de la protection contre les formules.
3. Appuyez sur Exécuter, puis copiez le CSV ou téléchargez-le sous le nom `result.txt`. Renommez le fichier téléchargé en `.csv` pour votre tableur.

## Grandes entrées

Les lignes sont lues par blocs de taille fixe depuis un tampon de fichier transféré, si bien qu’un fichier même très volumineux ne devient jamais une gigantesque chaîne sur le fil principal. La progression est signalée pendant l’exécution et le worker peut être annulé. Une limite de sécurité plafonne le nombre de lignes collectées pour la sortie CSV, car un tableur a sa propre limite de lignes et construire une table sans borne annulerait l’intérêt du flux. Si votre jeu de données est plus grand, filtrez-le avant la conversion.

## Confidentialité

La conversion se déroule entièrement dans votre navigateur. Le site n’effectue aucune requête réseau pendant l’utilisation de l’outil, rien n’est stocké et les données ne sont jamais placées dans une URL. Cela compte ici, car les exports JSON Lines contiennent souvent des dossiers clients ou des identifiants internes.

## Erreurs fréquentes

Une ligne qui est du JSON valide mais non un objet est signalée comme erreur de ligne ; enveloppez d’abord les valeurs scalaires dans un objet avec une clé explicite. Une erreur de syntaxe indique le numéro de la ligne fautive et une piste. Si la sortie ressemble à une seule longue ligne, vérifiez le délimiteur : un fichier écrit avec des points-virgules ne se divisera pas en colonnes avec des réglages de virgule.
