---
locale: pt
toolId: ndjson-to-json
title: JSON Lines to JSON
description: "Converta JSON Lines em um array JSON, ignorando registros inválidos ou parando no primeiro erro, com formatação opcional e controle de linhas em branco."
summary: "Reúna registros JSON delimitados por quebra de linha em um único array. Escolha como tratar linhas inválidas e em branco, e opcionalmente formate cada registro mantendo os valores numéricos exatos."
steps:
  - "Cole ou solte um arquivo JSON Lines no painel de entrada."
  - "Escolha se quer ignorar linhas inválidas, remover linhas em branco e formatar cada registro."
  - "Pressione Executar, depois copie ou baixe o array JSON resultante."
example:
  caption: "Duas linhas se tornam um array."
  input: '{"id":1}\n{"id":2}'
  output: '[{"id":1},{"id":2}]'
mistakes:
  - "Supor que linhas inválidas são descartadas por padrão; escolha Ignorar linhas inválidas explicitamente."
  - "Formatar um conjunto de dados enorme quando um array compacto faria o download muito mais rápido."
  - "Esquecer que linhas em branco são mantidas a menos que Remover linhas em branco esteja ativado."
faq:
  - q: "O que exatamente é produzido?"
    a: "Um único array JSON cujos elementos são os valores de cada linha não vazia, em ordem. Se uma linha contém um objeto ou um número, esse valor exato se torna o elemento correspondente. A ferramenta não inventa chaves nem envolve registros, a menos que você ative a formatação."
  - q: "O que acontece com linhas inválidas?"
    a: "Por padrão a execução para na primeira linha com problema e informa número, coluna e dica. Ative Ignorar linhas inválidas para continuar após os problemas; esses registros são omitidos da saída. Use o Validador NDJSON primeiro se precisar de um inventário completo de erros."
  - q: "Linhas em branco são incluídas?"
    a: "Linhas em branco se tornam valores null quando Remover linhas em branco está desativado, porque ainda ocupam uma posição na sequência. Com a remoção ativada, elas são eliminadas por completo e o array contém apenas registros de linhas não vazias."
  - q: "A formatação altera os dados?"
    a: "Não. A formatação é aplicada ao texto de cada registro, e os tokens numéricos são preservados como escritos. Um inteiro grande como 9007199254740993 permanece exato, em vez de ser arredondado por um número JavaScript."
  - q: "Isso lida com arquivos muito grandes?"
    a: "Sim. As linhas são transmitidas do buffer de arquivo transferido em partes, e o progresso é informado durante a execução. Arquivos acima do limite de prévia exigem uma execução explícita, e saídas acima de quatro megabytes são oferecidas como download em vez de injetadas no editor."
  - q: "Algo é enviado?"
    a: "Não. Leitura, conversão e formatação acontecem dentro do seu navegador. Não há requisição de rede durante o uso da ferramenta, nem armazenamento persistente dos seus dados."
---

JSON Lines é conveniente para produtores e processadores de fluxos, mas a maioria das ferramentas JSON espera um único array ou objeto. Converter entre os dois formatos é uma etapa comum antes de analisar dados, importá-los para um banco de dados ou entregá-los a um formatador. Esta ferramenta reúne as linhas em um array enquanto dá a você controle explícito sobre as partes confusas: registros quebrados, linhas em branco e tamanho da saída.

## O modelo de conversão

O worker lê a entrada em partes e divide por quebras de linha durante a leitura. Cada linha completa é analisada para confirmar que é JSON válido. Linhas válidas são anexadas a um array de saída, preservando seu texto original para que os números mantenham sua representação exata. Se a formatação estiver ativada, cada registro é formatado com indentação de dois espaços antes de ser adicionado. O resultado é montado em um construtor de fluxo, então a página nunca mantém ao mesmo tempo uma string de origem gigante e várias cópias da saída.

Linhas inválidas são tratadas conforme sua escolha. Com o comportamento padrão, a execução para no primeiro problema e o painel de erro informa o número da linha, a coluna e uma dica em linguagem clara. Ativar Ignorar linhas inválidas continua após elas e omite esses registros do array. Nenhum dos dois modos altera silenciosamente um registro: uma linha que analisa é copiada como está, e uma linha que não analisa ou interrompe o trabalho ou é deixada de fora.

Linhas em branco são um caso separado. Uma quebra de linha final no fim de um arquivo é normal e, por si só, não cria um registro em branco. Linhas vazias no meio, porém, ainda são posições na sequência. Com a remoção desativada elas se tornam elementos `null`; com a remoção ativada elas desaparecem. A maioria das exportações se beneficia da remoção.

## Como usar

1. Cole JSON Lines no painel de entrada ou solte um arquivo `.ndjson` ou `.jsonl` na página.
2. Defina as opções de linhas inválidas, linhas em branco e formatação.
3. Pressione Executar. Copie o array ou baixe-o como `result.txt` quando a saída for grande.

## Escolhendo o tamanho da saída

A formatação deixa o resultado mais fácil de ler, mas pode dobrar ou triplicar seu tamanho. Para um arquivo com centenas de milhares de registros, um array compacto costuma ser a melhor escolha, porque faz download mais rápido e pode ser processado pela próxima ferramenta sem reformatação. Se você só precisa inspecionar alguns registros, execute com a formatação ativada e depois mude para o JSON Viewer para navegar.

Quando a saída passa de quatro megabytes, o worker a devolve como um Blob. A página mostra seu tamanho e oferece um botão de download, em vez de tentar desenhar milhões de caracteres em um editor. Esse é o mesmo caminho de saída grande usado pelos conversores, e é o que mantém o navegador responsivo em grandes conjuntos de dados.

## Privacidade

O arquivo é decodificado e processado em um Web Worker na sua máquina. Nada é enviado, nenhuma análise observa a entrada, e nenhum parâmetro de consulta contém os dados. A política de segurança de conteúdo do site tem `connect-src 'none'`, o que torna a afirmação de zero requisições de rede verificável, e não uma questão de confiança.

## Erros comuns

Um erro de "codificação" significa que o arquivo foi salvo em um formato diferente de UTF-8; salve-o novamente como UTF-8. Um erro de sintaxe com número de linha aponta para um registro que não é JSON completo. Se toda linha parece válida mas a execução ainda para, procure caracteres invisíveis como uma marca de ordem de byte no início da primeira linha.
