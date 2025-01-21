import { Sequelize, Op } from "sequelize";
import { Machine, Article, Production , Timer} from "../models/index.js";

export default {

	// fetch pour essaie
	async fetchAll(req, res, next) {
		await this.getByProductionArticle(req, res, next);
	},

	//----------------------- Recuperation de la production par article(La partie centre)----------------------------//
	async getByProductionArticle(req, res, next) {
		const timerId = Number.parseInt(req.params.timerId);

	// console.log("LE TIMER ID EST -------------- : ", timerId);
	
		// Fonction pour calculer la somme des écarts
		function calculateSumOfDifferences(arr) {
			if (arr.length === 0) return 0;
	
			const numericArr = arr.map(Number); // Convertir les éléments du tableau en nombres
			numericArr.sort((a, b) => a - b); // Trier les valeurs du tableau
	
			let sum = numericArr[0]; // Initialiser avec la première valeur
			for (let i = 1; i < numericArr.length; i++) {
				sum += numericArr[i] - numericArr[i - 1]; // Ajouter la différence entre chaque élément consécutif
			}
			return sum;
		}
	
		const articles = await Article.findAll({
			include: [
				{
					model: Machine,
					as: "machines",
					attributes: [
						"id",
						"name",
						[
							Sequelize.fn(
								"ARRAY_AGG",
								Sequelize.col("machines->Production.quantity_product_aff")
							),
							"total_quantity",
						],
						[
							Sequelize.fn(
								"ARRAY_AGG",
								Sequelize.col("machines->Production.quantity_reject_aff")
							),
							"total_quantity_reject",
						],
					],
					through: {
						attributes: [], // Pas besoin des colonnes brutes de `Production`
					},
					required: false, // Important pour inclure tous les articles, même ceux sans Production pour ce Timer
					where: {
						"$machines->Production.timer_id$": timerId, // Condition sur le Timer
					},
				},
			],
			attributes: [
				"id",
				"name",
				[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
			],
			group: ["Article.id", "machines.id", "machines.name"],
			order: [["name", "ASC"]],
		});
	
		// Fonction pour transformer le tableau
		function transformData(data) {
			return data.map(item => {
				// Parcourir les machines pour récupérer les quantités et rejets
				const quantities = item.machines.map(machine => {
					const quantity = machine.dataValues.total_quantity?.map(Number) || [0]; // Convertir en tableau de nombres
					return quantity;
				});
	
				const rejects = item.machines.map(machine => {
					const reject = machine.dataValues.total_quantity_reject?.map(Number) || [0]; // Convertir en tableau de nombres
					return reject;
				});
	
				// Calculer les résultats pour chaque machine
				const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
				const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
				const total_quantity_valid = total_quantity_all - total_quantity_all_reject;
	
				// Retourner les données transformées
				return {
					...item.toJSON(), // Utiliser toJSON() pour éviter les références circulaires
					machines: item.machines.map((machine, index) => ({
						id: machine.id,
						name: machine.name,
						total_quantity: quantities[index], // Renvoyer le tableau des quantités
						total_quantity_reject: rejects[index], // Renvoyer le tableau des rejets
					})),
					total_quantity_all,
					total_quantity_all_reject,
					total_quantity_valid,
				};
			});
		}
	
		// Transformation de l'objet
		const transformedData = transformData(articles);
	
		// Ajouter les articles sans données correspondantes pour ce Timer
		const allArticles = await Article.findAll({
			attributes: ["id", "name", [Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"]],
			order: [["name", "ASC"]],
		});
	
		const completeData = allArticles.map(article => {
			const existingData = transformedData.find(data => data.id === article.id);
	
			// Si l'article existe déjà dans transformedData, on le garde tel quel
			if (existingData) return existingData;
	
			// Sinon, on génère un objet par défaut
			return {
				...article.toJSON(),
				machines: [],
				total_quantity_all: 0,
				total_quantity_all_reject: 0,
				total_quantity_valid: 0,
			};
		});
	
		// Ajout des machines non liées pour afficher toutes les machines disponibles
		const machinesCrude = await Machine.findAll({ order: [["name", "ASC"]] });
	// console.log("LA PRODUCTION dans le back EST ---------------- : ", completeData);
		// Réponse avec les données complètes
		res.json({
			status: "success",
			data: {
				machines: machinesCrude,
				articles: allArticles,
				productions: completeData,
			},
		});
	},


	// Creation d'une production
	async create(req, res, next) {
		
		const {articleInput} = req.body;

		const machineId = Number.parseInt(req.body.machine_id);
		const timerId = Number.parseInt(req.body.timer_id);
		const newQuantity =Number.parseInt(  req.body.quantity_product_aff);
		const articleId = Number.parseInt(req.params.articleId);
	
		// console.log("la machine id est : ", machineId);
		// console.log("la timer id est : ", timerId);	
		// console.log("la quantité est : ", newQuantity);
		// console.log("l'article id est : ", articleId);
		// Récupérer la dernière production pour l'article 1 et la machine 2
		const lastProduction = await Production.findOne({
			where: {
				article_id: articleId,
				machine_id:machineId ,
				timer_id: timerId,
				quantity_product_aff: { [Sequelize.Op.ne]: 0 },
			},
			order: [["created_at", "DESC"]],
			attributes: ["quantity_product_aff"],
			limit: 1,
		});
	
		const lastQuantity = Number.parseInt(lastProduction? lastProduction.quantity_product_aff : 0);

		if (lastQuantity < Number.parseInt(newQuantity)) {
			
			const productionInput = {
        ...articleInput, // Les autres champs provenant de articleInput
        machine_id: machineId, // Ajout de machine_id
        article_id: articleId, // Ajout de article_id
				timer_id: timerId, // Ajout de timer_id
        quantity_product_aff: newQuantity, // Quantité affichée
				
      };

			// enregitrement
			const prod = await Production.create(productionInput, { returning: true });

			    // Diffuser l'evenement via WebSocket
					if (req.io) {
						// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
						req.io.emit('productionUpdated', { timerId });
					}
			res.status(201).json(prod);
	
		} else {
		
			return res.status(500).json({ error: "Impossible d'effectuer cette production" });
		}
	},

	//----------------------Update----------------------//
	// Update d'une Quantité d'une production (il attend "prodId" du req.body.prodId)
	async updateQuantity(req, res, next) {
		// const {  articleId} = req.params;
		const productionId = req.body.prodId;
		const newQuantity = Number.parseInt(req.body.quantity_product_aff);

		// recuprer la production courante à changer
		const currentProduction = await Production.findOne({
			where: {
				id: productionId,
			},
			attributes: ["machine_id","article_id","quantity_product_aff","quantity_reject_aff","created_at", "timer_id"],
		});

		const currentQuantity = Number.parseInt(currentProduction?currentProduction.quantity_product_aff : 0);

		// Recuperation de la valeur -1 de la production
		const previousRecord = await Production.findOne({
			where: {
				machine_id:  currentProduction.machine_id,
				article_id: currentProduction.article_id,
				timer_id: currentProduction.timer_id,
				created_at: { [Op.lt]:  currentProduction.created_at },
				quantity_product_aff: { [Op.ne]: 0 }
			},
			order: [['created_at', 'DESC']]
		});
		// Recuperation de la valeur +1 de la production
		const nextRecord = await Production.findOne({
			where: {
				machine_id: currentProduction.machine_id,
				article_id: currentProduction.article_id,
				timer_id: currentProduction.timer_id,
				created_at: { [Op.gt]: currentProduction.created_at },
				quantity_product_aff: { [Op.ne]: 0 }
			},
			order: [['created_at', 'DESC']]
		});

		const previous = previousRecord?previousRecord.quantity_product_aff: 0;
		const nextR =  nextRecord?nextRecord.quantity_product_aff:0;
		
		// console.log("la valeur de la production précédente est : " , previous);
		// console.log("la valeur de la production suivante est : " , nextR);
		// console.log("la valeur de la production actuelle est : " , currentQuantity);
		// console.log("la valeur de la production à modifier est : " , newQuantity);

	
		if ((Number.parseInt(newQuantity)===0)||(currentQuantity === Number.parseInt(newQuantity)) || ((nextR !== 0) && (newQuantity >= nextR)) || (newQuantity <= previous)) {

			res.status(201).json(" aucune modification");
			
		} else {

			const [, articles] = await Production.update({quantity_product_aff : newQuantity }, {
				where:  {id: productionId} ,
				returning: true,
			});
			if (!articles || !articles.length) {
				return next();
			}
			const [article] = articles;
						    // Diffuser l'evenement via WebSocket
								if (req.io) {
									// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
									req.io.emit('productionUpdated');
								}
			res.json(article);
		}		
	

	},

	// Update d'une Machine de production production, il attend "prodId", "timerId" du req.body.prodId et Id de la nouvelle machine à associer
	async updateMachine(req, res, next) {
			const {  articleId} = req.params;
			const productionId = req.body.prodId;
			const machineId =  req.body.machineId;// La nouvele machine à associer
			const timerId = req.body.timerId;
			
			// console.log("Au back la nouvelle machine à associer, son ID est------ : ", machineId);
			// console.log("Au back la Production à modifier est -------: ", productionId);
			// console.log("Au back le timer à associer son ID est-------- : ", timerId);
			// console.log("Au back l'article à associer est -----: ", articleId);
		// Recuperation de la quantité liée à cette production
			const qantityProd = await Production.findOne({	where: { id: productionId }, attributes: ["quantity_product_aff"] });
			const newQuantity = qantityProd.quantity_product_aff;
			
			// Verification si il existe deja le couple machine_id =x, article_id =y, quantity_product_aff =z
				const currentRecord = await Production.findOne({
					where: {
						machine_id: machineId,
						article_id: articleId,
						quantity_product_aff: newQuantity,
						timer_id: timerId,
					}
					
				});
			// console.log("le couple trouvé machine id est : ", currentRecord.machine_id);
			// console.log("le couple trouvé article id est : ", currentRecord.article_id);
			// console.log("le couple trouvé quantity_product_aff est : ", currentRecord.quantity_product_aff);
			// console.log("le couple trouvé  timer est : ", currentRecord.timer_id);

				// Si il n'existe pas le couple de 4,
			if (!currentRecord) {
				// console.log("le couple de 4 n'existe pas -------------------------------------------------")
				// Trouver maintenant la ligne avec "machine_id"=x et "article_id"=y et "timer_id"=z (sans tenir compte de la qté affichée)
				const currentRecordTab = await Production.findAll({
					where: {
						machine_id: machineId,
						article_id: articleId,
						timer_id: timerId,
					}
				});
	
		
					// console.log(`le tableau des machines du couple de 3 contient ------------------------------: ${currentRecordTab.length} Elements` )	;
						if(currentRecordTab.length === 1) {
								// Donc, il ya une seule ligne avec "machine_id"=x et "article_id"=y, donc on peut modifier la qté affichée
								// AVANT, on verifie où je dois le placer
								if(currentRecordTab[0].quantity_product_aff > newQuantity){
									// Je dois le placer avant, avec la date - 1min

											// Function pour enlever une min de l'haure 
										// La date initiale
										const initialDate = new Date(`${currentRecordTab[0].created_at}`);
							
										// Soustraire 1 minute (60 000 millisecondes) à cette date
										const newDate = new Date(initialDate.getTime() - 60 * 1000);

											const [, articles] = await Production.update({machine_id : machineId, quantity_product_aff : newQuantity, created_at :new Date()}, {
												where:  {id: productionId} ,
												returning: true,
											});
									
											if (!articles || !articles.length) {
												return next();
											}
											const [article] = articles;
								// Diffuser l'evenement via WebSocket
								if (req.io) {
									// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
									req.io.emit('productionUpdated');
								}
											res.json(article);

								}else{
									// Je dois le placer apres avec la date actuelle
									const [, articles] = await Production.update({machine_id : machineId, quantity_product_aff : newQuantity, created_at : new Date()}, {
										where:  {id: productionId} ,
										returning: true,
									});
							
									if (!articles || !articles.length) {
										return next();
									}
									const [article] = articles;
									// Diffuser l'evenement via WebSocket
								if (req.io) {
									// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
									req.io.emit('productionUpdated');
								}
									res.json(article);

								};

						} else if(currentRecordTab.length > 1)
						{
							// console.log("Nous sommes dans le cas ou y a bcp des elements du couple de 3, on veut recuprer l'objet inferieur proche ------------------------------")
							    	// Recuperation du created_at +1 (la plus proche mais inferieur)
										const result1Obj = await Production.findOne({
											where: {
												machine_id: machineId,
												article_id: articleId,
												timer_id: timerId,
												quantity_product_aff: {
													[Op.lt]: newQuantity,
													[Op.gt]: 0
												},
												quantity_reject_aff: 0 
											},
											order: [['quantity_product_aff', 'DESC']],
											attributes: ['id','quantity_product_aff','created_at'], // On récupère uniquement 'created_at'
											limit: 1 // Limiter à une seule ligne
										});

										// Je verfie si j'ai bien un objet qui n'est pas null avant de le destructurer
										let result1 = '';
										let quantity_product_aff_Last = 0;
										let dateLast = '';
										let idProdLast=0;
										// console.log("lobjet1 : La plus proche inferieur est : ---------------------", result1Obj?result1Obj:0);

										if(result1Obj){
												// Je destructure l'objet pour recuperer la date et la quantité
											const {created_at, quantity_product_aff} = result1Obj;
											 result1 = created_at;
											 quantity_product_aff_Last = quantity_product_aff;
											 idProdLast = result1Obj.id;
												console.log("la date destructurée est Obj1 ---------------------", result1)
											 dateLast = result1.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
											console.log("Date inferieur est Obj1  ---------------------", dateLast)

										}else{
											dateLast =0;
										}
									
										// console.log("la nouvelle quantity est ---------------------", newQuantity)
									// Recuperation du created_at -1 (la plus proche mais superieur)
									const result2Obj = await Production.findOne({
										where: {
											machine_id: machineId,
											article_id: articleId,
											timer_id: timerId,
											quantity_product_aff: {
												[Op.gt]: newQuantity // Strictement supérieur à `newQuantity`
											},
											quantity_reject_aff: 0 // Aucun rejet
										},
										order: [['quantity_product_aff', 'ASC']],
										attributes: ['id', 'quantity_product_aff','created_at'], // On récupère uniquement 'created_at'
										limit: 1 // Limiter à une seule ligne
									});

										// Je verfiel si j'ai bien un objet qui n'est pas null avant de le destructurer
										let result2 = '';
										let quantity_product_aff_Next = 0;
										let dateNext = '';
										let idProdNextd=0;

										// console.log("lobjet2 est ----------------------------------------------------", result2Obj?result2Obj:0);

										if(result2Obj){
												// Je destructure l'objet pour recuperer la date et la quantité
											const {id, quantity_product_aff, created_at} = result2Obj;
											idProdNextd = id;
											quantity_product_aff_Next = quantity_product_aff;
											result2 = created_at;
											 
												dateNext = result2.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

										}else{
											dateNext =0;
										}

							if(dateLast !== 0 && dateNext !== 0){
								// console.log("Nous sommes dans dateLast !== 0 && dateNext !== 0 ---------------------------------------")
																	// Fonction pour générer une date aléatoire entre deux dates
																	function getRandomDate(startDate, endDate) {
																		const startTimestamp = startDate.getTime();
																		const endTimestamp = endDate.getTime();
																		const randomTimestamp = Math.floor(Math.random() * (endTimestamp - startTimestamp + 1) + startTimestamp);
																		return new Date(randomTimestamp);
																	}
																			// Dates de début et de fin
													const startDate = new Date(`${result1}`);
													const endDate = new Date(`${result2}`);							
						
													// Générer une date aléatoire
													const randomDate = getRandomDate(startDate, endDate);									
						
								const [, machines] = await Production.update({machine_id : machineId, created_at : randomDate  }, {
									where:  {id: productionId} ,
									returning: true,
								});
						
								if (!machines || !machines.length) {
									return next();
								}
								const [article] = machines;
								res.json(article);

							} else if(dateLast === 0 && dateNext !== 0){
							
								// Ici, cad y a pas un enregistrement précedent, donc je fais : la premiere date - 1min
								// Function pour enlever une min de l'haure 
								// La date initiale
									const initialDate = new Date(`${result2}`);
					
									// Soustraire 1 minute (60 000 millisecondes) à cette date
									const newDate = new Date(initialDate.getTime() - 60 * 1000);

									// Je mets toute ligne avec une nouvelle date créee et la nouvelle machine
								const [, articles] = await Production.update({machine_id : machineId, created_at : newDate  }, {
									where:  {id: productionId} ,
									returning: true,
								});
						
								if (!articles || !articles.length) {
									return next();
								}
								const [article] = articles;
								res.json(article);

									

							} else if (dateLast !== 0 && dateNext === 0){
								// Ici, cad y a pas un enregistrement au dessus
								// On mets à jours

								const [, articles] = await Production.update({machine_id : machineId, created_at : new Date() }, {
									where:  {id: productionId} ,
									returning: true,
								});
								if (!articles || !articles.length) {
									return next();
								}
								const [article] = articles;
								res.json(article);

							}
	
						}else if(currentRecordTab.length === 0){
							// console.log("Nous sommes dans le cas ou y a pas d'elements du couple de 3,donc on mets à jours---------- ------------------------------")
							const [, machines] = await Production.update({machine_id : machineId, created_at : new Date() }, {
								where:  {id: productionId} ,
								returning: true,
							});
							if (!machines || !machines.length) {
								return next();
							}
							const [machine] = machines;
							res.json(machine);
						}
						
						else
						{
							return next();
						}

			} else {
					// Si il existe bien le couple de 4, donc on ne modifie pas !!!
				res.status(201).json(" aucune modification");
			}		
	},
	

	// Suppression d'une production
	async delete(req, res, next) {
		const  idProd = req.params.prodId;
		//Avant de supprimer, on s'assure que c'est bien un rejet
		const result = await Production.findOne({
			where: {
				id: idProd,
				[Op.or]: [
					{ quantity_reject_aff: { [Op.ne]: 0 } },
			
				]
			}
		});
		if (result) {
			res.status(403).json({
				message :`Impossible de supprimer, car c'est un rejet et non une production.`
			});
			
		} else {

		const deleted = await Production.destroy({ where: { id:idProd } });
		if (!deleted) {
			return next();
		}
								    // Diffuser l'evenement via WebSocket
										if (req.io) {
											// console.log("NOUS SOMMES DANS REQ.IO : ", timerId);
											req.io.emit('productionUpdated');
										}
		res.status(204).json({ status : 204, message: "suppression avec success"});
	}
},

	// -----------------------------------La partie d'en haut de la production------------//
	// Recuperation de la production par machine
	async getByProductionMachine(req, res, next) {
		const  machineId  = req.params.machineId;
		const timerId = Number.parseInt(req.body.timer_id);
		// console.log("la machine id est : ", machineId);
		console.log("le timer AU BACK EST---------- : ", timerId);
		// Fonction pour calculer la somme des écarts
function calculateSumOfDifferences(arr) {
	if (arr.length === 0) return 0;
	const numericArr = arr.map(Number); // Convertir les éléments du tableau en nombres
	numericArr.sort((a, b) => a - b); // Trier les valeurs du tableau

	let sum = numericArr[0]; // Initialiser avec la première valeur
	for (let i = 1; i < numericArr.length; i++) {
		sum += numericArr[i] - numericArr[i - 1]; // Ajouter la différence entre chaque élément consécutif
	}
	return sum;
};
console.log("TIMER ID EST : ", timerId);
const machines = await Machine.findAll({
	where: { id: machineId }, // Filtre initial pour les machines
	include: [
			{
					model: Article,
					as: "articles",
					attributes: [
							"id",
							"name",
							[
									Sequelize.fn(
											"ARRAY_AGG", 
											Sequelize.col("articles->Production.quantity_product_aff")
									),
									"total_quantity",
							],
							[
									Sequelize.fn(
											"ARRAY_AGG", 
											Sequelize.col("articles->Production.quantity_reject_aff")
									),
									"total_quantity_reject",
							],
					],
					through: {
							attributes: [], // Pas besoin des colonnes brutes de `Production`
							where: { timer_id: timerId } // Filtre pour `Production` via la table pivot
					},
			},
	],
	attributes: [
			"id",
			"name",
			[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
	],
	group: ["Machine.id", "articles.id", "articles.name"], // Groupement par machine pour éviter les doublons
});


  function transformData(data, res) {

	if(!machines[0]){
		res.status(404).json({ error: "La machine n'existe pas" });
		return;
	}
	if (!data) {
		console.error("Les données sont undefined ou null");
		 res.status(400).json({ error: "Données non valides" });
		 return;
}

if (!data.articles || data.articles.length === 0) {
	console.log("La machine n\'est pas en service");
	 res.status(201).json({ id : machineId, name: machines[0].name, articles: [{id : 0, name : 'Pas en service', total_quantity : [0], total_quantity_reject : [0]}] });
	 return;
}


			// Récupérer les quantités et rejets pour les articles associés à la machine
			const quantities = data.articles.map(article => {
					// Vérifier que total_quantity n'est pas undefined
					const quantity = article.dataValues.total_quantity ? article.dataValues.total_quantity.map(Number) : [];
					return quantity;
			});

			const rejects = data.articles.map(article => {
					// Vérifier que total_quantity_reject n'est pas undefined
					const reject = article.dataValues.total_quantity_reject ? article.dataValues.total_quantity_reject.map(Number) : [];
					return reject;
			});

			// Calculer les résultats pour la machine
			const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
			const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
			const total_quantity_valid = total_quantity_all - total_quantity_all_reject;

			// Retourner les données transformées pour la machine avec les articles filtrés

		return {
			id: data.id,
			name: data.name,
			articles: data.articles.map((article, index) => ({
					id: article.id,
					name: article.name,
					objective: article.objective,
					total_quantity: quantities[index], // Renvoyer le tableau des quantités
					total_quantity_reject: rejects[index], // Renvoyer le tableau des rejets
			})),
			// J'ai pas envoyé les toteaux de sommes de carrés mais ils sont là
			total_quantity_all,
			total_quantity_all_reject,
			total_quantity_valid,
			};
		}

		// Transformation des données de la machine avec les articles associés
		const transformedData = transformData(machines[0], res);

		// Afficher la machine avec les articles filtrés
		res.json(transformedData);

	},




	// Recuperation d'une production par son id
	async getOneProduction(req, res, next) {
		const { id } = req.params;
		const production = await Production.findByPk(id);
		if (!production) {
			return next();
		}
		console.log("la production renvoyé est ---------------------------------------------------------: ", production);
		res.json(production);
	},


	//----------------------La partie gauche de la production ----------------------//

	// Recuperation de la production pour affichage avec des heures des entrées
	async getByProductionArticleWithTime(req, res, next) {
		const { articleId,  } = req.params;
		const { timer_id } = req.body;
		console.log("ID TIMER RECU AU BAC EST : ", timer_id);
	// const 	timer_id = 94;
		const productionData = await Production.findAll({
			where: {
				article_id: articleId,
				timer_id: timer_id,
				[Op.and]: [
					{ quantity_product_aff: { [Op.gt]: 0 } },
					
				],
			},
			include: [
				{
					model: Machine,
					as: "machines",
					attributes: ["name"], // Inclure uniquement le nom de la machine
				},
			],
			order: [['created_at', 'DESC']],
			attributes: ["id","created_at", "quantity_product_aff"], // Récupérer les colonnes nécessaires de la table production
		});
			// Les machines pour remplir le select
		const machinesForSelect = await Machine.findAll();
			// Le nom de l'article concerné
		const article = await Article.findByPk(articleId, {
				attributes: [ "id","name"],
			});

		
				
					const machines = await Machine.findAll({
						include: [
							{
								model: Production,
								as: "productions", // L'alias défini dans l'association Sequelize
								where: {
									article_id: articleId,
									timer_id: timer_id,
									quantity_product_aff: { [Op.gt]: 0 }, // Optionnel: inclure uniquement les productions avec quantité > 0
								},
								attributes: [], // On ignore les colonnes de Production, car on veut uniquement les noms des machines
							},
						],
						attributes: ["id","name"], // Récupérer uniquement le nom des machines
						distinct: true, // Supprimer les doublons (au cas où plusieurs productions associeraient la même machine)
					});			

	
		res.json({
			status: "success",
			nameArticle: article,
			machinesProduct: machines,
			productions :productionData,
			machinesForSelec: machinesForSelect
		});
	
	},


	// Recuperation d'une machine
	async getOneMachine(req, res, next) {
		const { id } = req.params;
		const machine = await Machine.findByPk(id);
		if (!machine) {
			return next();
		}
		res.json(machine);
	},

	// Recuperation d'un article
	async getOneArticle(req, res, next) {
		const { id } = req.params;
		const article = await Article.findByPk(id);
		if (!article) {
			return next();
		}
		res.json(article);
	},

	// Au cas où, toute la table production
	async getAllProduction(req, res, next) {
		const productions = await Production.findAll();
		res.json(productions);
	},
	// Recuperation de toutes les machines qui ont fait au moins une production
	async getAllMachineWithProduct(req, res, next) {
		const machines = await Machine.findAll({
			include: [
				{
					model: Production,
					as: "productions",
					required: true, // Ceci permet de faire un INNER JOIN (filtre uniquement les machines avec une production associée)
					attributes: [], // Les attributs nécessaires de la production
				},
			],
			attributes: ["id", "name"], // Les attributs nécessaires de la machine
		});

		res.json(machines);
	},


//---------------: HISTORIQUE : Article et Machines(Une date à recevoir du req.body au format "date" :  "2024-11-24") ----------------------------//
async getByProductionHistorique(req, res, next) {
	// Fonction pour calculer la somme des écarts
	function calculateSumOfDifferences(arr) {
			if (arr.length === 0) return 0;

			const numericArr = arr.map(Number); // Convertir les éléments du tableau en nombres
			numericArr.sort((a, b) => a - b); // Trier les valeurs du tableau

			let sum = numericArr[0]; // Initialiser avec la première valeur
			for (let i = 1; i < numericArr.length; i++) {
					sum += numericArr[i] - numericArr[i - 1]; // Ajouter la différence entre chaque élément consécutif
			}
			return sum;
	}
	// Vérifier que la date est présente et valide dans le corps de la requête
	const { date, period } = req.body;
console.log("LA DATE RECU DU FONT EST ---------------------", date)
	if (!date || !period) {
		return res.status(400).json({ status: "error", message: "Date et période sont requises." });
}
	// Vérification du format de la date (YYYY-MM-DD)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(date)) {
			return res.status(400).json({ status: "error", message: "La date doit être au format YYYY-MM-DD." });
	}
	// function to format duration in seconds to HH:mm:ss
	function formatDuration(durationInSeconds) {
		const hours = Math.floor(durationInSeconds / 3600);
		const minutes = Math.floor((durationInSeconds % 3600) / 60);
		const seconds = durationInSeconds % 60;
	
		return `${hours > 0 ? `${hours}h` : ''}${minutes > 0 ? `${minutes}m` : ''}${seconds}s`;
	}
	
	try {
		        // Étape 1 : Récupérer les timers pour la date donnée
						const timers = await Timer.findAll({
							where: {
									date: date
							}
					});
				console.log("LES TIMERS SELECTIONNES pour cette date sont ------------------:", timers)
					let morningTimer = null;
					let afternoonTimer = null;

					//         // Étape 2 : Identifier les timers matin et après-midi
									if (timers.length === 2) {
										const [timer1, timer2] = timers;
										const timeBegin1 = new Date(timer1.time_begin);
										const timeBegin2 = new Date(timer2.time_begin);
										const noon = new Date(`${date}T13:00:00`);
										// Classer les timers en matin et après-midi
										morningTimer = timeBegin1 < noon ? timer1 : timer2;
										afternoonTimer = timeBegin1 < noon ? timer2 : timer1;
				
								} else if (timers.length === 1) {
									const uniqueTimer = timers[0];
									const timeBegin = new Date(uniqueTimer.time_begin);
									// Utilisation de 13h00 comme référence
									const onePm = new Date(`${date}T13:00:00`);
									
									if (timeBegin < onePm) {
											morningTimer = uniqueTimer;
									} else {
											afternoonTimer = uniqueTimer;
									}
								}
								// Étape 3 : Récupérer les productions en fonction de la période
								let timerIds = [];
								//--------------PRODUCTION DE LA JOURNEE-------------------------//
								    if (period === "production") {
										timerIds = timers.map(timer => timer.id); // Tous les timers
										console.log("Timers IDs pour 'production':", timerIds);
										if (timerIds.length === 0) {
											// Retourner une réponse avec la même structure que le cas de succès mais des tableaux vides
											return res.json({
													status: "success",
													data: {
															articles: [], // Pas de données pour les articles
															machines: [], // Pas de données pour les machines
													},
													message: `Aucun timer trouvé pour la période ${period}.`,
											});
									   }
										 // Si et seulement si on a 2 timers pour la journée
										if(timerIds.length > 1){

										// Récupération des données par Article
										// Récupérer les données des articles pour TIMER 1
										const articlesTimer1 = await Article.findAll({
											include: [
													{
															model: Machine,
															as: "machines",
															attributes: [
																	"id",
																	"name",
																	[
																			Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_product_aff")),
																			"total_quantity",
																	],
																	[
																			Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_reject_aff")),
																			"total_quantity_reject",
																	],
																	[
																			Sequelize.fn("COALESCE", Sequelize.col("machines->Production.objective_historical"), null),
																			"objective_historical",
																	],
															],
															through: {
																	attributes: [],
															},
															where: Sequelize.and(
																Sequelize.where(Sequelize.fn("DATE", Sequelize.col("machines->Production.created_at")), "=", date), // Filtre sur la date
																{ "$machines->Production.timer_id$": timerIds[0] } // Filtre sur timer_id
															),
														},
											],
											attributes: ["id", "name"],
											group: ["Article.id", "machines.id", "machines.name", "objective_historical"],
										});
									 // Récupérer les données des articles pour TIMER 2
										const articlesTimer2 = await Article.findAll({
																					include: [
																							{
																									model: Machine,
																									as: "machines",
																									attributes: [
																											"id",
																											"name",
																											[
																													Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_product_aff")),
																													"total_quantity",
																											],
																											[
																													Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_reject_aff")),
																													"total_quantity_reject",
																											],
																											[
																													Sequelize.fn("COALESCE", Sequelize.col("machines->Production.objective_historical"), null),
																													"objective_historical",
																											],
																									],
																									through: {
																											attributes: [],
																									},
																									where: Sequelize.and(
																										Sequelize.where(Sequelize.fn("DATE", Sequelize.col("machines->Production.created_at")), "=", date), // Filtre sur la date
																										{ "$machines->Production.timer_id$": timerIds[1] } // Filtre sur timer_id 2
																									),
																								},
																					],
																					attributes: ["id", "name"],
																					group: ["Article.id", "machines.id", "machines.name", "objective_historical"],
										})
										// Fonction pour transformer les données des articles
										function transformArticleData(data) {
											return data.map(item => {
													const quantities = item.machines.map(machine => {
															const quantity = machine.dataValues.total_quantity.map(Number);
															return quantity;
													});

													const rejects = item.machines.map(machine => {
															const reject = machine.dataValues.total_quantity_reject.map(Number);
															return reject;
													});

													const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
													const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
													const total_quantity_valid = total_quantity_all - total_quantity_all_reject;

													// Ajout de l'attribut `objective_historical` et multiplication par 2
													const objective_historical = item.machines.length > 0
															? (item.machines[0].dataValues.objective_historical || 0) * 2 // Multiplier par 2 pour prendre en compte les deux périodes
															: 0;

													return {
															...item.toJSON(),
															machines: item.machines.map((machine, index) => ({
																	id: machine.id,
																	name: machine.name,
																	total_quantity: quantities[index],
																	total_quantity_reject: rejects[index],
															})),
															objective_historical,
															total_quantity_all,
															total_quantity_all_reject,
															total_quantity_valid,
													};
											});
										}
											// Récupérer les données des machines pour TIMER 1
										const machinesTimer1 = await Machine.findAll({
												include: [
														{
																model: Article,
																as: "articles",
																attributes: [
																		"id",
																		"name",
																		[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
																		[
																				Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_product_aff")),
																				"total_quantity",
																		],
																		[
																				Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_reject_aff")),
																				"total_quantity_reject",
																		],
																],
																through: {
																		attributes: [],
																},
																where: Sequelize.and(
																	Sequelize.where(Sequelize.fn("DATE", Sequelize.col("articles->Production.created_at")), "=", date),
																	{ "$articles->Production.timer_id$": timerIds[0] }
																),
														},
												],
												attributes: ["id", "name"],
												group: ["Machine.id", "articles.id", "articles.name"],
										});
										// Récupérer les données des machines pour TIMER 2
										const machinesTimer2 = await Machine.findAll({
																						include: [
																								{
																										model: Article,
																										as: "articles",
																										attributes: [
																												"id",
																												"name",
																												[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
																												[
																														Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_product_aff")),
																														"total_quantity",
																												],
																												[
																														Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_reject_aff")),
																														"total_quantity_reject",
																												],
																										],
																										through: {
																												attributes: [],
																										},
																										where: Sequelize.and(
																											Sequelize.where(Sequelize.fn("DATE", Sequelize.col("articles->Production.created_at")), "=", date),
																											{ "$articles->Production.timer_id$": timerIds[1] }
																										),
																								},
																						],
																						attributes: ["id", "name"],
																						group: ["Machine.id", "articles.id", "articles.name"],
										});
										// Fonction pour transformer les données des machines
										function transformMachineData(data) {
												return data.map(machine => {
														const quantities = machine.articles.map(article => {
																const quantity = article.dataValues.total_quantity.map(Number);
																return quantity;
														});
								
														const rejects = machine.articles.map(article => {
																const reject = article.dataValues.total_quantity_reject.map(Number);
																return reject;
														});
								
														const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
														const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
														const total_quantity_valid = total_quantity_all - total_quantity_all_reject;
								
														return {
																id: machine.id,
																name: machine.name,
																total_quantity_all,
																total_quantity_all_reject,
																total_quantity_valid,
																articles: machine.articles.map((article, index) => ({
																		id: article.id,
																		name: article.name,
																		objective: article.objective,
																		total_quantity: quantities[index],
																		total_quantity_reject: rejects[index],
																})),
														};
												});
										}
										const durationTimer1 = timerIds.length > 1 
										? await Timer.findOne({ where: { id: timerIds[0] }, attributes: ['time_elapsed'] })
										: null;
										const durationTimer2 = timerIds.length > 1 
										? await Timer.findOne({ where: { id: timerIds[1] }, attributes: ['time_elapsed'] })
										: null;
										let totalDuration = 0;
										totalDuration += durationTimer1?.time_elapsed || 0;
										totalDuration += durationTimer2?.time_elapsed || 0;
										
										// Transformer les données des articles pour les deux périodes
										const transformedArticlesTimer1 = transformArticleData(articlesTimer1);
										const transformedArticlesTimer2 = transformArticleData(articlesTimer2);

										// Transformer les données des machines pour les deux périodes
										const transformedMachinesTimer1 = transformMachineData(machinesTimer1);
										const transformedMachinesTimer2 = transformMachineData(machinesTimer2);

										// Addition des quantités et rejets pour les deux périodes
										function addArticleQuantities(timer1Data, timer2Data) {
											const result = [];
									
											// Boucle sur chaque article dans timer1Data
											for (const article1 of timer1Data) {
													// Trouver l'article correspondant dans timer2Data
													const article2 = timer2Data.find(article => article.id === article1.id);
													
													// Si l'article est trouvé dans les deux datasets, additionner les quantités
													if (article2) {
															result.push({
																	id: article1.id,
																	name: article1.name,
																	objective_historical: article1.objective_historical,  // ne pas toucher objective_historical
																	total_quantity_all: article1.total_quantity_all + article2.total_quantity_all,
																	total_quantity_all_reject: article1.total_quantity_all_reject + article2.total_quantity_all_reject,
																	total_quantity_valid: article1.total_quantity_valid + article2.total_quantity_valid
															});
													}
											}
									
											return result;
									  }
									  const sumArticles = addArticleQuantities(transformedArticlesTimer1, transformedArticlesTimer2);

										// Addition des quantités et rejets pour les machines
										function addMachineQuantities(timer1Machines, timer2Machines) {
											const result = [];
									
											// Boucle sur chaque machine dans timer1Machines
											for (const machine1 of timer1Machines) {
													// Trouver la machine correspondante dans timer2Machines
													const machine2 = timer2Machines.find(machine => machine.id === machine1.id);
													
													// Si la machine est trouvée dans les deux datasets, additionner les quantités
													if (machine2) {
															result.push({
																	id: machine1.id,
																	name: machine1.name,
																	total_quantity_all: machine1.total_quantity_all + machine2.total_quantity_all,
																	total_quantity_all_reject: machine1.total_quantity_all_reject + machine2.total_quantity_all_reject,
																	total_quantity_valid: machine1.total_quantity_valid + machine2.total_quantity_valid
															});
													}
											}
									
											return result;
									  }
										const sumMachines = addMachineQuantities(transformedMachinesTimer1, transformedMachinesTimer2);

										// Retourner les résultats dans la structure demandée
										// console.log("Totalduration a :------------------------ ", totalDuration);
										res.json({
												status: "success",
												data: {
														articles: sumArticles,
														machines: sumMachines,
														productionTime: totalDuration ? formatDuration(totalDuration) : null, 
												},
										});
										// Si et seulement si on a 1 timers pour toute la journée
									  }else if(timerIds.length === 1){
									  // Récupération des données par Article
										// Récupérer les données des articles pour TIMER 1
										const articlesTimer1 = await Article.findAll({
											include: [
													{
															model: Machine,
															as: "machines",
															attributes: [
																	"id",
																	"name",
																	[
																			Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_product_aff")),
																			"total_quantity",
																	],
																	[
																			Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_reject_aff")),
																			"total_quantity_reject",
																	],
																	[
																			Sequelize.fn("COALESCE", Sequelize.col("machines->Production.objective_historical"), null),
																			"objective_historical",
																	],
															],
															through: {
																	attributes: [],
															},
															where: Sequelize.and(
																Sequelize.where(Sequelize.fn("DATE", Sequelize.col("machines->Production.created_at")), "=", date), // Filtre sur la date
																{ "$machines->Production.timer_id$": timerIds[0] } // Filtre sur timer_id
															),
														},
											],
											attributes: ["id", "name"],
											group: ["Article.id", "machines.id", "machines.name", "objective_historical"],
										});
										// Fonction pour transformer les données des articles
										function transformArticleData(data) {
																					return data.map(item => {
																							const quantities = item.machines.map(machine => {
																									const quantity = machine.dataValues.total_quantity.map(Number);
																									return quantity;
																							});
										
																							const rejects = item.machines.map(machine => {
																									const reject = machine.dataValues.total_quantity_reject.map(Number);
																									return reject;
																							});
										
																							const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
																							const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
																							const total_quantity_valid = total_quantity_all - total_quantity_all_reject;
										
																							// Ajout de l'attribut `objective_historical` et multiplication par 2
																							const objective_historical = item.machines.length > 0
																									? (item.machines[0].dataValues.objective_historical || 0) * 2 // Multiplier par 2 pour prendre en compte les deux périodes
																									: 0;
										
																							return {
																									...item.toJSON(),
																									machines: item.machines.map((machine, index) => ({
																											id: machine.id,
																											name: machine.name,
																											total_quantity: quantities[index],
																											total_quantity_reject: rejects[index],
																									})),
																									objective_historical,
																									total_quantity_all,
																									total_quantity_all_reject,
																									total_quantity_valid,
																							};
																					});
										}
										// Récupérer les données des machines pour TIMER 1
										const machinesTimer1 = await Machine.findAll({
																						include: [
																								{
																										model: Article,
																										as: "articles",
																										attributes: [
																												"id",
																												"name",
																												[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
																												[
																														Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_product_aff")),
																														"total_quantity",
																												],
																												[
																														Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_reject_aff")),
																														"total_quantity_reject",
																												],
																										],
																										through: {
																												attributes: [],
																										},
																										where: Sequelize.and(
																											Sequelize.where(Sequelize.fn("DATE", Sequelize.col("articles->Production.created_at")), "=", date),
																											{ "$articles->Production.timer_id$": timerIds[0] }
																										),
																								},
																						],
																						attributes: ["id", "name"],
																						group: ["Machine.id", "articles.id", "articles.name"],
										});
										// Fonction pour transformer les données des machines
										function transformMachineData(data) {
																					return data.map(machine => {
																							const quantities = machine.articles.map(article => {
																									const quantity = article.dataValues.total_quantity.map(Number);
																									return quantity;
																							});
																	
																							const rejects = machine.articles.map(article => {
																									const reject = article.dataValues.total_quantity_reject.map(Number);
																									return reject;
																							});
																	
																							const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
																							const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
																							const total_quantity_valid = total_quantity_all - total_quantity_all_reject;
																	
																							return {
																									id: machine.id,
																									name: machine.name,
																									total_quantity_all,
																									total_quantity_all_reject,
																									total_quantity_valid,
																									articles: machine.articles.map((article, index) => ({
																											id: article.id,
																											name: article.name,
																											objective: article.objective,
																											total_quantity: quantities[index],
																											total_quantity_reject: rejects[index],
																									})),
																							};
																					});
										}
										const durationTimer1 = await Timer.findOne({ where: { id: timerIds[0] }, attributes: ['time_elapsed'] });
										let totalDuration = 0;
										totalDuration += durationTimer1?.time_elapsed || 0;
										// Transformer les données des articles pour cette période
										const transformedArticlesTimer1 = transformArticleData(articlesTimer1);
										// Transformer les données des machines pour cette période
										const transformedMachinesTimer1 = transformMachineData(machinesTimer1);
																				// Retourner les résultats dans la structure demandée
										// console.log("Totalduration a :------------------------ ", totalDuration);
										res.json({
											status: "success",
											data: {
													articles: transformedArticlesTimer1,
													machines: transformedMachinesTimer1,
													productionTime: totalDuration ? formatDuration(totalDuration) : null, 
											},
									});

									}
							//--------------PRODUCTION MATIN-------------------------//
								   } else if (period === "matin") {
										timerIds = morningTimer ? [morningTimer.id] : [];
										console.log("Timers IDs :", timerIds);
										console.log("Timers IDs :",  timerIds[0]);
										if (timerIds.length === 0) {
											// Retourner une réponse avec la même structure que le cas de succès mais des tableaux vides
											return res.json({
													status: "success",
													data: {
															articles: [], // Pas de données pour les articles
															machines: [], // Pas de données pour les machines
													},
													message: `Aucun timer trouvé pour la période ${period}.`,
											});
									  }
										// Récupération des données par Article
										const articles = await Article.findAll({
												include: [
													{
														model: Machine,
														as: "machines",
														attributes: [
															"id",
															"name",
															[
																Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_product_aff")),
																"total_quantity",
															],
															[
																Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_reject_aff")),
																"total_quantity_reject",
															],
															[
																Sequelize.fn("COALESCE", Sequelize.col("machines->Production.objective_historical"), null),
																"objective_historical",
															],
														],
														through: {
															attributes: [],
														},
														where: Sequelize.and(
															Sequelize.where(Sequelize.fn("DATE", Sequelize.col("machines->Production.created_at")), "=", date), // Filtre sur la date
															{ "$machines->Production.timer_id$": timerIds[0] } // Filtre sur timer_id
														),
													},
												],
												attributes: ["id", "name"],
												group: ["Article.id", "machines.id", "machines.name", "objective_historical"],
										});
										// Fonction pour transformer les données des articles
										function transformArticleData(data) {
													return data.map(item => {
															const quantities = item.machines.map(machine => {
																	const quantity = machine.dataValues.total_quantity.map(Number);
																	return quantity;
															});

															const rejects = item.machines.map(machine => {
																	const reject = machine.dataValues.total_quantity_reject.map(Number);
																	return reject;
															});

															const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
															const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
															const total_quantity_valid = total_quantity_all - total_quantity_all_reject;
																			// Ajout de l'attribut `objective_historical`
																			const objective_historical = item.machines.length > 0
																			? item.machines[0].dataValues.objective_historical || null
																			: null;

															return {
																	...item.toJSON(),
																	machines: item.machines.map((machine, index) => ({
																			id: machine.id,
																			name: machine.name,
																			total_quantity: quantities[index],
																			total_quantity_reject: rejects[index],
																	})),
																	objective_historical,
																	total_quantity_all,
																	total_quantity_all_reject,
																	total_quantity_valid,
															};
													});
										}
										// Récupération des données par Machine
										const machines = await Machine.findAll({
											include: [
												{
													model: Article,
													as: "articles",
													attributes: [
														"id",
														"name",
														[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
														[
															Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_product_aff")),
															"total_quantity",
														],
														[
															Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_reject_aff")),
															"total_quantity_reject",
														],
													],
													through: {
														attributes: [],
													},
													where: Sequelize.and(
														Sequelize.where(Sequelize.fn("DATE", Sequelize.col("articles->Production.created_at")), "=", date),
														// Corriger la référence de la table "articles->productions" en "articles->Production"
														{ "$articles->Production.timer_id$": timerIds[0] }
													),
												},
											],
											attributes: ["id", "name"],
											group: ["Machine.id", "articles.id", "articles.name"],
										});
										// Fonction pour transformer les données des machines
										function transformMachineData(data) {
													return data.map(machine => {
															const quantities = machine.articles.map(article => {
																	const quantity = article.dataValues.total_quantity.map(Number);
																	return quantity;
															});

															const rejects = machine.articles.map(article => {
																	const reject = article.dataValues.total_quantity_reject.map(Number);
																	return reject;
															});

															const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
															const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
															const total_quantity_valid = total_quantity_all - total_quantity_all_reject;

															return {
																	id: machine.id,
																	name: machine.name,
																	total_quantity_all,
																	total_quantity_all_reject,
																	total_quantity_valid,
																	articles: machine.articles.map((article, index) => ({
																			id: article.id,
																			name: article.name,
																			objective: article.objective,
																			total_quantity: quantities[index],
																			total_quantity_reject: rejects[index],
																	})),
															};
													});
										}
										const duration = timerIds.length > 0 
										? await Timer.findOne({ where: { id: timerIds[0] }, attributes: ['time_elapsed'] })
										: null;
										// Transformer les données
										const transformedArticles = transformArticleData(articles);
										const transformedMachines = transformMachineData(machines);
										// Retourner les résultats dans la structure demandée
										res.json({
													status: "success",
													data: {
															articles: transformedArticles,
															machines: transformedMachines,
															productionTime: duration ? formatDuration(duration.time_elapsed) : null, 
													},
										});
         //--------------PRODUCTION MATIN-------------------------//
								   } else if (period === "aprem") {
										timerIds = afternoonTimer ? [afternoonTimer.id] : [];
										if (timerIds.length === 0) {
											// Retourner une réponse avec la même structure que le cas de succès mais des tableaux vides
											return res.json({
													status: "success",
													data: {
															articles: [], // Pas de données pour les articles
															machines: [], // Pas de données pour les machines
													},
													message: `Aucun timer trouvé pour la période ${period}.`,
											});
									  }
										// Récupération des données par Article
										const articles = await Article.findAll({
												include: [
													{
														model: Machine,
														as: "machines",
														attributes: [
															"id",
															"name",
															[
																Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_product_aff")),
																"total_quantity",
															],
															[
																Sequelize.fn("ARRAY_AGG", Sequelize.col("machines->Production.quantity_reject_aff")),
																"total_quantity_reject",
															],
															[
																Sequelize.fn("COALESCE", Sequelize.col("machines->Production.objective_historical"), null),
																"objective_historical",
															],
														],
														through: {
															attributes: [],
														},
														where: Sequelize.and(
															Sequelize.where(Sequelize.fn("DATE", Sequelize.col("machines->Production.created_at")), "=", date), // Filtre sur la date
															{ "$machines->Production.timer_id$": timerIds[0] } // Filtre sur timer_id
														),
													},
												],
												attributes: ["id", "name"],
												group: ["Article.id", "machines.id", "machines.name", "objective_historical"],
										});
										// Fonction pour transformer les données des articles
										function transformArticleData(data) {
													return data.map(item => {
															const quantities = item.machines.map(machine => {
																	const quantity = machine.dataValues.total_quantity.map(Number);
																	return quantity;
															});

															const rejects = item.machines.map(machine => {
																	const reject = machine.dataValues.total_quantity_reject.map(Number);
																	return reject;
															});

															const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
															const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
															const total_quantity_valid = total_quantity_all - total_quantity_all_reject;
																			// Ajout de l'attribut `objective_historical`
																			const objective_historical = item.machines.length > 0
																			? item.machines[0].dataValues.objective_historical || null
																			: null;

															return {
																	...item.toJSON(),
																	machines: item.machines.map((machine, index) => ({
																			id: machine.id,
																			name: machine.name,
																			total_quantity: quantities[index],
																			total_quantity_reject: rejects[index],
																	})),
																	objective_historical,
																	total_quantity_all,
																	total_quantity_all_reject,
																	total_quantity_valid,
															};
													});
										}
										// Récupération des données par Machine
										const machines = await Machine.findAll({
											include: [
												{
													model: Article,
													as: "articles",
													attributes: [
														"id",
														"name",
														[Sequelize.fn("COALESCE", Sequelize.col("objective"), 0), "objective"],
														[
															Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_product_aff")),
															"total_quantity",
														],
														[
															Sequelize.fn("ARRAY_AGG", Sequelize.col("articles->Production.quantity_reject_aff")),
															"total_quantity_reject",
														],
													],
													through: {
														attributes: [],
													},
													where: Sequelize.and(
														Sequelize.where(Sequelize.fn("DATE", Sequelize.col("articles->Production.created_at")), "=", date),
														// Corriger la référence de la table "articles->productions" en "articles->Production"
														{ "$articles->Production.timer_id$": timerIds[0] }
													),
												},
											],
											attributes: ["id", "name"],
											group: ["Machine.id", "articles.id", "articles.name"],
										});
										// Fonction pour transformer les données des machines
										function transformMachineData(data) {
													return data.map(machine => {
															const quantities = machine.articles.map(article => {
																	const quantity = article.dataValues.total_quantity.map(Number);
																	return quantity;
															});

															const rejects = machine.articles.map(article => {
																	const reject = article.dataValues.total_quantity_reject.map(Number);
																	return reject;
															});

															const total_quantity_all = quantities.reduce((sum, q) => sum + calculateSumOfDifferences(q), 0);
															const total_quantity_all_reject = rejects.reduce((sum, r) => sum + calculateSumOfDifferences(r), 0);
															const total_quantity_valid = total_quantity_all - total_quantity_all_reject;

															return {
																	id: machine.id,
																	name: machine.name,
																	total_quantity_all,
																	total_quantity_all_reject,
																	total_quantity_valid,
																	articles: machine.articles.map((article, index) => ({
																			id: article.id,
																			name: article.name,
																			objective: article.objective,
																			total_quantity: quantities[index],
																			total_quantity_reject: rejects[index],
																	})),
															};
													});
										}
										const duration = timerIds.length > 0 
										? await Timer.findOne({ where: { id: timerIds[0] }, attributes: ['time_elapsed'] })
										: null;
										// Transformer les données
										const transformedArticles = transformArticleData(articles);
										const transformedMachines = transformMachineData(machines);
										// Retourner les résultats dans la structure demandée
										res.json({
													status: "success",
													data: {
															articles: transformedArticles,
															machines: transformedMachines,
															productionTime: duration ? formatDuration(duration.time_elapsed) : null, 
													},
										});
								}


			
	} catch (error) {
			console.error(error);
			return res.status(500).json({
					status: "error",
					message: "Erreur lors de la récupération des données.",
			});
	}
}, 

// SUPPRESSION HISTORIQUE---------------
async deletehistorique(req, res) {
  try {
    const { date, period } = req.body; // Récupération de la période

    if (!date || !period) {
      return res.status(400).json({
        status: 'error',
        message: 'La date et la période sont requises.',
      });
    }

    // Vérification du format de la date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        status: 'error',
        message: 'La date doit être au format YYYY-MM-DD.',
      });
    }

    // Récupérer les timers pour la date donnée
    const timers = await Timer.findAll({
      where: {
        date: date,
      },
      order: [['time_begin', 'DESC']] // Tri par date de début, décroissant
    });

    let morningTimer = null;
    let afternoonTimer = null;
    let timerToDelete = null;

    // Identifier les timers matin et après-midi
    if (timers.length === 2) {
      const [timer1, timer2] = timers;

      const timeBegin1 = new Date(timer1.time_begin);
      const timeBegin2 = new Date(timer2.time_begin);
      const noon = new Date(`${date}T13:00:00`);

      // Classer les timers en matin et après-midi
      morningTimer = timeBegin1 < noon ? timer1 : timer2;
      afternoonTimer = timeBegin1 < noon ? timer2 : timer1;
    } else if (timers.length === 1) {
      const uniqueTimer = timers[0];
      const timeBegin = new Date(uniqueTimer.time_begin);
      const onePm = new Date(`${date}T13:00:00`);

      if (timeBegin < onePm) {
        morningTimer = uniqueTimer;
      } else {
        afternoonTimer = uniqueTimer;
      }
    }

    // En fonction de la période reçue, déterminer quel timer supprimer
    if (period === 'production') {
      // Supprimer les deux timers (matin et après-midi)
      const timerIds = [morningTimer?.id, afternoonTimer?.id].filter(Boolean);
      
      if (timerIds.length > 0) {
        // Déterminer le dernier (le plus récent) timer à supprimer
        const lastTimer = timers[0]; // Le plus récent est le premier dans le tableau après le tri

        // Supprimer les timers
        await Timer.destroy({
          where: {
            id: timerIds,
          },
        });

        timerToDelete = lastTimer;
      } else {
        return res.status(404).json({ message: "Aucun timer trouvé pour cette période." });
      }
    } else if (period === 'matin' && morningTimer) {
      // Supprimer le timer du matin
      await Timer.destroy({
        where: {
          id: morningTimer.id,
        },
      });
      timerToDelete = morningTimer;
    } else if (period === 'aprem' && afternoonTimer) {
      // Supprimer le timer de l'après-midi
      await Timer.destroy({
        where: {
          id: afternoonTimer.id,
        },
      });
      timerToDelete = afternoonTimer;
    } else {
      return res.status(404).json({ message: `Aucun timer trouvé pour la période ${period}.` });
    }

    // Vérifier si le timer supprimé est le dernier (plus récent)
    if (timerToDelete && timerToDelete.time_begin === timers[0].time_begin) {
      // Mise à jour de la colonne `objective` de tous les articles à 0
      await Article.update(
        { objective: 0 },
        { where: {} }
      );
    }

    // Diffuser l'événement via WebSocket
    if (req.io) {
      req.io.emit('productionUpdated');
    }

    // Retourner un message de succès
    return res.json({
      status: 'success',
      message: `L'historique pour la période ${period} a été supprimé avec succès.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: 'Erreur lors de la suppression.',
    });
  }
}








};
