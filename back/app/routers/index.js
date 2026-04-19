import { Router } from "express";
import articleController from "../controllers/articleController.js";
import machineController from "../controllers/machineController.js";
import productionController from "../controllers/productionController.js";
import rejetController from "../controllers/rejetController.js";
import timerController from "../controllers/timerController.js";
import userController from "../controllers/userController.js";
import { isAdmin, isAuthenticated } from "../middlewares/authentication.js";
import controllerWrapper from "../middlewares/controller.wrapper.js";
import error404 from "../middlewares/error404.js";
import {
	bruteForceProtection,
	registerFailedAttempt,
	resetAttempts,
	signupLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

registerFailedAttempt(req.ip);
resetAttempts(req.ip);

//AUTHENTIFICATION---------------------------------------------
router.get("/checkRole", isAuthenticated, isAdmin, (_req, res) => {
	res.status(200).json({ message: "admin" });
});
router.get("/users", isAuthenticated, userController.getAllUsers);
router.post("/signup", signupLimiter, userController.signupUser);
router.post("/signin", bruteForceProtection, userController.loginUser);
router.get("/me", userController.getUserInfo);
router.post("/logOut", userController.logout);
router.patch(
	"/update-password",
	isAuthenticated,
	userController.updatePassword,
);

// Mot de passe oublier
router.post("/send-reset-code", userController.sendResetCode);
router.post("/validate-reset-code", userController.validateResetCode);

// Route pour les machines
router.get(
	"/machines",
	isAuthenticated,
	isAdmin,
	controllerWrapper(machineController.getAll),
);
router.post("/machines", controllerWrapper(machineController.create));
router.get("/machines/:id(\\d+)", controllerWrapper(machineController.getOne));

router.patch("/machines", controllerWrapper(machineController.update));
router.delete("/machines", controllerWrapper(machineController.delete));

// Route pour le timer
// router.get('/timers', controllerWrapper(timerController.getAll));
router.get(
	"/timers/active",
	isAuthenticated,
	controllerWrapper(timerController.getActiveTimer),
);
router.get(
	"/timers/today",
	isAuthenticated,
	controllerWrapper(timerController.getTodayTimer),
);
router.post(
	"/timers",
	isAuthenticated,
	controllerWrapper(timerController.create),
);

router.patch(
	"/timers/update-and-stop",
	controllerWrapper(timerController.updateObjectiveHistoricalAndStop),
);

// router.patch('/timers/:id(\\d+)', controllerWrapper(timerController.updateTimer));

// Route pour les articles
router.get("/articles", controllerWrapper(articleController.getAll));
router.post("/articles", controllerWrapper(articleController.create));
router.get("/articles/:id(\\d+)", controllerWrapper(articleController.getOne));
router.patch("/articles", controllerWrapper(articleController.update));
router.patch(
	"/articles/objective",
	controllerWrapper(articleController.updateObjective),
);
router.delete("/articles/", controllerWrapper(articleController.delete));
// router.get('/articles/:articleId(\\d+)/machines', controllerWrapper(articleController.getByMachine));
// router.put('/articles/:articleId(\\d+)/machines/:machineId(\\d+)', controllerWrapper(articleController.production));
// router.delete('/articles/:articleId(\\d+)/machines/:machineId(\\d+)', controllerWrapper(articleController.removeProduction));

// Route pour la Gestion des users
// router.post('/users', controllerWrapper(userController.create));
router.get(
	"/users/admin",
	isAuthenticated,
	isAdmin,
	controllerWrapper(userController.getAllUsersAdmin),
);
router.delete("/users/admin", controllerWrapper(userController.deleteAdmin));

// router.patch('/users/:id(\\d+)', controllerWrapper(userController.update));

// Route pour la production
// FETCH ALL GENERALE
router.get("/productions/:timerId(\\d+)", isAuthenticated, (req, res, next) => {
	controllerWrapper(productionController.fetchAll.bind(productionController))(
		req,
		res,
		next,
	);
});

//----------------------La partie du centre de la production----------------------//
router.get(
	"/productions/articles",
	controllerWrapper(productionController.getByProductionArticle),
);
// HISTORIQUE DE PRODUCTION
router.post(
	"/productions/historique",
	controllerWrapper(productionController.getByProductionHistorique),
);
//SUPPRESION HISTORIQUE DE PRODUCTION
router.delete(
	"/productions/historique",
	controllerWrapper(productionController.deletehistorique),
);

//----------------------La partie de gauche de la production (pour chacun des articles) ----------------------//
//getOne Production d'un article (la où se font des nouvelles productions)
router.post(
	"/productions/articles/:articleId(\\d+)/fetch",
	controllerWrapper(productionController.getByProductionArticleWithTime),
);

//----------------------Creation d'une production----------------------//
router.post(
	"/productions/articles/:articleId",
	controllerWrapper(productionController.create),
);

//----------------------update d'une production----------------------/
router.patch(
	"/productions/articles/:articleId/article",
	controllerWrapper(productionController.updateQuantity),
);

//----------------------update d'une production----------------------/
router.patch(
	"/productions/articles/:articleId/machine",
	controllerWrapper(productionController.updateMachine),
);

//----------------------suppression d'une production----------------------//
router.delete(
	"/productions/articles/:prodId",
	controllerWrapper(productionController.delete),
);

//----------------------La partie d'en haut de la production----------------------//
router.post(
	"/productions/machines/:machineId(\\d+)",
	controllerWrapper(productionController.getByProductionMachine),
);

//----------------------La route qui nous donne les machines qui ont eu au moins une production Au cas où ----------------------//
router.get(
	"/productions/machines",
	controllerWrapper(productionController.getAllMachine),
);

// Au cas où, toute la table production
// router.get('/productions', controllerWrapper(productionController.getAllProduction));

// Route pour le Rejet

//----------------------Recuperation de tous les rejets par machine et pro ----------------------//
router.get(
	"/productions/rejet/:timerId(\\d+)",
	controllerWrapper(rejetController.getAllRejects),
);

//----------------------Creation d'un rejet----------------------//
router.post("/productions/rejet", controllerWrapper(rejetController.create));

//----------------------suppression d'une ligne d'un rejet----------------------//
router.delete("/productions/rejet", controllerWrapper(rejetController.delete));

// ----------------------update sur l'Article la Machine et la Quantité du rejet (actionType, rejectId, machineId, articleId ainsi que
// quantity_product_aff venant du req.body)----------------------/
router.patch("/productions/rejet", (req, res, next) => {
	controllerWrapper(
		rejetController.updateMachineOrArticleReject.bind(rejetController),
	)(req, res, next);
});

//----------------------update sur la quantité d'un rejet(à l'aide de son id)----------------------//
// router.patch('/productions/rejet', controllerWrapper(rejetController.updateQuantityReject));

// ----------------------update sur la machine d'un rejet (à l'aide son id venant du req.body)----------------------/
// router.patch('/productions/rejet', controllerWrapper(rejetController.updateMachineReject));

// ----------------------update sur l'Article d'un rejet (à l'aide son id venant du req.body)----------------------/
// router.patch('/productions/rejet', controllerWrapper(rejetController.updateArticleReject));

router.use(error404);

export { router };
