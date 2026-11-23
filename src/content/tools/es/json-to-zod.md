---
locale: es
toolId: json-to-zod
title: JSON to Zod
description: "Genera esquemas Zod v4 a partir de una muestra JSON con campos opcionales y anulables, objetos estrictos y un tipo de TypeScript inferido listo para usar."
summary: "Convierte un ejemplo JSON en un archivo de esquema Zod v4. El generador reutiliza el mismo árbol de inferencia que la herramienta de TypeScript, emite ayudantes de formato modernos y puede añadir objetos estrictos y exportaciones de tipo z.infer."
steps:
  - "Pega en el panel de entrada una muestra JSON representativa."
  - "Establece un nombre para el esquema y elige si exportar la constante, el tipo z.infer, los campos opcionales y los objetos estrictos."
  - "Pulsa Generar, y luego copia o descarga el archivo de TypeScript e impórtalo en tu proyecto."
example:
  caption: "Un objeto de ejemplo y el esquema Zod generado a partir de él."
  input: '{ "id": 7, "email": "ada@example.com", "active": true }'
  output: 'import { z } from "zod";\n\nexport const Root = z.object({\n  id: z.number(),\n  email: z.email(),\n  active: z.boolean(),\n});\n\nexport type Root = z.infer<typeof Root>;'
mistakes:
  - "Suponer que la inferencia puede recuperar restricciones que no ve, como longitudes mínimas o rangos numéricos permitidos."
  - "Olvidar que un objeto estricto rechaza claves desconocidas mientras que un z.object normal las elimina por defecto."
  - "Usar validadores de cadena encadenados al estilo Zod 3 cuando el código generado apunta a los ayudantes de nivel superior de Zod 4."
faq:
  - q: "¿A qué versión de Zod apunta el código generado?"
    a: "Apunta a Zod 4. Los formatos de cadena se emiten como ayudantes de nivel superior como z.email(), z.uuid(), z.url(), z.ipv4(), z.iso.date() y z.iso.datetime(), que es la sintaxis actual documentada. En Zod 3 estas comprobaciones eran métodos encadenados sobre z.string()."
  - q: "¿Cómo se detectan los campos opcionales y anulables?"
    a: "El generador examina todos los objetos de un array. Una clave ausente en algunos elementos se marca como opcional, y una clave cuyo valor es null en algún caso se envuelve en z.nullable(). Estas comprobaciones se pueden desactivar si prefieres una base más estricta."
  - q: "¿Qué cambia la opción de objetos estrictos?"
    a: "Emite z.strictObject en lugar de z.object. Un objeto Zod normal elimina las claves desconocidas del resultado analizado; un objeto estricto las informa como error. Elige la opción estricta cuando los campos inesperados deban fallar de forma explícita, por ejemplo en un límite de API."
  - q: "¿Es necesaria la exportación z.infer?"
    a: "No, pero resulta práctica. Te da un tipo de TypeScript derivado del esquema de ejecución, de modo que la validación y el tipado estático se mantienen sincronizados. Puedes desactivarla si tu proyecto deriva los tipos en otro lugar."
  - q: "¿Esta herramienta reutiliza la inferencia de JSON a TypeScript?"
    a: "Sí. Ambas herramientas analizan la muestra en el mismo árbol sintáctico tipado. El generador Zod recorre ese árbol y emite expresiones de esquema en lugar de declaraciones de interfaz, así que ambas salidas coinciden en tipos, campos opcionales y elementos de array fusionados."
  - q: "¿Se suben o almacenan mis muestras?"
    a: "No. La generación se ejecuta en un Web Worker en tu navegador. No hay subida, ni analíticas sobre la entrada, ni almacenamiento persistente, ni parámetro de consulta que contenga la muestra."
---

Zod valida datos en tiempo de ejecución y también puede proporcionar los tipos estáticos que usas en tiempo de compilación. Eso lo hace ideal para datos que cruzan un límite: una respuesta de API, el envío de un formulario o un archivo de configuración. Lo tedioso es escribir la primera versión del esquema, que suele consistir en leer un ejemplo y traducir cada campo a mano. Esta herramienta hace esa traducción a partir de una muestra que pegas.

## Cómo funciona la generación

Esta herramienta y JSON to TypeScript parten del mismo paso de análisis. El documento se convierte en un árbol tipado de objetos, arrays, cadenas, números, booleanos y null. El generador Zod recorre ese árbol y emite una expresión para cada nodo. Los objetos se convierten en `z.object({ ... })`, los arrays en `z.array(...)` y los escalares en los primitivos Zod correspondientes. Los grupos de objetos dentro de un array se fusionan: sus claves se unen, las claves ausentes en algunos registros se marcan como opcionales y los valores que a veces son null se vuelven anulables. Eso significa que una sola muestra con unos pocos registros suele producir un esquema más preciso que un registro aislado.

Los valores de cadena se comprueban con patrones conservadores para los formatos habituales. Cuando un grupo de cadenas coincide de forma consistente con uno, el generador emite el ayudante de Zod 4 correspondiente: `z.email()`, `z.uuid()`, `z.url()`, `z.ipv4()`, `z.iso.date()` o `z.iso.datetime()`. Estas son las API de nivel superior actuales documentadas para Zod 4; el código más antiguo usaba métodos encadenados sobre `z.string()`. El archivo generado empieza con `import { z } from "zod";` para que puedas añadirlo directamente a un proyecto de TypeScript.

## Cómo usarlo

1. Pega una muestra JSON con los campos que te interesan. Incluye varios elementos de array si algún campo a veces falta.
2. Establece el nombre del esquema y elige las opciones. `export const` resulta útil para un módulo importable; `z.infer` añade un tipo de TypeScript correspondiente.
3. Pulsa Generar, revisa el código y cópialo o descárgalo. Añade las restricciones que la muestra no puede revelar, como longitudes, rangos o descripciones.

## Lo que la inferencia no puede decirte

Una muestra muestra valores, no reglas. Si todas las cadenas del ejemplo tienen doce caracteres, no hay evidencia de que doce sea un requisito. Si un número es positivo en la muestra, el generador seguirá emitiendo `z.number()` porque no puede saber si los valores negativos están prohibidos. Los formatos son heurísticas: un valor que parece una dirección de correo probablemente lo sea, pero el patrón es deliberadamente simple. Después de generar, edita el esquema para codificar el contrato real y conserva algunas muestras representativas para poder contrastar futuros cambios.

Los objetos en Zod eliminan las claves desconocidas por defecto. Si tu aplicación debe rechazar los campos inesperados en lugar de ignorarlos, activa los objetos estrictos. Así se emite `z.strictObject`, que informa de las propiedades desconocidas en lugar de descartarlas silenciosamente. Esa distinción importa cuando un error de tecleo en un payload entrante debe detectarse cuanto antes.

## Privacidad

La muestra se procesa dentro de un Web Worker y nunca se envía a ninguna parte. La página no tiene analíticas, ni peticiones de terceros, y una política de seguridad de contenido que prohíbe las conexiones salientes. Nada de lo que pegas se escribe en el almacenamiento y el esquema nunca aparece en la URL.

## Errores comunes

Un documento vacío o no válido no se puede analizar y el panel de error muestra la línea y la columna exactas. Un primitivo de nivel superior produce una constante de tipo alias en lugar de un esquema de objeto. Los nombres que no son identificadores válidos de JavaScript se sustituyen por `Root`, así que renombra la constante generada si necesitas una exportación concreta.
