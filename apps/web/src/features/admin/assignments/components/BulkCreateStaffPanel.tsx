import React, { useEffect, useMemo, useState } from 'react';
import { FileDown, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '../../../../shared/ui/button';
import { Input } from '../../../../shared/ui/input';
import { useBulkCreateStaff } from '../hooks';
import type { BulkCreateStaffResponse } from '../api';
import { downloadCredentialPdf } from '../credential-pdf';
import { generatePreviewEmails } from '../email-preview';

interface BulkCreateStaffPanelProps {
  concertId: string;
}

const MAX_QUANTITY = 100;

export function BulkCreateStaffPanel({ concertId }: BulkCreateStaffPanelProps) {
  const [baseEmail, setBaseEmail] = useState('');
  const [quantity, setQuantity] = useState('5');
  const [displayNamePrefix, setDisplayNamePrefix] = useState('Check-in Staff');
  const [pdfPassword, setPdfPassword] = useState('');
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkCreateStaffResponse | null>(null);
  const { mutate: bulkCreate, isPending } = useBulkCreateStaff();

  useEffect(() => {
    setBulkResult(null);
    setPdfPassword('');
    setCreatedAt(null);
  }, [concertId]);

  const parsedQuantity = Number(quantity);
  const previewEmails = useMemo(
    () => generatePreviewEmails(baseEmail, parsedQuantity),
    [baseEmail, parsedQuantity],
  );

  const canSubmit =
    concertId &&
    baseEmail.trim() &&
    displayNamePrefix.trim() &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= MAX_QUANTITY &&
    previewEmails.length === parsedQuantity;

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error('Please enter a valid base email, quantity, and display name prefix.');
      return;
    }

    setBulkResult(null);
    setPdfPassword('');
    setCreatedAt(null);
    bulkCreate(
      {
        concertId,
        payload: {
          baseEmail: baseEmail.trim(),
          quantity: parsedQuantity,
          displayNamePrefix: displayNamePrefix.trim(),
        },
      },
      {
        onSuccess: (result) => {
          setBulkResult(result);
          setCreatedAt(new Date());
          toast.success(`Created ${result.credentials.length} check-in staff accounts`);
        },
        onError: (err) => {
          toast.error(formatApiError(err));
        },
      },
    );
  };

  const handleDownloadPdf = () => {
    if (!bulkResult || !createdAt) {
      toast.error('No generated credentials are available for PDF export.');
      return;
    }
    if (!pdfPassword.trim()) {
      toast.error('Please enter a password to protect the PDF.');
      return;
    }

    try {
      downloadCredentialPdf({
        concertTitle: bulkResult.concertTitle,
        createdAt,
        pdfPassword,
        credentials: bulkResult.credentials,
      });
      toast.success('Protected PDF downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate protected PDF');
    }
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-[#4cd7f6]" />
          Bulk Create Check-in Staff
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Create temporary check-in staff accounts and assign them to the selected event.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_1fr_auto] gap-4 items-end">
        <Input
          label="Base email"
          value={baseEmail}
          onChange={(event) => setBaseEmail(event.target.value)}
          placeholder="abc@gmail.com"
          className="h-12 bg-slate-900/50 border-white/10 text-white"
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          max={MAX_QUANTITY}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="h-12 bg-slate-900/50 border-white/10 text-white"
        />
        <Input
          label="Display name prefix"
          value={displayNamePrefix}
          onChange={(event) => setDisplayNamePrefix(event.target.value)}
          placeholder="Check-in Staff"
          className="h-12 bg-slate-900/50 border-white/10 text-white"
        />
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          loading={isPending}
          className="h-12 px-5"
        >
          Create
        </Button>
      </div>

      {previewEmails.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-slate-900/40 p-4">
          <div className="mb-3 text-sm font-medium text-slate-300">Email preview</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {previewEmails.slice(0, 9).map((email) => (
              <div key={email} className="rounded-md bg-slate-950/50 px-3 py-2 font-mono text-xs text-slate-300">
                {email}
              </div>
            ))}
          </div>
          {previewEmails.length > 9 && (
            <div className="mt-2 text-xs text-slate-500">+{previewEmails.length - 9} more accounts</div>
          )}
        </div>
      )}

      {bulkResult && (
        <div className="space-y-4 rounded-lg border border-[#4cd7f6]/20 bg-[#4cd7f6]/5 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#4cd7f6]">
                <ShieldCheck className="h-4 w-4" />
                One-time credentials ready
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Download the protected PDF now. Passwords will not be available after refresh.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                label="PDF open password"
                type="password"
                value={pdfPassword}
                onChange={(event) => setPdfPassword(event.target.value)}
                placeholder="Enter PDF password"
                className="h-10 min-w-[240px] bg-slate-950/60 border-white/10 text-white"
              />
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={!pdfPassword.trim()}
                className="h-10"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950/40">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">No.</th>
                  <th className="px-3 py-2 font-medium">Display name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Account password</th>
                </tr>
              </thead>
              <tbody>
                {bulkResult.credentials.map((credential, index) => (
                  <tr key={credential.userId} className="border-b border-white/5 last:border-b-0">
                    <td className="px-3 py-2 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2 text-white">{credential.displayName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-300">{credential.email}</td>
                    <td className="px-3 py-2 font-mono text-xs text-amber-200">{credential.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function formatApiError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Could not create check-in staff accounts';
  }

  try {
    const parsed = JSON.parse(err.message) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    // Use the raw Error message below.
  }

  return err.message || 'Could not create check-in staff accounts';
}
