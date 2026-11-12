---
locale: es
toolId: json-formatter
title: JSON Formatter
description: "Formatea y sangra JSON en tu navegador con 2 o 4 espacios o tabulaciones. Errores precisos, números grandes intactos y nada se envía a ningún servidor."
summary: "Convierte JSON compacto o desordenado en un documento con sangría uniforme sin cambiar ni un solo valor."
steps:
  - "Pega JSON en el panel de entrada, suelta un archivo .json en cualquier parte de la página o pulsa Abrir archivo. Ejemplo carga un documento con objetos anidados, arrays y un entero de 64 bits."
  - "Elige el tamaño de sangría en la barra de herramientas. Dos espacios es lo predeterminado; cuatro espacios o tabulaciones coinciden con la mayoría de editores y archivos de configuración."
  - "Pulsa Formatear o Ctrl/Cmd+Enter, y luego copia el resultado o descárgalo como formatted.json."
example:
  caption: "Entrada compacta a la izquierda, salida formateada a la derecha."
  input: '{"project":"JSON Bits","private":true,"downloads":9007199254740993,"tags":["json","formatter"]}'
  output: |
    {
      "project": "JSON Bits",
      "private": true,
      "downloads": 9007199254740993,
      "tags": ["json", "formatter"]
    }
mistakes:
  - "Las comas finales después de la última propiedad o elemento de un array no son válidas en JSON. Elimina la coma o pasa el documento por JSON Repair."
  - "Los comentarios copiados de JavaScript (// o /* */) no forman parte de la gramática JSON y deben quitarse."
  - "Las claves sin comillas y las cadenas con comillas simples son JavaScript válido, pero no JSON válido. Rodea claves y cadenas con comillas dobles."
  - "Las comillas tipográficas pegadas desde un procesador de textos parecen comillas dobles, pero son otro carácter. Sustitúyelas por comillas rectas."
faq:
  - q: "¿Mi JSON se sube a alguna parte?"
    a: "No. El formato se ejecuta en un Web Worker dentro de esta pestaña. La página no hace ninguna petición de red mientras trabajas y no existe un servidor que pueda recibir el documento."
  - q: "¿El formato altera los números grandes?"
    a: "No. El formateador copia los tokens numéricos exactamente en lugar de analizarlos y volver a serializarlos, así que 9007199254740993 conserva sus dieciséis dígitos y los decimales largos mantienen cada posición."
  - q: "¿Qué tamaño de archivo puedo formatear?"
    a: "Se aceptan archivos de hasta 100 MB. Las entradas de menos de 1 MB se actualizan mientras escribes; los documentos mayores se ejecutan bajo demanda con un estado de progreso para que la página nunca se congele."
  - q: "¿Por qué un JSON que parece válido da error?"
    a: "Las causas habituales son una coma final, un comentario o comillas simples. El panel de error indica la línea y la columna, muestra un fragmento y sugiere la corrección con palabras claras."
  - q: "¿Puedo formatear un archivo sin abrirlo en un editor de texto?"
    a: "Sí. Suelta el archivo en la página o pulsa Abrir archivo. El formateador lo lee localmente, muestra el nombre y el tamaño, y ofrece el resultado formateado como descarga."
---

El Formateador JSON convierte JSON compacto o con espacios irregulares en un documento fácil de leer, revisar y comparar. Analiza con un tokenizador en lugar de `JSON.parse`, así que los tokens numéricos se copian exactamente como se escribieron. Un entero de 64 bits como `9007199254740993` conserva todos sus dígitos en lugar de convertirse en silencio en `9007199254740992`, y los decimales de alta precisión mantienen cada posición. Solo cambia el espacio en blanco.

Todo se ejecuta en un Web Worker dentro de esta pestaña. El texto que pegas, sueltas o abres nunca se envía a ninguna parte: no hay endpoint de subida, ni cuenta, ni analíticas que lean el contenido. Los documentos grandes pasan por el mismo worker, así que un archivo de varios megabytes muestra un estado de progreso en lugar de congelar la página.

Si el documento no es válido, el formateador se detiene en el primer problema e indica la línea, la columna, un fragmento y una pista clara. Corrige la entrada y vuelve a ejecutar. La preferencia de sangría se guarda solo en este navegador; el JSON nunca se persiste.
