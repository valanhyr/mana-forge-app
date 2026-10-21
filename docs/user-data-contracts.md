# Datos de usuario: contratos, fechas y diagnóstico

## Recorrido

La web y Frontdesk llaman a Spring API; la API persiste las cuentas en MongoDB
(`users`). Directus no es el almacén de usuarios de la aplicación. Fuera del perfil
test, `MongoConfig` selecciona la base `production`; comprobar entorno y versión
desplegada antes de interpretar resultados. No se ha consultado la base real en
esta implementación.

Contrato y entrega implementados y validados localmente, aún sin desplegar: [spec](specs/user-data-contracts/spec.md),
[plan](specs/user-data-contracts/plan.md) y [evidencia](specs/user-data-contracts/tasks.md).
Estos documentos distinguen lo implementado, lo probado y lo pendiente de desplegar.

## Fechas

- `createdAt`: alta, fijada por el servidor e inmutable. Registro local no es login;
  Google crea la cuenta como parte de su primer login.
- `updatedAt`: modificación efectiva del documento mediante la aplicación, incluido
  login, perfil, contraseña, verificación, amigos, moderación, newsletter y cifrado
  de email legado. No es una fecha de última visita ni una auditoría de cada campo.
- `lastLoginAt`: último login aceptado, monotónico. Restaurar una sesión o consultar
  `/users/me` no lo actualiza. No existe `lastSeenAt` ni seguimiento nuevo de páginas.
- `newsletterConsentAt`: consentimiento de newsletter, separado de las anteriores.

Valores UTC: BSON Date y JSON ISO 8601 con zona; precisión de milisegundos. Histórico
ausente/nulo se presenta como desconocido. Leer no escribe ni rellena datos. La próxima
edición de una cuenta antigua puede iniciar modificación sin inventar creación.
Los errores y operaciones sin cambios no actualizan modificación.

Mongo no mantiene campos automáticos de creación/modificación en cada documento.
El timestamp de ObjectId refleja generación del ID, no prueba de alta/inserción;
no se utiliza como fallback de `createdAt`. Tampoco se reconstruyen fechas desde
auditoría ni se retroalimentan los datos de demos.

## Fronteras de privacidad

| Uso | Datos |
|---|---|
| Registro | Entrada explícita de credenciales y campos de perfil permitidos; ignora campos internos. Respuesta pública 201, sin sesión automática. |
| Público/social | `userId`, `name`, `username`, `biography`, `avatar`; sin email, fechas, amigos, estado interno ni tokens. También en solicitudes y conversaciones anidadas. |
| Titular | Perfil propio, email, capacidades actuales de cambio de email, preferencias y tres fechas anulables; nunca hashes ni tokens. |
| Frontdesk | Proyección privada de operador, con email y fechas, estado/plan y estadísticas calculadas. No añade permisos. |

El cifrado determinista y la búsqueda exacta de email se mantienen. Retirar email
de respuestas sociales es una reducción deliberada de datos compartidos, aunque un
cliente antiguo aún declare ese campo. Desplegar API antes de clientes nuevos; estos
normalizan fechas ausentes de una API anterior como desconocidas.

Las mutaciones usan updates de campos concretos. Contraseña, verificación, cambios
de email/consentimiento y cifrado legado comprueban precondiciones al escribir;
un conflicto obsoleto no debe enviar una notificación de éxito. No hay transacción
global entre ambos usuarios de una amistad, auditoría y SMTP ni garantía de entrega.

## Diagnóstico manual de solo lectura

**Preparado, no ejecutado contra entornos reales.** Requiere autorización y una
conexión de solo lectura a un entorno identificado. No publicar URI, credenciales,
emails, hashes, tokens ni documentos. No arrancar la API para comprobar datos:
el runner de cifrado existente puede escribir al arrancar.

En una sesión `mongosh` ya conectada a la base correcta, comprobar primero:

```javascript
db.getName()
```

Tipos/presencia de fechas (devuelve conteos, no datos personales):

```javascript
db.users.aggregate([
  { $group: {
    _id: {
      createdAt: { $type: "$createdAt" },
      updatedAt: { $type: "$updatedAt" },
      lastLoginAt: { $type: "$lastLoginAt" },
      newsletterConsentAt: { $type: "$newsletterConsentAt" }
    },
    count: { $sum: 1 }
  } }
], { maxTimeMS: 15000 })
```

`missing` y `null` son desconocidos; `date` es el tipo esperado. Otros tipos no son
una fecha confirmada ni deben corregirse automáticamente.

Resumen de índices sin imprimir filtros que pudieran contener datos:

```javascript
db.users.getIndexes().map(index => ({
  name: index.name,
  key: index.key,
  unique: index.unique === true,
  sparse: index.sparse === true,
  hasPartialFilter: index.partialFilterExpression != null
}))
```

Un índice `{ username: 1, _id: 1 }` **no garantiza** unicidad de username. Para
confirmar una garantía real revisar también collation y cobertura de un posible
índice parcial/sparse, sin volcar valores de sus filtros en informes compartidos.

Conteo de duplicados exactos, sin imprimir los valores agrupados:

```javascript
for (const field of ["username", "email"]) {
  const result = db.users.aggregate([
    { $match: { [field]: { $type: "string" } } },
    { $group: { _id: "$" + field, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $group: {
      _id: null,
      duplicateValues: { $sum: 1 },
      extraDocuments: { $sum: { $subtract: ["$count", 1] } }
    } },
    { $project: { _id: 0, duplicateValues: 1, extraDocuments: 1 } }
  ], { maxTimeMS: 15000, allowDiskUse: false }).toArray();
  printjson({ field, result });
}
```

Usar una ventana adecuada para el tamaño de la colección: los grupos pueden ser
costosos sin índices. Timeout/error no equivale a cero duplicados. El resultado no
prueba equivalencia de emails con distinta capitalización/cifrado, y una colección
sin duplicados hoy no garantiza que no aparezcan mañana sin un índice adecuado.

Registrar entorno, fecha, versión desplegada, resultado agregado y permisos/límites
de la revisión. No crear índices, editar datos ni hacer backfill durante diagnóstico.
La corrección de duplicados y la creación de índices necesitan un plan y permiso
operativo independientes.
