import type { ProjectContext } from '@codedoctor/shared';
import { createFileIndex } from './fileIndex.js';
import {
  createDraft,
  detectCpp,
  detectGeneric,
  detectGoRustDotnet,
  detectJava,
  detectNode,
  detectPython,
  detectUnity,
  detectUnreal
} from './detectors.js';

export async function detectProject(rootPath: string): Promise<ProjectContext> {
  const files = await createFileIndex(rootPath);
  const draft = createDraft();

  detectGeneric(files, draft);
  detectNode(files, draft);
  detectPython(files, draft);
  detectJava(files, draft);
  detectCpp(files, draft);
  detectGoRustDotnet(files, draft);
  detectUnity(files, draft);
  detectUnreal(files, draft);

  if (draft.types.size === 0) {
    draft.types.add('generic');
    draft.evidence.push({
      type: 'directory',
      path: '.',
      description: 'No framework-specific evidence found; using generic project profile',
      weight: 0.2
    });
  } else {
    draft.types.add('generic');
  }

  const totalWeight = draft.evidence.reduce((sum, item) => sum + item.weight, 0);
  const confidence = Math.max(0.35, Math.min(0.98, totalWeight));

  return {
    rootPath,
    detectedTypes: [...draft.types],
    languages: draft.languages.size > 0 ? [...draft.languages] : ['unknown'],
    frameworks: draft.frameworks.size > 0 ? [...draft.frameworks] : ['unknown'],
    packageManagers: draft.packageManagers.size > 0 ? [...draft.packageManagers] : ['unknown'],
    confidence,
    evidence: draft.evidence,
    recommendedAnalyzers: [...draft.recommendedAnalyzers],
    unsupportedAreas: draft.unsupportedAreas,
    files
  };
}
