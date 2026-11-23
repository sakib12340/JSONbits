---
locale: fr
toolId: ndjson-to-json
title: JSON Lines to JSON
description: Convertissez des JSON Lines en tableau JSON en ignorant les lignes invalides ou en vous arrêtant au premier problème, avec formatage et contrôle des vides.
summary: Rassemblez des enregistrements JSON délimités par des retours à la ligne en un seul tableau. Choisissez comment traiter les lignes invalides et vides, et formatez chaque enregistrement si vous le souhaitez, sans altérer les nombres.
steps:
  - Collez des JSON Lines dans le volet d’entrée ou déposez un fichier .ndjson / .jsonl.
  - Choisissez d’ignorer les lignes invalides, de supprimer les lignes vides et de formater chaque enregistrement.
  - Appuyez sur Exécuter, puis copiez le tableau JSON obtenu ou téléchargez-le.
example:
  caption: Deux lignes deviennent un seul tableau.
  input: "{\"id\":1}\\n{\"id\":2}"
  output: "[{\"id\":1},{\"id\":2}]"
mistakes:
  - Supposer que les lignes invalides sont ignorées par défaut ; choisissez explicitement Ignorer les lignes invalides.
  - Formater un jeu de données énorme alors qu’un tableau compact se téléchargerait bien plus vite.
  - Oublier que les lignes vides sont conservées sauf si l’option Supprimer les lignes vides est activée.
faq:
  - q: Que produit exactement cet outil ?
    a: Un seul tableau JSON dont les éléments sont les valeurs de chaque ligne non vide, dans l’ordre. Si une ligne contient un objet ou un nombre, cette valeur exacte devient l’élément correspondant. L’outil n’invente pas de clés et n’enveloppe pas les enregistrements, sauf si vous activez le formatage.
  - q: Que se passe-t-il pour les lignes invalides ?
    a: Par défaut, l’exécution s’arrête à la première ligne fautive et en indique le numéro, la colonne et une piste. Activez Ignorer les lignes invalides pour continuer ; ces enregistrements sont alors omis de la sortie. Utilisez d’abord le validateur JSON Lines si vous voulez un inventaire complet des erreurs.
  - q: Les lignes vides sont-elles incluses ?
    a: Les lignes vides deviennent des valeurs null quand l’option Supprimer les lignes vides est désactivée, car elles occupent toujours une position dans la séquence. Avec l’option activée, elles disparaissent entièrement et le tableau ne contient que les enregistrements des lignes non vides.
  - q: Le formatage modifie-t-il les données ?
    a: Non. Le formatage s’applique au texte de chaque enregistrement, et les tokens numériques sont conservés tels qu’écrits. Un grand entier comme 9007199254740993 reste exact au lieu d’être arrondi via un nombre JavaScript.
  - q: Peut-il traiter de très gros fichiers ?
    a: Oui. Les lignes sont lues par morceaux depuis le tampon de fichier transféré, et la progression est affichée pendant l’exécution. Les fichiers au-delà de la limite d’aperçu demandent une exécution explicite, et les sorties de plus de quatre mégaoctets sont proposées au téléchargement plutôt qu’injectées dans l’éditeur.
  - q: Quelque chose est-il envoyé ?
    a: Non. La lecture, la conversion et le formatage se déroulent tous dans votre navigateur. Aucune requête réseau pendant l’utilisation de l’outil, et aucune donnée n’est stockée de façon persistante.
---

JSON Lines est pratique pour les producteurs et les traitements en flux, mais la plupart des outils JSON attendent un tableau ou un objet unique. Convertir entre les deux formes est souvent la première étape avant d’analyser des données, de les importer dans une base de données ou de les transmettre à un formateur. Cet outil rassemble les lignes en un tableau tout en vous laissant la maîtrise des parties désagréables : enregistrements cassés, lignes vides et taille de la sortie.

## Le modèle de conversion

Le worker lit l’entrée par blocs et la découpe sur les caractères de retour à la ligne au fur et à mesure. Chaque ligne complète est analysée pour confirmer qu’elle est du JSON valide. Les lignes valides sont ajoutées à un tableau de sortie, en conservant leur texte d’origine pour que les nombres gardent leur représentation exacte. Si le formatage est activé, chaque enregistrement est mis en forme avec une indentation de deux espaces avant d’être ajouté. Le résultat est assemblé dans un constructeur en flux, si bien que la page ne détient jamais à la fois une énorme chaîne source et plusieurs copies de la sortie.

Les lignes invalides sont traitées selon votre choix. Avec le comportement par défaut, l’exécution s’arrête au premier problème et le panneau d’erreur indique le numéro de ligne, la colonne et une piste en clair. Activer Ignorer les lignes invalides permet de continuer et d’omettre ces enregistrements du tableau. Aucun des deux modes ne modifie silencieusement un enregistrement : une ligne qui s’analyse est copiée telle quelle, et une ligne qui échoue soit interrompt le travail, soit est laissée de côté.

Les lignes vides sont un cas à part. Un retour à la ligne final en fin de fichier est normal et ne crée pas par lui-même d’enregistrement vide. Les lignes vides au milieu restent en revanche des positions dans la séquence. Sans suppression, elles deviennent des éléments `null` ; avec suppression, elles disparaissent. La plupart des exports gagnent à être débarrassés de ces lignes.

## Comment l’utiliser

1. Collez des JSON Lines dans le volet d’entrée ou déposez un fichier `.ndjson` ou `.jsonl` sur la page.
2. Réglez les options concernant les lignes invalides, les lignes vides et le formatage.
3. Appuyez sur Exécuter. Copiez le tableau ou téléchargez-le sous le nom `result.txt` quand la sortie est volumineuse.

## Choisir la taille de la sortie

Le formatage rend un résultat plus lisible mais peut doubler ou tripler sa taille. Pour un fichier de plusieurs centaines de milliers d’enregistrements, un tableau compact est généralement le meilleur choix : il se télécharge plus vite et peut être traité par l’outil suivant sans reformatage. Si vous ne voulez inspecter que quelques enregistrements, exécutez avec le formatage activé, puis passez au Visualiseur JSON pour naviguer.

Quand la sortie dépasse quatre mégaoctets, le worker la renvoie sous forme de Blob. La page affiche sa taille et propose un bouton de téléchargement au lieu d’essayer de peindre des millions de caractères dans un éditeur. C’est le même chemin pour les grandes sorties que celui utilisé par les convertisseurs, et c’est ce qui garde le navigateur réactif sur les gros jeux de données.

## Confidentialité

Le fichier est décodé et traité dans un Web Worker sur votre machine. Rien n’est envoyé, aucune analyse n’observe l’entrée et aucun paramètre d’URL ne contient les données. La politique de sécurité du contenu du site comporte `connect-src 'none'`, ce qui rend vérifiable l’affirmation de zéro requête réseau plutôt que de s’en remettre à la confiance.

## Erreurs fréquentes

Une erreur « d’encodage » signifie que le fichier a été enregistré dans un format autre que l’UTF-8 ; réenregistrez-le en UTF-8. Une erreur de syntaxe avec un numéro de ligne pointe vers un enregistrement qui n’est pas du JSON complet. Si chaque ligne semble valide mais que l’exécution s’arrête quand même, cherchez des caractères invisibles comme un indicateur d’ordre des octets au début de la première ligne.
