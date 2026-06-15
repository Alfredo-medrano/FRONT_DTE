import Decimal from 'decimal.js';
import { TIPOS_DTE, TASA_IVA, TASA_RETENCION_RENTA, CODIGO_TRIBUTO_IVA } from './constants';

export const redondear = (valor: number | Decimal, decimales = 2) => {
  if (valor === undefined || valor === null) return 0;
  return new Decimal(valor).toDecimalPlaces(decimales, Decimal.ROUND_HALF_UP).toNumber();
};

export function numeroALetras(numero: number): string {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const decenas = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  const parteEntera = Math.floor(numero);
  const parteDecimal = Math.round((numero - parteEntera) * 100);

  const convertirGrupo = (n: number): string => {
      if (n === 0) return '';
      if (n === 100) return 'CIEN';
      let resultado = '';
      if (n >= 100) { resultado += centenas[Math.floor(n / 100)] + ' '; n = n % 100; }
      if (n >= 10 && n <= 19) { resultado += especiales[n - 10]; return resultado.trim(); }
      if (n >= 20) { resultado += decenas[Math.floor(n / 10)]; n = n % 10; if (n > 0) resultado += ' Y '; }
      if (n > 0 && n < 10) { resultado += unidades[n]; }
      return resultado.trim();
  };

  let texto = '';
  if (parteEntera === 0) texto = 'CERO';
  else if (parteEntera === 1) texto = 'UN';
  else if (parteEntera < 1000) texto = convertirGrupo(parteEntera);
  else if (parteEntera < 1000000) {
      const miles = Math.floor(parteEntera / 1000);
      const resto = parteEntera % 1000;
      texto = (miles === 1 ? 'MIL' : convertirGrupo(miles) + ' MIL');
      if (resto > 0) texto += ' ' + convertirGrupo(resto);
  } else texto = parteEntera.toString();

  const decimalesStr = parteDecimal.toString().padStart(2, '0');
  return `${texto} ${decimalesStr}/100 USD`;
}

