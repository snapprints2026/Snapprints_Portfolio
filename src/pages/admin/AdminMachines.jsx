import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin.api";
import DashboardLayout from "../../components/DashboardLayout";
import StatusBadge from "../../components/StatusBadge";
import Loader from "../../components/Loader";

const DAYS = [
  ["MON", "Mon"], ["TUE", "Tue"], ["WED", "Wed"], ["THU", "Thu"],
  ["FRI", "Fri"], ["SAT", "Sat"], ["SUN", "Sun"],
];

const EMPTY_FORM = {
  vendorId: "",
  module: "KIOSK",
  name: "",
  // where on the campus
  campusName: "",
  building: "",
  floor: "",
  spot: "",
  landmark: "",
  // postal address + map pin
  address: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  // on-site contact + timings
  contactName: "",
  contactPhone: "",
  openTime: "",
  closeTime: "",
  weeklyOff: ["SUN"],
  // machine details
  printerModel: "",
  installedAt: "",
};

// Fields copied from a vendor's existing machine when the vendor is picked
// (same campus → same address), only into fields that are still empty.
const PREFILL_FROM_SIBLING = [
  ["campusName", "campus_name"],
  ["address", "address"],
  ["city", "city"],
  ["state", "state"],
  ["pincode", "pincode"],
];

// Must match MACHINE_ID_PREFIX in adminController.js
const ID_PREFIX = { KIOSK: "SPK", SHOP: "SPS" };
const MODULE_LABEL = { KIOSK: "Kiosk (Raspberry Pi)", SHOP: "Shop computer" };

const vendorLabel = (v) => v.business_name || v.full_name;

const allowedModules = (v) =>
  String(v?.allowed_modules || "KIOSK")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// Accepts "19.0330, 73.0297" or a full Google Maps link.
function parseCoordinates(text) {
  const s = String(text || "");
  const pin = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/); // exact pin in long links
  if (pin) return { latitude: pin[1], longitude: pin[2] };
  const pair = s.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/); // "@lat,lng", "q=lat,lng" or plain
  if (pair) return { latitude: pair[1], longitude: pair[2] };
  return null;
}

function machineToForm(m) {
  return {
    ...EMPTY_FORM,
    vendorId: m.owner_vendor_id ? String(m.owner_vendor_id) : "",
    module: m.module || "KIOSK",
    name: m.name || "",
    campusName: m.campus_name || "",
    building: m.building || "",
    floor: m.floor || "",
    spot: m.spot || m.location_name || "",
    landmark: m.landmark || "",
    address: m.address || "",
    city: m.city || "",
    state: m.state || "",
    pincode: m.pincode || "",
    latitude: m.latitude ?? "",
    longitude: m.longitude ?? "",
    contactName: m.contact_name || "",
    contactPhone: m.contact_phone || "",
    openTime: m.open_time || "",
    closeTime: m.close_time || "",
    weeklyOff: m.weekly_off ? m.weekly_off.split(",") : [],
    printerModel: m.printer_model || "",
    installedAt: m.installed_at || "",
  };
}

