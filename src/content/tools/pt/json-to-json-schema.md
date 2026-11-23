---
locale: pt
toolId: json-to-json-schema
title: JSON to JSON Schema
description: "Inferir um JSON Schema a partir de uma amostra com formatos e enums detectados, opções de draft e título, e depois validar seu JSON com ele."
summary: "Transforme um documento de exemplo em um JSON Schema que você pode editar e reutilizar. O gerador infere tipos, chaves obrigatórias, esquemas de itens, formatos comuns de string e enums de baixa cardinalidade, tudo no seu navegador."
steps:
  - "Cole uma amostra JSON representativa no painel de entrada."
  - "Escolha um draft, ative a detecção de formatos ou enums e pressione Gerar."
  - "Copie ou baixe o esquema, ou pressione Validar com este esquema para testá-lo com a mesma amostra."
example:
  caption: "Uma amostra pequena e o esquema inferido a partir dela."
  input: '{ "name": "Ada", "age": 36, "email": "ada@example.com" }'
  output: '{ "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "integer" }, "email": { "type": "string", "format": "email" } }, "required": ["name", "age", "email"] }'
mistakes:
  - "Inferir a partir de uma única amostra esparsa e supor que chaves opcionais serão detectadas; adicione amostras que cubram os casos ausentes primeiro."
  - "Tratar um formato detectado como garantia: anotações de JSON Schema descrevem intenção, e validadores só as aplicam quando configurados para isso."
  - "Usar um validador draft-07 com um esquema 2020-12 sem ajustar a URI $schema e as palavras-chave."
faq:
  - q: "Como o gerador decide quais chaves são obrigatórias?"
    a: "Para um único objeto, ele marca todas as chaves da amostra como obrigatórias. Ao mesclar os objetos dentro de um array, uma chave só é obrigatória quando aparece em todos os elementos. Isso corresponde ao caso comum em que uma coleção de registros compartilha uma forma estável com alguns campos opcionais."
  - q: "O que acontece quando o mesmo campo tem tipos diferentes?"
    a: "A propriedade mesclada recebe um array de tipos, por exemplo [\"string\", \"null\"]. Isso é JSON Schema válido e é a forma usual de descrever um campo que às vezes está ausente como null."
  - q: "Quais formatos de string são detectados?"
    a: "O gerador reconhece date-time, date, email, URI, UUID e IPv4 com padrões conservadores. Um formato é uma anotação: documenta a forma esperada e alguns validadores a aplicam, mas nunca altera o tipo string subjacente."
  - q: "Quando devo ativar a detecção de enums?"
    a: "Use-a para vocabulários controlados pequenos, como papéis ou status. O gerador adiciona um enum somente quando há pelo menos dois valores string distintos e no máximo oito, então campos de texto livre ficam intactos."
  - q: "Posso validar o esquema gerado imediatamente?"
    a: "Sim. O botão Validar com este esquema passa o esquema e sua amostra original para o JSON Schema Validator na mesma sessão da aba. Nada é enviado, e o repasse é limpo assim que o validador o lê."
  - q: "O resultado é um esquema completo para minha API?"
    a: "É um ponto de partida, não uma especificação. A inferência só vê os valores que você colou. Adicione descrições, restrições e exemplos você mesmo, e alimente-o com vários documentos representativos antes de confiar nele em um pipeline."
---

Um JSON Schema é um documento que descreve outro documento: quais propriedades existem, que tipos elas contêm, quais são obrigatórias e quais valores são permitidos. Escrever um à mão é demorado, e o primeiro rascunho geralmente vem de um exemplo de todo modo. Esta ferramenta inverte a ordem. Cole um documento JSON representativo e ela produz um esquema que você pode editar, compartilhar ou entregar a um validador.

## O que a inferência cobre

O gerador percorre o documento analisado e emite um tipo para cada valor. Strings viram `string`, números inteiros viram `integer`, decimais viram `number`, e `true`, `false` e `null` mapeiam para os tipos JSON Schema correspondentes. Objetos recebem um mapa `properties` e uma lista `required`. Arrays recebem um esquema `items`. Essa última parte é onde está a maior parte do trabalho: quando um array contém objetos, o gerador os mescla em uma única forma. A união das chaves se torna o conjunto de propriedades, enquanto apenas as chaves presentes em todos os elementos permanecem em `required`. Um campo que aparece como string em um registro e como null em outro vira um array de tipos, então nenhuma informação é descartada silenciosamente.

Opcionalmente, o gerador pode adicionar uma anotação `format` para strings que parecem data-hora, data, endereço de e-mail, URI, UUID ou endereço IPv4. Ele também pode adicionar valores `enum` para vocabulários string pequenos, mas somente quando há entre dois e oito valores distintos. Você pode escolher entre draft 2020-12 e draft-07, definir `additionalProperties: false` e incluir uma URI `$schema` e um título.

## Como usar

1. Cole uma amostra JSON tão representativa quanto você conseguir. Vários registros em um array são mais úteis do que um só.
2. Escolha um draft e as opções desejadas, então pressione Gerar. O trabalho roda em um Web Worker, então uma amostra grande não congela a página.
3. Revise o esquema, copie ou baixe-o, ou pressione Validar com este esquema para checar a amostra original com ele.

## Como ler o resultado

Um esquema gerado é uma descrição do que foi observado, não um contrato assinado por alguém. Se sua amostra tem cinco usuários e nenhum deles tem um campo `phone`, o esquema não pode saber que `phone` é permitido. Por outro lado, uma anotação de formato não prova que todo valor real segue aquele formato; ela registra que os valores da amostra seguiam. Trate a saída como um primeiro rascunho e adicione as restrições que sua aplicação realmente precisa: tamanhos mínimos, limites numéricos, padrões, descrições e exemplos.

A escolha do draft importa quando você leva o esquema para outra ferramenta. O draft 2020-12 usa `https://json-schema.org/draft/2020-12/schema` como URI `$schema`, enquanto o draft-07 usa a URI mais antiga `http://json-schema.org/draft-07/schema#`. A maioria dos validadores detecta o dialeto por essa URI, então mantenha a opção consistente com o validador que você pretende usar.

## Privacidade

A amostra nunca sai do seu navegador. A inferência roda em um Web Worker, a ferramenta não faz requisições de rede e o documento não é salvo no armazenamento local nem de sessão. O botão que envia o esquema ao validador usa um repasse de uso único na aba atual e o limpa imediatamente após a leitura.

## Erros comuns

Um documento vazio ou inválido não pode ser inferido, e o painel de erro aponta a linha e a coluna exatas. Um array de nível superior é aceito, mas se ele não contiver objetos não há conjunto de campos para mesclar, então `items` se torna um esquema vazio. A detecção de enums é deliberadamente conservadora; se você quiser um conjunto fixo de valores para um campo com apenas um valor observado, adicione o enum manualmente.
