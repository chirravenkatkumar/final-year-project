// models/submission.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Ensure this path is correct

const Submission = sequelize.define('Submission', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    Username: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    taskId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Tasks', // Ensure this matches the name of the Task model
            key: 'id'
        }
    },
    code: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    language: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    passed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'Submissions', // Ensure the table name matches
    timestamps: true, // This will add createdAt and updatedAt fields
});

// Export the Submission model directly
module.exports = Submission;