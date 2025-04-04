module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current', // Pour adapter à la version de Node.js utilisée
      },
      modules: 'auto' // Assurer que Babel sait comment gérer les modules
    }],
    '@babel/preset-typescript',  // Pour le support TypeScript
  ],
};