function Field({ label, required, hint, className = "", children }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

export default function AdminMachines() {
  const [machines, setMachines] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formMode, setFormMode] = useState(null); // null | "create" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mapInput, setMapInput] = useState("");
  const [mapHint, setMapHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);

  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.getMachineInfo(), adminApi.getVendors()])
      .then(([m, v]) => {
        setMachines(m);
        setVendors(v);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const selectedVendor = vendors.find((v) => String(v.id) === String(form.vendorId));
  const moduleOptions = selectedVendor ? allowedModules(selectedVendor) : ["KIOSK", "SHOP"];

  const filteredMachines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter((m) =>
      [
        m.machine_id, m.name, m.location_label, m.location_name, m.landmark,
        m.city, m.pincode, m.vendor_name, m.contact_name, m.contact_phone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [machines, search]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const handleChange = (field) => (e) => set(field, e.target.value);

  const handleVendorChange = (e) => {
    const vendorId = e.target.value;
    const vendor = vendors.find((v) => String(v.id) === String(vendorId));
    const sibling = machines.find((m) => String(m.owner_vendor_id) === String(vendorId));

    setForm((f) => {
      const next = { ...f, vendorId };
      const allowed = vendor ? allowedModules(vendor) : ["KIOSK", "SHOP"];
      if (!allowed.includes(next.module)) next.module = allowed[0] || "KIOSK";
      if (sibling) {
        for (const [formKey, rowKey] of PREFILL_FROM_SIBLING) {
          if (!next[formKey] && sibling[rowKey]) next[formKey] = sibling[rowKey];
        }
      }
      return next;
    });
  };

  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      weeklyOff: f.weeklyOff.includes(day) ? f.weeklyOff.filter((d) => d !== day) : [...f.weeklyOff, day],
    }));

  const handleMapPaste = (e) => {
    const text = e.target.value;
    setMapInput(text);
    if (!text.trim()) return setMapHint("");
    const coords = parseCoordinates(text);
    if (coords) {
      setForm((f) => ({ ...f, ...coords }));
      setMapHint(`Pin set: ${coords.latitude}, ${coords.longitude}`);
    } else {
      setMapHint("Couldn't find coordinates. Open the link in a browser and copy the full URL, or paste \"lat, lng\".");
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMapInput("");
    setMapHint("");
    setError("");
    setFormMode("create");
  };

  const openEdit = (m) => {
    setForm(machineToForm(m));
    setEditingId(m.machine_id);
    setMapInput("");
    setMapHint("");
    setError("");
    setCredentials(null);
    setFormMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = { ...form, weeklyOff: form.weeklyOff.join(",") };

    try {
      if (formMode === "edit") {
        delete payload.vendorId; // vendor changes go through the Vendor column
        await adminApi.updateMachine(editingId, payload);
      } else {
        const res = await adminApi.createMachine(payload);
        setCredentials(res.credentials);
      }
      setForm(EMPTY_FORM);
      setFormMode(null);
      setEditingId(null);
      load();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          (formMode === "edit" ? "Failed to update machine" : "Failed to create machine")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (machineId, vendorId) => {
    try {
      if (vendorId) {
        await adminApi.assignMachine(machineId, vendorId);
      } else {
        await adminApi.unassignMachine(machineId);
      }
      load();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to update assignment");
      load(); // put the dropdown back to the saved value
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Machines</h1>
        <button className="btn-primary" onClick={() => (formMode ? closeForm() : openCreate())}>
          {formMode ? "Cancel" : "+ Create Machine"}
        </button>
      </div>

      {formMode && (
        <div className="card p-6 mb-6 max-w-3xl">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {formMode === "edit" ? `Edit ${editingId}` : "New machine"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Section title="Owner">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formMode === "create" ? (
                  <Field label="Vendor (college)" hint="Picking a vendor fills in the campus address from its other machines.">
                    <select className="input" value={form.vendorId} onChange={handleVendorChange}>
                      <option value="">No vendor yet</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {vendorLabel(v)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Vendor (college)" hint="Change the vendor from the Vendor column in the list.">
                    <input
                      className="input bg-gray-50"
                      disabled
                      value={selectedVendor ? vendorLabel(selectedVendor) : "Unassigned"}
                    />
                  </Field>
                )}
                {formMode === "create" ? (
                  <Field
                    label="Module"
                    required
                    hint={`Machine ID will be ${ID_PREFIX[form.module] || "SPK"}xxxx, e.g. ${ID_PREFIX[form.module] || "SPK"}1001.`}
                  >
                    <select className="input" value={form.module} onChange={handleChange("module")}>
                      {moduleOptions.map((m) => (
                        <option key={m} value={m}>
                          {MODULE_LABEL[m]}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <Field label="Module" hint="Fixed: it's part of the machine ID.">
                    <input className="input bg-gray-50" disabled value={MODULE_LABEL[form.module] || form.module} />
                  </Field>
                )}
                <Field label="Machine name" hint="Optional. Defaults to the machine ID." className="sm:col-span-2">
                  <input className="input" value={form.name} onChange={handleChange("name")} placeholder="Library kiosk 1" />
                </Field>
              </div>
            </Section>

            <Section title="Where is it on campus">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Campus">
                  <input className="input" value={form.campusName} onChange={handleChange("campusName")} placeholder="Main Campus" />
                </Field>
                <Field label="Building / Block">
                  <input className="input" value={form.building} onChange={handleChange("building")} placeholder="Block B" />
                </Field>
                <Field label="Floor">
                  <input className="input" value={form.floor} onChange={handleChange("floor")} placeholder="Ground floor" />
                </Field>
                <Field label="Spot / area" required>
                  <input required className="input" value={form.spot} onChange={handleChange("spot")} placeholder="Library entrance" />
                </Field>
                <Field label="Landmark" className="sm:col-span-2">
                  <input className="input" value={form.landmark} onChange={handleChange("landmark")} placeholder="Opposite seminar hall" />
                </Field>
              </div>
            </Section>

            <Section title="Address & map pin">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Address" className="sm:col-span-3">
                  <input className="input" value={form.address} onChange={handleChange("address")} />
                </Field>
                <Field label="City" required>
                  <input required className="input" value={form.city} onChange={handleChange("city")} />
                </Field>
                <Field label="State">
                  <input className="input" value={form.state} onChange={handleChange("state")} />
                </Field>
                <Field label="Pincode">
                  <input
                    className="input"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    title="6-digit pincode"
                    value={form.pincode}
                    onChange={handleChange("pincode")}
                  />
                </Field>
                <Field
                  label="Paste Google Maps link or coordinates"
                  hint={mapHint || "Fills latitude and longitude for you."}
                  className="sm:col-span-3"
                >
                  <input
                    className="input"
                    value={mapInput}
                    onChange={handleMapPaste}
                    placeholder="https://www.google.com/maps/... or 19.0330, 73.0297"
                  />
                </Field>
                <Field label="Latitude">
                  <input className="input" value={form.latitude} onChange={handleChange("latitude")} />
                </Field>
                <Field label="Longitude">
                  <input className="input" value={form.longitude} onChange={handleChange("longitude")} />
                </Field>
              </div>
            </Section>

            <Section title="On-site contact & timings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Contact person" hint="Who refills paper / restarts the machine.">
                  <input className="input" value={form.contactName} onChange={handleChange("contactName")} placeholder="Ramesh (Library staff)" />
                </Field>
                <Field label="Contact phone">
                  <input
                    className="input"
                    type="tel"
                    inputMode="tel"
                    value={form.contactPhone}
                    onChange={handleChange("contactPhone")}
                    placeholder="98XXXXXXXX"
                  />
                </Field>
                <Field label="Opens at">
                  <input className="input" type="time" value={form.openTime} onChange={handleChange("openTime")} />
                </Field>
                <Field label="Closes at">
                  <input className="input" type="time" value={form.closeTime} onChange={handleChange("closeTime")} />
                </Field>
                <Field label="Weekly off" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(([code, label]) => {
                      const on = form.weeklyOff.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => toggleDay(code)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            on ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Machine details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Printer model">
                  <input className="input" value={form.printerModel} onChange={handleChange("printerModel")} placeholder="HP LaserJet M126nw" />
                </Field>
                <Field label="Installation date">
                  <input className="input" type="date" value={form.installedAt} onChange={handleChange("installedAt")} />
                </Field>
              </div>
            </Section>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving
                  ? formMode === "edit" ? "Saving..." : "Creating..."
                  : formMode === "edit" ? "Save changes" : "Create machine"}
              </button>
              <button type="button" onClick={closeForm} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {credentials && (
        <div className="card p-5 mb-6 bg-amber-50 border-amber-200 max-w-xl">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            Machine created — save these credentials now, they won't be shown again:
          </p>
          <pre className="text-xs bg-white p-3 rounded-lg overflow-x-auto">
{`MACHINE_ID=${credentials.MACHINE_ID}
API_KEY=${credentials.API_KEY}
API_BASE=${credentials.API_BASE}`}
          </pre>
          <button className="text-xs text-amber-700 mt-2 underline" onClick={() => setCredentials(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 max-w-md">
        <input
          className="input"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by college, building, city, pincode, contact or machine ID"
        />
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Machine</th>
                <th className="table-th">Location</th>
                <th className="table-th">Status</th>
                <th className="table-th">Prints</th>
                <th className="table-th">Revenue</th>
                <th className="table-th">Vendor</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-td text-center text-gray-400 py-8">
                    {search ? "No machines match your search" : "No machines yet"}
                  </td>
                </tr>
              ) : (
                filteredMachines.map((m) => (
                  <tr key={m.machine_id}>
                    <td className="table-td">
                      <span className="font-medium">{m.name || m.machine_id}</span>
                      <span className="block text-xs text-gray-400">
                        {m.machine_id} · {m.module === "SHOP" ? "Shop" : "Kiosk"}
                      </span>
                    </td>
                    <td className="table-td text-gray-600 min-w-[220px]">
                      {m.location_label || "—"}
                      <span className="block text-xs text-gray-400">
                        {[m.city, m.pincode].filter(Boolean).join(" ")}
                        {m.contact_name && ` · ${m.contact_name}`}
                        {m.contact_phone && ` (${m.contact_phone})`}
                      </span>
                    </td>
                    <td className="table-td">
                      <StatusBadge status={m.is_online ? "ONLINE" : "OFFLINE"} />
                    </td>
                    <td className="table-td">{m.total_jobs || 0}</td>
                    <td className="table-td">₹{Number(m.revenue || 0).toLocaleString("en-IN")}</td>
                    <td className="table-td">
                      <select
                        className="input py-1 text-xs"
                        value={m.owner_vendor_id || ""}
                        onChange={(e) => handleAssign(m.machine_id, e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>{vendorLabel(v)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="table-td text-right whitespace-nowrap">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium mr-4"
                      >
                        Edit
                      </button>
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
      )}
    </DashboardLayout>
  );
}