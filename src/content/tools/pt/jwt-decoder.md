---
locale: pt
toolId: jwt-decoder
title: JWT Decoder
description: "Decodifique cabeçalhos e payloads de JWT localmente, leia claims e prazos em forma legível, e veja por que esta ferramenta nunca verifica a assinatura."
summary: "Um decodificador de JWT divide um JSON Web Token em cabeçalho e payload, decodifica ambos com base64url e mostra os claims de forma legível. Tudo acontece no seu navegador: o token nunca é enviado, armazenado nem colocado na URL."
steps:
  - "Cole um JWT no painel de entrada. Um prefixo 'Bearer ' no início e quebras de linha são aceitos."
  - "Pressione Decodificar. O worker divide o token, decodifica o cabeçalho e o payload com base64url e analisa ambos os objetos JSON."
  - "Leia a tabela de claims para expiração, emissor, assunto e algoritmo, e use Copiar ou Baixar para o JSON decodificado."
example:
  caption: "Um token decodificado com prazo de expiração, um emissor e um assunto."
  input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiYWRhIiwiZXhwIjoxODkzNDU2MDAwfQ.signature"
  output: "{\n  \"header\": { \"alg\": \"HS256\", \"typ\": \"JWT\" },\n  \"payload\": {\n    \"iss\": \"https://example.com\",\n    \"sub\": \"ada\",\n    \"exp\": 1893456000\n  }\n}"
mistakes:
  - "Tratar um token decodificado como prova de identidade: decodificar apenas lê os segmentos, não verifica a assinatura."
  - "Colar um token criptografado de cinco partes (JWE); esses não podem ser decodificados sem uma chave de descriptografia."
  - "Supor que o claim exp esteja sempre presente; tokens podem omiti-lo ou usar outro claim para o prazo."
faq:
  - q: "Esta ferramenta verifica a assinatura do JWT?"
    a: "Não. Decodificar lê o cabeçalho e o payload codificados em base64url e analisa o JSON dentro deles. Verificar uma assinatura exige a chave do emissor e uma checagem criptográfica, e esta ferramenta deliberadamente não faz nenhum dos dois. Ela avisa quando o cabeçalho diz que alg é none ou quando o segmento de assinatura está ausente."
  - q: "Meu token é enviado ou armazenado em algum lugar?"
    a: "Não. O token é decodificado dentro de um Web Worker no seu navegador. A página não faz nenhuma requisição de rede enquanto você usa a ferramenta, o token não é gravado no localStorage nem no IndexedDB, e nunca é colocado na barra de endereço. Fechar a aba o descarta."
  - q: "Por que vejo um aviso de que o token expirou?"
    a: "Se o payload contiver um claim exp numérico, o decodificador o compara com a hora atual. O valor é segundos desde a época Unix, não milissegundos. A tabela de claims mostra o mesmo instante em UTC e no seu fuso horário local para você avaliar."
  - q: "Qual a diferença entre um JWT e um JWE?"
    a: "Um JWT assinado, mais precisamente um JWS, tem três partes separadas por pontos: cabeçalho, payload e assinatura. Seu payload só precisa de decodificação base64url para ser legível. Um JWE é criptografado e tem cinco partes; seu payload não pode ser lido sem a chave de descriptografia, então este decodificador o recusa em vez de mostrar caracteres sem sentido."
  - q: "Posso colar um token que começa com Bearer?"
    a: "Sim. O decodificador remove um prefixo Bearer no início, ignora maiúsculas e minúsculas e remove espaços e quebras de linha. Isso torna utilizáveis tokens copiados de um cabeçalho Authorization ou de uma linha de log quebrada, sem limpeza manual."
  - q: "alg, typ e kid são claims do cabeçalho ou do payload?"
    a: "São claims do cabeçalho. O cabeçalho descreve como o token é codificado e qual chave o assinou. Claims como iss, sub, aud, exp, iat e nbf ficam no payload. A tabela de claims os agrupa para você distinguir os dois conjuntos de relance."
