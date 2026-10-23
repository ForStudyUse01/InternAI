"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RoleScoringTemplate } from "@/lib/ai-hiring";
import {
  DEFAULT_ROLE_TEMPLATES,
  hiringAIEngine,
  previewWeightedScore,
  validateScoringWeights
} from "@/lib/ai-hiring";
import {
  fetchAdminHiringScoringTemplates,
  previewAdminHiringScoringTemplate,
  saveAdminHiringScoringTemplate,
  type AdminHiringScoringTemplate
} from "@/lib/admin-portal";

const FACTORS = ["skills", "tests", "projects", "experience", "resume"] as const;

function toRoleTemplate(item: AdminHiringScoringTemplate): RoleScoringTemplate {
  return {
    roleKey: item.roleKey,
    roleLabel: item.roleLabel,
    weights: item.weights,
    enabled: item.enabled,
    version: item.version,
    updatedAt: item.updatedAt
  };
}

export function AdminHiringScoringPanel() {
  const [templates, setTemplates] = useState<RoleScoringTemplate[]>(DEFAULT_ROLE_TEMPLATES);
  const [selectedKey, setSelectedKey] = useState(DEFAULT_ROLE_TEMPLATES[0].roleKey);
  const [draft, setDraft] = useState<RoleScoringTemplate>(DEFAULT_ROLE_TEMPLATES[0]);
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const remote = await fetchAdminHiringScoringTemplates(true);
        if (remote.length) {
          const mapped = remote.map(toRoleTemplate);
          setTemplates(mapped);
          hiringAIEngine.configureRoleTemplates(mapped);
          setSelectedKey(mapped[0].roleKey);
          setDraft(mapped[0]);
        }
      } catch {
        hiringAIEngine.configureRoleTemplates(DEFAULT_ROLE_TEMPLATES);
      }
    })();
  }, []);

  const validation = useMemo(() => validateScoringWeights(draft.weights), [draft.weights]);

  useEffect(() => {
    const sample = { skills: 82, tests: 76, projects: 79, experience: 68, resume: 74 };
    setPreviewScore(previewWeightedScore(sample, draft.weights, draft.enabled));
  }, [draft]);

  function selectTemplate(roleKey: string) {
    const found = templates.find((item) => item.roleKey === roleKey);
    if (!found) return;
    setSelectedKey(roleKey);
    setDraft(JSON.parse(JSON.stringify(found)) as RoleScoringTemplate);
    setMessage(null);
    setError(null);
  }

  async function handleSave() {
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await saveAdminHiringScoringTemplate({
        roleKey: draft.roleKey,
        roleLabel: draft.roleLabel,
        weights: draft.weights,
        enabled: draft.enabled,
        isActive: true
      });
      const mapped = toRoleTemplate(saved);
      const next = templates.some((item) => item.roleKey === mapped.roleKey)
        ? templates.map((item) => (item.roleKey === mapped.roleKey ? mapped : item))
        : [...templates, mapped];
      setTemplates(next);
      hiringAIEngine.configureRoleTemplates(next);
      setDraft(mapped);
      setMessage(`Saved ${mapped.roleLabel} template v${mapped.version || 1}.`);
      const remotePreview = await previewAdminHiringScoringTemplate({
        weights: mapped.weights,
        enabled: mapped.enabled,
        factorScores: { skills: 82, tests: 76, projects: 79, experience: 68, resume: 74 }
      });
      setPreviewScore(remotePreview.overallScore);
    } catch (err) {
      setError((err as Error).message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="AI Hiring Scoring Templates" subtitle="Configure role-specific weights. Total must equal 100%. Changes are versioned and auditable.">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.roleKey}
                type="button"
                onClick={() => selectTemplate(template.roleKey)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedKey === template.roleKey
                    ? "border-[var(--ds-primary)] bg-[var(--ds-info-bg)] text-[var(--ds-primary-text)]"
                    : "border-[var(--ds-border)] hover:border-[var(--ds-border-strong)]"
                }`}
              >
                <p className="font-semibold">{template.roleLabel}</p>
                <p className="text-xs text-[var(--ds-muted)]">v{template.version || 1}</p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="ds-label">Role Key</span>
                <input
                  className="surface-subtle w-full rounded-lg px-3 py-2"
                  value={draft.roleKey}
                  onChange={(event) => setDraft((prev) => ({ ...prev, roleKey: event.target.value }))}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="ds-label">Role Label</span>
                <input
                  className="surface-subtle w-full rounded-lg px-3 py-2"
                  value={draft.roleLabel}
                  onChange={(event) => setDraft((prev) => ({ ...prev, roleLabel: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {FACTORS.map((factor) => (
                <div key={factor} className="company-dashboard-metric-tile">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="ds-label capitalize">{factor}</p>
                    <label className="inline-flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={draft.enabled[factor]}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            enabled: { ...prev.enabled, [factor]: event.target.checked }
                          }))
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-label={`${factor} weight`}
                    className="surface-subtle w-full rounded-lg px-3 py-2"
                    value={draft.weights[factor]}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        weights: { ...prev.weights, [factor]: Number(event.target.value) || 0 }
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <p role="status" aria-live="polite" className={`text-sm ${validation.valid ? "text-[var(--ds-success)]" : "text-[var(--ds-danger)]"}`}>{validation.message}</p>
              {previewScore !== null ? <p className="ds-caption">Preview overall score (sample candidate): {previewScore}%</p> : null}
            </div>

            {error ? <p role="alert" className="text-sm text-[var(--ds-danger)]">{error}</p> : null}
            {message ? <p role="status" aria-live="polite" className="text-sm text-[var(--ds-success)]">{message}</p> : null}

            <Button type="button" onClick={() => void handleSave()} disabled={saving || !validation.valid}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
