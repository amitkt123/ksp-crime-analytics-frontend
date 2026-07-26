import { Header } from '../../app/Header';
import { InvestigationNetworkTab } from './InvestigationNetworkTab';

export function InvestigationNetworkScreen() {
  return (
    <>
      <Header title="Investigation Network" />
      <main className="main-single insights-main">
        <InvestigationNetworkTab />
      </main>
    </>
  );
}
