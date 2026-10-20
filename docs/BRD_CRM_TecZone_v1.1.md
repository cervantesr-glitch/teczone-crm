# Documento de requisitos de negocio del CRM de TecZone

**Proyecto:** CRM Comercial Especializado B2B, Fase 1  
**Identificador:** BRD-TZ-001  
**Versión:** 1.1  
**Fecha:** 20 de octubre de 2026  
**Estado:** Propuesto para revisión y aprobación por TecZone  
**Propietario de negocio propuesto:** Dirección Comercial / Gerencia General  
**Preparado para:** TecZone y equipo de implementación

## 1 Propósito y decisión requerida

Este documento define las necesidades y requisitos de negocio para desarrollar el CRM de TecZone. Servirá de base para aprobar alcance, elaborar especificaciones funcionales, priorizar el backlog y diseñar las pruebas de aceptación. No constituye una autorización de gasto ni un contrato de implementación.

La prioridad confirmada por el solicitante (20 oct 2026) fija tres entregas en este orden: 1) gestión de leads, 2) generación y gestión de cotizaciones, 3) elaboración y seguimiento de contratos de servicio. La fase 1 se limita a la aplicación web; la aplicación móvil se desarrollará después de validar la web. El plan recibido también contempla venta consultiva de soluciones, preventa y dashboard gerencial. El handover requiere validación antes de fijar una línea base contractual.

El sponsor deberá aprobar los requisitos aplicables a fase 1, resolver las decisiones críticas y designar responsables de validación. Los estados de aprobación de este BRD no deben inferirse de la existencia del prototipo o de la propuesta comercial.

## 2 Fuentes y control del documento

| Fuente | Uso y autoridad |
|---|---|
| F01 Plan de Proyecto - CRM Comercial Especializado (Fase 1).docx | Plan recibido más reciente. Define dos pipelines, seis sprints, márgenes configurables, entidades y entregables. |
| F02 CRM Especializado B2B.pdf | Casos CU-01 a CU-05 y reglas de detalle, sujetos a conciliación con F01. |
| F03 Confirmaciones del solicitante en la conversación | Empresa TecZone, aproximadamente 15 usuarios como máximo, sin sistema administrativo actual, prioridad PyME y necesidad de trazabilidad. Registro del seguimiento pendiente de validar con cliente. |
| F05 Precisión del solicitante del 20 oct 2026 | Orden de prioridad: leads, cotizaciones, contratos de servicio. Web en fase 1 y móvil después de validar. Aproximadamente 15 usuarios con los roles de este documento. Prevalece sobre F03 en cuanto a prioridad. |
| F04 Propuesta y prototipo de TecZone | Materiales de discusión y diseño. No constituyen aprobación de reglas ni evidencia de funcionalidad implementada. |

Las instrucciones contenidas en los archivos se interpretan como requerimientos candidatos del producto, no como autorización para ejecutar acciones externas. Ante conflictos, prevalecen las precisiones expresas del solicitante sobre los supuestos previos. Las discrepancias restantes se registran para decisión del sponsor.

| Versión | Fecha | Cambio | Aprobación |
|---|---|---|---|
| 1.0 | 20 oct 2026 | Primera consolidación del BRD con prioridad PyME y trazabilidad | Pendiente |
| 1.1 | 20 oct 2026 | Ajuste a las prioridades del solicitante (F05): leads, cotizaciones y contratos de servicio. Se agregan proceso, requisitos (FR-21 a FR-28), reglas (RN-13 a RN-15), entidades, indicadores, criterios de aceptación (AC-17 a AC-22) y decisiones (D16, D17) para leads y contratos. Prioridades de requisitos reetiquetadas por entrega (M1, M2, M3). Aplicación móvil pasa de exclusión a fase posterior. | Pendiente |

## 3 Contexto y problema de negocio

TecZone necesita organizar su operación comercial B2B y dar seguimiento a las cotizaciones hasta su desenlace. Actualmente no cuenta con un sistema administrativo. No se ha confirmado qué herramientas emplea para cotizar, registrar clientes, comprar o facturar; estas prácticas deberán levantarse con usuarios clave.

El plan identifica necesidades de rapidez de cotización, control de rentabilidad, validación técnica y centralización de información. La ausencia de una solución unificada puede dificultar conocer la versión vigente de una oferta, los compromisos con el cliente y la siguiente acción. Este riesgo es una motivación del proyecto, no una pérdida económica medida.

No existe todavía una línea base cuantificada de tiempo de cotización, volumen, conversión o adopción. TecZone deberá aportar muestras y mediciones para comparar resultados antes y después de la implementación.

## 4 Objetivos y medición de resultados

| ID | Objetivo | Indicador y meta de referencia | Validación pendiente |
|---|---|---|---|
| OBJ-00 | Capturar y convertir leads | Medir tiempo a primer contacto, porcentaje de leads con responsable y tasa de conversión a oportunidad. Metas por acordar. | Fuentes de leads, criterios de calificación, SLA de primer contacto y definición de conversión. |
| OBJ-01 | Agilizar cotizaciones PyME | Medir porcentaje emitido dentro de 4 horas hábiles. Meta de tiempo del plan, sin porcentaje objetivo aprobado. | Inicio, fin, pausas, calendario y diferencia entre menor a 4 h y máximo 4 h. |
| OBJ-02 | Aplicar control de margen | El 100% de las emisiones debe cumplir la regla de autorización vigente. Objetivo del plan, no promesa de rentabilidad contable. | Fórmula, base de costo, excepciones y tratamiento de cambios. |
| OBJ-03 | Asegurar trazabilidad comercial | Medir cotizaciones activas con responsable, última interacción y próxima acción. Meta porcentual por acordar. | Actividad válida, estados activos, recordatorios y canal de captura. |
| OBJ-04 | Formalizar preventa de soluciones | Propuestas de soluciones con visto bueno técnico verificable. Meta propuesta: 100% de los casos sujetos al control. | Alcance del veto y excepciones. |
| OBJ-05 | Centralizar información y renovaciones | Medir integridad de datos, renovaciones oportunas e indicadores reconciliables. | Campos mínimos, periodos, denominadores y metas. |
| OBJ-06 | Formalizar contratos de servicio | Contratos vigentes con alcance, SLA, vigencia, responsable y evidencia de firma; hitos con seguimiento. Meta por acordar. | Plantillas, estados, evidencia de firma y periodicidad de cobro. |

