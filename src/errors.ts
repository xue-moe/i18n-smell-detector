export class AppError extends Error {
  code: string;

  constructor(message: string, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function appError(message: string, code: string) {
  return new AppError(message, code);
}
