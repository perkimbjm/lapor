
// This file should not contain any import or export statements.
// It declares global types for the entire project.

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

/**
 * Augment the global Window interface to include the aistudio object.
 * TypeScript requires all merged declarations of a property to have identical modifiers.
 * Marked as optional to align with external environment declarations.
 */
interface Window {
  aistudio?: AIStudio;
}