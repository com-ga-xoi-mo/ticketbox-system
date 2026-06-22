export type QrHasher = (payload: string) => Promise<string>;

export function createQrHasher(
  digest: (payload: string) => Promise<string>,
): QrHasher {
  return async (payload) => (await digest(payload)).toLowerCase();
}

export const hashQrPayload: QrHasher = async (payload) => {
  const { CryptoDigestAlgorithm, digestStringAsync } = await import('expo-crypto');
  return (await digestStringAsync(CryptoDigestAlgorithm.SHA256, payload)).toLowerCase();
};
