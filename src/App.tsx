import { HashRouter, Routes, Route } from 'react-router-dom';
import { CollectionProvider, useCollection } from './store/CollectionContext';
import Layout from './components/Layout';
import Browse from './pages/Browse';
import Search from './pages/Search';
import AddCard from './pages/AddCard';
import CardView from './pages/CardView';
import Presets from './pages/Presets';
import Settings from './pages/Settings';

function Gate() {
  const { ready } = useCollection();
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-white/40">Loading your vault…</div>;
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/add" element={<AddCard />} />
        <Route path="/edit/:id" element={<AddCard />} />
        <Route path="/card/:id" element={<CardView />} />
        <Route path="/presets" element={<Presets />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <CollectionProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </CollectionProvider>
  );
}
