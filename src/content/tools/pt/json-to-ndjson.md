---
locale: pt
toolId: json-to-ndjson
title: JSON to JSON Lines
description: "Transforme um array JSON em JSON delimitado por quebra de linha, um registro compacto por linha, pronto para logs, datasets e pipelines de fluxo."
summary: "Divida um array JSON em um valor JSON compacto por linha. O resultado é fácil de anexar, fácil de transmitir e aceito por coletores de logs e ferramentas de dados que esperam JSON Lines."
steps:
  - "Cole um array JSON, ou solte um arquivo .json, no painel de entrada."
  - "Pressione Executar. Cada elemento se torna uma linha de JSON compacto."
  - "Copie as linhas ou baixe-as como um arquivo .ndjson."
example:
  caption: "Um array se torna dois registros."
  input: '[{"id":1},{"id":2}]'
  output: '{"id":1}\n{"id":2}'
mistakes:
  - "Passar um objeto em vez de um array; NDJSON precisa de uma sequência de valores no nível superior."
  - "Esperar indentação na saída; cada registro é intencionalmente uma linha compacta."
  - "Anexar linhas a um arquivo que ainda tem um colchete de fechamento de array de uma exportação anterior."
faq:
  - q: "Por que a entrada deve ser um array?"
    a: "NDJSON representa uma sequência de registros. Um array é a fonte natural porque seus elementos já formam uma sequência ordenada. Um único objeto produziria uma linha, o que é JSON Lines válido, mas quase nunca é o que alguém que pede esta conversão quer, então a ferramenta explica o requisito em vez de adivinhar."
  - q: "Por que cada registro fica em uma linha?"
    a: "A linha é o limite do registro. Se um registro fosse formatado em várias linhas, um leitor não conseguiria mais dividir um fluxo por quebras de linha. Saída compacta é um requisito do formato, não uma escolha de estilo."
  - q: "Números grandes sobrevivem à conversão?"
    a: "Sim. O gerador serializa os valores da árvore de sintaxe analisada usando seu texto numérico original. Um inteiro de 64 bits ou um decimal longo é escrito sem alteração, em vez de ser arredondado por uma conversão de número JavaScript."
  - q: "Posso converter arrays ou objetos aninhados?"
    a: "Sim. Cada elemento pode ser qualquer valor JSON: um objeto, um array, uma string ou um número. Estruturas aninhadas permanecem dentro da sua própria linha. Somente o array de nível superior é transformado em linhas."
  - q: "O que acontece com um array vazio?"
    a: "A saída é vazia. Isso é consistente com o formato: zero registros produzem zero linhas. Adicione pelo menos um elemento se esperava conteúdo."
  - q: "Meus dados são enviados?"
    a: "Não. A análise e a serialização rodam dentro de um Web Worker no navegador. Não há requisições de terceiros, nem análises sobre a entrada, e nada é gravado em armazenamento persistente."
---

Um array JSON é um documento completo. Um arquivo JSON Lines é uma sequência de documentos independentes que por acaso são armazenados um por linha. A diferença parece pequena, mas muda a forma como os dados são produzidos e consumidos. Você pode anexar um registro a um arquivo JSON Lines escrevendo mais uma linha; anexar a um array significa editar o colchete de fechamento. Coletores de logs e frameworks de streaming preferem a forma baseada em linhas porque podem começar a ler antes mesmo de o arquivo terminar.

## O que o conversor faz

A ferramenta analisa a entrada em uma árvore de sintaxe tipada, percorre o array de nível superior e escreve cada elemento como um valor JSON compacto seguido de uma quebra de linha. Como o escritor usa a árvore analisada em vez de um serializador de objetos genérico, os tokens numéricos são preservados exatamente. Um inteiro longo continua longo, e um decimal com muitas casas não é encurtado. Strings são escapadas segundo as regras JSON, então um valor que contém uma quebra de linha vira `\n` dentro da sua própria linha, em vez de quebrar o registro.

A saída é construída incrementalmente. Para um array grande, o worker emite linhas durante o processo e informa o progresso, mantendo a thread principal livre. Quando o resultado passa de quatro megabytes, a página o oferece como download em vez de desenhá-lo em um editor. O download usa o tipo de conteúdo `.ndjson` para que ferramentas posteriores reconheçam o formato.

## Como usar

1. Cole um array JSON no painel de entrada ou solte um arquivo `.json` na página.
2. Pressione Executar. A ferramenta verifica se o valor raiz é um array.
3. Copie as linhas resultantes ou baixe-as como um arquivo `.ndjson`.

## Por que a raiz deve ser um array

Esta é uma proteção deliberada. Se a entrada fosse um objeto, a ferramenta teria que decidir se escreve o próprio objeto, seus valores ou algo derivado de suas chaves. Cada escolha seria um palpite, e um palpite errado produziria silenciosamente um arquivo com a forma errada. Reportar um erro claro é mais seguro. Se você quer uma linha a partir de um objeto, pode envolvê-lo em um array você mesmo: `[{"a":1}]` produz `{"a":1}`.

Um erro comum é entregar à ferramenta um arquivo que parece NDJSON, mas ainda tem `[` e `]` envolvendo tudo. Esses colchetes o tornam um único array JSON, que é exatamente o que esta ferramenta espera. Removê-los seria outra operação; este conversor parte do princípio de que o array é intencional.

## Trabalhando com o resultado

Confira a primeira e a última linha da saída antes de entregá-la a outro sistema. Cada linha deve ser analisável por conta própria. Se pretende editar o arquivo à mão, mantenha linhas curtas e evite adicionar comentários: JSON Lines não tem sintaxe de comentário. Um marcador como `_comment` dentro de um registro é uma convenção que algumas ferramentas entendem, mas ainda é apenas dado.

No sentido inverso, o JSON Lines para JSON reúne os registros de volta em um array. As duas conversões não são perfeitamente simétricas se havia linhas em branco, porque registros são posições numa sequência. Documente se seu pipeline preserva linhas vazias e configure a opção de remoção de acordo.

## Privacidade

Seus dados ficam neste dispositivo. A análise e a serialização acontecem em um Web Worker, o site não faz requisições de rede durante o uso da ferramenta, e nenhum conteúdo é colocado na URL ou gravado no armazenamento. A página de privacidade descreve as mesmas garantias em linguagem simples.

## Erros comuns

Um erro de sintaxe na linha um geralmente significa que a entrada não é JSON, ou tem uma vírgula final. A mensagem "deve ser um array de nível superior" significa que o valor raiz é um objeto, string ou número. Envolva-o em um array se era essa a intenção.
