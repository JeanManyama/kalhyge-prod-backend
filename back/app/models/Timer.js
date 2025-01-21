import { Model, DataTypes } from "sequelize";
import { sequelize } from "../database.js";

export class Timer extends Model {}

Timer.init(
  {
    time_begin: {
      type: DataTypes.DATE, // Utilise DataTypes.DATE pour stocker date + heure
      allowNull: false, 
    },
    time_end: {
      type: DataTypes.DATE, // Idem ici, il faut stocker la date complète
    },
    date: {
      type: DataTypes.DATEONLY, 
      allowNull: false,
      defaultValue: DataTypes.NOW, 
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false, 
      references: {
        model: "User", 
        key: "id", 
      },
      onDelete: "CASCADE", 
    },
    time_elapsed: {
      type: DataTypes.INTEGER, // Durée en secondes
      allowNull: true, // Peut être null au début
    },
    duration: {
      type: DataTypes.INTEGER, // Durée totale (en secondes)
      allowNull: false,
      defaultValue: 0, // Par défaut, aucune durée définie
    },
  },
  {
    sequelize, // Instance de connexion Sequelize
    tableName: "timer", // Nom explicite de la table
    timestamps: false, // Pas de colonnes createdAt/updatedAt
  }
);

// Les relations avec User sont définies dans le fichier central (index.js)
