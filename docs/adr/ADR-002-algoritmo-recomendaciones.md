# ADR-002 — Algoritmo de similitud para el motor de recomendaciones de fragancias

**Estado:** Aceptada  
**Fecha:** 2026-06-03  
**Categoría:** Procesamiento de datos / Algoritmo  
**Pipeline relacionado:** Pipeline 1 — Motor de Recomendaciones por Similitud Olfativa

---

## 1. Contexto

El sistema debe ofrecer recomendaciones de fragancias similares a la que el comprador está viendo. El dominio de fragancias tiene una característica particular: los productos se describen mediante **conjuntos de notas olfativas discretas** (e.g., "Rose, Jasmine, Bergamot") organizadas en tres capas (salida, corazón, fondo) y una lista de ingredientes.

El problema es elegir cómo medir la similitud entre dos perfumes a partir de estos datos textuales.

Motivadores que definen los requisitos:
- **Sin infraestructura adicional:** el sistema no debe depender de servicios externos de ML ni de modelos preentrenados para esta funcionalidad.
- **Respuesta en tiempo real:** el cálculo debe completarse en milisegundos por request, sin etapa de entrenamiento ni pre-cómputo obligatorio.
- **Interpretabilidad:** el equipo debe poder entender, depurar y ajustar el algoritmo sin conocimientos de machine learning.
- **Datos disponibles:** el modelo de datos ya tiene `notas_salida`, `notas_corazon`, `notas_fondo` e `ingredientes` como campos de texto libre con valores separados por coma.
- **Catálogo acotado:** el marketplace maneja cientos de productos, no millones.

---

## 2. Alternativas consideradas

### Alternativa A: Índice de Jaccard ponderado sobre tags de notas olfativas

Tokenizar cada campo de notas en un conjunto de strings, calcular `|A ∩ B| / |A ∪ B|` (Jaccard) por campo, y combinar con pesos que reflejan la importancia olfativa relativa de cada capa (corazón 40%, salida 30%, fondo 20%, ingredientes 10%).

- **Ventaja:** Simple, determinístico, sin dependencias externas. Funciona perfectamente para conjuntos de tags discretos como notas olfativas. El resultado es reproducible y auditable. Corre en el propio servidor Node.js.
- **Desventaja:** No captura similitud semántica: "Rose" y "Rosa" son distintos tokens aunque sean lo mismo. Tampoco entiende que "Bergamot" y "Citrus" son similares sin que compartan el mismo tag.

### Alternativa B: TF-IDF con similitud coseno

Tratar las notas como documentos de texto, calcular vectores TF-IDF y medir la similitud coseno entre vectores.

- **Ventaja:** Pondera automáticamente notas raras (más informativas) sobre notas comunes ("Musk", "Aqua"). Más robusto para campos de texto libre.
- **Desventaja:** Requiere una librería de NLP (no incluida en el stack actual) y un corpus de todos los productos para calcular el IDF global. El corpus debe actualizarse cuando se agregan productos. Más complejo de implementar y depurar que Jaccard.

### Alternativa C: Embeddings semánticos con API externa (OpenAI / Cohere)

Enviar las notas olfativas a una API de embeddings, obtener vectores de alta dimensión, y calcular similitud coseno entre ellos.

- **Ventaja:** Captura relaciones semánticas ("Rose" ≈ "Rosa", "Bergamot" ≈ "Citrus"). Potencialmente la mayor calidad de recomendaciones.
- **Desventaja:** Dependencia de una API externa de pago — latencia de red adicional por request, costo monetario por llamada, riesgo de disponibilidad. Viola el motivador de sin infraestructura adicional. Para un catálogo de cientos de productos el beneficio no justifica la complejidad.

### Alternativa D: Filtrado colaborativo (collaborative filtering)

Recomendar en base al comportamiento de otros usuarios: "los compradores que compraron este perfume también compraron X".

- **Ventaja:** Captura preferencias reales de los usuarios, no solo características del producto.
- **Desventaja:** Requiere un historial significativo de compras para funcionar (cold start problem). En el lanzamiento del marketplace, sin datos históricos, el sistema no podría generar ninguna recomendación. Inviable para la etapa actual.

---

## 3. Decisión

Se usa el **índice de Jaccard ponderado sobre los conjuntos de notas olfativas** (Alternativa A), implementado en `lib/recomendaciones.ts`.

Los pesos por campo son:
| Campo | Peso |
|---|---|
| `notas_corazon` | 40% |
| `notas_salida` | 30% |
| `notas_fondo` | 20% |
| `ingredientes` | 10% |

---

## 4. Fundamentación

- **Conecta con datos disponibles:** Las notas olfativas son exactamente conjuntos de tags discretos — el escenario ideal para Jaccard. "Rose, Jasmine, Bergamot" tokenizado en `{"rose", "jasmine", "bergamot"}` es un conjunto bien formado para la operación de intersección/unión.
- **Conecta con respuesta en tiempo real:** Jaccard sobre conjuntos de 5–15 elementos por campo es O(n) y ejecuta en microsegundos. Para 500 productos en el catálogo, el tiempo total es del orden de milisegundos.
- **Conecta con sin infraestructura adicional:** Se implementa con JavaScript nativo (`Set`). Sin librerías de ML, sin APIs externas, sin modelos para mantener.
- **Conecta con interpretabilidad:** El equipo puede leer el código, entender el cálculo y ajustar los pesos si la calidad de recomendaciones no es satisfactoria.
- **TF-IDF fue descartado** porque requiere construir y mantener un corpus global y agrega complejidad de implementación sin beneficio claro para datos discretos.
- **Embeddings fueron descartados** por su dependencia externa, costo y latencia — desproporcionados para el tamaño actual del catálogo.
- **Filtrado colaborativo fue descartado** por el cold start problem: el sistema no tiene historial de compras al momento del lanzamiento.

---

## 5. Consecuencias

### Positivas
- Recomendaciones disponibles **desde el día 1**, sin necesidad de datos históricos de usuarios.
- El algoritmo es **auditable y ajustable:** si las recomendaciones no son de calidad, se pueden cambiar los pesos o agregar campos sin reescribir la arquitectura.
- **Sin costo operativo adicional** — no hay APIs de terceros que pagar ni modelos que mantener.
- Corre completamente **en el servidor de la aplicación** — sin latencia de red extra.

### Negativas / Trade-offs
- **No captura similitud semántica:** "Cedro" y "Cedar" son tokens distintos aunque refieran al mismo ingrediente. La calidad de las recomendaciones depende de la consistencia del lenguaje usado al cargar los productos.
- **No aprende del comportamiento del usuario:** dos fragancias con notas completamente distintas pero que los usuarios tienden a comprar juntas no serán recomendadas entre sí.
- **Los pesos son estáticos:** fueron definidos por criterio del equipo (las notas de corazón son más identificatorias que las de salida). No se ajustan automáticamente con datos reales.
- **Requiere datos de notas bien cargados:** si un producto no tiene `notas_corazon`, su similitud con cualquier otro producto en ese campo es 0 — lo que puede generar recomendaciones de baja calidad para productos con datos incompletos.
