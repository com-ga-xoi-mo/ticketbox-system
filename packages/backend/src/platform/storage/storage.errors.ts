export class StorageUploadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'StorageUploadError';
  }
}

export class StorageObjectNotFoundError extends Error {
  constructor(key: string, options?: ErrorOptions) {
    super(`Storage object not found: ${key}`, options);
    this.name = 'StorageObjectNotFoundError';
  }
}

export class StorageUnavailableError extends Error {
  constructor(message = 'Object storage is unavailable', options?: ErrorOptions) {
    super(message, options);
    this.name = 'StorageUnavailableError';
  }
}
