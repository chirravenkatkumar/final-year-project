const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ExamCompleted = sequelize.define("ExamCompleted", {
    examId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    examName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    Username: {
        type: DataTypes.STRING,
        allowNull: false
    },
  }

);

module.exports = ExamCompleted;