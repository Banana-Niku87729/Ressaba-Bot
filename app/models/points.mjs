import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  storage: 'database.sqlite',
});

const Points = sequelize.define('points', {
  userId: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  lastBalanceCheck: {
    type: DataTypes.DATE,
    allowNull: true,
  }
});

export default Points;