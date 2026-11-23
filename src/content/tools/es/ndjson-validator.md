---
locale: es
toolId: ndjson-validator
title: JSON Lines Validator
description: "Valida archivos JSON Lines línea a línea con números de línea exactos, recuento de líneas en blanco y una lista limitada de errores a los que saltar."
summary: "Comprueba cada línea de un archivo JSON Lines o NDJSON por separado. El validador informa de números de línea exactos, distingue las líneas en blanco de las no válidas y te permite saltar directamente al primer registro defectuoso."
steps:
  - "Pega tus datos JSON Lines o suelta un archivo .ndjson / .jsonl en la página."
  - "Elige si deseas detenerte en el primer error y pulsa Validar."
  - "Lee el resumen y la lista de errores; pulsa cualquier error para saltar a esa línea de la entrada."
example:
  caption: "Una línea válida seguida de una no válida."
  input: '{"id":1,"name":"Ada"}\n{"id":2,"name":}'
  output: 'Lines 2 · Valid 1 · Invalid 1 · Blank 0\nL2:17 Expected a value'
mistakes:
  - "Tratar el archivo completo como un único documento JSON; JSON Lines valida cada línea por separado."
  - "Olvidar que un salto de línea final es normal y no crea un registro adicional."
  - "Suponer que el primer error es el único; desactiva la opción de detenerse en el primero para ver resultados limitados de todo el archivo."
faq:
  - q: "¿Qué es un archivo JSON Lines?"
    a: "Es un archivo de texto en el que cada línea es un valor JSON completo e independiente. No hay un array que lo envuelva ni comas entre registros. Eso permite añadir un registro nuevo sin reescribir el archivo y que los lectores lo procesen línea a línea."
  - q: "¿En qué se diferencia la validación de un validador JSON normal?"
    a: "Un validador normal analiza un documento. Aquí cada línea es su propio documento, así que la herramienta informa del número de línea de cada problema y cuenta por separado las líneas válidas, no válidas y en blanco. Un registro roto no inutiliza el resto del archivo."
  - q: "¿Por qué la lista de errores está limitada?"
    a: "Un archivo grande y roto puede contener miles de errores. Renderizarlos todos congelaría la página, así que la herramienta conserva los primeros mil e informa del total real. La lista está virtualizada: solo existen en el documento las filas visibles en pantalla."
  - q: "¿La herramienta sube mi archivo?"
    a: "No. El archivo se lee en tu navegador y se envía en fragmentos a un Web Worker. No hay peticiones de red, no se escribe nada en el almacenamiento y el contenido nunca aparece en la URL."
  - q: "¿Qué hace la opción de detenerse en el primer error?"
    a: "Termina el análisis en cuanto encuentra una línea defectuosa. Resulta útil cuando vas corrigiendo un archivo de un problema en otro y no quieres esperar a que se recorra por completo una entrada muy grande."
---

JSON Lines, también llamado NDJSON, almacena un valor JSON por línea. El formato es deliberadamente pequeño: sin array envolvente, sin comas y sin reglas de sangría compartidas. Esa simplicidad lo hace muy popular para registros, flujos de eventos y grandes conjuntos de datos, porque un productor puede añadir una línea y un consumidor puede leer una línea sin cargar el archivo entero. La contrapartida es que una línea mal formada no produce un único error de archivo como ocurriría con un documento JSON normal. Cada línea ha de comprobarse por separado.

## Qué informa este validador

La herramienta lee la entrada en fragmentos de tamaño fijo y va dividiendo las líneas sobre la marcha, de modo que un archivo de cien megabytes no se convierte en una enorme cadena de JavaScript. Cada línea se analiza de forma independiente. Las líneas en blanco se cuentan aparte de los registros reales porque un salto de línea final es normal y una línea vacía en medio suele ser inofensiva. Los recuentos de líneas válidas y no válidas se muestran junto al total de líneas.

Cuando una línea no se puede analizar, la herramienta registra el número de línea, la columna donde se encontró el problema, el mensaje y una pista en lenguaje claro. Se conservan los primeros mil errores, con el total real indicado junto a ellos. La lista está virtualizada: solo se crean las filas que hay actualmente en pantalla, así que desplazarse por una lista larga de errores sigue siendo fluido. Al pulsar una fila, el cursor del editor se mueve a esa línea.

## Cómo usarlo

1. Pega JSON Lines en el panel de entrada o suelta un archivo `.ndjson` o `.jsonl` en cualquier lugar de la página.
2. Decide si quieres detenerte en el primer error. Déjalo desactivado para ver una muestra limitada de todos los problemas.
3. Pulsa Validar, lee el resumen y pulsa un error para saltar a la línea problemática.

## Cómo leer los resultados

Un recuento alto de líneas no válidas con un recuento bajo de líneas suele significar que el archivo es en realidad un array JSON con sangría en lugar de JSON Lines. Ese formato corresponde al Formateador JSON; conviértele a NDJSON primero. Un recuento alto de líneas en blanco suele venir de una exportación que inserta separadores entre registros. Activa la opción de recortar al convertir si quieres que esas líneas se descarten.

Los números de columna son relativos a cada línea, no al archivo. Eso coincide con la forma en que los editores muestran el cursor y hace que el error sea accionable: la columna indica dónde se detuvo el analizador dentro de ese registro. La pista explica la causa probable en lenguaje ordinario, por ejemplo una cadena sin cerrar o una coma ausente.

## Archivos grandes

Los archivos que superan el límite de vista previa no se pintan en el editor. En su lugar, la página muestra el nombre y el tamaño del archivo y espera a una ejecución explícita. El worker informa del progreso mientras analiza y cancelar detiene el trabajo. Las condiciones de memoria insuficiente se informan con un mensaje amable en lugar de bloquear la pestaña. Así, el hilo principal sigue respondiendo incluso cuando la entrada es mucho mayor que el rango de edición cómodo del navegador.

## Privacidad

Un archivo JSON Lines puede contener datos personales, tokens o registros de clientes. El archivo se lee localmente, se procesa dentro de un Web Worker y nunca se sube. El sitio no tiene analíticas y una política de seguridad de contenido que prohíbe las conexiones salientes. Nada de lo que pegas o sueltas se guarda en el almacenamiento local ni en el de sesión.

## Errores comunes

Una línea que contiene un solo número o cadena es JSON válido y se cuenta como válida, aunque muchas canalizaciones esperen objetos. Si tu herramienta posterior necesita objetos, convierte con la herramienta JSON Lines a CSV y revisa los mensajes de "debe ser un objeto". Un archivo codificado en UTF-16 se rechazará con una pista sobre la codificación; guárdalo primero como UTF-8.
