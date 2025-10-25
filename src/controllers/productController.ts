import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { ProductData, ProductResponseData } from '../types/interfaces';
import { getProductImageUrl, deleteProductImages } from '../utils/fileUpload';

// Función helper para agregar URLs de imágenes a un producto
const addImageUrlsToProduct = (product: any, req: Request) => {
  const productObj = product;
  
  // Reemplazar el array de nombres de archivo con URLs completas
  if (productObj.images && Array.isArray(productObj.images)) {
    productObj.images = productObj.images.map((image: string) => 
      getProductImageUrl(req, image)
    );
  }

  // Ajustar price y oldPrice según descuento
  const price = Number(productObj.price);
  const discount = Number(productObj.discount);
  
  if (typeof price === 'number' && !isNaN(price) && typeof discount === 'number' && !isNaN(discount) && discount > 0) {
    productObj.oldPrice = price;
    productObj.price = Math.round(price * (1 - discount / 100));
  } else {
    productObj.oldPrice = price;
  }
  
  return productObj;
};

// Función helper para agregar URLs de imágenes a un array de productos
const addImageUrlsToProducts = (products: any[], req: Request) => {
  return products.map(product => addImageUrlsToProduct(product, req));
};

// Get all products with pagination and filters
export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    
    // Parámetros de filtrado
    const { search, category, brand, inStock, color, sizes, minPrice, maxPrice, sortPrice, active, onSale, sortBy, discount, discountMin, discountMax } = req.query;
    
    // Construir filtros
    const whereClause: any = {};
    
    // Filtrado por stock: Por defecto solo productos con stock, excepto para administradores
    const userRole = (req as any).user?.role;
    if (userRole === 'ADMIN') {
      console.log('🔓 [STOCK FILTER] Admin detectado - mostrando todos los productos');
      // Los administradores pueden ver todos los productos (con y sin stock)
    } else {
      // Por defecto (usuarios no autenticados y clientes) solo productos con stock
      whereClause.stock = { gt: 0 };
      console.log('🔒 [STOCK FILTER] Usuario no autenticado/Cliente - mostrando solo productos con stock');
    }
    
    // Filtro por nombre (búsqueda parcial)
    if (search && typeof search === 'string') {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    // Filtro por categoría (ahora acepta múltiples IDs separados por coma)
    if (category && typeof category === 'string') {
      const categoryArray = category.split(',').map((c: string) => c.trim());
      if (categoryArray.length > 1) {
        whereClause.categoryId = { in: categoryArray };
      } else {
        whereClause.categoryId = categoryArray[0];
      }
    }
    
    // Filtro por marca (ahora acepta múltiples IDs separados por coma)
    if (brand && typeof brand === 'string') {
      const brandArray = brand.split(',').map((b: string) => b.trim());
      if (brandArray.length > 1) {
        whereClause.brandId = { in: brandArray };
      } else {
        whereClause.brandId = brandArray[0];
      }
    }
    
    // Filtro por stock disponible (solo para administradores)
    if (inStock !== undefined && userRole === 'ADMIN') {
      if (inStock === 'true' || inStock === '1') {
        whereClause.stock = { gt: 0 }; // Productos con stock > 0
      } else if (inStock === 'false' || inStock === '0') {
        whereClause.stock = { lte: 0 }; // Productos sin stock
      }
    }

    // Filtro por color (value exacto)
    if (color && typeof color === 'string') {
      const colorArray = color.split(',').map((c: string) => c.trim());
      whereClause.colors = { hasSome: colorArray };
    }

    // Filtro por sizes
    if (sizes && typeof sizes === 'string') {
      const sizesArray = sizes.split(',').map((s: string) => s.trim());
      whereClause.sizes = { hasSome: sizesArray };
    }

    // Filtro por rango de precio
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = Number(minPrice);
      if (maxPrice) whereClause.price.lte = Number(maxPrice);
    }

    // Filtro por descuento exacto o rango de descuento
    if (discount !== undefined) {
      whereClause.discount = Number(discount);
    } else if (discountMin !== undefined || discountMax !== undefined) {
      whereClause.discount = {};
      if (discountMin !== undefined) whereClause.discount.gte = Number(discountMin);
      if (discountMax !== undefined) whereClause.discount.lte = Number(discountMax);
    }

    // Filtro por estado activo - por defecto solo productos activos
    if (active !== undefined) {
      if (active === 'true' || active === '1') {
        whereClause.isActive = true;
      } else if (active === 'false' || active === '0') {
        whereClause.isActive = false;
      }
    } else {
      // Por defecto, solo mostrar productos activos
      whereClause.isActive = true;
    }

    // Filtro por productos en oferta (descuento > 0)
    if (onSale === 'true' || onSale === '1') {
      whereClause.discount = { gt: 0 };
    }

    // Ordenamiento por precio o por recientes
    let orderBy: any = {};
    if (sortPrice && (sortPrice === 'asc' || sortPrice === 'desc')) {
      orderBy.price = sortPrice;
    } else if (sortBy === 'recent') {
      orderBy.createdAt = 'desc'; // Más recientes primero
    } else {
      orderBy.createdAt = 'desc'; // Por defecto, más recientes
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          }
        },
        skip,
        take: limit,
        orderBy
      }),
      prisma.product.count({ where: whereClause })
    ]);
    
    // Agregar URLs de imágenes a cada producto
    const productsWithUrls = addImageUrlsToProducts(products, req);
    
    res.json({
      success: true,
      data: productsWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        search: search || null,
        category: category || null,
        brand: brand || null,
        inStock: inStock || null,
        color: color || null,
        sizes: sizes || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        sortPrice: sortPrice || null,
        active: active || null,
        onSale: onSale || null,
        sortBy: sortBy || null,
        discount: discount || null,
        discountMin: discountMin || null,
        discountMax: discountMax || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching products', error });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    // Filtrado por stock: Por defecto solo productos con stock, excepto para administradores
    const userRole = (req as any).user?.role;
    const whereClause: any = { 
      id: req.params.id,
      isActive: true // Solo productos activos
    };
    
    if (userRole !== 'ADMIN') {
      // Por defecto (usuarios no autenticados y clientes) solo productos con stock
      whereClause.stock = { gt: 0 };
      console.log('🔒 [STOCK FILTER] Usuario no autenticado/Cliente - verificando stock del producto');
    } else {
      console.log('🔓 [STOCK FILTER] Admin detectado - puede ver cualquier producto');
    }
    
    const product = await prisma.product.findFirst({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        }
      }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Agregar URLs de imágenes al producto
    const productWithUrls = addImageUrlsToProduct(product, req);
    
    res.json({ success: true, data: productWithUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching product', error });
  }
};

// Create new product (admin only)
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, stock, categoryId, brandId, sizes, colors, shoeSizes, discount, isActive } = req.body;
    let images: string[] = [];
    
    // Validar que se proporcione categoryId
    if (!categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: 'categoryId is required' 
      });
    }
    
    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }
    
    // Verificar que la marca existe si se proporciona
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId }
      });
      
      if (!brand) {
        return res.status(400).json({ 
          success: false, 
          message: 'Brand not found' 
        });
      }
    }
    
    if ((req as any).files && Array.isArray((req as any).files)) {
      images = (req as any).files.map((file: any) => file.filename);
    } else if (req.body.images) {
      images = req.body.images;
    }
    
    // Procesar tallas, colores y tallas de zapatos para creación
    let processedSizes = [];
    let processedColors = [];
    let processedShoeSizes = [];

    // Procesar tallas
    if (sizes !== undefined) {
      if (Array.isArray(sizes)) {
        processedSizes = sizes;
      } else if (typeof sizes === 'string') {
        try {
          processedSizes = JSON.parse(sizes);
        } catch {
          processedSizes = sizes.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }
    }

    // Procesar colores
    if (colors !== undefined) {
      if (Array.isArray(colors)) {
        processedColors = colors;
      } else if (typeof colors === 'string') {
        try {
          processedColors = JSON.parse(colors);
        } catch {
          processedColors = colors.split(',').map(c => c.trim()).filter(c => c.length > 0);
        }
      }
    }

    // Procesar tallas de zapatos
    if (shoeSizes !== undefined) {
      if (Array.isArray(shoeSizes)) {
        processedShoeSizes = shoeSizes;
      } else if (typeof shoeSizes === 'string') {
        try {
          processedShoeSizes = JSON.parse(shoeSizes);
        } catch {
          processedShoeSizes = shoeSizes.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }
    }
    
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        categoryId,
        brandId,
        images,
        sizes: processedSizes,
        colors: processedColors,
        shoeSizes: processedShoeSizes,
        discount: Number(discount) || 0,
        isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        }
      }
    });
    
    // Agregar URLs de imágenes al producto
    const productWithUrls = addImageUrlsToProduct(product, req);
    
    res.status(201).json({ success: true, data: productWithUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating product', error });
  }
};

