# 💸 Gastos App

App de control de gastos personales — React + Vite + Tailwind + Express + JSON.

## 🚀 Cómo correrla

### 1. Instalar dependencias
```bash
npm install
```

### 2. Correr en modo desarrollo
```bash
npm run dev
```
Esto levanta:
- **Frontend** (Vite) → http://localhost:5173
- **Backend** (Express) → http://localhost:3001

Abrí http://localhost:5173 en tu navegador.

---

## 📁 Estructura

```
gastos-app/
├── src/
│   ├── components/
│   │   ├── Header.jsx       → Totales ARS/USD + tipo de cambio editable
│   │   ├── GastosTable.jsx  → Tabla con CRUD, filtros y ordenamiento
│   │   ├── GastoModal.jsx   → Modal para agregar/editar
│   │   └── Charts.jsx       → Gráficos (pie x forma, pie x concepto, barra)
│   ├── App.jsx              → Componente principal + tabs
│   ├── api.js               → Llamadas al backend
│   ├── constants.js         → Formas, conceptos, colores
│   └── index.css            → Tailwind
├── server.js                → API Express (lee/escribe db.json)
├── db.json                  → Base de datos JSON
└── package.json
```

## ✨ Features

- **Tabla** con búsqueda, filtros por forma/concepto y ordenamiento por columnas
- **CRUD completo**: agregar, editar y eliminar gastos
- **Totales** en ARS y USD con tipo de cambio editable
- **Gráficos**: pie chart por forma de pago, pie chart por concepto, barra por concepto
- **Persistencia** en `db.json` (se actualiza en tiempo real)

## 📝 Formas de pago
Lemon · Credito · Wise · Uala · Mercado Pago · Efectivo

## 🏷️ Conceptos
Creditos · Fijos · Comida · Regalos · Ropa · Salidas · Transporte · Otros · Inversiones · Peluquería · Educacion · Salud · Casa · Viaje España
