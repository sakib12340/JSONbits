---
locale: es
toolId: ndjson-to-json
title: JSON Lines to JSON
description: "Convierte JSON Lines en un array JSON, omitiendo registros inválidos o deteniéndote en el primer error, con formato opcional y control de líneas en blanco."
summary: "Recoge registros JSON delimitados por saltos de línea en un único array. Elige cómo tratar las líneas no válidas y en blanco, y aplica sangría a cada registro si lo deseas sin alterar los valores numéricos."
steps:
  - "Pega o suelta un archivo JSON Lines en el panel de entrada."
  - "Elige si omitir las líneas no válidas, recortar las líneas en blanco y aplicar sangría a cada registro."
  - "Pulsa Ejecutar y copia o descarga el array JSON resultante."
example:
  caption: "Dos líneas se convierten en un único array."
  input: '{"id":1}\n{"id":2}'
  output: '[{"id":1},{"id":2}]'
mistakes:
  - "Suponer que las líneas no válidas se descartan por defecto; elige explícitamente Omitir líneas no válidas."
  - "Aplicar sangría a un conjunto de datos enorme cuando un array compacto se descargaría mucho más rápido."
  - "Olvidar que las líneas en blanco se conservan a menos que actives Recortar líneas en blanco."
faq:
  - q: "¿Qué se produce exactamente?"
    a: "Un único array JSON cuyos elementos son los valores de cada línea no vacía, en orden. Si una línea contiene un objeto o un número, ese exacto valor se convierte en el elemento correspondiente. La herramienta no inventa claves ni envuelve registros a menos que actives la sangría."
  - q: "¿Qué ocurre con las líneas no válidas?"
    a: "Por defecto la ejecución se detiene en la primera línea defectuosa e informa de su número, columna y pista. Activa Omitir líneas no válidas para continuar; esos registros se excluyen de la salida. Usa primero el Validador JSON Lines si necesitas un inventario completo de errores."
  - q: "¿Se incluyen las líneas en blanco?"
    a: "Las líneas en blanco se convierten en valores null cuando Recortar líneas en blanco está desactivado, porque siguen ocupando una posición en la secuencia. Con el recorte activado se eliminan por completo y el array solo contiene registros de líneas no vacías."
  - q: "¿La sangría cambia los datos?"
    a: "No. El formato se aplica al texto de cada registro y los tokens numéricos se conservan tal como se escribieron. Un entero grande como 9007199254740993 sigue siendo exacto en lugar de redondearse al pasar por un número de JavaScript."
  - q: "¿Puede gestionar archivos muy grandes?"
    a: "Sí. Las líneas se leen en fragmentos desde el búfer de archivo transferido y se informa del progreso durante la ejecución. Los archivos que superan el límite de vista previa requieren una ejecución explícita, y las salidas de más de cuatro megabytes se ofrecen como descarga en lugar de inyectarse en el editor."
  - q: "¿Se sube algo?"
    a: "No. La lectura, la conversión y el formato ocurren dentro de tu navegador. No hay ninguna petición de red durante el uso de la herramienta ni almacenamiento persistente de tus datos."
---

JSON Lines resulta práctico para productores y procesadores de flujos, pero la mayoría de las herramientas JSON esperan un único array u objeto. Convertir entre ambas formas es un primer paso habitual antes de analizar datos, importarlos en una base de datos o entregarlos a un formateador. Esta herramienta recoge las líneas en un array y te da control explícito sobre las partes conflictivas: registros rotos, líneas en blanco y tamaño de la salida.

## El modelo de conversión

El worker lee la entrada en fragmentos y va dividiendo por caracteres de salto de línea a medida que avanza. Cada línea completa se analiza para confirmar que es JSON válido. Las líneas válidas se añaden a un array de salida, conservando su texto original para que los números mantengan su representación exacta. Si la sangría está activada, cada registro se formatea con dos espacios antes de añadirse. El resultado se ensambla en un constructor de flujo, de modo que la página nunca contiene a la vez una cadena de origen gigante y varias copias de la salida.

Las líneas no válidas se gestionan según tu elección. Con el comportamiento predeterminado, la ejecución se detiene en el primer problema y el panel de error indica el número de línea, la columna y una pista en lenguaje claro. Activar Omitir líneas no válidas continúa y excluye esos registros del array. Ninguno de los dos modos cambia un registro silenciosamente: una línea que se analiza se copia tal cual, y una que no se detiene el trabajo o se deja fuera.

Las líneas en blanco son un caso aparte. Un salto de línea final al terminar el archivo es normal y por sí solo no crea un registro en blanco. Las líneas vacías en medio, en cambio, siguen siendo posiciones en la secuencia. Con el recorte desactivado se convierten en elementos `null`; con el recorte activado desaparecen. Casi todas las exportaciones se benefician del recorte.

## Cómo usarlo

1. Pega JSON Lines en el panel de entrada o suelta un archivo `.ndjson` o `.jsonl` en la página.
2. Establece las opciones de líneas no válidas, líneas en blanco y sangría.
3. Pulsa Ejecutar. Copia el array o descárgalo como `result.txt` cuando la salida sea grande.

## Elegir el tamaño de la salida

La sangría hace que el resultado sea más fácil de leer, pero puede duplicar o triplicar su tamaño. Para un archivo con cientos de miles de registros, un array compacto suele ser la mejor opción porque se descarga más rápido y la siguiente herramienta puede procesarlo sin necesidad de reformatearlo. Si solo quieres inspeccionar unos pocos registros, ejecuta con sangría y cambia después al Visor JSON para navegar.

Cuando la salida supera los cuatro megabytes, el worker la devuelve como un Blob. La página muestra su tamaño y ofrece un botón de descarga en lugar de intentar pintar millones de caracteres en un editor. Es la misma ruta de salida grande que usan los conversores, y es lo que mantiene el navegador responsive con conjuntos de datos grandes.

## Privacidad

El archivo se decodifica y se procesa en un Web Worker en tu equipo. No se sube nada, ninguna analítica observa la entrada y ningún parámetro de consulta contiene los datos. La política de seguridad de contenido del sitio tiene `connect-src 'none'`, lo que convierte la afirmación de cero peticiones de red en algo verificable y no en una cuestión de confianza.

## Errores comunes

Un error de "codificación" significa que el archivo se guardó en un formato distinto de UTF-8; vuelve a guardarlo como UTF-8. Un error de sintaxis con número de línea apunta a un registro que no es JSON completo. Si todas las líneas parecen válidas pero la ejecución se detiene, comprueba caracteres invisibles como una marca de orden de bytes al principio de la primera línea.
