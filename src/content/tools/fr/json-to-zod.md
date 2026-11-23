---
locale: fr
toolId: json-to-zod
title: JSON to Zod
description: Générez des schémas Zod v4 à partir d’un exemple JSON, avec champs facultatifs ou nullables, objets stricts et export d’un type TypeScript inféré.
summary: Convertissez un exemple JSON en fichier de schéma Zod v4. Le générateur réutilise le même arbre d’inférence que l’outil TypeScript, produit les helpers de format modernes et peut ajouter des objets stricts et des exports de type z.infer.
steps:
  - Collez un exemple JSON représentatif dans le volet d’entrée.
  - Définissez un nom de schéma et choisissez d’exporter la constante, le type z.infer, les champs facultatifs et les objets stricts.
  - Appuyez sur Générer, puis copiez ou téléchargez le fichier TypeScript et importez-le dans votre projet.
example:
  caption: Un objet d’exemple et le schéma Zod généré à partir de celui-ci.
  input: "{ \"id\": 7, \"email\": \"ada@example.com\", \"active\": true }"
  output: "import { z } from \"zod\";\\n\\nexport const Root = z.object({\\n  id: z.number(),\\n  email: z.email(),\\n  active: z.boolean(),\\n});\\n\\nexport type Root = z.infer<typeof Root>;"
mistakes:
  - Supposer que l’inférence retrouve des contraintes invisibles, comme des longueurs minimales ou des plages numériques autorisées.
  - Oublier qu’un objet strict rejette les clés inconnues alors qu’un z.object simple les retire par défaut.
  - Utiliser des validateurs de chaîne chaînés de style Zod 3 alors que le code généré vise les helpers de premier niveau de Zod 4.
faq:
  - q: Quelle version de Zod le code généré vise-t-il ?
    a: Il vise Zod 4. Les formats de chaîne sont produits comme des helpers de premier niveau tels que z.email(), z.uuid(), z.url(), z.ipv4(), z.iso.date() et z.iso.datetime(), qui correspondent à la syntaxe actuelle documentée. En Zod 3, ces contrôles étaient des méthodes chaînées sur z.string().
  - q: Comment détecte-t-on les champs facultatifs et nullables ?
    a: Le générateur examine chaque objet d’un tableau. Une clé absente de certains éléments est marquée facultative, et une clé dont la valeur est null quelque part est enveloppée dans z.nullable(). Ces contrôles peuvent être désactivés si vous voulez une base plus stricte.
  - q: Que change l’option objets stricts ?
    a: Elle produit z.strictObject au lieu de z.object. Un objet Zod simple retire les clés inconnues du résultat analysé ; un objet strict les signale comme erreur. Choisissez le mode strict quand les champs inattendus doivent échouer bruyamment, par exemple à une frontière d’API.
  - q: L’export z.infer est-il nécessaire ?
    a: Non, mais il est pratique. Il vous donne un type TypeScript dérivé du schéma d’exécution, si bien que la validation et le typage statique restent synchronisés. Vous pouvez le désactiver si votre projet dérive ses types ailleurs.
  - q: Cet outil réutilise-t-il l’inférence de JSON vers TypeScript ?
    a: Oui. Les deux outils analysent l’exemple pour obtenir le même arbre syntaxique typé. Le générateur Zod parcourt cet arbre et émet des expressions de schéma plutôt que des déclarations d’interface, donc les deux sorties s’accordent sur les types, les champs facultatifs et les éléments de tableau fusionnés.
  - q: Mes exemples sont-ils envoyés ou stockés ?
    a: Non. La génération s’exécute dans un Web Worker de votre navigateur. Il n’y a aucun envoi, aucune analyse du contenu, aucun stockage persistant et aucun paramètre d’URL contenant l’exemple.
---

Zod valide les données à l’exécution et fournit aussi les types statiques utilisés à la compilation. C’est donc un bon choix pour les données qui franchissent une frontière : réponse d’API, soumission de formulaire ou fichier de configuration. La partie fastidieuse consiste à écrire la première version du schéma, généralement en lisant un exemple et en traduisant chaque champ à la main. Cet outil effectue cette traduction à partir d’un exemple que vous collez.

## Comment fonctionne la génération

Cet outil et JSON to TypeScript partent du même état d’analyse. Le document devient un arbre typé d’objets, de tableaux, de chaînes, de nombres, de booléens et de null. Le générateur Zod parcourt cet arbre et émet une expression pour chaque nœud. Les objets deviennent `z.object({ ... })`, les tableaux `z.array(...)`, et les valeurs scalaires les primitives Zod correspondantes. Les groupes d’objets dans un tableau sont fusionnés : leurs clés sont réunies, les clés absentes de certains enregistrements sont marquées facultatives, et les valeurs parfois à null deviennent nullables. Un seul exemple contenant quelques enregistrements produit donc souvent un schéma plus précis qu’un enregistrement isolé.

Les chaînes sont comparées à des motifs prudents pour les formats courants. Quand un groupe de chaînes correspond systématiquement à l’un d’eux, le générateur produit le helper Zod 4 associé : `z.email()`, `z.uuid()`, `z.url()`, `z.ipv4()`, `z.iso.date()` ou `z.iso.datetime()`. Ce sont les API de premier niveau actuellement documentées pour Zod 4 ; le code ancien utilisait des méthodes chaînées sur `z.string()`. Le fichier généré commence par `import { z } from "zod";` pour pouvoir être intégré directement dans un projet TypeScript.

## Comment l’utiliser

1. Collez un exemple JSON avec les champs qui vous intéressent. Incluez plusieurs éléments de tableau si un champ est parfois absent.
2. Définissez le nom du schéma et choisissez les options. `export const` convient à un module importable ; `z.infer` ajoute un type TypeScript correspondant.
3. Appuyez sur Générer, relisez le code, puis copiez-le ou téléchargez-le. Ajoutez les contraintes que l’exemple ne peut pas révéler, comme des longueurs, des plages ou des descriptions.

## Ce que l’inférence ne peut pas savoir

Un exemple montre des valeurs, pas des règles. Si toutes les chaînes de l’exemple font douze caractères, rien ne prouve que douze est une exigence. Si un nombre est positif dans l’exemple, le générateur produira quand même `z.number()`, car il ne peut pas savoir si les valeurs négatives sont interdites. Les formats sont des heuristiques : une valeur qui ressemble à une adresse e-mail en est probablement une, mais le motif est volontairement simple. Après la génération, modifiez le schéma pour exprimer le contrat réel et conservez quelques exemples représentatifs afin de pouvoir vérifier les changements futurs.

Dans Zod, les objets retirent les clés inconnues par défaut. Si votre application doit au contraire rejeter les champs inattendus, activez les objets stricts. Cela produit `z.strictObject`, qui signale les propriétés inconnues au lieu de les supprimer silencieusement. Cette distinction compte lorsqu’une faute de frappe dans une charge utile entrante doit être détectée au plus tôt.

## Confidentialité

L’exemple est traité dans un Web Worker et n’est jamais envoyé quelque part. La page n’a aucune analyse, aucune requête tiers et une politique de sécurité du contenu qui interdit les connexions sortantes. Rien de ce que vous collez n’est écrit dans le stockage, et le schéma n’apparaît jamais dans l’URL.

## Erreurs fréquentes

Un document vide ou invalide ne peut pas être analysé, et le panneau d’erreur indique la ligne et la colonne exactes. Une valeur scalaire à la racine produit une constante de type alias plutôt qu’un schéma objet. Les noms qui ne sont pas des identifiants JavaScript valides retombent sur `Root` : renommez la constante générée si vous avez besoin d’un export précis.
