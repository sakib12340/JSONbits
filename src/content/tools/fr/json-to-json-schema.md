---
locale: fr
toolId: json-to-json-schema
title: JSON to JSON Schema
description: Déduisez un schéma JSON d’un exemple, avec détection des formats et des énumérations, choix de la version et options de titre, puis validez votre JSON.
summary: Transformez un document d’exemple en schéma JSON que vous pouvez modifier et réutiliser. Le générateur déduit les types, les clés obligatoires, les schémas d’éléments, les formats de chaîne courants et les énumérations de faible cardinalité, le tout dans votre navigateur.
steps:
  - Collez un exemple JSON représentatif dans le volet d’entrée.
  - Choisissez une version, activez la détection des formats ou des énumérations, puis appuyez sur Générer.
  - Copiez ou téléchargez le schéma, ou appuyez sur Valider avec ce schéma pour le tester sur l’exemple.
example:
  caption: Un petit exemple et le schéma qui en a été déduit.
  input: "{ \"name\": \"Ada\", \"age\": 36, \"email\": \"ada@example.com\" }"
  output: "{ \"$schema\": \"https://json-schema.org/draft/2020-12/schema\", \"type\": \"object\", \"properties\": { \"name\": { \"type\": \"string\" }, \"age\": { \"type\": \"integer\" }, \"email\": { \"type\": \"string\", \"format\": \"email\" } }, \"required\": [\"name\", \"age\", \"email\"] }"
mistakes:
  - Déduire d’un unique exemple clairsemé et supposer que les clés facultatives seront détectées ; ajoutez d’abord des exemples couvrant les cas manquants.
  - "Considérer un format détecté comme une garantie : les annotations JSON Schema décrivent une intention, et les validateurs ne les appliquent que s’ils sont configurés pour."
  - Utiliser un validateur draft-07 avec un schéma 2020-12 sans adapter l’URI $schema ni les mots-clés.
faq:
  - q: Comment le générateur décide-t-il quelles clés sont obligatoires ?
    a: Pour un objet unique, il marque toutes les clés de l’exemple comme obligatoires. Quand il fusionne les objets d’un tableau, une clé n’est obligatoire que si elle apparaît dans chaque élément. Cela correspond au cas courant où une collection d’enregistrements partage une forme stable avec quelques champs facultatifs.
  - q: Que se passe-t-il quand un même champ a des types différents ?
    a: La propriété fusionnée reçoit un tableau de types, par exemple ["string", "null"]. C’est du JSON Schema valide et la façon habituelle de décrire un champ parfois absent ou à null.
  - q: Quels formats de chaîne sont détectés ?
    a: "Le générateur reconnaît date-time, date, email, URI, UUID et IPv4 avec des motifs prudents. Un format est une annotation : il documente la forme attendue et certains validateurs l’appliquent, mais il ne modifie jamais le type chaîne sous-jacent."
  - q: Quand faut-il activer la détection des énumérations ?
    a: Utilisez-la pour de petits vocabulaires contrôlés comme les rôles ou les statuts. Le générateur n’ajoute une énumération que si au moins deux valeurs de chaîne distinctes apparaissent, avec huit valeurs maximum, afin de laisser les champs de texte libre tranquilles.
  - q: Puis-je valider le schéma généré immédiatement ?
    a: Oui. Le bouton Valider avec ce schéma transmet le schéma et votre exemple d’origine au Validateur de schéma JSON dans le même onglet. Rien n’est envoyé, et la transmission est effacée dès que le validateur l’a lue.
  - q: Le résultat est-il un schéma complet pour mon API ?
    a: C’est un point de départ, pas une spécification. L’inférence ne voit que les valeurs que vous avez collées. Ajoutez vous-même descriptions, contraintes et exemples, et nourrissez-le de plusieurs documents représentatifs avant de l’utiliser dans un pipeline.
---

