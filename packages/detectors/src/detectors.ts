import type {
  DetectionEvidence,
  Framework,
  Language,
  PackageManager,
  ProjectFileIndex,
  ProjectType,
  UnsupportedArea
} from '@codedoctor/shared';
import { hasAnyFile, hasExtension, hasFile, hasPrefix } from './fileIndex.js';

export interface DetectionDraft {
  types: Set<ProjectType>;
  languages: Set<Language>;
  frameworks: Set<Framework>;
  packageManagers: Set<PackageManager>;
  evidence: DetectionEvidence[];
  recommendedAnalyzers: Set<string>;
  unsupportedAreas: UnsupportedArea[];
}

export function createDraft(): DetectionDraft {
  return {
    types: new Set(),
    languages: new Set(),
    frameworks: new Set(),
    packageManagers: new Set(),
    evidence: [],
    recommendedAnalyzers: new Set(['universal', 'repository-health', 'secret', 'test', 'ai-coding-smell']),
    unsupportedAreas: []
  };
}

function addEvidence(draft: DetectionDraft, evidence: DetectionEvidence): void {
  draft.evidence.push(evidence);
}

export function detectGeneric(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (hasAnyFile(index, ['README.md', 'README', 'readme.md'])) {
    addEvidence(draft, { type: 'file', path: 'README', description: 'Project documentation file present', weight: 0.1 });
  }
  if (hasFile(index, '.gitignore')) {
    addEvidence(draft, { type: 'file', path: '.gitignore', description: 'Git ignore configuration present', weight: 0.1 });
  }
  if (hasPrefix(index, 'docs/') || hasPrefix(index, 'scripts/')) {
    addEvidence(draft, { type: 'directory', path: 'docs/ or scripts/', description: 'Common project support directory present', weight: 0.08 });
  }
}

