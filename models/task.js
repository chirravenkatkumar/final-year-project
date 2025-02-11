// models/task.js
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Correctly import the sequelize instance

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    question: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    testcase1_input: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    testcase1_output: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    testcase2_input: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    testcase2_output: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        },
    branch: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'Tasks', // Ensure the table name matches
    timestamps: false,  // Disable timestamps if your table does not have them
});

module.exports = Task; // Export the Task model directly