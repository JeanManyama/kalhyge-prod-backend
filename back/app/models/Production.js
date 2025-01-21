import { Model, DataTypes } from "sequelize";
import { sequelize } from "../database.js";
import { Article } from "./Article.js"; // Importer le modèle Article
import { Machine } from "./Machine.js"; // Importer le modèle Machine


export class Production extends Model {}

Production.init(
	{
	
		machine_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			// references: {
			// 	model: "Machine",
			// 	key: "id",
			// },
			// onDelete: "CASCADE",
		},
		article_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			// references: {
			// 	model: "Article",
			// 	key: "id",
			// },
			// onDelete: "CASCADE",
		},
		quantity_product_aff: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		
		quantity_reject_aff: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
	
		created_at: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
			allowNull: false,
		},
		updated_at: {
			type: DataTypes.DATE,
		},
	  timer_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "timer", // Nom explicite de la table Timer
        key: "id",      // Clé primaire du modèle Timer
      },
      onDelete: "CASCADE", // Si un timer est supprimé, ses productions associées le seront aussi
    },
		objective_historical: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},

	},
	{
    sequelize,
		tableName: "production",
    // modelName : "production",
		timestamps: false,
		updatedAt: "updated_at",
		createdAt: "created_at",
	},
);


// // Définir les associations belongsTo vers Article et Machine
// Production.belongsTo(Article, { foreignKey: 'article_id', as: 'article' });
// Production.belongsTo(Machine, { foreignKey: 'machine_id', as: 'machine' });

// // Optionnel : Définir les associations inverse si nécessaire
// Article.hasMany(Production, { foreignKey: 'article_id', as: 'productions' });
// Machine.hasMany(Production, { foreignKey: 'machine_id', as: 'productions' });

