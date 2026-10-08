import { endpoint } from './response.js';
import * as seo from '../services/seo.service.js';

export const list = endpoint((req) => seo.list(req.query));
export const detail = endpoint((req) => seo.detail(req.params.id));