El sistema facilitará medir y controlar el proceso. El cumplimiento del SLA también depende de costos, respuesta de mayoristas, aprobación interna y disponibilidad de usuarios. Se propone que Dirección mida resultados al cierre del primer periodo operativo acordado, comparando con la línea base que TecZone valide.

## 5 Alcance y límites

### 5.1 Prioridad confirmada de negocio

La fase 1 es una aplicación web y se entregará en tres incrementos en el orden confirmado por el solicitante (F05):

1. **Entrega 1, gestión de leads:** captura, deduplicación, asignación, calificación, seguimiento con actividades y próxima acción, descalificación con motivo y conversión a cuenta, contacto y oportunidad. Incluye usuarios, roles y cuentas/contactos básicos.
2. **Entrega 2, generación y gestión de cotizaciones:** oportunidad PyME, catálogo, costeo, control de margen y aprobaciones, cotización PDF, versiones y trazabilidad con el cliente hasta su desenlace.
3. **Entrega 3, elaboración y seguimiento de contratos de servicio:** contratos y pólizas de servicio con alcance, SLA, vigencia, importes iniciales y recurrentes, documento PDF, evidencia de firma, hitos y renovaciones a 60 y 30 días.

La capacidad inicial prevista es de aproximadamente 15 usuarios registrados; la concurrencia no está definida. La aplicación móvil se desarrollará en una fase posterior, una vez validada la web, y consumirá los mismos servicios.

### 5.2 Alcance contemplado en el plan

El plan incluye pipelines PyME y Soluciones, base instalada, comité de compras, preventa y dashboard gerencial. Estos componentes se mantienen como alcance candidato de fase 1, posterior a las tres entregas prioritarias. Las renovaciones a 60 y 30 días pasan a la entrega 3 junto con los contratos de servicio. La prioridad no implica que TecZone haya autorizado excluir los demás módulos ni que todos deban estar listos en la primera entrega.

### 5.3 Alcance condicionado

El handover automático aparece como propuesta para fase siguiente en el alcance de F01, pero se programa en sus semanas 9 y 10. Se requiere decidir su inclusión. La integración de correo o WhatsApp para seguimiento, la exportación a administración y los mecanismos de notificación necesitan definición de canal, destino y costo.

### 5.4 Exclusiones propuestas

- Licitaciones y ventas a gobierno B2G, excluidas expresamente por el plan.
- Facturación electrónica con timbrado, contabilidad, compras e inventario completos y operación de almacén. El CRM puede originar una entrega de información, sin convertirse por ello en ERP.
- Integraciones bidireccionales de inventario en tiempo real y sincronización con mayoristas o fabricantes.
- Envío o lectura automática de correo/WhatsApp, salvo alcance de integración aprobado.
- Aplicación móvil dentro de fase 1. Queda para una fase posterior a la validación de la web (F05), no excluida del proyecto.
- Automatización avanzada de marketing y migración histórica sin volumen acordado.

Las exclusiones adicionales a B2G consolidan límites de documentos previos y de la propuesta. Requieren confirmación al aprobar el BRD. No se presupone un sistema administrativo destino porque TecZone confirmó que actualmente no tiene ninguno.

## 6 Actores y gobierno de decisiones

| Actor | Necesidad y responsabilidad de negocio | Participación requerida |
|---|---|---|
| Sponsor / Dirección | Aprobar objetivos, alcance, prioridades y excepciones de política | Aprobación del BRD y aceptación de negocio |
| Gerente Comercial | Autorizar márgenes, supervisar seguimiento y resolver escalamiento | Validar reglas y pruebas de aprobación |
| Ejecutivo PyME | Registrar y calificar leads, cotizar, negociar, registrar actividad y programar siguiente acción | Validar flujos de leads y cotización y plantilla PDF |
| Ejecutivo Tech | Registrar y calificar leads, calificar oportunidad y coordinar preventa | Validar flujo de leads y pipeline de Soluciones |
| Ingeniero de Preventa | Documentar discovery y viabilidad, emitir visto bueno | Definir criterios técnicos y evidencias |
| Customer Success / Ejecutivo de cuenta | Elaborar y dar seguimiento a contratos de servicio, licencias y pólizas | Validar plantilla de contrato, hitos y ventanas de renovación |
| Compras / Operaciones | Recibir información necesaria para pedido o kickoff | Validar contenido de entrega, si se incluye |
| Administrador del CRM | Gestionar usuarios, roles, catálogos y reglas permitidas | Validar permisos y mantenimiento de configuración |
| Equipo de implementación | Traducir requisitos aprobados a solución y pruebas | Diseño, construcción, demostraciones y correcciones |
| Cliente final | Recibir y responder cotizaciones | Participante externo sin portal ni acceso previsto en fase 1 |

Los nombres de responsables, distribución de los 15 usuarios y suplencias están pendientes. Un actor puede corresponder a varias personas o una persona puede desempeñar varios roles, sujeto a segregación de aprobaciones.

## 7 Proceso de negocio propuesto

### 7.1 Gestión de leads

