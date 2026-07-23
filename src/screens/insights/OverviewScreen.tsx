import { Header } from '../../app/Header';
import { OverviewTab } from './OverviewTab';

export function OverviewScreen() {
  return (
    <>
      <Header title="Overview" />
      <main className="main-single insights-main">
        <OverviewTab />
      </main>
    </>
  );
}
