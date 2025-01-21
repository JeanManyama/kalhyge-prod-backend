import { Sequelize} from "sequelize";

export const sequelize = new Sequelize(process.env.PG_URL, {dialect:'postgre',
define: {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
}});