import { z } from 'zod';

const rawApiUrl: string =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  'http://localhost:4000/api';

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:4000/api'),
  VITE_API_BASE_URL: z.string().default('http://localhost:4000/api'),
  VITE_USE_MOCK: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  VITE_DEFAULT_SITE: z.string().default('DAR1'),
});

const parsed = envSchema.safeParse({
  VITE_API_URL: rawApiUrl,
  VITE_API_BASE_URL: rawApiUrl,
  VITE_USE_MOCK: import.meta.env.VITE_USE_MOCK,
  VITE_DEFAULT_SITE: import.meta.env.VITE_DEFAULT_SITE,
});

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
}

export const env = parsed.success
  ? parsed.data
  : {
      VITE_API_URL: rawApiUrl,
      VITE_API_BASE_URL: rawApiUrl,
      VITE_USE_MOCK: false,
      VITE_DEFAULT_SITE: 'DAR1',
    };

export default env;
