---
locale: fr
toolId: jwt-decoder
title: JWT Decoder
description: Décodez en local les en-têtes et charges utiles JWT, lisez les claims et les échéances en clair, et comprenez pourquoi la signature n’est jamais vérifiée.
summary: "Un décodeur JWT sépare un JSON Web Token en en-tête et charge utile, décode les deux segments en base64url et affiche les claims en clair. Tout se passe dans votre navigateur : le jeton n’est ni envoyé, ni stocké, ni ajouté à l’URL."
steps:
  - Collez un JWT dans le volet d’entrée. Un préfixe « Bearer » et les retours à la ligne sont acceptés.
  - Appuyez sur Décoder. Le worker sépare le jeton, décode l’en-tête et la charge utile en base64url, puis analyse les deux objets JSON.
  - "Lisez le tableau des claims : expiration, émetteur, sujet et algorithme. Utilisez Copier ou Télécharger pour le JSON décodé."
example:
  caption: Un jeton décodé avec une date d’expiration, un émetteur et un sujet.
  input: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiYWRhIiwiZXhwIjoxODkzNDU2MDAwfQ.signature
  output: |-
    {
      "header": { "alg": "HS256", "typ": "JWT" },
      "payload": {
        "iss": "https://example.com",
        "sub": "ada",
        "exp": 1893456000
      }
    }
mistakes:
  - "Considérer un jeton décodé comme une preuve d’identité : décoder ne fait que lire les segments, sans vérifier la signature."
  - "Coller un jeton chiffré à cinq parties (JWE) : ils ne peuvent pas être décodés sans clé de déchiffrement."
  - Supposer que le claim exp est toujours présent ; un jeton peut l’omettre ou utiliser un autre claim pour sa durée de vie.
faq:
  - q: Cet outil vérifie-t-il la signature JWT ?
    a: Non. Décoder lit les segments encodés en base64url et analyse le JSON qu’ils contiennent. Vérifier une signature demande la clé de l’émetteur et un contrôle cryptographique, que cet outil refuse volontairement de faire. Il vous avertit quand l’en-tête indique alg à none ou quand le segment de signature est absent.
  - q: Mon jeton est-il envoyé ou stocké quelque part ?
    a: Non. Le jeton est décodé dans un Web Worker de votre navigateur. La page n’effectue aucune requête réseau pendant que vous utilisez l’outil, le jeton n’est écrit ni dans localStorage ni dans IndexedDB, et il n’est jamais placé dans la barre d’adresse. Fermer l’onglet le supprime.
  - q: Pourquoi vois-je un avertissement indiquant que le jeton a expiré ?
    a: Si la charge utile contient un claim exp numérique, le décodeur le compare à l’heure actuelle. La valeur est exprimée en secondes depuis l’époque Unix, pas en millisecondes. Le tableau des claims affiche le même instant en UTC et dans votre fuseau horaire local pour que vous puissiez en juger vous-même.
  - q: Quelle est la différence entre un JWT et un JWE ?
    a: "Un JWT signé, plus précisément un JWS, comporte trois parties séparées par des points : en-tête, charge utile et signature. Sa charge utile n’a besoin que d’un décodage base64url pour être lisible. Un JWE est chiffré et comporte cinq parties ; sa charge utile ne peut être lue sans la clé de déchiffrement, aussi ce décodeur la refuse plutôt que d’afficher du charabia."
  - q: Puis-je coller un jeton qui commence par Bearer ?
    a: Oui. Le décodeur retire un préfixe Bearer en début de chaîne, ignore la casse et supprime les espaces et retours à la ligne. Les jetons copiés depuis un en-tête Authorization ou une ligne de journal repliée deviennent ainsi utilisables sans nettoyage manuel.
  - q: alg, typ et kid sont-ils des claims d’en-tête ou de charge utile ?
    a: Ce sont des claims d’en-tête. L’en-tête décrit la façon dont le jeton est encodé et quelle clé l’a signé. Les claims comme iss, sub, aud, exp, iat et nbf appartiennent à la charge utile. Le tableau des claims les regroupe pour que vous distinguiez les deux ensembles d’un coup d’œil.
---

