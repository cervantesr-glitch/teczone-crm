// Importe con letra para documentos comerciales en México.
const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TWENTIES = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const TENS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function below100(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 30) return TWENTIES[n - 20];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${TENS[t]} Y ${UNITS[u]}` : TENS[t];
}

function below1000(n: number): string {
  if (n === 100) return 'CIEN';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [HUNDREDS[h], below100(rest)].filter(Boolean).join(' ');
}

export function integerInWords(n: number): string {
  if (n === 0) return 'CERO';
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(millions === 1 ? 'UN MILLÓN' : `${integerInWords(millions)} MILLONES`);
  if (thousands) parts.push(thousands === 1 ? 'MIL' : `${below1000(thousands)} MIL`);
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

export function amountInWords(amount: number, currency: 'MXN' | 'USD') {
  const cents = Math.round(amount * 100);
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, '0');
  const words = integerInWords(whole);
  // "UN MILLÓN DE PESOS", pero "UN MILLÓN DOSCIENTOS PESOS".
  const of = /MILL(ÓN|ONES)$/.test(words) ? ' DE' : '';
  const unit = currency === 'MXN' ? (whole === 1 ? 'PESO' : 'PESOS') : whole === 1 ? 'DÓLAR' : 'DÓLARES';
  return `${words}${of} ${unit} ${frac}/100 ${currency === 'MXN' ? 'M.N.' : 'USD'}`;
}
