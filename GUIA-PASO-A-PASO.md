# Guía paso a paso — Sistema de Flota en producción

## Qué vas a lograr
Una URL pública (ej: `https://flota-tuempresa.vercel.app`) donde todos acceden desde cualquier
dispositivo. Los datos son compartidos en tiempo real: si Miguel marca entrada desde su celular,
Despacho lo ve al instante en su compu.

**Costo total: $0**

---

## Paso 1 — Crear cuenta en Supabase (base de datos)

1. Abrí **https://supabase.com** en tu navegador
2. Clic en el botón verde **"Start your project"**
3. Elegí **"Continue with GitHub"** (si no tenés GitHub, creá cuenta en github.com primero)
4. Autorizá la conexión

✅ Ya tenés cuenta en Supabase.

---

## Paso 2 — Crear tu proyecto de base de datos

1. Una vez adentro, clic en **"New project"**
2. Completá así:
   - **Name:** `sistema-flota`
   - **Database Password:** inventá una contraseña segura (guardala en algún lado)
   - **Region:** elegí `South America (São Paulo)` — es la más cercana a Bolivia
3. Clic en **"Create new project"**
4. Esperá 1-2 minutos mientras se crea (ves una pantalla de carga)

✅ Proyecto creado.

---

## Paso 3 — Crear las tablas

1. En el menú de la izquierda, buscá y clic en **"SQL Editor"** (ícono de terminal `>_`)
2. Clic en **"New query"**
3. Abrí el archivo `TABLAS-SUPABASE.sql` que viene en el zip con el Bloc de Notas
4. Seleccioná TODO el texto (Ctrl+A) y copialo (Ctrl+C)
5. Pegalo (Ctrl+V) en el SQL Editor de Supabase
6. Clic en el botón verde **"Run"** (o presioná Ctrl+Enter)
7. Debería aparecer `Success. No rows returned` en verde

✅ Tablas creadas con los usuarios iniciales.

---

## Paso 4 — Obtener las credenciales

1. En el menú izquierdo, clic en el ícono de **engranaje ⚙️** (Settings)
2. Clic en **"API"**
3. En la sección **"Project URL"** vas a ver una URL como:
   `https://abcdefghijk.supabase.co`
   → Copiala, la vas a necesitar en el Paso 5

4. Más abajo en **"Project API keys"**, buscá **"anon public"** y copiá esa clave larga

✅ Tenés las dos credenciales.

---

## Paso 5 — Configurar el proyecto

1. Descomprimí el archivo `fleet-supabase.zip`
2. Abrí la carpeta `fleet-supabase`
3. Entrá a la carpeta `src`
4. Abrí el archivo `supabase.js` con el Bloc de Notas (clic derecho → Abrir con → Bloc de notas)
5. Vas a ver esto:

```
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co'
const SUPABASE_KEY = 'TU_CLAVE_ANONIMA_AQUI'
```

6. Reemplazá `https://TU_PROYECTO.supabase.co` con tu URL del Paso 4
7. Reemplazá `TU_CLAVE_ANONIMA_AQUI` con tu clave anon del Paso 4
8. Guardá el archivo (Ctrl+S)

