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
import Friends from "./views/friends/Friends";
import NotFound from "./views/errors/NotFound";
import VerifyEmail from "./views/auth/VerifyEmail";
import { LanguageProvider } from "./services/LanguageContext";
import ScrollToTop from "./components/layout/ScrollToTop";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { ToastProvider } from "./services/ToastContext";

import LegalPageView from "./views/legal/LegalPage";
import DeckViewer from "./views/deck-viewer/DeckViewer";

import CookieConsent from "./components/ui/CookieConsent";
import Messages from "./views/messages/Messages";
import DeckExplorer from "./views/deck-explorer/DeckExplorer";

function App() {
  return (
    <LanguageProvider>
      <UserProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="login" element={<Login />} />
                <Route path="verify-email" element={<VerifyEmail />} />
                <Route path="formats/all-formats" element={<FormatDetail />} />
                <Route path="formats/:formatName" element={<FormatDetail />} />
                <Route path="/articles/:articleId" element={<ArticleDetail />} />
                <Route path="/legal/:slug" element={<LegalPageView />} />
                <Route path="/deck-viewer/:deckId" element={<DeckViewer />} />
                <Route path="/explorer" element={<DeckExplorer />} />

                {/* Rutas protegidas — requieren autenticación */}
                <Route element={<ProtectedRoute />}>
                  <Route path="my-decks" element={<MyDecks />} />
                  <Route path="deck-builder" element={<DeckBuilder />} />
                  <Route
                    path="deck-builder/:deckId"
                    element={<DeckBuilder />}
                  />
                  <Route path="profile" element={<Profile />} />
                  <Route path="friends" element={<Friends />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="messages/:friendId" element={<Messages />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <CookieConsent />
          </BrowserRouter>
        </ToastProvider>
      </UserProvider>
    </LanguageProvider>
  );
}

export default App;
