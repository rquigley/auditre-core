export function uuidV7ToDate(uuidV7: string): Date {
  // Directly extract the first 12 characters (48 bits) from the UUID, skipping dashes
  const timeHex = uuidV7.split('-').join('').slice(0, 12);

  // Convert hexadecimal timestamp to decimal
  const timeDecimal = BigInt(`0x${timeHex}`);

  // Timestamp difference between 1582-10-15 and 1970-01-01 in 10ns intervals
  const uuidEpochDiff = BigInt(141427 * 24 * 3600 * 1000 * 1000 * 10);

  // Convert to UNIX epoch time in 10ns intervals
  const unixTime10ns = timeDecimal - uuidEpochDiff;

  // Convert to UNIX epoch time in milliseconds
  const unixTimeMs = Number(unixTime10ns / BigInt(10000));

  return new Date(unixTimeMs);
}
