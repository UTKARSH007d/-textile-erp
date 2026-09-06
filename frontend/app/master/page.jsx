"use client";

import { apiFetch } from "../lib/api";

import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api";

const masterTypes = {
  yarns: {
    title: "Yarns",
    icon: "🧶",
    endpoint: "yarns",
    fields: [
      { name: "yarn_code", label: "Yarn Code", required: true },
      { name: "name", label: "Yarn Name", required: true },
      { name: "yarn_type", label: "Yarn Type" },
      { name: "count", label: "Count" },
      { name: "unit", label: "Unit", defaultValue: "kg" },
    ],
  },

  fabrics: {
    title: "Fabrics",
    icon: "🧵",
    endpoint: "fabrics",
    fields: [
      { name: "fabric_code", label: "Fabric Code", required: true },
      { name: "name", label: "Fabric Name", required: true },
      { name: "fabric_type", label: "Fabric Type" },
      { name: "composition", label: "Composition" },
      {
        name: "width",
        label: "Width",
        type: "number",
      },
      {
        name: "unit",
        label: "Unit",
        defaultValue: "meter",
      },
    ],
  },

  products: {
    title: "Products",
    icon: "📦",
    endpoint: "products",
    fields: [
      {
        name: "product_code",
        label: "Product Code",
        required: true,
      },
      {
        name: "name",
        label: "Product Name",
        required: true,
      },
      {
        name: "product_type",
        label: "Product Type",
      },
      {
        name: "fabric_id",
        label: "Fabric ID",
        type: "number",
      },
      {
        name: "unit",
        label: "Unit",
        defaultValue: "meter",
      },
    ],
  },

  colors: {
    title: "Colors",
    icon: "🎨",
    endpoint: "colors",
    fields: [
      {
        name: "color_code",
        label: "Color Code",
        required: true,
      },
      {
        name: "name",
        label: "Color Name",
        required: true,
      },
      {
        name: "hex_code",
        label: "HEX Code",
      },
    ],
  },

  warehouses: {
    title: "Warehouses",
    icon: "🏭",
    endpoint: "warehouses",
    fields: [
      {
        name: "warehouse_code",
        label: "Warehouse Code",
        required: true,
      },
      {
        name: "name",
        label: "Warehouse Name",
        required: true,
      },
      {
        name: "location",
        label: "Location",
      },
      {
        name: "warehouse_type",
        label: "Warehouse Type",
      },
    ],
  },
};