export function detectNode(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (!hasFile(index, 'package.json')) {
    return;
  }

  draft.types.add('node-web');
  draft.languages.add('javascript');
  draft.recommendedAnalyzers.add('node-dependency');
  addEvidence(draft, { type: 'file', path: 'package.json', description: 'Node package manifest present', weight: 0.35 });

  if (hasAnyFile(index, ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'])) {
    const manager = hasFile(index, 'pnpm-lock.yaml') ? 'pnpm' : hasFile(index, 'yarn.lock') ? 'yarn' : 'npm';
    draft.packageManagers.add(manager);
    addEvidence(draft, { type: 'file', path: `${manager} lockfile`, description: 'Node lockfile present', weight: 0.18 });
  } else {
    draft.packageManagers.add('npm');
  }

  if (hasAnyFile(index, ['tsconfig.json']) || hasExtension(index, '.ts') || hasExtension(index, '.tsx')) {
    draft.languages.add('typescript');
    addEvidence(draft, { type: 'file', path: 'tsconfig.json or .ts files', description: 'TypeScript evidence present', weight: 0.14 });
  }
  if (hasAnyFile(index, ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'])) {
    draft.frameworks.add('vite');
    addEvidence(draft, { type: 'config', path: 'vite.config', description: 'Vite configuration present', weight: 0.18 });
  }
  if (hasAnyFile(index, ['next.config.js', 'next.config.mjs', 'next.config.ts'])) {
    draft.frameworks.add('next');
    addEvidence(draft, { type: 'config', path: 'next.config', description: 'Next.js configuration present', weight: 0.2 });
  }
  if (index.files.some((file) => file.path.endsWith('.tsx') || file.path.endsWith('.jsx'))) {
    draft.frameworks.add('react');
    addEvidence(draft, { type: 'content', path: '*.tsx or *.jsx', description: 'React-style component files present', weight: 0.12 });
  }
  if (index.files.some((file) => file.path.endsWith('.vue'))) {
    draft.frameworks.add('vue');
    addEvidence(draft, { type: 'content', path: '*.vue', description: 'Vue single-file components present', weight: 0.12 });
  }
}

export function detectPython(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (!hasAnyFile(index, ['requirements.txt', 'pyproject.toml', 'Pipfile', 'poetry.lock', 'uv.lock', 'manage.py', 'app.py', 'main.py']) && !hasExtension(index, '.py')) {
    return;
  }

  draft.types.add('python');
  draft.languages.add('python');
  draft.recommendedAnalyzers.add('python-project');
  draft.packageManagers.add(hasFile(index, 'uv.lock') ? 'uv' : hasFile(index, 'poetry.lock') ? 'poetry' : 'pip');
  addEvidence(draft, { type: 'file', path: 'python project files', description: 'Python project evidence present', weight: 0.25 });
  if (hasFile(index, 'manage.py')) {
    draft.frameworks.add('django');
  }
  draft.unsupportedAreas.push({ area: 'Python deep framework analysis', reason: 'CodeDoctor runs lightweight Python project checks; it does not replace Ruff, MyPy, Bandit, or framework-specific analyzers.' });
}

export function detectJava(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (!hasAnyFile(index, ['pom.xml', 'build.gradle', 'build.gradle.kts']) && !hasPrefix(index, 'src/main/java/')) {
    return;
  }

  draft.types.add('java');
  draft.languages.add('java');
  draft.recommendedAnalyzers.add('java-project');
  draft.packageManagers.add(hasFile(index, 'pom.xml') ? 'maven' : 'gradle');
  addEvidence(draft, { type: 'file', path: 'pom.xml/build.gradle/src/main/java', description: 'Java project evidence present', weight: 0.25 });
  if (hasAnyFile(index, ['src/main/resources/application.yml', 'src/main/resources/application.properties', 'application.yml'])) {
    draft.frameworks.add('spring-boot');
  }
  draft.unsupportedAreas.push({ area: 'Java deep framework analysis', reason: 'CodeDoctor runs lightweight Java project checks; it does not replace Checkstyle, SpotBugs, Error Prone, or framework-specific analyzers.' });
}

export function detectCpp(index: ProjectFileIndex, draft: DetectionDraft): void {
  const hasCppSource = ['.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.hh', '.hxx'].some((extension) => hasExtension(index, extension));
  if (!hasCppSource && !hasAnyFile(index, ['CMakeLists.txt', 'Makefile', 'makefile', 'conanfile.txt', 'conanfile.py', 'vcpkg.json'])) {
    return;
  }

  draft.types.add('cpp');
  draft.languages.add('cpp');
  draft.recommendedAnalyzers.add('cpp-project');
  addEvidence(draft, { type: 'file', path: 'CMakeLists/Makefile/C++ source', description: 'C/C++ project evidence present', weight: 0.25 });
  if (hasFile(index, 'CMakeLists.txt')) {
    draft.packageManagers.add('cmake');
    addEvidence(draft, { type: 'file', path: 'CMakeLists.txt', description: 'CMake build descriptor present', weight: 0.18 });
  }
  if (hasAnyFile(index, ['Makefile', 'makefile'])) {
    draft.packageManagers.add('make');
  }
  if (hasAnyFile(index, ['conanfile.txt', 'conanfile.py'])) {
    draft.packageManagers.add('conan');
  }
  if (hasFile(index, 'vcpkg.json')) {
    draft.packageManagers.add('vcpkg');
  }
  draft.unsupportedAreas.push({ area: 'C/C++ deep static analysis', reason: 'CodeDoctor runs lightweight C/C++ project checks; it does not replace clang-tidy, cppcheck, sanitizers, or compiler diagnostics.' });
}

export function detectGoRustDotnet(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (hasFile(index, 'go.mod') || hasExtension(index, '.go')) {
    draft.types.add('go');
    draft.languages.add('go');
    draft.packageManagers.add('go-mod');
    addEvidence(draft, { type: 'file', path: 'go.mod or *.go', description: 'Go module or source evidence present', weight: 0.3 });
    draft.unsupportedAreas.push({ area: 'Go runtime verification', reason: 'Static project checks do not execute go test, go vet, or go build.' });
  }
  if (hasFile(index, 'Cargo.toml') || hasExtension(index, '.rs')) {
    draft.types.add('rust');
    draft.languages.add('rust');
    draft.packageManagers.add('cargo');
    addEvidence(draft, { type: 'file', path: 'Cargo.toml or *.rs', description: 'Rust crate or source evidence present', weight: 0.3 });
    draft.unsupportedAreas.push({ area: 'Rust runtime verification', reason: 'Static project checks do not execute cargo test, clippy, or cargo build.' });
  }
  if (hasExtension(index, '.csproj') || hasExtension(index, '.sln')) {
    draft.types.add('dotnet');
    draft.languages.add('csharp');
    draft.packageManagers.add('dotnet');
    addEvidence(draft, { type: 'file', path: '*.csproj or *.sln', description: '.NET project or solution evidence present', weight: 0.3 });
    draft.unsupportedAreas.push({ area: '.NET runtime verification', reason: 'Static project checks do not execute dotnet restore, test, or build.' });
  }
}

export function detectUnity(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (!hasPrefix(index, 'Assets/') || !hasPrefix(index, 'ProjectSettings/')) {
    return;
  }

  draft.types.add('unity');
  draft.languages.add('csharp');
  draft.frameworks.add('unity');
  draft.packageManagers.add('unity-packages');
  draft.recommendedAnalyzers.add('unity');
  addEvidence(draft, { type: 'directory', path: 'Assets/ + ProjectSettings/', description: 'Unity project directories present', weight: 0.5 });
  if (hasFile(index, 'Packages/manifest.json')) {
    addEvidence(draft, { type: 'file', path: 'Packages/manifest.json', description: 'Unity package manifest present', weight: 0.18 });
  }
  if (hasExtension(index, '.unity') || hasExtension(index, '.cs')) {
    addEvidence(draft, { type: 'content', path: '*.unity or *.cs', description: 'Unity scene or C# scripts present', weight: 0.12 });
  }
  draft.unsupportedAreas.push({ area: 'Unity deep gameplay and performance analysis', reason: 'MVP only runs lightweight Unity project checks.' });
}

export function detectUnreal(index: ProjectFileIndex, draft: DetectionDraft): void {
  if (!hasExtension(index, '.uproject')) {
    return;
  }

  draft.types.add('unreal');
  draft.languages.add('cpp');
  draft.frameworks.add('unreal');
  addEvidence(draft, { type: 'file', path: '*.uproject', description: 'Unreal project descriptor present', weight: 0.5 });
  if (hasPrefix(index, 'Source/') || hasPrefix(index, 'Content/') || hasPrefix(index, 'Config/')) {
    addEvidence(draft, { type: 'directory', path: 'Source/ Content/ Config/', description: 'Unreal project directories present', weight: 0.2 });
  }
  draft.unsupportedAreas.push({ area: 'Unreal deep engine analysis', reason: 'MVP only identifies Unreal projects and runs universal checks.' });
}
