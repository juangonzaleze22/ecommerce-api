import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Directorios de uploads
const productUploadDirectory = path.join(__dirname, '../../public/uploads/products');
const categoryUploadDirectory = path.join(__dirname, '../../public/uploads/categories');

// Función para limpiar archivos huérfanos de productos
const cleanupOrphanedProductImages = async (): Promise<void> => {
  try {
    console.log('🔍 Buscando archivos huérfanos de productos...');
    
    // Obtener todas las imágenes referenciadas en la base de datos
    const products = await prisma.product.findMany({
      select: { images: true }
    });
    
    const referencedImages = new Set<string>();
    
    products.forEach((product: any) => {
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((image: any) => {
          if (image) referencedImages.add(image);
        });
      }
    });
    
    console.log(`📊 Imágenes referenciadas en BD: ${referencedImages.size}`);
    
    // Verificar si el directorio existe
    if (!fs.existsSync(productUploadDirectory)) {
      console.log('❌ Directorio de productos no existe');
      return;
    }
    
    // Leer todos los archivos en el directorio de productos
    const files = fs.readdirSync(productUploadDirectory);
    console.log(`📁 Archivos en directorio: ${files.length}`);
    
    let deletedCount = 0;
    
    // Eliminar archivos que no están referenciados
    files.forEach(filename => {
      if (!referencedImages.has(filename)) {
        const filePath = path.join(productUploadDirectory, filename);
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Archivo huérfano eliminado: ${filename}`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Error eliminando archivo huérfano ${filename}:`, error);
        }
      }
    });
    
    console.log(`✅ Limpieza completada. ${deletedCount} archivos eliminados`);
  } catch (error) {
    console.error('❌ Error en limpieza de archivos huérfanos de productos:', error);
  }
};

// Función para limpiar archivos huérfanos de categorías
const cleanupOrphanedCategoryImages = async (): Promise<void> => {
  try {
    console.log('🔍 Buscando archivos huérfanos de categorías...');
    
    // Obtener todas las imágenes referenciadas en la base de datos
    const categories = await prisma.category.findMany({
      select: { image: true }
    });
    
    const referencedImages = new Set<string>();
    
    categories.forEach((category: any) => {
      if (category.image) {
        referencedImages.add(category.image);
      }
    });
    
    console.log(`📊 Imágenes de categorías referenciadas en BD: ${referencedImages.size}`);
    
    // Verificar si el directorio existe
    if (!fs.existsSync(categoryUploadDirectory)) {
      console.log('❌ Directorio de categorías no existe');
      return;
    }
    
    // Leer todos los archivos en el directorio de categorías
    const files = fs.readdirSync(categoryUploadDirectory);
    console.log(`📁 Archivos en directorio de categorías: ${files.length}`);
    
    let deletedCount = 0;
    
    // Eliminar archivos que no están referenciados
    files.forEach(filename => {
      if (!referencedImages.has(filename)) {
        const filePath = path.join(categoryUploadDirectory, filename);
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Archivo huérfano eliminado: ${filename}`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Error eliminando archivo huérfano ${filename}:`, error);
        }
      }
    });
    
    console.log(`✅ Limpieza completada. ${deletedCount} archivos eliminados`);
  } catch (error) {
    console.error('❌ Error en limpieza de archivos huérfanos de categorías:', error);
  }
};

// Función principal
const main = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando limpieza de archivos huérfanos...');
    
    // Conectar a la base de datos
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // Ejecutar limpieza
    await cleanupOrphanedProductImages();
    console.log('---');
    await cleanupOrphanedCategoryImages();
    
    console.log('🎉 Proceso de limpieza completado');
  } catch (error) {
    console.error('❌ Error en el proceso de limpieza:', error);
  } finally {
    await prisma.$disconnect();
    console.log('👋 Desconectado de PostgreSQL');
    process.exit(0);
  }
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
} 