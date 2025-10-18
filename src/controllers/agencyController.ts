import { Request, Response } from 'express';
import { RequestWithUser } from '../types/interfaces';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

// Datos temporales en memoria hasta que Prisma funcione
let tempAgencies: any[] = [];

// Web scraping de agencias MRW con Puppeteer
export const scrapeMRWAgencies = async (req: Request, res: Response) => {
  let browser;
  try {
    console.log('Iniciando web scraping de agencias con Puppeteer...');
    
    // Iniciar Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Configurar viewport y user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navegar a la página de MRW
    console.log('Navegando a https://mrwve.com/mi-envio...');
    await page.goto('https://mrwve.com/mi-envio', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Página cargada, esperando que se carguen las agencias...');
    
    // Esperar a que se carguen los elementos del mapa
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Intentar extraer agencias del mapa
    const agencies = await page.evaluate(() => {
      const agencyElements: any[] = [];
      
      // Buscar elementos que contengan información de agencias
      const elements = document.querySelectorAll('div, section, article, li');
      
      elements.forEach((element) => {
        const text = element.textContent?.toLowerCase() || '';
        const hasAgency = text.includes('agencia') || text.includes('mrw');
        const hasAddress = text.includes('dirección') || text.includes('address') || text.includes('av.') || text.includes('calle');
        const hasPhone = text.includes('teléfono') || text.includes('phone') || /\d{3,4}-\d{3,4}/.test(text);
        
        if (hasAgency && (hasAddress || hasPhone)) {
          const name = element.querySelector('h1, h2, h3, h4, .title, .name, strong, b')?.textContent?.trim() || 
                      element.textContent?.match(/([A-Z][^0-9\n]+(?:MRW|Agencia|Centro Comercial)[^0-9\n]*)/i)?.[1]?.trim();
          
          const address = element.textContent?.match(/(?:dirección|address|av\.|calle|cc\.|centro comercial)[:\s]*([^\n]+)/i)?.[1]?.trim();
          const phone = element.textContent?.match(/(?:teléfono|phone)[:\s]*([^\n]+)/i)?.[1]?.trim();
          
          if (name && name.length < 100) {
            agencyElements.push({
              name: name,
              address: address || 'Dirección no disponible',
              phone: phone || 'Teléfono no disponible',
              rawText: element.textContent?.trim().substring(0, 200)
            });
          }
        }
      });
      
      return agencyElements;
    });
    
    console.log(`Encontradas ${agencies.length} agencias potenciales`);
    
    // Si no encontramos agencias, intentar con selectores específicos
    if (agencies.length === 0) {
      console.log('Intentando con selectores específicos...');
      
      // Buscar en el selector de estados
      const states = await page.evaluate(() => {
        const stateOptions = document.querySelectorAll('select option');
        return Array.from(stateOptions).map(option => ({
          text: option.textContent?.trim(),
          value: option.getAttribute('value')
        }));
      });
      
      console.log('Estados encontrados:', states.length);
      
      // Intentar hacer clic en diferentes estados para cargar agencias
      for (const state of states.slice(0, 5)) { // Probar solo los primeros 5 estados
        if (state.value) {
          try {
            console.log(`Probando estado: ${state.text}`);
            
                         // Seleccionar el estado
             await page.select('select', state.value);
             await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Buscar agencias después de seleccionar el estado
            const stateAgencies = await page.evaluate(() => {
              const elements = document.querySelectorAll('div, section, article');
              const foundAgencies: any[] = [];
              
              elements.forEach((element) => {
                const text = element.textContent?.toLowerCase() || '';
                if (text.includes('agencia') || text.includes('mrw')) {
                  foundAgencies.push({
                    text: element.textContent?.trim().substring(0, 300),
                    html: element.innerHTML.substring(0, 500)
                  });
                }
              });
              
              return foundAgencies;
            });
            
            if (stateAgencies.length > 0) {
              console.log(`Encontradas ${stateAgencies.length} agencias en ${state.text}`);
              agencies.push(...stateAgencies);
            }
          } catch (error) {
            console.log(`Error probando estado ${state.text}:`, error);
          }
        }
      }
    }
    
    // Procesar las agencias encontradas
    console.log('Procesando agencias encontradas...');
    
    const processedAgencies = agencies.map(agency => ({
      name: agency.name || 'Agencia MRW',
      address: agency.address || 'Dirección no disponible',
      city: 'Caracas', // Por defecto
      state: 'Distrito Capital', // Por defecto
      phone: agency.phone || 'Teléfono no disponible',
      isActive: true,
      rawText: agency.rawText
    }));

    // Guardar temporalmente en memoria
    tempAgencies = processedAgencies.map(agency => ({
      ...agency,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Cerrar el navegador
    if (browser) {
      await browser.close();
    }

    res.json({ 
      success: true, 
      message: agencies.length > 0 ? 'Agencias reales extraídas del mapa de MRW' : 'No se encontraron agencias, usando datos de ejemplo',
      data: tempAgencies,
      debug: {
        agenciesFound: agencies.length,
        rawAgencies: agencies,
        note: agencies.length > 0 ? 'Agencias extraídas con Puppeteer' : 'Usando datos de ejemplo'
      }
    });
  } catch (error) {
    console.error('Error scraping agencies:', error);
    
    // Cerrar el navegador si está abierto
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError);
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error scraping agencies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Obtener todas las agencias
export const getAllAgencies = async (req: Request, res: Response) => {
  try {
    const agencies = tempAgencies.filter(agency => agency.isActive);

    res.json({ 
      success: true, 
      data: agencies 
    });
  } catch (error) {
    console.error('Error fetching agencies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching agencies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Buscar agencias por ciudad (autocomplete)
export const searchAgenciesByCity = async (req: Request, res: Response) => {
  try {
    const { city } = req.query;
    
    if (!city || typeof city !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'City parameter is required' 
      });
    }

    const agencies = tempAgencies
      .filter(agency => 
        agency.isActive && 
        agency.city.toLowerCase().includes(city.toLowerCase())
      )
      .slice(0, 10); // Limitar resultados para autocomplete

    res.json({ 
      success: true, 
      data: agencies 
    });
  } catch (error) {
    console.error('Error searching agencies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching agencies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Obtener agencia por ID
export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const agency = tempAgencies.find(agency => agency.id === id);

    if (!agency) {
      return res.status(404).json({ 
        success: false, 
        message: 'Agency not found' 
      });
    }

    res.json({ 
      success: true, 
      data: agency 
    });
  } catch (error) {
    console.error('Error fetching agency:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching agency',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 