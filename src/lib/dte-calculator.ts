import { TIPOS_DTE, TASA_IVA, TASA_RETENCION_RENTA, CODIGO_TRIBUTO_IVA } from './constants';

export const redondear = (valor: number, decimales = 2) => {
  const factor = Math.pow(10, decimales);
  return Math.round(valor * factor) / factor;
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

// NOTE: Para el form builder, calculamos líneas y luego resumen
export const calcularLineaProducto = (item: any, numItem: number, tipoDte: string = '01') => {
  const tipoItem = item.tipoItem || 1;
  const precioIncluyeIva = ['01', '14', '11'].includes(tipoDte) ? (tipoDte === '01') : false; // Simplificado

  const cantidad = parseFloat(item.cantidad);
  const precioUnitario = parseFloat(item.precioUnitario);
  const descuento = parseFloat(item.descuento || 0);

  const montoBruto = cantidad * precioUnitario;
  const montoNeto = montoBruto - descuento;

  let precioUni, ventaGravada, ivaItem;

  if (precioIncluyeIva) {
      precioUni = precioUnitario;
      ventaGravada = redondear(montoNeto, 2);
      ivaItem = redondear(montoNeto / (1 + TASA_IVA) * TASA_IVA, 2);
  } else if (tipoDte === '14' || tipoDte === '11') {
      precioUni = precioUnitario;
      ventaGravada = redondear(montoNeto, 2);
      ivaItem = 0.00;
  } else {
      precioUni = precioUnitario;
      ventaGravada = redondear(montoNeto, 2);
      ivaItem = redondear(montoNeto * TASA_IVA, 2);
  }

  // DTE-15 (CD): campo donacion en lugar de ventaGravada/ivaItem
  if (tipoDte === '15') {
    const montoNeto15 = parseFloat(item.cantidad || 1) * parseFloat(item.precioUnitario || 0) - parseFloat(item.descuento || 0);
    return {
      numItem,
      tipoItem,
      cantidad: redondear(parseFloat(item.cantidad || 1), 8),
      precioUni: redondear(parseFloat(item.precioUnitario || 0), 2),
      montoDescu: redondear(parseFloat(item.descuento || 0), 2),
      donacion: redondear(montoNeto15, 2),
      ventaGravada: 0,
      ivaItem: 0,
    };
  }

  return {
    numItem,
    tipoItem,
    cantidad: redondear(cantidad, 8),
    precioUni: redondear(precioUni, 2),
    montoDescu: redondear(descuento, 2),
    ventaGravada,
    compra: tipoDte === '14' ? ventaGravada : 0,
    ivaItem
  };
};

export const calcularResumenFactura = (lineas: any[], condicionOperacion = 1, tipoDte = '01') => {
  const usaTributos = ['03', '05', '06'].includes(tipoDte);
  const precioIncluyeIva = tipoDte === '01';

  let totalNoSuj = 0, totalExenta = 0, totalGravada = 0, totalDescuento = 0, totalIva = 0;

  lineas.forEach(linea => {
      if (tipoDte === '14') {
          totalGravada += linea.compra || 0;
      } else if (tipoDte === '15') {
          // CD: acumular campo donacion
          totalGravada += linea.donacion || 0;
      } else {
          totalGravada += linea.ventaGravada || 0;
          totalIva += linea.ivaItem || 0;
      }
      totalDescuento += linea.montoDescu || 0;
  });

  totalGravada = redondear(totalGravada);
  totalDescuento = redondear(totalDescuento);

  if (usaTributos && totalIva === 0) {
      totalIva = redondear(totalGravada * TASA_IVA);
  } else {
      totalIva = redondear(totalIva);
  }

  const subTotal = redondear(totalNoSuj + totalExenta + totalGravada);

  // CD (15): resumen de donación
  if (tipoDte === '15') {
      return {
          totalDonado: redondear(totalGravada),
          totalDescu: totalDescuento,
          totalPagar: redondear(totalGravada),
          condicionOperacion,
      };
  }

  if (tipoDte === '14') {
      const reteRenta = redondear(totalGravada * TASA_RETENCION_RENTA);
      const montoTotalOperacion = redondear(subTotal - reteRenta);
      return {
          totalCompra: totalGravada,
          totalDescu: totalDescuento,
          subTotal,
          reteRenta,
          totalPagar: montoTotalOperacion,
          condicionOperacion
      };
  }

  let montoTotalOperacion, reteRenta = 0.00;

  if (precioIncluyeIva) {
      montoTotalOperacion = subTotal;
  } else if (tipoDte === '11') {
      montoTotalOperacion = subTotal;
  } else {
      montoTotalOperacion = redondear(subTotal + totalIva);
  }

  const totalPagar = redondear(montoTotalOperacion);

  return {
      subTotalVentas: subTotal,
      totalDescu: totalDescuento,
      subTotal,
      montoTotalOperacion,
      totalPagar,
      totalIva,
      totalLetras: numeroALetras(totalPagar),
      condicionOperacion
  };
};
