import { Model, DataTypes } from "sequelize";
import { sequelize } from "../database.js";
import { Article } from "./Article.js"; // Importer le modèle Article
import { Production } from "./Production.js"; // Importer le modèle Production


export class Machine extends Model {}

Machine.init(
	{
		name: {
			type: DataTypes.TEXT,
			allowNull: false,
			unique: true,
		},
	},
	{
		sequelize,
		tableName: "machine",
		timestamps: false,
	},
);


// Définir l'association many-to-many avec Article via Production
// Machine.belongsToMany(Article, {
// 	through: Production,
// 	foreignKey: 'machine_id',
// 	otherKey: 'article_id',
// 	as: 'articles', // Alias pour l'association
// });

