---
locale: pt
slug: how-to-use-jsonpath
title: Como usar JSONPath
description: "Aprenda JSONPath com exemplos: raiz, acesso por ponto e colchetes, curingas, filtros, fatias e descida recursiva, tudo testado no seu navegador."
updated: 2026-11-23
toolIds:
  - jsonpath-tester
  - json-viewer
  - json-formatter
faq:
  - q: O que é JSONPath?
    a: JSONPath é uma linguagem de consulta para JSON, semelhante ao XPath para XML. Ele seleciona valores de um documento usando uma expressão compacta que começa com $.
  - q: JSONPath é um padrão?
    a: Não existe um único padrão. Este site segue a sintaxe comum usada pela maioria das ferramentas, incluindo filtros, fatias e descida recursiva.
  - q: Por que minha consulta não retornou nada?
    a: Verifique o símbolo da raiz, os nomes das propriedades e os índices dos arrays. Um erro de digitação no nome de uma chave produz silenciosamente um resultado vazio em vez de um erro.
  - q: JSONPath pode modificar um documento?
    a: Não. Ele apenas lê e seleciona valores. Para alterar dados, copie o resultado e edite-o no formatador ou no visualizador.
  - q: Quantos resultados podem ser retornados?
    a: O testador limita as correspondências visíveis para manter a rapidez, mas informa o total real e permite baixar o resultado completo.
---

O JSONPath permite pedir a um documento JSON os valores que importam para você sem escrever um programa. Uma expressão começa na raiz (`$`) e percorre chaves e índices de array.

## Acesso básico

- `$` é o documento inteiro.
- `$.store.book` lê uma propriedade chamada `book` dentro de `store`.
- `$['store']['book']` é a mesma coisa, útil quando uma chave contém espaços ou caracteres especiais.
- `$.store.book[0]` lê o primeiro item de um array.
- `$.store.book[-1]` lê o último item.

A notação por ponto é mais curta; a notação por colchetes é mais segura para chaves incomuns.

## Curingas e recursão

- `$.store.book[*]` seleciona todos os livros.
- `$..author` encontra todo campo `author` em qualquer profundidade, útil para metadados espalhados.
- `$.store.book[0,2]` seleciona o primeiro e o terceiro livros.

## Fatias

Fatias de array se parecem com Python: `$.store.book[1:3]` seleciona os índices 1 e 2, e `$.store.book[:2]` pega os dois primeiros. Um passo como `[::2]` seleciona um item sim, outro não.

## Filtros

Filtros ficam dentro de colchetes e começam com `?`:

- `$.store.book[?(@.price < 10)]` seleciona livros mais baratos que 10.
- `$.store.book[?(@.category == 'fiction')]` corresponde a um valor string.
- `$.store.book[?(@.isbn)]` mantém itens que têm um campo `isbn`.

Combine condições com `&&` e `||`, e negue com `!`. Comparações suportam `==`, `!=`, `<`, `<=`, `>` e `>=`.

## Erros comuns

- Esquecer o `$` no início.
- Usar acesso de propriedade JavaScript como `store.book` sem a raiz.
- Confundir índices de array que começam em zero.
- Esperar que um filtro retorne o objeto pai em vez do item correspondente.

Teste expressões em um documento real no testador de JSONPath e envie o resultado para outra ferramenta pelo menu compartilhado "Enviar para".

## Trabalhando com o testador

Cole ou solte um documento no painel de entrada, digite uma expressão e leia os valores correspondentes com seus caminhos. O testador roda inteiramente no seu navegador, então arquivos grandes nunca saem do seu dispositivo. Alterne entre os modos de resultado para ver valores, arrays achatados, a primeira correspondência, apenas caminhos, ou caminhos pareados com valores.

Cada correspondência mostra seu JSONPath, que você pode copiar direto para o código. Quando uma consulta retorna mais do que o limite de exibição, a linha de status informa o total real e um botão de download salva a lista completa.

## Dicas de desempenho

- Filtre antes de aplicar um curinga, para não percorrer a árvore inteira.
- Use `$.caminho` em vez de `$..` quando você conhece a estrutura, porque descida recursiva varre todo nó.
- Em arquivos muito grandes, comece com uma amostra pequena para confirmar a expressão e só então execute-a no documento completo.
- Mantenha expressões legíveis: um predicado por filtro e divida consultas complexas em etapas.

## Como ler os resultados

Uma consulta bem-sucedida retorna um array de correspondências mesmo quando há apenas uma. Um array vazio significa que a expressão era válida, mas não correspondeu a nada, enquanto uma mensagem de erro vermelha significa que a própria sintaxe foi rejeitada. Corrija erros de sintaxe primeiro e depois ajuste o predicado até que a contagem corresponda ao esperado.
