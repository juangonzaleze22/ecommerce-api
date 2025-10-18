import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔍 Probando conexión a PostgreSQL...');
    console.log('📡 URL de conexión:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@'));
    
    // Intentar conectar
    await prisma.$connect();
    console.log('✅ Conexión exitosa a PostgreSQL!');
    
    // Probar una consulta simple
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 Versión de PostgreSQL:', result);
    
    // Verificar si las tablas existen
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Tablas existentes:', tables);
    
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verifica que PostgreSQL esté ejecutándose');
    console.log('2. Verifica las credenciales en .env');
    console.log('3. Verifica que la base de datos "tuestadodb" exista');
    console.log('4. Verifica que el puerto 5432 esté disponible');
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 