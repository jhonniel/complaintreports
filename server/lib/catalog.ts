export class CatalogItemNotFoundError extends Error {
  constructor(kind: 'category' | 'department') {
    super(kind === 'category' ? 'Category not found.' : 'Department not found.')
    this.name = 'CatalogItemNotFoundError'
  }
}

export class DuplicateCatalogNameError extends Error {
  constructor(kind: 'category' | 'department') {
    super(
      kind === 'category'
        ? 'A category with this name already exists.'
        : 'A department with this name already exists.',
    )
    this.name = 'DuplicateCatalogNameError'
  }
}

export class LastActiveCategoryError extends Error {
  constructor() {
    super('Keep at least one active category so residents can submit reports.')
    this.name = 'LastActiveCategoryError'
  }
}
