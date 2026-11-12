---
locale: pt
toolId: json-formatter
title: JSON Formatter
description: "Formate e indente JSON no navegador com 2 ou 4 espaços ou tabulações. Erros precisos de linha e coluna, números grandes intactos e nada é enviado."
summary: "Transforme JSON compacto ou desorganizado em um documento com indentação uniforme, sem alterar nenhum valor."
steps:
  - "Cole JSON no painel de entrada, arraste um arquivo .json para qualquer lugar da página ou clique em Abrir arquivo. Exemplo carrega um documento com objetos aninhados, arrays e um inteiro de 64 bits."
  - "Escolha a indentação na barra de ferramentas. Dois espaços é o padrão; quatro espaços ou tabulações combinam com a maioria dos editores e arquivos de configuração."
  - "Clique em Formatar ou pressione Ctrl/Cmd+Enter e depois copie o resultado ou baixe-o como formatted.json."
example:
  caption: "Entrada compacta à esquerda, saída formatada à direita."
  input: '{"project":"JSON Bits","private":true,"downloads":9007199254740993,"tags":["json","formatter"]}'
  output: |
    {
      "project": "JSON Bits",
      "private": true,
      "downloads": 9007199254740993,
      "tags": ["json", "formatter"]
    }
mistakes:
  - "Uma vírgula final após a última propriedade ou o último item do array é inválida em JSON. Remova a vírgula ou passe o documento pelo JSON Repair."
  - "Comentários copiados do JavaScript (// ou /* */) não fazem parte da gramática JSON e precisam ser removidos."
  - "Chaves sem aspas e strings com aspas simples são JavaScript válido, mas não são JSON válido. Coloque chaves e strings entre aspas duplas."
  - "Aspas tipográficas coladas de um processador de texto parecem aspas duplas, mas são outro caractere. Substitua-as por aspas retas."
faq:
  - q: "Meu JSON é enviado para algum lugar?"
    a: "Não. A formatação roda em um Web Worker nesta aba do navegador. A página não faz nenhuma requisição de rede enquanto você trabalha, e não existe servidor que possa receber o documento."
  - q: "A formatação altera números grandes?"
    a: "Não. O formatador copia os tokens numéricos exatamente, em vez de analisá-los e serializá-los de novo, então 9007199254740993 mantém os dezesseis dígitos e decimais longos mantêm cada casa."
  - q: "Qual é o tamanho máximo de arquivo?"
    a: "Arquivos de até 100 MB são aceitos. Entradas abaixo de 1 MB atualizam enquanto você digita; documentos maiores rodam sob demanda com um estado de progresso, para que a página nunca congele."
  - q: "Por que um JSON aparentemente válido dá erro?"
    a: "As causas mais comuns são uma vírgula final, um comentário ou aspas simples. O painel de erro indica a linha e a coluna, mostra um trecho e sugere a correção em linguagem clara."
  - q: "Posso formatar um arquivo sem abri-lo em um editor de texto?"
    a: "Sim. Arraste o arquivo para a página ou clique em Abrir arquivo. O formatador lê o arquivo localmente, mostra nome e tamanho e oferece o resultado formatado para download."
---

O Formatador JSON transforma JSON compacto ou com espaçamento irregular em um documento fácil de ler, revisar e comparar. Ele analisa com um tokenizador em vez de `JSON.parse`, então os tokens numéricos são copiados exatamente como foram escritos. Um inteiro de 64 bits como `9007199254740993` mantém todos os seus dígitos em vez de virar `9007199254740992` silenciosamente, e decimais de alta precisão mantêm cada casa. Apenas o espaço em branco muda.

Tudo roda em um Web Worker nesta aba do navegador. O texto que você cola, arrasta ou abre nunca é enviado a lugar nenhum: não há endpoint de upload, conta nem análises que leiam o conteúdo. Documentos grandes passam pelo mesmo worker, então um arquivo de vários megabytes mostra um estado de progresso em vez de congelar a página.

Se o documento for inválido, o formatador para no primeiro problema e informa a linha, a coluna, um trecho e uma dica clara. Corrija a entrada e execute novamente. A preferência de indentação é salva apenas neste navegador; o JSON em si nunca é persistido.
