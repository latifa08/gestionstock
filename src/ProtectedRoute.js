import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  // ❌ ما دارش login
  if (!user) {
    return <Navigate to="/login" />;
  }

  // ❌ role ما عندوش صلاحية
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }

  // ✅ مسموح
  return children;
};

export default ProtectedRoute;