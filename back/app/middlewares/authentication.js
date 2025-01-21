

import tokens from '../lib/tokens.js'; // Assurez-vous que cette fonction soit correctement importée
import config from '../config.js'; 


// =========== Authentication middleware ============
export function isAuthenticated(req, res, next) {
  const authorizationHeader = req.headers["Authorization"] || req.headers["authorization"];
console.log("Le headers ma en envoyé ca----------------------------", authorizationHeader);
  // Récupérer le token d'accès depuis les cookies ou l'en-tête Authorization
  const accessToken = req.cookies?.accessToken || req.headers?.["authorization"]?.split("Bearer ")[1];

  // Vérifier si le token d'accès est fourni
  if (!accessToken) {
    return res.status(401).json({ status: 401, message: "Vous n'êtes pas connecter" });
  }

  // Vérifier si le token est valide
  const decodedToken = tokens.verifyJwtToken(accessToken);
  if (!decodedToken) {
    return res.status(401).json({ status: 401, message: "Invalid access token" });
  }

  // Vérification CSRF si activée dans la configuration
  if (config.auth.preventCSRF) {
    const csrfToken = req.headers?.["x-csrf-token"];
    if (!csrfToken) {
      return res.status(401).json({ status: 401, message: "No csrf token provided in request headers" });
    }

    // Vérifier si le CSRF correspond
    if (decodedToken.csrfToken !== csrfToken) {
      return res.status(401).json({ status: 401, message: "Bad CSRF token provided" });
    }
  }

  // Si tout est valide, passer au middleware suivant
  next();
}

// =========== Admin ============

import { User } from '../models/User.js'; // Assurez-vous que le modèle User est correctement importé
import { Role } from '../models/Role.js'; // Assurez-vous que le modèle Role est correctement importé

export async function isAdmin(req, res, next) {
  try {
    // Récupérer l'ID de l'utilisateur à partir du token décodé
    const authorizationHeader = req.headers["Authorization"] || req.headers["authorization"];
    const accessToken = req.cookies?.accessToken || authorizationHeader?.split("Bearer ")[1];
    const decodedToken = tokens.verifyJwtToken(accessToken);

    if (!decodedToken || !decodedToken.id) {
      return res.status(403).json({ status: 403, message: "Accès interdit. Non autorisé." });
    }

    // Vérifier si l'utilisateur a un rôle admin
    const user = await User.findByPk(decodedToken.id, {
      include: [
        {
          model: Role,
          as: 'role', // Utilisez l'alias que vous avez défini dans belongsTo
          attributes: ['name'], // Seul le champ 'name' de la table 'role' sera inclus
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.role.name !== 'admin') {
      return res.status(403).json({ message: 'Accès interdit. Non autorisé.' });
    }

    // L'utilisateur est un admin, continuer
    next();
  } catch (error) {
    console.error("Erreur lors de la vérification du rôle admin :", error);
    res.status(500).json({ status: 500, message: "Erreur interne du serveur." });
  }
}
