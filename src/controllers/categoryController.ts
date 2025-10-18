import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CategoryData, CategoryResponseData } from '../types/interfaces';
import { deleteCategoryImage } from '../utils/fileUpload';

// Get all categories with pagination
export const getCategories = async (req: Request, res: Response) => {
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
    
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { name: sortOrder },
        include: {
          _count: {
            select: { products: true }
          }
        }
      }),
      prisma.category.count({ where: whereClause })
    ]);
    
    // Transformar datos para incluir el conteo de productos
    const categoriesWithCount = categories.map((cat: any) => ({
      ...cat,
      count: cat._count.products
    }));
    
    res.json({
      success: true,
      data: categoriesWithCount,
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
    res.status(500).json({ success: false, message: 'Error fetching categories', error });
  }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    const categoryWithCount = {
      ...category,
      count: category._count.products
    };
    
    res.json({ success: true, data: categoryWithCount });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching category', error });
  }
};

// Create new category (admin only)
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive } = req.body;
    let image: string | undefined;
    
    if ((req as any).file) {
      image = (req as any).file.filename;
    } else if (req.body.image) {
      image = req.body.image;
    }
    
    const category = await prisma.category.create({
      data: {
        name,
        description,
        image,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(500).json({ success: false, message: 'Error creating category', error });
  }
};

// Update category (admin only)
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive, image: bodyImage } = req.body;
    let image: string;
    
    // Obtener la categoría actual para verificar si tiene imagen
    const currentCategory = await prisma.category.findUnique({
      where: { id: req.params.id }
    });
    
    if (!currentCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    if ((req as any).file) {
      image = (req as any).file.filename;
    } else if (bodyImage && bodyImage.trim() !== '') {
      image = bodyImage;
    } else {
      // Si no llega imagen nueva, mantener la actual
      image = currentCategory.image || '';
    }
    
    const updateData: any = { 
      name, 
      description, 
      isActive,
      image
    };
    
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json({ success: true, data: category });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(500).json({ success: false, message: 'Error updating category', error });
  }
};

// Delete category (admin only)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    // Primero obtener la categoría para acceder a su imagen
    const category = await prisma.category.findUnique({
      where: { id: req.params.id }
    });
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Eliminar la imagen de la categoría del sistema de archivos
    deleteCategoryImage(category.image || undefined);

    // Eliminar la categoría de la base de datos
    await prisma.category.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true, message: 'Category and associated image deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(500).json({ success: false, message: 'Error deleting category', error });
  }
};

// Toggle category status (admin only)
export const toggleCategoryStatus = async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id }
    });
    
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    const updatedCategory = await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: !category.isActive }
    });
    
    res.json({ 
      success: true, 
      data: updatedCategory,
      message: `Category ${updatedCategory.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(500).json({ success: false, message: 'Error toggling category status', error });
  }
};

// Get all active categories (for selects/dropdowns)
export const getActiveCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        image: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching active categories', error });
  }
};

 