import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'htdiytcpgyawxzpitlll.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Fix for MetaMask SDK trying to import React Native modules
    if (!isServer) {
      const path = require('path');
      const emptyModule = path.resolve(__dirname, 'empty-module.js');
      
      // Use NormalModuleReplacementPlugin to replace the module
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^@react-native-async-storage\/async-storage$/,
          emptyModule
        )
      );
      
      // Also set alias and fallback as backup
      config.resolve.alias = {
        ...config.resolve.alias,
        '@react-native-async-storage/async-storage': emptyModule,
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
