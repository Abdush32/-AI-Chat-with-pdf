import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import DocumentChatSession from "./documentChatSession.model.js";

const DocumentMessage = sequelize.define(
  "DocumentMessage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    chatSessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: DocumentChatSession,
        key: "id",
      },
    },
    sender: {
      type: DataTypes.ENUM("user", "ai"),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sources: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
  },
  {
    timestamps: true,
  }
);

export default DocumentMessage;
