
# Chacal Home – Automatización 100%

Este repo ya trae:
- `scraper/` robot (Puppeteer) que entra a K-Five, extrae precios y genera **data/products.json** con **+50%**.
- `site/` web estática que **lee ese JSON** y muestra el catálogo.
- `.github/workflows/scrape.yml` tarea que corre **todos los días 03:00 ART** y cuando hay cambios **commitea y redeploya**.

## Paso a paso (cero estrés)

1. **Crear un repo en GitHub** (privado o público) y subir el contenido de esta carpeta tal cual.
2. En **Vercel** (o Netlify):
   - Conectar el repo y desplegar la carpeta **`site/`** como sitio estático.
   - No necesita build; es HTML/JS plano. El JSON queda en `/data/products.json` en la raíz del repo.
3. GitHub Actions ya está listo. Corre a las **06:00 UTC** (03:00 Buenos Aires). También podés ejecutarlo a mano desde **Actions → Run workflow**.

### Cambiar el margen
- Editá el valor de entorno `MARKUP_PCT` en el step “Run scraper” o en Vercel como variable de entorno para el workflow si preferís.
- Por defecto es **50**.

### Probalo local
```bash
# 1) Instalar dependencias del scraper
cd scraper
npm install

# 2) Ejecutar
npm start
# → Genera ../data/products.json y ../data/kfive_captura_con_50.csv

# 3) Abrí site/index.html en el navegador (o servilo con una extensión de Live Server)
```

### ¿Qué toca el bot?
- `data/products.json` (para la web)
- `data/kfive_captura_con_50.csv` (auxiliar)

Si K-Five cambia el HTML (nombres de botones, estructura), habría que ajustar **selectores** dentro de `scraper/scrape_kfive_to_json.js`.

---

**Hecho para: Chacal Home**. Si querés carrito real, WhatsApp Checkout, categorías por URL o filtro avanzado, se suma encima sin romper nada.
