# 🌐 LinguaMaestro — Guía de instalación (Etapa 1)

Plataforma web con profesor de idiomas IA, login, base de datos real y
**panel de administrador** donde tú gestionas estudiantes y ves su progreso.

Sigue los pasos EN ORDEN. No necesitas programar: es copiar, pegar y dar clics.
Tiempo total: ~20 minutos.

```
lingua-maestro/
├── index.html                  ← la app (login + profesor + panel admin)
├── netlify.toml                ← configuración de Netlify
├── supabase-setup.sql          ← crea tu base de datos
└── netlify/functions/
    ├── chat.js                 ← puente seguro hacia Claude
    └── admin.js                ← operaciones de administrador
```

---

## PASO 1 · Base de datos en Supabase  (~4 min)

1. Entra a tu proyecto en **supabase.com**
2. Menú izquierdo → **SQL Editor** → **New query**
3. Abre `supabase-setup.sql`, copia TODO, pégalo y dale **Run** → debe decir **Success**
4. (Recomendado) **Authentication → Sign In / Providers → Email** → desactiva
   **"Confirm email"** y guarda. Así las cuentas funcionan al instante sin correo.

### Copia tus claves (las necesitarás en los pasos 2 y 4)
5. **Project Settings** (engranaje) → **API**. Apunta tres valores:
   - **Project URL**            → `https://xxxx.supabase.co`
   - **anon public** key        → empieza con `eyJ...`
   - **service_role** key       → también empieza con `eyJ...` ⚠️ **SECRETA**,
     nunca la pongas en `index.html`; solo va en Netlify (Paso 4).

---

## PASO 2 · Pegar las claves públicas en la app  (~1 min)

1. Abre `index.html` con cualquier editor (Bloc de notas sirve)
2. Cerca del inicio, en **CONFIGURACIÓN**, reemplaza:
   ```
   const SUPABASE_URL      = "PEGA_AQUI_TU_PROJECT_URL";
   const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_KEY";
   ```
   con tu **Project URL** y tu **anon** key. Guarda.

> Estas dos son seguras de poner ahí; la protección la da el RLS del Paso 1.

---

## PASO 3 · Subir a GitHub  (~3 min)

1. En **github.com** crea un repositorio `lingua-maestro`
2. Sube los archivos respetando las carpetas. Para los de la función, al subir
   escribe el nombre con su ruta: `netlify/functions/chat.js` y
   `netlify/functions/admin.js` (GitHub crea las carpetas solo).

---

## PASO 4 · Publicar en Netlify + variables secretas  (~5 min)

1. **netlify.com** → **Add new site** → **Import an existing project** → GitHub →
   elige `lingua-maestro` → **Deploy**
2. Cuando termine, ve a **Site configuration → Environment variables** y agrega
   **tres** variables (botón "Add a variable" en cada una):

   | Key                         | Value                                   |
   |-----------------------------|-----------------------------------------|
   | `ANTHROPIC_API_KEY`         | tu clave de Claude (`sk-ant-...`)       |
   | `SUPABASE_URL`              | tu Project URL                          |
   | `SUPABASE_SERVICE_ROLE_KEY` | tu service_role key (la SECRETA)        |

3. Ve a **Deploys → Trigger deploy → Deploy site** para que tomen efecto.

> La API key de Claude: créala en **console.anthropic.com → API Keys**, y en
> **Billing → Usage Limits** ponle un tope mensual (ej. $5) por seguridad.

---

## PASO 5 · Crear TU cuenta y convertirte en admin  (~3 min)

1. Abre tu sitio (`https://algo.netlify.app`) → pestaña **Crear cuenta** →
   regístrate con tu correo y contraseña → entra.
   (Verás la vista de estudiante; es normal, aún no eres admin.)
2. Vuelve a **Supabase → SQL Editor → New query** y ejecuta (con tu correo):
   ```sql
   update public.profiles set role = 'admin'
   where email = 'TU_CORREO@ejemplo.com';
   ```
3. Recarga el sitio. Ahora entras directo al **Panel de administración**. 🎉

---

## Cómo usar el panel

- **+ Nuevo estudiante**: creas una cuenta (correo + contraseña temporal). Esa
  persona entra con esos datos y tiene su propio profesor, totalmente separado.
- **Tabla**: ves de cada estudiante su nivel, fase, lecciones, mensajes y última
  actividad. El botón **Eliminar** borra su cuenta y progreso.
- **🎓 Probar como estudiante**: prueba el profesor tú mismo con tu cuenta. El
  botón **← Panel** te regresa a la administración.

---

## ❓ Problemas comunes

- **"Falta conectar Supabase"** → revisa el Paso 2 (claves bien pegadas).
- **Aviso amarillo (IA no activa)** → falta `ANTHROPIC_API_KEY` o no hiciste
  redeploy después de agregarla (Paso 4.3).
- **"Solo administradores" al crear estudiantes** → falta el Paso 5.2, o no
  recargaste, o falta `SUPABASE_SERVICE_ROLE_KEY` en Netlify.
- **No llega correo de confirmación** → haz el punto 4 del Paso 1.

---

## ✨ Qué incluye la plataforma (Etapa 1)

El estudiante entra y encuentra 6 secciones en el menú izquierdo:

- **🎓 Profesor**: el agente experto. Su método está basado en ciencia real
  (input comprensible, repetición espaciada, vocabulario de alta frecuencia, las
  4 destrezas e inglés nativo). Evalúa tu nivel, crea un plan a tu medida,
  adapta las clases a tu rutina y tus gustos, e incluye lectura, listening
  (botón 🔊 en cada mensaje), pronunciación y escritura. Da clases tipo "subir
  de nivel".
- **📔 Vocabulario**: palabras de alta frecuencia ligadas a tus intereses, con
  audio y ejemplos. Marca las que dominas y ganas XP.
- **⚡ Ejercicios**: retos cortos generados a tu medida, con puntaje.
- **🗣️ Pronunciación**: escucha la frase, repítela al micrófono y recibe tu
  puntaje. (El micrófono funciona mejor en Chrome/Edge.)
- **🎮 Juegos**: relaciona el emoji con la palabra en inglés; encadena rachas.
- **🌍 Cultura**: curiosidades del idioma y expresiones reales de nativos.

Arriba a la izquierda se ve tu **Nivel, barra de XP y racha** 🔥. En "Mis
intereses" (abajo del menú) escribes lo que te gusta para personalizar todo.

> El listening y la pronunciación usan la voz y el micrófono del navegador:
> son gratis y NO gastan nada de tu crédito de Claude.

---

## 🚀 Etapa 2 (más adelante)

Suscripciones de pago en dólares. La base ya está lista: roles, usuarios aislados
y panel. Solo añadiríamos el proveedor de pagos y un control de acceso por
suscripción activa. Cuando quieras, lo armamos.
