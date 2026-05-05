// src/admin/AutoResponder.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaEnvelope,
  FaRobot,
  FaPlus,
  FaTrash,
  FaEdit,
  FaPlay,
  FaPause,
  FaSave,
  FaTimes,
  FaSpinner,
  FaChartLine,
  FaImage,
  FaUpload,
} from "react-icons/fa";

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_COUNT = 5;

const emptyForm = {
  name: "",
  trigger_event: "signup",
  subject: "",
  template: "",
  delay_minutes: 0,
  is_active: true,
  conditions: {
    tier: [],
    referral_source: null,
  },
  existing_images: [],
  remove_image_ids: [],
};

export default function AutoResponder({ apiBase, showToast }) {
  const [autoResponses, setAutoResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState(null);
  const [saving, setSaving] = useState(false);

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [stats, setStats] = useState({
    total_sent: 0,
    active_rules: 0,
    open_rate: 0,
    click_rate: 0,
  });

  const [formData, setFormData] = useState(emptyForm);

  const triggerEvents = useMemo(
    () => [
      {
        value: "signup",
        label: "New Signup",
        description: "Trigger when user creates account",
      },
      {
        value: "signup_with_referral",
        label: "Signup with Referral",
        description: "User signed up using referral code",
      },
      {
        value: "first_deposit",
        label: "First Deposit",
        description: "User makes first deposit",
      },
      {
        value: "first_trade",
        label: "First Trade",
        description: "User completes first trade",
      },
      {
        value: "activation_complete",
        label: "Activation Complete",
        description: "User completes platform activation",
      },
      {
        value: "tier_upgrade",
        label: "Tier Upgrade",
        description: "User upgrades their tier",
      },
    ],
    []
  );

  const getAuthToken = useCallback(() => {
    try {
      return localStorage.getItem("imali_token");
    } catch (error) {
      console.error("Failed to get token:", error);
      return null;
    }
  }, []);

  const authHeaders = useCallback(() => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAuthToken]);

  const resetForm = useCallback(() => {
    imagePreviews.forEach((preview) => {
      if (preview?.url?.startsWith("blob:")) URL.revokeObjectURL(preview.url);
    });

    setFormData(emptyForm);
    setEditingResponse(null);
    setImageFiles([]);
    setImagePreviews([]);
  }, [imagePreviews]);

  const fetchAutoResponses = useCallback(async () => {
    const token = getAuthToken();

    if (!token) {
      showToast?.("Authentication required", "error");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/admin/autoresponder/rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        setAutoResponses([]);
        setStats({
          total_sent: 0,
          active_rules: 0,
          open_rate: 0,
          click_rate: 0,
        });
        return;
      }

      const data = await response.json();

      if (data.success) {
        const rules = data.data?.rules || [];

        setAutoResponses(rules);
        setStats({
          total_sent: data.data?.stats?.total_sent || 0,
          active_rules: rules.filter((rule) => rule.is_active).length,
          open_rate: data.data?.stats?.open_rate || 0,
          click_rate: data.data?.stats?.click_rate || 0,
        });
      } else {
        setAutoResponses([]);
        showToast?.(data.error || "Failed to load auto-responders", "error");
      }
    } catch (error) {
      console.error("Failed to fetch auto-responders:", error);
      setAutoResponses([]);
      showToast?.("Failed to load auto-responders", "error");
    } finally {
      setLoading(false);
    }
  }, [apiBase, getAuthToken, showToast]);

  useEffect(() => {
    fetchAutoResponses();
  }, [fetchAutoResponses]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview?.url?.startsWith("blob:")) URL.revokeObjectURL(preview.url);
      });
    };
  }, [imagePreviews]);

  const validateForm = () => {
    if (!formData.name.trim()) {
      showToast?.("Rule name is required", "error");
      return false;
    }

    if (!formData.subject.trim()) {
      showToast?.("Email subject is required", "error");
      return false;
    }

    if (!formData.template.trim()) {
      showToast?.("Email template is required", "error");
      return false;
    }

    return true;
  };

  const buildMultipartPayload = () => {
    const payload = new FormData();

    payload.append("name", formData.name.trim());
    payload.append("trigger_event", formData.trigger_event);
    payload.append("subject", formData.subject.trim());
    payload.append("template", formData.template);
    payload.append("delay_minutes", String(parseInt(formData.delay_minutes, 10) || 0));
    payload.append("is_active", String(Boolean(formData.is_active)));
    payload.append("conditions", JSON.stringify(formData.conditions || {}));
    payload.append("remove_image_ids", JSON.stringify(formData.remove_image_ids || []));

    imageFiles.forEach((file) => {
      payload.append("images", file);
    });

    return payload;
  };

  const saveRule = async () => {
    if (!validateForm()) return;

    const token = getAuthToken();

    if (!token) {
      showToast?.("Authentication required", "error");
      return;
    }

    const isEditing = Boolean(editingResponse?.id);
    const url = isEditing
      ? `${apiBase}/api/admin/autoresponder/rules/${editingResponse.id}`
      : `${apiBase}/api/admin/autoresponder/rules`;

    setSaving(true);

    try {
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: buildMultipartPayload(),
      });

      const data = await response.json();

      if (data.success) {
        showToast?.(
          isEditing ? "Auto-responder rule updated" : "Auto-responder rule created",
          "success"
        );

        setShowCreateModal(false);
        resetForm();
        fetchAutoResponses();
      } else {
        showToast?.(
          data.error || `Failed to ${isEditing ? "update" : "create"} rule`,
          "error"
        );
      }
    } catch (error) {
      console.error("Save rule error:", error);
      showToast?.("Failed to save auto-responder rule", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm("Delete this auto-responder rule?")) return;

    try {
      const response = await fetch(
        `${apiBase}/api/admin/autoresponder/rules/${ruleId}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast?.("Rule deleted", "success");
        fetchAutoResponses();
      } else {
        showToast?.(data.error || "Failed to delete rule", "error");
      }
    } catch (error) {
      console.error("Delete rule error:", error);
      showToast?.("Failed to delete rule", "error");
    }
  };

  const toggleRuleStatus = async (ruleId, currentStatus) => {
    try {
      const response = await fetch(
        `${apiBase}/api/admin/autoresponder/rules/${ruleId}/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ active: !currentStatus }),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast?.(`Rule ${!currentStatus ? "activated" : "paused"}`, "success");
        fetchAutoResponses();
      } else {
        showToast?.(data.error || "Failed to toggle rule", "error");
      }
    } catch (error) {
      console.error("Toggle rule error:", error);
      showToast?.("Failed to toggle rule", "error");
    }
  };

  const testRule = async (ruleId) => {
    const testEmail = prompt("Enter email address to send test:");

    if (!testEmail) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      showToast?.("Please enter a valid email address", "error");
      return;
    }

    try {
      const response = await fetch(
        `${apiBase}/api/admin/autoresponder/rules/${ruleId}/test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ test_email: testEmail }),
        }
      );

      const data = await response.json();

      if (data.success) {
        showToast?.(data.message || `Test email sent to ${testEmail}`, "success");
      } else {
        showToast?.(data.error || "Failed to send test email", "error");
      }
    } catch (error) {
      console.error("Test rule error:", error);
      showToast?.("Failed to send test email", "error");
    }
  };

  const handleImageSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) return;

    const currentImageCount =
      imageFiles.length + (formData.existing_images?.length || 0);

    if (currentImageCount + selectedFiles.length > MAX_IMAGE_COUNT) {
      showToast?.(`You can upload up to ${MAX_IMAGE_COUNT} images`, "error");
      event.target.value = "";
      return;
    }

    const validFiles = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        showToast?.(`${file.name} is not an image`, "error");
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        showToast?.(`${file.name} is larger than ${MAX_IMAGE_SIZE_MB}MB`, "error");
        continue;
      }

      validFiles.push(file);
    }

    const previews = validFiles.map((file) => ({
      id: crypto?.randomUUID?.() || `${file.name}-${Date.now()}`,
      name: file.name,
      url: URL.createObjectURL(file),
      isNew: true,
    }));

    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...previews]);

    event.target.value = "";
  };

  const removeNewImage = (previewId) => {
    const previewIndex = imagePreviews.findIndex((preview) => preview.id === previewId);
    const preview = imagePreviews[previewIndex];

    if (preview?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(preview.url);
    }

    setImagePreviews((prev) => prev.filter((item) => item.id !== previewId));

    if (preview?.isNew) {
      const newImageIndex = imagePreviews
        .filter((item) => item.isNew)
        .findIndex((item) => item.id === previewId);

      setImageFiles((prev) => prev.filter((_, index) => index !== newImageIndex));
    }
  };

  const removeExistingImage = (image) => {
    const imageId = image.id || image.image_id || image.url;

    setFormData((prev) => ({
      ...prev,
      existing_images: (prev.existing_images || []).filter(
        (item) => (item.id || item.image_id || item.url) !== imageId
      ),
      remove_image_ids: [...(prev.remove_image_ids || []), imageId],
    }));
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (rule) => {
    resetForm();

    setEditingResponse(rule);
    setFormData({
      name: rule.name || "",
      trigger_event: rule.trigger_event || "signup",
      subject: rule.subject || "",
      template: rule.template || "",
      delay_minutes: rule.delay_minutes || 0,
      is_active: rule.is_active !== false,
      conditions: rule.conditions || { tier: [], referral_source: null },
      existing_images: rule.images || rule.attachments || [],
      remove_image_ids: [],
    });

    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const getTriggerLabel = (value) => {
    return triggerEvents.find((event) => event.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="animate-spin text-3xl text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<FaEnvelope />} color="text-blue-400" value={stats.total_sent} label="Emails Sent" />
        <StatCard icon={<FaRobot />} color="text-emerald-400" value={stats.active_rules} label="Active Rules" />
        <StatCard icon={<FaChartLine />} color="text-purple-400" value={`${stats.open_rate}%`} label="Open Rate" />
        <StatCard icon={<FaChartLine />} color="text-amber-400" value={`${stats.click_rate}%`} label="Click Rate" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FaRobot className="text-emerald-400" />
            Auto-Responder Rules
          </h3>
          <p className="text-sm text-white/50">
            Automated email sequences for user events
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          disabled={saving}
        >
          <FaPlus /> Create Rule
        </button>
      </div>

      <div className="space-y-3">
        {autoResponses.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <FaRobot className="mx-auto mb-3 text-4xl text-white/30" />
            <p className="text-white/50">No auto-responder rules yet</p>
            <button
              onClick={openCreateModal}
              className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
            >
              Create your first rule →
            </button>
          </div>
        ) : (
          autoResponses.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-semibold text-white">
                      {rule.name || "Unnamed Rule"}
                    </h4>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        rule.is_active
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-gray-500/20 text-gray-300"
                      }`}
                    >
                      {rule.is_active ? "Active" : "Paused"}
                    </span>

                    {(rule.images?.length || rule.attachments?.length) ? (
                      <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                        <FaImage /> {(rule.images || rule.attachments || []).length} image(s)
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                    <span>Trigger: {getTriggerLabel(rule.trigger_event)}</span>
                    <span>• Delay: {rule.delay_minutes || 0} minutes</span>
                    <span>• Sent: {rule.sent_count || 0} emails</span>
                  </div>

                  <div className="mt-2 text-sm text-white/70">
                    Subject: {rule.subject || "No subject"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <IconButton title="Send Test" onClick={() => testRule(rule.id)} disabled={saving}>
                    <FaPlay className="text-green-400" />
                  </IconButton>

                  <IconButton title="Edit" onClick={() => openEditModal(rule)} disabled={saving}>
                    <FaEdit className="text-amber-400" />
                  </IconButton>

                  <button
                    onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                    className={`rounded-lg border p-2 text-sm hover:bg-white/5 disabled:opacity-50 ${
                      rule.is_active
                        ? "border-red-500/30 text-red-400"
                        : "border-green-500/30 text-green-400"
                    }`}
                    title={rule.is_active ? "Pause" : "Activate"}
                    disabled={saving}
                  >
                    {rule.is_active ? <FaPause /> : <FaPlay />}
                  </button>

                  <IconButton title="Delete" onClick={() => deleteRule(rule.id)} disabled={saving}>
                    <FaTrash className="text-red-400" />
                  </IconButton>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                {editingResponse ? "Edit Auto-Responder Rule" : "Create Auto-Responder Rule"}
              </h3>

              <button
                onClick={closeModal}
                className="text-white/50 hover:text-white"
                disabled={saving}
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Rule Name *">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder="e.g., Welcome Email for New Users"
                  className="input"
                  disabled={saving}
                />
              </Field>

              <Field label="Trigger Event *">
                <select
                  value={formData.trigger_event}
                  onChange={(event) =>
                    setFormData({ ...formData, trigger_event: event.target.value })
                  }
                  className="input"
                  disabled={saving}
                >
                  {triggerEvents.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.label} - {event.description}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Delay (minutes)">
                <input
                  type="number"
                  min="0"
                  max="43200"
                  value={formData.delay_minutes}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      delay_minutes: parseInt(event.target.value, 10) || 0,
                    })
                  }
                  placeholder="0 for immediate"
                  className="input"
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-white/40">
                  Delay before sending after trigger event. Max 30 days.
                </p>
              </Field>

              <Field label="Email Subject *">
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(event) =>
                    setFormData({ ...formData, subject: event.target.value })
                  }
                  placeholder="Welcome to IMALI!"
                  className="input"
                  disabled={saving}
                />
              </Field>

              <Field label="Email Template *">
                <textarea
                  value={formData.template}
                  onChange={(event) =>
                    setFormData({ ...formData, template: event.target.value })
                  }
                  placeholder={`Welcome {user_name}!

Thank you for joining IMALI. Get started with these steps:
1. Complete your profile
2. Connect your wallet
3. Start paper trading

Need help? Contact support@imali-defi.com`}
                  rows={9}
                  className="input font-mono text-sm"
                  disabled={saving}
                />

                <p className="mt-1 text-xs text-white/40">
                  Available variables: {"{user_name}"}, {"{user_email}"}, {"{referral_code}"}, {"{dashboard_link}"}, {"{support_email}"}
                </p>
              </Field>

              <Field label="Email Images">
                <div className="rounded-xl border border-dashed border-white/15 bg-black/30 p-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-5 text-center hover:bg-white/10">
                    <FaUpload className="mb-2 text-2xl text-emerald-400" />
                    <span className="text-sm font-medium text-white">
                      Upload email images
                    </span>
                    <span className="mt-1 text-xs text-white/40">
                      PNG, JPG, GIF, or WEBP. Max {MAX_IMAGE_SIZE_MB}MB each. Up to {MAX_IMAGE_COUNT} images.
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      disabled={saving}
                    />
                  </label>

                  {(formData.existing_images?.length > 0 || imagePreviews.length > 0) && (
                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {formData.existing_images.map((image) => (
                        <ImagePreview
                          key={image.id || image.image_id || image.url}
                          image={{
                            url: image.url || image.image_url,
                            name: image.name || image.filename || "Uploaded image",
                          }}
                          onRemove={() => removeExistingImage(image)}
                          disabled={saving}
                        />
                      ))}

                      {imagePreviews.map((preview) => (
                        <ImagePreview
                          key={preview.id}
                          image={preview}
                          onRemove={() => removeNewImage(preview.id)}
                          disabled={saving}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-2 text-xs text-white/40">
                  Tip: You can reference uploaded images in your backend email template as inline attachments or public URLs after upload.
                </p>
              </Field>

              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 p-3">
                <div>
                  <div className="text-sm font-medium text-white">Active</div>
                  <div className="text-xs text-white/40">
                    Turn this rule on or pause it.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, is_active: !formData.is_active })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    formData.is_active ? "bg-emerald-600" : "bg-gray-600"
                  }`}
                  disabled={saving}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white transition ${
                      formData.is_active ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveRule}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="mr-2 inline animate-spin" />
                      {editingResponse ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2 inline" />
                      {editingResponse ? "Update Rule" : "Create Rule"}
                    </>
                  )}
                </button>

                <button
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-white/10 py-2 text-white hover:bg-white/5 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <style>{`
            .input {
              width: 100%;
              border-radius: 0.5rem;
              border: 1px solid rgba(255,255,255,0.1);
              background: rgba(0,0,0,0.4);
              padding: 0.5rem 0.75rem;
              color: white;
              outline: none;
            }

            .input::placeholder {
              color: rgba(255,255,255,0.3);
            }

            .input:focus {
              border-color: rgba(16,185,129,0.65);
              box-shadow: 0 0 0 2px rgba(16,185,129,0.15);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, color, value, label }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <div className={`mx-auto mb-2 text-xl ${color}`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      {children}
    </div>
  );
}

function IconButton({ children, onClick, title, disabled }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-white/10 p-2 text-sm hover:bg-white/5 disabled:opacity-50"
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ImagePreview({ image, onRemove, disabled }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <img
        src={image.url}
        alt={image.name || "Email upload"}
        className="h-28 w-full object-cover"
      />

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-red-600 disabled:opacity-50"
        title="Remove image"
      >
        <FaTimes />
      </button>

      <div className="truncate px-2 py-1 text-xs text-white/60">
        {image.name || "Image"}
      </div>
    </div>
  );
}