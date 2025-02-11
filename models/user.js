const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Adjust the path as needed

const User = sequelize.define('User ', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('student', 'admin'),
        allowNull: false,
    },
    branch: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    resetToken: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'Users', // Ensure the table name matches
    timestamps: false,  // Disable timestamps if your table does not have them
});

module.exports = User;