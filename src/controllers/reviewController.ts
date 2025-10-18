import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { RequestWithUser } from '../types/interfaces';

// Get reviews for a product
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    
    const reviews = await prisma.review.findMany({
      where: { 
        productId,
        status: 'APPROVED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reviews', error });
  }
};

// Create a review for a product
export const createReview = async (req: RequestWithUser, res: Response) => {
  try {
    const { rating, comment } = req.body as { rating: number; comment: string };
    const productId = req.params.id;
    const userId = req.user.id;
    
    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    // Prevent duplicate reviews by the same user for the same product
    const existing = await prisma.review.findFirst({
      where: { 
        productId,
        userId
      }
    });
    
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }
    
    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: Number(rating),
        comment,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        }
      }
    });
    
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating review', error });
  }
};

// Moderate a review (admin only)
export const moderateReview = async (req: RequestWithUser, res: Response) => {
  try {
    const { status } = req.body as { status: string };
    const reviewId = req.params.id;
    
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { status: status as any },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profileImage: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        }
      }
    });
    
    res.json({ success: true, data: updatedReview });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.status(500).json({ success: false, message: 'Error moderating review', error });
  }
};

// Get all reviews (admin only)
export const getAllReviews = async (req: RequestWithUser, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    
    const whereClause: any = {};
    if (status) {
      whereClause.status = status.toUpperCase();
    }
    
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.count({ where: whereClause })
    ]);
    
    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reviews', error });
  }
};

// Get user reviews
export const getUserReviews = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Only admin or owner can access
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these reviews' });
    }
    
    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user reviews', error });
  }
};

// Delete review (admin or owner)
export const deleteReview = async (req: RequestWithUser, res: Response) => {
  try {
    const reviewId = req.params.id;
    
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    
    // Only admin or review owner can delete
    if (req.user.role !== 'ADMIN' && review.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }
    
    await prisma.review.delete({
      where: { id: reviewId }
    });
    
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.status(500).json({ success: false, message: 'Error deleting review', error });
  }
}; 