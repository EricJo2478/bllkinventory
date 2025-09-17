// src/types/medDoc.ts

export interface MedDoc {
  display: boolean;
  formName: string;
  name: string;
  group: string;
  id: string;
  amount: number;
  max?: number;
  min?: number;
  pkg?: number;
}
