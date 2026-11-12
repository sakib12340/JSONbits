---
locale: fr
toolId: json-diff
title: JSON Diff
description: "Comparez deux documents JSON dans le navigateur et voyez chaque valeur ajoutée, supprimée ou modifiée dans une liste filtrable par chemin. Sans envoi."
summary: "Comparez deux documents JSON par structure et relisez les différences sous forme de liste de chemins plutôt que de deux murs de texte."
steps:
  - "Collez le document d’origine à gauche et le document modifié à droite, ou ouvrez chacun depuis un fichier."
  - "Cliquez sur Comparer ou appuyez sur Ctrl/Cmd+Entrée. Si les documents sont identiques, l’outil le dit aussitôt ; sinon, chaque différence est listée avec son chemin."
  - "Filtrez par ajout, suppression ou modification, copiez un chemin, ou activez Ignorer l’ordre des tableaux lorsque les mêmes éléments ont été réordonnés."
example:
  caption: "Une différence structurelle indique le chemin et les deux valeurs de chaque changement."
  input: |
    Original : { "name": "JSON Bits", "version": 1 }
    Modifié :  { "name": "JSON Bits", "version": 2, "private": true }
  output: |
    modifié   $.version   1 → 2
    ajouté    $.private   true
mistakes:
  - "Comparer du texte plutôt que des données. L’ordre des clés et l’indentation n’ont pas d’importance ici, donc un fichier reformaté ne montre aucun changement."
  - "Utiliser Ignorer l’ordre des tableaux lorsque les positions sont significatives. Les éléments réordonnés sont alors traités comme les mêmes valeurs."
  - "Comparer des documents qui ne peuvent pas être analysés. Corrigez d’abord la syntaxe ; l’erreur indique la ligne et la colonne."
faq:
  - q: "La comparaison est-elle textuelle ou structurelle ?"
    a: "Structurelle. Les deux documents sont analysés et comparés par chemin, donc l’indentation, les espaces et l’ordre des clés n’apparaissent jamais comme des différences."
  - q: "Que fait Ignorer l’ordre des tableaux ?"
    a: "Il associe les éléments du tableau par valeur plutôt que par position, donc déplacer un élément dans une liste n’est pas signalé comme une suppression et un ajout."
  - q: "Quelle taille peuvent avoir les deux documents ?"
    a: "Chaque document peut atteindre 20 Mo. Les entrées plus grandes sont refusées avec un message clair plutôt que de risquer un onglet figé."
  - q: "Mes documents sont-ils envoyés pour être comparés ?"
    a: "Non. Les deux documents sont analysés et comparés dans un Web Worker de cet onglet. Il n’y a aucun appel serveur et rien n’est stocké après la fermeture de l’onglet."
  - q: "La différence affiche-t-elle les anciennes et les nouvelles valeurs ?"
    a: "Oui. Les lignes modifiées montrent l’ancienne et la nouvelle valeur côte à côte, et les lignes ajoutées ou supprimées affichent la valeur apparue ou disparue."
---

L’outil JSON Diff compare deux documents par structure, pas par texte. Les deux entrées sont analysées dans un Web Worker, parcourues ensemble et réduites à une liste plate de chemins accompagnés d’un type : ajouté, supprimé ou modifié. Comme la comparaison a lieu après l’analyse, reformater un fichier, réordonner les clés ou changer l’indentation ne produit jamais de fausse différence.

Chaque ligne porte le chemin JSONPath du changement, l’ancienne valeur et la nouvelle lorsqu’elles existent toutes les deux. Les filtres réduisent la liste à un seul type de changement, et un chemin peut être copié pour un rapport de bogue ou un test. L’option Ignorer l’ordre des tableaux associe les éléments par valeur plutôt que par position, ce qui est souhaitable lorsqu’une API renvoie la même collection dans un autre ordre.

La comparaison s’exécute entièrement dans cet onglet. Les documents ne sont jamais envoyés, jamais écrits dans le stockage et sont abandonnés à la fermeture de la page. Chaque côté accepte des fichiers jusqu’à 20 Mo, et des documents identiques sont signalés comme identiques au lieu de produire une liste vide.
