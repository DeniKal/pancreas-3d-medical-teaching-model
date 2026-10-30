export type TabType = 'anatomy' | 'ducts' | 'physiology' | 'clinical' | 'quiz';

export interface AnatomicalStructure {
  id: string;
  name: string;
  latinName: string;
  category: 'pancreas' | 'ducts' | 'vessels' | 'adjacent' | 'microscopic';
  pinPosition: [number, number, number]; // [x, y, z] relative to model center
  cameraFocus: [number, number, number]; // [x, y, z] target position
  summary: string;
  anatomicalRelations: string[];
  bloodSupply: string;
  functions: string[];
  clinicalSignificance: string;
  color: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  targetStructureId: string;
  explanation: string;
  hint: string;
}

export interface ModelLayerSettings {
  pancreasOpacity: number;
  showDuctCutaway: boolean;
  showDuodenum: boolean;
  showVessels: boolean;
  showBiliary: boolean;
  showSpleen: boolean;
  showAnnotations: boolean;
  showHistologyCallout: boolean;
  autoRotate: boolean;
}
