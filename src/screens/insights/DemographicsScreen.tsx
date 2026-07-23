import { Header } from '../../app/Header';
import { DemographicsTab } from './DemographicsTab';

export function DemographicsScreen() {
  return (
    <>
      <Header title="Demographics" />
      <main className="main-single insights-main">
        <DemographicsTab />
      </main>
    </>
  );
}