// Update product (admin only)
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, stock, categoryId, brandId, sizes, colors, shoeSizes, discount, isActive, images: bodyImages } = req.body;
    let images: string[];
    
    // Log de depuración para ver qué datos llegan
    console.log('🔍 [UPDATE DEBUG] Datos recibidos:', {
      sizes: sizes,
      colors: colors,
      shoeSizes: shoeSizes,
      sizesType: typeof sizes,
      colorsType: typeof colors,
      shoeSizesType: typeof shoeSizes
    });
    
    // Obtener el producto actual para verificar sus imágenes
    const currentProduct = await prisma.product.findUnique({
      where: { id: req.params.id }
    });
    
    if (!currentProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) {
      const newImages = (req as any).files.map((file: any) => file.filename);
      // Concatenar las nuevas imágenes con las existentes
      images = [...(currentProduct.images || []), ...newImages];
    } else if (bodyImages && Array.isArray(bodyImages) && bodyImages.length > 0) {
      images = bodyImages;
    } else {
      // Si no llegan imágenes nuevas, mantener las actuales
      images = currentProduct.images;
    }
    
    // Procesar tallas, colores y tallas de zapatos
    let processedSizes = [];
    let processedColors = [];
    let processedShoeSizes = [];

    // Procesar tallas
    if (sizes !== undefined) {
      if (Array.isArray(sizes)) {
        processedSizes = sizes;
      } else if (typeof sizes === 'string') {
        try {
          processedSizes = JSON.parse(sizes);
        } catch {
          // Si no es JSON válido, tratar como string separado por comas
          processedSizes = sizes.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }
    } else {
      // Si no se envían tallas, mantener las actuales
      processedSizes = currentProduct.sizes || [];
    }

    // Procesar colores
    if (colors !== undefined) {
      if (Array.isArray(colors)) {
        processedColors = colors;
      } else if (typeof colors === 'string') {
        try {
          processedColors = JSON.parse(colors);
        } catch {
          // Si no es JSON válido, tratar como string separado por comas
          processedColors = colors.split(',').map(c => c.trim()).filter(c => c.length > 0);
        }
      }
    } else {
      // Si no se envían colores, mantener los actuales
      processedColors = currentProduct.colors || [];
    }

    // Procesar tallas de zapatos
    if (shoeSizes !== undefined) {
      if (Array.isArray(shoeSizes)) {
        processedShoeSizes = shoeSizes;
      } else if (typeof shoeSizes === 'string') {
        try {
          processedShoeSizes = JSON.parse(shoeSizes);
        } catch {
          // Si no es JSON válido, tratar como string separado por comas
          processedShoeSizes = shoeSizes.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }
    } else {
      // Si no se envían tallas de zapatos, mantener las actuales
      processedShoeSizes = currentProduct.shoeSizes || [];
    }

    console.log('🔍 [UPDATE DEBUG] Datos procesados:', {
      processedSizes,
      processedColors,
      processedShoeSizes
    });

    const updateData: any = {
      name,
      description,
      price: Number(price),
      stock: Number(stock),
      categoryId,
      brandId,
      sizes: processedSizes,
      colors: processedColors,
      shoeSizes: processedShoeSizes,
      discount: Number(discount) || 0,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
      images
    };
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        }
      }
    });
    
    // Agregar URLs de imágenes al producto
    const productWithUrls = addImageUrlsToProduct(product, req);
    
    console.log('🔍 [UPDATE DEBUG] Producto actualizado:', {
      id: product.id,
      sizes: product.sizes,
      colors: product.colors,
      shoeSizes: product.shoeSizes
    });
    
    res.json({ success: true, data: productWithUrls });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(500).json({ success: false, message: 'Error updating product', error });
  }
};

