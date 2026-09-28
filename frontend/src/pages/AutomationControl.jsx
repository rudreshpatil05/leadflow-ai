import { useEffect, useState } from "react";

import {
  getAutomationRules,
  initializeAutomation,
  updateAutomationRule,
} from "../services/api";


export default function AutomationControl() {

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadRules = async () => {
    try {
      setLoading(true);

      const data = await getAutomationRules();

      setRules(data || []);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load automation rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleInitialize = async () => {
    try {
      await initializeAutomation();

      setMessage(
        "Automation rules initialized successfully."
      );

      await loadRules();
    } catch (error) {
      console.error(error);

      setMessage(
        "Failed to initialize automation."
      );
    }
  };

  const toggleRule = async (rule) => {
    try {
      await updateAutomationRule(
        rule.id,
        !rule.is_active
      );

      await loadRules();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        Loading automation rules...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Sales Automation
          </h1>

          <p className="text-gray-500">
            Control automatic sales actions and workflows.
          </p>
        </div>

        <button
          onClick={handleInitialize}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Initialize Rules
        </button>

      </div>

      {message && (
        <div className="p-3 rounded-lg bg-gray-100">
          {message}
        </div>
      )}

      <div className="grid gap-4">

        {rules.map((rule) => (

          <div
            key={rule.id}
            className="border rounded-xl p-5 bg-white shadow-sm"
          >

            <div className="flex items-center justify-between">

              <div>

                <h2 className="font-semibold">
                  {rule.name}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {rule.description}
                </p>

              </div>

              <button
                onClick={() => toggleRule(rule)}
                className={`px-3 py-2 rounded-lg ${
                  rule.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {rule.is_active
                  ? "Enabled"
                  : "Disabled"}
              </button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-sm">

              <div>
                <span className="text-gray-500">
                  Event
                </span>

                <div className="font-medium">
                  {rule.event_type}
                </div>
              </div>

              <div>
                <span className="text-gray-500">
                  Condition
                </span>

                <div className="font-medium">
                  {rule.condition_type}:{" "}
                  {rule.condition_value}
                </div>
              </div>

              <div>
                <span className="text-gray-500">
                  Action
                </span>

                <div className="font-medium">
                  {rule.action_type}
                </div>
              </div>

              <div>
                <span className="text-gray-500">
                  Value
                </span>

                <div className="font-medium">
                  {rule.action_value || "—"}
                </div>
              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}