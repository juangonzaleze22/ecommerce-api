# Actualización: Campo de Teléfono en Registro de Usuario

## 📱 **Nuevo Campo Agregado**

Se ha agregado el campo `phone` (teléfono) al proceso de registro de usuarios.

## 🔧 **Cambios en el Backend**

### 1. **Esquema de Base de Datos**
```sql
-- Campo agregado a la tabla users
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

### 2. **Interfaces TypeScript Actualizadas**
```typescript
export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phone?: string; // ✅ NUEVO CAMPO
  role?: 'CLIENT' | 'ADMIN';
  profileImage?: string;
  shippingAgencies?: ShippingAgency[];
}

export interface UserResponseData {
  id: string;
  name: string;
  email: string;
  phone?: string; // ✅ NUEVO CAMPO
  role: string;
  profileImage?: string;
  profileImageUrl?: string;
  shippingAgencies?: ShippingAgency[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. **Controlador de Registro**
- Acepta el campo `phone` en el request
- Guarda el teléfono en la base de datos
- Incluye el teléfono en la respuesta del usuario

## 🎯 **Cambios Requeridos en el Frontend**

### 1. **Actualizar la Interfaz del Servicio**
```typescript
// En tu AuthService
register(data: { 
  name: string; 
  email: string; 
  password: string; 
  phone?: string; // ✅ AGREGAR ESTE CAMPO
  profileImage?: File | null; 
  shippingAgencies?: Array<{
    agencia_id: number;
    estado_id: number;
    nombre: string;
    codigo: string; 
    direccion: string;
    latitud: string;
    longitud: string;
    estado: string;
  }> 
}): Observable<any> {  
  const formData = objectToFormData(data);
  console.log("formData", formData);
  return this.http.post(`${environment.apiUrl}/auth/register`, formData);
}
```

### 2. **Actualizar el Formulario de Registro**
```html
<!-- En tu componente de registro -->
<form [formGroup]="registerForm">
  <input 
    formControlName="name" 
    placeholder="Nombre completo" 
    type="text">
  
  <input 
    formControlName="email" 
    placeholder="Correo electrónico" 
    type="email">
  
  <input 
    formControlName="password" 
    placeholder="Contraseña" 
    type="password">
  
  <!-- ✅ NUEVO CAMPO -->
  <input 
    formControlName="phone" 
    placeholder="Número de teléfono" 
    type="tel">
  
  <!-- Resto de campos... -->
</form>
```

### 3. **Actualizar el FormGroup**
```typescript
// En tu componente
registerForm = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(6)]],
  phone: ['', [Validators.pattern(/^[0-9+\-\s()]+$/)]], // ✅ NUEVO CAMPO
  // Resto de campos...
});
```

### 4. **Actualizar la Llamada al Servicio**
```typescript
// Al enviar el formulario
onSubmit() {
  if (this.registerForm.valid) {
    const formData = {
      name: this.registerForm.value.name,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      phone: this.registerForm.value.phone, // ✅ INCLUIR TELÉFONO
      profileImage: this.selectedFile,
      shippingAgencies: this.selectedAgencies
    };
    
    this.authService.register(formData).subscribe({
      next: (response) => {
        console.log('Usuario registrado:', response);
        // Manejar éxito
      },
      error: (error) => {
        console.error('Error en registro:', error);
        // Manejar error
      }
    });
  }
}
```

## 📋 **Validaciones Recomendadas**

### Frontend
```typescript
// Validaciones para el campo phone
phone: ['', [
  Validators.pattern(/^[0-9+\-\s()]+$/), // Solo números, +, -, espacios, ()
  Validators.minLength(7), // Mínimo 7 caracteres
  Validators.maxLength(20) // Máximo 20 caracteres
]]
```

### Backend
```typescript
// El campo phone es opcional, pero si se proporciona:
// - Máximo 20 caracteres
// - Solo caracteres alfanuméricos, +, -, espacios, ()
// - Se valida automáticamente por Prisma
```

## 🔄 **Migración de Base de Datos**

Para aplicar los cambios en la base de datos:

```bash
# Generar migración
npx prisma migrate dev --name add_phone_field

# O si prefieres resetear la base de datos
npx prisma migrate reset
```

## ✅ **Verificación**

Después de implementar los cambios:

1. **Frontend**: El formulario debe incluir el campo de teléfono
2. **Backend**: Los logs deben mostrar el teléfono recibido
3. **Base de datos**: El campo `phone` debe estar presente en la tabla `users`
4. **Respuesta**: El usuario registrado debe incluir el teléfono en la respuesta

## 📝 **Notas Importantes**

- El campo `phone` es **opcional** - los usuarios pueden registrarse sin teléfono
- El formato de validación permite números internacionales
- El campo se incluye en todas las respuestas de usuario (registro, login, getMe)
- Compatible con la función `objectToFormData` existente
