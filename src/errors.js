export class AppError extends Error {
  constructor(message, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function appError(message, code) {
  return new AppError(message, code);
}
