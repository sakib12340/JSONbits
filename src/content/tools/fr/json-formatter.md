---
locale: fr
toolId: json-formatter
title: JSON Formatter
description: "Formatez et indentez du JSON dans le navigateur avec 2 ou 4 espaces, ou des tabulations. Erreurs précises, grands nombres intacts, rien n’est envoyé."
summary: "Transformez du JSON compact ou mal espacé en un document régulièrement indenté, sans modifier la moindre valeur."
steps:
  - "Collez du JSON dans le volet d’entrée, déposez un fichier .json n’importe où sur la page ou cliquez sur Ouvrir un fichier. Exemple charge un document avec des objets imbriqués, des tableaux et un entier 64 bits."
  - "Choisissez la taille d’indentation dans la barre d’outils. Deux espaces est la valeur par défaut ; quatre espaces ou des tabulations correspondent à la plupart des éditeurs et fichiers de configuration."
  - "Cliquez sur Formater ou appuyez sur Ctrl/Cmd+Entrée, puis copiez le résultat ou téléchargez-le sous le nom formatted.json."
example:
  caption: "Entrée compacte à gauche, sortie formatée à droite."
  input: '{"project":"JSON Bits","private":true,"downloads":9007199254740993,"tags":["json","formatter"]}'
  output: |
    {
      "project": "JSON Bits",
      "private": true,
      "downloads": 9007199254740993,
      "tags": ["json", "formatter"]
    }
mistakes:
  - "Les virgules finales après la dernière propriété ou le dernier élément d’un tableau sont invalides en JSON. Supprimez-la, ou passez le document dans JSON Repair."
  - "Les commentaires copiés depuis JavaScript (// ou /* */) ne font pas partie de la grammaire JSON et doivent être retirés."
  - "Les clés sans guillemets et les chaînes entre apostrophes sont du JavaScript valide, pas du JSON. Entourez clés et chaînes de guillemets doubles."
  - "Les guillemets typographiques collés depuis un traitement de texte ressemblent à des guillemets doubles, mais forment un autre caractère. Remplacez-les par des guillemets droits."
faq:
  - q: "Mon JSON est-il envoyé quelque part ?"
    a: "Non. Le formatage s’exécute dans un Web Worker à l’intérieur de cet onglet. La page n’effectue aucune requête réseau pendant que vous travaillez, et aucun serveur ne pourrait recevoir le document."
  - q: "Le formatage modifie-t-il les grands nombres ?"
    a: "Non. Le formateur copie les tokens numériques tels quels au lieu de les analyser puis de les sérialiser à nouveau. 9007199254740993 garde ses seize chiffres et les longs décimales conservent chaque position."
  - q: "Quelle taille de fichier puis-je formater ?"
    a: "Les fichiers jusqu’à 100 Mo sont acceptés. Les entrées de moins de 1 Mo se mettent à jour pendant la saisie ; les documents plus grands s’exécutent à la demande avec un état de progression pour que la page ne se fige jamais."
  - q: "Pourquoi un JSON qui semble valide produit-il une erreur ?"
    a: "Les causes habituelles sont une virgule finale, un commentaire ou des apostrophes. Le panneau d’erreur indique la ligne et la colonne, montre un extrait et suggère la correction en termes clairs."
  - q: "Puis-je formater un fichier sans l’ouvrir dans un éditeur de texte ?"
    a: "Oui. Déposez le fichier sur la page ou cliquez sur Ouvrir un fichier. Le formateur le lit en local, affiche son nom et sa taille, et propose le résultat formaté au téléchargement."
---

Le Formateur JSON transforme du JSON compact ou irrégulièrement espacé en un document facile à lire, à relire et à comparer. Il analyse le texte avec un tokenizer plutôt qu’avec `JSON.parse`, si bien que les tokens numériques sont copiés exactement tels qu’ils ont été écrits. Un entier 64 bits comme `9007199254740993` conserve tous ses chiffres au lieu de devenir silencieusement `9007199254740992`, et les décimales de haute précision gardent chaque position. Seuls les espaces changent.

Tout s’exécute dans un Web Worker à l’intérieur de cet onglet. Le texte que vous collez, déposez ou ouvrez n’est jamais envoyé nulle part : il n’y a ni point de terminaison de téléchargement, ni compte, ni analyse qui lirait le contenu. Les documents volumineux passent par le même worker, donc un fichier de plusieurs mégaoctets affiche un état de progression au lieu de figer la page.

Si le document est invalide, le formateur s’arrête au premier problème et indique la ligne, la colonne, un court extrait et une piste claire. Corrigez l’entrée puis relancez. La préférence d’indentation est stockée uniquement dans ce navigateur ; le JSON lui-même n’est jamais conservé.
