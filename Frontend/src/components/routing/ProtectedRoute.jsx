// In your router configuration
import ProtectedRoute from "./components/routing/ProtectedRoute";

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      // Public routes
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/pricing", element: <Pricing /> },
      { path: "/trade-demo", element: <TradeDemo /> },
      
      // Protected routes (just need to be logged in)
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/billing", element: <Billing /> },
          { path: "/activation", element: <Activation /> },
        ],
      },
      
      // Dashboard - requires activation (let dashboard handle redirects)
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard", element: <MemberDashboard /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
]);
