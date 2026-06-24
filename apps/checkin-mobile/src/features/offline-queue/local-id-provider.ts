import { randomUUID } from 'expo-crypto';

export type LocalIdProvider = () => string;

export const expoLocalIdProvider: LocalIdProvider = () => randomUUID();
