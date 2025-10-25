import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { BrandData, BrandResponseData } from '../types/interfaces';
import { deleteBrandImage } from '../utils/fileUpload';

// Get all brands with pagination
export const getBrands = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    // Filtros - Mejorar la lógica para manejar diferentes tipos de valores
    let whereClause: any = {};
    
    if (req.query.active !== undefined) {
      if (typeof req.query.active === 'string') {
        if (req.query.active === 'true') {
          whereClause.isActive = true;
        } else if (req.query.active === 'false') {
          whereClause.isActive = false;
        }
      } else if (typeof req.query.active === 'boolean') {
        whereClause.isActive = req.query.active;
      } else if (typeof req.query.active === 'number') {
        whereClause.isActive = req.query.active === 1;
      }
    }
    
    // Filtro de búsqueda por nombre
    if (req.query.search && typeof req.query.search === 'string') {
      whereClause.name = {
        contains: req.query.search,
        mode: 'insensitive'
      };
    }
    
    const sortOrder = req.query.sort === 'desc' ? 'desc' : 'asc';
    
    const [brands, total] = await Promise.all([
      prisma.brand.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: sortOrder },
        include: {
          _count: {
            select: { 
              products: {
                where: {
                  isActive: true // Solo contar productos activos
                }
              }
            }
          }
        }
      }),
      prisma.brand.count({ where: whereClause })
    ]);
    
    // Transformar datos para incluir el conteo de productos
    const brandsWithCount = brands.map((brand: any) => ({
      ...brand,
      count: brand._count.products
    }));
    
    res.json({
      success: true,
      data: brandsWithCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        active: req.query.active,
        search: req.query.search,
        sort: req.query.sort === 'desc' ? 'desc' : 'asc'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching brands', error });
  }
};

// Get brand by ID
export const getBrandById = async (req: Request, res: Response) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { 
            products: {
              where: {
                isActive: true // Solo contar productos activos
              }
            }
          }
        }
      }
    });
    
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    
    const brandWithCount = {
      ...brand,
      count: brand._count.products
    };
    
    res.json({ success: true, data: brandWithCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching brand', error });
  }
};

// Create new brand (admin only)
export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body;
    let image: string | undefined;
    
    if ((req as any).file) {
      image = (req as any).file.filename;
    } else if (req.body.image) {
      image = req.body.image;
    }
    
    const brand = await prisma.brand.create({
      data: {
        name,
        description,
        image,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    res.status(201).json({ success: true, data: brand });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Brand name already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating brand', error });
  }
};

// Update brand (admin only)
export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive, image: bodyImage } = req.body;
    let image: string;
    
    // Obtener la marca actual para verificar si tiene imagen
    const currentBrand = await prisma.brand.findUnique({
      where: { id: req.params.id }
    });
    
    if (!currentBrand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    
    if ((req as any).file) {
      image = (req as any).file.filename;
    } else if (bodyImage && bodyImage.trim() !== '') {
      image = bodyImage;
    } else {
      // Si no llega imagen nueva, mantener la actual
      image = currentBrand.image || '';
    }
    
    const updateData: any = { 
      name, 
      description, 
      isActive,
      image
    };
    
    const brand = await prisma.brand.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json({ success: true, data: brand });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Brand name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    res.status(500).json({ success: false, message: 'Error updating brand', error });
  }
};

// Delete brand (admin only)
export const deleteBrand = async (req: Request, res: Response) => {
  try {
    // Primero obtener la marca para acceder a su imagen
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id }
    });
    
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    // Eliminar la imagen de la marca del sistema de archivos
    deleteBrandImage(brand.image || undefined);

    // Eliminar la marca de la base de datos
    await prisma.brand.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true, message: 'Brand and associated image deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    res.status(500).json({ success: false, message: 'Error deleting brand', error });
  }
};

// Toggle brand status (admin only)
export const toggleBrandStatus = async (req: Request, res: Response) => {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: req.params.id }
    });
    
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    
    const updatedBrand = await prisma.brand.update({
      where: { id: req.params.id },
      data: { isActive: !brand.isActive }
    });
    
    res.json({ 
      success: true, 
      data: updatedBrand,
      message: `Brand ${updatedBrand.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    res.status(500).json({ success: false, message: 'Error toggling brand status', error });
  }
};

// Get all active brands (for selects/dropdowns)
export const getActiveBrands = async (req: Request, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        _count: {
          select: { 
            products: {
              where: {
                isActive: true // Solo contar productos activos
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Transformar datos para incluir el conteo de productos
    const brandsWithCount = brands.map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      description: brand.description,
      image: brand.image,
      count: brand._count.products
    }));
    
    res.json({
      success: true,
      data: brandsWithCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching active brands', error });
  }
};

 