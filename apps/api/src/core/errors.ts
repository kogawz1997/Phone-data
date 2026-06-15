export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
  }
}

export function forbidden(message = "Forbidden") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found") {
  return new AppError(404, "NOT_FOUND", message);
}
