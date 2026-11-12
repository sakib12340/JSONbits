---
locale: fr
toolId: json-minifier
title: JSON Minifier
description: "Minifiez du JSON en supprimant les espaces sans toucher aux valeurs ni à la précision. Voyez les octets gagnés, puis copiez ou téléchargez le résultat."
summary: "Supprimez les espaces insignifiants du JSON et vérifiez exactement de combien le document devient plus petit."
steps:
  - "Collez ou déposez le JSON à compresser. L’exemple montre un document formaté avec des objets et des tableaux imbriqués."
  - "Cliquez sur Minifier ou appuyez sur Ctrl/Cmd+Entrée. La barre de statistiques indique la taille d’entrée, la taille de sortie et le pourcentage économisé."
  - "Copiez le résultat compact ou téléchargez-le sous le nom minified.json pour un fichier de configuration, une charge utile d’API ou un bundle."
example:
  caption: "Le même document après minification, avec la réduction de taille indiquée au-dessus de la sortie."
  input: |
    {
      "name": "JSON Bits",
      "tags": ["json", "minify"],
      "private": true
    }
  output: '{"name":"JSON Bits","tags":["json","minify"],"private":true}'
mistakes:
  - "Minifier du JSON invalide produit une erreur au lieu d’une sortie. Lancez d’abord le validateur ou l’outil de réparation."
  - "Supprimer les espaces dans une chaîne corromprait la valeur, donc le minificateur ne retire que les espaces entre les tokens."
  - "Reformater ensuite restaure la lisibilité, mais c’est la forme compacte qu’un serveur de production ou un bundle doit livrer."
faq:
  - q: "La minification change-t-elle mes valeurs ?"
    a: "Non. Seuls les espaces entre les tokens sont supprimés. Les chaînes, les clés, les tokens numériques et leur ordre restent exactement tels qu’ils ont été écrits, y compris les grands entiers et les longs décimales."
  - q: "Combien d’espace la minification économise-t-elle ?"
    a: "Cela dépend de l’indentation. Le JSON imprimé avec deux espaces diminue souvent de 20 à 40 pour cent, tandis qu’une entrée déjà compacte n’économise presque rien ou rien du tout."
  - q: "Le JSON minifié reste-t-il valide ?"
    a: "Oui, si l’entrée était valide. La sortie est le même document sans espace insignifiant, donc chaque analyseur le lit de la même manière."
  - q: "Puis-je minifier un fichier plutôt que du texte collé ?"
    a: "Oui. Déposez un fichier .json sur la page ou utilisez Ouvrir un fichier. Les gros fichiers sont traités dans le worker en arrière-plan et le résultat peut être téléchargé directement."
  - q: "Pourquoi la page avertit-elle au-delà de 50 Mo ?"
    a: "Les documents très volumineux peuvent épuiser la mémoire de l’onglet. L’avertissement vous permet de décider avant de lancer une exécution qui pourrait prendre quelques secondes."
---

Le Minificateur JSON supprime les espaces qui rendent le JSON lisible mais coûtent des octets : indentation, retours à la ligne et espaces autour de la ponctuation. Il analyse le document de manière sûre et le réémet sans ces caractères, si bien que le résultat est un JSON équivalent octet pour octet que tout analyseur lit de la même façon.

Le traitement des nombres est volontaire. Au lieu de les convertir en nombres JavaScript puis de les sérialiser à nouveau, le minificateur conserve les tokens numériques sous forme de texte : `9007199254740993` ne devient pas `9007199254740992` et `4.999999999999999` garde tous ses chiffres. Les chaînes ne sont jamais touchées, ce qui signifie que les espaces à l’intérieur d’une valeur survivent, tandis que ceux entre les tokens disparaissent.

La barre de statistiques affiche la taille avant et après, plus le pourcentage économisé, ce qui est utile pour vérifier si une charge utile mérite d’être compressée ou si gzip fait déjà le travail. Tout s’exécute dans cet onglet. Votre JSON n’est ni envoyé, ni stocké, ni journalisé, et le téléchargement est généré localement à partir du résultat.
