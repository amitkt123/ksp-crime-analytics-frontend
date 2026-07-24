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
import { NetworkFilterBar } from './NetworkFilterBar';
import { collapseToPersonGraph, filterByNodeType } from './networkGraphTransforms';

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

  const [fullDetail, setFullDetail] = useState(false);
  const [showCase, setShowCase] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [search, setSearch] = useState('');
  const [dropdownPathFrom, setDropdownPathFrom] = useState<number | ''>('');
  const [dropdownPathTo, setDropdownPathTo] = useState<number | ''>('');

  const subgraphQuery = useSubgraph(token, subgraphParamsForFocus(focus));
  const offendersQuery = useRepeatOffenders(token);
  const communitiesQuery = useCommunities(token);
  const pathQuery = useNetworkPath(token, pathEndpoints[0] ?? null, pathEndpoints[1] ?? null, 6);

  const nodes = subgraphQuery.data?.nodes ?? [];
  const edges = subgraphQuery.data?.edges ?? [];
  const offenders = offendersQuery.data ?? [];
  const communities = communitiesQuery.data ?? [];

  const communityByLabel = useMemo(() => {
    const map = new Map<string, number>();
    (communitiesQuery.data ?? []).forEach((c) => c.memberDisplayNames.forEach((name) => map.set(name, c.communityId)));
    return map;
  }, [communitiesQuery.data]);

  const personOptions = useMemo(() => {
    const byId = new Map<number, string>();
    nodes.filter((n) => n.type === 'PERSON').forEach((n) => byId.set(personIdOfNode(n), n.label));
    offenders.forEach((o) => byId.set(o.personId, o.displayName));
    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, offenders]);

  const displayGraph = useMemo(() => {
    if (fullDetail) return filterByNodeType(nodes, edges, { showCase, showLocation });
    const collapsed = collapseToPersonGraph(nodes, edges);
    return {
      nodes: collapsed.nodes,
      edges: collapsed.edges.map((e) => ({
        id: e.id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        type: 'SHARES_MO_WITH' as const,
        confidence: null,
        weight: e.weight,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, fullDetail, showCase, showLocation]);

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

  function handleCommunityDropdownChange(value: number | 'all') {
    if (value === 'all') {
      setFocus({ mode: 'top-offenders' });
    } else {
      setFocus({ mode: 'community', communityId: value });
    }
  }

  function handleDropdownPathFromChange(value: number | '') {
    setDropdownPathFrom(value);
    if (value !== '' && dropdownPathTo !== '') {
      setPathEndpoints([value, dropdownPathTo]);
      setFocus({ mode: 'path', from: value, to: dropdownPathTo });
    }
  }

  function handleDropdownPathToChange(value: number | '') {
    setDropdownPathTo(value);
    if (dropdownPathFrom !== '' && value !== '') {
      setPathEndpoints([dropdownPathFrom, value]);
      setFocus({ mode: 'path', from: dropdownPathFrom, to: value });
    }
  }

  function resetFocus() {
    setFocus({ mode: 'top-offenders' });
    setPathMode(false);
    setPathEndpoints([]);
  }

  function handleResetFilters() {
    setFullDetail(false);
    setShowCase(true);
    setShowLocation(true);
    setSearch('');
    setDropdownPathFrom('');
    setDropdownPathTo('');
    setFocus({ mode: 'top-offenders' });
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

  const selectedCommunityId = focus.mode === 'community' ? focus.communityId : 'all';

  return (
    <>
      <Header title="Network / Link Analysis" />
      <main className="network-main">
        <NetworkFilterBar
          fullDetail={fullDetail}
          onToggleFullDetail={() => setFullDetail((v) => !v)}
          showCase={showCase}
          onToggleShowCase={() => setShowCase((v) => !v)}
          showLocation={showLocation}
          onToggleShowLocation={() => setShowLocation((v) => !v)}
          search={search}
          onSearchChange={setSearch}
          communities={communities}
          selectedCommunityId={selectedCommunityId}
          onCommunityChange={handleCommunityDropdownChange}
          personOptions={personOptions}
          pathFrom={dropdownPathFrom}
          pathTo={dropdownPathTo}
          onPathFromChange={handleDropdownPathFromChange}
          onPathToChange={handleDropdownPathToChange}
          pathResult={pathQuery.data}
          isPathLoading={pathQuery.isLoading}
          isPathError={pathQuery.isError}
          onReset={handleResetFilters}
        />
        <div className="network-canvas-area">
          <NetworkGraphCanvas
            nodes={displayGraph.nodes}
            edges={displayGraph.edges}
            communityByLabel={communityByLabel}
            pathEndpointIds={pathEndpoints.map(String)}
            pathMemberIds={(pathQuery.data?.personIds ?? []).map(String)}
            onPersonClick={handlePersonClick}
            search={search}
          />
          <div className="network-top-left-controls">
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
          </div>
          <CommunityLegend communities={communities} onSelect={handleCommunitySelect} />
          <RepeatOffenderRail offenders={offenders} onSelect={handlePersonClick} />
        </div>
      </main>
      <EvidencePanel data={evidenceData} onClose={() => setSelectedPerson(null)} />
    </>
  );
}
