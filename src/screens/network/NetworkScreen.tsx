import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Header } from '../../app/Header';
import {
  useSubgraph,
  useRepeatOffenders,
  useCommunities,
  useNetworkPath,
  personIdOfNode,
  type GraphNodeResponse,
  type RepeatOffenderResponse,
  type SubgraphParams,
} from '../../api/networkApi';
import { EvidencePanel, type EvidenceData } from '../../design-system/EvidencePanel';
import { NetworkGraphCanvas } from './NetworkGraphCanvas';
import { PathFindingBar } from './PathFindingBar';
import { CommunityLegend } from './CommunityLegend';
import { RepeatOffenderRail } from './RepeatOffenderRail';

type NetworkFocus =
  | { mode: 'top-offenders' }
  | { mode: 'person'; personId: number }
  | { mode: 'community'; communityId: number }
  | { mode: 'path'; from: number; to: number };

function subgraphParamsForFocus(focus: NetworkFocus): SubgraphParams {
  switch (focus.mode) {
    case 'top-offenders':
      return { focus: 'top-offenders', limit: 10 };
    case 'person':
      return { focus: 'person', personId: focus.personId, hops: 2 };
    case 'community':
      return { focus: 'community', communityId: focus.communityId };
    case 'path':
      return { focus: 'path', from: focus.from, to: focus.to, maxHops: 6 };
  }
}

type SelectedPerson = { source: 'offender'; data: RepeatOffenderResponse } | { source: 'node'; data: GraphNodeResponse };

export function NetworkScreen() {
  const { token } = useAuth();

  const [focus, setFocus] = useState<NetworkFocus>({ mode: 'top-offenders' });
  const [pathMode, setPathMode] = useState(false);
  const [pathEndpoints, setPathEndpoints] = useState<number[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<SelectedPerson | null>(null);

  const subgraphQuery = useSubgraph(token, subgraphParamsForFocus(focus));
  const offendersQuery = useRepeatOffenders(token);
  const communitiesQuery = useCommunities(token);
  const pathQuery = useNetworkPath(token, pathEndpoints[0] ?? null, pathEndpoints[1] ?? null, 6);

  const communityByLabel = useMemo(() => {
    const map = new Map<string, number>();
    (communitiesQuery.data ?? []).forEach((c) => c.memberDisplayNames.forEach((name) => map.set(name, c.communityId)));
    return map;
  }, [communitiesQuery.data]);

  const isLoading = subgraphQuery.isLoading || offendersQuery.isLoading || communitiesQuery.isLoading;
  const isError = subgraphQuery.isError || offendersQuery.isError || communitiesQuery.isError;

  if (isLoading) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <div className="graph-canvas-skeleton" aria-label="Loading network graph" />
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <p role="alert">Couldn't load the network — check your connection and try again.</p>
          <button
            onClick={() => {
              subgraphQuery.refetch();
              offendersQuery.refetch();
              communitiesQuery.refetch();
            }}
          >
            Retry
          </button>
        </main>
      </>
    );
  }

  const nodes = subgraphQuery.data?.nodes ?? [];
  const edges = subgraphQuery.data?.edges ?? [];
  const offenders = offendersQuery.data ?? [];
  const communities = communitiesQuery.data ?? [];

  function togglePathMode() {
    setPathMode((prev) => !prev);
    setPathEndpoints([]);
  }

  function handlePersonClick(personId: number) {
    if (pathMode) {
      setPathEndpoints((prev) => {
        if (prev.includes(personId)) return prev;
        const next = prev.length === 2 ? [personId] : [...prev, personId];
        if (next.length === 2) setFocus({ mode: 'path', from: next[0], to: next[1] });
        return next;
      });
      return;
    }
    const offender = offenders.find((o) => o.personId === personId);
    if (offender) {
      setSelectedPerson({ source: 'offender', data: offender });
    } else {
      const node = nodes.find((n) => n.type === 'PERSON' && personIdOfNode(n) === personId);
      if (node) setSelectedPerson({ source: 'node', data: node });
    }
    setFocus({ mode: 'person', personId });
  }

  function handleCommunitySelect(communityId: number) {
    setFocus({ mode: 'community', communityId });
  }

  function resetFocus() {
    setFocus({ mode: 'top-offenders' });
    setPathMode(false);
    setPathEndpoints([]);
  }

  const generatedAt = subgraphQuery.data?.generatedAt ?? new Date().toISOString();
  const supportingCaseLabels = nodes.filter((n) => n.type === 'CASE').slice(0, 3).map((n) => n.label);

  const evidenceData: EvidenceData | null = selectedPerson && (
    selectedPerson.source === 'offender'
      ? {
          claim: `${selectedPerson.data.displayName} is linked to ${selectedPerson.data.caseCount} case(s), gravity-weighted score ${selectedPerson.data.gravityWeight}.`,
          confidence: selectedPerson.data.confidenceScore,
          confidenceLabel: 'Identity-resolution confidence',
          method: 'graph-service repeat-offender ranking',
          baseline: 'Statewide',
          generatedAt,
          records: supportingCaseLabels,
        }
      : {
          claim: `${selectedPerson.data.label} appears in the current network view.`,
          confidence: selectedPerson.data.confidence ?? 0,
          confidenceLabel: 'Identity-resolution confidence',
          method: 'graph-service subgraph query',
          baseline: 'Statewide',
          generatedAt,
          records: supportingCaseLabels,
        }
  );

  if (nodes.length === 0) {
    return (
      <>
        <Header title="Network / Link Analysis" />
        <main className="network-main">
          <p>No linked records for this view.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Network / Link Analysis" />
      <main className="network-main">
        <NetworkGraphCanvas
          nodes={nodes}
          edges={edges}
          communityByLabel={communityByLabel}
          pathEndpointIds={pathEndpoints.map(String)}
          pathMemberIds={(pathQuery.data?.personIds ?? []).map(String)}
          onPersonClick={handlePersonClick}
        />
        <PathFindingBar
          pathMode={pathMode}
          onToggle={togglePathMode}
          pathEndpoints={pathEndpoints}
          pathResult={pathQuery.data}
          isPathLoading={pathQuery.isLoading}
          isPathError={pathQuery.isError}
        />
        {focus.mode !== 'top-offenders' && (
          <button className="reset-focus-btn" onClick={resetFocus}>
            Top offenders
          </button>
        )}
        <CommunityLegend communities={communities} onSelect={handleCommunitySelect} />
        <RepeatOffenderRail offenders={offenders} onSelect={handlePersonClick} />
      </main>
      <EvidencePanel data={evidenceData} onClose={() => setSelectedPerson(null)} />
    </>
  );
}
