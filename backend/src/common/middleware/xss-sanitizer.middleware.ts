import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

function sanitize(val: any): any {
  if (typeof val === 'string') {
    // Strip script tags, event handlers, and javascript links
    return val
      .replace(/<script[^>]*>([\S\s]*?)<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitize);
  }
  if (val !== null && typeof val === 'object') {
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        val[key] = sanitize(val[key]);
      }
    }
  }
  return val;
}

function sanitizeInPlace(obj: any): void {
  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = sanitize(obj[key]);
      }
    }
  }
}

@Injectable()
export class XssSanitizerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
      sanitizeInPlace(req.body);
    }
    if (req.query) {
      sanitizeInPlace(req.query);
    }
    if (req.params) {
      sanitizeInPlace(req.params);
    }
    next();
  }
}
