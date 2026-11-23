---
locale: pt
toolId: ndjson-to-csv
title: JSON Lines to CSV
description: "Converta JSON Lines em CSV com achatamento de caminhos pontuados, aspas RFC 4180, linha de cabeçalho opcional e proteção contra fórmulas de planilha."
summary: "Transforme registros JSON delimitados por quebra de linha em um CSV pronto para planilhas. Objetos aninhados viram colunas com caminho pontuado, valores recebem aspas conforme RFC 4180, e células que parecem fórmulas podem ser neutralizadas."
steps:
  - "Cole ou solte um arquivo JSON Lines cujas linhas contenham objetos."
  - "Escolha o delimitador, o achatamento, o cabeçalho e as opções de proteção contra fórmulas."
  - "Pressione Executar, depois copie ou baixe o arquivo CSV."
example:
  caption: "Objetos aninhados se tornam colunas com caminho pontuado."
  input: '{"name":"Ada","address":{"city":"London"}}\n{"name":"Grace","address":{"city":"New York"}}'
  output: 'name,address.city\nAda,London\nGrace,"New York"'
mistakes:
  - "Supor que toda linha é um objeto; registros escalares não podem virar linhas CSV e são reportados como erros."
  - "Desativar a proteção contra fórmulas quando o CSV será aberto em uma planilha."
  - "Esquecer que o achatamento cria nomes de coluna com pontos que podem precisar de renomeação no sistema de destino."
faq:
  - q: "Como objetos aninhados são tratados?"
    a: "Com o achatamento ativado, uma chave aninhada se torna um nome de coluna pontuado como address.city. Arrays são serializados como texto JSON em uma célula, a menos que sejam convertidos em uma representação unida. Sem achatamento, um valor objeto é escrito como seu texto JSON."
  - q: "Como as aspas são decididas?"
    a: "O escritor segue a RFC 4180. Um campo recebe aspas duplas quando contém o delimitador, uma aspas, um retorno de carro, uma quebra de linha ou espaços no início ou no fim. Aspas internas são duplicadas. As linhas terminam com CRLF, o que planilhas esperam."
  - q: "O que faz a proteção contra fórmulas?"
    a: "Uma célula que começa com =, +, -, @, uma tabulação ou um retorno de carro pode ser interpretada como fórmula por software de planilha. A proteção prefixa esses valores com um apóstrofo para que sejam lidos como texto. Ative-a sempre que o CSV for aberto no Excel ou em aplicação semelhante."
  - q: "E se uma linha for inválida?"
    a: "Por padrão a execução para naquela linha e a reporta. Ative Ignorar linhas inválidas para continuar com os registros restantes. Linhas que são analisadas mas não são objetos são reportadas separadamente, porque um escalar não pode fornecer colunas CSV."
  - q: "Os nomes das colunas vêm de todos os registros?"
    a: "As colunas são coletadas na ordem em que aparecem pela primeira vez nos registros mantidos. Se uma chave aparece só em um registro posterior, as linhas anteriores simplesmente têm uma célula vazia para aquela coluna. Isso espelha o comportamento da maioria dos exportadores CSV."
  - q: "Meus dados saem do navegador?"
    a: "Não. A análise e a escrita CSV rodam dentro de um Web Worker. Não há uploads, nem análises, nem requisições de terceiros; a política de segurança de conteúdo proíbe conexões externas."
---

CSV e JSON Lines resolvem problemas diferentes. JSON Lines é excelente para máquinas: cada linha é um valor JSON completo, e novos registros podem ser anexados a baixo custo. CSV é excelente para pessoas: planilhas, bancos de dados e ferramentas de relatório o abrem diretamente. Converter de um para o outro é uma etapa frequente em um fluxo de dados, e a parte complicada é decidir como JSON aninhado se transforma em colunas planas.

## Como o achatamento funciona

Cada linha não vazia é analisada como JSON. Valores que são objetos se tornam uma única linha CSV. Com o achatamento ativado, uma propriedade aninhada como `address.city` se torna uma coluna com esse nome pontuado, e níveis mais profundos seguem o mesmo padrão. Arrays são escritos como texto JSON por padrão, o que mantém sua estrutura intacta dentro de uma célula. Um valor que é ele próprio um objeto sem achatamento também é escrito como texto JSON.

As colunas são descobertas em todos os registros mantidos, na ordem em que aparecem pela primeira vez. A linha de cabeçalho usa esses nomes. Se uma chave estiver ausente em um registro específico, sua célula fica vazia. É por isso que uma importação em planilha costuma mostrar colunas com aparência irregular: os dados simplesmente não tinham valor ali.

## Aspas e segurança

O escritor segue a RFC 4180. Um campo recebe aspas quando contém o delimitador, uma aspas duplas, um retorno de carro, uma quebra de linha ou espaços no início ou no fim. Aspas dentro de um campo são duplicadas. As linhas terminam com CRLF, que é o que aplicações de planilha esperam. Escolher ponto e vírgula ou tabulação como delimitador é útil em localidades onde a vírgula é separador decimal.

A proteção contra fórmulas é um recurso pequeno, mas importante. Valores que começam com `=`, `+`, `-`, `@`, tabulação ou retorno de carro podem ser tratados como fórmulas por software de planilha. Uma célula cuidadosamente construída pode então executar uma ação indesejada quando o arquivo é aberto. Prefixar esses valores com um apóstrofo os torna texto simples. Ela vem desativada por padrão porque altera o valor da célula, mas é a escolha certa para qualquer CSV derivado de entrada não confiável.

## Como usar

1. Cole JSON Lines no painel de entrada ou solte um arquivo `.ndjson` ou `.jsonl` na página.
2. Escolha um delimitador e decida sobre achatamento, linha de cabeçalho e proteção contra fórmulas.
3. Pressione Executar, depois copie o CSV ou baixe-o como `result.txt`. Renomeie o arquivo baixado para `.csv` na sua planilha.

## Entradas grandes

As linhas são transmitidas de um buffer de arquivo transferido em partes de tamanho fixo, então mesmo um arquivo muito grande nunca se torna uma string gigante na thread principal. O progresso é informado durante a execução e o worker pode ser cancelado. Um limite de segurança restringe o número de linhas coletadas para a saída CSV, porque uma planilha tem seu próprio limite de linhas e construir uma tabela sem limite anularia o objetivo da transmissão em fluxo. Se seu conjunto de dados for maior, filtre-o antes de converter.

## Privacidade

A conversão acontece inteiramente no seu navegador. O site não faz requisições de rede enquanto a ferramenta é usada, nada é armazenado, e os dados nunca são colocados em uma URL. Isso importa aqui porque exportações JSON Lines frequentemente contêm registros de clientes ou identificadores internos.

## Erros comuns

Uma linha que é JSON válido, mas não um objeto, é reportada como erro de linha; envolva escalares em um objeto com uma chave significativa primeiro. Um erro de sintaxe inclui o número da linha com problema e uma dica. Se a saída parece uma única linha longa, verifique o delimitador: um arquivo escrito com ponto e vírgula não será dividido em colunas quando aberto com configuração de vírgula.
