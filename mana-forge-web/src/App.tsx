import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./views/dashboard/Dashboard";
import Login from "./views/auth/Login";
import { UserProvider } from "./services/UserContext";
import MyDecks from "./views/my-decks/MyDecks";
import DeckBuilder from "./views/deck-builder/DeckBuilder";
import FormatDetail from "./views/formats/FormatDetail";
import Profile from "./views/profile/Profile";
import ArticleDetail from "./views/articles/articleDetail";

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="login" element={<Login />} />
            <Route path="my-decks" element={<MyDecks />} />
            <Route path="deck-builder" element={<DeckBuilder />} />
            <Route path="deck-builder/:deckId" element={<DeckBuilder />} />
            <Route path="format/:formatName" element={<FormatDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="/articles/:articleId" element={<ArticleDetail />} />
            {/* Aquí añadiremos más rutas como /deck-builder */}
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
