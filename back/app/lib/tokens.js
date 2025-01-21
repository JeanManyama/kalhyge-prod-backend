import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config.js";

// Déstructuration des configurations nécessaires
const { algorithm, audience, expiresIn, issuer, secret, type } = config.auth.accessToken;
const { expiresIn: refreshTokenExpiresIn } = config.auth.refreshToken;
const { preventCSRF } = config.auth; // Pour les clients basés sur navigateur

/**
 * Génère les tokens d'authentification (accessToken, refreshToken, et csrfToken si nécessaire)
 * @param {Object} user - L'objet utilisateur contenant au minimum un id et firstname
 * @returns {Object} - Contient les tokens et métadonnées associées
 */
function generateAuthenticationTokens(user) {
  const csrfToken = preventCSRF ? generateRandomString() : null;

  const payload = {
    id: user.id,
    firstname: user.firstname,
    ...(csrfToken && { csrfToken }) // Ajout conditionnel du csrfToken dans le payload
  };

  return {
    accessToken: {
      token: generateJwtToken(payload),
      type,
      expiresAt: createExpirationDate(expiresIn),
      expiresInMS: expiresIn
    },
    refreshToken: {
      token: generateRandomString(),
      expiresAt: createExpirationDate(refreshTokenExpiresIn),
      expiresInMS: refreshTokenExpiresIn
    },
    ...(csrfToken && { csrfToken }) // Ajout conditionnel du csrfToken
  };
}

/**
 * Génère un JWT signé
 * @param {Object} payload - Les données à inclure dans le token
 * @returns {string} - Le token JWT signé
 */
function generateJwtToken(payload) {
  return jwt.sign(payload, secret, { algorithm, audience, expiresIn, issuer });
}

/**
 * Vérifie la validité d'un JWT
 * @param {string} token - Le token JWT à vérifier
 * @returns {Object|null} - Le payload décodé si valide, sinon null
 */
function verifyJwtToken(token) {
  try {
    return jwt.verify(token, secret, { algorithms: [algorithm] });
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}

/**
 * Génère une chaîne aléatoire (par exemple pour les refresh tokens ou les CSRF tokens)
 * @returns {string} - Une chaîne aléatoire encodée en base64
 */
function generateRandomString() {
  return crypto.randomBytes(128).toString("base64");
}

/**
 * Crée une date d'expiration basée sur un intervalle en millisecondes
 * @param {number} expiresInMs - La durée de validité en millisecondes
 * @returns {Date} - La date d'expiration
 */
function createExpirationDate(expiresInMs) {
  return new Date(Date.now() + expiresInMs);
}

// Exportation par défaut
export default {
  generateAuthenticationTokens,
  generateJwtToken,
  verifyJwtToken,
  generateRandomString,
  createExpirationDate
};
