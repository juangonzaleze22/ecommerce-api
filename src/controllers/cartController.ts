import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { RequestWithUser } from '../types/interfaces';

// Get current user's cart
export const getCart = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                stock: true,
                isActive: true
              }
            }
          }
        }
      }
    });
    
    if (!cart) {
      return res.json({ success: true, data: { cartItems: [] } });
    }
    
    // Filtrar productos inactivos del carrito
    const activeCartItems = cart.cartItems.filter(item => item.product.isActive);
    
    res.json({ 
      success: true, 
      data: { 
        ...cart, 
        cartItems: activeCartItems 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching cart', error });
  }
};

// Add product to cart
export const addToCart = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = (req.body || {}) as { productId: string; quantity: number };
    
    // Verificar que el producto existe y está activo
    const product = await prisma.product.findFirst({
      where: { 
        id: productId,
        isActive: true // Solo productos activos
      }
    });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' });
    }
    
    // Buscar o crear el carrito del usuario
    let cart = await prisma.cart.findUnique({
      where: { userId }
    });
    
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId }
      });
    }
    
    // Verificar si el producto ya está en el carrito
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });
    
    if (existingCartItem) {
      // Actualizar cantidad
      await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: existingCartItem.quantity + quantity }
      });
    } else {
      // Agregar nuevo item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity
        }
      });
    }
    
    // Obtener el carrito actualizado
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                stock: true,
                isActive: true
              }
            }
          }
        }
      }
    });
    
    // Filtrar productos inactivos del carrito
    if (updatedCart) {
      const activeCartItems = updatedCart.cartItems.filter(item => item.product.isActive);
      
      res.status(201).json({ 
        success: true, 
        data: { 
          ...updatedCart, 
          cartItems: activeCartItems 
        } 
      });
    } else {
      res.status(500).json({ success: false, message: 'Error retrieving updated cart' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding to cart', error });
  }
};

// Update product quantity in cart
export const updateCart = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = (req.body || {}) as { productId: string; quantity: number };
    
    // Buscar el carrito del usuario
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    // Buscar el item del carrito
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });
    
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Product not in cart' });
    }
    
    // Actualizar cantidad
    await prisma.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity: quantity }
    });
    
    // Obtener el carrito actualizado
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                stock: true,
                isActive: true
              }
            }
          }
        }
      }
    });
    
    // Filtrar productos inactivos del carrito
    if (updatedCart) {
      const activeCartItems = updatedCart.cartItems.filter(item => item.product.isActive);
      
      res.json({ 
        success: true, 
        data: { 
          ...updatedCart, 
          cartItems: activeCartItems 
        } 
      });
    } else {
      res.status(500).json({ success: false, message: 'Error retrieving updated cart' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating cart', error });
  }
};

// Remove product from cart
export const removeFromCart = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    const { productId } = (req.body || {}) as { productId: string };
    
    // Buscar el carrito del usuario
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    // Buscar y eliminar el item del carrito
    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });
    
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Product not in cart' });
    }
    
    await prisma.cartItem.delete({
      where: { id: cartItem.id }
    });
    
    // Obtener el carrito actualizado
    const updatedCart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                stock: true,
                isActive: true
              }
            }
          }
        }
      }
    });
    
    res.json({ success: true, data: updatedCart });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from cart', error });
  }
};

// Clear cart
export const clearCart = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Buscar el carrito del usuario
    const cart = await prisma.cart.findUnique({
      where: { userId }
    });
    
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    
    // Eliminar todos los items del carrito
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });
    
    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing cart', error });
  }
}; 