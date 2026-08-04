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
import { CaseDetailPanel } from './CaseDetailPanel';
import { LocationDetailPanel } from './LocationDetailPanel';
import { NetworkSearch } from './NetworkSearch';
import { NetworkGuideIntro, NetworkGuidePopover } from './NetworkGuide';

type NetworkFocus =
  | { mode: 'person'; personId: number }
  | { mode: 'path'; from: number; to: number }
  | { mode: 'case'; caseId: number }
  | { mode: 'location'; locationId: number }
  | { mode: 'community'; communityId: number };

function subgraphParamsForFocus(focus: NetworkFocus | null): SubgraphParams | null {
  if (!focus) return null;
  switch (focus.mode) {
    case 'person':
      return { focus: 'person', personId: focus.personId, hops: 2 };
    case 'path':
      return { focus: 'path', from: focus.from, to: focus.to, maxHops: 6 };
    case 'case':
      return { focus: 'case', caseId: focus.caseId };
    case 'location':
      return { focus: 'location', locationId: focus.locationId };
    case 'community':
      return { focus: 'community', communityId: focus.communityId };
  }
}

type SelectedNode =
  | { source: 'offender'; data: RepeatOffenderResponse }
  | { source: 'person'; data: GraphNodeResponse }
  | { source: 'case'; data: GraphNodeResponse }
  | { source: 'location'; data: GraphNodeResponse };

