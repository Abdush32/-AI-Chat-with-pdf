import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { useSelector } from "react-redux";
import { Bounce, ToastContainer } from 'react-toastify';
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import FrontendRoutes from "./routes"
import Login from "./auth/Login";
import SignUp from "./auth/SignUp";

export default function App() {

  const token = useSelector((state: any) => state.auth?.details?.accessToken);
  const checkAuth = (route: any) => {
    if (route.authentication) {
      return token !== undefined && token !== null;
    }
    return true;
  };


  return (
    <>
      <Router>
        <ScrollToTop />
        <ToastContainer
          style={{ zIndex: 999999 }}
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />

        <Routes>

          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/admin" element={<AppLayout />}>
            {FrontendRoutes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={
                  checkAuth(route) ? <route.element /> : <Navigate to="/" />
                }
              />
            ))}
          </Route>
        </Routes>
      </Router>
    </>
  );
}
