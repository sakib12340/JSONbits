---
locale: fr
toolId: ndjson-validator
title: JSON Lines Validator
description: Validez les fichiers JSON Lines ligne par ligne avec des numéros précis, le compte des lignes vides et une liste d’erreurs plafonnée cliquable pour sauter.
summary: Vérifiez chaque ligne d’un fichier JSON Lines ou NDJSON indépendamment. Le validateur indique les numéros de ligne exacts, distingue les lignes vides des lignes invalides et vous mène directement au premier enregistrement fautif.
steps:
  - Collez vos données JSON Lines ou déposez un fichier .ndjson / .jsonl sur la page.
  - Choisissez de vous arrêter ou non à la première erreur, puis appuyez sur Valider.
  - Lisez le résumé et la liste d’erreurs ; cliquez sur une erreur pour sauter à cette ligne dans l’entrée.
example:
  caption: Une ligne valide suivie d’une ligne invalide.
  input: "{\"id\":1,\"name\":\"Ada\"}\\n{\"id\":2,\"name\":}"
  output: Lines 2 · Valid 1 · Invalid 1 · Blank 0\nL2:17 Expected a value
mistakes:
  - Traiter le fichier entier comme un seul document JSON ; JSON Lines valide chaque ligne séparément.
  - Oublier qu’un retour à la ligne final est normal et ne crée pas d’enregistrement supplémentaire.
  - Supposer que la première erreur est la seule ; désactivez l’arrêt au premier pour voir un résultat plafonné sur tout le fichier.
faq:
  - q: Qu’est-ce qu’un fichier JSON Lines ?
    a: C’est un fichier texte où chaque ligne est une valeur JSON complète et indépendante. Il n’y a ni tableau enveloppant ni virgules entre les enregistrements. On peut ainsi ajouter un enregistrement sans réécrire le fichier, et le lire ligne par ligne.
  - q: En quoi la validation diffère-t-elle d’un validateur JSON classique ?
    a: "Un validateur classique analyse un seul document. Ici, chaque ligne est son propre document : l’outil signale donc un numéro de ligne pour chaque problème et compte séparément les lignes valides, invalides et vides. Un seul enregistrement cassé ne rend pas le reste du fichier inutilisable."
  - q: Pourquoi la liste d’erreurs est-elle plafonnée ?
    a: "Un gros fichier cassé peut contenir des milliers d’erreurs. Les afficher toutes figerait la page : l’outil conserve donc les mille premières et indique le total réel. La liste est virtualisée, ce qui signifie que seules les lignes à l’écran existent dans le document."
  - q: L’outil envoie-t-il mon fichier ?
    a: Non. Le fichier est lu dans votre navigateur et transmis par morceaux à un Web Worker. Il n’y a aucune requête réseau, rien n’est écrit dans le stockage et le contenu n’apparaît jamais dans l’URL.
  - q: Que fait l’option s’arrêter à la première erreur ?
    a: Elle interrompt l’analyse dès qu’une ligne fautive est trouvée. C’est utile quand vous corrigez un fichier problème par problème et ne voulez pas attendre une analyse complète d’une très grande entrée.
---

JSON Lines, aussi appelé NDJSON, stocke une valeur JSON par ligne. Le format est volontairement minuscule : ni tableau enveloppant, ni virgules, ni règles d’indentation partagées. Cette simplicité en fait un favori pour les journaux, les flux d’événements et les grands jeux de données, car un producteur peut ajouter une ligne et un consommateur en lire une sans charger tout le fichier. Le compromis est qu’une ligne mal formée ne produit pas une erreur globale de fichier comme le ferait un document JSON classique. Chaque ligne doit être vérifiée pour elle-même.

## Ce que signale ce validateur

L’outil lit l’entrée par blocs de taille fixe et sépare les lignes au fur et à mesure, si bien qu’un fichier de cent mégaoctets ne devient pas une énorme chaîne JavaScript. Chaque ligne est analysée indépendamment. Les lignes vides sont comptées à part des enregistrements réels, car un retour à la ligne final est normal et une ligne vide au milieu est généralement inoffensive. Les comptes de lignes valides et invalides sont affichés à côté du total.

Quand une ligne échoue à l’analyse, l’outil enregistre son numéro, la colonne où le problème a été trouvé, le message et une piste en clair. Les mille premières erreurs sont conservées, avec le total réel indiqué à côté. La liste est virtualisée : seules les lignes actuellement à l’écran sont créées, donc le défilement d’une longue liste d’erreurs reste fluide. Cliquer sur une ligne place le curseur de l’éditeur à cette ligne.

## Comment l’utiliser

1. Collez des JSON Lines dans le volet d’entrée ou déposez un fichier `.ndjson` ou `.jsonl` n’importe où sur la page.
2. Décidez de vous arrêter ou non à la première erreur. Laissez l’option désactivée pour voir un échantillon plafonné de tous les problèmes.
3. Appuyez sur Valider, lisez le résumé et cliquez sur une erreur pour sauter à la ligne fautive.

## Interpréter les résultats

Un compte élevé de lignes invalides avec un faible nombre de lignes signifie généralement que le fichier est en réalité un tableau JSON joliment indenté plutôt que des JSON Lines. Ce format va dans le Formateur JSON ; convertissez-le d’abord en NDJSON. Un compte élevé de lignes vides vient souvent d’un export qui insère des séparateurs entre les enregistrements. Activez la suppression des lignes vides lors de la conversion si vous voulez les éliminer.

Les numéros de colonne sont relatifs à chaque ligne, et non au fichier. Cela correspond à la façon dont les éditeurs affichent le curseur et rend l’erreur exploitable : la colonne indique où dans l’enregistrement l’analyseur a abandonné. La piste explique la cause probable en langage ordinaire, par exemple une chaîne non terminée ou une virgule manquante.

## Grands fichiers

Les fichiers au-delà de la limite d’aperçu ne sont pas affichés dans l’éditeur. La page montre plutôt le nom et la taille du fichier et attend une exécution explicite. Le worker signale sa progression pendant l’analyse, et l’annulation interrompt le travail. Les situations de mémoire insuffisante sont signalées par un message aimable plutôt que par un plantage de l’onglet. Le fil principal reste ainsi réactif même quand l’entrée dépasse largement la zone de confort de l’éditeur du navigateur.

## Confidentialité

Un fichier JSON Lines peut contenir des données personnelles, des jetons ou des dossiers clients. Le fichier est lu en local, traité dans un Web Worker et jamais envoyé. Le site n’a aucune analyse et une politique de sécurité du contenu qui interdit les connexions sortantes. Rien de ce que vous collez ou déposez n’est enregistré dans le stockage local ou celui de la session.

## Erreurs fréquentes

Une ligne contenant un seul nombre ou une seule chaîne est du JSON valide et comptée comme valide, même si de nombreux pipelines attendent des objets. Si votre outil en aval a besoin d’objets, convertissez avec l’outil JSON Lines vers CSV et examinez les messages « doit être un objet ». Un fichier encodé en UTF-16 est refusé avec une piste sur l’encodage ; enregistrez-le d’abord en UTF-8.
