---
locale: pt
toolId: json-to-zod
title: JSON to Zod
description: "Gere esquemas Zod v4 a partir de uma amostra JSON com campos opcionais e anuláveis, objetos estritos e um tipo TypeScript inferido pronto para usar."
summary: "Converta um exemplo JSON em um arquivo de esquema Zod v4. O gerador reutiliza a mesma árvore de inferência da ferramenta TypeScript, emite helpers modernos de formato e pode adicionar objetos estritos e exports de tipo z.infer."
steps:
  - "Cole uma amostra JSON representativa no painel de entrada."
  - "Defina um nome para o esquema e escolha se quer exportar a constante, o tipo z.infer, campos opcionais e objetos estritos."
  - "Pressione Gerar, depois copie ou baixe o arquivo TypeScript e importe-o no seu projeto."
example:
  caption: "Um objeto de exemplo e o esquema Zod gerado a partir dele."
  input: '{ "id": 7, "email": "ada@example.com", "active": true }'
  output: 'import { z } from "zod";\n\nexport const Root = z.object({\n  id: z.number(),\n  email: z.email(),\n  active: z.boolean(),\n});\n\nexport type Root = z.infer<typeof Root>;'
mistakes:
  - "Supor que a inferência recupera restrições que não pode ver, como tamanhos mínimos ou intervalos numéricos permitidos."
  - "Esquecer que um objeto estrito rejeita chaves desconhecidas, enquanto um z.object comum as remove por padrão."
  - "Usar validadores de string encadeados do Zod 3 quando o código gerado usa os helpers de nível superior do Zod 4."
faq:
  - q: "Qual versão do Zod o código gerado usa?"
    a: "Ele usa o Zod 4. Formatos de string são emitidos como helpers de nível superior como z.email(), z.uuid(), z.url(), z.ipv4(), z.iso.date() e z.iso.datetime(), que é a sintaxe atual documentada. No Zod 3 essas checagens eram métodos encadeados em z.string()."
  - q: "Como campos opcionais e anuláveis são detectados?"
    a: "O gerador examina todos os objetos de um array. Uma chave ausente em alguns elementos é marcada como opcional, e uma chave cujo valor é null em algum lugar é envolvida em z.nullable(). Essas checagens podem ser desativadas se você quiser uma base mais estrita."
  - q: "O que a opção de objetos estritos muda?"
    a: "Ela emite z.strictObject em vez de z.object. Um objeto Zod comum remove chaves desconhecidas do resultado analisado; um objeto estrito as reporta como erro. Escolha estrito quando campos inesperados devem falhar de forma explícita, por exemplo em uma fronteira de API."
  - q: "O export z.infer é necessário?"
    a: "Não, mas é conveniente. Ele dá a você um tipo TypeScript derivado do esquema em runtime, então validação e tipagem estática ficam sincronizadas. Você pode desativá-lo se seu projeto deriva tipos de outra forma."
  - q: "Esta ferramenta reutiliza a inferência de JSON para TypeScript?"
    a: "Sim. As duas ferramentas analisam a amostra na mesma árvore de sintaxe tipada. O gerador Zod percorre essa árvore e emite expressões de esquema em vez de declarações de interface, então as duas saídas concordam sobre tipos, campos opcionais e itens mesclados de arrays."
  - q: "Minhas amostras são enviadas ou armazenadas?"
    a: "Não. A geração roda em um Web Worker no seu navegador. Não há upload, nem análises sobre a entrada, nem armazenamento persistente, nem parâmetro de URL contendo a amostra."
---

O Zod valida dados em runtime e também pode fornecer os tipos estáticos que você usa em tempo de compilação. Isso o torna uma boa escolha para dados que cruzam uma fronteira: uma resposta de API, o envio de um formulário ou um arquivo de configuração. A parte tediosa é escrever a primeira versão do esquema, o que geralmente significa ler um exemplo e traduzir cada campo à mão. Esta ferramenta faz essa tradução a partir de uma amostra que você cola.

## Como a geração funciona

Esta ferramenta e o JSON to TypeScript começam da mesma etapa de análise. O documento se torna uma árvore tipada de objetos, arrays, strings, números, booleanos e nulls. O gerador Zod percorre essa árvore e emite uma expressão para cada nó. Objetos viram `z.object({ ... })`, arrays viram `z.array(...)`, e escalares viram os primitivos Zod correspondentes. Grupos de objetos dentro de um array são mesclados: suas chaves são unidas, chaves ausentes em alguns registros são marcadas como opcionais, e valores que às vezes são null se tornam anuláveis. Isso significa que uma única amostra com alguns registros costuma produzir um esquema mais preciso do que um registro isolado.

Valores string são checados com padrões conservadores para formatos comuns. Quando um grupo de strings corresponde a um deles de forma consistente, o gerador emite o helper do Zod 4 correspondente: `z.email()`, `z.uuid()`, `z.url()`, `z.ipv4()`, `z.iso.date()` ou `z.iso.datetime()`. Essas são as APIs de nível superior atuais documentadas para o Zod 4; códigos mais antigos usavam métodos encadeados em `z.string()`. O arquivo gerado começa com `import { z } from "zod";` para poder ser colado direto em um projeto TypeScript.

## Como usar

1. Cole uma amostra JSON com os campos que importam. Inclua vários itens de array se algum campo às vezes estiver ausente.
2. Defina o nome do esquema e escolha as opções. `export const` é útil para um módulo importável; `z.infer` adiciona um tipo TypeScript correspondente.
3. Pressione Gerar, revise o código e depois copie ou baixe-o. Adicione restrições que a amostra não consegue revelar, como tamanhos, intervalos ou descrições.

## O que a inferência não consegue dizer

Uma amostra mostra valores, não regras. Se toda string do exemplo tiver doze caracteres, não há evidência de que doze seja um requisito. Se um número for positivo na amostra, o gerador ainda assim emitirá `z.number()`, porque não pode saber se valores negativos são proibidos. Formatos são heurísticas: um valor que parece um endereço de e-mail provavelmente é um, mas o padrão é deliberadamente simples. Depois de gerar, edite o esquema para codificar o contrato real e mantenha alguns fixtures representativos para que mudanças futuras possam ser verificadas contra ele.

Objetos no Zod removem chaves desconhecidas por padrão. Se sua aplicação deve rejeitar campos inesperados, ative objetos estritos. Isso emite `z.strictObject`, que reporta propriedades desconhecidas em vez de descartá-las silenciosamente. Essa distinção importa quando um erro de digitação em um payload recebido deve ser detectado cedo.

## Privacidade

A amostra é processada dentro de um Web Worker e nunca é enviada a lugar algum. A página não tem análises, nem requisições de terceiros, e uma política de segurança de conteúdo que proíbe conexões externas. Nada do que você cola é gravado no armazenamento, e o esquema nunca aparece na URL.

## Erros comuns

Um documento vazio ou inválido não pode ser analisado, e o painel de erro mostra a linha e a coluna exatas. Um primitivo de nível superior produz uma constante em estilo alias em vez de um esquema de objeto. Nomes que não são identificadores JavaScript válidos voltam para `Root`, então renomeie a constante gerada se precisar de um export específico.