// Delete product (admin only)
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    // Primero obtener el producto para acceder a sus imágenes
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Eliminar las imágenes del producto del sistema de archivos
    deleteProductImages(product.images);

    // Eliminar el producto de la base de datos
    await prisma.product.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true, message: 'Product and associated images deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(500).json({ success: false, message: 'Error deleting product', error });
  }
};

// Get best-selling products
export const getBestSellers = async (req: Request, res: Response) => {
  try {
    // Obtener productos más vendidos basado en órdenes completadas
    const bestSellers = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: {
            in: ['PROCESSING', 'SHIPPED', 'DELIVERED']
          }
        }
      },
      _sum: {
        quantity: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    });

    // Obtener los productos con sus detalles
    const productsWithDetails = await Promise.all(
      bestSellers.map(async (item: any) => {
        const product = await prisma.product.findFirst({
          where: { 
            id: item.productId,
            isActive: true // Solo productos activos
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true
              }
            },
            brand: {
              select: {
                id: true,
                name: true,
                description: true,
                image: true
              }
            }
          }
        });
        
        return {
          product,
          totalSold: item._sum.quantity
        };
      })
    );

    // Filtrar productos que existen y agregar URLs
    const validProducts = productsWithDetails
      .filter(item => item.product)
      .map(item => ({
        ...item,
        product: addImageUrlsToProduct(item.product, req)
      }));
    
    res.json({ success: true, data: validProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching best sellers', error });
  }
};