1. Registrar el lead con fuente, fecha de recepción, empresa, contacto, necesidad, interés (PyME, Soluciones o por definir) y responsable. El sistema advierte coincidencias con leads y cuentas existentes.
2. Asignar responsable de forma manual o por la regla que se apruebe. Inicia el reloj de primer contacto.
3. Registrar el primer contacto y cada interacción con fecha, canal y resultado. Mantener una próxima acción con responsable y fecha mientras el lead esté activo.
4. Calificar el lead con los criterios mínimos acordados (BANT u otros) y registrar productos o servicios de interés.
5. Descalificar con motivo y notas cuando no proceda. Un lead descalificado puede reactivarse con registro del cambio.
6. Convertir el lead calificado: crear o vincular cuenta y contacto, y crear la oportunidad en el pipeline que corresponda, conservando el lead y su historial como consulta.

### 7.2 Cotización PyME y seguimiento

1. Registrar cuenta, contacto, solicitud, responsable y fecha de recepción.
2. Crear oportunidad PyME y seleccionar productos o registrar SKU autorizado con costo mayorista.
3. Capturar cantidad, costo, precio, moneda, TC y condiciones. Evaluar margen y aprobación.
4. Emitir una versión identificable de cotización PDF, con vigencia y términos aprobados.
5. Registrar envío al contacto y conservar referencia o evidencia. Un envío manual no acredita recepción ni lectura.
6. Registrar respuesta, objeciones y acuerdos. Asignar siguiente acción, responsable y fecha.
7. Si cambian condiciones, crear nueva versión y aplicar la revalidación que establezca la política. Conservar lo enviado previamente.
8. Registrar aceptación, rechazo o vencimiento. Vincular aceptación a versión y evidencia. Distinguir aceptación de cierre ganado.
9. Al ganar o perder, cumplir los datos obligatorios. Entregar a compras si el handover queda incluido.

### 7.3 Contratos de servicio y renovaciones

1. Elaborar el contrato desde una cotización aceptada o una oportunidad ganada, o de forma directa para clientes existentes, con cuenta, contacto, alcance o SOW, SLA, vigencia, importes iniciales y recurrentes, periodicidad de cobro y responsable.
2. Generar el documento PDF desde la plantilla aprobada. Cada cambio antes de la firma crea una nueva versión sin sobrescribir lo emitido.
3. Registrar envío, revisión y firma con fecha, firmante y evidencia. La firma activa el contrato en la fecha de inicio pactada.
4. Dar seguimiento al contrato vigente: hitos o entregables con responsable y fecha, actividades con el cliente e incidencias de SLA registradas manualmente.
5. Los cambios a un contrato firmado se registran como adenda o nueva versión vinculada.

Para contratos, licencias o pólizas con vencimiento, el sistema creará seguimiento preventivo a 60 días y alerta con borrador de renovación a 30 días, conforme al alcance aprobado. El escalamiento a 10 días sin respuesta aparece en F02 y requiere confirmación con F01 y TecZone.

### 7.4 Venta consultiva

Soluciones seguirá Calificación, Discovery Técnico, Demo o PoC, Propuesta Formal y SOW, Negociación y SLA y Cierre Ganado. Preventa documentará viabilidad y autorizará el avance sujeto a la regla acordada. Las propuestas separarán implementación y costos recurrentes.

### 7.5 Estados y excepciones

Se propone para leads: Nuevo, Contactado, En calificación, Calificado, Descalificado y Convertido. Un lead convertido no vuelve a estados anteriores. Para contratos de servicio: Borrador, En revisión, Enviado, Firmado, Vigente, Por vencer, Vencido, Renovado y Cancelado.

Se propone para cotizaciones: Borrador, Pendiente de aprobación, Autorizada, Enviada, En negociación, Aceptada, Rechazada, Vencida y Sustituida. La configuración final deberá definir transiciones válidas, actor y campos obligatorios. “Sin respuesta” se propone como condición de seguimiento, no como pérdida automática.

La oportunidad y la cotización conservan estados independientes. Debe resolverse si una oportunidad admite varias cotizaciones activas, cómo tratar aceptación parcial, reapertura y cancelación, y qué evidencia convierte la aceptación en cierre ganado. La transición inválida deberá explicar el requisito faltante sin alterar el estado previo.

## 8 Requisitos de negocio y funcionales

**Prioridades:** M1 = indispensable para la entrega 1 (leads), M2 = indispensable para la entrega 2 (cotizaciones), M3 = indispensable para la entrega 3 (contratos de servicio), S = alcance del plan posterior a las tres entregas prioritarias, C = condicionado a decisión. La prioridad no expresa aprobación. **Estado:** confirmado = necesidad expresada por el solicitante; plan = requisito de fuente por validar; propuesto = detalle operativo pendiente de acuerdo.

