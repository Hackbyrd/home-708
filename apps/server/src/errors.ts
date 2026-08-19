export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(404, "NOT_FOUND", `${resource} was not found`);
  }
}

export class RevisionConflictError extends ApiError {
  constructor(expected: number, actual: number) {
    super(
      409,
      "REVISION_CONFLICT",
      "The resource changed after this draft was loaded",
      { expected, actual },
    );
  }
}
