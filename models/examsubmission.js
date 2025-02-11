const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ExamSubmission = sequelize.define("ExamSubmission", {
    examId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    questionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    Username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    code: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    language: {
        type: DataTypes.STRING,
        allowNull: false
    },
    passed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});

module.exports = ExamSubmission;