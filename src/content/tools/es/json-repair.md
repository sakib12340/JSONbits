---
locale: es
toolId: json-repair
title: JSON Repair
description: "Repara JSON no válido en el navegador: comas finales, comentarios, comillas, claves sin comillas y literales de Python, con una lista de correcciones."
summary: "Corrige los errores mecánicos que rompen el JSON y consulta exactamente qué reparaciones se aplicaron antes de usar el resultado."
steps:
  - "Pega el documento roto o suelta un archivo. Pulsa Reparar o Ctrl/Cmd+Enter; el ejemplo reúne varios errores habituales a la vez."
  - "Revisa la lista de correcciones aplicadas, como comas finales eliminadas o comillas tipográficas sustituidas, junto a la salida reparada."
  - "Copia o descarga el JSON limpio y pásalo por el validador para confirmar el resultado antes de publicarlo."
example:
  caption: "El informe de reparación nombra cada cambio para que nada se corrija en silencio."
  input: |
    {
      name: 'JSON Bits',   // product name
      "private": True,
    }
  output: |
    {
      "name": "JSON Bits",
      "private": true
    }
mistakes:
  - "Reparar un documento al que le falta un valor o un corchete. Las correcciones mecánicas no pueden inventar datos, así que el resultado seguirá fallando la validación."
  - "Dar por hecho que la salida reparada es semánticamente correcta. Revisa la lista de correcciones; un comentario eliminado puede haber aportado información."
  - "Usar la reparación en un documento que no es JSON, como un módulo de JavaScript con imports y expresiones."
faq:
  - q: "¿Qué errores se pueden reparar automáticamente?"
    a: "Comentarios, comas finales, cadenas con comillas simples, comillas tipográficas, claves sin comillas y literales de Python como None, True y False. Cada reparación se enumera para que puedas revisarla."
  - q: "¿La reparación cambia mis datos?"
    a: "Solo reescribe la sintaxis. Las claves, los valores y su orden se mantienen, y los tokens numéricos se conservan en lugar de recalcularse."
  - q: "¿Puede la reparación cerrar un corchete que falta?"
    a: "No de forma fiable. La herramienta corrige errores habituales de puntuación y comillas; un documento estructuralmente incompleto necesita una corrección manual, y el validador mostrará dónde se rompe."
  - q: "¿Debo confiar en la salida reparada?"
    a: "Revisa primero la lista de correcciones. Las reparaciones son deterministas y se muestran de forma explícita, pero eliminar un comentario o convertir True en true es una decisión que conviene confirmar."
  - q: "¿Se envía el JSON roto a un servidor?"
    a: "No. La reparación se ejecuta en un Web Worker de esta pestaña, así que tanto los documentos inválidos como los válidos permanecen en tu dispositivo."
---

JSON Repair se ocupa de los errores que hacen que un documento no sea válido por motivos mecánicos y aburridos. Los comentarios, las comas finales, las comillas simples, las comillas tipográficas de un procesador de textos, las claves sin comillas y los literales de Python como `True` o `None` se reescriben como JSON válido, y cada cambio se enumera para que el resultado nunca sea una caja negra.

La reparación se ejecuta en un Web Worker, así que la página sigue respondiendo incluso con una entrada grande. Los tokens numéricos se copian como texto, lo que significa que un documento reparado conserva intactos sus enteros de 64 bits y sus decimales largos. La salida se puede copiar o descargar de inmediato.

Reparar es una comodidad, no un sustituto de la revisión. Si un comentario aportaba significado, o un literal de Python era intencionado, la lista de correcciones te dice qué cambió para que puedas decidir. Después de reparar, pasa el documento por el Validador JSON para confirmar que se analiza y sigue trabajando con el formateador o el visor. En ningún momento se sube nada.
