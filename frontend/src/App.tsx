import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CharactersPage from "./pages/CharactersPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import GamePage from "./pages/GamePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/characters" element={<CharactersPage />} />
      <Route path="/characters/create" element={<CreateCharacterPage />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
}

export default App;
