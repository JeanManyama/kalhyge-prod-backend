import crypto from 'node:crypto';
import { promisify } from 'node:util';
import config from '../config.js'; // Assurez-vous que ce chemin soit correct

const scrypt = promisify(crypto.scrypt); // Node.js recommande l'utilisation de la version asynchrone de scrypt pour éviter de bloquer la boucle d'événements. Ici, on la "promesifie" pour la lisibilité.


const cryptos = {
  async hash(password) {
    // Utilisation de l'algorithme scrypt, suivant les recommandations OWASP
    const { saltLength, hashLength, cost, blockSize, parallelization, maxmem } = config.auth.crypto.scrypt;

    const salt = crypto.randomBytes(saltLength).toString('hex');
    const hashBuffer = await scrypt(password, salt, hashLength, { cost, blockSize, parallelization, maxmem });
    return `${hashBuffer.toString('hex')}.${salt}`; // Le salt est stocké avec le mot de passe haché pour permettre la comparaison
  },

  async compare(plainTextPassword, hashedPassword) {
    const [hash, salt] = hashedPassword.split('.');
    const hashedPasswordBuffer = Buffer.from(hash, 'hex');

    const { hashLength, cost, blockSize, parallelization, maxmem } = config.auth.crypto.scrypt;
    const plainTextPasswordBuffer = await scrypt(plainTextPassword, salt, hashLength, { cost, blockSize, parallelization, maxmem });

    return crypto.timingSafeEqual(hashedPasswordBuffer, plainTextPasswordBuffer); // Comparaison sécurisée
  },

  unsaltedHash(data) {
    const { unsaltedHashAlgorithm } = config.auth.crypto;
    return crypto.createHash(unsaltedHashAlgorithm).update(data).digest('hex'); // Utilisation de .createHash pour un algorithme spécifique
  }
};

export default cryptos;
