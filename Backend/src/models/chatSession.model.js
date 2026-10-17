import { DataTypes } from "sequelize";
import { sequelize } from "../db/index.js";
import Auth from "./auth.model.js";
import Companion from "./companion.model.js";

const ChatSession = sequelize.define(
  "ChatSession",
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
    companionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Companion,
        key: "id",
      },
    },
  },
  {
    timestamps: true,
  }
);

export default ChatSession;
