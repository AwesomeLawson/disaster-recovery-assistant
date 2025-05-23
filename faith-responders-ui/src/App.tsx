import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ChurchSignup from './pages/ChurchSignup';
import IndividualSignup from './pages/IndividualSignup';
import Login from './pages/Login';
import PostLoginRedirect from './pages/PostLoginRedirect';
import ChooseRole from './pages/ChooseRole';
import DashboardChurch from './pages/DashboardChurch';
import DashboardIndividual from './pages/DashboardIndividual';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="church-signup" element={<ChurchSignup />} />
        <Route path="individual-signup" element={<IndividualSignup />} />
        <Route path="login" element={<Login />} />
        <Route path="post-login" element={<PostLoginRedirect />} />
        <Route path="/choose-role" element={<ChooseRole />} />
        <Route path="/dashboard/church" element={<DashboardChurch />} />
        <Route path="/dashboard/individual" element={<DashboardIndividual />} />
      </Route>
    </Routes>
  );
}