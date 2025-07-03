// src/components/ConsultingChat/index.ts
export { default } from './ConsultingChat';
export * from './types';
export { useAuth } from './hooks/useAuth';
export { useApiStatus } from './hooks/useApiStatus';
export { default as FrameworkSelector } from './components/FrameworkSelector';

// Framework exports
export { default as UseCaseFramework } from './frameworks/UseCaseFramework';
export { default as SWOTAnalysis } from './frameworks/SWOTAnalysis';
export { default as McKinsey7S } from './frameworks/McKinsey7S';
export { default as PortersFiveForces } from './frameworks/PortersFiveForces';
export { default as BalancedScorecard } from './frameworks/BalancedScorecard';
export { default as RootCauseAnalysis } from './frameworks/RootCauseAnalysis';
export { default as IssueTree } from './frameworks/IssueTree';