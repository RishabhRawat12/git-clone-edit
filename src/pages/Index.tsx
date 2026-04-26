import { Navigate } from "react-router-dom";

// Root path redirects straight to the workspace; the workspace will
// redirect to /auth if no JWT is present.
const Index = () => <Navigate to="/workspace" replace />;

export default Index;
