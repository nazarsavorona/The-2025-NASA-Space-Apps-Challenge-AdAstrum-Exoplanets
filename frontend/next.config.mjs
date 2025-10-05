const buildCsp = () => {
  const isDev = process.env.NODE_ENV === 'development';

  const scriptSources = ["'self'"];
  if (isDev) {
    scriptSources.push("'unsafe-inline'", "'unsafe-eval'", 'blob:');
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "img-src 'self' data: https://images.unsplash.com",
    "font-src 'self'",
    isDev
      ? "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
      : "connect-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(' ')}`,
  ];

  return directives.join('; ');
};

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: buildCsp(),
  }
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
