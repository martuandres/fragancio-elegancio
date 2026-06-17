# Arquitectura y Diseño de Sistemas 2026
# Lineamientos para la Presentación Final

## Práctica de Arquitectura y Diseño de Sistemas 2026

La presentación final tiene como objetivo que cada equipo exponga el resultado de su trabajo durante el cuatrimestre, demostrando no solo el funcionamiento del sistema desarrollado, sino también las decisiones de diseño, arquitectura y organización adoptadas durante el proyecto.

La cátedra evaluará tanto el producto final como la capacidad del equipo para explicar el proceso seguido para llegar a la solución propuesta.

---

# 1. ¿Qué evalúa la cátedra en esta presentación?

Se espera que el equipo pueda comunicar y justificar el trabajo realizado.

Se evaluará que el grupo pueda:

- Explicar claramente el problema que buscó resolver.
- Describir la arquitectura general del sistema.
- Justificar las principales decisiones de diseño tomadas.
- Relacionar dichas decisiones con los requerimientos y restricciones del proyecto.
- Mostrar evidencias del trabajo realizado durante el desarrollo.
- Reflexionar sobre los desafíos encontrados y cómo fueron resueltos.
- Comunicar de manera clara y profesional el resultado obtenido.

> Una demostración funcional sin explicación de las decisiones tomadas no es suficiente. La presentación debe mostrar tanto el producto como el proceso de construcción.

---

# 2. Duración de la exposición

Cada grupo dispondrá de **30 minutos** en total.

| Actividad | Tiempo |
|------------|--------|
| Introducción y contexto | 5 min |
| Arquitectura y diseño | 5 min |
| Demostración del sistema | 5-8 min |
| Conclusiones y experiencia del equipo | 5 min |
| Espacio para responder preguntas | 10 min |

La cátedra realizará preguntas al finalizar la exposición.

---

# 3. Formato de entrega del material

Para optimizar los tiempos y evitar inconvenientes de configuración técnica, la cátedra adopta el siguiente formato:

- Cada grupo entregará su presentación hasta **48 hs antes** del día de la exposición.
- La presentación será proyectada desde la PC de la cátedra.
- La demostración del sistema deberá estar incluida como **video pregrabado embebido en la presentación**.
- No se realizarán demostraciones en vivo.
- El video debe mostrar el sistema funcionando con los flujos principales cubiertos.

> El grupo expone apoyándose en la presentación proyectada por la cátedra. Todos los integrantes deben estar presentes y participar de la exposición y las preguntas.

---

# 4. Contenido mínimo de la presentación

Se recomienda estructurar la presentación con los siguientes slides.

El orden puede adaptarse, pero el contenido es obligatorio salvo donde se indica lo contrario.

| Slide | Título sugerido | Contenido esperado |
|---------|----------------|-------------------|
| 1 | Carátula | Nombre del proyecto, integrantes, comisión. |
| 2 | Descripción del sistema | Problema que resuelve, usuarios, alcance definido. |
| 3-4 | Decisiones arquitectónicas | 2 o 3 ADRs clave: qué problema resolvían, alternativas consideradas, decisión tomada y trade-off aceptado. |
| 5 | Modelo de datos | Diagrama conceptual y decisiones destacadas del modelo. |
| 6 | APIs | Endpoints principales, ejemplo de request/response relevante. |
| 7 | Demo | Video pregrabado embebido mostrando los flujos principales del sistema. |
| 8 | Desafíos y aprendizajes | Qué fue lo más difícil, qué decisiones volverían a tomar, qué mejorarían en una próxima versión. |

Para aquellas partes del sistema que no desarrollaron, especificar por qué y cuáles fueron los criterios que tuvieron en cuenta en la elección de desarrollo.

---

## 4.1 Organización y desarrollo del trabajo

El grupo podrá incluir, dentro de los slides de arquitectura o como slide adicional, evidencia del proceso de desarrollo:

- Cómo se organizaron las tareas.
- Herramientas utilizadas para la gestión del proyecto.
- Uso de repositorios y control de versiones.

---

## 4.2 Estrategia de despliegue (optativo)

Los grupos que hayan documentado o implementado una estrategia de despliegue pueden incluir un slide adicional describiendo el enfoque adoptado (**blue-green**, **canary**, **rolling update**, etc.) y su justificación.

La documentación de la estrategia de despliegue dará puntos extras a la presentación del proyecto.

Para orientarse en este tema, se recomienda consultar:

<https://launchdarkly.com/blog/deployment-strategies/>

---

# 5. Participación del equipo

Se espera la participación activa de todos los integrantes.

Cada miembro deberá poder explicar:

- Su aporte al proyecto.
- Las tareas realizadas.
- Las decisiones en las que participó.
- Los aspectos técnicos relacionados con su trabajo.

> La cátedra podrá realizar preguntas dirigidas a cualquier integrante del grupo.

---

# 6. Criterios de evaluación

La nota final de la presentación es sobre **10 puntos**, distribuidos de la siguiente manera:

| Criterio | Aspectos considerados | Puntaje |
|-----------|----------------------|---------|
| Demo funcional | El sistema corre, los flujos principales funcionan, no hay errores críticos. | 3 pts |
| Coherencia con la arquitectura | Lo que se muestra coincide con las decisiones documentadas (ADRs, modelo de datos, APIs). | 3 pts |
| Calidad de la presentación | Claridad, organización y uso del tiempo disponible. | 1.5 pts |
| Profundidad técnica en las respuestas | Justificación de decisiones ante las preguntas del tribunal. | 1.5 pts |
| Participación del equipo | Involucramiento equilibrado de todos los integrantes. | 1 pt |
| **Total** |  | **10 pts** |

---

# 7. Checklist previo a la exposición

## Proyecto

- [ ] El sistema funciona correctamente.
- [ ] Los principales casos de uso pueden demostrarse.
- [ ] Se dispone de datos de prueba adecuados.

## Presentación

- [ ] La presentación respeta el tiempo máximo de 30 minutos.
- [ ] Incluye explicación de arquitectura y diseño con al menos 2 ADRs justificados.
- [ ] Incluye video de demostración embebido.
- [ ] Incluye conclusiones y aprendizajes.
- [ ] El archivo está listo para proyectarse desde una PC externa.

## Equipo

- [ ] Todos los integrantes participaron en la preparación.
- [ ] Todos pueden explicar su contribución.
- [ ] Todos conocen las decisiones principales del proyecto.

---

## Pregunta de autoevaluación

> Si una persona externa al proyecto asistiera únicamente a esta presentación, ¿comprendería qué problema resuelve el sistema, cómo fue diseñado y por qué se tomaron las principales decisiones arquitectónicas?

Ese es el objetivo de esta instancia final.
