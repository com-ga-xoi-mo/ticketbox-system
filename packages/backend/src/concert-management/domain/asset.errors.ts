export class AssetNotServableError extends Error {
  constructor(assetId: string, reason?: string) {
    super(`Asset ${assetId} is not servable${reason ? `: ${reason}` : ''}`);
    this.name = 'AssetNotServableError';
  }
}
