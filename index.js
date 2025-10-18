const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para analizar JSON
app.use(express.json());

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    mensaje: '¡Bienvenido a tuEstadoApi!',
    estado: 'online',
    version: '1.0.0'
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 