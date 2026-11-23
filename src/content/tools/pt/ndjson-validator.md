---
locale: pt
toolId: ndjson-validator
title: JSON Lines Validator
description: "Valide JSON Lines linha por linha com números de linha exatos, contagem de linhas em branco e uma lista de erros na qual você clica para ir até a linha."
summary: "Verifique cada linha de um arquivo JSON Lines ou NDJSON separadamente. O validador informa números de linha exatos, separa linhas em branco das inválidas e deixa você ir direto ao primeiro registro com problema."
steps:
  - "Cole seus dados JSON Lines ou solte um arquivo .ndjson / .jsonl na página."
  - "Escolha se quer parar no primeiro erro e pressione Validar."
  - "Leia o resumo e a lista de erros; clique em qualquer erro para ir até aquela linha na entrada."
example:
  caption: "Uma linha válida seguida de uma inválida."
  input: '{"id":1,"name":"Ada"}\n{"id":2,"name":}'
  output: 'Lines 2 · Valid 1 · Invalid 1 · Blank 0\nL2:17 Expected a value'
mistakes:
  - "Tratar o arquivo todo como um único documento JSON; JSON Lines valida cada linha separadamente."
  - "Esquecer que uma quebra de linha final é normal e não cria um registro extra."
  - "Supor que o primeiro erro é o único; desative parar no primeiro para ver resultados limitados em todo o arquivo."
faq:
  - q: "O que é um arquivo JSON Lines?"
    a: "É um arquivo de texto em que cada linha é um valor JSON completo e independente. Não há array envoltório nem vírgulas entre registros. Isso permite anexar um novo registro sem reescrever o arquivo, e permite que leitores processem o arquivo uma linha por vez."
  - q: "Como a validação difere de um validador JSON comum?"
    a: "Um validador comum analisa um documento. Aqui cada linha é seu próprio documento, então a ferramenta informa o número da linha para cada problema e conta linhas válidas, inválidas e em branco separadamente. Um único registro quebrado não torna o resto do arquivo inútil."
  - q: "Por que a lista de erros é limitada?"
    a: "Um arquivo grande e quebrado pode conter milhares de erros. Renderizar todos travaria a página, então a ferramenta guarda os primeiros mil e informa o total real. A lista é virtualizada, o que significa que apenas as linhas visíveis existem no documento."
  - q: "A ferramenta envia meu arquivo?"
    a: "Não. O arquivo é lido no seu navegador e enviado em partes a um Web Worker. Não há requisições de rede, nada é gravado no armazenamento, e o conteúdo nunca aparece na URL."
  - q: "O que faz parar no primeiro erro?"
    a: "Encerra a varredura assim que uma linha com problema é encontrada. Isso é útil quando você está corrigindo um arquivo um problema por vez e não quer esperar uma passada completa em uma entrada muito grande."
---

JSON Lines, também chamado de NDJSON, armazena um valor JSON por linha. O formato é deliberadamente pequeno: sem array envoltório, sem vírgulas e sem regras de indentação compartilhadas. Essa simplicidade o torna um favorito para logs, fluxos de eventos e grandes conjuntos de dados, porque um produtor pode anexar uma linha e um consumidor pode ler uma linha sem carregar o arquivo inteiro. A contrapartida é que uma única linha malformada não produz um erro de nível de arquivo como aconteceria com um documento JSON comum. Cada linha precisa ser checada por conta própria.

## O que este validador reporta

A ferramenta lê a entrada em partes de tamanho fixo e divide as linhas durante a leitura, então um arquivo de cem megabytes não se torna uma enorme string JavaScript. Cada linha é analisada de forma independente. Linhas em branco são contadas separadamente dos registros reais, porque uma quebra de linha final é normal e uma linha vazia no meio costuma ser inofensiva. As contagens de válidas e inválidas são informadas junto com o total de linhas.

Quando uma linha falha na análise, a ferramenta registra o número da linha, a coluna onde o problema foi encontrado, a mensagem e uma dica em linguagem clara. Os primeiros mil erros são mantidos, com o total real informado ao lado. A lista é virtualizada: apenas as linhas atualmente visíveis são criadas, então percorrer uma longa lista de erros continua suave. Clicar em uma linha move o cursor do editor até ela.

## Como usar

1. Cole JSON Lines no painel de entrada ou solte um arquivo `.ndjson` ou `.jsonl` em qualquer lugar da página.
2. Decida se quer parar no primeiro erro. Deixe desativado para ver uma amostra limitada de todos os problemas.
3. Pressione Validar, leia o resumo e clique em um erro para ir até a linha com problema.

## Como ler os resultados

Uma contagem alta de inválidas com poucas linhas geralmente significa que o arquivo é na verdade um array JSON formatado, e não JSON Lines. Esse formato pertence ao JSON Formatter; converta-o para NDJSON primeiro. Uma contagem alta de linhas em branco costuma vir de uma exportação que insere separadores entre registros. Ative a remoção de linhas em branco ao converter se quiser descartá-las.

Os números de coluna são relativos a cada linha, não ao arquivo. Isso corresponde à forma como editores mostram o cursor e torna o erro acionável: a coluna diz onde naquele registro o analisador desistiu. A dica explica a causa provável em linguagem comum, como uma string não fechada ou uma vírgula ausente.

## Arquivos grandes

Arquivos acima do limite de prévia não são desenhados no editor. Em vez disso, a página mostra o nome e o tamanho do arquivo e espera uma execução explícita. O worker informa o progresso durante a varredura, e cancelar interrompe o trabalho. Condições de memória insuficiente são reportadas com uma mensagem amigável em vez de travar a aba. Isso mantém a thread principal responsiva mesmo quando a entrada é muito maior do que a faixa confortável de edição do navegador.

## Privacidade

Um arquivo JSON Lines pode conter dados pessoais, tokens ou registros de clientes. O arquivo é lido localmente, processado dentro de um Web Worker e nunca enviado. O site não tem análises e uma política de segurança de conteúdo que proíbe conexões externas. Nada do que você cola ou solta é salvo no armazenamento local ou de sessão.

## Erros comuns

Uma linha contendo um único número ou string é JSON válido e é contada como válida, embora muitos pipelines esperem objetos. Se sua ferramenta posterior precisa de objetos, converta com a ferramenta NDJSON para CSV e revise as mensagens de "deve ser um objeto". Um arquivo codificado em UTF-16 será rejeitado com uma dica de codificação; salve-o como UTF-8 primeiro.
