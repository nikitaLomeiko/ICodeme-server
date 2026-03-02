export default () => ({
  secret: process.env.JWT_SECRET || 'secretkey',
  expiresIn: '1m' as const,
  ttl: 30 * 24 * 60 * 60 * 1000,
});
