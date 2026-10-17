import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Auth from "./auth.model.js";

const Document = sequelize.define(
  "Document",
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chromaCollectionName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalChunks: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default Document;
