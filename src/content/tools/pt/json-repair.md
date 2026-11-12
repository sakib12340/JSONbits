---
locale: pt
toolId: json-repair
title: JSON Repair
description: "Repare JSON inválido no navegador: vírgulas finais, comentários, aspas simples, chaves sem aspas e literais Python, com uma lista de cada correção."
summary: "Corrija os erros mecânicos que quebram o JSON e veja exatamente quais reparos foram aplicados antes de usar o resultado."
steps:
  - "Cole o documento quebrado ou arraste um arquivo. Pressione Reparar ou Ctrl/Cmd+Enter; o exemplo reúne vários erros comuns de uma vez."
  - "Revise a lista de correções aplicadas, como vírgulas finais removidas ou aspas tipográficas substituídas, ao lado da saída reparada."
  - "Copie ou baixe o JSON limpo e depois passe-o pelo validador para confirmar o resultado antes de publicar."
example:
  caption: "O relatório de reparo nomeia cada mudança, para que nada seja corrigido em silêncio."
  input: |
    {
      name: 'JSON Bits',   // product name
      "private": True,
    }
  output: |
    {
      "name": "JSON Bits",
      "private": true
    }
mistakes:
  - "Reparar um documento que está sem um valor ou um colchete. Correções mecânicas não podem inventar dados, então o resultado ainda falha na validação."
  - "Presumir que a saída reparada está semanticamente correta. Revise a lista de correções; um comentário removido pode conter informação."
  - "Usar o reparo em um documento que não é JSON, como um módulo JavaScript com imports e expressões."
faq:
  - q: "Quais erros podem ser reparados automaticamente?"
    a: "Comentários, vírgulas finais, strings com aspas simples, aspas tipográficas, chaves sem aspas e literais Python como None, True e False. Cada reparo é listado para você revisar."
  - q: "O reparo altera meus dados?"
    a: "Ele reescreve apenas a sintaxe. Chaves, valores e sua ordem permanecem iguais, e os tokens numéricos são preservados em vez de recalculados."
  - q: "O reparo consegue fechar um colchete que falta?"
    a: "Não de forma confiável. A ferramenta corrige erros comuns de pontuação e aspas; um documento estruturalmente incompleto precisa de correção manual, e o validador mostra onde ele quebra."
  - q: "Devo confiar na saída reparada?"
    a: "Revise a lista de correções primeiro. Os reparos são determinísticos e mostrados explicitamente, mas remover um comentário ou converter True em true é uma decisão que você deve confirmar."
  - q: "O JSON quebrado é enviado a um servidor?"
    a: "Não. O reparo roda em um Web Worker nesta aba, então documentos inválidos e válidos permanecem no seu dispositivo."
---

O JSON Repair cuida dos erros que tornam um documento inválido por motivos mecânicos e entediantes. Comentários, vírgulas finais, aspas simples, aspas tipográficas de um processador de texto, chaves sem aspas e literais Python como `True` ou `None` são reescritos em JSON válido, e cada mudança é listada para que o resultado nunca seja uma caixa-preta.

O reparo roda em um Web Worker, então a página continua responsiva mesmo com entrada grande. Os tokens numéricos são copiados como texto, o que significa que um documento reparado mantém seus inteiros de 64 bits e decimais longos intactos. A saída pode ser copiada ou baixada imediatamente.

Reparar é uma conveniência, não um substituto para revisão. Se um comentário carregava significado, ou um literal Python era intencional, a lista de correções mostra o que mudou para você decidir. Depois de reparar, passe o documento pelo Validador JSON para confirmar que ele é analisado e siga com o formatador ou o visualizador. Nada é enviado em momento algum.
