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

> ⚠️ GitHub Pages solo funciona en repos **públicos** (plan gratuito) o **privados con plan de pago**.
> Si tu repo es privado y usas el plan gratuito, primero hazlo público en
> *Settings → General → Change repository visibility*.

Para publicarlo (un solo clic):

1. Ve a **Settings → Pages** del repositorio.
2. En *Source* elige **Deploy from a branch**.
3. Selecciona la rama `claude/fashion-styling-chatbot-o0gx7x` y la carpeta `/ (root)`. Guarda.
4. Espera ~1 minuto y abre `https://<tu-usuario>.github.io/clouding/`.

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
