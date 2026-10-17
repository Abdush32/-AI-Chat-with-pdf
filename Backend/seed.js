import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
);

import Auth from './src/models/auth.model.js';

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    const dummyUsers = Array.from({ length: 25 }).map((_, index) => ({
      fname: `Dummy${index + 1}`,
      lname: `User${index + 1}`,
      email: `dummy${index + 1}@example.com`,
      password: 'password123', // BeforeSave hook will hash it
      isActive: index % 3 !== 0, // Roughly 2/3 active, 1/3 inactive
      isAdmin: false
    }));

    // Because of the beforeSave hook that hashes passwords, bulkCreate with individualHooks is best
    await Auth.bulkCreate(dummyUsers, { individualHooks: true });
    
    console.log('25 Dummy users created successfully');
  } catch (error) {
    console.error('Unable to connect to the database or seed:', error);
  } finally {
    await sequelize.close();
  }
};

seed();
