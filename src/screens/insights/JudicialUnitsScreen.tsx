import { Header } from '../../app/Header';
import { JudicialUnitsTab } from './JudicialUnitsTab';

export function JudicialUnitsScreen() {
  return (
    <>
      <Header title="Judicial & Units" />
      <main className="main-single insights-main">
        <JudicialUnitsTab />
      </main>
    </>
  );
}
