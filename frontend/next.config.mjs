import axios from 'axios';

const createUser = async (userData) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/users`, userData);
    return response.data;
  } catch (error) {
    console.error('Error creating trial user:', {
      message: error.message,
      config: error.config,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      } : null,
    });
    throw error;
  }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      automaticNameDelimiter: '.',
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
