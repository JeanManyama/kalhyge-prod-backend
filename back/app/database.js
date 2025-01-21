// import { Sequelize} from "sequelize";

// export const sequelize = new Sequelize(process.env.PG_URL, {dialect:'postgre',
// define: {
//   createdAt: 'created_at',
//   updatedAt: 'updated_at',
//   underscored: true,
// }});


import { Sequelize } from 'sequelize';

// Priorise DATABASE_URL pour Render, PG_URL pour local
const databaseUrl = process.env.DATABASE_URL || process.env.PG_URL;

if (!databaseUrl) {
  throw new Error('Aucune URL de base de données définie. Vérifiez vos variables d\'environnement.');
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DATABASE_URL
      ? { require: true, rejectUnauthorized: false }
      : false,
  },
  define: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
  },
});
