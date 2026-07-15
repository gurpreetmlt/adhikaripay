export class HttpError extends Error {
  statusCode: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(statusCode: number, message: string, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}
