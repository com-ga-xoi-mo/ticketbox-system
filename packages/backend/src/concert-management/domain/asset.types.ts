export interface ServableAsset {
  id: string;
  kind: string;
  status: string;
  storageKey: string;
  contentType: string | null;
}

export interface AssetContent {
  content: Buffer;
  contentType: string;
}
