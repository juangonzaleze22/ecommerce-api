import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { OrderData, RequestWithUser } from '../types/interfaces';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PaymentValidationStatus, OrderStatus as OrderStatusType } from '../types';
import { getProfileImageUrl, getComprobanteUrl, getProductImageUrl } from '../utils/fileUpload';
import { notificationService } from '../services/NotificationService';  

// Función helper para procesar productos con descuentos
const processProductWithDiscount = (product: any) => {
  if (!product) return product;
  
  const price = Number(product.price);
  const discount = Number(product.discount || 0);
  
  const processedProduct = { ...product };
  
  if (typeof price === 'number' && !isNaN(price) && typeof discount === 'number' && !isNaN(discount) && discount > 0) {
    // Calcular precio con descuento
    const discountedPrice = Math.round(price * (1 - discount / 100));
    processedProduct.oldPrice = price;
    processedProduct.price = discountedPrice;
    processedProduct.discount = discount;
  } else {
    processedProduct.oldPrice = price;
    processedProduct.discount = 0;
  }
  
  return processedProduct;
};

// Función helper para agregar URLs a una orden
const addUrlsToOrder = (order: any, req: RequestWithUser) => {
  const orderObj = { ...order };
  
  // Agregar URL de imagen de perfil del usuario
  if (orderObj.user) {
    orderObj.user = {
      ...orderObj.user,
      profileImageUrl: orderObj.user.profileImage 
        ? getProfileImageUrl(req as unknown as Request, orderObj.user.profileImage)
        : getProfileImageUrl(req as unknown as Request, 'default.jpg')
    };
  }
  
  // Agregar URL del comprobante
  if (orderObj.comprobanteFile) {
    orderObj.comprobanteUrl = getComprobanteUrl(req as unknown as Request, orderObj.comprobanteFile);
  }
  
  // Procesar orderItems con descuentos y URLs
  if (orderObj.orderItems && Array.isArray(orderObj.orderItems)) {
    orderObj.orderItems = orderObj.orderItems.map((item: any) => {
      const itemObj = { ...item };
      
      // Procesar el producto con descuentos
      if (itemObj.product) {
        itemObj.product = processProductWithDiscount(itemObj.product);
        
        // Agregar URLs de imágenes
        if (itemObj.product.images && Array.isArray(itemObj.product.images)) {
          itemObj.product.images = itemObj.product.images.map((image: string) => 
            getProductImageUrl(req as unknown as Request, image)
          );
        }
      }
      
      return itemObj;
    });
  }
  
  return orderObj;
};

// Función helper para agregar URLs a un array de órdenes
const addUrlsToOrders = (orders: any[], req: RequestWithUser) => {
  return orders.map(order => addUrlsToOrder(order, req));
};

// Función helper para calcular precios desde la base de datos
const calculateOrderPricing = async (items: any[]) => {
  const productIds = items.map(item => item.productId);
  
  // Obtener productos con sus precios y descuentos actuales
  const products = await prisma.product.findMany({
    where: { 
      id: { in: productIds },
      isActive: true 
    },
    select: {
      id: true,
      name: true,
      price: true,
      discount: true,
      stock: true,
      images: true
    }
  });
  
  // Crear mapa de productos para acceso rápido
  const productMap = new Map(products.map(p => [p.id, p]));
  
  let calculatedSubtotal = 0;
  const calculatedItems = [];
  
  for (const item of items) {
    const product = productMap.get(item.productId);
    
    if (!product) {
      throw new Error(`Producto con ID ${item.productId} no encontrado o inactivo`);
    }
    
    if (product.stock < item.quantity) {
      throw new Error(`Stock insuficiente para el producto ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`);
    }
    
    // Calcular precio con descuento desde la base de datos
    const originalPrice = Number(product.price);
    const discount = Number(product.discount || 0);
    const finalPrice = discount > 0 
      ? Math.round(originalPrice * (1 - discount / 100))
      : originalPrice;
    
    const itemSubtotal = finalPrice * item.quantity;
    calculatedSubtotal += itemSubtotal;
    
    calculatedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: finalPrice, // Precio calculado desde BD
      originalPrice: originalPrice,
      discount: discount,
      selectedSize: item.selectedSize || null,
      selectedColor: item.selectedColor || null,
      selectedShoeSize: item.selectedShoeSize || null,
      productName: product.name,
      productImage: product.images[0] || null
    });
  }
  
  return {
    items: calculatedItems,
    subtotal: calculatedSubtotal,
    total: calculatedSubtotal // Por ahora sin impuestos ni envío
  };
};

