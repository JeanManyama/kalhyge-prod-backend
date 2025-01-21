import { Machine } from "../models/index.js";

export default {
  // Récupérer toutes les machines
  async getAll(_, res) {
    try {
      const machines = await Machine.findAll();
      console.log(machines);
      res.status(200).json(machines);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur lors de la récupération des machines." });
    }
  },

  // Récupérer une seule machine par ID
  async getOne(req, res, next) {
    const { id } = req.params;

    try {
      const machine = await Machine.findByPk(id);

      if (!machine) {
        return next();
      }

      res.status(200).json(machine);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Erreur lors de la récupération de la machine." });
    }
  },

  // Créer une nouvelle machine
  async create(req, res) {
    console.log("Données reçues au backend :", req.body);

    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ error: "Le champ 'name' est requis." });
    }

    const machineData = {
      name: req.body.name.trim(),
    };

    try {
      // Vérifie s'il existe déjà une machine avec le même nom
      const existingMachine = await Machine.findOne({ where: { name: machineData.name } });
      if (existingMachine) {
        return res.status(409).json({ error: "Une machine avec ce nom existe déjà." });
      }

      const machine = await Machine.create(machineData);
      res.status(201).json(machine);
    } catch (error) {
      console.error(error);
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({ error: "Le nom de la machine existe déjà." });
      }
      res.status(500).json({ error: "Erreur lors de la création de la machine." });
    }
  },

  // Mettre à jour une machine
  async update(req, res, next) {
    const { id, name } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID de la machine requis." });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le champ 'name' est requis." });
    }

    try {
      const [, machines] = await Machine.update(
        { name: name.trim() },
        {
          where: { id },
          returning: true, // Retourne les valeurs mises à jour
        }
      );

      if (!machines || !machines.length) {
        return res.status(404).json({ error: "Machine non trouvée." });
      }

      const [updatedMachine] = machines;
      res.status(200).json(updatedMachine);
    } catch (error) {
      console.error(error);
      next(error);
    }
  },

  // Supprimer une machine
  async delete(req, res, next) {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID de la machine manquant." });
    }

    try {
      const deleted = await Machine.destroy({ where: { id } });

      if (!deleted) {
        return res.status(404).json({ error: "Machine non trouvée." });
      }

      res.status(204).json(); // Suppression réussie
    } catch (error) {
      console.error(error);
      next(error);
    }
  },
};
