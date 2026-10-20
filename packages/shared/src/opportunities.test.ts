import { describe, expect, it } from 'vitest';
import { firstStage, PIPELINE_STAGES, stageBelongsTo, STAGE_PROBABILITY } from './opportunities';

describe('pipelines', () => {
  it('cada pipeline inicia en su primera etapa del BRD', () => {
    expect(firstStage('PYME')).toBe('SOLICITUD');
    expect(firstStage('SOLUCIONES')).toBe('CALIFICACION');
  });

  it('no mezcla etapas entre pipelines', () => {
    expect(stageBelongsTo('PYME', 'DEMO_POC')).toBe(false);
    expect(stageBelongsTo('SOLUCIONES', 'DEMO_POC')).toBe(true);
  });

  it('ambos pipelines cierran en ganada o perdida', () => {
    for (const stages of Object.values(PIPELINE_STAGES)) {
      expect(stages.slice(-2)).toEqual(['GANADA', 'PERDIDA']);
    }
    expect(STAGE_PROBABILITY.GANADA).toBe(100);
  });
});
