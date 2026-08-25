import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Tools from './pages/Tools.jsx';
import ProposalGenerator from './pages/ProposalGenerator.jsx';
import RoiCalculator from './pages/RoiCalculator.jsx';
import VoiceProspecting from './pages/VoiceProspecting.jsx';
import VoiceDemos from './pages/VoiceDemos.jsx';
import WoodworkingGuide from './pages/WoodworkingGuide.jsx';
import SportsBetting from './pages/SportsBetting.jsx';
import PartnerEnablement from './pages/PartnerEnablement.jsx';
import AskKris from './pages/AskKris.jsx';
import Insights from './pages/Insights.jsx';
import InsightPost from './pages/InsightPost.jsx';
import DealStories from './pages/DealStories.jsx';
import DealStoryPost from './pages/DealStoryPost.jsx';
import About from './pages/About.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/proposal-generator" element={<ProposalGenerator />} />
          <Route path="/roi-calculator" element={<RoiCalculator />} />
          <Route path="/voice-prospecting" element={<VoiceProspecting />} />
          <Route path="/demos" element={<VoiceDemos />} />
          <Route path="/woodworking-guide" element={<WoodworkingGuide />} />
          <Route path="/sports-betting" element={<SportsBetting />} />
          <Route path="/partner-enablement" element={<PartnerEnablement />} />
          <Route path="/ask-kris" element={<AskKris />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/insights/:slug" element={<InsightPost />} />
          <Route path="/deal-stories" element={<DealStories />} />
          <Route path="/deal-stories/:slug" element={<DealStoryPost />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
