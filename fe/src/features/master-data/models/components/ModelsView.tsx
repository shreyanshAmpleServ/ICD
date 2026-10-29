import { useState } from 'react';
import { Banner, useToast } from '@/ds/components';
import { useSession } from '@/app/session';
import { models as seedModels } from '@/mock/admin';
import { AuditNote, SetupPage, useEditable } from '../../shared/AdminKit';
import { modelsApi } from '../api';
import { ModelCard } from './ModelCard';
import { ActivateModelModal } from './ActivateModelModal';

type Model = (typeof seedModels)[number];
const CODES = ['YARD_ALLOC', 'DWELL', 'OCCUPANCY'];

export function ModelsView() {
  const { phase } = useSession();
  const toast = useToast();
  const [ms, setMs] = useEditable<Model>('models', seedModels);
  const [act, setAct] = useState<Model | null>(null);

  return (
    <SetupPage
      title="Prediction models"
      ms="M6"
      sub="Trained versions behind slot suggestions, dwell and occupancy forecasts"
      sources={[{ table: 'ml_model_version, yard_suggestion_log' }]}
    >
      {phase !== 2 && (
        <Banner tone="info" title="Phase 2">
          Prediction models arrive with milestone M6. Switch the demo to Phase 2 to try them.
        </Banner>
      )}
      <Banner tone="info" title="Predictions are advice only">
        Suggestions and forecasts help people decide. No billing, release or gate decision reads them, and every suggestion
        is logged next to what the officer actually chose.
      </Banner>

      {CODES.map((c) => (
        <ModelCard key={c} code={c} models={ms} phase={phase} onActivate={setAct} />
      ))}

      <AuditNote />

      {act && (
        <ActivateModelModal
          act={act}
          cur={ms.find((m) => m.modelCode === act.modelCode && m.isActive)}
          onClose={() => setAct(null)}
          onSave={(why) => {
            modelsApi.activateModel(act.mlModelVersionId, why).catch(() => {});
            setMs((all) =>
              all.map((m) =>
                m.modelCode === act.modelCode
                  ? { ...m, isActive: m.mlModelVersionId === act.mlModelVersionId }
                  : m
              )
            );
            toast('Version activated');
          }}
        />
      )}
    </SetupPage>
  );
}
