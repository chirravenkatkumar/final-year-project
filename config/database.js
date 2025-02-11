const { Sequelize } = require('sequelize');

// Configure Sequelize instance
const sequelize = new Sequelize('AB15_PROJECT', 'postgres', 'Nani@99128', {
    host: 'localhost',
    dialect: 'postgres',
    logging:false
});

module.exports = sequelize;