// Create a new order
export const createOrder = async (req: RequestWithUser, res: Response) => {
  try {
    const { 
      items, 
      currency, 
      shippingAddress, 
      paymentInfo, 
      notes 
    } = (req.body || {}) as OrderData;
    
    const userId = req.user.id;
    let comprobanteFile: string | undefined;
    
    // Parsear items si viene como string JSON
    let parsedItems = items;
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid items format' 
        });
      }
    }
    
    // Verificar que items sea un array
    if (!Array.isArray(parsedItems)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Items must be an array' 
      });
    }
    
    // Validar que cada item tenga los campos requeridos
    for (const item of parsedItems) {
      if (!item.productId || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Cada item debe tener productId y quantity'
        });
      }
    }
    
    // CALCULAR PRECIOS DESDE LA BASE DE DATOS (SEGURIDAD)
    let pricing;
    try {
      pricing = await calculateOrderPricing(parsedItems);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error calculando precios'
      });
    }
    
    // Parsear otros campos JSON si es necesario
    let parsedShippingAddress = shippingAddress;
    let parsedPaymentInfo = paymentInfo;
    
    if (typeof shippingAddress === 'string') {
      try {
        parsedShippingAddress = JSON.parse(shippingAddress);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid shippingAddress format' 
        });
      }
    }
    
    if (typeof paymentInfo === 'string') {
      try {
        parsedPaymentInfo = JSON.parse(paymentInfo);
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid paymentInfo format' 
        });
      }
    }

    // Si hay un archivo de comprobante subido
    if ((req as any).file) {
      comprobanteFile = (req as any).file.filename;
    }
    
    // Crear la orden con precios calculados desde el servidor
    const order = await prisma.$transaction(async (tx) => {
      // Crear la orden
      const newOrder = await tx.order.create({
        data: {
          userId,
          subtotal: pricing.subtotal, // Precio calculado desde BD
          total: pricing.total, // Precio calculado desde BD
          currency: currency || 'USD',
          paymentMethod: parsedPaymentInfo?.method || 'pagomovil',
          paymentStatus: parsedPaymentInfo?.method === 'pagomovil' ? PaymentStatus.APPROVED : PaymentStatus.PENDING,
          comprobanteFile,
          notes,
          shippingAddress: parsedShippingAddress,
          paymentInfo: parsedPaymentInfo,
          status: OrderStatus.PENDING,
          orderItems: {
            create: pricing.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price, // Precio calculado desde BD
              selectedSize: item.selectedSize,
              selectedColor: item.selectedColor,
              selectedShoeSize: item.selectedShoeSize,
              productName: item.productName,
              productImage: item.productImage
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  discount: true,
                  images: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true
            }
          }
        }
      });

      // Restar stock de los productos
      for (const item of pricing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
        
        console.log(`📦 [STOCK] Restando ${item.quantity} unidades del producto ${item.productId} (${item.productName})`);
      }

      return newOrder;
    });

    // Agregar URLs usando la utilidad
    const orderWithUrls = addUrlsToOrder(order, req);
    
    // Crear notificación de orden creada
    try {
      await notificationService.notifyOrderCreated(userId, {
        id: order.id,
        total: order.total
      });
    } catch (notificationError) {
      console.error('Error creating order notification:', notificationError);
      // No fallar la creación de la orden por error de notificación
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Orden creada exitosamente. Pendiente de validación del comprobante.',
      data: orderWithUrls 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error });
  }
};

