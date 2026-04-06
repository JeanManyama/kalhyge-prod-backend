import { Timer, Article, Production, Machine } from "../models/index.js";
import { Op } from "sequelize";

let timerInterval;

export default {
	// Récupérer tous les timers
	async getAll(_, res) {
		try {
			const timers = await Timer.findAll();
			res.json(timers);
		} catch (err) {
			console.error(err);
			res
				.status(500)
				.json({ message: "Erreur lors de la récupération des timers" });
		}
	},

	// Démarrage de l'app (Initialisation) (faire une boucle pour chaque produit)
	async startApp(productId) {
		// Mettre à jour la table article
		await Article.update(
			{
				initial_quantity: s1,
				objective: s2,
			},
			{
				where: { id: productId }, // Mettez à jour l'article avec id = 2
			},
		);

		console.log("Mise à jour effectuée avec succès");
	},
	// Mise à jour d'un timer
	async updateTimer(req, res, next) {
		const { id } = req.params;
		const timerInput = req.body;

		const [, timers] = await Timer.update(timerInput, {
			where: { id },
			returning: true,
		});

		if (!timers || !timers.length) {
			return next();
		}

		const [timer] = timers;

		res.json(timer);
	},

	// async delete(req, res, next){
	//     const {id} = req.params;
	//     const deleted = await Timer.destroy({where: {id}});
	//     if(!deleted){
	//         return next();
	//
	//     res.status(204).json();
	// },

	// async getByTimer(req, res, next){
	//     const {timerId} = req.params;
	//     const timers = await Timer.findAll({where: {timer_id: timerId}});

	//     res.json(timers);
	// },

	// async getOne(req, res, next){
	//     const {id} = req.params;
	//     const timer = await Timer.findByPk(id);

	//     if(!timer){
	//         return next();
	//     }

	//     res.json(timer);
	// },
	// Creation Timer
	// Déclarer la variable de l'intervalle
	async create(req, res) {
		try {
			const { user_id, durationTimer } = req.body;

			if (!user_id) {
				res
					.status(400)
					.json({ message: "L'identifiant de l'utilisateur est requis" });
				return;
			}

			// Vérification qu'aucun timer actif n'existe
			const activeTimer = await Timer.findOne({
				where: { status: true },
			});

			if (activeTimer) {
				res.status(400).json({ message: "Un timer est déjà en cours." });
				return;
			}

			const today = new Date();
			const formattedToday = today.toLocaleDateString("en-CA"); // Date formatée pour la base de données

			// console.log("LA DATE A ENREGISTRER EST ------------------------------------------:", formattedToday);
			// Créer un nouveau timer avec la date actuelle et l'utilisateur
			const timerInput = {
				user_id,
				time_begin: new Date(), // Heure de début
				date: formattedToday, // Date d'aujourd'hui
				status: true, // Le timer commence
				duration: durationTimer,
			};

			const timer = await Timer.create(timerInput);

			// Démarrer le setInterval
			timerInterval = setInterval(updateTimerRealTime, 10000);

			// Diffuser via WebSocket que le timer a démarré
			if (req.io) {
				req.io.emit("timerUpdated", { action: "start", timer });
			}

			res.status(201).json(timer);
		} catch (err) {
			console.error(err);
			res.status(500).json({ message: "Erreur lors du lancement du server" });
		}
	},

	// Arrêter un timer actif
	async updateObjectiveHistoricalAndStop(req, res, next) {
		try {
			// 1. Récupérer le timer actif
			const activeTimer = await Timer.findOne({ where: { status: true } });

			if (!activeTimer) {
				return res.status(404).json({ message: "Aucun timer actif trouvé." });
			}

			// Le timer actif existe, donc on peut utiliser son ID
			const timer_id = activeTimer.id;

			// 2. Mettre à jour l'objectif historique des productions
			const productionsToUpdate = await Production.findAll({
				where: { timer_id },
				include: [
					{
						model: Article,
						as: "articles",
						attributes: ["objective"],
					},
				],
			});

			for (const production of productionsToUpdate) {
				if (production.articles?.objective) {
					await production.update({
						objective_historical: production.articles.objective,
					});
				}
			}

			// 3. Arrêter le timer
			activeTimer.time_end = new Date(); // Heure de fin
			activeTimer.status = false; // Le timer s'arrête
			await activeTimer.save();

			clearInterval(timerInterval); // Stop l'intervalle du timer si nécessaire

			// Diffusion via WebSocket que le timer a été arrêté
			if (req.io) {
				req.io.emit("timerUpdated", { action: "stop", timer: activeTimer });
			}

			res.status(200).json(activeTimer);
		} catch (err) {
			console.error(err);
			res.status(500).json({ message: "Erreur lors de l'arrêt du timer" });
		}
	},

	// async  updateObjectiveHistorical(req, res, next) {
	//   try {
	//     // Récupérer le timer_id depuis req.body
	//     const { timer_id } = req.body;

	//     // Vérification : Assurez-vous que timer_id est bien fourni
	//     if (!timer_id) {
	//       return res.status(400).json({ message: "timer_id est requis." });
	//     }

	//     // Rechercher les lignes de production qui correspondent au timer_id
	//     const productionsToUpdate = await Production.findAll({
	//       where: { timer_id },
	//       include: [
	//         {
	//           model: Article,
	//           as: "articles", // Alias défini dans les associations
	//           attributes: ["objective"], // Récupérer uniquement le champ objective
	//         },
	//       ],
	//     });

	//     // Mettre à jour le champ objective_historical pour chaque ligne trouvée
	//     for (const production of productionsToUpdate) {
	// 			if (production.articles?.objective) {
	//         await production.update({
	//           objective_historical: production.articles.objective,
	//         });
	//       }
	//     }

	//     return res.status(200).json({ message: "Mise à jour réussie !" });
	//   } catch (error) {
	//     console.error("Erreur lors de la mise à jour de objective_historical :", error);
	//     next(error);
	//   }
	// }

	// Réinitialiser un timer
	async reset(req, res) {
		try {
			// Trouver le timer actif
			const activeTimer = await Timer.findOne({
				where: { status: true },
			});

			if (!activeTimer) {
				res.status(404).json({ message: "Aucun timer actif trouvé." });
				return;
			}

			// Réinitialiser le timer
			activeTimer.time_elapsed = 0; // Réinitialiser le temps écoulé
			activeTimer.time_begin = new Date(); // Redémarrer la date de début
			await activeTimer.save();

			// Diffuser via WebSocket que le timer a été réinitialisé
			if (req.io) {
				req.io.emit("timerUpdated", { action: "reset", timer: activeTimer });
			}

			res.status(200).json(activeTimer);
		} catch (err) {
			console.error(err);
			res
				.status(500)
				.json({ message: "Erreur lors de la réinitialisation du timer" });
		}
	},

	// Supprimer un timer
	async delete(req, res, next) {
		try {
			const { id } = req.params;

			const deleted = await Timer.destroy({
				where: { id },
			});

			if (!deleted) {
				return next();
			}

			res.status(204).json({ message: "Timer supprimé avec succès." });
		} catch (err) {
			console.error(err);
			res
				.status(500)
				.json({ message: "Erreur lors de la suppression du timer" });
		}
	},

	async getActiveTimer(req, res) {
		try {
			// Récupérer le timer actif
			const activeTimer = await Timer.findOne({
				where: { status: true },
			});

			if (!activeTimer) {
				res.status(404).json({ message: "Aucun timer actif trouvé." });
				return;
			}
			// console.log("LE TIMER ACTIF EST --------------------------------------------------------", activeTimer);
			// Envoyer l'état du timer via WebSocket pour que les utilisateurs le voient
			if (req.io) {
				req.io.emit("timerUpdated", { action: "start", timer: activeTimer });
			}

			res.json(activeTimer);
		} catch (err) {
			console.error(err);
			res
				.status(500)
				.json({ message: "Erreur lors de la récupération du timer actif" });
		}
	},
	// Recup de l'Id Timer à partir de la date
	async getTodayTimer(req, res) {
		try {
			// Obtenir la date d'aujourd'hui
			const today = new Date().toISOString().split("T")[0]; // Formate la date en "YYYY-MM-DD"

			// Récupérer le timer actif pour la date d'aujourd'hui
			const activeTimer = await Timer.findOne({
				where: {
					date: today,
				},
				attributes: ["id"], // Sélectionner uniquement l'ID
			});

			if (!activeTimer) {
				res
					.status(404)
					.json({ message: "Aucun timer trouvé pour aujourd'hui." });
				return;
			}

			// // Envoyer l'état du timer via WebSocket pour que les utilisateurs le voient
			// if (req.io) {
			//   req.io.emit("timerUpdated", { action: "start", timerId: activeTimer.id });
			// }

			// Retourner l'ID du timer actif
			res.json({ timerId: activeTimer.id });
		} catch (err) {
			console.error(err);
			res
				.status(500)
				.json({ message: "Erreur lors de la récupération du timer actif" });
		}
	},
};
// Fonction utilitaire pour mettre à jour le timer en temps réel
async function updateTimerRealTime() {
	console.log("Mise à jour du timer...");
	try {
		const activeTimer = await Timer.findOne({
			where: { status: true },
		});

		if (!activeTimer) {
			console.log("Aucun timer actif.");
			return;
		}

		const now = new Date();
		const timeElapsed = Math.floor(
			(now - new Date(activeTimer.time_begin)) / 1000,
		); // Calcul en secondes

		// Mise à jour dans la base
		activeTimer.time_elapsed = timeElapsed;
		await activeTimer.save();

		// Diffuser les mises à jour via WebSocket
		if (global.io) {
			global.io.emit("timerUpdated", { action: "update", timer: activeTimer });
		}
	} catch (err) {
		console.error("Erreur lors de la mise à jour du timer:", err);
	}
}
