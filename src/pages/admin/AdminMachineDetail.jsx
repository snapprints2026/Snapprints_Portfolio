import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";

const FLAG_INFO = {
  PAID_NOT_VERIFIED: {
    label: "Paid, OTP never entered",
    className: "bg-orange-100 text-orange-700 border border-orange-200",
    hint: "Payment succeeded but the OTP window expired before it was used. Likely a refund candidate.",
  },
  STUCK_PRINTING: {
    label: "Stuck in printing",
    className: "bg-red-100 text-red-700 border border-red-200",
    hint: "OTP was verified and the job was sent to the machine, but there's been no print/fail confirmation in 15+ minutes. Check the machine.",
  },
  FAILED: {
    label: "Marked failed",
    className: "bg-red-100 text-red-700 border border-red-200",
    hint: "Job was explicitly marked failed. A refund was attempted automatically if a payment had been captured.",
  },
};

const PAYMENT_METHOD_LABELS = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net Banking",
  wallet: "Wallet",
  emi: "EMI",
};

const DAY_LABELS = { MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun" };

function paymentLabel(job) {
  if (!job.payment_method) return "—";
  const base = PAYMENT_METHOD_LABELS[job.payment_method] || job.payment_method;
  if (job.payment_method === "upi" && job.payment_details?.vpa) return `${base} (${job.payment_details.vpa})`;
  if (job.payment_method === "card" && job.payment_details?.last4) {
    return `${base} •••• ${job.payment_details.last4}`;
  }
  return base;
}

function timingsLabel(machine) {
  const hours =
    machine.open_time && machine.close_time ? `${machine.open_time}–${machine.close_time}` : null;
  const off = machine.weekly_off
    ? `closed ${machine.weekly_off.split(",").map((d) => DAY_LABELS[d] || d).join(", ")}`
    : null;
  return [hours, off].filter(Boolean).join(", ") || null;
}

function InfoItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-700">{children || "—"}</dd>
    </div>
  );
}

const REFUND_ELIGIBLE_STATUSES = new Set(["PAID", "PRINTING", "EXPIRED"]);

