import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import multer from 'multer';

// Tipos de archivos permitidos
const MIME_TYPE_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

// Directorio para imágenes de perfil
const uploadDirectory = path.join(__dirname, '../../public/uploads/profiles');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
  console.log('✅ Directorio de uploads creado:', uploadDirectory);
}

// Directorio para imágenes de productos
const productUploadDirectory = path.join(__dirname, '../../public/uploads/products');
if (!fs.existsSync(productUploadDirectory)) {
  fs.mkdirSync(productUploadDirectory, { recursive: true });
  console.log('✅ Directorio de uploads de productos creado:', productUploadDirectory);
}

// Directorio para imágenes de categorías
const categoryUploadDirectory = path.join(__dirname, '../../public/uploads/categories');
if (!fs.existsSync(categoryUploadDirectory)) {
  fs.mkdirSync(categoryUploadDirectory, { recursive: true });
  console.log('✅ Directorio de uploads de categorías creado:', categoryUploadDirectory);
}

// Directorio para imágenes de marcas
const brandUploadDirectory = path.join(__dirname, '../../public/uploads/brands');
if (!fs.existsSync(brandUploadDirectory)) {
  fs.mkdirSync(brandUploadDirectory, { recursive: true });
  console.log('✅ Directorio de uploads de marcas creado:', brandUploadDirectory);
}

// Configuración de almacenamiento de multer para perfiles
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error: Error | null = null;
    if (!isValid) {
      error = new Error('Tipo de archivo no válido');
    }
    cb(error, uploadDirectory);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = MIME_TYPE_MAP[file.mimetype];
    cb(null, `${uuidv4()}.${ext}`);
  }
});

// Configuración de almacenamiento de multer para productos
const productStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error: Error | null = null;
    if (!isValid) {
      error = new Error('Tipo de archivo no válido');
    }
    cb(error, productUploadDirectory);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = MIME_TYPE_MAP[file.mimetype];
    cb(null, `${uuidv4()}.${ext}`);
  }
});

// Configuración de almacenamiento de multer para categorías
const categoryStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error: Error | null = null;
    if (!isValid) {
      error = new Error('Tipo de archivo no válido');
    }
    cb(error, categoryUploadDirectory);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = MIME_TYPE_MAP[file.mimetype];
    cb(null, `${uuidv4()}.${ext}`);
  }
});

// Configuración de almacenamiento de multer para marcas
const brandStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const isValid = MIME_TYPE_MAP[file.mimetype];
    let error: Error | null = null;
    if (!isValid) {
      error = new Error('Tipo de archivo no válido');
    }
    cb(error, brandUploadDirectory);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const ext = MIME_TYPE_MAP[file.mimetype];
    cb(null, `${uuidv4()}.${ext}`);
  }
});

// Configuración para comprobantes de pago
export const uploadComprobante = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../public/uploads/comprobantes');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `comprobante-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Permitir solo imágenes y PDFs
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes y PDFs para comprobantes'));
    }
  }
});

// Wrapper con manejo de errores para comprobantes
export const uploadComprobanteWithErrorHandling = (req: Request, res: Response, next: NextFunction) => {
  const runUpload = uploadComprobante.single('comprobante');

  runUpload(req as any, res as any, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'El archivo es demasiado grande. Tamaño máximo: 5MB' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: 'Campo de archivo no esperado. Usa el campo "comprobante".' });
      }
      return res.status(400).json({ success: false, message: `Error en la subida de archivo: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Error en la subida de archivo' });
    }
    next();
  });
};

// Función para validar los archivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (MIME_TYPE_MAP[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no válido. Solo se permiten PNG, JPG, JPEG, GIF y WEBP.'));
  }
};

// Exportar el middleware configurado para perfiles
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter
});

// Exportar el middleware configurado para productos
export const uploadProductImages = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter
});

// Exportar el middleware configurado para categorías
export const uploadCategoryImage = multer({
  storage: categoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter
});

// Exportar el middleware configurado para marcas
export const uploadBrandImage = multer({
  storage: brandStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter
});

// Middleware personalizado para manejar errores de Multer en productos
export const uploadProductImagesWithErrorHandling = (req: Request, res: Response, next: NextFunction) => {
  const upload = uploadProductImages.array('images', 5);
  
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Tamaño máximo: 5MB'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Campo de archivo no esperado. Asegúrate de usar el campo "images" para las imágenes del producto.'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Demasiados archivos. Máximo 5 imágenes por producto.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Error en la subida de archivo: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Error en la subida de archivo'
      });
    }
    
    next();
  });
};

// Función para eliminar la imagen anterior del usuario (si existe y no es default.png)
export const deleteOldProfileImage = (filename: string | undefined): void => {
  if (!filename || filename === 'default.png') return;
  const filePath = path.join(uploadDirectory, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Función para eliminar imágenes de productos
export const deleteProductImages = (images: string[] | undefined): void => {
  if (!images || !Array.isArray(images)) return;
  
  images.forEach(filename => {
    if (filename) {
      const filePath = path.join(productUploadDirectory, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`✅ Imagen de producto eliminada: ${filename}`);
        } catch (error) {
          console.error(`❌ Error eliminando imagen ${filename}:`, error);
        }
      }
    }
  });
};

// Función para eliminar imagen de categoría
export const deleteCategoryImage = (filename: string | undefined): void => {
  if (!filename) return;
  const filePath = path.join(categoryUploadDirectory, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Imagen de categoría eliminada: ${filename}`);
    } catch (error) {
      console.error(`❌ Error eliminando imagen de categoría ${filename}:`, error);
    }
  }
};

// Función para eliminar imagen de marca
export const deleteBrandImage = (filename: string | undefined): void => {
  if (!filename) return;
  const filePath = path.join(brandUploadDirectory, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Imagen de marca eliminada: ${filename}`);
    } catch (error) {
      console.error(`❌ Error eliminando imagen de marca ${filename}:`, error);
    }
  }
};

// Función para obtener la URL completa de la imagen de perfil
export const getProfileImageUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/profiles/${filename}`;
};

// Función para obtener la URL completa de la imagen de producto
export const getProductImageUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/products/${filename}`;
};

// Función para obtener la URL completa de la imagen de categoría
export const getCategoryImageUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/categories/${filename}`;
};

// Función para obtener la URL completa de la imagen de marca
export const getBrandImageUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/brands/${filename}`;
};

// Función para obtener la URL completa del comprobante
export const getComprobanteUrl = (req: Request, filename: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/comprobantes/${filename}`;
};

// Función para limpiar archivos huérfanos de productos
// Nota: La limpieza de archivos huérfanos se implementa en `src/utils/cleanupOrphanedFiles.ts`

// Función para limpiar archivos huérfanos de categorías
// Nota: La limpieza de archivos huérfanos se implementa en `src/utils/cleanupOrphanedFiles.ts`

// Función para limpiar archivos huérfanos de marcas
// Nota: La limpieza de archivos huérfanos se implementa en `src/utils/cleanupOrphanedFiles.ts`