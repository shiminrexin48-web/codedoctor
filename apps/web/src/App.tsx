import { CommandBar } from './components/CommandBar.js';
import { NavigationRail } from './components/NavigationRail.js';
import { AiView } from './components/AiView.js';
import { IssuesView } from './components/IssuesView.js';
import { OverviewView } from './components/OverviewView.js';
import { ReportsView } from './components/ReportsView.js';
import { useAiWorkspace } from './useAiWorkspace.js';
import { useReportWorkspace } from './useReportWorkspace.js';

export function App() {
  const workspace = useReportWorkspace();
  const {
    report, setReport, selectedKey, setSelectedKey, selectedItem, selectedFinding, findings, findingItems,
    loadState, severityFilter, activeView, setActiveView, searchQuery, setSearchQuery, searchResults, scanStatus,
    filteredFindingItems, filterOptions, portrait, repairPrompt, markdownPreview, highPriorityCount,
    analyzerCount, maturityMissingCount, primaryNextAction, loadReport, loadProject, cancelScan,
    selectSearchResult, applySeverityFilter
  } = workspace;
  const {
    provider, apiKey, model, customEndpoint, aiStatus, isExplaining, promptStatus, directAiMode,
    estimatedTokens, requestAllowed, explainedCount, selectProvider, updateApiKey, updateModel,
    updateCustomEndpoint, updateDirectMode, explainCurrent, explainHighPriority, copyRepairPrompt
  } = useAiWorkspace({ report, setReport, selectedFinding, selectedItem, findingItems, repairPrompt });

  return (
    <main className="workbench-shell">
      <NavigationRail activeView={activeView} onChange={setActiveView} />

      <section className="workbench">
        <CommandBar
          rootPath={report.context.rootPath}
          searchQuery={searchQuery}
          searchResults={searchResults}
          aiEnabled={Boolean(report.ai?.requested)}
          scanStatus={scanStatus}
          onSearchChange={setSearchQuery}
          onSearchSelect={selectSearchResult}
          onImportProject={(files) => void loadProject(files)}
          onImportReport={(file) => void loadReport(file)}
          onCancelScan={cancelScan}
        />

        {activeView === 'overview' ? (
          <OverviewView
            report={report}
            findings={findings}
            portrait={portrait}
            loadState={loadState}
            primaryNextAction={primaryNextAction}
            highPriorityCount={highPriorityCount}
            maturityMissingCount={maturityMissingCount}
            analyzerCount={analyzerCount}
            onViewChange={setActiveView}
          />
        ) : null}

        {activeView === 'issues' ? (
          <IssuesView
            findings={findings}
            filteredItems={filteredFindingItems}
            filterOptions={filterOptions}
            selectedKey={selectedKey}
            selectedFinding={selectedFinding}
            severityFilter={severityFilter}
            highPriorityCount={highPriorityCount}
            onFilter={applySeverityFilter}
            onSelect={setSelectedKey}
            onGoAi={() => setActiveView('ai')}
          />
        ) : null}

        {activeView === 'ai' ? (
          <AiView
            selectedFinding={selectedFinding}
            provider={provider}
            apiKey={apiKey}
            model={model}
            customEndpoint={customEndpoint}
            aiStatus={aiStatus}
            isExplaining={isExplaining}
            directAiMode={directAiMode}
            estimatedTokens={estimatedTokens}
            requestAllowed={requestAllowed}
            explainedCount={explainedCount}
            findingCount={report.summary.findingCount}
            promptStatus={promptStatus}
            repairPrompt={repairPrompt}
            onProviderChange={selectProvider}
            onKeyChange={updateApiKey}
            onModelChange={updateModel}
            onCustomEndpointChange={updateCustomEndpoint}
            onDirectModeChange={updateDirectMode}
            onExplainCurrent={explainCurrent}
            onExplainNext={explainHighPriority}
            onCopyPrompt={copyRepairPrompt}
          />
        ) : null}

        {activeView === 'reports' ? <ReportsView report={report} findings={findings} portrait={portrait} markdownPreview={markdownPreview} /> : null}
      </section>
    </main>
  );
}