// Para el form builder, calculamos líneas y luego resumen
export const calcularLineaProducto = (item: any, numItem: number, tipoDte: string = '01') => {
  const tipoItem = item.tipoItem || 1;
  const precioIncluyeIva = ['01', '14', '11'].includes(tipoDte) ? (tipoDte === '01') : false; // Simplificado

  const cantidad = new Decimal(item.cantidad || 0);
  const precioUnitario = new Decimal(item.precioUnitario || item.precioUni || 0);
  const descuento = new Decimal(item.descuento || item.montoDescu || 0);

  const montoBruto = cantidad.mul(precioUnitario);
  const montoNeto = montoBruto.sub(descuento);

  let precioUni, ventaGravada, ivaItem;

  if (precioIncluyeIva) {
      precioUni = precioUnitario; // Preserva el precio unitario ingresado con IVA por ley DTE-01
      const divisor = new Decimal(1).add(TASA_IVA); // 1.13
      
      // MH requiere que cantidad * precioUni == ventaGravada. Por tanto, ventaGravada INCLUYE IVA.
      ventaGravada = montoNeto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      
      // Calculamos el ivaItem (Monto - Monto/1.13) como información
      const montoSinIva = montoNeto.div(divisor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      ivaItem = montoNeto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).sub(montoSinIva);
  } else if (tipoDte === '14' || tipoDte === '11') {
      precioUni = precioUnitario;
      ventaGravada = montoNeto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      ivaItem = new Decimal(0);
  } else {
      precioUni = precioUnitario;
      ventaGravada = montoNeto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      ivaItem = montoNeto.mul(TASA_IVA).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // DTE-15 (CD): campo donacion en lugar de ventaGravada/ivaItem
  if (tipoDte === '15') {
    return {
      numItem,
      tipoItem,
      cantidad: cantidad.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber(),
      precioUni: precioUni.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      montoDescu: descuento.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      donacion: montoNeto.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      ventaGravada: 0,
      ivaItem: 0,
    };
  }

  return {
    numItem,
    tipoItem,
    cantidad: cantidad.toDecimalPlaces(8, Decimal.ROUND_HALF_UP).toNumber(),
    precioUni: precioUni.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    montoDescu: descuento.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    ventaGravada: ventaGravada.toNumber(),
    compra: tipoDte === '14' ? ventaGravada.toNumber() : 0,
    ivaItem: ivaItem.toNumber()
  };
};

export const calcularResumenFactura = (lineas: any[], condicionOperacion = 1, tipoDte = '01', opciones: { aplicarReteRenta?: boolean; aplicarReteIva1?: boolean; aplicarPerciIva1?: boolean } = {}) => {
  const usaTributos = ['03', '05', '06'].includes(tipoDte);
  const precioIncluyeIva = tipoDte === '01';

  let totalNoSuj = new Decimal(0);
  let totalExenta = new Decimal(0);
  let totalGravada = new Decimal(0);
  let totalDescuento = new Decimal(0);
  let totalIva = new Decimal(0);

  lineas.forEach(linea => {
      if (tipoDte === '14') {
          totalGravada = totalGravada.add(linea.compra || 0);
      } else if (tipoDte === '15') {
          // CD: acumular campo donacion
          totalGravada = totalGravada.add(linea.donacion || 0);
      } else {
          totalGravada = totalGravada.add(linea.ventaGravada || 0);
          totalIva = totalIva.add(linea.ivaItem || 0);
      }
      totalDescuento = totalDescuento.add(linea.montoDescu || 0);
  });

  totalGravada = totalGravada.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  totalDescuento = totalDescuento.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  if (usaTributos && totalIva.isZero()) {
      totalIva = totalGravada.mul(TASA_IVA).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else {
      totalIva = totalIva.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const subTotal = totalNoSuj.add(totalExenta).add(totalGravada).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // CD (15): resumen de donación
  if (tipoDte === '15') {
      return {
          totalDonado: totalGravada.toNumber(),
          totalDescu: totalDescuento.toNumber(),
          totalPagar: totalGravada.toNumber(),
          condicionOperacion,
      };
  }

  if (tipoDte === '14') {
      const reteRenta = totalGravada.mul(TASA_RETENCION_RENTA).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const montoTotalOperacion = subTotal.sub(reteRenta).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      return {
          totalCompra: totalGravada.toNumber(),
          totalDescu: totalDescuento.toNumber(),
          subTotal: subTotal.toNumber(),
          reteRenta: reteRenta.toNumber(),
          totalPagar: montoTotalOperacion.toNumber(),
          condicionOperacion
      };
  }

  // Calcular retenciones especiales para CCF
  let ivaRete1 = new Decimal(0);
  let ivaPerci1 = new Decimal(0);
  let reteRenta = new Decimal(0);

  if (tipoDte === '03') {
      if (opciones.aplicarReteRenta) {
          // 10% Renta sobre servicios (tipoItem === 2)
          const baseServicios = lineas
              .filter(l => l.tipoItem === 2)
              .reduce((sum, l) => sum.add(l.ventaGravada || 0), new Decimal(0));
          reteRenta = baseServicios.mul(TASA_RETENCION_RENTA).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }

      if (opciones.aplicarReteIva1) {
          // 1% Retención IVA (Gran Contribuyente)
          ivaRete1 = totalGravada.mul(0.01).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }

      if (opciones.aplicarPerciIva1) {
          // 1% Percepción IVA
          ivaPerci1 = totalGravada.mul(0.01).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      }
  }

  let montoTotalOperacion;

  if (precioIncluyeIva) {
      montoTotalOperacion = subTotal;
  } else if (tipoDte === '11') {
      montoTotalOperacion = subTotal;
  } else {
      montoTotalOperacion = subTotal.add(totalIva).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // totalPagar = montoTotalOperacion - ReteRenta - ReteIVA + PercepcionIVA
  const totalPagar = montoTotalOperacion
      .sub(reteRenta)
      .sub(ivaRete1)
      .add(ivaPerci1)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
      subTotalVentas: subTotal.toNumber(),
      totalDescu: totalDescuento.toNumber(),
      subTotal: subTotal.toNumber(),
      montoTotalOperacion: montoTotalOperacion.toNumber(),
      totalIva: totalIva.toNumber(),
      ivaRete1: ivaRete1.toNumber(),
      ivaPerci1: ivaPerci1.toNumber(),
      reteRenta: reteRenta.toNumber(),
      totalPagar: totalPagar.toNumber(),
      totalLetras: numeroALetras(totalPagar.toNumber()),
      condicionOperacion
  };
};
