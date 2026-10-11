import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";

const TYPE_LABEL = {
  COLLEGE: "College",
  UNIVERSITY: "University",
  SCHOOL: "School",
  COACHING: "Coaching institute",
  SHOP: "Shop / business",
  OTHER: "Other",
};

// Where on campus — the vendor name is already the page title.
function placeLabel(m) {
  const where = [m.building, m.floor].filter(Boolean).join(", ");
  const parts = [m.campus_name, where, m.spot].filter(Boolean);
  return parts.length ? parts.join(" · ") : m.location_name || null;
}

function InfoItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-700 break-words">{children || "—"}</dd>
    </div>
  );
}

export default function AdminVendorDetail() {
  const { vendorId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getVendorDetail(vendorId).then(setData).finally(() => setLoading(false));
  }, [vendorId]);

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>;
  if (!data) return <DashboardLayout><p className="text-sm text-gray-400">Vendor not found</p></DashboardLayout>;

  const { vendor, machines, bank } = data;
  const totalRevenue = machines.reduce((s, m) => s + Number(m.revenue || 0), 0);
  const title = vendor.business_name || vendor.full_name;
  const modules = String(vendor.allowed_modules || "KIOSK").split(",").join(", ");

  return (
    <DashboardLayout>
      <Link to="/admin/vendors" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to vendors
      </Link>

      <div className="flex items-start justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          <p className="text-sm text-gray-500">
            {TYPE_LABEL[vendor.institution_type] || "—"} · Modules: {modules}
          </p>
        </div>
        <StatusBadge status={vendor.status} />
      </div>

      <div className="card p-5 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoItem label="Contact person">
            {vendor.full_name}
            {vendor.contact_designation && <span className="block text-xs text-gray-400">{vendor.contact_designation}</span>}
          </InfoItem>
          <InfoItem label="Phone">
            {vendor.phone || vendor.alt_phone ? (
              <>
                {vendor.phone && (
                  <a href={`tel:${vendor.phone}`} className="block text-brand-600 hover:text-brand-700">{vendor.phone}</a>
                )}
                {vendor.alt_phone && (
                  <a href={`tel:${vendor.alt_phone}`} className="block text-xs text-brand-600 hover:text-brand-700">
                    Alt: {vendor.alt_phone}
                  </a>
                )}
              </>
            ) : null}
          </InfoItem>
          <InfoItem label="Login email">{vendor.email}</InfoItem>
          <InfoItem label="Billing address">{vendor.billing_address}</InfoItem>
          <InfoItem label="GST">{vendor.gst_number}</InfoItem>
          <InfoItem label="PAN">{vendor.pan_number}</InfoItem>
        </dl>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Machines owned</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{machines.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Lifetime revenue</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">₹{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Bank account</p>
          <p className="mt-2 text-sm font-medium">
            {bank ? (
              <>
                {bank.bank_name} · {bank.account_number}
                {bank.verified ? (
                  <span className="ml-2 text-xs text-green-600">Verified</span>
                ) : (
                  <span className="ml-2 text-xs text-amber-600">Unverified</span>
                )}
              </>
            ) : (
              <span className="text-gray-400">Not added yet</span>
            )}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Machines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="table-th">Machine</th>
              <th className="table-th">Location on campus</th>
              <th className="table-th">Status</th>
              <th className="table-th">Prints</th>
              <th className="table-th">Revenue</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {machines.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-td text-center text-gray-400 py-8">
                  No machines assigned yet
                </td>
              </tr>
            ) : (
              machines.map((m) => (
                <tr key={m.machine_id}>
                  <td className="table-td">
                    <span className="font-medium">{m.name || m.machine_id}</span>
                    <span className="block text-xs text-gray-400">
                      {m.machine_id} · {m.module === "SHOP" ? "Shop" : "Kiosk"}
                    </span>
                  </td>
                  <td className="table-td text-gray-600 min-w-[200px]">
                    {placeLabel(m) || "—"}
                    {(m.contact_name || m.contact_phone) && (
                      <span className="block text-xs text-gray-400">
                        {[m.contact_name, m.contact_phone].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="table-td"><StatusBadge status={m.status} /></td>
                  <td className="table-td">{m.total_prints}</td>
                  <td className="table-td">₹{Number(m.revenue || 0).toLocaleString("en-IN")}</td>
                  <td className="table-td text-right">
                    <Link
                      to={`/admin/machines/${m.machine_id}`}
                      className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </DashboardLayout>
  );
}