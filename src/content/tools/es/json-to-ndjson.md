---
locale: es
toolId: json-to-ndjson
title: JSON to JSON Lines
description: "Convierte un array JSON en JSON delimitado por saltos de línea, un registro compacto por línea, listo para registros, datasets y flujos de datos."
summary: "Divide un array JSON en un valor JSON compacto por línea. El resultado es fácil de ampliar, fácil de transmitir en flujos y aceptado por transportadores de registros y herramientas de datos que esperan JSON Lines."
steps:
  - "Pega un array JSON, o suelta un archivo .json, en el panel de entrada."
  - "Pulsa Ejecutar. Cada elemento se convierte en una línea de JSON compacto."
  - "Copia las líneas o descárgalas como un archivo .ndjson."
example:
  caption: "Un array se convierte en dos registros."
  input: '[{"id":1},{"id":2}]'
  output: '{"id":1}\n{"id":2}'
mistakes:
  - "Pasar un objeto en lugar de un array; NDJSON necesita una secuencia de valores en el nivel superior."
  - "Esperar sangría en la salida; cada registro es intencionadamente una línea compacta."
  - "Añadir líneas a un archivo que todavía conserva el corchete de cierre de un array de una exportación anterior."
faq:
  - q: "¿Por qué la entrada debe ser un array?"
    a: "NDJSON representa una secuencia de registros. Un array es la fuente natural porque sus elementos ya forman una secuencia ordenada. Un objeto único produciría una línea, lo cual es JSON Lines válido pero casi nunca es lo que alguien que pide esta conversión quiere, así que la herramienta explica el requisito en lugar de adivinar."
  - q: "¿Por qué cada registro está en una línea?"
    a: "La línea es el límite del registro. Si un registro se formateara con sangría en varias líneas, un lector ya no podría dividir un flujo por saltos de línea. La salida compacta es un requisito del formato, no una elección de estilo."
  - q: "¿Sobreviven los números grandes a la conversión?"
    a: "Sí. El generador serializa los valores a partir del árbol sintáctico analizado usando su texto numérico original. Un entero de 64 bits o un decimal largo se escriben sin cambios, en lugar de redondearse al pasar por una conversión a número de JavaScript."
  - q: "¿Puedo convertir arrays u objetos anidados?"
    a: "Sí. Cada elemento puede ser cualquier valor JSON: un objeto, un array, una cadena o un número. Las estructuras anidadas permanecen dentro de su propia línea. Solo el array de nivel superior se convierte en líneas."
  - q: "¿Qué ocurre con un array vacío?"
    a: "La salida está vacía. Eso es coherente con el formato: cero registros producen cero líneas. Añade al menos un elemento si esperabas contenido."
  - q: "¿Se suben mis datos?"
    a: "No. El análisis y la serialización se ejecutan dentro de un Web Worker en el navegador. No hay peticiones de terceros, ni analíticas sobre la entrada, y nada se escribe en el almacenamiento persistente."
---

Un array JSON es un documento completo. Un archivo JSON Lines es una secuencia de documentos independientes que se guardan, por casualidad, uno por línea. La diferencia parece pequeña, pero cambia la forma de producir y consumir los datos. Puedes añadir un registro a un archivo JSON Lines escribiendo una línea más; añadirlo a un array implica editar el corchete de cierre. Los transportadores de registros y los frameworks de flujos prefieren la forma basada en líneas porque pueden empezar a leer antes de que el archivo esté terminado.

## Qué hace el conversor

La herramienta analiza la entrada en un árbol sintáctico tipado, recorre el array de nivel superior y escribe cada elemento como un valor JSON compacto seguido de un salto de línea. Como el escritor usa el árbol analizado en lugar de un serializador de objetos genérico, los tokens numéricos se conservan exactamente. Un entero largo sigue siendo largo y un decimal con muchos dígitos no se acorta. Las cadenas se escapan según las reglas de JSON, así que un valor que contiene un salto de línea se convierte en `\n` dentro de su propia línea en lugar de romper el registro.

La salida se construye de forma incremental. Para un array grande, el worker emite líneas a medida que avanza e informa del progreso, manteniendo libre el hilo principal. Cuando el resultado supera los cuatro megabytes, la página lo ofrece como descarga en lugar de pintarlo en un editor. La descarga usa el tipo de contenido `.ndjson` para que las herramientas posteriores reconozcan el formato.

## Cómo usarlo

1. Pega un array JSON en el panel de entrada o suelta un archivo `.json` en la página.
2. Pulsa Ejecutar. La herramienta comprueba que el valor raíz es un array.
3. Copia las líneas resultantes o descárgalas como un archivo `.ndjson`.

## Por qué la raíz debe ser un array

Es una salvaguarda deliberada. Si la entrada fuera un objeto, la herramienta tendría que decidir si escribe el objeto en sí, sus valores o algo derivado de sus claves. Cada opción sería una conjetura, y una conjetura equivocada produciría silenciosamente un archivo con la forma incorrecta. Informar de un error claro es más seguro. Si quieres una sola línea a partir de un objeto, puedes envolverlo tú mismo en un array: `[{"a":1}]` produce `{"a":1}`.

Un error habitual es introducir en la herramienta un archivo que parece NDJSON pero que todavía tiene `[` y `]` envolviendo todo el contenido. Esos corchetes lo convierten en un array JSON, que es exactamente lo que esta herramienta espera. Quitarlos sería otra operación; este conversor da por hecho que el array es intencionado.

## Trabajar con el resultado

Comprueba la primera y la última línea de la salida antes de entregarla a otro sistema. Cada línea debe poder analizarse por sí sola. Si piensas editar el archivo a mano, mantén las líneas cortas y evita añadir comentarios: JSON Lines no tiene sintaxis de comentarios. Un marcador como `_comment` dentro de un registro es una convención que algunas herramientas entienden, pero sigue siendo solo un dato.

Para el sentido inverso, JSON Lines a JSON vuelve a recoger los registros en un array. Las dos conversiones no son del todo simétricas si había líneas en blanco, porque los registros son posiciones en una secuencia. Documenta si tu canalización conserva las líneas vacías y configura la opción de recorte en consecuencia.

## Privacidad

Tus datos se quedan en este dispositivo. El análisis y la serialización ocurren en un Web Worker, el sitio no hace peticiones de red durante el uso de la herramienta y ningún contenido se coloca en la URL ni se escribe en el almacenamiento. La página de privacidad describe las mismas garantías en lenguaje claro.

## Errores comunes

Un error de sintaxis en la línea uno suele significar que la entrada no es JSON en absoluto o que tiene una coma final. El mensaje "debe ser un array de nivel superior" significa que el valor raíz es un objeto, una cadena o un número. Envuelve el valor en un array si esa era tu intención.