Un JSON Schema est un document qui en décrit un autre : quelles propriétés existent, quels types elles contiennent, lesquelles sont obligatoires et quelles valeurs sont autorisées. Écrire un schéma à la main prend du temps, et le premier brouillon vient de toute façon d’un exemple. Cet outil inverse l’ordre. Collez un document JSON représentatif et il produit un schéma que vous pouvez modifier, partager ou transmettre à un validateur.

## Ce que couvre l’inférence

Le générateur parcourt le document analysé et produit un type pour chaque valeur. Les chaînes deviennent `string`, les nombres entiers `integer`, les décimales `number`, et `true`, `false` et `null` correspondent à leurs types JSON Schema respectifs. Les objets reçoivent une table `properties` et une liste `required`. Les tableaux reçoivent un schéma `items`. C’est là que se situe l’essentiel du travail : quand un tableau contient des objets, le générateur les fusionne en une seule forme. L’union de leurs clés forme l’ensemble des propriétés, tandis que seules les clés présentes dans chaque élément restent dans `required`. Un champ qui apparaît comme chaîne dans un enregistrement et à null dans un autre devient un tableau de types, si bien qu’aucune information n’est silencieusement perdue.

En option, le générateur peut ajouter une annotation `format` pour les chaînes qui ressemblent à une date-heure, une date, une adresse e-mail, une URI, un UUID ou une adresse IPv4. Il peut aussi ajouter des valeurs `enum` pour de petits vocabulaires de chaînes, mais seulement entre deux et huit valeurs distinctes. Vous pouvez choisir entre la version 2020-12 et la draft-07, fixer `additionalProperties: false`, et inclure une URI `$schema` ainsi qu’un titre.

## Comment l’utiliser

1. Collez un exemple JSON aussi représentatif que possible. Plusieurs enregistrements dans un tableau sont plus utiles qu’un seul.
2. Choisissez une version et les options souhaitées, puis appuyez sur Générer. Le travail s’exécute dans un Web Worker : un gros exemple ne fige donc pas la page.
3. Relisez le schéma, copiez-le ou téléchargez-le, ou appuyez sur Valider avec ce schéma pour vérifier l’exemple d’origine.

## Interpréter le résultat

Un schéma généré décrit ce qui a été observé, ce n’est pas un contrat signé. Si votre exemple contient cinq utilisateurs et qu’aucun n’a de champ `phone`, le schéma ne peut pas savoir que `phone` est autorisé. Inversement, une annotation de format ne prouve pas que chaque valeur réelle respecte ce format ; elle enregistre que les valeurs de l’exemple le respectaient. Traitez la sortie comme un premier brouillon et ajoutez les contraintes réellement nécessaires à votre application : longueurs minimales, bornes numériques, motifs, descriptions et exemples.

Le choix de la version compte quand vous déplacez le schéma vers un autre outil. La version 2020-12 utilise `https://json-schema.org/draft/2020-12/schema` comme URI `$schema`, tandis que la draft-07 utilise l’ancienne `http://json-schema.org/draft-07/schema#`. La plupart des validateurs déduisent le dialecte de cette URI : gardez donc l’option cohérente avec le validateur que vous prévoyez d’utiliser.

## Confidentialité

L’exemple ne quitte jamais votre navigateur. L’inférence s’exécute dans un Web Worker, l’outil n’effectue aucune requête réseau et le document n’est enregistré ni dans le stockage local ni dans celui de la session. Le bouton qui envoie le schéma au validateur utilise une transmission unique dans l’onglet courant et l’efface immédiatement après lecture.

## Erreurs fréquentes

Un document vide ou invalide ne peut pas être analysé, et le panneau d’erreur indique la ligne et la colonne exactes. Un tableau à la racine est accepté, mais s’il ne contient aucun objet il n’y a pas de champs à fusionner et `items` devient un schéma vide. La détection des énumérations est volontairement prudente ; si vous voulez un ensemble de valeurs fixes pour un champ avec une seule valeur observée, ajoutez l’énumération à la main.
