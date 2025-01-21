import { Model, DataTypes } from "sequelize";
import { sequelize } from "../database.js";

export class Role extends Model {}

Role.init(
	{
		name: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
	},
	{
		sequelize,
		tableName: "role",
		timestamps: false,
	},
);
