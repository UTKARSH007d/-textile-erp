"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const getEmptyForm = () => ({
  inspection_no: "",
  inspection_date: getToday(),
  production_order_id: "",
  product_id: "",
  fabric_id: "",
  inspected_quantity: "",
  passed_quantity: "",
  rejected_quantity: "",
  result: "Pending",
  defect_type: "",
  remarks: "",
  inspector_name: "",
});

export default function QualityPage() {
  const [inspections, setInspections] = useState([]);

  const [productionOrders, setProductionOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [fabrics, setFabrics] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingInspection, setEditingInspection] =
    useState(null);

  const [formData, setFormData] =
    useState(getEmptyForm());

  // =========================
  // FETCH INSPECTIONS
  // =========================

  const fetchInspections = async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        `${API_URL}/api/quality/`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch quality inspections"
        );
      }

      const data = await response.json();

      setInspections(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Error fetching inspections:",
        error
      );

      alert(
        "Failed to load quality inspections. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH DROPDOWN DATA
  // =========================

  const fetchDropdownData = async () => {
    try {
      const [
        productionResponse,
        productResponse,
        fabricResponse,
      ] = await Promise.all([
        apiFetch(`${API_URL}/api/production/`),
        apiFetch(`${API_URL}/api/products/`),
        apiFetch(`${API_URL}/api/fabrics/`),
      ]);

      if (productionResponse.ok) {
        const productionData =
          await productionResponse.json();

        setProductionOrders(
          Array.isArray(productionData)
            ? productionData
            : []
        );
      } else {
        setProductionOrders([]);
      }

      if (productResponse.ok) {
        const productData =
          await productResponse.json();

        setProducts(
          Array.isArray(productData)
            ? productData
            : []
        );
      } else {
        setProducts([]);
      }

      if (fabricResponse.ok) {
        const fabricData =
          await fabricResponse.json();

        setFabrics(
          Array.isArray(fabricData)
            ? fabricData
            : []
        );
      } else {
        setFabrics([]);
      }
    } catch (error) {
      console.error(
        "Error loading dropdown data:",
        error
      );
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    fetchInspections();
    fetchDropdownData();
  }, []);

  // =========================
  // REFRESH ALL
  // =========================

  const handleRefresh = async () => {
    await Promise.all([
      fetchInspections(),
      fetchDropdownData(),
    ]);
  };

  // =========================
  // HANDLE FORM CHANGE
  // =========================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================
  // CLOSE MODAL
  // =========================

  const closeModal = () => {
    setShowModal(false);
    setEditingInspection(null);
    setFormData(getEmptyForm());
  };

  // =========================
  // GENERATE INSPECTION NUMBER
  // =========================

  const generateInspectionNumber = () => {
    const highestNumber = inspections.reduce(
      (highest, inspection) => {
        const match =
          inspection.inspection_no?.match(
            /(\d+)$/
          );

        if (!match) {
          return highest;
        }

        return Math.max(
          highest,
          Number(match[1])
        );
      },
      0
    );

    return `QI-${String(
      highestNumber + 1
    ).padStart(3, "0")}`;
  };

  // =========================
  // NEW INSPECTION
  // =========================

  const handleNewInspection = () => {
    setEditingInspection(null);

    setFormData({
      ...getEmptyForm(),
      inspection_no:
        generateInspectionNumber(),
    });

    setShowModal(true);
  };

  // =========================
  // EDIT INSPECTION
  // =========================

  const handleEdit = (inspection) => {
    setEditingInspection(inspection);

    setFormData({
      inspection_no:
        inspection.inspection_no || "",

      inspection_date:
        inspection.inspection_date || getToday(),

      production_order_id:
        inspection.production_order_id?.toString() ||
        "",

      product_id:
        inspection.product_id?.toString() || "",

      fabric_id:
        inspection.fabric_id?.toString() || "",

      inspected_quantity:
        inspection.inspected_quantity?.toString() ||
        "",

      passed_quantity:
        inspection.passed_quantity?.toString() ||
        "0",

      rejected_quantity:
        inspection.rejected_quantity?.toString() ||
        "0",

      result:
        inspection.result || "Pending",

      defect_type:
        inspection.defect_type || "",

      remarks:
        inspection.remarks || "",

      inspector_name:
        inspection.inspector_name || "",
    });

    setShowModal(true);
  };

  // =========================
  // BUILD JSON REQUEST BODY
  // =========================

  // The FastAPI quality router expects a JSON body.
  // Do not send these values as URL query parameters.
  const buildRequestBody = () => {
    return {
      inspection_no: formData.inspection_no.trim(),
      inspection_date: formData.inspection_date,

      inspected_quantity: Number(
        formData.inspected_quantity
      ),

      passed_quantity: Number(
        formData.passed_quantity || 0
      ),

      rejected_quantity: Number(
        formData.rejected_quantity || 0
      ),

      result: formData.result,

      production_order_id:
        formData.production_order_id
          ? Number(formData.production_order_id)
          : null,

      product_id:
        formData.product_id
          ? Number(formData.product_id)
          : null,

      fabric_id:
        formData.fabric_id
          ? Number(formData.fabric_id)
          : null,

      defect_type:
        formData.defect_type.trim() || null,

      remarks:
        formData.remarks.trim() || null,

      inspector_name:
        formData.inspector_name.trim() || null,
    };
  };

  // =========================
  // VALIDATE FORM
  // =========================

  const validateForm = () => {
    if (!formData.inspection_no.trim()) {
      return "Inspection number is required.";
    }

    if (!formData.inspection_date) {
      return "Inspection date is required.";
    }

    if (
      formData.inspected_quantity === "" ||
      Number(formData.inspected_quantity) <= 0
    ) {
      return (
        "Inspected quantity must be greater than zero."
      );
    }

    const inspectedQuantity = Number(
      formData.inspected_quantity
    );

    const passedQuantity = Number(
      formData.passed_quantity || 0
    );

    const rejectedQuantity = Number(
      formData.rejected_quantity || 0
    );

    if (passedQuantity < 0) {
      return (
        "Passed quantity cannot be negative."
      );
    }

    if (rejectedQuantity < 0) {
      return (
        "Rejected quantity cannot be negative."
      );
    }

    if (
      passedQuantity + rejectedQuantity >
      inspectedQuantity
    ) {
      return (
        "Passed quantity + rejected quantity cannot be greater than inspected quantity."
      );
    }

    return "";
  };

  // =========================
  // READ API ERROR SAFELY
  // =========================

  const getErrorMessage = async (response) => {
    try {
      const data = await response.json();

      if (Array.isArray(data.detail)) {
        return data.detail
          .map((item) => {
            if (typeof item === "string") {
              return item;
            }

            return (
              item.msg ||
              JSON.stringify(item)
            );
          })
          .join("\n");
      }

      if (typeof data.detail === "string") {
        return data.detail;
      }

      if (typeof data.message === "string") {
        return data.message;
      }

      return "Failed to save quality inspection.";
    } catch {
      return (
        "Failed to save quality inspection. Please check the backend."
      );
    }
  };

  // =========================
  // SUBMIT FORM
  // =========================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      alert(validationError);
      return;
    }

    const requestBody = buildRequestBody();

    try {
      setSaving(true);

      const endpoint = editingInspection
        ? `${API_URL}/api/quality/${editingInspection.id}`
        : `${API_URL}/api/quality/`;

      const response = await apiFetch(endpoint, {
        method: editingInspection
          ? "PUT"
          : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorMessage =
          await getErrorMessage(response);

        alert(errorMessage);
        return;
      }

      closeModal();

      await fetchInspections();

      alert(
        editingInspection
          ? "Inspection updated successfully."
          : "Inspection created successfully."
      );
    } catch (error) {
      console.error(
        "Error saving inspection:",
        error
      );

      alert(
        "Failed to save inspection. Please make sure the FastAPI backend is running."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE INSPECTION
  // =========================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this inspection?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/api/quality/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorMessage =
          await getErrorMessage(response);

        alert(errorMessage);
        return;
      }

      await fetchInspections();

      alert(
        "Inspection deleted successfully."
      );
    } catch (error) {
      console.error(
        "Error deleting inspection:",
        error
      );

      alert(
        "Failed to delete inspection."
      );
    }
  };

  // =========================
  // FILTER INSPECTIONS
  // =========================

  const filteredInspections =
    inspections.filter((inspection) => {
      const searchText =
        search.toLowerCase().trim();

      if (!searchText) {
        return true;
      }

      return (
        inspection.inspection_no
          ?.toLowerCase()
          .includes(searchText) ||
        inspection.result
          ?.toLowerCase()
          .includes(searchText) ||
        inspection.inspector_name
          ?.toLowerCase()
          .includes(searchText) ||
        inspection.defect_type
          ?.toLowerCase()
          .includes(searchText)
      );
    });

  // =========================
  // STATISTICS
  // =========================

  const totalInspections =
    inspections.length;

  const pendingInspections =
    inspections.filter(
      (inspection) =>
        inspection.result?.toLowerCase() ===
        "pending"
    ).length;

  const passedInspections =
    inspections.filter(
      (inspection) => {
        const result =
          inspection.result?.toLowerCase();

        return (
          result === "passed" ||
          result === "partially passed"
        );
      }
    ).length;

  const rejectedInspections =
    inspections.filter(
      (inspection) =>
        inspection.result?.toLowerCase() ===
        "rejected"
    ).length;

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-8 text-[#172033]">
      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}

      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#182238] text-white">
            <ClipboardCheck size={36} />
          </div>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#172033]">
              Quality Control
            </h1>

            <p className="mt-2 text-lg text-[#334155]">
              Manage and track quality inspections
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-2xl border border-[#cbd5e1] bg-white px-6 py-4 text-lg font-medium text-[#172033] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={21}
              className={
                loading ? "animate-spin" : ""
              }
            />

            Refresh
          </button>

          <button
            onClick={handleNewInspection}
            className="flex items-center gap-2 rounded-2xl bg-[#182238] px-6 py-4 text-lg font-medium text-white hover:bg-[#26334d]"
          >
            <Plus size={22} />

            New Inspection
          </button>
        </div>
      </div>

      {/* ========================= */}
      {/* STAT CARDS */}
      {/* ========================= */}

      <div className="mb-9 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Inspections"
          value={totalInspections}
          icon={
            <ClipboardCheck
              size={30}
              className="text-blue-600"
            />
          }
        />

        <StatCard
          title="Pending"
          value={pendingInspections}
          icon={
            <Clock3
              size={30}
              className="text-orange-600"
            />
          }
        />

        <StatCard
          title="Passed"
          value={passedInspections}
          icon={
            <CheckCircle2
              size={30}
              className="text-green-600"
            />
          }
        />

        <StatCard
          title="Rejected"
          value={rejectedInspections}
          icon={
            <XCircle
              size={30}
              className="text-red-600"
            />
          }
        />
      </div>

      {/* ========================= */}
      {/* INSPECTIONS TABLE */}
      {/* ========================= */}

      <div className="overflow-hidden rounded-3xl border border-[#d7deea] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-5 border-b border-[#d7deea] p-7 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#172033]">
              Quality Inspections
            </h2>

            <p className="mt-2 text-lg text-[#334155]">
              Track and manage product quality inspections
            </p>
          </div>

          <div className="relative w-full md:w-[460px]">
            <Search
              size={23}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#475569]"
            />

            <input
              type="text"
              placeholder="Search inspection, result or inspector..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-2xl border border-[#cbd5e1] bg-white py-4 pl-14 pr-5 text-lg text-[#172033] outline-none placeholder:text-[#64748b] focus:border-[#182238]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[#d7deea] bg-[#f8fafc]">
              <tr>
                <TableHeader>
                  INSPECTION
                </TableHeader>

                <TableHeader>
                  DATE
                </TableHeader>

                <TableHeader>
                  QUANTITY
                </TableHeader>

                <TableHeader>
                  PASSED
                </TableHeader>

                <TableHeader>
                  REJECTED
                </TableHeader>

                <TableHeader>
                  RESULT
                </TableHeader>

                <TableHeader>
                  INSPECTOR
                </TableHeader>

                <TableHeader>
                  ACTIONS
                </TableHeader>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-12 text-center text-lg text-[#172033]"
                  >
                    Loading inspections...
                  </td>
                </tr>
              ) : filteredInspections.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-12 text-center text-lg text-[#475569]"
                  >
                    No inspections found
                  </td>
                </tr>
              ) : (
                filteredInspections.map(
                  (inspection) => (
                    <tr
                      key={inspection.id}
                      className="border-b border-[#e2e8f0] hover:bg-[#fafcff]"
                    >
                      <TableCell className="font-semibold">
                        {
                          inspection.inspection_no
                        }
                      </TableCell>

                      <TableCell>
                        {
                          inspection.inspection_date
                        }
                      </TableCell>

                      <TableCell>
                        {
                          inspection.inspected_quantity
                        }
                      </TableCell>

                      <TableCell className="font-medium text-green-700">
                        {
                          inspection.passed_quantity
                        }
                      </TableCell>

                      <TableCell className="font-medium text-red-600">
                        {
                          inspection.rejected_quantity
                        }
                      </TableCell>

                      <TableCell>
                        <ResultBadge
                          result={
                            inspection.result
                          }
                        />
                      </TableCell>

                      <TableCell>
                        {inspection.inspector_name ||
                          "-"}
                      </TableCell>

                      <TableCell>
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              handleEdit(
                                inspection
                              )
                            }
                            className="rounded-xl border border-[#cbd5e1] p-3 text-[#172033] hover:bg-[#f1f5f9]"
                            title="Edit inspection"
                          >
                            <Pencil size={19} />
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                inspection.id
                              )
                            }
                            className="rounded-xl border border-red-200 p-3 text-red-600 hover:bg-red-50"
                            title="Delete inspection"
                          >
                            <Trash2 size={19} />
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 text-lg text-[#334155]">
          Showing{" "}
          {filteredInspections.length} of{" "}
          {inspections.length} inspections
        </div>
      </div>

      {/* ========================= */}
      {/* MODAL */}
      {/* ========================= */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e2e8f0] bg-white p-6">
              <div>
                <h2 className="text-2xl font-bold text-[#172033]">
                  {editingInspection
                    ? "Edit Quality Inspection"
                    : "New Quality Inspection"}
                </h2>

                <p className="mt-1 text-[#475569]">
                  Enter quality inspection details
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-[#172033] hover:bg-[#f1f5f9] disabled:opacity-50"
              >
                <X size={25} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="p-7"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* INSPECTION NUMBER */}

                <FormField label="Inspection Number *">
                  <input
                    type="text"
                    name="inspection_no"
                    value={
                      formData.inspection_no
                    }
                    onChange={handleChange}
                    placeholder="Example: QI-002"
                    required
                    className={inputClass}
                  />
                </FormField>

                {/* DATE */}

                <FormField label="Inspection Date *">
                  <input
                    type="date"
                    name="inspection_date"
                    value={
                      formData.inspection_date
                    }
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </FormField>

                {/* PRODUCTION ORDER */}

                <FormField label="Production Order">
                  <select
                    name="production_order_id"
                    value={
                      formData.production_order_id
                    }
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">
                      Select Production Order
                    </option>

                    {productionOrders.map(
                      (order) => (
                        <option
                          key={order.id}
                          value={order.id}
                        >
                          {
                            order.production_order_no
                          }
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                {/* PRODUCT */}

                <FormField label="Product">
                  <select
                    name="product_id"
                    value={
                      formData.product_id
                    }
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">
                      Select Product
                    </option>

                    {products.map(
                      (product) => (
                        <option
                          key={product.id}
                          value={product.id}
                        >
                          {product.product_code
                            ? `${product.product_code} - `
                            : ""}
                          {product.name}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                {/* FABRIC */}

                <FormField label="Fabric">
                  <select
                    name="fabric_id"
                    value={
                      formData.fabric_id
                    }
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">
                      Select Fabric
                    </option>

                    {fabrics.map(
                      (fabric) => (
                        <option
                          key={fabric.id}
                          value={fabric.id}
                        >
                          {fabric.fabric_code
                            ? `${fabric.fabric_code} - `
                            : ""}
                          {fabric.name}
                        </option>
                      )
                    )}
                  </select>
                </FormField>

                {/* RESULT */}

                <FormField label="Result">
                  <select
                    name="result"
                    value={formData.result}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="Pending">
                      Pending
                    </option>

                    <option value="Passed">
                      Passed
                    </option>

                    <option value="Failed">
                      Failed
                    </option>

                    <option value="Partially Passed">
                      Partially Passed
                    </option>
                  </select>
                </FormField>

                {/* INSPECTED QUANTITY */}

                <FormField label="Inspected Quantity *">
                  <input
                    type="number"
                    name="inspected_quantity"
                    value={
                      formData.inspected_quantity
                    }
                    onChange={handleChange}
                    placeholder="Enter quantity"
                    required
                    min="0"
                    step="any"
                    className={inputClass}
                  />
                </FormField>

                {/* PASSED QUANTITY */}

                <FormField label="Passed Quantity">
                  <input
                    type="number"
                    name="passed_quantity"
                    value={
                      formData.passed_quantity
                    }
                    onChange={handleChange}
                    placeholder="Enter passed quantity"
                    min="0"
                    step="any"
                    className={inputClass}
                  />
                </FormField>

                {/* REJECTED QUANTITY */}

                <FormField label="Rejected Quantity">
                  <input
                    type="number"
                    name="rejected_quantity"
                    value={
                      formData.rejected_quantity
                    }
                    onChange={handleChange}
                    placeholder="Enter rejected quantity"
                    min="0"
                    step="any"
                    className={inputClass}
                  />
                </FormField>

                {/* DEFECT TYPE */}

                <FormField label="Defect Type">
                  <input
                    type="text"
                    name="defect_type"
                    value={
                      formData.defect_type
                    }
                    onChange={handleChange}
                    placeholder="Example: Color variation"
                    className={inputClass}
                  />
                </FormField>

                {/* INSPECTOR */}

                <FormField label="Inspector Name">
                  <input
                    type="text"
                    name="inspector_name"
                    value={
                      formData.inspector_name
                    }
                    onChange={handleChange}
                    placeholder="Enter inspector name"
                    className={inputClass}
                  />
                </FormField>
              </div>

              {/* REMARKS */}

              <div className="mt-6">
                <label className="mb-2 block text-base font-medium text-[#172033]">
                  Remarks
                </label>

                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Enter inspection remarks..."
                  className="w-full resize-none rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-base text-[#172033] outline-none placeholder:text-[#64748b] focus:border-[#182238]"
                />
              </div>

              {/* BUTTONS */}

              <div className="mt-8 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#cbd5e1] px-6 py-3 font-medium text-[#172033] hover:bg-[#f1f5f9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#182238] px-7 py-3 font-medium text-white hover:bg-[#26334d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingInspection
                    ? "Update Inspection"
                    : "Create Inspection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// REUSABLE COMPONENTS
// =========================

const inputClass =
  "w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-base text-[#172033] outline-none placeholder:text-[#64748b] focus:border-[#182238]";

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-[#d7deea] bg-white p-7 shadow-sm">
      <div>
        <p className="text-lg text-[#172033]">
          {title}
        </p>

        <p className="mt-3 text-4xl font-bold text-[#172033]">
          {value}
        </p>
      </div>

      <div className="rounded-2xl bg-[#f1f5f9] p-5">
        {icon}
      </div>
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <th className="px-7 py-5 text-left text-sm font-bold tracking-wide text-[#172033]">
      {children}
    </th>
  );
}

function TableCell({
  children,
  className = "",
}) {
  return (
    <td
      className={`px-7 py-5 text-base text-[#172033] ${className}`}
    >
      {children}
    </td>
  );
}

function FormField({
  label,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-base font-medium text-[#172033]">
        {label}
      </label>

      {children}
    </div>
  );
}

function ResultBadge({ result }) {
  const normalized =
    result?.toLowerCase() || "";

  let classes =
    "border-[#fed7aa] bg-orange-50 text-orange-700";

  if (
    normalized === "passed"
  ) {
    classes =
      "border-green-200 bg-green-50 text-green-700";
  }

  if (normalized === "partially passed") {
    classes =
      "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (normalized === "rejected") {
    classes =
      "border-red-200 bg-red-50 text-red-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-medium ${classes}`}
    >
      {result || "Pending"}
    </span>
  );
}