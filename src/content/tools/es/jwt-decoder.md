---
locale: es
toolId: jwt-decoder
title: JWT Decoder
description: "Decodifica cabeceras y cargas útiles de JWT en local, lee los claims y sus caducidades, y descubre por qué esta herramienta nunca verifica la firma."
summary: "Un decodificador de JWT divide un JSON Web Token en su cabecera y su carga útil, decodifica ambos segmentos en base64url y muestra los claims en formato legible. Todo ocurre en tu navegador: el token nunca se sube, se almacena ni se añade a la URL."
steps:
  - "Pega un JWT en el panel de entrada. Se aceptan tanto un prefijo 'Bearer ' inicial como los saltos de línea."
  - "Pulsa Decodificar. El worker divide el token, decodifica en base64url la cabecera y la carga útil, y analiza ambos objetos JSON."
  - "Lee la tabla de claims para la caducidad, el emisor, el sujeto y el algoritmo, y usa Copiar o Descargar para obtener el JSON decodificado."
example:
  caption: "Un token decodificado con una fecha de caducidad, un emisor y un sujeto."
  input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2V4YW1wbGUuY29tIiwic3ViIjoiYWRhIiwiZXhwIjoxODkzNDU2MDAwfQ.signature"
  output: "{\n  \"header\": { \"alg\": \"HS256\", \"typ\": \"JWT\" },\n  \"payload\": {\n    \"iss\": \"https://example.com\",\n    \"sub\": \"ada\",\n    \"exp\": 1893456000\n  }\n}"
mistakes:
  - "Tratar un token decodificado como prueba de identidad: decodificar solo lee los segmentos, no comprueba la firma."
  - "Pegar un token cifrado de cinco partes (JWE); esos no se pueden decodificar sin una clave de descifrado."
  - "Suponer que el claim exp siempre está presente; los tokens pueden omitirlo o usar otro claim para la duración."
faq:
  - q: "¿Esta herramienta verifica la firma del JWT?"
    a: "No. Decodificar consiste en leer la cabecera y la carga útil codificadas en base64url y analizar el JSON que contienen. Verificar una firma requiere la clave del emisor y una comprobación criptográfica, y esta herramienta deliberadamente no hace ninguna de las dos cosas. Te avisará cuando la cabecera indique alg como none o cuando falte el segmento de firma."
  - q: "¿Mi token se sube o se almacena en algún lugar?"
    a: "No. El token se decodifica dentro de un Web Worker en tu navegador. La página no hace peticiones de red mientras usas la herramienta, el token no se escribe en localStorage ni en IndexedDB y nunca se coloca en la barra de direcciones. Al cerrar la pestaña se descarta."
  - q: "¿Por qué veo una advertencia de que el token ha caducado?"
    a: "Si la carga útil contiene un claim exp numérico, el decodificador lo compara con la hora actual. El valor son segundos desde el epoch de Unix, no milisegundos. La tabla de claims muestra el mismo instante en UTC y en tu zona horaria local para que lo juzgues tú mismo."
  - q: "¿Cuál es la diferencia entre un JWT y un JWE?"
    a: "Un JWT firmado, más precisamente un JWS, tiene tres partes separadas por puntos: cabecera, carga útil y firma. Su carga útil solo necesita decodificarse en base64url para ser legible. Un JWE está cifrado y tiene cinco partes; su carga útil no se puede leer sin la clave de descifrado, así que este decodificador la rechaza en lugar de mostrar disparate."
  - q: "¿Puedo pegar un token que empiece por Bearer?"
    a: "Sí. El decodificador elimina un prefijo Bearer inicial, ignora mayúsculas y minúsculas, y quita espacios y saltos de línea. Así, los tokens copiados de una cabecera Authorization o de una línea de registro con salto de línea se pueden usar sin limpieza manual."
  - q: "¿alg, typ y kid son claims de la cabecera o de la carga útil?"
    a: "Son claims de la cabecera. La cabecera describe cómo se codifica el token y qué clave lo firmó. Claims como iss, sub, aud, exp, iat y nbf pertenecen a la carga útil. La tabla de claims los agrupa para que distingas ambos conjuntos de un vistazo."
