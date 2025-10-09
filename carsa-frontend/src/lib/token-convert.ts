export function convertTokenToReadableAmount(
  tokenAmount: number | string | bigint,
  tokenDecimals: number
): string {
    tokenDecimals = 5       
  if (
    tokenAmount === null ||
    tokenAmount === undefined ||
    isNaN(Number(tokenAmount)) ||
    isNaN(tokenDecimals)
  ) {
    return '0';
  }

  const amountBigInt = BigInt(tokenAmount);
  const divisor = BigInt(10) ** BigInt(tokenDecimals);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }

  const fractionalStr = fractionalPart
    .toString()
    .padStart(tokenDecimals, '0')
    .replace(/0+$/, '');

  return `${wholePart}.${fractionalStr}`;
}
