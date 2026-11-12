---
locale: es
toolId: json-viewer
title: JSON Viewer
description: "Explora JSON grandes como un árbol virtualizado y rápido en tu navegador. Busca claves y valores, copia rutas JSONPath y expande solo lo necesario."
summary: "Lee un documento JSON grande como un árbol con expansión diferida, búsqueda y rutas copiables en lugar de un muro de texto."
steps:
  - "Pega JSON o suelta un archivo y pulsa Ver árbol o Ctrl/Cmd+Enter. El ejemplo carga un documento anidado con arrays, objetos y valores mixtos."
  - "Expande las filas con las flechas o con un clic. Expandir hasta el nivel abre varios niveles a la vez; Contraer todo vuelve a la raíz."
  - "Usa Buscar para encontrar claves o valores y luego copia una ruta JSONPath o el valor de la fila seleccionada."
example:
  caption: "Una fila por nodo, con etiquetas de tipo, recuentos de hijos y la ruta JSONPath de la selección."
  input: |
    {
      "team": [
        { "name": "Ada", "role": "engineer" },
        { "name": "Grace", "role": "admiral" }
      ]
    }
  output: |
    team                 array (2)
      0                  objeto (2)
        name             "Ada"
        role             "engineer"
      1                  objeto (2)
mistakes:
  - "Pegar JSON con una coma final impide crear el árbol; el error señala la línea exacta."
  - "Esperar que todos los nodos se rendericen a la vez. Los documentos grandes se expanden de forma diferida, así que las ramas contraídas no están en el DOM."
  - "Copiar un valor que sigue contraído. Expande el nodo primero o copia la ruta y revísala en otro lugar."
faq:
  - q: "¿Qué tamaño de documento puede abrir el visor?"
    a: "Se aceptan archivos de hasta 100 MB. El árbol está virtualizado y se obtiene en fragmentos desde el worker, así que en la página solo existen las filas visibles en cada momento."
  - q: "¿El visor se congela con archivos grandes?"
    a: "No. El análisis y la indexación ocurren en un Web Worker, y el resultado se renderiza como una lista virtualizada, así que el desplazamiento sigue respondiendo en lugar de bloquear el hilo principal."
  - q: "¿Qué formato tienen las rutas copiadas?"
    a: "Las rutas son expresiones JSONPath como $.team[0].name, listas para pegar en una herramienta de consulta, una prueba o la documentación."
  - q: "¿Puedo buscar valores además de claves?"
    a: "Sí. La búsqueda coincide con claves y valores escalares, indica cuántas coincidencias encontró y permite saltar entre ellas."
  - q: "¿El visor sube o almacena mi JSON?"
    a: "No. El documento se analiza en tu navegador y se descarta al cerrar la pestaña. No se envía nada a un servidor ni se escribe nada en el almacenamiento."
---

El Visor JSON presenta un documento como un árbol de filas en lugar de un bloque de texto. Cada fila muestra una clave, su tipo y una vista previa del valor, con un recuento para objetos y arrays. Las ramas se abren bajo demanda, así que un documento con decenas de miles de nodos se renderiza al instante y sigue respondiendo mientras te desplazas.

El árbol se crea en un Web Worker y se sirve a la página en fragmentos. Esa arquitectura mantiene libre el hilo principal: la página solo contiene las filas visibles en ese momento, no el documento completo. La búsqueda se ejecuta en el mismo worker y coincide tanto con claves como con valores escalares, devolviendo un recuento y una forma de recorrer los resultados.

Las rutas se muestran como JSONPath, por ejemplo `$.team[0].name`, y se pueden copiar con una acción, junto con el valor. Eso hace que el visor sea útil para depurar una respuesta de API, comprobar qué campo cambió o pasar una ruta precisa a un compañero. Todo se queda en tu dispositivo: sin subidas, sin cuenta y sin documento almacenado.
