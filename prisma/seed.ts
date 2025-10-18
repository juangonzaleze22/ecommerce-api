import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuario admin
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      profileImage: 'default.jpg'
    },
  });

  console.log('✅ Usuario admin creado:', admin.email);

  // Crear categorías completas
  const categoriesData = [
    { name: 'Ropa', description: 'Todo tipo de prendas de vestir para hombres, mujeres y niños' },
    { name: 'Zapatos', description: 'Calzado para todas las edades y ocasiones' },
    { name: 'Accesorios', description: 'Complementos y accesorios de moda' },
    { name: 'Deportes', description: 'Ropa y equipamiento deportivo' },
    { name: 'Electrónicos', description: 'Dispositivos electrónicos y tecnología' },
    { name: 'Hogar', description: 'Productos para el hogar y decoración' },
    { name: 'Belleza', description: 'Productos de belleza y cuidado personal' },
    { name: 'Juguetes', description: 'Juguetes y entretenimiento para todas las edades' }
  ];

  const categories = await Promise.all(
    categoriesData.map(categoryData =>
      prisma.category.upsert({
        where: { name: categoryData.name },
        update: {},
        create: {
          name: categoryData.name,
          description: categoryData.description,
          isActive: true
        },
      })
    )
  );

  console.log('✅ Categorías creadas:', categories.map(c => c.name));

  // Crear marcas completas
  const brandsData = [
    { name: 'Nike', description: 'Just Do It - Innovación y rendimiento deportivo' },
    { name: 'Adidas', description: 'Impossible is Nothing - Calidad y estilo deportivo' },
    { name: 'Puma', description: 'Forever Faster - Diseño y funcionalidad' },
    { name: 'Under Armour', description: 'The Only Way Is Through - Tecnología deportiva avanzada' },
    { name: 'New Balance', description: 'Fearlessly Independent - Calidad y comodidad' },
    { name: 'Converse', description: 'Shoes are boring, wear sneakers - Estilo clásico' },
    { name: 'Vans', description: 'Off the Wall - Cultura skate y streetwear' },
    { name: 'Reebok', description: 'Be More Human - Fitness y estilo de vida activo' },
    { name: 'ASICS', description: 'Sound Mind, Sound Body - Tecnología japonesa' },
    { name: 'Saucony', description: 'Run for Good - Rendimiento y sostenibilidad' }
  ];

  const brands = await Promise.all(
    brandsData.map(brandData =>
      prisma.brand.upsert({
        where: { name: brandData.name },
        update: {},
        create: {
          name: brandData.name,
          description: brandData.description,
          isActive: true
        },
      })
    )
  );

  console.log('✅ Marcas creadas:', brands.map(b => b.name));

  // Crear estados de México (lista completa)
  const statesData = [
    { name: 'Aguascalientes', code: 'AGU' },
    { name: 'Baja California', code: 'BCN' },
    { name: 'Baja California Sur', code: 'BCS' },
    { name: 'Campeche', code: 'CAM' },
    { name: 'Chiapas', code: 'CHP' },
    { name: 'Chihuahua', code: 'CHH' },
    { name: 'Ciudad de México', code: 'CDMX' },
    { name: 'Coahuila', code: 'COA' },
    { name: 'Colima', code: 'COL' },
    { name: 'Durango', code: 'DUR' },
    { name: 'Estado de México', code: 'MEX' },
    { name: 'Guanajuato', code: 'GUA' },
    { name: 'Guerrero', code: 'GRO' },
    { name: 'Hidalgo', code: 'HID' },
    { name: 'Jalisco', code: 'JAL' },
    { name: 'Michoacán', code: 'MIC' },
    { name: 'Morelos', code: 'MOR' },
    { name: 'Nayarit', code: 'NAY' },
    { name: 'Nuevo León', code: 'NLE' },
    { name: 'Oaxaca', code: 'OAX' },
    { name: 'Puebla', code: 'PUE' },
    { name: 'Querétaro', code: 'QUE' },
    { name: 'Quintana Roo', code: 'ROO' },
    { name: 'San Luis Potosí', code: 'SLP' },
    { name: 'Sinaloa', code: 'SIN' },
    { name: 'Sonora', code: 'SON' },
    { name: 'Tabasco', code: 'TAB' },
    { name: 'Tamaulipas', code: 'TAM' },
    { name: 'Tlaxcala', code: 'TLA' },
    { name: 'Veracruz', code: 'VER' },
    { name: 'Yucatán', code: 'YUC' },
    { name: 'Zacatecas', code: 'ZAC' }
  ];

  const states = await Promise.all(
    statesData.map(stateData =>
      prisma.state.upsert({
        where: { code: stateData.code },
        update: {},
        create: {
          name: stateData.name,
          code: stateData.code
        },
      })
    )
  );

  console.log('✅ Estados creados:', states.map(s => s.name));

  console.log('🎉 Seed completado exitosamente!');
  console.log(`📊 Resumen: ${categories.length} categorías, ${brands.length} marcas, ${states.length} estados`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 