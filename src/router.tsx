import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SignIn from "./components/signin";
import Signup from "./components/signup";
import DashBoard from "./components/dashboard";

export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <SignIn /> },
  { path: "/dashboard", element: <DashBoard /> },
]);
