---
locale: pt
toolId: json-validator
title: JSON Validator
description: "Valide a sintaxe JSON no navegador e obtenha a linha e a coluna exatas de cada erro, com dicas em linguagem clara. Nada é enviado ou armazenado."
summary: "Verifique se um documento é JSON válido e veja exatamente onde e por que ele falha quando não é."
steps:
  - "Cole JSON no painel de entrada ou arraste um arquivo .json para a página. O botão Exemplo carrega um documento curto que você pode quebrar de propósito."
  - "Clique em Validar ou pressione Ctrl/Cmd+Enter. A validação é uma checagem de sintaxe e termina em milissegundos, mesmo para documentos grandes."
  - "Leia o resultado. JSON válido informa a contagem de objetos, arrays, chaves e valores; JSON inválido informa a linha, a coluna e uma correção sugerida."
example:
  caption: "Uma vírgula final é reportada na linha e na coluna em que o analisador parou."
  input: |
    {
      "name": "JSON Bits",
      "private": true,
    }
  output: |
    JSON inválido
    Linha 4, coluna 1
    Dica: remova a vírgula final antes da chave de fechamento.
mistakes:
  - "Uma vírgula final após a última propriedade é a falha mais comum. O JSON permite vírgula apenas entre membros, nunca depois do último."
  - "Comentários, chaves sem aspas e strings com aspas simples vêm de hábitos do JavaScript e são rejeitados pela gramática JSON."
  - "Quebras de linha ou tabulações literais dentro de uma string são inválidas; use as formas escapadas \\n e \\t."
  - "Dois valores lado a lado ou uma vírgula ausente entre propriedades geram um erro que aponta para o segundo valor, não para a vírgula que falta."
faq:
  - q: "Este é um validador de JSON Schema?"
    a: "Ainda não. Esta página verifica apenas a sintaxe JSON, que é onde a maioria dos documentos quebrados falha. Um validador de JSON Schema separado está planejado como ferramenta futura."
  - q: "A validação envia meus dados para algum lugar?"
    a: "Não. A checagem roda em um Web Worker nesta aba, e a página foi construída para não poder fazer requisições de rede enquanto uma ferramenta está aberta."
  - q: "Quão precisa é a localização do erro?"
    a: "O validador informa a linha e a coluna em que a análise parou, mostra um trecho com o caractere problemático e acrescenta uma dica que nomeia a causa provável."
  - q: "Posso validar um arquivo grande?"
    a: "Sim. Arquivos de até 100 MB são aceitos. Documentos grandes rodam sob demanda com estado de progresso, e o resultado continua sendo um resumo em vez de renderizar o arquivo como texto."
  - q: "JSON válido significa que os dados estão corretos?"
    a: "Não. Validade sintática significa apenas que o documento segue a gramática JSON. Campos obrigatórios, tipos e regras de negócio precisam de um schema ou de verificações próprias."
---

O Validador JSON responde a uma pergunta com precisão: este documento segue a gramática JSON e, se não, onde ele quebra? Cole um documento, arraste um arquivo ou carregue o exemplo e clique em Validar. A checagem roda em um Web Worker, então até um arquivo de vários megabytes é examinado sem bloquear a rolagem ou a digitação na página.

Para entrada válida, o resultado resume o documento: quantos objetos e arrays ele contém, quantos valores e chaves foram contados e quanto tempo a checagem levou. Para entrada inválida, o painel informa a linha e a coluna em que a análise parou, mostra os caracteres ao redor e explica a causa provável em linguagem clara, por exemplo que uma vírgula antes de uma chave de fechamento não é permitida.

A validação não modifica seus dados e não os armazena. Nada é enviado, e o documento desaparece quando a aba fecha. Use o formatador quando quiser a mesma checagem mais a saída indentada, ou o JSON Repair quando os erros forem mecânicos e você preferir que sejam corrigidos automaticamente.