| ID | Requisito verificable | Prioridad y estado | Fuente y objetivo |
|---|---|---|---|
| BR-01 | Centralizar la operación comercial y entregar en este orden: gestión de leads, cotizaciones con trazabilidad hasta desenlace y contratos de servicio con seguimiento. | M1, M2, M3 / confirmado | F05 / OBJ-00,01,03,06 |
| BR-02 | Aplicar reglas configurables de margen y conservar quién autorizó cada excepción permitida. | M2 / plan | F01 / OBJ-02 |
| BR-03 | Mantener visibilidad de leads, oportunidades, seguimiento y motivos de descalificación y pérdida para supervisión. | M1 / plan y F05 | F01,F03 / OBJ-03,05 |
| BR-04 | Formalizar contratos de servicio y renovaciones (entrega 3) y preventa (posterior) en la secuencia de alcance aprobada. | M3 contratos y renovaciones, S preventa / plan y F05 | F01, F05 / OBJ-04,05,06 |
| FR-01 | Crear y consultar cuentas y contactos con responsable; identificar contactos por rol decisor y registrar base instalada. Campos fiscales obligatorios por definir. | M1 básicos, S comité y base / plan | CU-03 / OBJ-05 |
| FR-02 | Gestionar oportunidades PyME por etapas de Solicitud, Costeo y Margen, Cotización Enviada, Negociación y Cierre Ganado, conservando cambios de etapa y responsable. | M1 creación por conversión, M2 etapas / plan | CU-01 / OBJ-01,03 |
| FR-03 | Administrar catálogo HW, SW y servicios, SKU, código de mayorista, unidad y costo; controlar permiso para altas fuera de catálogo. | M2 / plan | CU-01 / OBJ-01,02 |
| FR-04 | Capturar partidas, cantidades, costo, precio, USD/MXN y TC con fecha y fuente, y calcular totales y margen según política aprobada. | M2 / plan | CU-01 / OBJ-02 |
| FR-05 | Impedir emisión no autorizada según regla de margen. Registrar solicitud, decisión, autorizador, fecha y motivo de rechazo o aprobación. | M2 / plan | CU-01 / OBJ-02 |
| FR-06 | Generar PDF desde una versión de cotización con identificación, destinatario, partidas, moneda, vigencia, TC y términos aprobados. | M2 / plan | CU-01 / OBJ-01 |
| FR-07 | Conservar versiones emitidas, motivo de cambio, condiciones y aprobación asociada. Identificar versión vigente y sustituida sin sobrescribir lo emitido. | M2 / propuesto | F01 quotes, F03 / OBJ-03 |
| FR-08 | Presentar historial por cotización con contacto, fecha del evento, fecha de captura, autor, canal, respuesta, acuerdos y referencias de evidencia. | M2 / necesidad confirmada, detalle propuesto | F03, CU-03 / OBJ-03 |
| FR-09 | Registrar próxima acción obligatoria con responsable y vencimiento mientras la cotización esté activa; mostrar pendientes y vencidos según estados acordados. | M2 / plan y propuesto | F01 activities, F03 / OBJ-03 |
| FR-10 | Registrar aceptación con contacto, fecha, versión y evidencia; exigir motivo y notas al cerrar como perdida una oportunidad. | M2 / propuesto y plan | CU-01,05 / OBJ-03,05 |
| FR-11 | Medir tiempo hábil de cotización desde los eventos acordados, exponer cumplimiento y alertas de inactividad con destinatario y regla definidos. | M2 / plan | CU-01,03,05 / OBJ-01,03 |
| FR-12 | Registrar pipeline Tech, BANT, ingeniero, alcance, stack, viabilidad y visto bueno; impedir avance a propuesta sin validación requerida. | S / plan | CU-02 / OBJ-04 |
| FR-13 | Separar importes de implementación y cargos recurrentes, sin mezclarlos sin horizonte temporal definido. | M3 contratos, S propuestas Tech / plan | CU-02 / OBJ-04,05 |
| FR-14 | Advertir comité incompleto después de Demo y relacionar interacciones con contacto y oportunidad. | S / plan | CU-03 / OBJ-03 |
| FR-15 | Registrar licencias/pólizas con vencimiento y responsable; crear tarea a 60 días y alerta con borrador a 30, evitando duplicados por evento. | M3 / plan y propuesto | CU-04, F01 / OBJ-05 |
| FR-16 | Mostrar indicadores segmentados por línea, periodo y filtros acordados; conservar motivos de pérdida. Definir salida mensual si se aprueba. | M1 básico leads, M2 básico PyME, S dual / plan | CU-05 / OBJ-05 |
| FR-17 | Administrar usuarios y roles y restringir acceso a costos, autorizaciones, reglas y exportaciones de acuerdo con matriz aprobada. | M1 / plan | F01 / OBJ-02,05 |
| FR-18 | Registrar deal registration con fabricante vinculado a la cotización sin presumir consulta automática de sus portales. | S / plan | F01 quotes / OBJ-03 |
| FR-19 | Crear aviso a compras con versión y condiciones pactadas, o tarea con Kickoff Brief al ganar, únicamente si se incluye handover en fase 1. | C / conflicto de fuente | CU-01,02, F01 / OBJ-03,04 |
| FR-20 | Importar una carga inicial validada y ofrecer reporte de filas aceptadas y rechazadas, sin duplicar datos por reintento. Volumen y formatos por acordar. | M1 carga de leads y cuentas acordada / plan y propuesto | F01 sprint 6 / OBJ-05 |
| FR-21 | Registrar leads con fuente, fecha de recepción, empresa, contacto, necesidad, interés (PyME, Soluciones o por definir) y responsable; advertir duplicados contra leads y cuentas antes de guardar. | M1 / confirmado, detalle propuesto | F05 / OBJ-00 |
| FR-22 | Gestionar estados del lead con historial de cambios, actividades y próxima acción obligatoria con responsable y vencimiento mientras esté activo. | M1 / propuesto | F05 / OBJ-00,03 |
| FR-23 | Calificar el lead con criterios mínimos acordados y registrar productos o servicios de interés; exigir motivo y notas al descalificar. | M1 / propuesto | F05 / OBJ-00 |
| FR-24 | Asignar y reasignar leads de forma manual o por regla aprobada; medir tiempo a primer contacto y alertar según el SLA acordado. | M1 / propuesto | F05 / OBJ-00 |
| FR-25 | Convertir un lead calificado en cuenta, contacto y oportunidad en una sola operación, vinculando cuentas existentes sin duplicarlas y conservando el lead como historial de solo consulta. | M1 / propuesto | F05 / OBJ-00,05 |
| FR-26 | Elaborar contratos de servicio desde cotización aceptada, oportunidad ganada o de forma directa, con alcance o SOW, SLA, vigencia, importes iniciales y recurrentes, periodicidad de cobro y responsable; generar PDF desde plantilla aprobada con versiones. | M3 / confirmado, detalle propuesto | F05 / OBJ-06 |
| FR-27 | Gestionar estados del contrato y registrar envío, firma, firmante y evidencia; registrar adendas como versiones vinculadas sin alterar lo firmado. | M3 / propuesto | F05 / OBJ-06 |
| FR-28 | Dar seguimiento a contratos vigentes con hitos o entregables, responsable y fecha, actividades e incidencias de SLA registradas manualmente; mostrar pendientes y vencidos. | M3 / propuesto | F05 / OBJ-03,06 |

