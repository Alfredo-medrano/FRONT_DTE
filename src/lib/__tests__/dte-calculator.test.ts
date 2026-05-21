import { describe, it, expect } from 'vitest';
import { calcularLineaProducto, calcularResumenFactura } from '../dte-calculator';

describe('dte-calculator', () => {
  describe('calcularLineaProducto', () => {
    it('debe calcular la linea de un CCF (03) sin exención', () => {
      const item = {
        cantidad: 2,
        precioUnitario: 100, // 2 x 100 = 200
        descuento: 10,       // 200 - 10 = 190
        tipoItem: 1
      };
      const result = calcularLineaProducto(item, 1, '03');
      
      expect(result.ventaGravada).toBe(190.00);
      expect(result.ivaItem).toBe(24.70); // 190 * 0.13
      expect(result.precioUni).toBe(100.00);
    });

    it('debe calcular comprobante de donación (15)', () => {
        const item = {
          cantidad: 1,
          precioUnitario: 500,
          descuento: 0,
        };
        const result = calcularLineaProducto(item, 1, '15');
        
        expect(result.ventaGravada).toBe(0);
        expect(result.ivaItem).toBe(0); 
        expect(result.donacion).toBe(500.00);
      });
  });

  describe('calcularResumenFactura', () => {
    it('debe calcular totales exactos para CCF (03)', () => {
      const lineas = [
        { ventaGravada: 100, ivaItem: 13, montoDescu: 0, compra: 0, donacion: 0 }
      ];
      const result = calcularResumenFactura(lineas, 1, '03');
      
      expect(result.subTotal).toBe(100.00);
      expect(result.totalIva).toBe(13.00);
      expect(result.totalPagar).toBe(113.00);
    });

    it('debe aplicar retención de renta para Sujeto Excluido (14)', () => {
        const lineas = [
          { ventaGravada: 0, ivaItem: 0, montoDescu: 0, compra: 100 }
        ];
        // Retención del 10%
        const result = calcularResumenFactura(lineas, 1, '14');
        
        expect(result.subTotal).toBe(100.00);
        expect(result.reteRenta).toBe(10.00);
        expect(result.totalPagar).toBe(90.00);
    });
  });
});
