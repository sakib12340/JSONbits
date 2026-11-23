---
locale: es
toolId: jsonpath-tester
title: JSONPath Tester
description: 'Prueba expresiones JSONPath con tus datos y mira cada coincidencia con su ruta y valor. Filtros, segmentos y uniones. Todo en tu navegador, sin subir nada.'
summary: Ejecuta una expresión JSONPath sobre un documento y lee cada coincidencia con su ruta y valor exactos, además de los tiempos y los detalles de truncado.
steps:
  - Pega un documento y una expresión como $.store.books[?(@.price < 10)], o usa el ejemplo para ver cómo funcionan los filtros y los segmentos.
  - Pulsa Ejecutar o Ctrl/Cmd+Enter. El resultado enumera cada coincidencia con su ruta y su valor, junto con el total y el tiempo empleado.
  - Copia el resultado completo o descárgalo como archivo .json y pega la expresión en la biblioteca o la prueba que vaya a ejecutarla.
example:
  caption: Un filtro devuelve una coincidencia y el resultado conserva la expresión, la ruta, el valor y el tiempo.
  input: |
    {
      "store": {
        "books": [
          { "title": "A", "price": 8 },
          { "title": "B", "price": 14 }
        ]
      }
    }
  output: |
    {
      "expression": "$.store.books[?(@.price < 10)]",
      "matches": [
        { "path": "$.store.books[0]", "value": { "title": "A", "price": 8 } }
      ],
      "total": 1,
      "truncated": false,
      "timeMs": 1
    }
mistakes:
  - Agrupar condiciones de filtro entre paréntesis. Este subconjunto admite && y || sin paréntesis, así que divide la condición compuesta.
  - Dejar valores de cadena sin comillas en un filtro. Compara directamente con un número, pero escribe la comparación de cadenas como [?(@.status == 'open')].
  - Suponer que todas las implementaciones de JSONPath coinciden. El descenso recursivo, las uniones y los filtros difieren entre bibliotecas; compruébalo en la biblioteca destino.
  - Escribir una expresión demasiado amplia como $..* y esperar obtenerlo todo. Las coincidencias se limitan a 2.000 y el resultado a unos 2 MB.
faq:
  - q: "¿Qué sintaxis de JSONPath se admite?"
    a: La raíz $, claves con punto y corchetes, índices de array incluidos los negativos, comodines, descenso recursivo, segmentos, uniones y filtros con operadores de comparación, pruebas de existencia, negación, && y ||.
  - q: "¿Los filtros pueden comparar cadenas?"
    a: Sí, con comillas simples o dobles, frente a cadenas, números, true, false y null. Un nombre de miembro suelto como @.id comprueba la existencia y ! la niega.
  - q: "¿Por qué el resultado indica que está truncado?"
    a: Cada valor se limita a 20.000 caracteres, las coincidencias a 2.000 y el resultado completo a unos 2 MB. Cuando se aplica un límite se activa la marca, para que una respuesta parcial nunca se confunda con una completa.
  - q: "¿Dónde se muestran los errores de sintaxis?"
    a: Directamente debajo del campo de consulta, de modo que un corchete ausente o un operador no admitido se señalan junto a la expresión que lo provocó.
  - q: "¿El documento sale del navegador?"
    a: No. La consulta se ejecuta en un Web Worker en esta pestaña. El documento y el resultado permanecen en el dispositivo y no se escribe nada en el almacenamiento.
---

JSONPath es un pequeño lenguaje de consulta para JSON, el equivalente a un selector CSS aplicado a un documento. El JSONPath Tester ejecuta una expresión sobre tus datos y devuelve un resultado estructurado en lugar de una pared de coincidencias, lo que resulta práctico para comprobar una expresión antes de incorporarla a una prueba, una regla de supervisión o el código de la aplicación.

El subconjunto admitido cubre la sintaxis en la que coincide la mayoría de las bibliotecas. `$` es la raíz, `.clave` y `['clave']` leen un miembro, `[0]` y `[-1]` indexan un array, y `[*]` o `.*` seleccionan todos los elementos secundarios. El descenso recursivo con `..clave` o `..*` busca en todos los niveles, los segmentos como `[1:4:2]` toman un rango y las uniones como `[0,2]` o `['a','b']` combinan selecciones. Los filtros usan `[?(@.price < 10)]` con `==`, `!=`, `<`, `<=`, `>` y `>=`, y comparan con cadenas, números, `true`, `false` o `null`. Una expresión como `[?(@.id)]` comprueba la existencia, `!` la niega, y `&&` y `||` unen condiciones sin paréntesis.

La salida es JSON que puedes conservar. Registra la expresión, un array de coincidencias con una `path` y un `value`, el total, la marca `truncated` y el tiempo en milisegundos. Esa forma resulta fácil de pegar en un informe de error o en una instantánea de prueba, y las rutas usan la misma notación que copia el visor, de modo que una coincidencia puede rastrearse hasta el documento original.

Dos hábitos hacen que una expresión sea fiable. Ejecuta primero la versión más amplia de la consulta, como `$.items[*]`, y compara el número de coincidencias con algo que puedas verificar a mano. Un filtro que devuelve menos filas de lo esperado suele deberse a un desajuste de tipos: `"10"` y `10` son valores distintos y una comparación numérica no coincidirá con una cadena. Después ejecuta la misma expresión en la herramienta y en la biblioteca que la ejecutará en producción. El descenso recursivo y las uniones son donde las implementaciones divergen más, así que una consulta que funciona aquí puede necesitar un pequeño reajuste en un cliente de Python o Java.

El tamaño del resultado está limitado a propósito. Un valor se detiene en 20.000 caracteres, la lista de coincidencias en 2.000 entradas y el resultado completo en aproximadamente 2 MB, con `truncated` activado cuando se aplica un límite. Por tanto, una expresión amplia sobre un documento grande devuelve una respuesta rápida en lugar de bloquear la pestaña.

Las consultas se ejecutan en un Web Worker sobre un documento que nunca sale del navegador. Para explorar un documento a mano, [JSON Viewer](/json-viewer) muestra las mismas rutas en un árbol, y [JSON Schema Validator](/json-schema-validator) comprueba la forma de los datos que has encontrado.