## 9 Reglas de negocio candidatas

| ID | Regla y precisión | Estado y decisión |
|---|---|---|
| RN-01 | Propuesta de margen bruto = (venta − costo) / venta × 100, sin impuestos. Precio nulo o no positivo impide emisión. | Fórmula, costo completo, descuentos y nivel partida/total: D02. |
| RN-02 | >=15% permite emitir; >=8% y <15% requiere gerente; <8% bloquea vendedor. Umbrales configurables. | Cierra el hueco entre 14.9 y 15 del texto. Precisión y excepciones: D02. |
| RN-03 | Cambiar precio, costo, descuento, TC o partidas debe reevaluar margen y aprobación. Conservar aprobación histórica de la versión previa. | Propuesta de control. Campos que invalidan aprobación: D03. |
| RN-04 | Meta de 4 horas hábiles y vigencia comercial de referencia de 5 días hábiles. | F01 menciona también 3 a 5 días como ejemplo. Calendario, reloj y vigencia: D04. |
| RN-05 | Cada cotización activa tendrá propietario y próxima acción con fecha. No perder automáticamente una cotización por falta de respuesta. | Obligación de próxima acción en F01. Estados activos y excepciones: D05. |
| RN-06 | Conservar contenido emitido por versión y evidencia de aceptación. Registrar correcciones posteriores como nuevos eventos trazables. | Modelo de versión, archivos y retención: D06. |
| RN-07 | En negociación, más de 5 días hábiles sin actividad genera alerta al ejecutivo y gerente. Comité incompleto genera advertencia, no bloqueo. | F02. Umbral, actividad válida y repeticiones: D07. |
| RN-08 | Propuesta de Soluciones requiere ingeniero asignado y visto bueno técnico. | BANT completo o mínimo, veto, delegación y revalidación: D08. |
| RN-09 | Renovación a 60/30 días; escalamiento a 10 días sin respuesta solo si se confirma. | Días naturales/hábiles, estados y repetición: D09. |
| RN-10 | Cierre perdido exige motivo y notas; aceptación comercial no equivale por sí sola a cierre ganado. | Catálogos, OC, contrato o anticipo necesarios: D10. |
| RN-11 | Cada decisión de aprobación deberá identificar actor autorizado. Evitar autoaprobación del vendedor salvo excepción expresamente autorizada. | Segregación y suplencias propuestas: D11. |
| RN-12 | Cada evento automático deberá evitar avisos/tareas duplicados por reintento y registrar resultado. | Aplica a renovaciones, alertas y handover aprobado. Canales: D12. |
| RN-13 | Un lead descalificado exige motivo y notas; un lead convertido queda de solo consulta y no regresa a estados previos. La conversión no duplica cuentas existentes. | Propuesto. Catálogo de motivos y criterios de duplicado: D16. |
| RN-14 | El primer contacto de un lead deberá registrarse dentro del SLA acordado. Propuesta: 4 horas hábiles para interés PyME y 1 día hábil para Soluciones. | Propuesto. Calendario, umbrales y escalamiento: D16. |
| RN-15 | Un contrato firmado no se modifica: los cambios se registran como adenda o nueva versión vinculada, con evidencia y autorizador. | Propuesto. Plantillas, firma y autorizaciones: D17. |

## 10 Información de negocio y calidad de datos

| Entidad | Información mínima candidata | Relación y control |
|---|---|---|
| Lead | Folio, fuente, fecha de recepción, empresa, contacto, necesidad, interés, responsable, estado, calificación, motivo de descalificación y referencia de conversión | Sin cuenta hasta convertirse. Detectar duplicados contra leads y cuentas. Conservar historial de estados. |
| Cuenta y contacto | Identificador, nombre, responsable, datos de contacto y rol | Cuenta con varios contactos. Detectar duplicados; datos fiscales mínimos por acordar. |
| Oportunidad | Cuenta, pipeline, etapa, responsable, valor, probabilidad, fechas y pérdida | Puede contener varias cotizaciones según decisión D06. Conservar historial de etapas. |
| Producto y partida | SKU, tipo, unidad, mayorista, cantidad, costo, precio y moneda | Validar rangos y permiso de edición. Copiar valores a versión emitida, no depender de cambios del catálogo. |
| Cotización y versión | Folio, oportunidad, versión, partidas, totales, margen, TC, vigencia, estado y aprobación | Mantener versión emitida y aceptación vinculada. Folios únicos. |
| Actividad y tarea | Entidad vinculada, contacto, evento, captura, autor, canal, resultado y próxima acción | Distinguir histórico de interacción y tarea futura. Seguimiento por cotización además de oportunidad. |
| Evidencia | Tipo, referencia/archivo, versión asociada, autor y fecha | Permisos, tamaño, formatos y retención por definir; evitar enlaces sin acceso al destinatario interno. |
| Activo o licencia | Cuenta, producto, cantidad, fechas, responsable y renovación | Vincular renovación a activo y evento para evitar duplicados. |
| Contrato de servicio | Folio, cuenta, contacto, cotización u oportunidad de origen, alcance/SOW, SLA, vigencia, importes iniciales y recurrentes, periodicidad, responsable, estado, versión, firma y evidencia | Versiones y adendas sin sobrescribir lo firmado. Hitos y renovaciones vinculados. |
| Validación técnica | Ingeniero, BANT, alcance, viabilidad, evidencia y visto bueno | Vincular a versión de alcance/propuesta cuando corresponda. |
| Auditoría | Actor, fecha, entidad, evento, valores relevantes y resultado | Incluir cambios de configuración, estado, costos y permisos. Acceso restringido. |

La carga inicial dependerá de archivos proporcionados por TecZone. Se acordarán plantillas, volumen, criterios de deduplicación y conciliación. Datos incompletos deberán generar observaciones antes de migrarse, sin completar información ficticia. El prototipo no es fuente de datos reales para producción.

## 11 Requisitos no funcionales de negocio

