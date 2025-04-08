import { User, Role } from '../models/index.js';
import cryptos from '../lib/cryptos.js';
import config from '../config.js';
import schemas from '../lib/schemas.js';
import tokens from '../lib/tokens.js';


export default {

  async getAllUsers(_, res) {
    const users = await User.findAll();
  
    return res.json(users);  
 },
 async getAllUsersAdmin(_, res) {
  try {
    // Récupération des utilisateurs avec uniquement les champs 'id' et 'firstname'
    const users = await User.findAll({
      attributes: ['id', 'firstname'] // Limiter les colonnes récupérées
    });

    // Retourner la liste des utilisateurs au client
    return res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);

    // Gestion des erreurs et réponse HTTP 500 en cas d'échec
    return res.status(500).json({
      message: 'Erreur lors de la récupération des utilisateurs.',
      error: error.message
    });
  }
},


  // SIGNUP----------------------------------------------
     async  signupUser(req, res) {
        // Validation du corps de la requête
        const { data, error } = await schemas.buildSignupBodySchema().safeParseAsync(req.body);
        if (error) {
          return res.status(409).json({ status: 409, message: "Attention !!! Minimum 12 caractères pour le mot de passe. Ne pas hésiter à mélanger  minuscules, majuscules, chiffres, caractères spéciaux si possible" });
        }
      
        const { firstname, email, password } = data;
      
        // Vérifier si l'email est déjà utilisé
        const nbOfUsersWithSameEmail = await User.count({ where: { email } });
        if (nbOfUsersWithSameEmail !== 0) {
          return res.status(409).json({ status: 409, message: "Email existant" });
        }
      
        // Créer un nouvel utilisateur
        const role = 2;
        await User.create({
          firstname,
          email,
          password: await cryptos.hash(password),
          role_id: role
        });
      
        // Réponse au client
        res.status(201).json({ status: 201, message: "User successfully created" });
      },
// SIGNIN----------------------------------------------
     async  loginUser(req, res) {
    // Body validation
    const { data, error } = await schemas.buildLoginBodySchema().safeParseAsync(req.body);
    if (error) {
      return res.status(400).json({ status: 400, message: error.message });
    }
  
    const { email, password } = data;
  
    // Validate user exists and provided password matches
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ status: 401, message: "Erreur d'authtification" });
    }
  
    const isMatching = await cryptos.compare(password, user.password);
    if (!isMatching) {
      return res.status(401).json({ status: 401, message: "Erreur d'authtification" });
    }
    user.created_at = new Date(); // Utilisation de la date actuelle
    await user.save();
     // Générer les nouveaux tokens
     const { accessToken, refreshToken, csrfToken } = tokens.generateAuthenticationTokens(user);
  
     // Sauvegarder le nouveau refresh token et son expiration
     user.refresh_token = cryptos.unsaltedHash(refreshToken.token);
     user.refresh_token_expires_at = refreshToken.expiresAt;
     await user.save();
    // Client response
    sendTokensResponse(res, { accessToken, refreshToken, csrfToken });
  },

// GET USER INFO ----------------------------------------------
async getUserInfo(req, res) {

  try {
    // Récupérer l'utilisateur à partir de l'accessToken
    const accessToken = req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({ status: 401, message: "Token d'accès manquant ou invalide." });
    }
    // Décoder le token pour récupérer l'identifiant de l'utilisateur
    const decodedToken = tokens.verifyJwtToken(accessToken);
    if (!decodedToken) {
      return res.status(401).json({ status: 401, message: "Token d'accès invalide ou expiré." });
    }
    const userId = decodedToken.id;
    if (!userId) {
      return res.status(401).json({ status: 401, message: "Utilisateur non autorisé." });
    }

    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Role,
          as: 'role', // Utilisez l'alias défini pour la relation User -> Role
          attributes: ['name'], // Inclure uniquement le nom du rôle
        },
      ],
      attributes: ['id', 'firstname', 'email', 'created_at'], // Champs spécifiques
    });
    

    if (!user) {
      return res.status(404).json({ status: 404, message: "Utilisateur introuvable." });
    }

    // Retourner les informations de l'utilisateur
    res.status(200).json({
      firstname: user.firstname,
      connectedAt: new Date().toISOString(), // Heure actuelle comme "connectedAt"
      id: user.id,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'utilisateur :", error);
    res.status(500).json({ status: 500, message: "Erreur interne du serveur." });
  }
},

// LOGOUT USER ----------------------------------------------
async logout(req, res) {
  try {
 
    // Récupérer le refreshToken depuis le corps de la requête
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ status: 400, message: "Refresh token requis pour la déconnexion." });
    }

    // Hacher le refreshToken pour le comparer avec celui stocké
    const hashedToken = cryptos.unsaltedHash(refreshToken);

    // Rechercher l'utilisateur avec ce refresh token
    const user = await User.findOne({ where: { refresh_token: hashedToken } });

    if (!user) {
      return res.status(404).json({ status: 404, message: "Utilisateur introuvable ou refresh token invalide." });
    }

    // Supprimer le refresh token de l'utilisateur
    user.refresh_token = null;
    user.refresh_token_expires_at = null;
    await user.save();

    // Réinitialiser les cookies sur le client
    const randomStringToUnsetCookieValueOnClient = Math.random().toString();
    res.cookie("accessToken", randomStringToUnsetCookieValueOnClient, { httpOnly: true, secure: true });
    res.cookie("refreshToken", randomStringToUnsetCookieValueOnClient, { httpOnly: true, secure: true });

    // Répondre au client
    res.status(200).json({ status: 200, message: "Déconnexion réussie." });
  } catch (error) {
    console.error("Erreur lors de la déconnexion :", error);
    res.status(500).json({ status: 500, message: "Erreur interne lors de la déconnexion." });
  }
}
,


  // UPDATE PASSWORD ----------------------------------------------
async updatePassword(req, res) {  
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: 'Le mot de passe est requis.' });
    }

    const authorizationHeader = req.headers["Authorization"] || req.headers["authorization"];
    const accessToken = req.cookies?.accessToken || authorizationHeader?.split("Bearer ")[1];
    const decodedToken = tokens.verifyJwtToken(accessToken);

    const userId = decodedToken.id;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Attendez que la fonction hash retourne une valeur avant de l'assigner
    const hashedPassword = await cryptos.hash(password); // Utilisation de await pour attendre le résultat

    // Mettez à jour le mot de passe (assurez-vous d'abord de le hacher)
    user.password = hashedPassword;  // Vous assignez maintenant une chaîne (le mot de passe haché)
    await user.save();

    res.json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du mot de passe :', err);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
},


// DELETE USER ----------------------------------------------
    async deleteAdmin(req, res, next){
        const {id} = req.body;

        const deleted = await User.destroy({where: {id}});

        if(!deleted){
            return next();
        }

        res.status(204).json("Suppressions réussie");
    },
};

// RESPONSE HANDLING, TOKENS ----------------------------------
function sendTokensResponse(res, { accessToken, refreshToken, csrfToken }) {
    res.cookie("accessToken", accessToken.token, {
      maxAge: accessToken.expiresInMS,
      httpOnly: true,
      secure: config.server.secure,
    });
  
    res.cookie("refreshToken", refreshToken.token, {
      maxAge: refreshToken.expiresInMS,
      httpOnly: true,
      secure: config.server.secure,
      path: "/refresh",
    });
  
    res.json({
      accessToken: accessToken.token,
      accessTokenType: accessToken.type,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.token,
      refreshTokenExpiresAt: refreshToken.expiresAt,
      csrfToken,
    });
  }
  

