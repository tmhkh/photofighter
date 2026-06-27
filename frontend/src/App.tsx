import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import CharactersPage from "./pages/CharactersPage";
import CharacterDetailPage from "./pages/CharacterDetailPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import GamePage from "./pages/GamePage";

/**
 * 認証ガード: 未認証時は /login にリダイレクト
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * コールバックページ: OAuth トークン交換後にリダイレクト
 */
function CallbackPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <p>認証中...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/characters" replace />;
  }

  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/characters"
        element={
          <ProtectedRoute>
            <CharactersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/characters/create"
        element={
          <ProtectedRoute>
            <CreateCharacterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/characters/:characterId"
        element={
          <ProtectedRoute>
            <CharacterDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