Los siguientes controles son requisitos propuestos. Las metas numéricas no documentadas deberán aprobarse antes de comprometer niveles de servicio.

| ID | Requisito | Forma de validación |
|---|---|---|
| NFR-01 | Acceso autenticado por roles y principio de mínimo privilegio, con baja de usuarios y restricción de costos/aprobaciones. | Pruebas positivas y negativas por rol y estado de usuario. |
| NFR-02 | Historial auditable de emisión, cambios y autorizaciones, con fechas consistentes y correcciones rastreables. | Reconstruir un caso sin depender de memoria del vendedor. |
| NFR-03 | Acceso seguro en tránsito y protección de datos almacenados y respaldos según política que apruebe TecZone. | Revisión de configuración y evidencias del entorno elegido. |
| NFR-04 | Soportar aproximadamente 15 usuarios registrados y la concurrencia/volumen acordados. | Prueba de carga con número de sesiones, partidas y archivos aprobados en D13. |
| NFR-05 | Operación web en español, con importes/fechas consistentes, navegación por teclado, etiquetas de campos y errores legibles. | Pruebas con vendedores y navegadores acordados. Dispositivos por confirmar. |
| NFR-06 | Definir respaldo, restauración, retención, disponibilidad y objetivos de pérdida/recuperación de datos. | Prueba de restauración y aceptación de RPO/RTO en D14. |
| NFR-07 | Preservar integridad ante cambios simultáneos y fallos de emisión; evitar versiones, autorizaciones o tareas duplicadas. | Casos concurrentes y reintentos controlados. |
| NFR-08 | Permitir mantenimiento de reglas por usuarios autorizados, con vigencia e historial de configuración. | Cambio controlado sin modificar evidencia histórica de cotizaciones. |

El BRD no fija aún tiempo de respuesta, disponibilidad porcentual, tamaño de adjuntos ni capacidad histórica. Estos valores serán criterios de salida del diseño, no metas que el equipo pueda decidir unilateralmente.

## 12 Indicadores y reportes

| Indicador | Definición propuesta | Pendiente |
|---|---|---|
| Conversión de leads | Leads convertidos / leads cerrados (convertidos + descalificados) del periodo ×100 | Fecha de referencia, fuentes y tratamiento de reactivados. |
| Primer contacto | Leads con primer contacto dentro del SLA / leads elegibles ×100 | Calendario, reloj y SLA por tipo de interés. |
| Cumplimiento SLA | Cotizaciones elegibles dentro del límite / cotizaciones elegibles emitidas ×100 | Tratamiento de pendientes vencidas, pausas, reloj y fecha del periodo. |
| Pipeline ponderado | Suma de valor elegible × probabilidad de oportunidad | Moneda de reporte, TC y probabilidad por etapa o manual. |
| Tasa de cierre | Ganadas / (ganadas + perdidas) ×100 del periodo | Fecha de cierre y tratamiento de reabiertas/canceladas. |
| Ciclo comercial | Tiempo entre inicio y cierre para universo acordado | Naturales/hábiles, promedio/mediana y definición de velocidad. |
| Seguimiento completo | Cotizaciones activas con responsable y siguiente acción vigente / activas ×100 | Estados activos, acciones vencidas y tolerancia. |
| Renovación oportuna | Renovaciones completadas en plazo / renovaciones elegibles ×100 | Por contrato, importe o licencia; cancelaciones y parcialidad. |
| Contratos vigentes | Número e importe recurrente de contratos vigentes por periodo, con hitos vencidos | Moneda, horizonte y tratamiento de adendas. |
| Margen comercial | (Importe de venta − costo cotizado) / importe de venta ×100 | Ponderación y costos. No representa margen realizado sin costos finales. |

Cada reporte deberá mostrar periodo, filtros, moneda y fecha de actualización. La salida mensual y el acceso por rol deberán aprobarse. No se sumarán importes de monedas distintas ni cargos recurrentes e iniciales sin conversión y horizonte definidos.

## 13 Integraciones y fronteras operativas

No existe ERP destino confirmado. Cualquier salida a administración deberá identificar receptor, formato, campos, frecuencia y validación. Un aviso a compras no representa inventario reservado, pedido efectuado ni despacho confirmado.

El mecanismo de captura de seguimiento es D05. Registrar manualmente envío, respuesta y evidencia es una opción propuesta, no una decisión aprobada. Si TecZone elige correo o WhatsApp, se deberá acordar proveedor, permisos, costos, alcance de sincronización, fallos, duplicados y conservación de evidencia. No habrá envío real a clientes implícito en aprobar una pantalla.

Las alertas requieren destinatario, canal, calendario, política de repetición y tratamiento de errores. La consulta automática de TC, inventario o precios de mayoristas no está confirmada. El catálogo y TC podrán capturarse por mecanismos aprobados sin presumir integración.

## 14 Criterios de aceptación y trazabilidad

Cada escenario deberá ejecutarse con datos de prueba aprobados y evidencia de resultado. Las pruebas no convierten políticas propuestas en políticas aprobadas. Los valores de margen siguientes aplican únicamente si se ratifica RN-02.

