export function NetworkGuideIntro() {
  return (
    <div className="network-guide-intro">
      <h3>How this page works</h3>
      <ol>
        <li><strong>Find Network</strong> — search a person to see everyone connected to them.</li>
        <li><strong>Find Link</strong> — search two people to trace the shortest path between them.</li>
        <li>Or pick a name from the repeat-offender list to jump straight into their network.</li>
      </ol>
    </div>
  );
}

export function NetworkGuidePopover() {
  return (
    <div className="network-guide-popover">
      <h4>Reading the graph</h4>
      <ul>
        <li>Click any node to open its details in the side panel.</li>
        <li>Drag to pan, scroll or pinch to zoom.</li>
        <li>Path-finding mode: turn it on, then click two people to trace the link between them.</li>
        <li>Community legend (bottom-left): click a community to isolate that group.</li>
        <li>Clear view: reset back to search.</li>
      </ul>
    </div>
  );
}
