import { Header } from '../../app/Header';
import { CrimeTrendsTab } from './CrimeTrendsTab';

export function CrimeTrendsScreen() {
  return (
    <>
      <Header title="Crime Trends" />
      <main className="main-single insights-main">
        <CrimeTrendsTab />
      </main>
    </>
  );
}
