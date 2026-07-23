import type { Analyzer, AnalyzerResult, Finding } from '@codedoctor/shared';
import { finding, hasProjectType, lineInfo, readTextFile } from './utils.js';

const cppExtensions = ['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx'];
const buildFiles = ['CMakeLists.txt', 'Makefile', 'makefile', 'conanfile.txt', 'conanfile.py', 'vcpkg.json'];

function hasFile(context: Parameters<Analyzer['canRun']>[0], path: string): boolean {
  return Boolean(context.files.byPath[path]);
}

function hasAnyFile(context: Parameters<Analyzer['canRun']>[0], paths: string[]): boolean {
  return paths.some((path) => hasFile(context, path));
}

function isCppFile(path: string): boolean {
  return cppExtensions.some((extension) => path.endsWith(extension));
}

export const cppProjectAnalyzer: Analyzer = {
  id: 'cpp-project',
  name: 'C/C++ Project Analyzer',
  capability: {
    languages: ['cpp'],
    frameworks: ['unknown'],
    projectTypes: ['cpp'],
    filePatterns: ['CMakeLists.txt', 'Makefile', '*.c', '*.cc', '*.cpp', '*.hpp'],
    categories: ['build', 'test', 'bug', 'maintainability', 'config'],
    confidence: 'medium',
    requiresExternalTool: false,
    requiresNetwork: false,
    requiresAI: false,
    optional: false
  },
  canRun: (context) => hasProjectType(context, 'cpp'),
  async analyze(context): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const cppFiles = context.files.files.filter((file) => isCppFile(file.path));

    if (cppFiles.length > 0 && !hasAnyFile(context, buildFiles)) {
      findings.push(finding({
        title: 'C/C++ build descriptor is missing',
        description: 'C/C++ source files exist, but no common build descriptor was found.',
        severity: 'high',
        category: 'build',
        evidence: ['No CMakeLists.txt, Makefile, conanfile, or vcpkg.json found.'],
        recommendation: 'Add CMake, Make, Conan, or vcpkg metadata so the project can be built reproducibly.',
        sourceAnalyzer: 'cpp-project',
        ruleId: 'cpp/build-descriptor-missing',
        confidence: 0.86,
        applicableProjectTypes: ['cpp'],
        tags: ['cpp', 'build']
      }));
    }

    const cmake = context.files.byPath['CMakeLists.txt'];
    if (cmake) {
      const content = await readTextFile(cmake);
      if (content && !/cmake_minimum_required\s*\(/i.test(content)) {
        findings.push(finding({
          title: 'CMake minimum version is not declared',
          description: 'CMake projects should declare the minimum required CMake version.',
          severity: 'medium',
          category: 'build',
          filePath: 'CMakeLists.txt',
          evidence: ['CMakeLists.txt does not contain cmake_minimum_required(...).'],
          recommendation: 'Add cmake_minimum_required(VERSION ...) near the top of CMakeLists.txt.',
          sourceAnalyzer: 'cpp-project',
          ruleId: 'cpp/cmake-minimum-missing',
          confidence: 0.82,
          applicableProjectTypes: ['cpp'],
          tags: ['cpp', 'cmake']
        }));
      }
    }

    if (cppFiles.length > 0 && !hasAnyFile(context, ['.clang-format', '_clang-format'])) {
      findings.push(finding({
        title: 'C/C++ formatting policy is missing',
        description: 'No clang-format configuration was found.',
        severity: 'low',
        category: 'maintainability',
        evidence: ['No .clang-format or _clang-format file found.'],
        recommendation: 'Add a clang-format configuration to keep C/C++ diffs consistent.',
        sourceAnalyzer: 'cpp-project',
        ruleId: 'cpp/clang-format-missing',
        confidence: 0.7,
        applicableProjectTypes: ['cpp'],
        tags: ['cpp', 'style']
      }));
    }

    const hasTests = context.files.files.some((file) => /(^|\/)(tests?|spec)\//i.test(file.path) || /(_test|Test)\.(c|cc|cpp|cxx)$/.test(file.path));
    if (cppFiles.length > 0 && !hasTests) {
      findings.push(finding({
        title: 'C/C++ tests are not visible',
        description: 'No conventional C/C++ test directory or test source file was found.',
        severity: 'medium',
        category: 'test',
        evidence: ['No tests/, test/, *_test.cpp, or *Test.cpp files found.'],
        recommendation: 'Add a lightweight test target and wire it into CTest, Make, or CI.',
        sourceAnalyzer: 'cpp-project',
        ruleId: 'cpp/test-signal-missing',
        confidence: 0.76,
        applicableProjectTypes: ['cpp'],
        tags: ['cpp', 'test']
      }));
    }

    const unsafeApiPattern = /\b(gets|strcpy|strcat|sprintf)\s*\(/m;
    for (const file of cppFiles) {
      const content = await readTextFile(file);
      if (!content) {
        continue;
      }
      const unsafe = content.match(unsafeApiPattern);
      if (unsafe?.index !== undefined) {
        const info = lineInfo(content, unsafe.index);
        findings.push(finding({
          title: 'Unsafe C/C++ API usage',
          description: 'The source uses a C API that is commonly associated with buffer overflows.',
          severity: 'high',
          category: 'bug',
          filePath: file.path,
          startLine: info.line,
          endLine: info.line,
          codeSnippet: info.snippet,
          evidence: [`Matched ${unsafe[1]}(...).`],
          recommendation: 'Use bounded alternatives and validate buffer sizes; enable compiler warnings and sanitizers.',
          sourceAnalyzer: 'cpp-project',
          ruleId: 'cpp/unsafe-c-api',
          confidence: 0.84,
          applicableProjectTypes: ['cpp'],
          tags: ['cpp', 'memory-safety'],
          fixComplexity: 'medium'
        }));
      }
    }

    return { analyzerId: 'cpp-project', findings };
  }
};
