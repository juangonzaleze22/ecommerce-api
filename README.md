# Tu Estado API

API para manejo de estados desarrollada con TypeScript, Express y MongoDB.

## Requisitos

- Node.js (versión 14 o superior)
- npm (versión 6 o superior)
- MongoDB (local o Atlas)

## Instalación

```bash
# Clonar el repositorio
git clone [URL_DEL_REPOSITORIO]
cd tuEstadoApi

# Instalar dependencias
npm install

# Configuración del entorno
# Crea un archivo .env en la raíz del proyecto (ver sección Configuración)
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/tuestadodb
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# Configuración del admin por defecto

```

Para usar MongoDB Atlas en producción:

```bash
MONGODB_URI=mongodb+srv://<usuario>:<contraseña>@cluster0.mongodb.net/tuestadodb?retryWrites=true&w=majority
```

## Comandos disponibles

```bash
# Desarrollo (con recarga automática)
npm run dev

# Compilar a JavaScript
npm run build

# Iniciar en producción
npm start
```

## Estructura del proyecto

```
/src
  /controllers - Controladores de la aplicación
  /routes - Definición de rutas
  /config - Configuraciones (DB, etc.)
  /models - Modelos de datos (Mongoose)
  /middleware - Middleware de la aplicación
  /types - Definiciones de tipos TypeScript
  /utils - Utilidades generales
dist/ - Código compilado (generado con `npm run build`)
```

## Endpoints

### Generales

- `GET /`: Endpoint de bienvenida y verificación del estado de la API.

### Autenticación

- `POST /api/auth/register`: Registro de nuevos clientes (rol 'client' asignado automáticamente)
- `POST /api/auth/login`: Iniciar sesión (cualquier tipo de usuario)
- `GET /api/auth/me`: Obtener información del usuario autenticado (requiere autenticación)
- `POST /api/auth/create-admin`: Crear usuario admin (requiere autenticación con rol 'admin')

### Estados (States)

- `GET /api/states`: Obtener todos los estados
- `GET /api/states/:id`: Obtener un estado por ID
- `POST /api/states`: Crear un nuevo estado
- `PUT /api/states/:id`: Actualizar un estado existente
- `DELETE /api/states/:id`: Eliminar un estado

### Categorías (Categories)

- `GET /api/categories`: Obtener todas las categorías con filtros y paginación
- `GET /api/categories/:id`: Obtener una categoría por ID
- `POST /api/categories`: Crear una nueva categoría (admin)
- `PUT /api/categories/:id`: Actualizar una categoría (admin)
- `DELETE /api/categories/:id`: Eliminar una categoría (admin)
- `PUT /api/categories/:id/toggle-status`: Cambiar estado de categoría (admin)
- `GET /api/categories/search`: Buscar categorías por nombre

### Marcas (Brands)

- `GET /api/brands`: Obtener todas las marcas con filtros y paginación
- `GET /api/brands/:id`: Obtener una marca por ID
- `POST /api/brands`: Crear una nueva marca (admin)
- `PUT /api/brands/:id`: Actualizar una marca (admin)
- `DELETE /api/brands/:id`: Eliminar una marca (admin)
- `PUT /api/brands/:id/toggle-status`: Cambiar estado de marca (admin)
- `GET /api/brands/search`: Buscar marcas por nombre

### Productos (Products)

- `GET /api/products`: Obtener todos los productos con filtros avanzados
- `GET /api/products/:id`: Obtener un producto por ID
- `POST /api/products`: Crear un nuevo producto (admin)
- `PUT /api/products/:id`: Actualizar un producto (admin)
- `DELETE /api/products/:id`: Eliminar un producto (admin)
- `GET /api/products/best-sellers`: Obtener productos más vendidos
- `GET /api/products/best-discounts`: Obtener productos con mejores descuentos
- `GET /api/products/search`: Buscar productos por nombre
- `PUT /api/products/:id/toggle-status`: Cambiar estado de producto (admin)

## Modelos de datos

### User

```typescript
{
  name: string,      // Nombre del usuario
  email: string,     // Email (único)
  password: string,  // Contraseña (encriptada)
  role: string,      // Rol (client, admin)
  createdAt: Date,   // Fecha de creación
  updatedAt: Date    // Fecha de última actualización
}
```

### State

```typescript
{
  name: string,      // Nombre del estado
  code: string,      // Código único del estado
  active: boolean,   // Estado activo/inactivo
  createdAt: Date,   // Fecha de creación
  updatedAt: Date    // Fecha de última actualización
}
```

### Category

```typescript
{
  name: string,      // Nombre de la categoría
  description?: string, // Descripción opcional
  image?: string,    // Imagen de la categoría
  isActive: boolean, // Estado activo/inactivo
  createdAt: Date,   // Fecha de creación
  updatedAt: Date    // Fecha de última actualización
}
```

### Brand

```typescript
{
  name: string,      // Nombre de la marca
  description?: string, // Descripción opcional
  image?: string,    // Imagen de la marca
  isActive: boolean, // Estado activo/inactivo
  createdAt: Date,   // Fecha de creación
  updatedAt: Date    // Fecha de última actualización
}
```

### Product

```typescript
{
  name: string,      // Nombre del producto
  description: string, // Descripción del producto
  price: number,     // Precio del producto
  stock: number,     // Cantidad en stock
  images: string[],  // Array de imágenes del producto
  category: ObjectId, // Referencia a la categoría
  brand?: ObjectId,  // Referencia a la marca (opcional)
  sizes?: string[],  // Tallas disponibles
  colors?: string[], // Colores disponibles
  shoeSizes?: string[], // Tallas de zapatos
  discount?: number, // Porcentaje de descuento
  createdAt: Date,   // Fecha de creación
  updatedAt: Date    // Fecha de última actualización
}
```

## Autenticación y Roles

La API utiliza autenticación basada en tokens JWT. Para acceder a las rutas protegidas:

1. Registra un usuario o inicia sesión para obtener un token
2. Incluye el token en el header de Authorization:
   ```
   Authorization: Bearer <tu_token>
   ```

### Sistema de Roles
- **client**: Usuario regular con acceso limitado
- **admin**: Usuario administrador con acceso completo

### Usuario Administrador Predeterminado
Al iniciar por primera vez la aplicación, se crea automáticamente un usuario administrador con las credenciales especificadas en el archivo `.env` (o valores predeterminados si no se especifican).

**⚠️ Importante:** Cambia la contraseña del administrador predeterminado inmediatamente después del primer inicio.

## Tecnologías utilizadas

- TypeScript
- Express
- MongoDB
- Mongoose
- JWT (JSON Web Tokens)
- bcryptjs
- cookie-parser
- dotenv
- ts-node-dev (desarrollo)
- Node.js 