export default function MasterPage() {
  const [activeTab, setActiveTab] = useState("yarns");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const config = masterTypes[activeTab];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `${API_URL}/${config.endpoint}/`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }

      const result = await response.json();

      setData(result);
    } catch (err) {
      console.error(err);
      setError("Unable to load data. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const getInitialFormData = () => {
    const initialData = {
      status: true,
    };

    config.fields.forEach((field) => {
      initialData[field.name] = field.defaultValue || "";
    });

    return initialData;
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData(getInitialFormData());
    setShowForm(true);
    setError("");
  };

  const handleEdit = (item) => {
    setEditingItem(item);

    const updatedFormData = {
      ...item,
    };

    config.fields.forEach((field) => {
      if (
        updatedFormData[field.name] === null ||
        updatedFormData[field.name] === undefined
      ) {
        updatedFormData[field.name] = "";
      }
    });

    setFormData(updatedFormData);
    setShowForm(true);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const submitData = {
        ...formData,
      };

      config.fields.forEach((field) => {
        if (
          field.type === "number" &&
          submitData[field.name] !== ""
        ) {
          submitData[field.name] = Number(
            submitData[field.name]
          );
        }

        if (submitData[field.name] === "") {
          submitData[field.name] = null;
        }
      });

      const url = editingItem
        ? `${API_URL}/${config.endpoint}/${editingItem.id}`
        : `${API_URL}/${config.endpoint}/`;

      const method = editingItem
        ? "PUT"
        : "POST";

      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Something went wrong"
        );
      }

      setShowForm(false);

      setMessage(
        editingItem
          ? `${config.title.slice(0, -1)} updated successfully`
          : `${config.title.slice(0, -1)} added successfully`
      );

      fetchData();

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this record?"
    );

    if (!confirmed) return;

    try {
      const response = await apiFetch(
        `${API_URL}/${config.endpoint}/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Failed to delete record"
        );
      }

      setMessage(
        `${config.title.slice(0, -1)} deleted successfully`
      );

      fetchData();

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getTableFields = () => {
    return config.fields;
  };

  return (
    <div
      style={{
        padding: "32px",
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#1e293b",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "8px",
          }}
        >
          Master Data
        </h1>

        <p
          style={{
            color: "#64748b",
            margin: 0,
          }}
        >
          Manage yarns, fabrics, products, colors and warehouses
        </p>
      </div>

      {/* SUCCESS MESSAGE */}

      {message && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "14px 18px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          ✓ {message}
        </div>
      )}

      {/* ERROR MESSAGE */}

      {error && !showForm && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "14px 18px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* TABS */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {Object.entries(masterTypes).map(
          ([key, item]) => (
            <button
              key={key}
              onClick={() => {
                setActiveTab(key);
                setShowForm(false);
                setError("");
                setMessage("");
              }}
              style={{
                padding: "12px 18px",
                borderRadius: "8px",
                border:
                  activeTab === key
                    ? "1px solid #2563eb"
                    : "1px solid #cbd5e1",
                background:
                  activeTab === key
                    ? "#2563eb"
                    : "#ffffff",
                color:
                  activeTab === key
                    ? "#ffffff"
                    : "#334155",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
              }}
            >
              {item.icon} {item.title}
            </button>
          )
        )}
      </div>

      {/* CONTENT CARD */}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "24px",
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* CARD HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
              }}
            >
              {config.icon} {config.title}
            </h2>

            <p
              style={{
                color: "#64748b",
                marginTop: "6px",
              }}
            >
              Total records: {data.length}
            </p>
          </div>

          <button
            onClick={handleAdd}
            style={{
              padding: "11px 18px",
              background: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            + Add {config.title.slice(0, -1)}
          </button>
        </div>

        {/* TABLE */}

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px",
              color: "#64748b",
            }}
          >
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "50px",
              color: "#64748b",
            }}
          >
            No {config.title.toLowerCase()} found.
            <br />
            <br />
            Click{" "}
            <b>
              Add{" "}
              {config.title.slice(
                0,
                -1
              )}
            </b>{" "}
            to create your first record.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f1f5f9",
                  }}
                >
                  <th
                    style={tableHeaderStyle}
                  >
                    ID
                  </th>

                  {getTableFields().map(
                    (field) => (
                      <th
                        key={field.name}
                        style={tableHeaderStyle}
                      >
                        {field.label}
                      </th>
                    )
                  )}

                  <th style={tableHeaderStyle}>
                    Status
                  </th>

                  <th style={tableHeaderStyle}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td style={tableCellStyle}>
                      {item.id}
                    </td>

                    {getTableFields().map(
                      (field) => (
                        <td
                          key={field.name}
                          style={tableCellStyle}
                        >
                          {field.name ===
                            "hex_code" &&
                          item.hex_code ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems:
                                  "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius:
                                    "5px",
                                  background:
                                    item.hex_code,
                                  border:
                                    "1px solid #cbd5e1",
                                }}
                              />

                              {item.hex_code}
                            </div>
                          ) : (
                            item[field.name] ??
                            "-"
                          )}
                        </td>
                      )
                    )}

                    <td style={tableCellStyle}>
                      <span
                        style={{
                          padding:
                            "5px 10px",
                          borderRadius:
                            "20px",
                          background:
                            item.status
                              ? "#dcfce7"
                              : "#fee2e2",
                          color:
                            item.status
                              ? "#166534"
                              : "#991b1b",
                          fontSize: "13px",
                          fontWeight:
                            "600",
                        }}
                      >
                        {item.status
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td style={tableCellStyle}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            handleEdit(
                              item
                            )
                          }
                          style={{
                            ...actionButtonStyle,
                            background:
                              "#eff6ff",
                            color:
                              "#2563eb",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              item.id
                            )
                          }
                          style={{
                            ...actionButtonStyle,
                            background:
                              "#fee2e2",
                            color:
                              "#dc2626",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM MODAL */}

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15,23,42,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "650px",
              background: "#ffffff",
              borderRadius: "14px",
              padding: "28px",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                }}
              >
                {editingItem
                  ? `Edit ${config.title.slice(
                      0,
                      -1
                    )}`
                  : `Add ${config.title.slice(
                      0,
                      -1
                    )}`}
              </h2>

              <button
                onClick={() =>
                  setShowForm(false)
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  fontSize: "25px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#991b1b",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "18px",
                }}
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "18px",
                }}
              >
                {config.fields.map(
                  (field) => (
                    <div
                      key={field.name}
                    >
                      <label
                        style={{
                          display:
                            "block",
                          marginBottom:
                            "7px",
                          fontWeight:
                            "600",
                          fontSize:
                            "14px",
                        }}
                      >
                        {field.label}

                        {field.required &&
                          " *"}
                      </label>

                      <input
                        type={
                          field.type ||
                          "text"
                        }
                        name={
                          field.name
                        }
                        required={
                          field.required ||
                          false
                        }
                        value={
                          formData[
                            field.name
                          ] ?? ""
                        }
                        onChange={
                          handleChange
                        }
                        style={{
                          width: "100%",
                          padding:
                            "11px 12px",
                          border:
                            "1px solid #cbd5e1",
                          borderRadius:
                            "8px",
                          fontSize:
                            "14px",
                          boxSizing:
                            "border-box",
                        }}
                      />
                    </div>
                  )
                )}
              </div>

              {/* STATUS */}

              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    name="status"
                    checked={
                      formData.status ??
                      true
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <span>
                    Active Status
                  </span>
                </label>
              </div>

              {/* BUTTONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "12px",
                  marginTop: "28px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  style={{
                    padding:
                      "11px 20px",
                    border:
                      "1px solid #cbd5e1",
                    background:
                      "#ffffff",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding:
                      "11px 20px",
                    border: "none",
                    background:
                      "#2563eb",
                    color:
                      "#ffffff",
                    borderRadius:
                      "8px",
                    cursor:
                      "pointer",
                    fontWeight:
                      "600",
                  }}
                >
                  {editingItem
                    ? "Update"
                    : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


/* =========================
   STYLES
========================= */

const tableHeaderStyle = {
  padding: "14px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: "700",
  color: "#475569",
  borderBottom: "1px solid #e2e8f0",
  whiteSpace: "nowrap",
};

const tableCellStyle = {
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "14px",
  color: "#334155",
  whiteSpace: "nowrap",
};

const actionButtonStyle = {
  border: "none",
  padding: "7px 11px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "600",
};