export default () => ({
  secret: process.env.JWT_SECRET || 'secretkey',
  expiresIn: '1h' as const,
  ttl: 30 * 24 * 60 * 60 * 1000,
});