// Get order by ID
export const getOrderById = async (req: RequestWithUser, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                discount: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Only admin or owner can access
    if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    // Agregar URLs usando la utilidad
    const orderWithUrls = addUrlsToOrder(order, req);
    
    res.json({ success: true, data: orderWithUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching order', error });
  }
};

// Get orders by user
export const getOrdersByUser = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Only admin or owner can access
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these orders' });
    }
    
    // Paginación
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Filtros
    const { 
      status, 
      paymentStatus, 
      search,
      month,
      year,
      dateFrom,
      dateTo
    } = req.query;
    
    let whereClause: any = { userId };
    
    // Filtro por status de la orden
    if (status && typeof status === 'string') {
      whereClause.status = status;
    }
    
    // Filtro por status del pago
    if (paymentStatus && typeof paymentStatus === 'string') {
      whereClause.paymentStatus = paymentStatus;
    }
    
    // Filtro por mes y año
    if (month && year) {
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      
      if (monthNum >= 1 && monthNum <= 12 && yearNum > 0) {
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
        
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate
        };
      }
    }
    // Filtro solo por año
    else if (year && !month) {
      const yearNum = parseInt(year as string);
      
      if (yearNum > 0) {
        const startDate = new Date(yearNum, 0, 1);
        const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate
        };
      }
    }
    // Filtro por rango de fechas personalizado
    else if (dateFrom || dateTo) {
      const dateFilter: any = {};
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        if (!isNaN(fromDate.getTime())) {
          dateFilter.gte = fromDate;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        if (!isNaN(toDate.getTime())) {
          // Agregar 23:59:59 para incluir todo el día
          toDate.setHours(23, 59, 59, 999);
          dateFilter.lte = toDate;
        }
      }
      
      if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
      }
    }
    
    // Búsqueda general (ID de orden, nombre del producto)
    if (search && typeof search === 'string') {
      whereClause.OR = [
        {
          id: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          orderItems: {
            some: {
              product: {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            }
          }
        },
        {
          orderItems: {
            some: {
              productName: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        }
      ];
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: true,
                  discount: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where: whereClause })
    ]);
    
    // Agregar URLs usando la utilidad
    const ordersWithUrls = addUrlsToOrders(orders, req);
    
    res.json({ 
      success: true, 
      data: ordersWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching user orders', error });
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const { status } = (req.body || {}) as { status: OrderStatusType };
    const orderId = req.params.id;
    
    // Validar que el status sea válido
    const validOrderStatuses: OrderStatusType[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validOrderStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid order status. Valid statuses: ${validOrderStatuses.join(', ')}` 
      });
    }
    
    const order = await prisma.$transaction(async (tx) => {
      // Obtener la orden actual para verificar el estado anterior
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: true
        }
      });

      if (!currentOrder) {
        throw new Error('Order not found');
      }

      // Si se está cancelando una orden que no estaba cancelada, restaurar stock
      if (status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
        for (const item of currentOrder.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
          
          console.log(`📦 [STOCK] Restaurando ${item.quantity} unidades del producto ${item.productId} (orden cancelada)`);
        }
      }

      // Actualizar el estado de la orden
      return await tx.order.update({
        where: { id: orderId },
        data: { status: status as OrderStatus },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: true,
                  discount: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    });
    
    // Crear notificación según el estado de la orden
    try {
      if (status === 'PROCESSING') {
        await notificationService.notifyOrderProcessing(order.userId, {
          id: order.id,
          total: order.total
        });
      } else if (status === 'SHIPPED') {
        await notificationService.notifyOrderShipped(order.userId, {
          id: order.id,
          total: order.total
        });
      } else if (status === 'DELIVERED') {
        await notificationService.notifyOrderDelivered(order.userId, {
          id: order.id,
          total: order.total
        });
      } else if (status === 'CANCELLED') {
        await notificationService.notifyOrderCancelled(order.userId, {
          id: order.id,
          total: order.total
        });
      }
    } catch (notificationError) {
      console.error('Error creating order status notification:', notificationError);
      // No fallar la actualización por error de notificación
    }
    
    res.json({ 
      success: true, 
      message: `Estado de la orden actualizado a: ${status}`,
      data: order 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating order status', error });
  }
};

// Update payment status (admin only)
export const updatePaymentStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const { paymentStatus, notes } = (req.body || {}) as { paymentStatus: PaymentValidationStatus; notes?: string };
    const orderId = req.params.id;
    
    // Validar que el paymentStatus sea válido
    const validPaymentStatuses: PaymentValidationStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid payment status. Valid statuses: ${validPaymentStatuses.join(', ')}` 
      });
    }
    
    const updateData: any = { paymentStatus: paymentStatus as PaymentStatus };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                discount: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true
          }
        }
      }
    });

    // Agregar URLs usando la utilidad
    const orderWithUrls = addUrlsToOrder(order, req);
    
    // Crear notificación según el estado del pago
    try {
      if (paymentStatus === 'APPROVED') {
        await notificationService.notifyPaymentApproved(order.userId, {
          id: order.id,
          total: order.total
        });
      } else if (paymentStatus === 'REJECTED') {
        await notificationService.notifyPaymentRejected(order.userId, {
          id: order.id,
          total: order.total
        }, notes);
      }
    } catch (notificationError) {
      console.error('Error creating payment notification:', notificationError);
      // No fallar la actualización por error de notificación
    }
    
    res.json({ 
      success: true, 
      message: `Estado de pago actualizado a: ${paymentStatus}`,
      data: orderWithUrls 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating payment status', error });
  }
};

// Get all orders (admin only)
export const getAllOrders = async (req: RequestWithUser, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    // Filtros
    const { 
      status, 
      paymentStatus, 
      search
    } = req.query;
    let whereClause: any = {};
    
    // Filtro por status de la orden
    if (status && typeof status === 'string') {
      whereClause.status = status;
    }
    
    // Filtro por status del pago
    if (paymentStatus && typeof paymentStatus === 'string') {
      whereClause.paymentStatus = paymentStatus;
    }
    
    // Búsqueda general (ID de orden, nombre del cliente, email del cliente, nombre del producto)
    if (search && typeof search === 'string') {
      whereClause.OR = [
        {
          user: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          id: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          orderItems: {
            some: {
              product: {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            }
          }
        }
      ];
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: true,
                  discount: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where: whereClause })
    ]);

    // Agregar URLs usando la utilidad
    const ordersWithUrls = addUrlsToOrders(orders, req);
    
    res.json({
      success: true,
      data: ordersWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error });
  }
}; 