import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

// Función para obtener la URL base del servidor
function getServerUrl(): string {
  // Si está definida SERVER_URL, usarla (para producción)
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL;
  }
  
  // Si no, construir la URL local
  const port = process.env.PORT || '3000';
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${protocol}://localhost:${port}`;
}

// Función helper para construir rutas de imágenes completas
function getImageUrl(imagePath: string): string {
  const serverUrl = getServerUrl();
  // Remover el slash inicial si existe para evitar doble slash
  const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  return `${serverUrl}/${cleanPath}`;
}

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');
  console.log('🌐 URL del servidor:', getServerUrl());

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

  // Obtener referencias a categorías y marcas por nombre
  const getCategoryByName = (name: string) => categories.find(c => c.name === name)!;
  const getBrandByName = (name: string) => brands.find(b => b.name === name);

  // Crear 20 productos de prueba distribuidos en diferentes categorías y marcas
  const productsData = [
    // ZAPATOS (4 productos)
    {
      name: 'Nike Air Max 90',
      description: 'Zapatillas deportivas icónicas con tecnología de aire visible. Perfectas para correr y uso diario. Material transpirable y suela de goma resistente.',
      price: 129.99,
      stock: 50,
      discount: 0,
      category: getCategoryByName('Zapatos'),
      brand: getBrandByName('Nike'),
      sizes: ['38', '39', '40', '41', '42', '43', '44'],
      colors: ['#000000', '#FFFFFF', '#0000FF'],
      shoeSizes: ['38', '39', '40', '41', '42', '43', '44'],
      images: ['nike-air-max-90-1.webp', 'nike-air-max-90-2.webp']
    },
    {
      name: 'Adidas Ultraboost 22',
      description: 'Zapatillas de running de alto rendimiento con tecnología Boost. Máxima comodidad y amortiguación para corredores.',
      price: 179.99,
      stock: 35,
      discount: 15,
      category: getCategoryByName('Zapatos'),
      brand: getBrandByName('Adidas'),
      sizes: ['39', '40', '41', '42', '43', '44', '45'],
      colors: ['#000000', '#FFFFFF'],
      shoeSizes: ['39', '40', '41', '42', '43', '44', '45'],
      images: ['adidas-ultraboost-22-1.webp', 'adidas-ultraboost-22-2.webp']
    },
    {
      name: 'Puma RS-X',
      description: 'Sneakers con diseño retro y moderno. Estilo único para el día a día. Suela de goma duradera y cómoda.',
      price: 89.99,
      stock: 40,
      discount: 0,
      category: getCategoryByName('Zapatos'),
      brand: getBrandByName('Puma'),
      sizes: ['36', '37', '38', '39', '40', '41', '42', '43'],
      colors: ['#000000', '#FF0000', '#FFFFFF'],
      shoeSizes: ['36', '37', '38', '39', '40', '41', '42', '43'],
      images: ['puma-rsx-1.webp', 'puma-rsx-2.webp']
    },
    {
      name: 'Converse Chuck Taylor All Star',
      description: 'Zapatillas clásicas de lona. Diseño icónico que nunca pasa de moda. Perfectas para uso casual.',
      price: 64.99,
      stock: 60,
      discount: 10,
      category: getCategoryByName('Zapatos'),
      brand: getBrandByName('Converse'),
      sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43'],
      colors: ['#000000', '#FFFFFF', '#FF0000'],
      shoeSizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43'],
      images: ['converse-chuck-1.webp', 'converse-chuck-2.webp']
    },
    
    // ROPA (4 productos)
    {
      name: 'Nike Dri-FIT Training T-Shirt',
      description: 'Camiseta de entrenamiento con tecnología Dri-FIT que absorbe el sudor. Ideal para gimnasio y deportes. Manga corta y ajuste cómodo.',
      price: 34.99,
      stock: 80,
      discount: 0,
      category: getCategoryByName('Ropa'),
      brand: getBrandByName('Nike'),
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#000000', '#FFFFFF', '#0000FF', '#808080'],
      images: ['nike-tshirt-1.webp', 'nike-tshirt-2.webp']
    },
    {
      name: 'Adidas Essentials 3-Stripes Pants',
      description: 'Pantalones deportivos cómodos con las tres rayas clásicas. Tejido suave y elástico. Perfectos para entrenar o relajarse.',
      price: 59.99,
      stock: 45,
      discount: 20,
      category: getCategoryByName('Ropa'),
      brand: getBrandByName('Adidas'),
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['#000000', '#808080', '#0000FF'],
      images: ['adidas-pants-1.webp', 'adidas-pants-2.webp']
    },
    {
      name: 'Under Armour HeatGear Hoodie',
      description: 'Sudadera ligera con tecnología HeatGear. Mantiene el cuerpo fresco durante entrenamientos intensos. Capucha ajustable.',
      price: 79.99,
      stock: 30,
      discount: 0,
      category: getCategoryByName('Ropa'),
      brand: getBrandByName('Under Armour'),
      sizes: ['M', 'L', 'XL', 'XXL'],
      colors: ['#000000', '#404040', '#000080'],
      images: ['ua-hoodie-1.webp', 'ua-hoodie-2.webp']
    },
    {
      name: 'Puma Classic Shorts',
      description: 'Shorts deportivos clásicos con cinturilla elástica. Tejido transpirable y ligero. Ideales para correr o entrenar.',
      price: 29.99,
      stock: 70,
      discount: 15,
      category: getCategoryByName('Ropa'),
      brand: getBrandByName('Puma'),
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#000000', '#FFFFFF', '#0000FF'],
      images: ['puma-shorts-1.webp', 'puma-shorts-2.webp']
    },
    
    // DEPORTES (3 productos)
    {
      name: 'New Balance Running Jacket',
      description: 'Chaqueta para correr con protección contra el viento y la lluvia. Reflectantes para seguridad nocturna. Muy ligera.',
      price: 89.99,
      stock: 25,
      discount: 0,
      category: getCategoryByName('Deportes'),
      brand: getBrandByName('New Balance'),
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['#000000', '#0000FF'],
      images: ['nb-jacket-1.webp', 'nb-jacket-2.webp']
    },
    {
      name: 'Reebok CrossFit Gloves',
      description: 'Guantes de entrenamiento con protección en palmas y dedos. Mejora el agarre durante levantamiento de pesas. Talla única.',
      price: 24.99,
      stock: 50,
      discount: 10,
      category: getCategoryByName('Deportes'),
      brand: getBrandByName('Reebok'),
      sizes: [],
      colors: ['#000000', '#FF0000'],
      images: ['reebok-gloves-1.webp', 'reebok-gloves-2.webp']
    },
    {
      name: 'ASICS Running Cap',
      description: 'Gorra para correr con visera curva y tecnología de absorción de sudor. Ajuste cómodo y transpirable. Perfecta para días soleados.',
      price: 19.99,
      stock: 40,
      discount: 0,
      category: getCategoryByName('Deportes'),
      brand: getBrandByName('ASICS'),
      sizes: [],
      colors: ['#000000', '#FFFFFF', '#0000FF'],
      images: ['asics-cap-1.webp', 'asics-cap-2.webp']
    },
    
    // ACCESORIOS (3 productos)
    {
      name: 'Vans Classic Backpack',
      description: 'Mochila clásica estilo skate. Espaciosa con bolsillos frontales. Correas ajustables y resistente. Perfecta para el día a día.',
      price: 49.99,
      stock: 35,
      discount: 0,
      category: getCategoryByName('Accesorios'),
      brand: getBrandByName('Vans'),
      sizes: [],
      colors: ['#000000', '#0000FF', '#FF0000'],
      images: ['vans-backpack-1.webp', 'vans-backpack-2.webp']
    },
    {
      name: 'Saucony Running Socks Pack',
      description: 'Pack de 3 pares de calcetines técnicos para running. Tecnología de compresión y absorción de humedad. Tallas disponibles.',
      price: 16.99,
      stock: 60,
      discount: 15,
      category: getCategoryByName('Accesorios'),
      brand: getBrandByName('Saucony'),
      sizes: ['S', 'M', 'L'],
      colors: ['#000000', '#FFFFFF', '#808080'],
      images: ['saucony-socks-1.webp']
    },
    {
      name: 'Nike Sport Wristband',
      description: 'Muñequeras deportivas absorbentes. Paquete de 2 unidades. Tejido transpirable y cómodo. Ideal para gimnasio y running.',
      price: 12.99,
      stock: 100,
      discount: 0,
      category: getCategoryByName('Accesorios'),
      brand: getBrandByName('Nike'),
      sizes: [],
      colors: ['#000000', '#FFFFFF'],
      images: ['nike-wristband-1.webp', 'nike-wristband-2.jpg']
    },
    
    // ELECTRÓNICOS (2 productos - sin marca específica)
    {
      name: 'Smartwatch Fitness Pro',
      description: 'Reloj inteligente con monitoreo de frecuencia cardíaca, GPS integrado y resistencia al agua. Batería de larga duración. Compatible con iOS y Android.',
      price: 199.99,
      stock: 20,
      discount: 25,
      category: getCategoryByName('Electrónicos'),
      brand: null,
      sizes: [],
      colors: ['#000000', '#C0C0C0', '#FFC0CB'],
      images: ['smartwatch-1.jpg', 'smartwatch-2.jpg']
    },
    {
      name: 'Auriculares Bluetooth Deportivos',
      description: 'Auriculares inalámbricos resistentes al agua y sudor. Sonido de alta calidad con cancelación de ruido. Hasta 8 horas de batería.',
      price: 79.99,
      stock: 40,
      discount: 10,
      category: getCategoryByName('Electrónicos'),
      brand: null,
      sizes: [],
      colors: ['#000000', '#FFFFFF', '#0000FF'],
      images: ['earbuds-1.jpg', 'earbuds-2.webp']
    },
    
    // HOGAR (2 productos - sin marca específica)
    {
      name: 'Alfombra de Yoga Premium',
      description: 'Alfombra de yoga antideslizante con grosor de 5mm. Material ecológico TPE. Incluye correa de transporte. Tamaño estándar.',
      price: 39.99,
      stock: 30,
      discount: 0,
      category: getCategoryByName('Hogar'),
      brand: null,
      sizes: [],
      colors: ['#800080', '#0000FF', '#FFC0CB', '#000000'],
      images: ['yoga-mat-1.webp', 'yoga-mat-2.webp']
    },
    {
      name: 'Báscula Digital Inteligente',
      description: 'Báscula digital con conexión Bluetooth y app móvil. Mide peso, grasa corporal, músculo y agua. Pantalla LED grande.',
      price: 49.99,
      stock: 25,
      discount: 20,
      category: getCategoryByName('Hogar'),
      brand: null,
      sizes: [],
      colors: ['#FFFFFF', '#000000'],
      images: ['scale-1.webp', 'scale-2.webp']
    },
    
    // BELLEZA (1 producto - sin marca específica)
    {
      name: 'Set de Toallas Deportivas',
      description: 'Set de 3 toallas microfibra para gimnasio. Absorción rápida y secado rápido. Compactas y ligeras. Incluye bolsa de transporte.',
      price: 29.99,
      stock: 45,
      discount: 0,
      category: getCategoryByName('Belleza'),
      brand: null,
      sizes: [],
      colors: ['#000000', '#808080', '#0000FF'],
      images: ['gym-towels-1.webp', 'gym-towels-2.webp']
    },
    
    // JUGUETES (1 producto - sin marca específica)
    {
      name: 'Pelota de Fútbol Oficial',
      description: 'Balón de fútbol tamaño oficial con diseño clásico. Material de cuero sintético resistente. Cámara de aire integrada. Cumple estándares FIFA.',
      price: 34.99,
      stock: 35,
      discount: 15,
      category: getCategoryByName('Juguetes'),
      brand: null,
      sizes: ['5 (Oficial)', '4', '3'],
      colors: ['#FFFFFF', '#000000', '#FF0000', '#0000FF'],
      images: ['soccer-ball-1.webp']
    }
  ];

  // Crear productos usando upsert para evitar duplicados
  const createdProducts = await Promise.all(
    productsData.map(async (productData) => {
      const { category, brand, ...productInfo } = productData;
      
      // Buscar si el producto ya existe (por nombre)
      const existing = await prisma.product.findFirst({
        where: { name: productInfo.name }
      });

      if (existing) {
        // Si existe, actualizarlo
        return await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...productInfo,
            categoryId: category.id,
            brandId: brand?.id || null,
          }
        });
      } else {
        // Si no existe, crearlo
        return await prisma.product.create({
          data: {
            ...productInfo,
            categoryId: category.id,
            brandId: brand?.id || null,
          }
        });
      }
    })
  );

  console.log('✅ Productos creados:', createdProducts.length);
  
  // Contar productos por categoría
  const zapatosCategory = getCategoryByName('Zapatos');
  const ropaCategory = getCategoryByName('Ropa');
  const deportesCategory = getCategoryByName('Deportes');
  const accesoriosCategory = getCategoryByName('Accesorios');
  const otrosCategories = categories.filter(c => 
    !['Zapatos', 'Ropa', 'Deportes', 'Accesorios'].includes(c.name)
  );
  
  console.log(`   - Zapatos: ${createdProducts.filter(p => p.categoryId === zapatosCategory.id).length}`);
  console.log(`   - Ropa: ${createdProducts.filter(p => p.categoryId === ropaCategory.id).length}`);
  console.log(`   - Deportes: ${createdProducts.filter(p => p.categoryId === deportesCategory.id).length}`);
  console.log(`   - Accesorios: ${createdProducts.filter(p => p.categoryId === accesoriosCategory.id).length}`);
  console.log(`   - Otros: ${createdProducts.filter(p => otrosCategories.some(c => c.id === p.categoryId)).length}`);

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
  console.log(`📊 Resumen: ${categories.length} categorías, ${brands.length} marcas, ${createdProducts.length} productos, ${states.length} estados`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 