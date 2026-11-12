---
locale: es
toolId: json-minifier
title: JSON Minifier
description: "Minifica JSON eliminando espacios sin tocar valores ni la precisión numérica. Consulta cuántos bytes ahorras y copia o descarga el resultado."
summary: "Elimina el espacio en blanco insignificante del JSON y comprueba exactamente cuánto más pequeño se vuelve el documento."
steps:
  - "Pega o suelta el JSON que quieres comprimir. El ejemplo muestra un documento formateado con objetos y arrays anidados."
  - "Pulsa Minificar o Ctrl/Cmd+Enter. La barra de estadísticas indica el tamaño de entrada, el de salida y el porcentaje ahorrado."
  - "Copia el resultado compacto o descárgalo como minified.json para un archivo de configuración, una carga útil de API o un bundle."
example:
  caption: "El mismo documento después de minificarlo, con la reducción de tamaño indicada sobre la salida."
  input: |
    {
      "name": "JSON Bits",
      "tags": ["json", "minify"],
      "private": true
    }
  output: '{"name":"JSON Bits","tags":["json","minify"],"private":true}'
mistakes:
  - "Minificar JSON inválido produce un error en lugar de una salida. Ejecuta antes el validador o la herramienta de reparación."
  - "Quitar espacios dentro de una cadena corrompería el valor, así que el minificador solo elimina el espacio entre tokens."
  - "Volver a formatear después restaura la legibilidad, pero la forma compacta es la que debe enviar un servidor de producción o un bundle."
faq:
  - q: "¿Minificar cambia mis valores?"
    a: "No. Solo se elimina el espacio entre tokens. Las cadenas, las claves, los tokens numéricos y su orden quedan exactamente como se escribieron, incluidos los enteros grandes y los decimales largos."
  - q: "¿Cuánto espacio ahorra la minificación?"
    a: "Depende de la sangría. El JSON con dos espacios suele reducirse entre un 20 y un 40 por ciento, mientras que una entrada ya compacta apenas ahorra o no ahorra nada."
  - q: "¿El JSON minificado sigue siendo válido?"
    a: "Sí, si la entrada era válida. La salida es el mismo documento sin espacio insignificante, así que cualquier analizador lo lee igual."
  - q: "¿Puedo minificar un archivo en lugar de texto pegado?"
    a: "Sí. Suelta un archivo .json en la página o usa Abrir archivo. Los archivos grandes se procesan en el worker en segundo plano y el resultado se puede descargar directamente."
  - q: "¿Por qué la página avisa a partir de 50 MB?"
    a: "Los documentos muy grandes pueden agotar la memoria de la pestaña. El aviso te permite decidir antes de iniciar una ejecución que podría tardar unos segundos."
---

El Minificador JSON elimina el espacio que hace legible al JSON pero cuesta bytes: la sangría, los saltos de línea y los espacios alrededor de la puntuación. Analiza el documento de forma segura y lo vuelve a emitir sin esos caracteres, así que el resultado es un JSON equivalente byte a byte que cualquier analizador lee de la misma manera.

El tratamiento de los números es deliberado. En lugar de convertirlos en números de JavaScript y serializarlos de nuevo, el minificador conserva los tokens numéricos como texto, de modo que `9007199254740993` no se convierte en `9007199254740992` y `4.999999999999999` mantiene todos sus dígitos. Las cadenas nunca se tocan, lo que significa que el espacio dentro de un valor sobrevive mientras que el espacio entre tokens no.

La barra de estadísticas muestra el tamaño antes y después, además del porcentaje ahorrado, algo útil cuando compruebas si una carga útil merece comprimirse o si gzip ya hace el trabajo. Todo se ejecuta en esta pestaña. Tu JSON no se sube, no se almacena y no se registra; la descarga se genera localmente a partir del resultado.
