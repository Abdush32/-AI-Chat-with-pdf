import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Auth from "./auth.model.js";
import Document from "./document.model.js";

const DocumentChatSession = sequelize.define(
  "DocumentChatSession",
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
    documentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: Document,
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      defaultValue: "New Chat",
    },
    mode: {
      type: DataTypes.ENUM("with_data", "without_data"),
      defaultValue: "without_data",
    },
  },
  {
    timestamps: true,
  }
);

export default DocumentChatSession;