| ID | Escenario y resultado esperado | Requisitos y caso de uso |
|---|---|---|
| AC-01 | Con cuenta y SKU válidos, crear solicitud PyME, asignar responsable y consultar su avance por etapas con fechas. | FR-01,02; CU-01 |
| AC-02 | Evaluar 7.99%, 8%, 14.95% y 15%: bloqueo, aprobación, aprobación e inmediato respectivamente. Precio cero no permite emitir. | FR-04,05; RN-01,02; CU-01 |
| AC-03 | Rechazar y aprobar por rol autorizado; modificar precio después de aprobación y reevaluar según regla. Un vendedor sin permiso no se autoaprueba. | FR-05,17; RN-03,11; CU-01 |
| AC-04 | Emitir PDF y crear nueva versión por cambio de condiciones. Consultar ambas y reconocer la enviada y la vigente. | FR-06,07; RN-06; CU-01 |
| AC-05 | Registrar interacción con contacto, fecha, resultado y siguiente acción. Impedir completar un seguimiento activo sin campos obligatorios y mostrar pendientes. | FR-08,09; RN-05; CU-03 ampliado por F03 |
| AC-06 | Registrar aceptación de una versión con evidencia y contacto. Impedir cierre perdido sin motivo y notas; aplicar condiciones de ganado aprobadas. | FR-10; RN-10; CU-01,05 |
| AC-07 | Probar solicitud fuera de horario, pausa y límite de SLA con calendario aprobado. Disparar inactividad solo para estado y umbral acordados. | FR-11; RN-04,07; CU-01,03 |
| AC-08 | Intentar avanzar a propuesta Tech sin ingeniero o visto bueno y bloquear. Autorizar con evidencia y separar importes iniciales/recurrentes. | FR-12,13; RN-08; CU-02 |
| AC-09 | Tras Demo, faltar contacto económico o técnico genera advertencia visible; conservar actividad vinculada a contacto y oportunidad. | FR-01,14; CU-03 |
| AC-10 | Simular vencimientos 60/30 días y verificar tarea/alerta/borrador una sola vez por evento. Renovación cerrada deja de seguir regla activa. | FR-15; RN-09,12; CU-04 |
| AC-11 | Recalcular indicadores con conjunto conocido y conciliar periodo, filtros, moneda y motivos de pérdida. | FR-16; CU-05 |
| AC-12 | Usuario no autorizado no consulta costos restringidos ni cambia políticas. Auditar cambios permitidos y baja de usuario. | FR-17; NFR-01,02 |
| AC-13 | Cargar archivo acordado con duplicados/errores, informar resultados y conciliar totales; reintento no duplica filas aceptadas. | FR-20; NFR-07 |
| AC-14 | Si se incluye handover, ganar origina un aviso/tarea con versión pactada y evidencia del evento sin duplicados por reintento. | FR-19; RN-12; CU-01,02 |
| AC-15 | Registrar y consultar deal registration del fabricante en la cotización sin asumir una integración externa. | FR-18; F01 |
| AC-16 | Ejecutar pruebas de concurrencia, recuperación y usabilidad con metas aprobadas, sin pérdida de evidencia de emisión. | NFR-03 a NFR-08 |
| AC-17 | Registrar un lead con datos de una cuenta existente y recibir advertencia de duplicado; registrar un lead nuevo con fuente y responsable. | FR-21 |
| AC-18 | Avanzar un lead por sus estados con actividad y próxima acción; impedir descalificar sin motivo y notas. | FR-22,23; RN-13 |
| AC-19 | Crear un lead fuera de horario y verificar el vencimiento del SLA de primer contacto y la alerta al responsable y gerente según la regla aprobada. | FR-24; RN-14 |
| AC-20 | Convertir un lead calificado: se crea la oportunidad, se vincula la cuenta existente sin duplicarla y el lead queda de solo consulta. | FR-25; RN-13 |
| AC-21 | Elaborar un contrato desde una cotización aceptada, emitir PDF, crear nueva versión antes de firma y registrar firma con evidencia. | FR-26,27 |
| AC-22 | Intentar editar un contrato firmado y obtener una adenda vinculada; registrar hitos y verificar pendientes, vencidos y alertas 60/30 sin duplicados. | FR-27,28,15; RN-15 |

La aceptación funcional corresponde a usuarios clave y responsables de cada dominio. El sponsor aprobará el cierre de negocio. Como criterio de salida propuesto, no deberán existir defectos críticos abiertos que impidan cotizar, autorizar o conservar trazabilidad. Los defectos restantes requerirán clasificación, responsable y fecha aceptados; la severidad y plazo de revisión se acordarán previamente.

## 15 Decisiones abiertas y responsables propuestos

Las decisiones son previas al diseño de la función afectada. No cerrar una decisión impide comprometer esa parte del alcance, pero no impide avanzar en tareas independientes.

| ID | Decisión | Responsable propuesto | Momento límite |
|---|---|---|---|
| D01 | Confirmar ambos pipelines y handover en fase 1. Prioridad de entregas resuelta por F05 (leads, cotizaciones, contratos), pendiente de ratificar por el sponsor. | Sponsor | Antes de línea base y precio |
| D02 | Fórmula y umbrales, costos, redondeo, margen global/partida y excepciones <8% | Gerente y responsable financiero | Antes de construir CPQ |
| D03 | Qué cambios invalidan aprobación y quién sustituye al autorizador | Gerente | Antes de construir aprobaciones |
| D04 | Calendario, zona horaria, SLA, pausas, vigencia y TC | Comercial y administración | Antes de diseñar relojes y PDF |
| D05 | Registro manual o integración de seguimiento, campos, estados activos y próxima acción | Ventas y gerente | Antes de diseñar trazabilidad |
| D06 | Versiones, múltiples cotizaciones, aceptación parcial, evidencia y retención | Ventas y administración | Antes de definir estados y datos |
| D07 | Inactividad, comité, repetición y escalamiento | Gerente | Antes de automatizar alertas |
| D08 | BANT mínimo, veto preventa, evidencia y revalidación de alcance | Preventa y sponsor | Antes de pipeline Tech |
| D09 | Renovación 60/30/10, días naturales/hábiles, parcialidad y cancelación | Customer Success | Antes de renovaciones |
| D10 | Condiciones de ganado, OC/contrato/anticipo, motivos y reapertura | Comercial y compras | Antes de cierres |
| D11 | Distribución de usuarios, matriz de permisos, costos y autoaprobación | Sponsor y administrador | Antes de acceso productivo |
| D12 | Canales de aviso, destinatarios y handover o salida administrativa | Operaciones y TI | Antes de integrar/automatizar |
| D13 | Volumen, concurrencia, navegadores, dispositivos, rendimiento y carga inicial | TI y usuarios clave | Antes de diseño y plan de pruebas |
| D14 | Alojamiento, respaldo, RPO/RTO, retención, privacidad y soporte | Sponsor y TI | Antes de despliegue |
| D15 | Fórmulas de indicadores, periodos, moneda y metas de éxito | Dirección | Antes de dashboard |
| D16 | Fuentes de leads, criterios mínimos de calificación, SLA de primer contacto, regla de asignación, motivos de descalificación y criterios de duplicado | Gerente y ventas | Antes de construir la entrega 1 |
| D17 | Plantillas de contrato, estados, evidencia de firma, autorizadores, periodicidad de cobro, hitos y relación con renovaciones | Customer Success, comercial y administración | Antes de construir la entrega 3 |