// Layers the path-focused subgraph's nodes/edges on top of the currently
// displayed background subgraph instead of replacing it, so a found path
// (plus the Case/Location nodes that justify each hop) can be highlighted
// against the rest of the network dimmed behind it, rather than the
// background disappearing.
function mergeById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  if (extra.length === 0) return base;
  const byId = new Map(base.map((item) => [item.id, item]));
  extra.forEach((item) => {
    if (!byId.has(item.id)) byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

export function NetworkScreen() {
  const { token } = useAuth();

  const [focus, setFocus] = useState<NetworkFocus | null>(null);
  const [pathMode, setPathMode] = useState(false);
  const [pathEndpoints, setPathEndpoints] = useState<number[]>([]);
  const [selectedNodeForPanel, setSelectedNodeForPanel] = useState<SelectedNode | null>(null);
  const [selectedNodeForHighlight, setSelectedNodeForHighlight] = useState<string | null>(null);
  const [resetViewKey, setResetViewKey] = useState(0);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [guidePanelOpen, setGuidePanelOpen] = useState(false);

  const subgraphQuery = useSubgraph(token, subgraphParamsForFocus(focus));
  const offendersQuery = useRepeatOffenders(token);
  const communitiesQuery = useCommunities(token);
  const pathQuery = useNetworkPath(token, pathEndpoints[0] ?? null, pathEndpoints[1] ?? null, 6);
  // Independent of `subgraphQuery`/`focus` on purpose: fetching this doesn't
  // touch what's already rendered. It supplies the Person chain plus the
  // Case/Location nodes and edges that justify each hop, so the found path
  // can be layered on top of (and highlighted against) the existing graph.
  const pathSubgraphQuery = useSubgraph(
    token,
    pathEndpoints.length === 2 ? { focus: 'path', from: pathEndpoints[0], to: pathEndpoints[1], maxHops: 6 } : null,
  );

  const communityByLabel = useMemo(() => {
    const map = new Map<string, number>();
    (communitiesQuery.data ?? []).forEach((c) => c.memberDisplayNames.forEach((name) => map.set(name, c.communityId)));
    return map;
  }, [communitiesQuery.data]);

  // The single entity the current view is centered on -- distinct from
  // selectedNodeForHighlight, which tracks whatever node was last clicked
  // inside the graph. Path/community focus have no single root.
  const rootNodeId = useMemo(() => {
    if (!focus) return null;
    if (focus.mode === 'person') return String(focus.personId);
    if (focus.mode === 'case') return String(focus.caseId);
    if (focus.mode === 'location') return String(focus.locationId);
    return null;
  }, [focus]);

  const isLoading = subgraphQuery.isLoading || offendersQuery.isLoading || communitiesQuery.isLoading;
  const isError = subgraphQuery.isError || offendersQuery.isError || communitiesQuery.isError;

  const pathContextNodes = pathSubgraphQuery.data?.nodes ?? [];
  const pathContextEdges = pathSubgraphQuery.data?.edges ?? [];
  const nodes = useMemo(
    () => mergeById(subgraphQuery.data?.nodes ?? [], pathContextNodes),
    [subgraphQuery.data, pathContextNodes],
  );
  const edges = useMemo(
    () => mergeById(subgraphQuery.data?.edges ?? [], pathContextEdges),
    [subgraphQuery.data, pathContextEdges],
  );
  const pathContextIds = useMemo(() => pathContextNodes.map((n) => n.id), [pathContextNodes]);
  const pathEdgeIds = useMemo(() => pathContextEdges.map((e) => e.id), [pathContextEdges]);
  const offenders = offendersQuery.data ?? [];
  const communities = communitiesQuery.data ?? [];

  function handlePersonSubmit(personId: number) {
    setFocus({ mode: 'person', personId });
    setSearchPanelOpen(false);
  }

  function handlePathSubmit(from: number, to: number) {
    setFocus({ mode: 'path', from, to });
    setPathEndpoints([from, to]);
    setPathMode(true);
    setSearchPanelOpen(false);
  }

  function handleNodeClick(node: GraphNodeResponse) {
    if (pathMode) {
      if (node.type !== 'PERSON') return;
      const personId = personIdOfNode(node);
      if (pathEndpoints.length === 0) {
        setPathEndpoints([personId]);
      } else if (pathEndpoints.length === 1) {
        if (pathEndpoints[0] === personId) return;
        // Keep the currently rendered subgraph in place -- swapping focus to
        // 'path' here would refetch a path-only subgraph and make the rest
        // of the network disappear instead of just dimming behind the path.
        setPathEndpoints([pathEndpoints[0], personId]);
      } else {
        setPathEndpoints([personId]);
      }
      return;
    }

    setSelectedNodeForHighlight(node.id);
    if (node.type === 'PERSON') {
      const personId = personIdOfNode(node);
      const offender = offenders.find((o) => o.personId === personId);
      if (offender) {
        setSelectedNodeForPanel({ source: 'offender', data: offender });
      } else {
        setSelectedNodeForPanel({ source: 'person', data: node });
      }
    } else if (node.type === 'CASE') {
      setSelectedNodeForPanel({ source: 'case', data: node });
    } else {
      setSelectedNodeForPanel({ source: 'location', data: node });
    }
  }

  function handleCommunitySelect(communityId: number) {
    setFocus({ mode: 'community', communityId });
  }

  function resetFocus() {
    setFocus(null);
    setPathMode(false);
    setPathEndpoints([]);
    setResetViewKey((k) => k + 1);
  }

  function deselectAll() {
    setSelectedNodeForPanel(null);
    setSelectedNodeForHighlight(null);
  }

  const generatedAt = subgraphQuery.data?.generatedAt ?? new Date().toISOString();
  const supportingCaseLabels = nodes.filter((n) => n.type === 'CASE').slice(0, 3).map((n) => n.label);

  const evidenceData: EvidenceData | null =
    selectedNodeForPanel && selectedNodeForPanel.source === 'offender'
      ? {
          claim: `${selectedNodeForPanel.data.displayName} is linked to ${selectedNodeForPanel.data.caseCount} case(s), gravity-weighted score ${selectedNodeForPanel.data.gravityWeight}.`,
          confidence: selectedNodeForPanel.data.confidenceScore,
          confidenceLabel: 'Identity-resolution confidence',
          method: 'graph-service repeat-offender ranking',
          baseline: 'Statewide',
          generatedAt,
          records: supportingCaseLabels,
        }
      : selectedNodeForPanel && selectedNodeForPanel.source === 'person'
        ? {
            claim: `${selectedNodeForPanel.data.label} appears in the current network view.`,
            confidence: selectedNodeForPanel.data.confidence ?? 0,
            confidenceLabel: 'Identity-resolution confidence',
            method: 'graph-service subgraph query',
            baseline: 'Statewide',
            generatedAt,
            records: supportingCaseLabels,
          }
        : null;

  return (
    <>
      <Header title="Network / Link Analysis" />
      <main className="network-main">
        {!focus ? (
          <div className="network-landing">
            <NetworkGuideIntro />
            <NetworkSearch onPersonSubmit={handlePersonSubmit} onPathSubmit={handlePathSubmit} />
            <RepeatOffenderRail offenders={offenders} onSelect={handlePersonSubmit} />
          </div>
        ) : (
          <>
            {isLoading && <div className="graph-canvas-skeleton" aria-label="Loading network graph" />}
            {isError && <p role="alert">Couldn't load the network — check your connection and try again.</p>}
            {nodes.length > 0 && (
              <>
                <NetworkGraphCanvas
                  nodes={nodes}
                  edges={edges}
                  communityByLabel={communityByLabel}
                  pathEndpointIds={pathEndpoints.map(String)}
                  pathMemberIds={(pathQuery.data?.personIds ?? []).map(String)}
                  pathContextIds={pathContextIds}
                  pathEdgeIds={pathEdgeIds}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedNodeForHighlight}
                  rootNodeId={rootNodeId}
                  onCanvasClick={deselectAll}
                  resetViewKey={resetViewKey}
                />
                <div className="network-toolbar">
                  <button
                    className={`network-search-toggle-btn${searchPanelOpen ? ' active' : ''}`}
                    aria-expanded={searchPanelOpen}
                    onClick={() => {
                      setSearchPanelOpen((open) => !open);
                      setGuidePanelOpen(false);
                    }}
                  >
                    Search
                  </button>
                  <button
                    className={`network-search-toggle-btn${guidePanelOpen ? ' active' : ''}`}
                    aria-expanded={guidePanelOpen}
                    onClick={() => {
                      setGuidePanelOpen((open) => !open);
                      setSearchPanelOpen(false);
                    }}
                  >
                    Guide
                  </button>
                  <PathFindingBar
                    pathMode={pathMode}
                    onToggle={() => {
                      setPathMode((p) => !p);
                      setPathEndpoints([]);
                    }}
                    pathEndpoints={pathEndpoints}
                    pathResult={pathQuery.data}
                    isPathLoading={pathQuery.isLoading}
                    isPathError={pathQuery.isError}
                  />
                  <button className="reset-focus-btn" onClick={resetFocus}>
                    Clear view
                  </button>
                </div>
                {searchPanelOpen && (
                  <div className="network-search-popover">
                    <NetworkSearch onPersonSubmit={handlePersonSubmit} onPathSubmit={handlePathSubmit} />
                  </div>
                )}
                {guidePanelOpen && (
                  <div className="network-search-popover">
                    <NetworkGuidePopover />
                  </div>
                )}
                <CommunityLegend communities={communities} onSelect={handleCommunitySelect} />
              </>
            )}
            {nodes.length === 0 && !isLoading && <p>No linked records for this view.</p>}
          </>
        )}
      </main>
      <EvidencePanel data={evidenceData} onClose={deselectAll} />
      <CaseDetailPanel
        node={selectedNodeForPanel?.source === 'case' ? selectedNodeForPanel.data : null}
        onClose={deselectAll}
        onFocus={(caseId) => setFocus({ mode: 'case', caseId })}
      />
      <LocationDetailPanel
        node={selectedNodeForPanel?.source === 'location' ? selectedNodeForPanel.data : null}
        nodes={nodes}
        edges={edges}
        onClose={deselectAll}
        onFocus={(locationId) => setFocus({ mode: 'location', locationId })}
      />
    </>
  );
}