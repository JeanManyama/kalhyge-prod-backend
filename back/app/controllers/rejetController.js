import { Sequelize, Op } from "sequelize";
import { Machine, Article, Production, Timer } from "../models/index.js";

export default {
	// Récupération de tous les rejets, ainsi que toutes les machines et tous les articles
	async getAllRejects(req, res, next) {
		const timerId = Number.parseInt(req.params.timerId);

		try {
			// Récupérer tous les rejets avec les relations 'articles', 'machines', et filtrer par timerId
			const rejects = await Production.findAll({
				attributes: ["id", "created_at", "quantity_reject_aff"],
				where: {
					[Op.and]: [
						{ quantity_reject_aff: { [Op.ne]: 0 } }, // Filtrer les rejets non nuls
						{ timer_id: timerId }, // Filtrer par timerId
					],
				},
				order: [["created_at", "DESC"]],
				include: [
					{
						model: Article,
						as: "articles",
						attributes: ["id", "name"], // Inclure uniquement les champs 'id' et 'name' des articles
					},
					{
						model: Machine,
						as: "machines",
						attributes: ["id", "name"], // Inclure les champs 'id' et 'name' des machines
					},
				],
			});

			// Récupérer toutes les machines et tous les articles
			const allMachines = await Machine.findAll({
				attributes: ["id", "name"], // Inclure 'id' et 'name' de toutes les machines
			});

			const allArticles = await Article.findAll({
				attributes: ["id", "name"], // Inclure 'id' et 'name' de tous les articles
			});

			// Réponse JSON
			res.json({
				rejects,
				allMachines, // Inclure toutes les machines
				allArticles, // Inclure tous les articles
			});
		} catch (error) {
			console.error("Erreur lors de la récupération des rejets:", error);
			res
				.status(500)
				.json({
					message: "Erreur serveur lors de la récupération des données",
				});
		}
	},

	// Creation d'un rejet
	async create(req, res, next) {
		const { rejectInputForm } = req.body;
		// const articleId =Number.parseInt(  req.body.article_id);
		const articleId = req.body.article_id;
		// const timerId = Number.parseInt(req.body.timer_id);
		// const timerId = req.body.timer_id;
		// const timerId =1;
		const timerId = Number.parseInt(req.body.timer_id);

		// const machineId =Number.parseInt(  req.body.machine_id);
		const machineId = req.body.machine_id;
		// const newQuantity = Number.parseInt( req.body.quantity_reject_aff);
		const newQuantity = req.body.quantity_reject_aff;
		// Récupérer le dernier rejet pour l'article x et la machine y
		const lastReject = await Production.findOne({
			where: {
				article_id: articleId,
				machine_id: machineId,
				timer_id: timerId,
				quantity_reject_aff: { [Sequelize.Op.ne]: 0 },
			},
			order: [["created_at", "DESC"]],
			attributes: ["quantity_reject_aff"],
			limit: 1,
		});

		const lastQuantity = Number.parseInt(
			lastReject ? lastReject.quantity_reject_aff : 0,
		);

		console.log("la valeur du rejet précédent est : ", lastQuantity);

		if (lastQuantity < Number.parseInt(newQuantity)) {
			const rejectInput = {
				...rejectInputForm, // Les autres champs provenant de articleInput
				machine_id: machineId, // Ajout de machine_id
				article_id: articleId, // Ajout de article_id
				timer_id: timerId, // Ajout de timer_id
				quantity_reject_aff: newQuantity, // Quantité affichée
			};

			// enregitrement
			const prod = await Production.create(rejectInput, { returning: true });
			// console.log("le rejet enregistré est ------------: " , prod);
			// Diffuser l'evenement via WebSocket
			if (req.io) {
				// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
				req.io.emit("productionUpdated");
			}
			res.status(201).json(prod);
		} else {
			res.status(403).json({ error: "Impossible déffectuer ce rejet" });
		}
	},

	// Suppression d'un reject (vient de req.body)
	async delete(req, res, next) {
		const idReject = req.body.id;
		//Avant de supprimer, on s'assure que c'est bien un rejet
		const result = await Production.findOne({
			where: {
				id: idReject,
				[Op.or]: [{ quantity_product_aff: { [Op.ne]: 0 } }],
			},
		});

		if (result) {
			res.status(403).json({
				message: `Impossible de supprimer, car c'est une production et non un rejet.`,
			});
		} else {
			const deleted = await Production.destroy({ where: { id: idReject } });
			if (!deleted) {
				return next();
			}
			// Diffuser l'evenement via WebSocket
			if (req.io) {
				// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
				req.io.emit("productionUpdated");
			}
			res.json({ status: 204, message: "suppression avec success" });
		}
	},

	//----------------------Update----------------------//
	// Update des rejets d'un rejet (il attend "prodId" du req.body.prodId)
	async updateMachineOrArticleReject(req, res, next) {
		console.log(
			"Nous sommes rentrer dans updateMachineOrArticleReject------------------------",
		);
		const actionType = req.body.actionType; // 'machine' ou 'article'
		console.log(
			"le type d'action est ---------------------------- : ",
			actionType,
		);
		// Vérifier que le champ actionType existe
		if (!actionType) {
			return res
				.status(400)
				.json({ error: "Impossible d'effectuer l'operation" });
		}

		// Appeler la fonction correcte en fonction du type d'action
		if (actionType === "updateMachine") {
			// Appeler la fonction pour mettre à jour la machine
			await this.updateMachineReject(req, res, next);
		} else if (actionType === "updateArticle") {
			// la fonction pour mettre à jour l'article
			await this.updateArticleReject(req, res, next);
		} else if (actionType === "updateQuantity") {
			// la fonction pour mettre à jour la quantité
			await this.updateQuantityReject(req, res, next);
		} else {
			// Si le type d'action est invalide, retourner une erreur
			return res.status(400).json({ error: "Action requise" });
		}
	},

	// Mise à jour Machine du rejet (timer_id ne pas oublier)
	async updateMachineReject(req, res, next) {
		const articleId = Number.parseInt(req.body.article_id);
		const rejectId = Number.parseInt(req.body.rejectId);
		const machineId = Number.parseInt(req.body.machineId); // La nouvele machine à associer
		const newQuantity = Number.parseInt(req.body.quantity_reject_aff);
		const timerId = Number.parseInt(req.body.timer_id);
		// TIMER A DYNAISER
		// const timerId =1

		// Verification si il existe deja le couple machine_id =x, article_id =y, quantity_reject_aff =z
		const currentRecord = await Production.findOne({
			where: {
				machine_id: machineId,
				article_id: articleId,
				quantity_reject_aff: newQuantity,
				timer_id: timerId,
			},
		});
		// console.log("Si le nouveau couple existe deja c'est --------------------- : " , currentRecord);
		// Si il n'existe pas le couple de 3
		if (!currentRecord) {
			// Trouver maintenant la ligne avec "machine_id"=x et "article_id"=y et "timer_id"=z (sans tenir compte de la qté affichée)
			const currentRecordTab = await Production.findAll({
				where: {
					machine_id: machineId,
					article_id: articleId,
					timer_id: timerId,
				},
			});

			if (currentRecordTab.length === 1) {
				// console.log("Nous sommes dans currentRecordTab.length === 1, la seule ligne que j'ai trouvé est :------- ---------------------", currentRecordTab[0])
				// Donc, il ya une seule ligne avec "machine_id"=x et "article_id"=y, donc on peut modifier la qté affichée
				// AVANT, on verifie où je dois le placer
				if (currentRecordTab[0].quantity_reject_aff > newQuantity) {
					// Je dois le placer avant, avec la date - 1min

					// Function pour enlever une min de l'haure
					// La date initiale
					const initialDate = new Date(`${currentRecordTab[0].created_at}`);

					// Soustraire 1 minute (60 000 millisecondes) à cette date
					const newDate = new Date(initialDate.getTime() - 60 * 1000);

					const [, articles] = await Production.update(
						{
							machine_id: machineId,
							quantity_reject_aff: newQuantity,
							created_at: new Date(),
						},
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				} else {
					// Je dois le placer apres avec la date actuelle
					const [, articles] = await Production.update(
						{
							machine_id: machineId,
							quantity_reject_aff: newQuantity,
							created_at: new Date(),
						},
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				}
			} else if (currentRecordTab.length > 1) {
				//  console.log("Nous sommes dans currentRecordTab.length > 1 :------- ---------------------")

				// Recuperation du created_at +1 (la plus proche mais inferieur)
				const result1Obj = await Production.findOne({
					where: {
						machine_id: machineId,
						article_id: articleId,
						timer_id: timerId,

						quantity_reject_aff: {
							[Op.lt]: newQuantity,
							[Op.gt]: 0,
						},
						quantity_product_aff: 0,
					},
					order: [["quantity_reject_aff", "DESC"]],
					attributes: ["id", "quantity_reject_aff", "created_at", "timer_id"], // On récupère uniquement 'created_at'
					limit: 1, // Limiter à une seule ligne
				});

				// Je verfiel si j'ai bien un objet qui n'est pas null avant de le destructurer
				let result1 = "";
				let quantity_reject_aff_Last = 0;
				let dateLast = "";
				let idProdLast = 0;
				// console.log("lobjet1 est ---------------------", result1Obj?result1Obj:0);
				if (result1Obj) {
					// Je destructure l'objet pour recuperer la date et la quantité
					const { created_at, quantity_reject_aff } = result1Obj;
					result1 = created_at;
					quantity_reject_aff_Last = quantity_reject_aff;
					idProdLast = result1Obj.id;
					// console.log("la date destructurée est Obj1 ---------------------", result1)
					dateLast = result1.toLocaleString("fr-FR", {
						timeZone: "Europe/Paris",
					});
					// console.log("Date inferieur est Obj1  ---------------------", dateLast)
				} else {
					dateLast = 0;
				}

				// Recuperation du created_at -1 (la plus proche mais superieur)
				const result2Obj = await Production.findOne({
					where: {
						machine_id: machineId,
						article_id: articleId,
						timer_id: timerId,

						quantity_reject_aff: {
							[Op.gt]: newQuantity, // Strictement supérieur à `newQuantity`
						},
						quantity_product_aff: 0, // Aucun rejet
					},
					order: [["quantity_reject_aff", "ASC"]],
					attributes: ["id", "quantity_reject_aff", "created_at"], // On récupère uniquement 'created_at'
					limit: 1, // Limiter à une seule ligne
				});

				// Je verfiel si j'ai bien un objet qui n'est pas null avant de le destructurer
				let result2 = "";
				let quantity_reject_aff_Next = 0;
				let dateNext = "";
				let idProdNextd = 0;

				// console.log("lobjet2 est ---------------------", result2Obj?result2Obj:0);

				if (result2Obj) {
					// Je destructure l'objet pour recuperer la date et la quantité
					const { id, quantity_reject_aff, created_at } = result2Obj;
					idProdNextd = id;
					quantity_reject_aff_Next = quantity_reject_aff;
					result2 = created_at;

					dateNext = result2.toLocaleString("fr-FR", {
						timeZone: "Europe/Paris",
					});
				} else {
					dateNext = 0;
				}

				if (dateLast !== 0 && dateNext !== 0) {
					// console.log("Nous sommes dans dateLast !== 0 && dateNext !== 0 ---------------------")
					// Fonction pour générer une date aléatoire entre deux dates
					function getRandomDate(startDate, endDate) {
						const startTimestamp = startDate.getTime();
						const endTimestamp = endDate.getTime();
						const randomTimestamp = Math.floor(
							Math.random() * (endTimestamp - startTimestamp + 1) +
								startTimestamp,
						);
						return new Date(randomTimestamp);
					}
					// Dates de début et de fin
					const startDate = new Date(`${result1}`);
					const endDate = new Date(`${result2}`);

					// Générer une date aléatoire
					const randomDate = getRandomDate(startDate, endDate);

					const [, articles] = await Production.update(
						{ machine_id: machineId, created_at: randomDate },
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				} else if (dateLast === 0 && dateNext !== 0) {
					// Ici, cad y a pas un enregistrement précedent, donc je fais : la premiere date - 1min
					// Function pour enlever une min de l'haure
					// La date initiale
					const initialDate = new Date(`${result2}`);

					// Soustraire 1 minute (60 000 millisecondes) à cette date
					const newDate = new Date(initialDate.getTime() - 60 * 1000);

					// Je mets toute ligne avec une nouvelle date créee et la nouvelle machine
					const [, articles] = await Production.update(
						{ machine_id: machineId, created_at: newDate },
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				} else if (dateLast !== 0 && dateNext === 0) {
					// Ici, cad y a pas un enregistrement au dessus
					// On mets à jours

					const [, articles] = await Production.update(
						{ machine_id: machineId, created_at: new Date() },
						{
							where: { id: rejectId },
							returning: true,
						},
					);
					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				}
			} else {
				return next();
			}
		} else {
			// Si il existe bien le couple de 3, donc on ne modifie pas !!!
			res.status(201).json(" aucune modification");
		}
	},

	// Mise à jour Article du rejet (timer_id ne pas oublier)
	async updateArticleReject(req, res, next) {
		// console.log("Nous rentrer dans updateArticleReject------------------------")
		const articleId = Number.parseInt(req.body.articleId); // Le nouvel article à associer
		const rejectId = Number.parseInt(req.body.rejectId);
		const machineId = Number.parseInt(req.body.machine_id);
		const newQuantity = Number.parseInt(req.body.quantity_reject_aff);
		const timerId = Number.parseInt(req.body.timer_id);
		// TIMER A DYNAISER
		// const timerId =1
		// console.log("Id machine associer est ---------------------", machineId);
		// console.log("la quantité associer à la ligne ---------------------", newQuantity);
		// console.log("Id du nouvel article à associer est : ---------------------", articleId);
		// console.log("Id reject est: --------------------------------", rejectId);

		// Verification si il existe deja le couple machine_id =x, article_id =y et "timer_id"=z, quantity_reject_aff =z
		const currentRecord = await Production.findOne({
			where: {
				machine_id: machineId,
				article_id: articleId,
				quantity_reject_aff: newQuantity,
				timer_id: timerId,
			},
		});
		// console.log("Si le nouveau couple existe deja c'est --------------------- : " , currentRecord);
		// Si il n'existe pas le couple de 3
		if (!currentRecord) {
			// Trouver maintenant la ou les ligne avec  "article_id"=y et "machine_id"=x (sans tenir compte de la qté affichée)
			const currentRecordTab = await Production.findAll({
				where: {
					machine_id: machineId,
					article_id: articleId,
					timer_id: timerId,
				},
			});

			if (currentRecordTab.length === 1) {
				// console.log("Nous sommes dans currentRecordTab.length === 1, la seule ligne que j'ai trouvé est :------- ---------------------", currentRecordTab[0])
				// Donc, il ya une seule ligne avec "machine_id"=x et "article_id"=y, donc on peut modifier la qté affichée
				// AVANT, on verifie où je dois le placer
				if (currentRecordTab[0].quantity_reject_aff > newQuantity) {
					// Je dois le placer juste avant, avec la date - 1min

					// Function pour enlever une min de l'haure
					// La date initiale
					const initialDate = new Date(`${currentRecordTab[0].created_at}`);

					// Soustraire 1 minute (60 000 millisecondes) à cette date
					const newDate = new Date(initialDate.getTime() - 60 * 1000);

					const [, articles] = await Production.update(
						{
							article_id: articleId,
							quantity_reject_aff: newQuantity,
							created_at: new Date(),
						},
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				} else {
					// Je dois le placer apres avec la date actuelle
					const [, articles] = await Production.update(
						{
							article_id: articleId,
							quantity_reject_aff: newQuantity,
							created_at: new Date(),
						},
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				}
			} else if (currentRecordTab.length > 1) {
				//  console.log("Nous sommes dans currentRecordTab.length > 1 :------- ---------------------")

				// Recuperation du created_at +1 (la plus proche mais inferieur)
				const result1Obj = await Production.findOne({
					where: {
						machine_id: machineId,
						article_id: articleId,
						timer_id: timerId,

						quantity_reject_aff: {
							[Op.lt]: newQuantity,
							[Op.gt]: 0,
						},
						quantity_product_aff: 0,
					},
					order: [["quantity_reject_aff", "DESC"]],
					attributes: ["id", "quantity_reject_aff", "created_at"], // On récupère uniquement 'created_at'
					limit: 1, // Limiter à une seule ligne
				});

				// Je verfiel si j'ai bien un objet qui n'est pas null avant de le destructurer
				let result1 = "";
				let quantity_reject_aff_Last = 0;
				let dateLast = "";
				let idProdLast = 0;
				// console.log("lobjet1 est ---------------------", result1Obj?result1Obj:0);
				if (result1Obj) {
					// Je destructure l'objet pour recuperer la date et la quantité
					const { created_at, quantity_reject_aff } = result1Obj;
					result1 = created_at;
					quantity_reject_aff_Last = quantity_reject_aff;
					idProdLast = result1Obj.id;
					// console.log("la date destructurée est Obj1 ---------------------", result1)
					dateLast = result1.toLocaleString("fr-FR", {
						timeZone: "Europe/Paris",
					});
					// console.log("Date inferieur est Obj1  ---------------------", dateLast)
				} else {
					dateLast = 0;
				}

				// Recuperation du created_at -1 (la plus proche mais superieur)
				const result2Obj = await Production.findOne({
					where: {
						machine_id: machineId,
						article_id: articleId,
						timer_id: timerId,

						quantity_reject_aff: {
							[Op.gt]: newQuantity, // Strictement supérieur à `newQuantity`
						},
						quantity_product_aff: 0, // Aucun rejet
					},
					order: [["quantity_reject_aff", "ASC"]],
					attributes: ["id", "quantity_reject_aff", "created_at"], // On récupère uniquement 'created_at'
					limit: 1, // Limiter à une seule ligne
				});

				// Je verfiel si j'ai bien un objet qui n'est pas null avant de le destructurer
				let result2 = "";
				let quantity_reject_aff_Next = 0;
				let dateNext = "";
				let idProdNextd = 0;

				// console.log("lobjet2 est ---------------------", result2Obj?result2Obj:0);

				if (result2Obj) {
					// Je destructure l'objet pour recuperer la date et la quantité
					const { id, quantity_reject_aff, created_at } = result2Obj;
					idProdNextd = id;
					quantity_reject_aff_Next = quantity_reject_aff;
					result2 = created_at;

					dateNext = result2.toLocaleString("fr-FR", {
						timeZone: "Europe/Paris",
					});
				} else {
					dateNext = 0;
				}

				if (dateLast !== 0 && dateNext !== 0) {
					// console.log("Nous sommes dans dateLast !== 0 && dateNext !== 0 ---------------------")
					// Fonction pour générer une date aléatoire entre deux dates
					function getRandomDate(startDate, endDate) {
						const startTimestamp = startDate.getTime();
						const endTimestamp = endDate.getTime();
						const randomTimestamp = Math.floor(
							Math.random() * (endTimestamp - startTimestamp + 1) +
								startTimestamp,
						);
						return new Date(randomTimestamp);
					}
					// Dates de début et de fin
					const startDate = new Date(`${result1}`);
					const endDate = new Date(`${result2}`);

					// Générer une date aléatoire
					const randomDate = getRandomDate(startDate, endDate);

					const [, articles] = await Production.update(
						{ article_id: articleId, created_at: randomDate },
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				} else if (dateLast === 0 && dateNext !== 0) {
					// Ici, cad y a pas un enregistrement précedent, donc je fais : la premiere date - 1min
					// Function pour enlever une min de l'haure
					// La date initiale
					const initialDate = new Date(`${result2}`);

					// Soustraire 1 minute (60 000 millisecondes) à cette date
					const newDate = new Date(initialDate.getTime() - 60 * 1000);

					// Je mets toute ligne avec une nouvelle date créee et la nouvelle machine
					const [, articles] = await Production.update(
						{ article_id: articleId, created_at: newDate },
						{
							where: { id: rejectId },
							returning: true,
						},
					);

					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				} else if (dateLast !== 0 && dateNext === 0) {
					// Ici, cad y a pas un enregistrement au dessus
					// On mets à jours

					const [, articles] = await Production.update(
						{ article_id: articleId, created_at: new Date() },
						{
							where: { id: rejectId },
							returning: true,
						},
					);
					if (!articles || !articles.length) {
						return next();
					}
					const [article] = articles;
					// Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit("productionUpdated");
					}
					res.json(article);
				}
			} else {
				// console.log("Nous sommes dans le else de currentRecordTab.length > 1 :------- ---------------------")
				res.status(404).json("erreur de traitement");
				// return next();
			}
		} else {
			// Si il existe bien le couple de 3, donc on ne modifie pas !!!
			res.status(204).json(" aucune modification");
		}
	},

	// Mise à jour Quantité du rejet pas besoin du timer_id
	async updateQuantityReject(req, res, next) {
		// const {  articleId} = req.params;
		const rejectId = Number.parseInt(req.body.rejectId);
		const newQuantity = Number.parseInt(req.body.newQuantity);
		// const timerId = Number.parseInt(req.body.timer_id);
		// TIMER A DYNAISER
		// const timerId =1
		// recuprer le reject courante à changer
		const currentReject = await Production.findOne({
			where: {
				id: rejectId,
			},
			attributes: [
				"machine_id",
				"article_id",
				"quantity_reject_aff",
				"created_at",
				"timer_id",
			],
		});

		const currentQuantity = Number.parseInt(
			currentReject ? currentReject.quantity_reject_aff : 0,
		);

		// Recuperation de l'enregistrement -1 du reject
		const previousRecord = await Production.findOne({
			where: {
				machine_id: currentReject.machine_id,
				article_id: currentReject.article_id,
				timer_id: currentReject.timer_id,
				created_at: { [Op.lt]: currentReject.created_at },
				quantity_reject_aff: { [Op.ne]: 0 },
			},
			order: [["created_at", "DESC"]],
		});
		// Recuperation de l'enregistrement +1 du reject
		const nextRecord = await Production.findOne({
			where: {
				machine_id: currentReject.machine_id,
				article_id: currentReject.article_id,
				timer_id: currentReject.timer_id,
				created_at: { [Op.gt]: currentReject.created_at },
				quantity_reject_aff: { [Op.ne]: 0 },
			},
			order: [["created_at", "DESC"]],
		});

		const previous = previousRecord ? previousRecord.quantity_reject_aff : 0;
		const nextR = nextRecord ? nextRecord.quantity_reject_aff : 0;

		// console.log("la valeur de la production précédente est : " , previous);
		// console.log("la valeur de la production suivante est : " , nextR);
		// console.log("la valeur de la production actuelle est : " , currentQuantity);
		// console.log("la nouvelle quantité venue du formulaire est  : " , newQuantity);

		if (
			Number.parseInt(newQuantity) === 0 ||
			currentQuantity === Number.parseInt(newQuantity) ||
			(nextR !== 0 && newQuantity >= nextR) ||
			newQuantity <= previous
		) {
			res.status(204).json("Aucune modification ici");
		} else {
			const [, articles] = await Production.update(
				{ quantity_reject_aff: newQuantity },
				{
					where: { id: rejectId },
					returning: true,
				},
			);
			if (!articles || !articles.length) {
				return next();
			}
			const [article] = articles;
			// Diffuser l'evenement via WebSocket
			if (req.io) {
				// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
				req.io.emit("productionUpdated");
			}
			res.json(article);
		}
	},
};
