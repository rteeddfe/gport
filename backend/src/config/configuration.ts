export interface AppConfiguration {
  port: number;
  jwtSecret: string;
  corsOrigins: string[];
}

export default (): AppConfiguration => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  jwtSecret: process.env.JWT_SECRET ?? '',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
