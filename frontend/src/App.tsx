import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import CallbackPage from "./pages/CallbackPage";
import CharactersPage from "./pages/CharactersPage";
import CharacterDetailPage from "./pages/CharacterDetailPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import GamePage from "./pages/GamePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/characters" element={<CharactersPage />} />
      <Route path="/characters/create" element={<CreateCharacterPage />} />
      <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
}

export default App;
