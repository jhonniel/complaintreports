export class ProductionStorageError extends Error {
  constructor() {
    super('The service is temporarily unavailable.')
    this.name = 'ProductionStorageError'
  }
}
