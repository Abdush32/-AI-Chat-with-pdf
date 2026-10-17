import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Auth from "./auth.model.js";

const Companion = sequelize.define(
  "Companion",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Auth,
        key: "id",
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mood: {
      type: DataTypes.ENUM("romantic", "sad"),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

export default Companion;
