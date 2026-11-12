---
locale: pt
toolId: json-viewer
title: JSON Viewer
description: "Explore JSON grande como uma árvore virtualizada no navegador. Pesquise chaves e valores, copie caminhos JSONPath e expanda só o que precisa. Sem upload."
summary: "Leia um documento JSON grande como uma árvore com expansão sob demanda, pesquisa e caminhos copiáveis, em vez de uma parede de texto."
steps:
  - "Cole JSON ou arraste um arquivo e clique em Ver árvore ou pressione Ctrl/Cmd+Enter. O exemplo carrega um documento aninhado com arrays, objetos e valores mistos."
  - "Expanda linhas com as setas ou com um clique. Expandir até o nível abre vários níveis de uma vez; Recolher tudo volta para a raiz."
  - "Use a pesquisa para encontrar chaves ou valores e depois copie um caminho JSONPath ou o valor da linha selecionada."
example:
  caption: "Uma linha por nó, com indicadores de tipo, contagem de filhos e o JSONPath da seleção."
  input: |
    {
      "team": [
        { "name": "Ada", "role": "engineer" },
        { "name": "Grace", "role": "admiral" }
      ]
    }
  output: |
    team                 array (2)
      0                  object (2)
        name             "Ada"
        role             "engineer"
      1                  object (2)
mistakes:
  - "Colar JSON com uma vírgula final impede a criação da árvore; a mensagem de erro aponta para a linha exata."
  - "Esperar que todos os nós sejam renderizados de uma vez. Documentos grandes expandem sob demanda, então ramos recolhidos não estão no DOM."
  - "Copiar um valor que ainda está recolhido. Expanda o nó primeiro ou copie o caminho e inspecione-o em outro lugar."
faq:
  - q: "Qual documento grande o visualizador consegue abrir?"
    a: "Arquivos de até 100 MB são aceitos. A árvore é virtualizada e carregada em fatias a partir do worker, então apenas as linhas visíveis existem na página a qualquer momento."
  - q: "O visualizador congela com arquivos grandes?"
    a: "Não. A análise e a indexação acontecem em um Web Worker, e o resultado é renderizado como uma lista virtualizada, então a rolagem continua fluida em vez de bloquear a thread principal."
  - q: "Que formato os caminhos copiados usam?"
    a: "Os caminhos são expressões JSONPath como $.team[0].name, prontos para colar em uma ferramenta de consulta, um teste ou uma documentação."
  - q: "Posso pesquisar valores além de chaves?"
    a: "Sim. A pesquisa encontra chaves e valores escalares, informa quantas correspondências existem e permite pular entre elas."
  - q: "O visualizador envia ou armazena meu JSON?"
    a: "Não. O documento é analisado no seu navegador e descartado quando a aba fecha. Nada é enviado a um servidor e nada é gravado no armazenamento."
---

O Visualizador JSON apresenta um documento como uma árvore de linhas em vez de um bloco de texto. Cada linha mostra uma chave, seu tipo e uma prévia do valor, com uma contagem para objetos e arrays. Os ramos abrem sob demanda, então um documento com dezenas de milhares de nós continua sendo renderizado instantaneamente e permanece fluido durante a rolagem.

A árvore é construída em um Web Worker e entregue à página em fatias. Essa arquitetura mantém a thread principal livre: a página guarda apenas as linhas visíveis no momento, não o documento inteiro. A pesquisa roda no mesmo worker e encontra tanto chaves quanto valores escalares, retornando uma contagem de correspondências e uma forma de percorrer os resultados.

Os caminhos aparecem como JSONPath, por exemplo `$.team[0].name`, e podem ser copiados com uma ação, junto com o próprio valor. Isso torna o visualizador útil para depurar uma resposta de API, verificar qual campo mudou ou entregar um caminho preciso a um colega. Tudo fica no seu dispositivo: sem upload, sem conta e sem documento armazenado.
