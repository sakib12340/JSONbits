---
locale: pt
toolId: json-diff
title: JSON Diff
description: "Compare dois documentos JSON no navegador e veja cada valor adicionado, removido ou alterado em uma lista plana filtrável por caminho. Sem upload."
summary: "Compare dois documentos JSON estruturalmente e revise as diferenças como uma lista legível de caminhos, não como duas paredes de texto."
steps:
  - "Cole o documento original à esquerda e o alterado à direita, ou abra cada um a partir de um arquivo."
  - "Clique em Comparar ou pressione Ctrl/Cmd+Enter. Documentos idênticos são informados na hora; caso contrário, cada diferença é listada com seu caminho."
  - "Filtre por adicionado, removido ou alterado, copie um caminho ou ative Ignorar a ordem dos arrays quando os mesmos itens foram reordenados."
example:
  caption: "Um diff estrutural informa o caminho e os dois valores de cada mudança."
  input: |
    Original: { "name": "JSON Bits", "version": 1 }
    Alterado: { "name": "JSON Bits", "version": 2, "private": true }
  output: |
    alterado  $.version   1 → 2
    adicionado  $.private   true
mistakes:
  - "Comparar texto em vez de dados. A ordem das chaves e a indentação não importam aqui, então um arquivo reformatado não reporta mudanças."
  - "Usar Ignorar a ordem dos arrays quando as posições são importantes. Itens reordenados passam a ser tratados como os mesmos valores."
  - "Comparar documentos que não podem ser analisados. Corrija a sintaxe primeiro; a mensagem de erro informa a linha e a coluna."
faq:
  - q: "A comparação é textual ou estrutural?"
    a: "Estrutural. Os dois documentos são analisados e comparados por caminho, então indentação, espaço em branco e ordem das chaves nunca aparecem como diferença."
  - q: "O que Ignorar a ordem dos arrays faz?"
    a: "Ele compara itens de array por valor em vez de posição, então mover um item dentro de uma lista não é reportado como remoção e adição."
  - q: "Qual o tamanho máximo dos dois documentos?"
    a: "Cada documento pode ter até 20 MB. Entradas maiores são recusadas com uma mensagem clara, em vez de arriscar uma aba congelada."
  - q: "Meus documentos são enviados para a comparação?"
    a: "Não. Os dois documentos são analisados e comparados em um Web Worker nesta aba. Não há chamada ao servidor e nada é armazenado após fechar a aba."
  - q: "O diff mostra os valores antigo e novo?"
    a: "Sim. As linhas alteradas mostram o valor anterior e o atual lado a lado, e as linhas adicionadas ou removidas mostram o valor que apareceu ou desapareceu."
---

A ferramenta JSON Diff compara dois documentos por estrutura, não por texto. As duas entradas são analisadas em um Web Worker, percorridas juntas e reduzidas a uma lista plana de caminhos com um tipo: adicionado, removido ou alterado. Como a comparação acontece depois da análise, reformatar um arquivo, reordenar chaves ou mudar a indentação nunca produz uma diferença falsa.

Cada linha carrega o JSONPath da mudança, o valor antigo e o novo valor quando ambos existem. Os filtros reduzem a lista a um tipo de mudança, e um caminho pode ser copiado para um relatório de bug ou um teste. A opção Ignorar a ordem dos arrays compara itens de lista por valor em vez de posição, que é o que você quer quando uma API devolve a mesma coleção em outra ordem.

O diff roda inteiramente nesta aba do navegador. Os documentos nunca são enviados, nunca são gravados no armazenamento e são descartados quando você fecha a página. Cada lado aceita arquivos de até 20 MB, e documentos idênticos são informados como idênticos em vez de gerar uma lista vazia.
