const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    server: {
        // Force Metro to listen on all network interfaces
        // This allows your phone to connect via your computer's IP
        enhanceMiddleware: (middleware) => {
            return (req, res, next) => {
                // Allow CORS for development
                res.setHeader('Access-Control-Allow-Origin', '*');
                return middleware(req, res, next);
            };
        },
    },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
