---
locale: pt
toolId: json-minifier
title: JSON Minifier
description: "Minifique JSON removendo espaços em branco sem alterar valores ou a precisão dos números. Veja quantos bytes você economiza e copie ou baixe o resultado."
summary: "Remova o espaço em branco insignificante do JSON e veja exatamente quanto menor o documento fica."
steps:
  - "Cole ou arraste o JSON que você quer comprimir. O exemplo mostra um documento formatado com objetos e arrays aninhados."
  - "Clique em Minificar ou pressione Ctrl/Cmd+Enter. A barra de estatísticas informa o tamanho de entrada, o de saída e a porcentagem economizada."
  - "Copie o resultado compacto ou baixe-o como minified.json para um arquivo de configuração, um payload de API ou um bundle."
example:
  caption: "O mesmo documento após a minificação, com a redução de tamanho informada acima da saída."
  input: |
    {
      "name": "JSON Bits",
      "tags": ["json", "minify"],
      "private": true
    }
  output: '{"name":"JSON Bits","tags":["json","minify"],"private":true}'
mistakes:
  - "Minificar JSON inválido gera um erro em vez de saída. Execute primeiro o validador ou a ferramenta de reparo."
  - "Remover espaço em branco dentro de uma string corromperia o valor, então o minificador remove apenas o espaço entre tokens."
  - "Reformatar depois restaura a legibilidade, mas a forma compacta é o que um servidor de produção ou bundle deve entregar."
faq:
  - q: "A minificação altera meus valores?"
    a: "Não. Apenas o espaço em branco entre tokens é removido. Strings, chaves, tokens numéricos e sua ordem ficam exatamente como escritos, incluindo inteiros grandes e decimais longos."
  - q: "Quanto espaço a minificação economiza?"
    a: "Depende da indentação. JSON formatado com dois espaços costuma encolher de 20 a 40 por cento, enquanto entradas já compactas economizam pouco ou nada."
  - q: "O JSON minificado continua válido?"
    a: "Sim, se a entrada era válida. A saída é o mesmo documento sem o espaço insignificante, então qualquer analisador a lê de forma idêntica."
  - q: "Posso minificar um arquivo em vez de texto colado?"
    a: "Sim. Arraste um arquivo .json para a página ou use Abrir arquivo. Arquivos grandes são processados no worker em segundo plano, e o resultado pode ser baixado diretamente."
  - q: "Por que a página avisa acima de 50 MB?"
    a: "Documentos muito grandes podem esgotar a memória da aba. O aviso permite decidir antes de iniciar uma execução que pode levar alguns segundos."
---

O Minificador JSON remove o espaço em branco que torna o JSON legível mas custa bytes: indentação, quebras de linha e espaços ao redor da pontuação. Ele analisa o documento com segurança e o emite novamente sem esses caracteres, então o resultado é um JSON equivalente byte a byte que qualquer analisador lê da mesma forma.

O tratamento de números é deliberado. Em vez de analisar em números JavaScript e serializá-los de novo, o minificador mantém os tokens numéricos como texto, então `9007199254740993` não vira `9007199254740992` e `4.999999999999999` mantém cada dígito. Strings nunca são tocadas: o espaço dentro de um valor sobrevive, enquanto o espaço entre tokens não.

A barra de estatísticas mostra o tamanho antes e depois e a porcentagem economizada, o que é útil para verificar se vale comprimir um payload ou se o gzip já faz o trabalho. Tudo roda nesta aba. Seu JSON não é enviado, armazenado nem registrado, e o download é gerado localmente a partir do resultado.
