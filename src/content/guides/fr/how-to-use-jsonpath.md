---
locale: fr
slug: how-to-use-jsonpath
title: Comment utiliser JSONPath
description: "Apprenez la syntaxe JSONPath avec des exemples : racine, accès par point et crochets, jokers, filtres, tranches et descente récursive, le tout en local."
updated: 2026-11-23
toolIds:
  - jsonpath-tester
  - json-viewer
  - json-formatter
faq:
  - q: Qu’est-ce que JSONPath ?
    a: JSONPath est un langage de requête pour JSON, semblable à XPath pour XML. Il sélectionne des valeurs dans un document à l’aide d’une expression courte commençant par $.
  - q: JSONPath est-il une norme ?
    a: Il n’existe pas de norme unique. Ce site suit la syntaxe courante utilisée par la plupart des outils, y compris les filtres, les tranches et la descente récursive.
  - q: Pourquoi ma requête ne renvoie-t-elle rien ?
    a: Vérifiez le symbole de racine, les noms de propriétés et les index de tableau. Une faute de frappe dans un nom de clé renvoie silencieusement un résultat vide plutôt qu’une erreur.
  - q: JSONPath peut-il modifier un document ?
    a: Non. Il ne fait que lire et sélectionner des valeurs. Pour changer des données, copiez le résultat et modifiez-le dans le formateur ou le visualiseur.
  - q: Combien de résultats peuvent être renvoyés ?
    a: Le testeur plafonne les correspondances affichées pour rester réactif, mais il indique le total réel et vous laisse télécharger le résultat complet.
---

JSONPath vous permet de demander à un document JSON les valeurs qui vous intéressent sans écrire de programme. Une expression part de la racine (`$`) et traverse les clés et les index de tableau.

## Accès de base

- `$` désigne le document entier.
- `$.store.book` lit une propriété nommée `book` dans `store`.
- `$['store']['book']` fait la même chose, ce qui est utile quand une clé contient des espaces ou des caractères spéciaux.
- `$.store.book[0]` lit le premier élément d’un tableau.
- `$.store.book[-1]` lit le dernier élément.

La notation par point est plus courte ; la notation par crochets est plus sûre pour les clés inhabituelles.

## Jokers et récursion

- `$.store.book[*]` sélectionne tous les livres.
- `$..author` trouve tous les champs `author` à n’importe quelle profondeur, ce qui est pratique pour des métadonnées dispersées.
- `$.store.book[0,2]` sélectionne le premier et le troisième livre.

## Tranches

Les tranches de tableau ressemblent à Python : `$.store.book[1:3]` sélectionne les index 1 et 2, et `$.store.book[:2]` prend les deux premiers. Un pas comme `[::2]` sélectionne un élément sur deux.

## Filtres

Les filtres se placent entre crochets et commencent par `?` :

- `$.store.book[?(@.price < 10)]` sélectionne les livres dont le prix est inférieur à 10.
- `$.store.book[?(@.category == 'fiction')]` correspond à une valeur de chaîne.
- `$.store.book[?(@.isbn)]` conserve les éléments qui ont un champ `isbn`.

Combinez les conditions avec `&&` et `||`, et niez avec `!`. Les comparaisons acceptent `==`, `!=`, `<`, `<=`, `>` et `>=`.

## Erreurs fréquentes

- Oublier le `$` initial.
- Utiliser un accès de propriété JavaScript comme `store.book` sans la racine.
- Confondre les index de tableau qui commencent à zéro.
- S’attendre à ce qu’un filtre renvoie l’objet parent au lieu de l’élément correspondant.

Testez vos expressions sur un document réel dans le testeur JSONPath, puis envoyez le résultat à un autre outil avec le menu partagé « Envoyer à ».

## Travailler avec le testeur

Collez ou déposez un document dans le volet d’entrée, saisissez une expression et lisez les valeurs correspondantes avec leurs chemins. Le testeur fonctionne entièrement dans votre navigateur : les gros fichiers ne quittent jamais votre appareil. Basculez entre les modes de résultat pour voir les valeurs, les tableaux aplatis, la première correspondance, les seuls chemins, ou les chemins associés aux valeurs.

Chaque correspondance affiche son chemin JSONPath, que vous pouvez copier directement dans du code. Quand une requête renvoie plus de correspondances que la limite d’affichage, la ligne d’état indique le total réel et un bouton de téléchargement enregistre la liste complète.

## Conseils de performance

- Affinez avec un filtre avant d’appliquer un joker, pour ne pas parcourir tout l’arbre.
- Utilisez `$.chemin` plutôt que `$..` quand vous connaissez la structure, car la descente récursive examine chaque nœud.
- Pour de très gros fichiers, commencez par un petit échantillon pour valider l’expression, puis exécutez-la sur le document complet.
- Gardez des expressions lisibles : un prédicat par filtre, et découpez les requêtes complexes en étapes.

## Interpréter les résultats

Une requête réussie renvoie un tableau de correspondances même s’il n’y en a qu’une. Un tableau vide signifie que l’expression était valide mais n’a rien trouvé, tandis qu’un message d’erreur rouge indique que la syntaxe elle-même a été refusée. Corrigez d’abord les erreurs de syntaxe, puis ajustez le prédicat jusqu’à ce que le nombre de correspondances corresponde à votre attente.