Debería quedar algo como:
```
const SUPABASE_URL = 'https://abcdefghijk.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

✅ Credenciales configuradas.

---

## Paso 6 — Instalar Node.js (solo la primera vez)

1. Abrí **https://nodejs.org**
2. Descargá el botón verde que dice **"LTS"**
3. Instalalo como cualquier programa (siguiente, siguiente, finalizar)
4. Para verificar que funcionó, abrí la Terminal:
   - **Windows:** tecla Windows → escribí "cmd" → Enter
   - **Mac:** Spotlight (Cmd+Espacio) → "Terminal" → Enter
5. Escribí: `node --version` y Enter
6. Si ves algo como `v22.0.0` está todo bien

✅ Node.js instalado.

---

## Paso 7 — Subir a GitHub

1. Creá cuenta en **https://github.com** si no tenés
2. Instalá **Git** desde **https://git-scm.com/downloads** → descargá e instalá
3. Abrí la Terminal y navegá a tu carpeta:
   ```
   cd Downloads/fleet-supabase
   ```
   (o donde hayas descomprimido el zip)

4. Ejecutá estos comandos uno por uno:
   ```
   git init
   git add .
   git commit -m "Sistema de Flota v1"
   ```

5. En GitHub.com, clic en **"+"** arriba a la derecha → **"New repository"**
6. Nombre: `sistema-flota` → dejá en **Public** → clic **"Create repository"**
7. GitHub te muestra comandos. Copiá y pegá los que empiezan con `git remote add` y `git push`:
   ```
   git remote add origin https://github.com/TU_USUARIO/sistema-flota.git
   git branch -M main
   git push -u origin main
   ```

✅ Código en GitHub.

---

## Paso 8 — Publicar en Vercel

1. Abrí **https://vercel.com/signup**
2. Elegí **"Continue with GitHub"** y autorizá
3. Clic en **"Add New Project"**
4. Buscá tu repositorio **`sistema-flota`** → clic en **"Import"**
5. En la pantalla de configuración:
   - Framework Preset: **Vite** (debería detectarlo automáticamente)
   - Dejá todo lo demás por defecto
6. Clic en **"Deploy"**
7. Esperá 1-2 minutos

✅ App publicada. Vercel te da una URL como `https://sistema-flota-xxx.vercel.app`

---

## Paso 9 — Probar que funciona

1. Abrí la URL en tu navegador
2. Deberías ver la pantalla de login con todos los usuarios
3. Probá entrar como Admin (Carlos Mendez, PIN: 0000)
4. Abrí la misma URL en otro dispositivo o en modo incógnito
5. Entrá como Despacho (María López, PIN: 2001)
6. Volvé al Admin y marcá una entrada desde Driver
7. Despacho debería ver el cambio sin recargar la página

✅ Tiempo real funcionando.

---

## Paso 10 — Instalar como app en el celular

### Android (Chrome):
1. Abrí la URL en Chrome
2. Tocá el menú (3 puntitos arriba a la derecha)
3. Tocá **"Agregar a pantalla de inicio"**
4. Dale un nombre y tocá **"Agregar"**

### iPhone (Safari):
1. Abrí la URL en Safari (no funciona en Chrome en iPhone)
2. Tocá el botón de compartir (cuadrado con flechita arriba)
3. Bajá y tocá **"Agregar a pantalla de inicio"**
4. Tocá **"Agregar"**

Queda como ícono en la pantalla, se abre como app sin la barra del navegador.

---

## ¿Cómo actualizo la app en el futuro?

Cuando quieras hacer cambios (agregar usuarios, cambiar colores, etc.):

1. Editá los archivos que necesites
2. En la Terminal, desde la carpeta del proyecto:
   ```
   git add .
   git commit -m "Descripcion del cambio"
   git push
   ```
3. Vercel detecta el push automáticamente y publica en ~60 segundos

---

## Resumen de cuentas necesarias

| Servicio | Para qué | Costo | URL |
|----------|----------|-------|-----|
| GitHub | Guardar el código | Gratis | github.com |
| Supabase | Base de datos en la nube | Gratis (hasta 500MB) | supabase.com |
| Vercel | Hosting de la web | Gratis | vercel.com |

**Límites del plan gratuito de Supabase:**
- 500 MB de base de datos (para una flota de 20-50 drivers, podés estar años sin llegarle)
- 50,000 solicitudes por mes (más que suficiente)
- Conexiones simultáneas ilimitadas

---

## Algo no funciona?

**"Error de conexión" en la app:**
→ Revisá que las credenciales en `supabase.js` estén bien copiadas, sin espacios de más

**"No se ejecutó el SQL":**
→ Volvé al SQL Editor y ejecutalo de nuevo. Si hay un error de tabla duplicada, está bien — ya existe

**La app carga pero no aparecen los usuarios:**
→ Verificá que el SQL se haya ejecutado correctamente en el Paso 3

**Preguntas o problemas:**
→ Podés consultarme en este chat y te ayudo a resolver cualquier error paso a paso.