// Get products with best discounts
export const getBestDiscounts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { 
        discount: { gt: 0 },
        isActive: true // Solo productos activos
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        }
      },
      orderBy: { discount: 'desc' },
      take: 10
    });
    
    // Agregar URLs de imágenes a cada producto
    const productsWithUrls = addImageUrlsToProducts(products, req);
    
    res.json({ success: true, data: productsWithUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching best discounts', error });
  }
};

// Search products by name (autocomplete) with pagination
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, message: 'Query parameter q is required' });
    }
    
    // Filtrado por stock: Por defecto solo productos con stock, excepto para administradores
    const userRole = (req as any).user?.role;
    const whereClause: any = { 
      name: { contains: q, mode: 'insensitive' },
      isActive: true // Solo productos activos
    };
    
    if (userRole !== 'ADMIN') {
      // Por defecto (usuarios no autenticados y clientes) solo productos con stock
      whereClause.stock = { gt: 0 };
      console.log('🔒 [STOCK FILTER] Usuario no autenticado/Cliente - búsqueda solo en productos con stock');
    } else {
      console.log('🔓 [STOCK FILTER] Admin detectado - búsqueda en todos los productos');
    }
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          }
        },
        skip,
        take: limit
      }),
      prisma.product.count({ 
        where: whereClause
      })
    ]);
    
    // Agregar URLs de imágenes a cada producto
    const productsWithUrls = addImageUrlsToProducts(products, req);
    
    res.json({
      success: true,
      data: productsWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error searching products', error });
  }
};

