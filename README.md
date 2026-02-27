# Gastos App

Control de gastos personales con React + Vite + Tailwind CSS + Supabase.

## Features

- Tabla de gastos por mes con CRUD completo
- Gráficos por categoría y forma de pago
- Navegación por mes y año
- Comparación mes a mes con % de cambio
- Tendencia de gastos anual
- Detección automática de gastos recurrentes
- Top 10 gastos del mes
- Tipo de cambio USD configurable por mes
- Autenticación con Google (multi-usuario, cada usuario ve solo sus datos)

---

## Setup

### 1. Crear proyecto en Supabase

1. Ir a [https://supabase.com](https://supabase.com) y crear una cuenta (gratis)
2. Crear un nuevo proyecto
3. En el **SQL Editor**, pegar y ejecutar el contenido de `supabase_schema.sql`

### 2. Configurar Google OAuth en Supabase

1. En Supabase: **Authentication → Providers → Google** → Enable
2. Ir a [Google Cloud Console](https://console.cloud.google.com/)
3. Crear un proyecto → **APIs & Services → Credentials → OAuth 2.0 Client ID**
4. Tipo: **Web application**
5. En "Authorized redirect URIs" agregar: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
6. Copiar el **Client ID** y **Client Secret** de vuelta a Supabase → Google Provider

### 3. Configurar variables de entorno (desarrollo local)

```bash
cp .env.example .env.local
```

Editar `.env.local` con los valores de tu proyecto Supabase (Supabase → Project Settings → API):

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Instalar dependencias y correr en local

```bash
npm install
npm run dev
```

La app queda en `http://localhost:5173`

---

## Deploy a Vercel

### Opción A: desde la UI de Vercel (recomendado)

1. Subir el proyecto a GitHub
2. Ir a [https://vercel.com](https://vercel.com) → **New Project** → importar el repo
3. En **Environment Variables**, agregar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**

### Opción B: desde CLI

```bash
npm install -g vercel
vercel
```

### Configurar redirect URI para producción

Una vez desplegado, ir a Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://tu-app.vercel.app`
- **Additional Redirect URLs**: `https://tu-app.vercel.app/**`

---

## Estructura del proyecto

```
gastos-app/
├── src/
│   ├── components/
│   │   ├── Charts.jsx        # Gráficos y análisis del mes
│   │   ├── GastosTable.jsx   # Tabla CRUD principal
│   │   ├── GastoModal.jsx    # Modal para agregar/editar
│   │   ├── Header.jsx        # Totales ARS/USD y tipo de cambio
│   │   ├── Login.jsx         # Pantalla de login con Google
│   │   └── Promedios.jsx     # Vista anual con promedios y tendencias
│   ├── contexts/
│   │   └── AuthContext.jsx   # Context de autenticación
│   ├── lib/
│   │   └── supabase.js       # Cliente de Supabase
│   ├── api.js                # Funciones CRUD con Supabase SDK
│   ├── App.jsx               # Componente raíz con navegación
│   ├── constants.js          # Categorías, formas de pago, colores
│   └── main.jsx              # Entry point
├── supabase_schema.sql       # Schema SQL para ejecutar en Supabase
├── .env.example              # Plantilla de variables de entorno
├── vercel.json               # Configuración de deploy
└── package.json
```
