---
locale: pt
toolId: jsonpath-tester
title: JSONPath Tester
description: 'Teste consultas JSONPath nos seus dados e veja cada correspondência com seu caminho e valor. Filtros, fatias e uniões. Roda no navegador, nada é enviado.'
summary: Execute uma expressão JSONPath em um documento e leia cada correspondência com seu caminho e valor exatos, além do tempo e dos detalhes de truncamento.
steps:
  - 'Cole um documento e uma expressão como $.store.books[?(@.price < 10)], ou use o exemplo para ver filtros e fatias em ação.'
  - 'Pressione Executar ou Ctrl/Cmd+Enter. O resultado lista cada correspondência com caminho e valor, mais a contagem total e o tempo gasto.'
  - 'Copie o resultado inteiro ou baixe-o como arquivo .json, depois cole a expressão na biblioteca ou no teste que a executará.'
example:
  caption: 'Um filtro retorna uma correspondência, e o resultado mantém a expressão, o caminho, o valor e o tempo.'
  input: |
    {
      "store": {
        "books": [
          { "title": "A", "price": 8 },
          { "title": "B", "price": 14 }
        ]
      }
    }
  output: |
    {
      "expression": "$.store.books[?(@.price < 10)]",
      "matches": [
        { "path": "$.store.books[0]", "value": { "title": "A", "price": 8 } }
      ],
      "total": 1,
      "truncated": false,
      "timeMs": 1
    }
mistakes:
  - 'Agrupar condições de filtro com parênteses. Este subconjunto aceita && e || sem parênteses; divida a condição composta.'
  - "Deixar valores string sem aspas em um filtro. Compare com um número diretamente, mas escreva [?(@.status == 'open')] com aspas."
  - 'Supor que toda implementação de JSONPath corresponda igual. Descida recursiva, uniões e filtros diferem entre bibliotecas; confirme no destino.'
  - 'Escrever uma expressão ampla como $..* e esperar tudo de volta. As correspondências são limitadas a 2.000 e o resultado a cerca de 2 MB.'
faq:
  - q: 'Qual sintaxe JSONPath é suportada?'
    a: 'A raiz $, chaves com ponto e colchetes, índices de array inclusive negativos, curingas, descida recursiva, fatias, uniões e filtros com operadores de comparação, testes de existência, negação, && e ||.'
  - q: 'Os filtros conseguem comparar strings?'
    a: 'Sim, com aspas simples ou duplas, contra strings, números, true, false e null. Um nome de membro como @.id testa existência, e ! a nega.'
  - q: 'Por que o resultado diz truncado?'
    a: 'Cada valor é limitado a 20.000 caracteres, as correspondências a 2.000 e o resultado todo a cerca de 2 MB. Quando um limite se aplica, a flag é ativada para que uma resposta parcial nunca seja confundida com uma completa.'
  - q: 'Onde os erros de sintaxe são mostrados?'
    a: 'Diretamente abaixo do campo de consulta, para que um colchete faltando ou um operador não suportado seja informado ao lado da expressão que o causou.'
  - q: 'O documento sai do navegador?'
    a: 'Não. A consulta roda em um Web Worker nesta aba. O documento e o resultado ficam no dispositivo, e nada é gravado no armazenamento.'
---

JSONPath é uma pequena linguagem de consulta para JSON, o equivalente a um seletor CSS para um documento. O JSONPath Tester executa uma expressão nos seus dados e retorna um resultado estruturado em vez de uma parede de correspondências, o que torna prático verificar uma expressão antes de colocá-la em um teste, uma regra de monitoramento ou código de aplicação.

O subconjunto suportado cobre a sintaxe com que a maioria das bibliotecas concorda. `$` é a raiz, `.key` e `['key']` leem um membro, `[0]` e `[-1]` indexam um array, e `[*]` ou `.*` selecionam todos os filhos. A descida recursiva com `..key` ou `..*` busca em todos os níveis, fatias como `[1:4:2]` pegam um intervalo, e uniões como `[0,2]` ou `['a','b']` combinam seleções. Filtros usam `[?(@.price < 10)]` com `==`, `!=`, `<`, `<=`, `>` e `>=`, comparando contra strings, números, `true`, `false` ou `null`. Uma expressão como `[?(@.id)]` testa existência, `!` a nega, e `&&` e `||` juntam condições sem parênteses.

A saída é JSON que você pode guardar. Ela registra a expressão, um array de correspondências com um `path` e um `value`, o total, uma flag `truncated` e o tempo em milissegundos. Esse formato é fácil de colar em um relatório de bug ou em um snapshot de teste, e os caminhos usam a mesma notação que o visualizador copia, então uma correspondência pode ser rastreada até o documento.

Dois hábitos tornam uma expressão confiável. Execute primeiro a versão mais ampla da consulta, como `$.items[*]`, e confira a contagem de correspondências com algo que você possa verificar manualmente. Um filtro que retorna menos linhas que o esperado costuma ser uma incompatibilidade de tipo: `"10"` e `10` são valores diferentes, e uma comparação numérica não corresponderá a uma string. Depois execute a mesma expressão na ferramenta e na biblioteca que a executará em produção. Descida recursiva e uniões são onde as implementações mais divergem, então uma consulta que funciona aqui pode precisar de uma pequena reescrita em um cliente Python ou Java.

O tamanho do resultado é limitado de propósito. Um único valor para em 20.000 caracteres, a lista de correspondências em 2.000 entradas, e todo o resultado em cerca de 2 MB, com `truncated` ativado quando um limite se aplica. Uma expressão ampla em um documento grande portanto retorna rapidamente em vez de travar a aba.

As consultas rodam em um Web Worker em um documento que nunca sai do navegador. Para explorar um documento manualmente, o [JSON Viewer](/json-viewer) mostra os mesmos caminhos em uma árvore, e o [JSON Schema Validator](/json-schema-validator) verifica a forma dos dados que você encontrou.
