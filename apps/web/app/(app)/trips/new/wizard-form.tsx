"use client";

import { useState, useCallback, useTransition } from "react";
import type {
  CategoryRow,
  SubDisciplineRow,
  CategoryParameterRow,
  ParameterOptionRow,
  WizardFormData,
} from "../types";
import { INITIAL_FORM_DATA } from "../types";
import {
  saveDraft,
  publishTrip,
  fetchSubDisciplines,
  fetchCategoryParameters,
  fetchParameterOptions,
} from "../actions";
import { Step1Category } from "./steps/step1-category";
import { Step2Basics } from "./steps/step2-basics";
import { Step3Details } from "./steps/step3-details";
import { Step4Publish } from "./steps/step4-publish";
import { CATEGORY_DISPLAY } from "@/lib/categories";

interface WizardFormProps {
  categories: CategoryRow[];
  countries: { code: string; name_hu: string; name_en: string; flag_emoji: string }[];
  userId: string;
}

const STEPS = [
  { num: 1, label: "Kategória" },
  { num: 2, label: "Alapadatok" },
  { num: 3, label: "Részletek" },
  { num: 4, label: "Publikálás" },
];

export function WizardForm({ categories, countries, userId }: WizardFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_FORM_DATA);
  const [tripId, setTripId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Dynamic data loaded per-category
  const [subDisciplines, setSubDisciplines] = useState<SubDisciplineRow[]>([]);
  const [parameters, setParameters] = useState<CategoryParameterRow[]>([]);
  const [paramOptions, setParamOptions] = useState<ParameterOptionRow[]>([]);

  // Status messages
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Update form data ──
  const updateForm = useCallback(
    (updates: Partial<WizardFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // ── Category selected → load sub-disciplines ──
  const onCategorySelect = useCallback(
    (categoryId: string, categoryName: string) => {
      updateForm({
        category_id: categoryId,
        category_name: categoryName,
        sub_discipline_id: "",
        category_details: {},
      });

      startTransition(async () => {
        const subs = await fetchSubDisciplines(categoryId);
        setSubDisciplines(subs);

        // Load global parameters (no sub-discipline filter)
        const params = await fetchCategoryParameters(categoryId);
        setParameters(params);

        // Load options for select/multiselect fields
        const selectParams = params
          .filter((p) => p.field_type === "select" || p.field_type === "multiselect")
          .map((p) => p.id);
        if (selectParams.length > 0) {
          const opts = await fetchParameterOptions(selectParams);
          setParamOptions(opts);
        }
      });
    },
    [updateForm]
  );

  // ── Sub-discipline changed → reload parameters ──
  const onSubDisciplineChange = useCallback(
    (subId: string) => {
      updateForm({ sub_discipline_id: subId });

      startTransition(async () => {
        const params = await fetchCategoryParameters(
          formData.category_id,
          subId || undefined
        );
        setParameters(params);

        const selectParams = params
          .filter((p) => p.field_type === "select" || p.field_type === "multiselect")
          .map((p) => p.id);
        if (selectParams.length > 0) {
          const opts = await fetchParameterOptions(selectParams);
          setParamOptions(opts);
        }
      });
    },
    [formData.category_id, updateForm]
  );

  // ── Save draft ──
  const doSaveDraft = useCallback(async () => {
    setSaveStatus("saving");
    setErrorMsg("");

    const result = await saveDraft(formData, tripId || undefined);
    if (result.error) {
      setSaveStatus("error");
      setErrorMsg(result.error);
    } else {
      setSaveStatus("saved");
      if (!tripId) setTripId(result.tripId);
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, [formData, tripId]);

  // ── Next step ──
  const goNext = useCallback(async () => {
    // Save draft on Step 2 → 3 transition (first save)
    if (currentStep === 2 && !tripId) {
      setSaveStatus("saving");
      const result = await saveDraft(formData);
      if (result.error) {
        setSaveStatus("error");
        setErrorMsg(result.error);
        return;
      }
      setTripId(result.tripId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }

    // Save draft on every step transition after initial save
    if (currentStep >= 2 && tripId) {
      await saveDraft(formData, tripId);
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, formData, tripId]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // ── Publish ──
  const doPublish = useCallback(async () => {
    if (!tripId) {
      setErrorMsg("Először mentsd el a piszkozatot");
      return;
    }

    setSaveStatus("saving");
    const result = await publishTrip(tripId, formData);
    if (result.error) {
      setSaveStatus("error");
      setErrorMsg(result.error);
    } else {
      // Success! redirect to the trip detail page
      window.location.href = `/trips/${result.slug}`;
    }
  }, [tripId, formData]);

  // ── Step 3 label adapts to category ──
  const step3Label =
    formData.category_name
      ? CATEGORY_DISPLAY[formData.category_name]?.nameHu || formData.category_name
      : "Részletek";

  const canGoNext =
    currentStep === 1
      ? !!formData.category_id
      : currentStep === 2
        ? !!formData.title && !!formData.start_date && !!formData.end_date && !!formData.description
        : currentStep === 3
          ? true
          : true;

  return (
    <div>
      {/* ── Stepper ── */}
      <div className="flex items-center justify-center mb-10">
        {STEPS.map((step, i) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          const label = step.num === 3 ? step3Label : step.label;

          return (
            <div key={step.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isActive
                      ? "bg-trevu-600 text-white shadow-lg shadow-trevu-600/30"
                      : isCompleted
                        ? "bg-trevu-100 text-trevu-700"
                        : "bg-navy-100 text-navy-400"
                  }`}
                >
                  {isCompleted ? "✓" : step.num}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    isActive
                      ? "text-trevu-700"
                      : isCompleted
                        ? "text-trevu-600"
                        : "text-navy-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-16px] ${
                    currentStep > step.num ? "bg-trevu-400" : "bg-navy-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content ── */}
      <div className="bg-white rounded-2xl border border-navy-200 shadow-sm p-6 sm:p-8">
        {currentStep === 1 && (
          <Step1Category
            categories={categories}
            selectedCategoryId={formData.category_id}
            onSelect={onCategorySelect}
            isLoading={isPending}
          />
        )}

        {currentStep === 2 && (
          <Step2Basics
            formData={formData}
            onChange={updateForm}
            countries={countries}
            subDisciplines={subDisciplines}
            onSubDisciplineChange={onSubDisciplineChange}
          />
        )}

        {currentStep === 3 && (
          <Step3Details
            formData={formData}
            onChange={updateForm}
            parameters={parameters}
            paramOptions={paramOptions}
            isLoading={isPending}
          />
        )}

        {currentStep === 4 && (
          <Step4Publish
            formData={formData}
            onChange={updateForm}
            categoryDisplay={CATEGORY_DISPLAY[formData.category_name]}
          />
        )}
      </div>

      {/* ── Navigation Footer ── */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {currentStep > 1 && (
            <button
              onClick={goBack}
              className="px-5 py-2.5 text-sm font-medium text-navy-600 bg-white border border-navy-200 rounded-xl hover:bg-navy-50 transition-colors"
            >
              ← Vissza
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          {saveStatus === "saving" && (
            <span className="text-xs text-navy-400 animate-pulse">Mentés...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600">✓ Mentve</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-500">{errorMsg}</span>
          )}

          {/* Draft save button (visible from step 2) */}
          {currentStep >= 2 && (
            <button
              onClick={doSaveDraft}
              disabled={saveStatus === "saving"}
              className="px-4 py-2.5 text-sm font-medium text-navy-500 bg-navy-50 border border-navy-200 rounded-xl hover:bg-navy-100 transition-colors disabled:opacity-50"
            >
              Piszkozat mentése
            </button>
          )}

          {/* Next / Publish */}
          {currentStep < 4 ? (
            <button
              onClick={goNext}
              disabled={!canGoNext || isPending}
              className="px-6 py-2.5 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Tovább →
            </button>
          ) : (
            <button
              onClick={doPublish}
              disabled={saveStatus === "saving"}
              className="px-6 py-2.5 text-sm font-bold text-white bg-trevu-600 rounded-xl hover:bg-trevu-700 transition-colors disabled:opacity-50 shadow-lg shadow-trevu-600/30"
            >
              🚀 Túra publikálása
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
