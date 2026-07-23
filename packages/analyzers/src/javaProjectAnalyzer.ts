import type { Analyzer, AnalyzerResult, Finding } from '@codedoctor/shared';
import { finding, hasProjectType, lineInfo, readTextFile } from './utils.js';

function hasFile(context: Parameters<Analyzer['canRun']>[0], path: string): boolean {
  return Boolean(context.files.byPath[path]);
}

function hasAnyFile(context: Parameters<Analyzer['canRun']>[0], paths: string[]): boolean {
  return paths.some((path) => hasFile(context, path));
}

export const javaProjectAnalyzer: Analyzer = {
  id: 'java-project',
  name: 'Java Project Analyzer',
  capability: {
    languages: ['java'],
    frameworks: ['spring-boot', 'unknown'],
    projectTypes: ['java'],
    filePatterns: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'src/main/java/**/*.java'],
    categories: ['dependency', 'build', 'test', 'bug', 'maintainability', 'config'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: (context) => hasProjectType(context, 'java'),
  async analyze(context): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const javaFiles = context.files.files.filter((file) => file.path.endsWith('.java'));
    const hasMaven = hasFile(context, 'pom.xml');
    const hasGradle = hasAnyFile(context, ['build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts']);

    if (javaFiles.length > 0 && !hasMaven && !hasGradle) {
      findings.push(finding({
        title: 'Java build descriptor is missing',
        description: 'Java source files exist, but no Maven or Gradle build file was found.',
        severity: 'high',
        category: 'build',
        evidence: ['No pom.xml, build.gradle, or build.gradle.kts found.'],
        recommendation: 'Add a Maven or Gradle build descriptor so the project can be built consistently.',
        sourceAnalyzer: 'java-project',
        ruleId: 'java/build-descriptor-missing',
        confidence: 0.9,
        applicableProjectTypes: ['java'],
        tags: ['java', 'build']
      }));
    }

    if (hasGradle && !hasAnyFile(context, ['gradlew', 'gradlew.bat'])) {
      findings.push(finding({
        title: 'Gradle wrapper is missing',
        description: 'The project uses Gradle but does not include the Gradle wrapper.',
        severity: 'low',
        category: 'build',
        evidence: ['Found Gradle build files without gradlew or gradlew.bat.'],
        recommendation: 'Commit the Gradle wrapper so contributors and CI use the same Gradle version.',
        sourceAnalyzer: 'java-project',
        ruleId: 'java/gradle-wrapper-missing',
        confidence: 0.74,
        applicableProjectTypes: ['java'],
        tags: ['java', 'gradle']
      }));
    }

    const hasTests = context.files.files.some((file) => file.path.startsWith('src/test/') || /Test\.java$/.test(file.path) || /Tests\.java$/.test(file.path));
    if (javaFiles.length > 0 && !hasTests) {
      findings.push(finding({
        title: 'Java tests are not visible',
        description: 'No conventional Java test sources were found.',
        severity: 'medium',
        category: 'test',
        evidence: ['No src/test directory or *Test.java files found.'],
        recommendation: 'Add unit or integration tests under src/test/java and wire them into Maven or Gradle.',
        sourceAnalyzer: 'java-project',
        ruleId: 'java/test-signal-missing',
        confidence: 0.8,
        applicableProjectTypes: ['java'],
        tags: ['java', 'test']
      }));
    }

    for (const file of javaFiles) {
      const content = await readTextFile(file);
      if (!content) {
        continue;
      }

      const emptyCatch = content.match(/catch\s*\([^)]*\)\s*\{\s*\}/m);
      if (emptyCatch?.index !== undefined) {
        const info = lineInfo(content, emptyCatch.index);
        findings.push(finding({
          title: 'Empty Java catch block',
          description: 'An exception is caught and ignored.',
          severity: 'high',
          category: 'bug',
          filePath: file.path,
          startLine: info.line,
          endLine: info.line,
          codeSnippet: info.snippet,
          evidence: ['Found an empty catch block.'],
          recommendation: 'Log, rethrow, or handle the exception explicitly.',
          sourceAnalyzer: 'java-project',
          ruleId: 'java/empty-catch',
          confidence: 0.88,
          applicableProjectTypes: ['java'],
          tags: ['java', 'error-handling']
        }));
      }

      const systemOut = content.match(/\bSystem\.(out|err)\.print(ln)?\s*\(/m);
      if (systemOut?.index !== undefined) {
        const info = lineInfo(content, systemOut.index);
        findings.push(finding({
          title: 'Java console logging in application code',
          description: 'System.out/System.err logging is hard to control in production services.',
          severity: 'low',
          category: 'maintainability',
          filePath: file.path,
          startLine: info.line,
          endLine: info.line,
          codeSnippet: info.snippet,
          evidence: ['Matched System.out/System.err print call.'],
          recommendation: 'Use the project logging framework so log levels and destinations are configurable.',
          sourceAnalyzer: 'java-project',
          ruleId: 'java/system-out',
          confidence: 0.68,
          applicableProjectTypes: ['java'],
          tags: ['java', 'logging']
        }));
      }
    }

    return { analyzerId: 'java-project', findings };
  }
};