---

Um JSON Web Token é três strings separadas por pontos: um cabeçalho, um payload e uma assinatura. As duas primeiras são objetos JSON codificados com base64url, que é um alfabeto base64 seguro para colocar em uma URL. Decodificar significa reverter essa codificação e ler o JSON. É uma operação de exibição, não uma verificação de segurança, e manter essas duas ideias separadas é a principal razão para usar um decodificador dedicado.

## O que o decodificador mostra

A ferramenta divide o token, decodifica o cabeçalho e o payload e analisa ambos os objetos. A tabela de claims então destaca os campos que as pessoas mais procuram. Claims de tempo numéricos como `exp`, `iat` e `nbf` aparecem como segundos desde a época Unix, junto com um timestamp em UTC, um timestamp local e uma frase relativa como "expira em 2 horas" ou "expirado há 3 dias". Um token expirado é marcado na área de avisos. Claims de texto como `iss`, `sub` e `aud` aparecem ao lado de claims do cabeçalho como `alg`, `typ` e `kid`, para você ver de qual objeto cada valor veio. O cabeçalho e o payload decodificados completos também estão disponíveis como JSON formatado que você pode copiar ou baixar.

## Como usar

1. Cole o token no painel de entrada. Um prefixo `Bearer ` no início é aceito, e também quebras de linha introduzidas por um visualizador de logs ou cliente de e-mail.
2. Pressione Decodificar. O trabalho roda em um Web Worker, então até um token colado junto com outros textos não faz a página engasgar.
3. Leia os claims e os avisos, depois copie ou baixe o JSON decodificado se precisar continuar trabalhando com ele.

## Por que a assinatura não é verificada

Verificar um token significa checar que sua assinatura foi produzida por uma chave em que você confia. Isso exige conhecer o emissor, buscar ou já ter a chave pública correta, escolher um algoritmo aceito e comparar o resultado em tempo constante. Um decodificador não tem nenhum desses contextos. Ele só pode mostrar o que o token diz sobre si mesmo. Um token cujo cabeçalho afirma que `alg` é `none`, ou cujo segmento de assinatura está vazio, ainda é perfeitamente decodificável e é exatamente o tipo de token que um atacante entregaria a você. É por isso que o aviso fica visível acima da ferramenta, em vez de aparecer só depois que algo dá errado.

Se você precisa de uma decisão de confiança, faça-a no serviço que detém a chave secreta ou pública. Use os valores decodificados como ponto de partida para depuração: confirme que o emissor e o público são os esperados, verifique se a expiração é razoável e depois deixe o verificador tomar a decisão.

## Tokens criptografados são diferentes

Um token de cinco partes é um JWE, não um JWT assinado. Seu payload é criptografado, então a decodificação base64url produz bytes que não são JSON. Esta ferramenta reporta esse caso claramente, em vez de mostrar caracteres de substituição ou um erro de análise. Lidar com um JWE exige a chave privada do destinatário e uma biblioteca JOSE configurada com os algoritmos esperados.

## Privacidade

Tokens são credenciais. Qualquer pessoa que leia um deles pode agir como o usuário que ele representa. Este decodificador roda inteiramente no seu navegador: não há upload, nem análises sobre a entrada, nem armazenamento persistente, nem parâmetro de consulta contendo o token. A política de segurança de conteúdo da página proíbe conexões externas, o que torna essa afirmação verificável em vez de ser apenas uma promessa. Trate o JSON decodificado que você baixa com o mesmo cuidado do token original e limpe a área de transferência quando terminar.

## Erros comuns

Um token com apenas duas partes costuma ser um JWS com assinatura vazia; ele é decodificado com um aviso de assinatura ausente. Um token com quatro ou mais partes, fora o caso do JWE de cinco partes, está malformado. Um segmento que falha na decodificação base64url, ou que decodifica para bytes que não são JSON UTF-8, é reportado com uma dica em linguagem clara em vez de um rastro de pilha.
