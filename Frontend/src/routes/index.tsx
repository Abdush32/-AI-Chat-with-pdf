import Dashboard from "../pages/Dashboard/Home";
import AiGirl from "../pages/AiGirl";
import ChatWithPdf from "../pages/ChatWithPdf";

import UserProfiles from "../pages/UserProfiles";
import UsersList from "../pages/UsersList";

const Routes = [
  {
    path: "dashboard",
    name: "Dashboard",
    element: Dashboard,
    authentication: true,
  },
  {
    path: "ai-girlfriend",
    name: "Ai Girlfriend",
    element: AiGirl,
    authentication: true,
  },
  {
    path: "Chatwithpdf",
    name: "Chat with PDF",
    element: ChatWithPdf,
    authentication: true,
  },
  {
    path: "profile",
    name: "User Profile",
    element: UserProfiles,
    authentication: true,
  },
  {
    path: "users",
    name: "Users",
    element: UsersList,
    authentication: true,
  },
];

export default Routes;