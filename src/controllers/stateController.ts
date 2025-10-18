import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { StateResponseData } from '../types/interfaces';

// Get all states
export const getStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const states = await prisma.state.findMany({
      orderBy: { name: 'asc' }
    });
    
    res.status(200).json({
      success: true,
      count: states.length,
      data: states
    });
  } catch (error) {
    console.error('Error getting states:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving states',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get a state by ID
export const getStateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = await prisma.state.findUnique({
      where: { id: req.params.id }
    });
    
    if (!state) {
      res.status(404).json({
        success: false,
        message: 'State not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error(`Error getting state with ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving state',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create a new state
export const createState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body as { name: string; code: string };
    
    const state = await prisma.state.create({
      data: {
        name,
        code
      }
    });
    
    res.status(201).json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error creating state:', error);
    
    // Handle duplicate key error (unique code)
    if (error instanceof Error && (error as any).code === 'P2002') {
      res.status(400).json({
        success: false,
        message: 'A state with that code already exists'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating state',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update an existing state
export const updateState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body as { name: string; code: string };
    
    const state = await prisma.state.update({
      where: { id: req.params.id },
      data: { name, code }
    });
    
    res.status(200).json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error(`Error updating state with ID ${req.params.id}:`, error);
    
    // Handle not found error
    if (error instanceof Error && (error as any).code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'State not found'
      });
      return;
    }
    
    // Handle duplicate key error (unique code)
    if (error instanceof Error && (error as any).code === 'P2002') {
      res.status(400).json({
        success: false,
        message: 'A state with that code already exists'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating state',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a state
export const deleteState = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.state.delete({
      where: { id: req.params.id }
    });
    
    res.status(200).json({
      success: true,
      message: 'State successfully deleted'
    });
  } catch (error) {
    console.error(`Error deleting state with ID ${req.params.id}:`, error);
    
    // Handle not found error
    if (error instanceof Error && (error as any).code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'State not found'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting state',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 