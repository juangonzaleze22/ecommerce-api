// Controlador para la página de inicio
exports.welcome = (req, res) => {
  res.json({
    mensaje: '¡Bienvenido a tuEstadoApi!',
    estado: 'online',
    version: '1.0.0'
  });
}; 