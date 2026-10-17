import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import ChatSession from "./chatSession.model.js";

const Message = sequelize.define(
  "Message",
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
        model: ChatSession,
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
  },
  {
    timestamps: true,
  }
);

export default Message;
