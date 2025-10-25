import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getProfileImageUrl, deleteOldProfileImage } from '../utils/fileUpload';
import { notificationService } from '../services/NotificationService';
import { 
  RegisterUserData, 
  UserResponseData, 
  AdminResponseData, 
  RequestWithUser,
  TokenResponseData,
  ApiErrorResponse,
  ShippingAgency
} from '../types/interfaces';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// @desc    Register client user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, shippingAgencies } = req.body as { 
      name: string; 
      email: string; 
      password: string; 
      phone?: string;
      shippingAgencies?: ShippingAgency[] 
    };

    console.log('Shipping agencies:', JSON.stringify(shippingAgencies, null, 2));

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with that email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Preparar objeto usuario
    const userData: any = {
      name,
      email,
      password: hashedPassword,
      role: 'CLIENT' as const // Force role to be client for public registrations
    };

    // Agregar teléfono si se proporcionó
    if (phone) {
      userData.phone = phone;
    }

    // Verificar si se ha subido una imagen
    if ((req as any).file) {
      userData.profileImage = (req as any).file.filename;
    }

    // Create user with role client only
    const user = await prisma.user.create({
      data: userData
    });

    // Procesar agencias de envío si se proporcionaron
    let userShippingAgencies: ShippingAgency[] = [];
    if (shippingAgencies && Array.isArray(shippingAgencies) && shippingAgencies.length > 0) {
      try {
        console.log('Processing shipping agencies:', JSON.stringify(shippingAgencies, null, 2));
        // Crear o encontrar las agencias en la base de datos
        const agencyPromises = shippingAgencies.map(async (agencyData) => {
          // Buscar si la agencia ya existe
          let agency = await prisma.agency.findFirst({
            where: {
              name: agencyData.nombre,
              city: agencyData.estado
            }
          });

          // Si no existe, crearla
          if (!agency) {
            agency = await prisma.agency.create({
              data: {
                name: agencyData.nombre,
                address: agencyData.direccion,
                city: agencyData.estado,
                state: agencyData.estado,
                latitude: parseFloat(agencyData.latitud),
                longitude: parseFloat(agencyData.longitud),
                zipCode: agencyData.codigo
              }
            });
          }

          // Crear la relación usuario-agencia
          await prisma.userShippingAgency.create({
            data: {
              userId: user.id,
              agencyId: agency.id,
              isDefault: false // Por defecto no es la agencia principal
            }
          });

          return {
            agencia_id: agency.id,
            estado_id: agencyData.estado_id,
            nombre: agency.name,
            codigo: agency.zipCode || agencyData.codigo,
            direccion: agency.address,
            latitud: agency.latitude?.toString() || agencyData.latitud,
            longitud: agency.longitude?.toString() || agencyData.longitud,
            estado: agency.state
          };
        });

        userShippingAgencies = await Promise.all(agencyPromises);
      } catch (agencyError) {
        console.error('Error processing shipping agencies:', agencyError);
        // No fallar el registro por error de agencias
      }
    }

    // Añadir URL completa de la imagen al objeto de respuesta
    const userResponse: UserResponseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      profileImage: user.profileImage || undefined,
      profileImageUrl: getProfileImageUrl(req, user.profileImage || 'default.png'),
      shippingAgencies: userShippingAgencies,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Crear notificación de bienvenida
    try {
      await notificationService.notifyWelcome(user.id, user.name);
    } catch (notificationError) {
      console.error('Error creating welcome notification:', notificationError);
      // No fallar el registro por error de notificación
    }

    sendTokenResponse(user, 201, res, userResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Create default admin user
// @route   POST /api/auth/create-admin
// @access  Private/Admin
export const createDefaultAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';
    const adminName = process.env.DEFAULT_ADMIN_NAME || 'Administrator';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingAdmin) {
      res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Preparar datos del admin
    const adminData: any = {
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN' as const
    };

    // Verificar si se ha subido una imagen
    if ((req as any).file) {
      adminData.profileImage = (req as any).file.filename;
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: adminData
    });

    const adminResponse: AdminResponseData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone || undefined,
      role: admin.role,
      profileImage: admin.profileImage || undefined,
      profileImageUrl: getProfileImageUrl(req, admin.profileImage || 'default.png'),
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Default admin user created successfully',
      data: adminResponse
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    // Validate email and password
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
      return;
    }

    // Check for user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      // Notificar intento de login con email inexistente
      try {
        await notificationService.notifyLoginAttempt(email, false, 'Email no registrado');
      } catch (notificationError) {
        console.error('Error creating failed login notification:', notificationError);
      }

      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Notificar intento de login fallido
      try {
        await notificationService.notifyLoginAttempt(email, false, 'Contraseña incorrecta');
      } catch (notificationError) {
        console.error('Error creating failed login notification:', notificationError);
      }

      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    // Obtener agencias de envío del usuario
    const userShippingAgenciesData = await prisma.userShippingAgency.findMany({
      where: { userId: user.id },
      include: {
        agency: true
      }
    });

    // Procesar agencias de envío
    const userShippingAgencies: ShippingAgency[] = userShippingAgenciesData.map((usa: any) => ({
      agencia_id: usa.agency.id,
      estado_id: 0, // Este campo no está en la tabla Agency, se puede agregar si es necesario
      nombre: usa.agency.name,
      codigo: usa.agency.zipCode || '',
      direccion: usa.agency.address,
      latitud: usa.agency.latitude?.toString() || '0',
      longitud: usa.agency.longitude?.toString() || '0',
      estado: usa.agency.state
    }));

    // Añadir URL completa de la imagen al objeto de respuesta
    const userResponse: UserResponseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      profileImage: user.profileImage || undefined,
      profileImageUrl: getProfileImageUrl(req, user.profileImage || 'default.png'),
      shippingAgencies: userShippingAgencies,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Notificar login exitoso
    try {
      await notificationService.notifyLoginSuccess(user.id, user.email, new Date());
      await notificationService.notifyLoginAttempt(user.email, true);
    } catch (notificationError) {
      console.error('Error creating login success notification:', notificationError);
      // No fallar el login por error de notificación
    }

    sendTokenResponse(user, 200, res, userResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    // user is already available in req due to the auth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Obtener agencias de envío del usuario por separado
    const userShippingAgenciesData = await prisma.userShippingAgency.findMany({
      where: { userId: user.id },
      include: {
        agency: true
      }
    });

    // Procesar agencias de envío
    const userShippingAgencies: ShippingAgency[] = userShippingAgenciesData.map((usa: any) => ({
      agencia_id: usa.agency.id,
      estado_id: 0, // Este campo no está en la tabla Agency, se puede agregar si es necesario
      nombre: usa.agency.name,
      codigo: usa.agency.zipCode || '',
      direccion: usa.agency.address,
      latitud: usa.agency.latitude?.toString() || '0',
      longitud: usa.agency.longitude?.toString() || '0',
      estado: usa.agency.state
    }));

    // Añadir URL completa de la imagen al objeto de respuesta
    const userResponse: UserResponseData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      profileImage: user.profileImage || undefined,
      profileImageUrl: getProfileImageUrl(req as any, user.profileImage || 'default.png'),
      shippingAgencies: userShippingAgencies,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user information',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Update user profile (name, phone, image)
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { name, phone } = req.body as { 
      name?: string; 
      phone?: string; 
    };

    // Validar que al menos un campo se esté actualizando
    if (!name && !phone && !(req as any).file) {
      res.status(400).json({
        success: false,
        message: 'Debe proporcionar al menos un campo para actualizar (nombre, teléfono o imagen)'
      });
      return;
    }

    // Validar nombre si se proporciona
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      res.status(400).json({
        success: false,
        message: 'El nombre debe tener al menos 2 caracteres'
      });
      return;
    }

    // Validar teléfono si se proporciona
    if (phone && (typeof phone !== 'string' || phone.trim().length < 10)) {
      res.status(400).json({
        success: false,
        message: 'El teléfono debe tener al menos 10 caracteres'
      });
      return;
    }

    // Obtener usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
      return;
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (name) {
      updateData.name = name.trim();
    }

    if (phone) {
      updateData.phone = phone.trim();
    }

    // Manejar imagen de perfil si se subió una nueva
    if ((req as any).file) {
      // Eliminar la imagen anterior si existe y no es la imagen por defecto
      if (currentUser.profileImage && currentUser.profileImage !== 'default.jpg') {
        deleteOldProfileImage(currentUser.profileImage);
      }
      updateData.profileImage = (req as any).file.filename;
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    // Obtener agencias de envío del usuario
    const userShippingAgenciesData = await prisma.userShippingAgency.findMany({
      where: { userId: updatedUser.id },
      include: {
        agency: true
      }
    });

    // Procesar agencias de envío
    const userShippingAgencies: ShippingAgency[] = userShippingAgenciesData.map((usa: any) => ({
      agencia_id: usa.agency.id,
      estado_id: 0,
      nombre: usa.agency.name,
      codigo: usa.agency.zipCode || '',
      direccion: usa.agency.address,
      latitud: usa.agency.latitude?.toString() || '0',
      longitud: usa.agency.longitude?.toString() || '0',
      estado: usa.agency.state
    }));

    // Preparar respuesta
    const userResponse: UserResponseData = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || undefined,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage || undefined,
      profileImageUrl: getProfileImageUrl(req as any, updatedUser.profileImage || 'default.png'),
      shippingAgencies: userShippingAgencies,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente',
      data: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando el perfil',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Update profile image
// @route   PUT /api/auth/updateprofileimage
// @access  Private
export const updateProfileImage = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verificar si se ha subido una imagen
    if (!(req as any).file) {
      res.status(400).json({
        success: false,
        message: 'Por favor sube una imagen'
      });
      return;
    }

    // Eliminar la imagen anterior si existe
    deleteOldProfileImage(user.profileImage || undefined);

    // Actualizar con la nueva imagen
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileImage: (req as any).file.filename }
    });

    res.status(200).json({
      success: true,
      message: 'Imagen de perfil actualizada correctamente',
      data: {
        profileImage: updatedUser.profileImage,
        profileImageUrl: getProfileImageUrl(req as any, updatedUser.profileImage || 'default.png')
      }
    });
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando la imagen de perfil',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Get user shipping agencies
// @route   GET /api/auth/shipping-agencies
// @access  Private
export const getUserShippingAgencies = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    
    if (!req.user) {
      console.log('❌ [SHIPPING AGENCIES] Usuario no autenticado');
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    // Obtener agencias de envío del usuario
    const userShippingAgenciesData = await prisma.userShippingAgency.findMany({
      where: { userId: req.user.id },
      include: {
        agency: true
      },
      orderBy: [
        { isDefault: 'desc' }, // Las predeterminadas primero
        { createdAt: 'asc' }
      ]
    });

    // Procesar agencias de envío
    const userShippingAgencies: ShippingAgency[] = userShippingAgenciesData.map((usa: any) => ({
      id: usa.id, // ID de la relación usuario-agencia
      agencia_id: usa.agency.id,
      estado_id: 0, // Este campo no está en la tabla Agency
      nombre: usa.agency.name,
      codigo: usa.agency.zipCode || '',
      direccion: usa.agency.address,
      latitud: usa.agency.latitude?.toString() || '0',
      longitud: usa.agency.longitude?.toString() || '0',
      estado: usa.agency.state,
      isDefault: usa.isDefault,
      createdAt: usa.createdAt,
      updatedAt: usa.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: userShippingAgencies
    });
  } catch (error) {
    console.error('Get user shipping agencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo agencias de envío',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Add shipping agency to user
// @route   POST /api/auth/shipping-agencies
// @access  Private
export const addUserShippingAgency = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { agencyId, isDefault = false } = req.body as { 
      agencyId: string; 
      isDefault?: boolean; 
    };

    if (!agencyId) {
      res.status(400).json({
        success: false,
        message: 'ID de agencia es requerido'
      });
      return;
    }

    // Verificar que la agencia existe
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId }
    });

    if (!agency) {
      res.status(404).json({
        success: false,
        message: 'Agencia no encontrada'
      });
      return;
    }

    // Verificar que el usuario no tenga ya esta agencia
    const existingRelation = await prisma.userShippingAgency.findUnique({
      where: {
        userId_agencyId: {
          userId: req.user.id,
          agencyId: agencyId
        }
      }
    });

    if (existingRelation) {
      res.status(400).json({
        success: false,
        message: 'Ya tienes esta agencia agregada'
      });
      return;
    }

    // Si se marca como predeterminada, quitar la predeterminada anterior
    if (isDefault) {
      await prisma.userShippingAgency.updateMany({
        where: { 
          userId: req.user.id,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    // Crear la relación usuario-agencia
    const userShippingAgency = await prisma.userShippingAgency.create({
      data: {
        userId: req.user.id,
        agencyId: agencyId,
        isDefault: isDefault
      },
      include: {
        agency: true
      }
    });

    // Preparar respuesta
    const response: any = {
      id: userShippingAgency.id,
      agencia_id: userShippingAgency.agency.id,
      estado_id: 0,
      nombre: userShippingAgency.agency.name,
      codigo: userShippingAgency.agency.zipCode || '',
      direccion: userShippingAgency.agency.address,
      latitud: userShippingAgency.agency.latitude?.toString() || '0',
      longitud: userShippingAgency.agency.longitude?.toString() || '0',
      estado: userShippingAgency.agency.state,
      isDefault: userShippingAgency.isDefault,
      createdAt: userShippingAgency.createdAt,
      updatedAt: userShippingAgency.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Agencia agregada correctamente',
      data: response
    });
  } catch (error) {
    console.error('Add user shipping agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error agregando agencia de envío',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Remove shipping agency from user
// @route   DELETE /api/auth/shipping-agencies/:id
// @access  Private
export const removeUserShippingAgency = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de relación es requerido'
      });
      return;
    }

    // Verificar que la relación existe y pertenece al usuario
    const userShippingAgency = await prisma.userShippingAgency.findFirst({
      where: {
        id: id,
        userId: req.user.id
      },
      include: {
        agency: true
      }
    });

    if (!userShippingAgency) {
      res.status(404).json({
        success: false,
        message: 'Agencia no encontrada o no pertenece al usuario'
      });
      return;
    }

    // Eliminar la relación
    await prisma.userShippingAgency.delete({
      where: { id: id }
    });

    res.status(200).json({
      success: true,
      message: 'Agencia eliminada correctamente',
      data: {
        id: userShippingAgency.id,
        nombre: userShippingAgency.agency.name
      }
    });
  } catch (error) {
    console.error('Remove user shipping agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando agencia de envío',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Set shipping agency as default
// @route   PUT /api/auth/shipping-agencies/:id/set-default
// @access  Private
export const setDefaultShippingAgency = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'ID de relación es requerido'
      });
      return;
    }

    // Verificar que la relación existe y pertenece al usuario
    const userShippingAgency = await prisma.userShippingAgency.findFirst({
      where: {
        id: id,
        userId: req.user.id
      },
      include: {
        agency: true
      }
    });

    if (!userShippingAgency) {
      res.status(404).json({
        success: false,
        message: 'Agencia no encontrada o no pertenece al usuario'
      });
      return;
    }

    // Quitar la predeterminada anterior
    await prisma.userShippingAgency.updateMany({
      where: { 
        userId: req.user.id,
        isDefault: true
      },
      data: { isDefault: false }
    });

    // Marcar esta como predeterminada
    const updatedAgency = await prisma.userShippingAgency.update({
      where: { id: id },
      data: { isDefault: true },
      include: {
        agency: true
      }
    });

    // Preparar respuesta
    const response: any = {
      id: updatedAgency.id,
      agencia_id: updatedAgency.agency.id,
      estado_id: 0,
      nombre: updatedAgency.agency.name,
      codigo: updatedAgency.agency.zipCode || '',
      direccion: updatedAgency.agency.address,
      latitud: updatedAgency.agency.latitude?.toString() || '0',
      longitud: updatedAgency.agency.longitude?.toString() || '0',
      estado: updatedAgency.agency.state,
      isDefault: updatedAgency.isDefault,
      createdAt: updatedAgency.createdAt,
      updatedAt: updatedAgency.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Agencia marcada como predeterminada',
      data: response
    });
  } catch (error) {
    console.error('Set default shipping agency error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marcando agencia como predeterminada',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user: any, statusCode: number, res: Response, userData?: UserResponseData): void => {
  // Create token
  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET || 'secretkey123456789',
    { expiresIn: process.env.JWT_EXPIRE || '30d' } as any
  );

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE 
        ? parseInt(process.env.JWT_COOKIE_EXPIRE) * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000)
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  const responseData: TokenResponseData = {
    success: true,
    token,
    user: userData!
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json(responseData);
}; 