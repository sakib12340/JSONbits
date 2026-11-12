---
locale: es
toolId: json-validator
title: JSON Validator
description: "Valida la sintaxis JSON en tu navegador y obtén la línea y columna exactas de cada error, con pistas claras. No se sube ni se almacena nada."
summary: "Comprueba si un documento es JSON válido y descubre con precisión dónde y por qué falla cuando no lo es."
steps:
  - "Pega JSON en el panel de entrada o suelta un archivo .json en la página. El botón Ejemplo carga un documento corto que puedes romper a propósito."
  - "Pulsa Validar o Ctrl/Cmd+Enter. La validación es una comprobación de sintaxis, así que termina en milisegundos incluso con documentos grandes."
  - "Lee el resultado. El JSON válido muestra recuentos de objetos, arrays, claves y valores; el inválido indica la línea, la columna y una corrección sugerida."
example:
  caption: "Una coma final se señala en la línea y columna donde se detuvo el analizador."
  input: |
    {
      "name": "JSON Bits",
      "private": true,
    }
  output: |
    JSON no válido
    Línea 4, columna 1
    Pista: elimina la coma final antes de la llave de cierre.
mistakes:
  - "Una coma final después de la última propiedad es el fallo más común. JSON permite una coma solo entre miembros, nunca después del último."
  - "Los comentarios, las claves sin comillas y las cadenas con comillas simples vienen de costumbres de JavaScript y la gramática JSON los rechaza."
  - "Los saltos de línea o tabuladores literales dentro de una cadena no son válidos; usa las formas escapadas \\n y \\t."
  - "Dos valores seguidos o una coma ausente entre propiedades producen un error que apunta al segundo valor en lugar de a la coma que falta."
faq:
  - q: "¿Esto valida un JSON Schema?"
    a: "Todavía no. Esta página comprueba solo la sintaxis JSON, que es donde fallan la mayoría de los documentos rotos. Un validador de JSON Schema llegará como herramienta aparte."
  - q: "¿La validación envía mis datos a alguna parte?"
    a: "No. La comprobación se ejecuta en un Web Worker en esta pestaña, y la página está construida para no poder hacer peticiones de red mientras una herramienta está abierta."
  - q: "¿Qué precisión tiene la ubicación del error?"
    a: "El validador indica la línea y la columna donde se detuvo el análisis, muestra un fragmento con el carácter problemático y añade una pista que nombra la causa probable."
  - q: "¿Puedo validar un archivo grande?"
    a: "Sí. Se aceptan archivos de hasta 100 MB. Los documentos grandes se ejecutan bajo demanda con un estado de progreso, y el resultado sigue siendo un resumen en lugar de renderizar el archivo como texto."
  - q: "¿Un JSON válido significa que los datos son correctos?"
    a: "No. La validez sintáctica solo significa que el documento sigue la gramática JSON. Los campos obligatorios, los tipos y las reglas de negocio necesitan un esquema o tus propias comprobaciones."
---

El Validador JSON responde con precisión a una pregunta: ¿este documento sigue la gramática JSON y, si no, dónde se rompe? Pega un documento, suelta un archivo o carga el ejemplo y pulsa Validar. La comprobación se ejecuta en un Web Worker, así que incluso un archivo de varios megabytes se examina sin bloquear el desplazamiento ni la escritura en la página.

Para una entrada válida, el resultado resume el documento: cuántos objetos y arrays contiene, cuántos valores y claves se contaron y cuánto tardó la comprobación. Para una entrada inválida, el panel indica la línea y la columna donde se detuvo el análisis, muestra los caracteres cercanos y explica la causa probable con palabras claras, por ejemplo que una coma antes de una llave de cierre no está permitida.

La validación no modifica tus datos ni los almacena. No se sube nada y el documento desaparece al cerrar la pestaña. Usa el formateador cuando quieras la misma comprobación más una salida con sangría, o JSON Repair cuando los errores sean mecánicos y prefieras corregirlos automáticamente.