Un JSON Web Token est trois chaînes séparées par des points : un en-tête, une charge utile et une signature. Les deux premières sont des objets JSON encodés en base64url, un alphabet base64 que l’on peut placer sans risque dans une URL. Décoder consiste à inverser cet encodage et à lire le JSON. C’est une opération d’affichage, pas un contrôle de sécurité, et garder ces deux idées distinctes est la première raison d’utiliser un décodeur dédié.

## Ce que le décodeur affiche

L’outil sépare le jeton, décode l’en-tête et la charge utile, puis analyse les deux objets. Le tableau des claims met ensuite en avant les champs que l’on cherche le plus souvent. Les claims temporels numériques comme `exp`, `iat` et `nbf` sont affichés en secondes depuis l’époque Unix, avec un horodatage UTC, un horodatage local et une formulation relative comme « expire dans 2 heures » ou « expiré il y a 3 jours ». Un jeton expiré est signalé dans la zone d’avertissement. Les claims textuels comme `iss`, `sub` et `aud` figurent à côté des claims d’en-tête comme `alg`, `typ` et `kid`, pour que vous voyiez d’où vient chaque valeur. L’en-tête et la charge utile décodés complets sont aussi disponibles en JSON formaté, à copier ou à télécharger.

## Comment l’utiliser

1. Collez le jeton dans le volet d’entrée. Un préfixe `Bearer ` est accepté, tout comme les retours à la ligne introduits par un visualiseur de journaux ou un client de messagerie.
2. Appuyez sur Décoder. Le travail s’exécute dans un Web Worker : même un jeton collé au milieu d’autres textes ne fait pas saccader la page.
3. Lisez les claims et les avertissements, puis copiez ou téléchargez le JSON décodé si vous devez continuer à travailler dessus.

## Pourquoi la signature n’est pas vérifiée

Vérifier un jeton consiste à contrôler que sa signature a été produite par une clé de confiance. Cela suppose de connaître l’émetteur, de disposer ou d’aller chercher la bonne clé publique, de choisir un algorithme accepté et de comparer le résultat en temps constant. Un décodeur n’a aucun de ces éléments. Il ne peut montrer que ce que le jeton dit de lui-même. Un jeton dont l’en-tête indique `alg` à `none`, ou dont le segment de signature est vide, reste parfaitement décodable et c’est précisément le genre de jeton qu’un attaquant vous transmettrait. C’est pourquoi l’avertissement reste visible au-dessus de l’outil au lieu d’apparaître seulement après un problème.

Si vous avez besoin d’une décision de confiance, prenez-la dans le service qui détient le secret ou la clé publique. Utilisez les valeurs décodées comme point de départ du débogage : confirmez que l’émetteur et l’audience sont ceux attendus, vérifiez que l’expiration est cohérente, puis laissez le vérificateur trancher.

## Les jetons chiffrés sont différents

Un jeton à cinq parties est un JWE, pas un JWT signé. Sa charge utile est chiffrée : le décodage base64url produit des octets qui ne sont pas du JSON. Cet outil signale clairement ce cas au lieu d’afficher des caractères de remplacement ou une erreur d’analyse. Traiter un JWE demande la clé privée du destinataire et une bibliothèque JOSE configurée avec les algorithmes attendus.

## Confidentialité

Les jetons sont des identifiants. Quiconque en lit un peut éventuellement agir au nom de l’utilisateur qu’il représente. Ce décodeur fonctionne entièrement dans votre navigateur : aucun envoi, aucune analyse du contenu, aucun stockage persistant et aucun paramètre d’URL contenant le jeton. La politique de sécurité du contenu de la page interdit les connexions sortantes, ce qui rend cette affirmation vérifiable plutôt que purement promesse. Traitez le JSON décodé que vous téléchargez avec la même prudence que le jeton d’origine, et videz votre presse-papiers lorsque vous avez terminé.

## Erreurs fréquentes

Un jeton à deux parties est généralement un JWS avec une signature vide ; il est décodé avec un avertissement sur la signature manquante. Un jeton à quatre parties ou plus, hors cas du JWE à cinq parties, est mal formé. Un segment que le décodage base64url échoue à lire, ou qui donne des octets qui ne sont pas du JSON UTF-8, est signalé avec une piste en clair plutôt qu’une pile d’appel.