Para cerrar estas decisiones se solicitarán cotizaciones y sus revisiones anonimizadas, historial de negociación, catálogo, ejemplo de autorización, formatos de compra, licencia/póliza y reporte comercial utilizado. No se requieren credenciales para el levantamiento.

## 16 Supuestos dependencias y riesgos

### 16.1 Supuestos de planeación

El horizonte del plan es de 12 semanas en seis sprints de dos semanas, que deberán reordenarse según las tres entregas prioritarias. No es una fecha de entrega garantizada. Depende de alcance aprobado, equipo disponible, datos, acceso a infraestructura y tiempos de validación del cliente. El BRD no convierte el stack del plan en una restricción de negocio: la selección técnica definitiva pertenece al diseño de solución.

Se supone participación de usuarios clave y sponsor en demostraciones. Se supone que TecZone proporcionará datos y plantillas con derecho de uso y aprobará reglas comerciales. No se supone disponibilidad de un ERP, portal de mayoristas ni integración de mensajería.

| Riesgo | Consecuencia | Mitigación propuesta y responsable |
|---|---|---|
| Alcance ambiguo de handover y doble pipeline | Retrabajo, costo y plazo inciertos | Cerrar D01 con sponsor antes de compromiso. |
| Bajo registro de actividades | Historial incompleto y métricas sesgadas | Formularios breves, próxima acción útil y validación con vendedores. Gerente. |
| Costos/TC desactualizados | Cotizar con margen o vigencia incorrectos | Fijar datos por versión, fecha/fuente y revalidación. Compras/finanzas. |
| Ausencia de destino administrativo | Aceptación comercial sin continuidad operativa clara | Definir receptor y formato de entrega. Operaciones. |
| Datos iniciales deficientes | Duplicados y asignaciones erróneas | Muestra, depuración y conciliación antes de carga. TecZone. |
| Integración de seguimiento no decidida | Diseño y licencias no estimables | Elegir captura y canales antes de construir FR-08/09. Sponsor. |
| Validaciones tardías | Retraso de sprints y criterios cambiantes | Responsables y agenda de revisión acordados. Sponsor y equipo. |

## 17 Entrega validación y gestión de cambios

Se propone validar por incrementos en el orden confirmado: requisitos y permisos con cuentas y contactos básicos; gestión de leads; cotizaciones con CPQ, PDF y trazabilidad; contratos de servicio y renovaciones; pipeline de Soluciones, preventa y alertas/handover aprobado; y finalmente analítica/UAT. La planificación detallada deberá asegurar que la trazabilidad forme parte de cada entrega y no se difiera al final.

Los entregables de negocio serán el BRD aprobado, catálogo de reglas, matriz de permisos, plantilla de cotización, diccionario de datos y escenarios UAT. La solución deberá acompañarse de carga inicial acordada, capacitación y documentación de operación. Código, titularidad, soporte y precio pertenecen a la formalización comercial.

Cada cambio deberá identificar requisito afectado, justificación, prioridad, impacto en costo/plazo/datos/pruebas y aprobador. El equipo no implementará cambios de alcance sin decisión registrada. Corregir incumplimiento de un requisito aprobado es defecto; modificar el requisito es cambio. No se presumirá aceptación por silencio.

## 18 Aprobación del BRD

La aprobación deberá identificar versión exacta, requisitos incluidos/excluidos y decisiones diferidas con su efecto. Para establecer línea base, D01, D02, D04, D05, D11 y D16 deben resolverse, junto con cualquier otra decisión que afecte el alcance comprometido. Las demás podrán cerrarse antes de la construcción de su módulo, con responsable y fecha explícitos.

| Rol aprobador | Nombre | Decisión | Fecha y referencia |
|---|---|---|---|
| Sponsor / Dirección | Por designar | Pendiente | Pendiente |
| Gerente Comercial | Por designar | Pendiente | Pendiente |
| Representante de ventas PyME | Por designar | Pendiente | Pendiente |
| Customer Success para contratos de servicio | Por designar | Pendiente | Pendiente |
| Preventa y operaciones para alcance aplicable | Por designar | Pendiente | Pendiente |
| Líder de implementación | Por designar | Revisión de viabilidad pendiente | Pendiente |

## 19 Glosario

| Término | Significado |
|---|---|
| BRD | Documento de requisitos de negocio. |
| Lead | Prospecto sin calificar que todavía no es cuenta ni oportunidad. |
| CPQ | Configuración, precio y cotización. En este proyecto, cotizador ligero con margen. |
| BANT | Presupuesto, autoridad, necesidad y plazo para calificar una oportunidad. |
| SOW | Documento de alcance del trabajo para una solución. |
| PoC | Prueba de concepto para evaluar viabilidad o una hipótesis técnica. |
| SLA | Compromiso o meta de tiempo de atención, sujeto al calendario definido. |
| MRR | Ingreso recurrente mensual, separado de implementación inicial. |
| Handover | Entrega de información comercial a compras u operaciones. |
| UAT | Pruebas de aceptación realizadas con usuarios de negocio. |
| RPO y RTO | Pérdida de datos tolerable y tiempo objetivo de recuperación. |

Fin del documento.
