# Mana Forge Web — Roadmap

## 🔴 Alta prioridad

### Autenticación & Seguridad
- [x] Crear componente `ProtectedRoute` y proteger `/my-decks`, `/deck-builder`, `/profile`
- [x] Flash de contenido al cargar — mostrar spinner global mientras `checkSession()` valida la sesión
- [x] Validación de formulario en Login/Register (campos vacíos, longitud mínima de contraseña)
- [x] Loading state en botón de Login/Register (spinner + deshabilitar durante petición)

### Vistas faltantes
- [ ] Crear vista `/settings` (idioma, newsletter, cambiar contraseña, eliminar cuenta)

### Perfil
- [ ] Conectar formulario de perfil al backend (guardar username, email, biography)
- [x] Implementar cambio de contraseña
- [ ] Implementar eliminación de cuenta (con confirmación)

### Feedback visual
- [x] Sistema de toast/notificaciones (éxito, error, info) — usado en guardar mazo, errores de red, etc.
- [x] Loading state en botón "Guardar mazo" del DeckBuilder
- [ ] Diálogo de confirmación antes de eliminar un mazo

---

## 🟡 Media prioridad

### DeckBuilder
- [x] Validar que el nombre del mazo no esté vacío antes de guardar
- [x] Notificación de éxito tras guardar/actualizar mazo (actualmente silencioso)
- [ ] Reemplazar `ARCHETYPES_DB` hardcodeado por datos del backend
- [x] Debounce en el autocomplete de búsqueda de cartas (evitar peticiones por cada tecla)

### Dashboard
- [ ] Reemplazar "Community Deck of the Day" hardcodeado por datos reales del backend
- [x] Traducir `"Leer más"` usando el hook `useTranslation`

### My Decks
- [ ] Implementar acción **Duplicar mazo**
- [ ] Implementar acción **Pin/Destacar mazo** (persistir en backend)
- [ ] Añadir campo `lastUpdated` en el modelo `Deck.java` y mostrarlo en la tabla

### Traducciones
- [x] Traducir `"Volver"` en `ArticleDetail.tsx`
- [x] Traducir `"Curva de Maná"` en `DeckStats.tsx`
- [x] Traducir `"Colaborador de Mana Forge"` en `ArticleDetail.tsx`

### Footer
- [ ] Añadir rutas/URLs reales a los links del footer (Docs, Privacy, Terms, etc.)

---

## 🟢 Baja prioridad

### Vistas futuras
- [ ] Vista `/deck-viewer/:deckId` — ver mazo de otro usuario (solo lectura)
- [ ] Vista `/notifications` — listado de notificaciones
- [ ] Vista `/messages` — mensajería entre usuarios
- [x] Vista `/friends` — lista de amigos y solicitudes
- [ ] Vista `/achievements` — logros del usuario
- [x] Página 404 personalizada

### Seguridad
- [ ] Sanitizar HTML en `ArticleDetail.tsx` (`dangerouslySetInnerHTML` sin filtrar)

### Performance
- [ ] Paginación en listado de artículos
- [ ] Paginación en listado de mazos
- [ ] Lazy loading de imágenes en el grid del Dashboard

### UX
- [ ] Scroll to top al navegar entre páginas (ya existe `ScrollToTop.tsx` — verificar cobertura)
- [ ] Feedback si no hay mazos guardados en My Decks (empty state)
