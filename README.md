# Armario IA 👗✨

Un **chatbot de estilismo personal** que funciona en el navegador y en el móvil.
Envíale **fotos de tus prendas** 📷 o descríbelas, y te aconseja:

- 🧩 **Cómo combinarlas** (colores, calzado, accesorios, proporciones).
- 🕒 **Cuándo y dónde llevarlas** (ocasión, clima, momento del día).
- 🛍️ **Qué comprar** (versatilidad, calidad-precio, fondo de armario).

Está hecho como una página estática (HTML + CSS + JavaScript) y se publica en **GitHub Pages**,
así que puedes abrirla desde el móvil sin instalar nada.

## 🔑 Cómo usarla

La app usa la inteligencia artificial de **Claude (Anthropic)** directamente desde tu navegador,
con **tu propia clave de API**. La clave se guarda **solo en tu dispositivo** (en `localStorage`)
y nunca se envía a ningún servidor propio ni se sube a internet.

1. Consigue una clave en 👉 [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   (crea una cuenta, entra en *API Keys* y pulsa *Create Key*).
2. Abre la app, pulsa el engranaje ⚙️ y pega tu clave.
3. ¡Listo! Escribe o adjunta una foto y recibe tus consejos de estilo.

> 💡 El uso de la API de Anthropic puede tener coste según tu plan/crédito. Puedes elegir el
> modelo **Haiku** en Ajustes para gastar menos, o **Opus** para máxima calidad.

## 🚀 Publicación en GitHub Pages

El repositorio incluye un workflow (`.github/workflows/deploy.yml`) que publica el sitio
automáticamente en GitHub Pages con cada `push` a la rama de desarrollo.

Si Pages no se activa solo, ve a **Settings → Pages** del repositorio y en *Source*
selecciona **GitHub Actions**.

## 🛠️ Estructura

| Archivo        | Descripción                                   |
|----------------|-----------------------------------------------|
| `index.html`   | Estructura de la interfaz.                     |
| `styles.css`   | Diseño (tema oscuro, mobile-first).            |
| `app.js`       | Lógica del chat, imágenes y llamada a la IA.   |

## 🔒 Privacidad

- Tu clave de API y el historial del chat se guardan **solo en tu navegador**.
- Las imágenes se redimensionan en tu dispositivo y se envían directamente a la API de Anthropic
  para generar la respuesta.
- No hay servidor intermedio ni base de datos.
