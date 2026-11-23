---
locale: es
slug: how-to-use-jsonpath
title: Cómo usar JSONPath
description: "Aprende la sintaxis de JSONPath: raíz, acceso con puntos y corchetes, comodines, filtros, segmentos y descenso recursivo, todo probado en tu navegador."
updated: 2026-11-23
toolIds:
  - jsonpath-tester
  - json-viewer
  - json-formatter
faq:
  - q: "¿Qué es JSONPath?"
    a: JSONPath es un lenguaje de consulta para JSON, similar a XPath para XML. Selecciona valores de un documento mediante una expresión compacta que empieza por $.
  - q: "¿JSONPath es un estándar?"
    a: No existe un único estándar. Este sitio sigue la sintaxis habitual que usan la mayoría de las herramientas, incluidos filtros, segmentos y descenso recursivo.
  - q: "¿Por qué mi consulta no devolvió nada?"
    a: Comprueba el símbolo de raíz, los nombres de propiedad y los índices de array. Una errata en el nombre de una clave produce silenciosamente un resultado vacío en lugar de un error.
  - q: "¿JSONPath puede modificar un documento?"
    a: No. Solo lee y selecciona valores. Para cambiar datos, copia el resultado y edítalo en el formateador o el visor.
  - q: "¿Cuántos resultados se pueden devolver?"
    a: El comprobador limita las coincidencias visibles para mantener la fluidez, pero informa del total real y te permite descargar el resultado completo.
---

JSONPath te permite pedirle a un documento JSON los valores que te interesan sin escribir un programa. Una expresión parte de la raíz (`$`) y recorre claves e índices de array.

## Acceso básico

- `$` es el documento completo.
- `$.store.book` lee una propiedad llamada `book` dentro de `store`.
- `$['store']['book']` es lo mismo, y resulta útil cuando una clave contiene espacios o caracteres especiales.
- `$.store.book[0]` lee el primer elemento de un array.
- `$.store.book[-1]` lee el último elemento.

La notación con punto es más corta; la notación con corchetes es más segura para claves poco habituales.

## Comodines y recursión

- `$.store.book[*]` selecciona todos los libros.
- `$..author` encuentra todos los campos `author` a cualquier profundidad, lo que resulta práctico para metadatos dispersos.
- `$.store.book[0,2]` selecciona el primero y el tercer libro.

## Segmentos

Los segmentos de array se parecen a los de Python: `$.store.book[1:3]` selecciona los índices 1 y 2, y `$.store.book[:2]` toma los dos primeros. Un paso como `[::2]` selecciona un elemento sí y otro no.

## Filtros

Los filtros van entre corchetes y empiezan por `?`:

- `$.store.book[?(@.price < 10)]` selecciona los libros que cuestan menos de 10.
- `$.store.book[?(@.category == 'fiction')]` compara con un valor de cadena.
- `$.store.book[?(@.isbn)]` conserva los elementos que tienen un campo `isbn`.

Combina condiciones con `&&` y `||`, y niégalas con `!`. Las comparaciones admiten `==`, `!=`, `<`, `<=`, `>` y `>=`.

## Errores comunes

- Olvidar el `$` inicial.
- Usar acceso a propiedades de JavaScript como `store.book` sin la raíz.
- Confundirse con los índices de array, que empiezan en 0.
- Esperar que un filtro devuelva el objeto padre en lugar del elemento coincidente.

Prueba las expresiones con un documento real en el comprobador de JSONPath y envía el resultado a otra herramienta con el menú compartido "Enviar a".

## Cómo trabajar con el comprobador

Pega o suelta un documento en el panel de entrada, escribe una expresión y lee los valores coincidentes junto a sus rutas. El comprobador funciona por completo en tu navegador, así que los archivos grandes nunca salen de tu dispositivo. Cambia entre los modos de resultado para ver valores, arrays aplanados, la primera coincidencia, solo rutas o rutas emparejadas con valores.

Cada coincidencia muestra su ruta JSONPath, que puedes copiar directamente en tu código. Cuando una consulta devuelve más resultados de los que permite la pantalla, la línea de estado informa del total real y un botón de descarga guarda la lista completa.

## Consejos de rendimiento

- Reduce primero con un filtro antes de aplicar un comodín, para no recorrer todo el árbol.
- Usa `$.ruta` en lugar de `$..` cuando conozcas la estructura, porque el descenso recursivo explora cada nodo.
- En archivos muy grandes, empieza con una muestra pequeña para confirmar la expresión y ejecútala después en el documento completo.
- Mantén las expresiones legibles: un predicado por filtro y divide las consultas complejas en pasos.

## Cómo leer los resultados

Una consulta correcta devuelve un array de coincidencias incluso cuando solo hay una. Un array vacío significa que la expresión era válida pero no coincidió con nada, mientras que un mensaje de error rojo indica que la sintaxis se rechazó. Corrige primero los errores de sintaxis y después ajusta el predicado hasta que el recuento coincida con lo que esperas.
