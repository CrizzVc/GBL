# Extensiones de HASHI

HASHI detecta extensiones declarativas desde la carpeta que se abre con **Extensiones → Abrir carpeta de extensiones**. Cada extensión tiene su propia carpeta y un archivo `manifest.json`.

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
  "entryUrl": "https://ejemplo.com"
}
```

`id` debe contener entre 2 y 64 caracteres alfanuméricos o guiones. `entryUrl` debe ser una URL HTTPS. HASHI valida los manifiestos y abre la URL en el navegador predeterminado; no carga código de extensiones dentro de Electron ni les expone archivos, Node.js o IPC.

Este formato es deliberadamente limitado mientras se diseña un modelo de permisos para extensiones con interfaces propias.