// Cleanup orphaned product images (admin only)
export const cleanupOrphanedImages = async (req: Request, res: Response) => {
  try {
    await cleanupOrphanedImages(req, res);
    
    res.json({ 
      success: true, 
      message: 'Orphaned product images cleanup completed successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error cleaning up orphaned images', error });
  }
};

// Toggle product status (admin only)
export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: !product.isActive }
    });
    
    res.json({ 
      success: true, 
      data: updatedProduct,
      message: `Product ${updatedProduct.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(500).json({ success: false, message: 'Error toggling product status', error });
  }
};

// Obtener productos relacionados
export const getRelatedProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = 10;
    
    // Buscar el producto actual
    const currentProduct = await prisma.product.findUnique({
      where: { id: id }
    });
    
    if (!currentProduct) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    
    // Filtrado por stock: Por defecto solo productos con stock, excepto para administradores
    const userRole = (req as any).user?.role;
    const whereClause: any = {
      categoryId: currentProduct.categoryId,
      id: { not: id },
      isActive: true // Solo productos activos
    };
    
    if (userRole !== 'ADMIN') {
      // Por defecto (usuarios no autenticados y clientes) solo productos con stock
      whereClause.stock = { gt: 0 };
      console.log('🔒 [STOCK FILTER] Usuario no autenticado/Cliente - productos relacionados solo con stock');
    } else {
      console.log('🔓 [STOCK FILTER] Admin detectado - productos relacionados de todos los tipos');
    }
    
    // Buscar productos de la misma categoría, excluyendo el actual
    console.log('🔍 [RELATED DEBUG] Buscando productos relacionados con filtro:', whereClause);
    let relatedProducts = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true
          }
        }
      },
      take: limit
    });
    
    // Si no hay suficientes, buscar por la misma marca (excluyendo los ya encontrados y el actual)
    if (relatedProducts.length < limit) {
      const excludeIds = [id, ...relatedProducts.map((p: any) => String(p.id))];
      const brandWhereClause: any = {
        brandId: currentProduct.brandId,
        id: { notIn: excludeIds },
        isActive: true // Solo productos activos
      };
      
      if (userRole !== 'ADMIN') {
        brandWhereClause.stock = { gt: 0 };
      }
      
      console.log('🔍 [RELATED DEBUG] Buscando por marca con filtro:', brandWhereClause);
      const moreByBrand = await prisma.product.findMany({
        where: brandWhereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          }
        },
        take: limit - relatedProducts.length
      });
      relatedProducts = relatedProducts.concat(moreByBrand);
    }
    
    // Si aún no hay suficientes, completar con cualquier producto (excluyendo los ya encontrados y el actual)
    if (relatedProducts.length < limit) {
      const excludeIds = [id, ...relatedProducts.map((p: any) => String(p.id))];
      const moreWhereClause: any = {
        id: { notIn: excludeIds },
        isActive: true // Solo productos activos
      };
      
      if (userRole !== 'ADMIN') {
        moreWhereClause.stock = { gt: 0 };
      }
      
      console.log('🔍 [RELATED DEBUG] Buscando productos adicionales con filtro:', moreWhereClause);
      const moreProducts = await prisma.product.findMany({
        where: moreWhereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true
            }
          }
        },
        take: limit - relatedProducts.length
      });
      relatedProducts = relatedProducts.concat(moreProducts);
    }
    
    // Agregar URLs de imágenes y oldPrice/price
    const productsWithUrls = addImageUrlsToProducts(relatedProducts, req);
    
    console.log('🔍 [RELATED DEBUG] Productos relacionados encontrados:', 
      productsWithUrls.map(p => ({ id: p.id, name: p.name, stock: p.stock }))
    );
    
    res.json({ success: true, data: productsWithUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo productos relacionados', error });
  }
}; 