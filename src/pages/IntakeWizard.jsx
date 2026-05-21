import { useState } from "react";
import { Btn, Card, ErrorMsg, Field, Spinner, INSURERS, DENIAL_TYPES } from "../components/ui.jsx";
import * as api from "../api.js";

const DEFAULTS = {
  patientName: "John Smith",
  patientEmail: "willjhooper@msn.com",
  patientPhone: "(555) 123-4567",
  patientAddress: "123 Main St, New York, NY 10001",
  insurer: "Aetna",
  memberId: "AET-123456789",
  planName: "Aetna PPO Gold",
  claimNumber: "CLM-987654321",
  denialDate: "2026-05-01",
  procedure: "MRI of lumbar spine",
  denialType: "Prior Authorization Denied",
  claimAmount: "4500",
  diagnosis: "Lumbar disc herniation",
  cptCodes: "72148",
  denialReason: "Not medically necessary per clinical guidelines",
  doctorName: "Dr. Michael Torres",
  doctorPhone: "(555) 456-7890",
  specialty: "Orthopedic Surgery",
  medicalHistory: "Patient has chronic lower back pain for 6 months, progressively worsening",
  priorTreatments: "Physical therapy x 6 weeks, NSAIDs for 3 months, two steroid injections - all failed",
};

export default function IntakeWizard({ onBack, onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const steps = [
    {
      title: "Patient information",
      subtitle: "We'll address your appeal letter to you",
      valid: form.patientName.trim() && form.patientEmail.trim(),
      content: (
        <>
          <Field label="Full name" value={form.patientName} onChange={(v) => up("patientName", v)} required />
          <Field label="Email address" type="email" value={form.patientEmail} onChange={(v) => up("patientEmail", v)} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Phone number" value={form.patientPhone} onChange={(v) => up("patientPhone", v)} placeholder="(555) 123-4567" />
            <Field label="Mailing address" value={form.patientAddress} onChange={(v) => up("patientAddress", v)} placeholder="123 Main St, City, State" />
          </div>
        </>
      ),
    },
    {
      title: "Insurance details",
      subtitle: "Found on your insurance card and denial letter",
      valid: form.insurer && form.memberId.trim(),
      content: (
        <>
          <Field label="Insurance company" value={form.insurer} onChange={(v) => up("insurer", v)} type="select" options={INSURERS} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Member / Policy ID" value={form.memberId} onChange={(v) => up("memberId", v)} placeholder="From your insurance card" required />
            <Field label="Plan name" value={form.planName} onChange={(v) => up("planName", v)} placeholder="e.g. Aetna PPO Gold" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Claim number" value={form.claimNumber} onChange={(v) => up("claimNumber", v)} placeholder="From denial letter" />
            <Field label="Denial date" type="date" value={form.denialDate} onChange={(v) => up("denialDate", v)} />
          </div>
        </>
      ),
    },
    {
      title: "Claim details",
      subtitle: "Copy from your denial letter — the more detail, the stronger your appeal",
      valid: form.procedure.trim() && form.denialType && form.denialReason.trim(),
      content: (
        <>
          <Field label="Procedure / Treatment / Medication" value={form.procedure} onChange={(v) => up("procedure", v)} placeholder="e.g. MRI of lumbar spine" required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Denial type" value={form.denialType} onChange={(v) => up("denialType", v)} type="select" options={DENIAL_TYPES} required />
            <Field label="Claim amount ($)" value={form.claimAmount} onChange={(v) => up("claimAmount", v)} placeholder="e.g. 4500" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Diagnosis" value={form.diagnosis} onChange={(v) => up("diagnosis", v)} placeholder="e.g. Lumbar disc herniation" />
            <Field label="CPT / Procedure codes" value={form.cptCodes} onChange={(v) => up("cptCodes", v)} placeholder="e.g. 72148" />
          </div>
          <Field
            label="Denial reason — copy exact wording from denial letter"
            value={form.denialReason}
            onChange={(v) => up("denialReason", v)}
            type="textarea"
            placeholder="Paste the exact reason your insurer gave"
            required
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Doctor's full name" value={form.doctorName} onChange={(v) => up("doctorName", v)} placeholder="Dr. Jane Smith" />
            <Field label="Doctor's phone" value={form.doctorPhone} onChange={(v) => up("doctorPhone", v)} placeholder="(555) 456-7890" />
          </div>
          <Field label="Medical specialty" value={form.specialty} onChange={(v) => up("specialty", v)} placeholder="e.g. Orthopedic Surgery" />
          <Field label="Relevant medical history" value={form.medicalHistory} onChange={(v) => up("medicalHistory", v)} type="textarea" placeholder="Describe your condition and why this treatment is needed" />
          <Field label="Prior treatments tried and failed" value={form.priorTreatments} onChange={(v) => up("priorTreatments", v)} type="textarea" placeholder="e.g. Physical therapy x 6 weeks, NSAIDs, steroid injections — all failed" />
        </>
      ),
    },
  ];

  const cur = steps[step];

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const casePayload = {
        denial_type: form.denialType,
        insurer: form.insurer,
        procedure: form.procedure,
        denial_reason: form.denialReason,
        amount: form.claimAmount ? parseFloat(form.claimAmount) : null,
        policy_id: form.memberId,
        patient_name: form.patientName,
        doctor_name: form.doctorName,
        specialty: form.specialty,
        notes: {
          patientEmail: form.patientEmail,
          patientPhone: form.patientPhone,
          patientAddress: form.patientAddress,
          planName: form.planName,
          claimNumber: form.claimNumber,
          denialDate: form.denialDate,
          cptCodes: form.cptCodes,
          diagnosis: form.diagnosis,
          medicalHistory: form.medicalHistory,
          priorTreatments: form.priorTreatments,
          doctorPhone: form.doctorPhone,
        },
      };

      const newCase = await api.createCase(casePayload);
      await api.analyzeCase(newCase.id);
      const fresh = await api.getCase(newCase.id);
      onComplete(fresh);
    } catch (err) {
      setError(err.message || "Something went wrong. Make sure the server is running.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{ background: "none", color: "#6B7280", marginBottom: 24, fontSize: 14, padding: 0, border: "none", cursor: "pointer" }}
      >
        &larr; Back
      </button>

      {/* Progress header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, color: "#4B5563", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
          Step {step + 1} of {steps.length}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>{cur.title}</h2>
        <p style={{ color: "#6B7280", fontSize: 14 }}>{cur.subtitle}</p>
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 2,
                background: i <= step ? "#3B82F6" : "#1a2640",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      <Card style={{ marginBottom: 20 }}>{cur.content}</Card>

      {/* Inline loading state */}
      {loading && (
        <Card
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 20px",
            borderColor: "#3B82F630",
          }}
        >
          <Spinner size={20} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#EFF6FF" }}>Analyzing your denial...</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>
              Building legal strategy and calculating win probability
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {step > 0 && (
          <Btn variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={loading}>
            Back
          </Btn>
        )}
        {step < steps.length - 1 ? (
          <Btn onClick={() => setStep((s) => s + 1)} disabled={!cur.valid}>
            Continue &rarr;
          </Btn>
        ) : (
          <Btn onClick={handleSubmit} loading={loading} disabled={!cur.valid}>
            Analyze Denial &rarr;
          </Btn>
        )}
      </div>
    </div>
  );
}
