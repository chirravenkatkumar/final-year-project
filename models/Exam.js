const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Exam = sequelize.define("Exam", {
    branch: { type: DataTypes.STRING, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    scheduleDateTime: { type: DataTypes.DATE, allowNull: false },
    examName: { type: DataTypes.STRING, allowNull: false },
    examTime: { type: DataTypes.STRING, allowNull: false },
    questions: { type: DataTypes.JSONB, allowNull: false }, // Stores multiple questions
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
});

module.exports = Exam;
