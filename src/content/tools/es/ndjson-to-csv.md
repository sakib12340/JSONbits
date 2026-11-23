---
locale: es
toolId: ndjson-to-csv
title: JSON Lines to CSV
description: "Convierte registros JSON Lines en CSV con aplanado de rutas con puntos, comillas RFC 4180, fila de encabezado opcional y protección contra fórmulas."
summary: "Transforma registros JSON delimitados por saltos de línea en un CSV listo para hojas de cálculo. Los objetos anidados se convierten en columnas con rutas con puntos, los valores se entrecomillan según RFC 4180 y las celdas que parecen fórmulas se pueden neutralizar."
steps:
  - "Pega o suelta un archivo JSON Lines cuyas líneas contengan objetos."
  - "Elige el delimitador y las opciones de aplanado, encabezado y protección de fórmulas."
  - "Pulsa Ejecutar y copia el CSV o descárgalo como archivo."
example:
  caption: "Los objetos anidados se convierten en columnas con rutas con puntos."
  input: '{"name":"Ada","address":{"city":"London"}}\n{"name":"Grace","address":{"city":"New York"}}'
  output: 'name,address.city\nAda,London\nGrace,"New York"'
mistakes:
  - "Suponer que cada línea es un objeto; los registros escalares no pueden convertirse en filas CSV y se informan como errores."
  - "Desactivar la protección de fórmulas cuando el CSV se vaya a abrir en una hoja de cálculo."
  - "Olvidar que el aplanado crea nombres de columna con puntos que quizá haya que renombrar para el sistema destino."
faq:
  - q: "¿Cómo se gestionan los objetos anidados?"
    a: "Con el aplanado activado, una clave anidada se convierte en un nombre de columna con puntos como address.city, y los niveles más profundos siguen el mismo patrón. Los arrays se serializan como texto JSON en una sola celda, salvo que se cambien a una representación unida. Sin aplanado, un valor objeto se escribe como su texto JSON."
  - q: "¿Cómo se decide el entrecomillado?"
    a: "El escritor sigue RFC 4180. Un campo se envuelve entre comillas dobles cuando contiene el delimitador, una comilla, un retorno de carro, un salto de línea o espacios al principio o al final. Las comillas internas se duplican. Las líneas terminan con CRLF, que es lo que esperan las hojas de cálculo."
  - q: "¿Qué hace la protección de fórmulas?"
    a: "Una celda que empieza por =, +, -, @, una tabulación o un retorno de carro puede interpretarse como una fórmula en una hoja de cálculo. La protección antepone un apóstrofo a esos valores para que se lean como texto. Actívala siempre que el CSV se vaya a abrir en Excel o una aplicación similar."
  - q: "¿Qué pasa si una línea no es válida?"
    a: "Por defecto la ejecución se detiene en esa línea y la informa. Activa Omitir líneas no válidas para continuar con los registros restantes. Las líneas que se analizan pero no son objetos se informan por separado, porque un escalar no puede aportar columnas CSV."
  - q: "¿Se toman los nombres de columna de todos los registros?"
    a: "Las columnas se recogen en el orden en que aparecen por primera vez entre los registros conservados. Si una clave aparece solo en un registro posterior, las filas anteriores tienen simplemente una celda vacía en esa columna. Así se comportan la mayoría de los exportadores CSV."
  - q: "¿Salen mis datos del navegador?"
    a: "No. El análisis y la escritura CSV se ejecutan dentro de un Web Worker. No hay subidas, ni analíticas, ni peticiones de terceros; la política de seguridad de contenido prohíbe las conexiones salientes."
---

CSV y JSON Lines resuelven problemas distintos. JSON Lines es excelente para las máquinas: cada línea es un valor JSON completo y los registros nuevos se pueden añadir con poco coste. CSV es excelente para las personas: hojas de cálculo, bases de datos y herramientas de informes lo abren directamente. Convertir de uno a otro es un paso frecuente en un flujo de datos, y la parte delicada es decidir cómo se convierte el JSON anidado en columnas planas.

## Cómo funciona el aplanado

Cada línea no vacía se analiza como JSON. Los valores que son objetos se convierten en una sola fila CSV. Con el aplanado activado, una propiedad anidada como `address.city` se convierte en una columna con ese nombre con puntos, y los niveles más profundos continúan el mismo patrón. Los arrays se escriben como texto JSON por defecto, lo que mantiene su estructura intacta dentro de una celda. Un valor que es en sí un objeto sin aplanado también se escribe como texto JSON.

Las columnas se descubren entre todos los registros conservados, en el orden en que aparecen por primera vez. La fila de encabezado usa esos nombres. Si una clave falta en un registro concreto, su celda queda vacía. Por eso una importación en hoja de cálculo suele mostrar columnas de aspecto irregular: simplemente no había valor en ese punto de los datos subyacentes.

## Entrecomillado y seguridad

El escritor sigue RFC 4180. Un campo se entrecomilla cuando contiene el delimitador, una comilla doble, un retorno de carro, un salto de línea o espacios en blanco al principio o al final. Las comillas dentro de un campo se duplican. Las filas terminan con CRLF, que es lo que esperan las aplicaciones de hoja de cálculo. Elegir un delimitador de punto y coma o tabulación resulta útil en configuraciones regionales donde la coma es separador decimal.

La protección de fórmulas es una función pequeña pero importante. Los valores que empiezan por `=`, `+`, `-`, `@`, una tabulación o un retorno de carro pueden tratarse como fórmulas en una hoja de cálculo. Una celda manipulada con cuidado podría ejecutar una acción no deseada al abrir el archivo. Anteponer un apóstrofo a esos valores los convierte en texto plano. Está desactivada por defecto porque cambia el valor de la celda, pero es la elección correcta para cualquier CSV derivado de una entrada no fiable.

## Cómo usarlo

1. Pega JSON Lines en el panel de entrada o suelta un archivo `.ndjson` o `.jsonl` en la página.
2. Elige un delimitador y decide el aplanado, la fila de encabezado y la protección de fórmulas.
3. Pulsa Ejecutar, y copia el CSV o descárgalo como `result.txt`. Renombra el archivo descargado a `.csv` para tu hoja de cálculo.

## Entradas grandes

Las líneas se leen en fragmentos de tamaño fijo desde un búfer de archivo transferido, así que incluso un archivo muy grande nunca se convierte en una cadena gigante en el hilo principal. Se informa del progreso durante la ejecución y el worker se puede cancelar. Un límite de seguridad restringe el número de filas recogidas para la salida CSV, porque una hoja de cálculo tiene su propio límite de filas y construir una tabla sin límites anularía el propósito de la transmisión por fragmentos. Si tu conjunto de datos es mayor, filtralo antes de convertir.

## Privacidad

La conversión ocurre por completo en tu navegador. El sitio no hace peticiones de red mientras se usa la herramienta, no se guarda nada y los datos nunca se colocan en una URL. Eso importa aquí porque las exportaciones JSON Lines suelen contener registros de clientes o identificadores internos.

## Errores comunes

Una línea que es JSON válido pero no un objeto se informa como error de fila; envuelve primero los escalares en un objeto con una clave con significado. Un error de sintaxis incluye el número de línea problemático y una pista. Si la salida parece una sola fila larga, comprueba el delimitador: un archivo escrito con puntos y coma no se separará en columnas si se abre con ajustes de coma.
