import { rgb } from 'pdf-lib';

export interface TemplateConfig {
  id: string;
  name: string;
  colors: {
    primary: ReturnType<typeof rgb>;
    secondary: ReturnType<typeof rgb>;
    accent: ReturnType<typeof rgb>;
    text: ReturnType<typeof rgb>;
    textLight: ReturnType<typeof rgb>;
    background: ReturnType<typeof rgb>;
    border: ReturnType<typeof rgb>;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: {
    headerStyle: 'centered' | 'left' | 'two-column';
    sectionSpacing: number;
    lineHeight: number;
    margin: number;
    showBorders: boolean;
    showDividers: boolean;
  };
  styles: {
    headerSize: number;
    sectionSize: number;
    bodySize: number;
    nameSize: number;
  };
}

export const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    colors: {
      primary: rgb(0.2, 0.4, 0.8), // Blue
      secondary: rgb(0.1, 0.2, 0.4),
      accent: rgb(0.3, 0.5, 0.9),
      text: rgb(0.1, 0.1, 0.1),
      textLight: rgb(0.4, 0.4, 0.4),
      background: rgb(1, 1, 1),
      border: rgb(0.9, 0.9, 0.9),
    },
    fonts: {
      heading: 'Helvetica-Bold',
      body: 'Helvetica',
    },
    layout: {
      headerStyle: 'centered',
      sectionSpacing: 20,
      lineHeight: 16,
      margin: 72,
      showBorders: false,
      showDividers: true,
    },
    styles: {
      headerSize: 24,
      sectionSize: 14,
      bodySize: 10,
      nameSize: 20,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    colors: {
      primary: rgb(0.2, 0.2, 0.2), // Dark gray/zinc
      secondary: rgb(0.3, 0.3, 0.3),
      accent: rgb(0.4, 0.4, 0.4),
      text: rgb(0.1, 0.1, 0.1),
      textLight: rgb(0.4, 0.4, 0.4),
      background: rgb(1, 1, 1),
      border: rgb(0.8, 0.8, 0.8),
    },
    fonts: {
      heading: 'Helvetica-Bold',
      body: 'Helvetica',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 18,
      lineHeight: 15,
      margin: 72,
      showBorders: true,
      showDividers: false,
    },
    styles: {
      headerSize: 22,
      sectionSize: 13,
      bodySize: 10,
      nameSize: 18,
    },
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    colors: {
      primary: rgb(0.5, 0.2, 0.7), // Purple
      secondary: rgb(0.6, 0.3, 0.8),
      accent: rgb(0.7, 0.4, 0.9),
      text: rgb(0.1, 0.1, 0.1),
      textLight: rgb(0.4, 0.4, 0.4),
      background: rgb(1, 1, 1),
      border: rgb(0.9, 0.85, 0.95),
    },
    fonts: {
      heading: 'Helvetica-Bold',
      body: 'Helvetica',
    },
    layout: {
      headerStyle: 'two-column',
      sectionSpacing: 22,
      lineHeight: 16,
      margin: 60,
      showBorders: false,
      showDividers: true,
    },
    styles: {
      headerSize: 26,
      sectionSize: 15,
      bodySize: 10,
      nameSize: 22,
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      primary: rgb(0.3, 0.3, 0.3), // Gray
      secondary: rgb(0.4, 0.4, 0.4),
      accent: rgb(0.5, 0.5, 0.5),
      text: rgb(0.1, 0.1, 0.1),
      textLight: rgb(0.5, 0.5, 0.5),
      background: rgb(1, 1, 1),
      border: rgb(0.95, 0.95, 0.95),
    },
    fonts: {
      heading: 'Helvetica',
      body: 'Helvetica',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 24,
      lineHeight: 17,
      margin: 80,
      showBorders: false,
      showDividers: false,
    },
    styles: {
      headerSize: 20,
      sectionSize: 12,
      bodySize: 10,
      nameSize: 18,
    },
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    colors: {
      primary: rgb(0.2, 0.2, 0.5), // Indigo
      secondary: rgb(0.3, 0.3, 0.6),
      accent: rgb(0.4, 0.4, 0.7),
      text: rgb(0.1, 0.1, 0.1),
      textLight: rgb(0.35, 0.35, 0.35),
      background: rgb(1, 1, 1),
      border: rgb(0.85, 0.85, 0.9),
    },
    fonts: {
      heading: 'Helvetica-Bold',
      body: 'Helvetica',
    },
    layout: {
      headerStyle: 'centered',
      sectionSpacing: 20,
      lineHeight: 15,
      margin: 70,
      showBorders: true,
      showDividers: true,
    },
    styles: {
      headerSize: 23,
      sectionSize: 14,
      bodySize: 10,
      nameSize: 21,
    },
  },
  'ats-friendly': {
    id: 'ats-friendly',
    name: 'ATS Friendly',
    colors: {
      primary: rgb(0.1, 0.5, 0.2), // Green
      secondary: rgb(0.2, 0.6, 0.3),
      accent: rgb(0.3, 0.7, 0.4),
      text: rgb(0.1, 0.1, 0.1),
      textLight: rgb(0.4, 0.4, 0.4),
      background: rgb(1, 1, 1),
      border: rgb(0.9, 0.95, 0.9),
    },
    fonts: {
      heading: 'Helvetica-Bold',
      body: 'Helvetica',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 16,
      lineHeight: 14,
      margin: 72,
      showBorders: false,
      showDividers: false,
    },
    styles: {
      headerSize: 22,
      sectionSize: 13,
      bodySize: 10,
      nameSize: 18,
    },
  },
};

export function getTemplateConfig(templateId: string): TemplateConfig {
  return TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS.modern;
}