export default function AdminMachineDetail() {
  const { machineId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);
  const [refundError, setRefundError] = useState("");

  const load = () => {
    setLoading(true);
    adminApi.getMachineJobs(machineId).then(setData).finally(() => setLoading(false));
  };

  useEffect(load, [machineId]);

  const handleRefund = async (job) => {
    if (!window.confirm(`Refund ₹${job.amount} for job ${job.job_id}? This cannot be undone.`)) return;
    setRefundError("");
    setRefundingId(job.job_id);
    try {
      await adminApi.refundJob(job.job_id);
      load();
    } catch (err) {
      setRefundError(err?.response?.data?.error || "Refund failed");
    } finally {
      setRefundingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Loader />
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <p className="text-sm text-gray-400">Machine not found</p>
      </DashboardLayout>
    );
  }

  const { machine, jobs } = data;
  const flaggedJobs = jobs.filter((j) => j.flag);
  const uniqueCustomers = new Set(jobs.filter((j) => j.customer_id).map((j) => j.customer_id)).size;
  const hasPin = machine.latitude != null && machine.longitude != null;
  const postal = [machine.address, machine.city, machine.state, machine.pincode].filter(Boolean).join(", ");

  return (
    <DashboardLayout>
      <Link to="/admin/machines" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to machines
      </Link>

      <div className="mt-2 mb-4">
        <h1 className="text-xl font-semibold text-gray-800">{machine.name || machine.machine_id}</h1>
        <p className="text-sm text-gray-500">
          {machine.machine_id} · {machine.module === "SHOP" ? "Shop computer" : "Kiosk"} · {uniqueCustomers} unique customer
          {uniqueCustomers !== 1 ? "s" : ""} · {jobs.length} total jobs
        </p>
      </div>

      <div className="card p-5 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="Location">
            {machine.location_label}
            {machine.landmark && <span className="block text-xs text-gray-400">Near {machine.landmark}</span>}
          </InfoItem>
          <InfoItem label="Address">
            {postal || null}
            {hasPin && (
              <a
                href={`https://www.google.com/maps?q=${machine.latitude},${machine.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-brand-600 hover:text-brand-700"
              >
                Open in Google Maps →
              </a>
            )}
          </InfoItem>
          <InfoItem label="On-site contact">
            {machine.contact_name || machine.contact_phone ? (
              <>
                {machine.contact_name}
                {machine.contact_phone && (
                  <a href={`tel:${machine.contact_phone}`} className="block text-xs text-brand-600 hover:text-brand-700">
                    {machine.contact_phone}
                  </a>
                )}
              </>
            ) : null}
          </InfoItem>
          <InfoItem label="Timings">{timingsLabel(machine)}</InfoItem>
          <InfoItem label="Vendor">
            {machine.owner_vendor_id ? (
              <Link to={`/admin/vendors/${machine.owner_vendor_id}`} className="text-brand-600 hover:text-brand-700">
                {machine.vendor_name}
              </Link>
            ) : (
              "Unassigned"
            )}
          </InfoItem>
          <InfoItem label="Printer / installed">
            {[machine.printer_model, machine.installed_at && `since ${machine.installed_at}`].filter(Boolean).join(", ") || null}
          </InfoItem>
        </dl>
      </div>

      {refundError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {refundError}
        </div>
      )}

      {flaggedJobs.length > 0 && (
        <div className="card p-5 mb-6 border-red-200 bg-red-50/40">
          <h2 className="text-sm font-semibold text-red-800 mb-3">
            {flaggedJobs.length} job{flaggedJobs.length > 1 ? "s" : ""} need review
          </h2>
          <ul className="space-y-2">
            {flaggedJobs.map((j) => (
              <li key={j.job_id} className="text-sm text-gray-700 flex items-start gap-2">
                <span
                  className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${FLAG_INFO[j.flag].className}`}
                >
                  {FLAG_INFO[j.flag].label}
                </span>
                <span className="text-gray-500">
                  {j.job_id} by {j.customer_name || "Unknown customer"} — {FLAG_INFO[j.flag].hint}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Customers who used this machine</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Job</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Amount</th>
                <th className="table-th">Paid via</th>
                <th className="table-th">Status</th>
                <th className="table-th">Flag</th>
                <th className="table-th">Created</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-8">
                    No print jobs on this machine yet
                  </td>
                </tr>
              ) : (
                jobs.map((j) => {
                  const canRefund = j.flag && j.payment_id && REFUND_ELIGIBLE_STATUSES.has(j.status);
                  return (
                    <tr key={j.job_id}>
                      <td className="table-td font-medium">{j.job_id}</td>
                      <td className="table-td text-gray-500">
                        {j.customer_id ? (
                          <Link to={`/admin/customers/${j.customer_id}`} className="text-brand-600 hover:text-brand-700">
                            {j.customer_name || "Unnamed"}
                          </Link>
                        ) : (
                          "—"
                        )}
                        {j.customer_phone && <span className="block text-xs text-gray-400">{j.customer_phone}</span>}
                      </td>
                      <td className="table-td">₹{Number(j.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="table-td text-gray-500">{paymentLabel(j)}</td>
                      <td className="table-td">
                        <StatusBadge status={j.status} />
                      </td>
                      <td className="table-td">
                        {j.flag ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${FLAG_INFO[j.flag].className}`}
                          >
                            {FLAG_INFO[j.flag].label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="table-td text-gray-500 whitespace-nowrap">
                        {new Date(j.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="table-td text-right">
                        {canRefund && (
                          <button
                            onClick={() => handleRefund(j)}
                            disabled={refundingId === j.job_id}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {refundingId === j.job_id ? "Refunding..." : "Refund"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}