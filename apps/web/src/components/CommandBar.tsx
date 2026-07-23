import type { Finding } from '@codedoctor/shared';

interface CommandBarProps {
  rootPath: string;
  searchQuery: string;
  searchResults: Finding[];
  aiEnabled: boolean;
  scanStatus: { active: boolean; percent: number };
  onSearchChange(value: string): void;
  onSearchSelect(finding: Finding): void;
  onImportProject(files: FileList | null): void;
  onImportReport(file: File): void;
  onCancelScan(): void;
}

export function CommandBar(props: CommandBarProps) {
  return (
    <header className="command-bar">
      <div>
        <p className="path">{props.rootPath}</p>
        <h1>CodeDoctor 工程诊断工作台</h1>
      </div>
      <div className="command-search-wrap">
        <input
          className="command-search"
          value={props.searchQuery}
          aria-label="搜索问题、文件或规则"
          placeholder="搜索问题、文件、规则、修复建议..."
          onChange={(event) => props.onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && props.searchResults[0]) props.onSearchSelect(props.searchResults[0]);
          }}
        />
        {props.searchQuery.trim() ? (
          <div className="search-results" role="listbox" aria-label="搜索结果">
            {props.searchResults.length ? props.searchResults.map((finding) => (
              <button key={finding.id} onClick={() => props.onSearchSelect(finding)}>
                <strong>{finding.title}</strong>
                <span>{finding.filePath ?? finding.ruleId}</span>
              </button>
            )) : <p>没有匹配的问题</p>}
          </div>
        ) : null}
      </div>
      <label className="command-button primary">
        导入项目
        <input type="file" multiple {...{ webkitdirectory: '', directory: '' }} onChange={(event) => {
          props.onImportProject(event.target.files);
          event.currentTarget.value = '';
        }} />
      </label>
      <label className="command-button">
        导入报告
        <input type="file" accept="application/json,.json" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) props.onImportReport(file);
          event.currentTarget.value = '';
        }} />
      </label>
      {props.scanStatus.active ? (
        <button className="status-pill cancel-scan" onClick={props.onCancelScan}>取消 {props.scanStatus.percent}%</button>
      ) : <span className="status-pill">{props.aiEnabled ? 'AI 已启用' : '规则扫描'}</span>}
    </header>
  );
}
