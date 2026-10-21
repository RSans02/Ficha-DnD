import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1', 'owlbear.rodeo', 'www.owlbear.rodeo'],
  async headers() {
    return [{ source: '/owlbear-manifest.json', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] }];
  },
};
export default config;
