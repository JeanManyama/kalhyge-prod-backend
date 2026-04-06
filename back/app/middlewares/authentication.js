import tokens from "../lib/tokens.js";
import config from "../config.js";

// Authentication middleware
export function isAuthenticated(req, res, next) {
	const authorizationHeader =
		req.headers["Authorization"] || req.headers["authorization"];
	console.log(
		"Le headers ma en envoyé ca----------------------------",
		authorizationHeader,
	);
	// Récupérer le token d'accès depuis l'en-tête Authorization
	const accessToken =
		req.cookies?.accessToken ||
		req.headers?.["authorization"]?.split("Bearer ")[1];

	if (!accessToken) {
		return res.status(404).json("Accès non autorisé");
	}

	// Vérifier si le token est valide
	const decodedToken = tokens.verifyJwtToken(accessToken);
	if (!decodedToken) {
		return res.status(404).json("Accès non autorisé");
	}

	// Vérification CSRF si activée dans la configuration
	if (config.auth.preventCSRF) {
		const csrfToken = req.headers?.["x-csrf-token"];
		if (!csrfToken) {
			return res.status(404).json("Accès non autorisé");
		}

		// Vérifier si le CSRF correspond
		if (decodedToken.csrfToken !== csrfToken) {
			return res.status(404).json("Accès non autorisé");
		}
	}

	// Si tout est valide, passer au middleware suivant
	next();
}

// =========== Admin ============

import { User } from "../models/User.js"; // Assurez-vous que le modèle User est correctement importé
import { Role } from "../models/Role.js"; // Assurez-vous que le modèle Role est correctement importé

export async function isAdmin(req, res, next) {
	try {
		// Récupérer l'ID de l'utilisateur à partir du token décodé
		const authorizationHeader =
			req.headers["Authorization"] || req.headers["authorization"];
		const accessToken =
			req.cookies?.accessToken || authorizationHeader?.split("Bearer ")[1];
		const decodedToken = tokens.verifyJwtToken(accessToken);

		if (!decodedToken || !decodedToken.id) {
			return res.status(404).json("Accès non autorisé");
		}

		// Vérifier si l'utilisateur a un rôle admin
		const user = await User.findByPk(decodedToken.id, {
			include: [
				{
					model: Role,
					as: "role", // Utilisez l'alias que vous avez défini dans belongsTo
					attributes: ["name"], // Seul le champ 'name' de la table 'role' sera inclus
				},
			],
		});

		if (!user) {
			return res.status(404).json("non trouvé");
		}

		if (user.role.name !== "admin") {
			return res.status(404).json("Accès non autorisé");
		}

		// L'utilisateur est un admin, continuer
		next();
	} catch (error) {
		console.error("Erreur lors de la vérification du rôle admin :", error);
		res
			.status(500)
			.json({ status: 500, message: "Erreur interne du serveur." });
	}
}
