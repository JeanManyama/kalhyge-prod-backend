import { Model, DataTypes } from "sequelize";
import { sequelize } from "../database.js";
import { Machine } from "./Machine.js"; // Importer le modèle Machine
import { Production } from "./Production.js"; // Importer le modèle Production


export class Article extends Model {}

Article.init(
	{
		name: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
		initial_quantity: {
			type: DataTypes.INTEGER,
		},
		objective: {
			type: DataTypes.INTEGER,
			validate: {
				checkObjective(value) {
					if (value <= this.initial_quantity) {
						throw new Error(
							`L'objectif ne peut pas être inferieur à la production initaile`,
						);
					}
				},
			},
		},
	},
	{
		sequelize,
		tableName: "article",
		timestamps: false,
	},

);


