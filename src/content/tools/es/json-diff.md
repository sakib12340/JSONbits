---
locale: es
toolId: json-diff
title: JSON Diff
description: "Compara dos documentos JSON en tu navegador y consulta cada valor añadido, eliminado o cambiado en una lista filtrable por ruta. Sin subir nada."
summary: "Compara dos documentos JSON por estructura y revisa las diferencias como una lista legible de rutas en lugar de dos muros de texto."
steps:
  - "Pega el documento original a la izquierda y el documento modificado a la derecha, o abre cada uno desde un archivo."
  - "Pulsa Comparar o Ctrl/Cmd+Enter. Si los documentos son idénticos lo indica de inmediato; si no, cada diferencia aparece con su ruta."
  - "Filtra por añadido, eliminado o cambiado, copia una ruta o activa Ignorar el orden de los arrays cuando los mismos elementos se hayan reordenado."
example:
  caption: "Una diferencia estructural indica la ruta y ambos valores de cada cambio."
  input: |
    Original: { "name": "JSON Bits", "version": 1 }
    Modificado: { "name": "JSON Bits", "version": 2, "private": true }
  output: |
    cambiado  $.version   1 → 2
    añadido   $.private   true
mistakes:
  - "Comparar texto en lugar de datos. El orden de las claves y la sangría no importan aquí, así que un archivo reformateado no muestra cambios."
  - "Usar Ignorar el orden de los arrays cuando las posiciones son significativas. Los elementos reordenados se tratan entonces como los mismos valores."
  - "Comparar documentos que no se pueden analizar. Corrige primero la sintaxis; el error indica la línea y la columna."
faq:
  - q: "¿La comparación es textual o estructural?"
    a: "Estructural. Ambos documentos se analizan y se comparan por ruta, así que la sangría, los espacios y el orden de las claves nunca aparecen como diferencias."
  - q: "¿Qué hace Ignorar el orden de los arrays?"
    a: "Empareja los elementos del array por valor en lugar de por posición, de modo que mover un elemento dentro de una lista no se informa como una eliminación y una adición."
  - q: "¿Qué tamaño pueden tener los dos documentos?"
    a: "Cada documento puede llegar a 20 MB. Las entradas mayores se rechazan con un mensaje claro en lugar de arriesgar una pestaña congelada."
  - q: "¿Mis documentos se suben para compararlos?"
    a: "No. Ambos documentos se analizan y comparan en un Web Worker en esta pestaña. No hay llamada al servidor y nada se almacena al cerrar la pestaña."
  - q: "¿La diferencia muestra los valores antiguos y nuevos?"
    a: "Sí. Las filas cambiadas muestran el valor anterior y el actual uno al lado del otro, y las filas añadidas o eliminadas muestran el valor que apareció o desapareció."
---

La herramienta JSON Diff compara dos documentos por estructura, no por texto. Ambas entradas se analizan en un Web Worker, se recorren juntas y se reducen a una lista plana de rutas con un tipo: añadido, eliminado o cambiado. Como la comparación ocurre después del análisis, reformatear un archivo, reordenar claves o cambiar la sangría nunca produce una diferencia falsa.

Cada fila lleva la ruta JSONPath del cambio, el valor anterior y el nuevo valor cuando existen ambos. Los filtros reducen la lista a un solo tipo de cambio, y una ruta se puede copiar para un informe de error o una prueba. La opción Ignorar el orden de los arrays empareja los elementos por valor en lugar de por posición, que es lo que quieres cuando una API devuelve la misma colección en otro orden.

La comparación se ejecuta por completo en esta pestaña. Los documentos nunca se suben, nunca se escriben en el almacenamiento y se descartan al cerrar la página. Cada lado acepta archivos de hasta 20 MB, y los documentos idénticos se informan como idénticos en lugar de producir una lista vacía.
