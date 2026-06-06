# Silva Salud Fatiga — Mini App (PWA)

App web instalable (tipo app) para el reporte de fatiga de empleados.
Cada botón abre WhatsApp con un mensaje prearmado dirigido a **EVA** (la IA), ya
identificado con el nombre y la empresa del empleado. La app marca qué se reportó
hoy (con hora), se reinicia sola al cambiar el día y permite deshacer un reporte
hecho por error.

Basada en los patrones del repo `linktree-silva` (service worker versionado,
detección iOS/Android, modo standalone), con la estética navy + naranja de Silva Salud.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | La app completa (interfaz + lógica). |
| `manifest.json` | Configura la instalación: nombre "Silva Salud Fatiga", iconos, colores. |
| `sw.js` | Service worker. Maneja la caché y la auto-actualización. |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` | Iconos de la app. |
| `logo.png` | Logo blanco usado dentro del encabezado. |
| `CNAME` | El subdominio donde vive la app. |

---

## 1) Publicar por primera vez (con GitBash)

> Asumimos que querés un repo **nuevo** llamado `fatiga-silva` en la cuenta `agenciakrea-hub`.

1. Creá el repositorio vacío en GitHub: https://github.com/new
   - Owner: `agenciakrea-hub` · Name: `fatiga-silva` · **Public** · sin README.

2. Abrí **GitBash** dentro de la carpeta `fatiga-silva` (la que contiene estos archivos)
   y pegá, línea por línea:

   ```bash
   git init
   git add .
   git commit -m "Silva Salud Fatiga v1"
   git branch -M main
   git remote add origin https://github.com/agenciakrea-hub/fatiga-silva.git
   git push -u origin main
   ```

3. En GitHub → repo `fatiga-silva` → **Settings → Pages**:
   - *Source*: `Deploy from a branch`
   - *Branch*: `main` / `/ (root)` → **Save**.

4. **Custom domain**: ya incluimos el archivo `CNAME` con `fatiga.aeroambulanciasilva.com`.
   - Si querés OTRO subdominio, editá `CNAME` y poné el que prefieras (una sola línea).
   - En tu proveedor de DNS, creá un registro **CNAME**:
     `fatiga`  →  `agenciakrea-hub.github.io`
   - Volvé a Settings → Pages y tildá **Enforce HTTPS** (puede tardar unos minutos).

Listo: la app queda en `https://fatiga.aeroambulanciasilva.com`.

---

## 2) Actualizar la app (¡importante para que no quede caché vieja!)

Cada vez que cambies algo, subí el número de versión en **dos** lugares para que
todos los dispositivos reciban la actualización automáticamente:

1. En `index.html`, arriba del todo del `<script>`:
   ```js
   const APP_VERSION = '1.0';   // ← cambialo: 1.1, 1.2, etc.
   ```
2. En `sw.js`, línea superior:
   ```js
   const VERSION = 'v1';        // ← cambialo: v2, v3, etc.
   ```

Después, en GitBash dentro de la carpeta:

```bash
git add .
git commit -m "Actualización vX"
git push
```

El número que se ve abajo en la app ("Versión 1.0") sale de `APP_VERSION`, así sabés
en qué versión está cada empleado. Cuando cambia `VERSION` en `sw.js`, los celulares
detectan la nueva versión, refrescan solos y muestran lo nuevo sin borrar nada a mano.

---

## Cómo funciona para el empleado

1. Entra al link, lo instala (botón "Instalar la app" en Android; en iPhone aparecen
   las instrucciones de "Agregar a inicio").
2. La primera vez completa **Nombre y apellido** + **Empresa**. Se guardan en su
   teléfono (no se envían a ningún servidor). Puede editarlos con el botón **Editar**.
3. Toca un botón (ej. "Saliendo de casa", "Cansancio") → se abre WhatsApp con el
   mensaje ya escrito hacia EVA → lo envía.
4. El botón queda marcado en verde con la hora. Al día siguiente se reinicia solo.
   Si lo tocó por error, usa **"Marcar como no enviado"** para quitar la marca.

---

## Datos de configuración (dentro de `index.html`)

- WhatsApp de EVA: `584129089379` (constante `EVA_PHONE`).
- Botones y textos de los mensajes: array `SECTIONS`. Ahí podés editar etiquetas,
  descripciones y el texto exacto que se envía a EVA.
