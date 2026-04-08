import { Article } from "../models/index.js";

export default {
	async getAll(_, res) {
		const articles = await Article.findAll();
		console.log(articles);
		res.status(200).json(articles);
	},

	async getOne(req, res, next) {
		const { id } = req.params;
		const article = await Article.findByPk(id);

		if (!article) {
			return next();
		}

		res.json(article);
	},

	async create(req, res) {
		if (process.env.NODE_ENV !== "test") {
			console.log("Données reçues au backend, le voici :", req.body);
		}

		// Vérifiez si req.body.name existe et est non vide
		if (!req.body.name) {
			res.status(400).json({ error: "Le champ 'name' est requis." });
			return;
		}

		const articleData = {
			name: req.body.name.trim(), // Utilisez directement req.body.name
		};

		try {
			// Verification doublon manuellemen
			const existingArticle = await Article.findOne({
				where: { name: req.body.name.trim() },
			});
			if (existingArticle) {
				res.status(409).json({ error: "Un article avec ce nom existe déjà." });
				return;
			}
			// Création de l'article
			const article = await Article.create(articleData);
			res.status(201).json(article); // Réponse avec le nouvel article créé
		} catch (err) {
			console.error(err);
			if (err.name === "SequelizeUniqueConstraintError") {
				res.status(409).json({ error: "Le nom de l'article existe déjà." });
				return;
			}
			res
				.status(400)
				.json({ error: "Erreur lors de la création de l'article." });
		}
	},
	// Update name de l'article
	async update(req, res, next) {
		const { id, name } = req.body; // Récupère l'ID et le nouveau nom depuis le body

		if (!id) {
			res.status(400).json({ error: "ID de l'article requis." });
			return;
		}

		try {
			const [, articles] = await Article.update(
				{ name }, // Met à jour le champ "name"
				{
					where: { id },
					returning: true, // Retourne les valeurs mises à jour
				},
			);

			if (!articles?.length) {
				res.status(404).json({ error: "Article non trouvé." });
				return;
			}

			const [article] = articles;
			res.json(article); // Retourne l'article mis à jour
		} catch (error) {
			next(error); // Gestion des erreurs
		}
	},

	// Update naObjective de l'article
	async updateObjective(req, res, next) {
		const { id, objective } = req.body; // Récupère l'ID depuis le body
		// console.log("ON EST DANS UPDATE OBJECTIVE J'AI RECU :-------------/////// ------------------", id, objective);
		if (!id) {
			res.status(400).json({ error: "ID de l'article requis." });
			return;
		}

		try {
			const [, articles] = await Article.update(
				{ objective }, // Met à jour le champ "objective"
				{
					where: { id },
					returning: true, // Retourne les valeurs mises à jour
				},
			);

			if (!articles?.length) {
				res.status(404).json({ error: "Article non trouvé." });
				return;
			}

			const [article] = articles;
			res.json(article); // Retourne l'article mis à jour
		} catch (error) {
			next(error); // Gestion des erreurs
		}
	},

	async delete(req, res, next) {
		const { id } = req.body;

		if (!id) {
			res.status(400).json({ error: "ID de l'article manquant." }); // Vérifie si l'ID est fourni
			return;
		}

		try {
			const deleted = await Article.destroy({ where: { id } });

			if (!deleted) {
				res.status(404).json({ error: "Article non trouvé." });
				return;
			}

			res.status(204).json(); // Suppression réussie
		} catch (err) {
			next(err); // Gestion des erreurs
		}
	},
};
