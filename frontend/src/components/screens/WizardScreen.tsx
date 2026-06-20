'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { I } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/Primitives';
import { createCampaign, launchCampaign } from '@/lib/api/campaigns';
import { listEmailTemplates, testEmailTemplate } from '@/lib/api/templates';
import { listSmtpProfiles } from '@/lib/api/smtp-profiles';
import { listLandingPages } from '@/lib/api/landing-pages';
import { listGroups, getGroup } from '@/lib/api/groups';
import { renderWithVars, SAMPLE_VARS } from '@/lib/template-utils';

interface WizardData {
  name: string;
  description: string;
  templateId: string;
  smtpProfileId: string;
  landingPageId: string;
  groupId: string;
  startDate: string;
  endDate: string;
}

const STEPS = ['Basics', 'Template & sender', 'Landing page', 'Audience', 'Schedule', 'Review'];

function toIsoLocalNow(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export function WizardScreen({
  onClose,
  onLaunch,
}: {
  onClose: () => void;
  onLaunch: () => void;
}): JSX.Element {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    name: '',
    description: '',
    templateId: '',
    smtpProfileId: '',
    landingPageId: '',
    groupId: '',
    startDate: toIsoLocalNow(),
    endDate: '',
  });
  const update = <K extends keyof WizardData>(k: K, v: WizardData[K]): void =>
    setData((d) => ({ ...d, [k]: v }));

  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ['email-templates'], queryFn: listEmailTemplates });
  const profiles = useQuery({ queryKey: ['smtp-profiles'], queryFn: listSmtpProfiles });
  const landings = useQuery({ queryKey: ['landing-pages'], queryFn: listLandingPages });
  const groups = useQuery({ queryKey: ['groups'], queryFn: listGroups });
  const groupDetail = useQuery({
    queryKey: ['groups', data.groupId],
    queryFn: () => getGroup(data.groupId),
    enabled: !!data.groupId,
  });

  const selectedTemplate = templates.data?.[0]?.find((t) => t.id === data.templateId);
  const selectedProfile = profiles.data?.[0]?.find((p) => p.id === data.smtpProfileId);
  const recipientCount = groupDetail.data?.members.length ?? 0;

  const create = useMutation({
    mutationFn: () =>
      createCampaign({
        name: data.name,
        description: data.description || undefined,
        templateId: data.templateId,
        smtpProfileId: data.smtpProfileId || undefined,
        landingPageId: data.landingPageId || undefined,
        groupId: data.groupId || undefined,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : undefined,
      }),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  const launch = useMutation({
    mutationFn: launchCampaign,
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Launch failed'),
  });

  async function handleCreateAndLaunch(launchNow: boolean): Promise<void> {
    try {
      const campaign = await create.mutateAsync();
      if (launchNow) {
        await launch.mutateAsync(campaign.id);
        toast.success(`Launched "${campaign.name}" to ${recipientCount} recipient(s)`);
      } else {
        toast.success(`Saved draft "${campaign.name}"`);
      }
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      onLaunch();
    } catch {
      // toast handled by mutation onError
    }
  }

  const canAdvance = (() => {
    if (step === 0) return data.name.trim().length > 0;
    if (step === 1) return !!data.templateId && !!data.smtpProfileId;
    if (step === 3) return !!data.groupId;
    if (step === 4) return !!data.startDate;
    return true;
  })();

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal lg"
        style={{ width: 'min(960px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-head">
          <div className="modal-title">New campaign</div>
          <span className="spacer" />
          <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
            Step {step + 1} of {STEPS.length}
          </span>
          <button type="button" className="topbar-action" onClick={onClose} aria-label="Close">
            <I.x size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', flex: 1, minHeight: 0 }}>
          <div className="wizard-rail">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`wizard-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
                onClick={() => i <= step && setStep(i)}
              >
                <div className="wizard-step-num">{i < step ? <I.check size={11} /> : i + 1}</div>
                <div className="wizard-step-label">{label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: 22, overflow: 'auto' }}>
            {step === 0 && (
              <Section title="Campaign basics">
                <Field label="Name">
                  <input
                    className="input"
                    value={data.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Q2 Finance team — invoice pretext"
                    autoFocus
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    className="input"
                    rows={3}
                    value={data.description}
                    onChange={(e) => update('description', e.target.value)}
                  />
                </Field>
              </Section>
            )}

            {step === 1 && (
              <Section title="Template & sender">
                <Field label="Email template">
                  <select
                    className="input"
                    value={data.templateId}
                    onChange={(e) => update('templateId', e.target.value)}
                  >
                    <option value="">— select template —</option>
                    {templates.data?.[0]?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.subject}
                      </option>
                    ))}
                  </select>
                  {templates.data?.[0]?.length === 0 && (
                    <div className="field-help">
                      No templates yet — create one on the Templates screen first.
                    </div>
                  )}
                </Field>
                <Field label="Sending profile (SMTP)">
                  <select
                    className="input"
                    value={data.smtpProfileId}
                    onChange={(e) => update('smtpProfileId', e.target.value)}
                  >
                    <option value="">— select profile —</option>
                    {profiles.data?.[0]?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.fromEmail}
                      </option>
                    ))}
                  </select>
                  {profiles.data?.[0]?.length === 0 && (
                    <div className="field-help">
                      No sending profiles configured. Add one in Settings → SMTP &amp; sending.
                    </div>
                  )}
                </Field>

                {selectedTemplate && (
                  <div>
                    <label className="field-label">Preview</label>
                    <div className="mail-preview">
                      <div className="mail-head">
                        <div className="mail-head-row">
                          <strong>From:</strong>{' '}
                          {selectedProfile
                            ? `${selectedProfile.fromName || selectedProfile.fromEmail} <${selectedProfile.fromEmail}>`
                            : '(select a sending profile)'}
                        </div>
                        <div className="mail-head-row">
                          <strong>Subject:</strong>{' '}
                          {renderWithVars(selectedTemplate.subject, SAMPLE_VARS) || '(no subject)'}
                        </div>
                      </div>
                      <div
                        className="mail-body"
                        style={{ maxHeight: 220, overflow: 'auto' }}
                        dangerouslySetInnerHTML={{
                          __html: renderWithVars(selectedTemplate.htmlContent, SAMPLE_VARS),
                        }}
                      />
                    </div>
                  </div>
                )}
              </Section>
            )}

            {step === 2 && (
              <Section title="Landing page (optional)">
                <Field label="Landing page">
                  <select
                    className="input"
                    value={data.landingPageId}
                    onChange={(e) => update('landingPageId', e.target.value)}
                  >
                    <option value="">— none (links go to the original URL) —</option>
                    {landings.data?.items.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · /{p.slug}
                      </option>
                    ))}
                  </select>
                  <div className="field-help">
                    When set, every link in the email is rewritten to your landing page so opens,
                    clicks and form submissions attribute back to the recipient.
                  </div>
                </Field>
              </Section>
            )}

            {step === 3 && (
              <Section title="Target audience">
                <Field label="Group">
                  <select
                    className="input"
                    value={data.groupId}
                    onChange={(e) => update('groupId', e.target.value)}
                  >
                    <option value="">— select group —</option>
                    {groups.data?.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.memberCount} members
                      </option>
                    ))}
                  </select>
                  {groups.data?.groups.length === 0 && (
                    <div className="field-help">
                      No groups yet. Create one on the Target groups screen.
                    </div>
                  )}
                </Field>

                {data.groupId && (
                  <div>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="field-label" style={{ margin: 0 }}>
                        Recipients ({recipientCount})
                      </label>
                      {recipientCount === 0 && !groupDetail.isLoading && (
                        <Badge tone="warn">This group is empty</Badge>
                      )}
                    </div>
                    <div className="card" style={{ padding: 0, maxHeight: 220, overflow: 'auto' }}>
                      <table className="table">
                        <tbody>
                          {groupDetail.isLoading && (
                            <tr>
                              <td style={{ color: 'var(--fg-subtle)' }}>Loading recipients…</td>
                            </tr>
                          )}
                          {groupDetail.data?.members.slice(0, 50).map((m) => (
                            <tr key={m.email}>
                              <td className="mono" style={{ fontSize: 11.5 }}>
                                {m.email}
                              </td>
                              <td>{[m.firstName, m.lastName].filter(Boolean).join(' ') || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {recipientCount > 50 && (
                      <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)', marginTop: 4 }}>
                        Showing first 50 of {recipientCount}.
                      </div>
                    )}
                  </div>
                )}
              </Section>
            )}

            {step === 4 && (
              <Section title="Schedule">
                <Field label="Start">
                  <input
                    className="input mono"
                    type="datetime-local"
                    value={data.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                  />
                </Field>
                <Field label="End (optional)">
                  <input
                    className="input mono"
                    type="datetime-local"
                    value={data.endDate}
                    onChange={(e) => update('endDate', e.target.value)}
                  />
                </Field>
              </Section>
            )}

            {step === 5 && (
              <Section title="Review & launch">
                <ReviewRow label="Name" value={data.name} />
                <ReviewRow label="Template" value={selectedTemplate?.name ?? '—'} />
                <ReviewRow
                  label="Sending profile"
                  value={selectedProfile ? `${selectedProfile.name} · ${selectedProfile.fromEmail}` : '—'}
                />
                <ReviewRow
                  label="Landing page"
                  value={landings.data?.items.find((p) => p.id === data.landingPageId)?.name ?? 'None'}
                />
                <ReviewRow
                  label="Audience"
                  value={`${groups.data?.groups.find((g) => g.id === data.groupId)?.name ?? '—'} · ${recipientCount} recipient(s)`}
                />
                <ReviewRow label="Start" value={new Date(data.startDate).toLocaleString()} />
                <ReviewRow label="End" value={data.endDate ? new Date(data.endDate).toLocaleString() : '—'} />

                {data.templateId && data.smtpProfileId && (
                  <TestSendInline templateId={data.templateId} smtpProfileId={data.smtpProfileId} />
                )}

                <div
                  className="card"
                  style={{
                    padding: 12,
                    marginTop: 6,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    background: recipientCount === 0 ? 'var(--danger-soft)' : 'var(--accent-soft)',
                  }}
                >
                  <I.send size={15} />
                  <div style={{ fontSize: 12.5 }}>
                    {recipientCount === 0 ? (
                      <>This campaign has <strong>no recipients</strong>. Add members to the group before launching.</>
                    ) : (
                      <>
                        Launching will send the email to <strong>{recipientCount}</strong> recipient
                        {recipientCount === 1 ? '' : 's'} immediately.
                      </>
                    )}
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 22px', borderTop: '1px solid var(--line)' }}>
          {step > 0 && (
            <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <span className="spacer" />
          {step < STEPS.length - 1 && (
            <button type="button" className="btn primary" disabled={!canAdvance} onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
          {step === STEPS.length - 1 && (
            <>
              <button type="button" className="btn" disabled={create.isPending} onClick={() => handleCreateAndLaunch(false)}>
                Save as draft
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={create.isPending || launch.isPending || recipientCount === 0}
                onClick={() => handleCreateAndLaunch(true)}
              >
                <I.send size={12} />{' '}
                {create.isPending || launch.isPending ? 'Working…' : `Launch to ${recipientCount}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TestSendInline({
  templateId,
  smtpProfileId,
}: {
  templateId: string;
  smtpProfileId: string;
}): JSX.Element {
  const [email, setEmail] = useState('');
  const send = useMutation({
    mutationFn: () => testEmailTemplate(templateId, { testEmail: email.trim(), smtpProfileId }),
    onSuccess: () => toast.success('Test email sent'),
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Test send failed'),
  });
  return (
    <div className="card" style={{ padding: 12, marginTop: 6, display: 'grid', gap: 6, background: 'var(--bg-sunken)' }}>
      <div className="field-label" style={{ margin: 0 }}>
        Send yourself a test first (recommended)
      </div>
      <div className="row" style={{ gap: 6 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="button"
          className="btn"
          disabled={!email.includes('@') || send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending ? 'Sending…' : 'Send test'}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr',
        padding: '8px 0',
        borderBottom: '1px solid var(--line)',
        fontSize: 12.5,
      }}
    >
      <div style={{ color: 'var(--fg-subtle)' }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

// Preserved for callers that still wire the legacy AI generator slot.
export function AIGenerator(): JSX.Element {
  return (
    <div style={{ padding: 24, color: 'var(--fg-subtle)' }}>
      <Badge tone="info">Coming soon</Badge>
      <p style={{ marginTop: 10, fontSize: 13 }}>
        AI template generation is not wired to a model yet — create templates manually from the
        Templates screen for now.
      </p>
    </div>
  );
}
