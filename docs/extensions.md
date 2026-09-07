# Extensiones de HASHI

HASHI detecta extensiones declarativas desde la carpeta que se abre con **Extensiones → Abrir carpeta de extensiones**. Cada extensión tiene su propia carpeta y un archivo `manifest.json`.

Las extensiones se instalan únicamente en esta carpeta de usuario; HASHI no incluye extensiones preinstaladas.

```text
extensions/
  mi-extension/
    manifest.json
```

Ejemplo:

```json
{
  "id": "mi-extension",
  "name": "Mi extensión",
  "description": "Descripción que aparece en HASHI.",
  "version": "1.0.0",
  "entryUrl": "https://ejemplo.com",
  "sidebar": true
}
```

`id` debe contener entre 2 y 64 caracteres alfanuméricos o guiones. Las extensiones externas usan `entryUrl`, que debe ser HTTPS. HASHI también puede incluir extensiones nativas de confianza mediante `"type": "native"` y una vista aprobada, como `"nativeView": "multimedia"`; no se permite que extensiones externas inyecten código dentro de Electron.

`sidebar` es opcional (por defecto `false`). Al activarlo, HASHI añade un botón con el nombre de la extensión al menú lateral, justo debajo de **Extensiones**.

Desde el catálogo puedes activar o desactivar cualquier extensión. Su estado se guarda en el perfil local del usuario.

Este formato es deliberadamente limitado mientras se diseña un modelo de permisos para extensiones con interfaces propias.
