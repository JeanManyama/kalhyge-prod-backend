module.exports = {
  transform: {
    '^.+\\.(js|ts)$': 'babel-jest', // Utiliser babel-jest pour les fichiers JS et TS
  },
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'], // Si tu utilises TypeScript, garde cette configuration
};
