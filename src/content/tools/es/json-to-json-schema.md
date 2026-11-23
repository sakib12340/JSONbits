---
locale: es
toolId: json-to-json-schema
title: JSON to JSON Schema
description: "Infiera un JSON Schema a partir de una muestra con formatos y enums detectados, ajustes de draft y opciones de título, y valida tu JSON con él."
summary: "Convierte un documento de ejemplo en un JSON Schema que puedes editar y reutilizar. El generador infiere tipos, claves obligatorias, esquemas de elementos, formatos de cadena habituales y enums de baja cardinalidad, todo dentro de tu navegador."
steps:
  - "Pega en el panel de entrada una muestra JSON representativa."
  - "Elige un draft, activa la detección de formatos o enums y pulsa Generar."
  - "Copia o descarga el esquema, o pulsa Validar con este esquema para probarlo con la misma muestra."
example:
  caption: "Una muestra pequeña y el esquema inferido a partir de ella."
  input: '{ "name": "Ada", "age": 36, "email": "ada@example.com" }'
  output: '{ "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object", "properties": { "name": { "type": "string" }, "age": { "type": "integer" }, "email": { "type": "string", "format": "email" } }, "required": ["name", "age", "email"] }'
mistakes:
  - "Inferir a partir de un único ejemplo escaso y suponer que se detectarán las claves opcionales; añade primero muestras que cubran los casos ausentes."
  - "Tratar un formato detectado como una garantía: las anotaciones de JSON Schema describen la intención y los validadores solo las aplican si se configuran para ello."
  - "Usar un validador draft-07 con un esquema 2020-12 sin ajustar el URI de $schema y las palabras clave."
faq:
  - q: "¿Cómo decide el generador qué claves son obligatorias?"
    a: "Para un objeto único marca como obligatoria cada clave de la muestra. Cuando fusiona los objetos dentro de un array, una clave solo es obligatoria si aparece en todos los elementos. Eso coincide con el caso habitual de una colección de registros que comparte una forma estable con unos pocos campos opcionales."
  - q: "¿Qué ocurre cuando el mismo campo tiene tipos distintos?"
    a: "La propiedad fusionada recibe un array de tipos, por ejemplo [\"string\", \"null\"]. Esto es JSON Schema válido y es la forma habitual de describir un campo que a veces está ausente como null."
  - q: "¿Qué formatos de cadena se detectan?"
    a: "El generador reconoce date-time, date, email, URI, UUID e IPv4 mediante patrones conservadores. Un format es una anotación: documenta la forma esperada y algunos validadores la aplican, pero nunca cambia el tipo de cadena subyacente."
  - q: "¿Cuándo debo activar la detección de enums?"
    a: "Úsala para vocabularios controlados y pequeños, como roles o estados. El generador añade un enum solo cuando aparecen al menos dos valores de cadena distintos y hay como máximo ocho, así que los campos de texto libre se dejan intactos."
  - q: "¿Puedo validar el esquema generado al instante?"
    a: "Sí. El botón Validar con este esquema pasa el esquema y tu muestra original al JSON Schema Validator en la misma sesión de la pestaña. No se sube nada y el traspaso se borra en cuanto el validador lo lee."
  - q: "¿El resultado es un esquema completo para mi API?"
    a: "Es un punto de partida, no una especificación. La inferencia solo ve los valores que has pegado. Añade descripciones, restricciones y ejemplos por tu cuenta, y alimenta el generador con varios documentos representativos antes de confiar en él en un pipeline."
---

Un JSON Schema es un documento que describe a otro documento: qué propiedades existen, qué tipos contienen, cuáles son obligatorias y qué valores se permiten. Escribir uno a mano lleva tiempo, y el primer borrador suele salir de todos modos de un ejemplo. Esta herramienta invierte el orden. Pega un documento JSON representativo y obtendrá un esquema que puedes editar, compartir o introducir en un validador.

## Qué cubre la inferencia

El generador recorre el documento analizado y emite un tipo para cada valor. Las cadenas se convierten en `string`, los números enteros en `integer`, los decimales en `number`, y `true`, `false` y `null` se asignan a sus tipos JSON Schema correspondientes. Los objetos reciben un mapa `properties` y una lista `required`. Los arrays reciben un esquema `items`. Ahí es donde ocurre la mayor parte del trabajo: cuando un array contiene objetos, el generador los fusiona en una sola forma. La unión de sus claves se convierte en el conjunto de propiedades, mientras que solo las claves presentes en todos los elementos permanecen en `required`. Un campo que aparece como cadena en un registro y como null en otro se convierte en un array de tipos, de modo que no se descarta información sin avisar.

Opcionalmente, el generador puede añadir una anotación `format` a las cadenas que parezcan una fecha y hora, una fecha, una dirección de correo, un URI, un UUID o una dirección IPv4. También puede añadir valores `enum` para vocabularios de cadena pequeños, pero solo cuando hay entre dos y ocho valores distintos. Puedes elegir entre el draft 2020-12 y el draft-07, establecer `additionalProperties: false` e incluir un URI `$schema` y un título.

## Cómo usarlo

1. Pega una muestra JSON lo más representativa posible. Varios registros en un array son más útiles que uno solo.
2. Elige un draft y las opciones que quieras, y pulsa Generar. El trabajo se ejecuta en un Web Worker, así que una muestra grande no congela la página.
3. Revisa el esquema, cópialo o descárgalo, o pulsa Validar con este esquema para comprobar la muestra original con él.

## Cómo leer el resultado

Un esquema generado es una descripción de lo que se ha observado, no un contrato firmado por nadie. Si tu muestra tiene cinco usuarios y ninguno tiene un campo `phone`, el esquema no puede saber que `phone` está permitido. Del mismo modo, una anotación de formato no demuestra que todos los valores reales sigan ese formato; solo indica que los valores de la muestra lo hacían. Trata la salida como un primer borrador y añade las restricciones que tu aplicación necesita realmente: longitudes mínimas, límites numéricos, patrones, descripciones y ejemplos.

La elección de draft importa cuando trasladas el esquema a otra herramienta. El draft 2020-12 usa `https://json-schema.org/draft/2020-12/schema` como URI de `$schema`, mientras que el draft-07 usa el antiguo `http://json-schema.org/draft-07/schema#`. La mayoría de los validadores detectan el dialecto a partir de ese URI, así que mantén la opción coherente con el validador que piensas utilizar.

## Privacidad

La muestra nunca sale de tu navegador. La inferencia se ejecuta en un Web Worker, la herramienta no hace peticiones de red y el documento no se guarda en el almacenamiento local ni en el de sesión. El botón que envía el esquema al validador usa un traspaso de un solo uso en la pestaña actual y lo borra justo después de la lectura.

## Errores comunes

No se puede inferir a partir de un documento vacío o no válido, y el panel de error señala la línea y la columna exactas. Se admite un array de nivel superior, pero si no contiene objetos no hay campos que fusionar, por lo que `items` queda como un esquema vacío. La detección de enums es deliberadamente conservadora; si quieres un conjunto fijo de valores para un campo con un solo valor observado, añade el enum a mano.
