import articleController from '../controllers/articleController'; // Assure-toi que le chemin est correct
import { Article } from '../models/index.js';

jest.mock('../models/index.js'); 

describe('Test de la fonction create', () => {
  it("devrait renvoyer une erreur si le champ 'name' est manquant", async () => {
    // On simule une requête sans le champ 'name'
    const req = { body: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Appel de la méthode create
    await articleController.create(req, res);

    // Vérifie que la réponse est bien un statut 400 et un message d'erreur
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Le champ 'name' est requis.",
    });
  });

  it("devrait créer un article si le champ 'name' est présent", async () => {
    // On simule une requête avec le champ 'name'
    const req = { body: { name: 'Article Test' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // On se moque de la méthode Article.create pour simuler la création d'un article
    Article.create.mockResolvedValue({ id: 1, name: 'Article Test' });

    // Appel de la méthode create
    await articleController.create(req, res);

    // Vérifie que la méthode create renvoie bien l'article créé
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Article Test' });
  });
});