---

Un JSON Web Token son tres cadenas separadas por puntos: una cabecera, una carga útil y una firma. Las dos primeras son objetos JSON codificados con base64url, un alfabeto base64 seguro para incluir en una URL. Decodificar consiste en invertir esa codificación y leer el JSON. Es una operación de visualización, no una comprobación de seguridad, y mantener separadas ambas ideas es la principal razón para usar un decodificador dedicado.

## Qué muestra el decodificador

La herramienta divide el token, decodifica la cabecera y la carga útil, y analiza ambos objetos. La tabla de claims muestra después los campos que más se buscan. Los claims de tiempo numéricos como `exp`, `iat` y `nbf` aparecen como segundos desde el epoch de Unix junto a una marca de tiempo UTC, otra en hora local y una frase relativa como "caduca en 2 horas" o "caducó hace 3 días". Un token caducado se marca en el área de advertencias. Los claims de texto como `iss`, `sub` y `aud` aparecen junto a claims de cabecera como `alg`, `typ` y `kid`, para que veas de qué objeto procede cada valor. La cabecera y la carga útil completas decodificadas también están disponibles como JSON formateado que puedes copiar o descargar.

## Cómo usarlo

1. Pega el token en el panel de entrada. Un prefijo `Bearer ` inicial es válido, y también los saltos de línea introducidos por un visor de registros o un cliente de correo.
2. Pulsa Decodificar. El trabajo se ejecuta en un Web Worker, así que incluso un token pegado junto a otro texto no hace que la página se entrecorte.
3. Lee los claims y las advertencias, y copia o descarga el JSON decodificado si necesitas seguir trabajando con él.

## Por qué no se verifica la firma

Verificar un token significa comprobar que su firma fue producida por una clave en la que confías. Eso exige conocer al emisor, obtener o ya disponer de la clave pública correcta, elegir un algoritmo aceptado y comparar el resultado en tiempo constante. Un decodificador no tiene ninguno de esos datos. Solo puede mostrar lo que el token dice de sí mismo. Un token cuya cabecera afirma que `alg` es `none`, o cuyo segmento de firma está vacío, se decodifica perfectamente y es justo el tipo de token que un atacante te entregaría. Por eso la advertencia permanece visible encima de la herramienta en lugar de aparecer solo cuando algo va mal.

Si necesitas tomar una decisión de confianza, hazlo en el servicio que posee el secreto o la clave pública. Usa los valores decodificados como punto de partida para depurar: confirma que el emisor y la audiencia son los esperados, revisa que la caducidad sea razonable y deja que el verificador tome la decisión.

## Los tokens cifrados son distintos

Un token de cinco partes es un JWE, no un JWT firmado. Su carga útil está cifrada, así que decodificarla en base64url produce bytes que no son JSON. Esta herramienta informa de ese caso con claridad en lugar de mostrar caracteres de reemplazo o un error de análisis. Gestionar un JWE requiere la clave privada del destinatario y una biblioteca JOSE configurada con los algoritmos esperados.

## Privacidad

Los tokens son credenciales. Quien lea uno podría actuar en nombre del usuario que representa. Este decodificador funciona por completo en tu navegador: no hay subida, ni analíticas sobre la entrada, ni almacenamiento persistente, ni parámetro de consulta que contenga el token. La política de seguridad de contenido de la página prohíbe las conexiones salientes, lo que convierte esta afirmación en algo comprobable y no en una promesa. Trata el JSON decodificado que descargues con el mismo cuidado que el token original y borra el portapapeles cuando termines.

## Errores comunes

Un token con solo dos partes suele ser un JWS con la firma vacía; se decodifica con una advertencia de firma ausente. Un token con cuatro o más partes, salvo el caso del JWE de cinco, está mal formado. Un segmento que falla al decodificarse en base64url, o que produce bytes que no son JSON UTF-8, se informa con una pista en lenguaje claro en lugar de una traza de pila.
