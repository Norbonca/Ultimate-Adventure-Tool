import { getServerT } from "@/lib/i18n/server";
import { getTripConfigData } from "./actions";
import { TripConfigClient } from "./trip-config-client";

export default async function TripConfigPage() {
  const { t } = await getServerT();
  const data = await getTripConfigData();

  return (
    <div className="p-8">
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {t("admin.tripConfig.title")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("admin.tripConfig.subtitle")}
        </p>
      </div>

      <TripConfigClient
        initialCategories={data.categories}
        initialSubDisciplines={data.subDisciplines}
        initialParameters={data.parameters}
        t_tabs_categories={t("admin.tripConfig.tabs.categories")}
        t_tabs_subDisciplines={t("admin.tripConfig.tabs.subDisciplines")}
        t_tabs_parameters={t("admin.tripConfig.tabs.parameters")}
        // Categories
        t_cat_colOrder={t("admin.tripConfig.categories.colOrder")}
        t_cat_colIcon={t("admin.tripConfig.categories.colIcon")}
        t_cat_colNameHu={t("admin.tripConfig.categories.colNameHu")}
        t_cat_colNameEn={t("admin.tripConfig.categories.colNameEn")}
        t_cat_colColor={t("admin.tripConfig.categories.colColor")}
        t_cat_colStatus={t("admin.tripConfig.categories.colStatus")}
        t_cat_editCategory={t("admin.tripConfig.categories.editCategory")}
        t_cat_saveCategory={t("admin.tripConfig.categories.saveCategory")}
        t_cat_cancelEdit={t("admin.tripConfig.categories.cancelEdit")}
        t_cat_iconPlaceholder={t("admin.tripConfig.categories.iconPlaceholder")}
        t_cat_namePlaceholder={t("admin.tripConfig.categories.namePlaceholder")}
        t_cat_nameEnPlaceholder={t("admin.tripConfig.categories.nameEnPlaceholder")}
        t_cat_statusActive={t("admin.tripConfig.categories.statusActive")}
        t_cat_statusDraft={t("admin.tripConfig.categories.statusDraft")}
        t_cat_statusDeprecated={t("admin.tripConfig.categories.statusDeprecated")}
        // Sub-disciplines
        t_sd_selectPrompt={t("admin.tripConfig.subDisciplines.selectCategoryPrompt")}
        t_sd_colNameHu={t("admin.tripConfig.subDisciplines.colNameHu")}
        t_sd_colNameEn={t("admin.tripConfig.subDisciplines.colNameEn")}
        t_sd_colOrder={t("admin.tripConfig.subDisciplines.colOrder")}
        t_sd_colStatus={t("admin.tripConfig.subDisciplines.colStatus")}
        t_sd_addSubDiscipline={t("admin.tripConfig.subDisciplines.addSubDiscipline")}
        t_sd_editSubDiscipline={t("admin.tripConfig.subDisciplines.editSubDiscipline")}
        t_sd_saveSubDiscipline={t("admin.tripConfig.subDisciplines.saveSubDiscipline")}
        t_sd_deleteSubDiscipline={t("admin.tripConfig.subDisciplines.deleteSubDiscipline")}
        t_sd_deleteConfirm={t("admin.tripConfig.subDisciplines.deleteConfirm")}
        t_sd_namePlaceholder={t("admin.tripConfig.subDisciplines.namePlaceholder")}
        t_sd_nameEnPlaceholder={t("admin.tripConfig.subDisciplines.nameEnPlaceholder")}
        t_sd_noSubDisciplines={t("admin.tripConfig.subDisciplines.noSubDisciplines")}
        // Parameters
        t_p_selectPrompt={t("admin.tripConfig.parameters.selectCategoryPrompt")}
        t_p_colKey={t("admin.tripConfig.parameters.colKey")}
        t_p_colLabelHu={t("admin.tripConfig.parameters.colLabelHu")}
        t_p_colFieldType={t("admin.tripConfig.parameters.colFieldType")}
        t_p_colRequired={t("admin.tripConfig.parameters.colRequired")}
        t_p_colOrder={t("admin.tripConfig.parameters.colOrder")}
        t_p_colStatus={t("admin.tripConfig.parameters.colStatus")}
        t_p_addParameter={t("admin.tripConfig.parameters.addParameter")}
        t_p_editParameter={t("admin.tripConfig.parameters.editParameter")}
        t_p_saveParameter={t("admin.tripConfig.parameters.saveParameter")}
        t_p_deleteParameter={t("admin.tripConfig.parameters.deleteParameter")}
        t_p_deleteConfirm={t("admin.tripConfig.parameters.deleteConfirm")}
        t_p_keyPlaceholder={t("admin.tripConfig.parameters.keyPlaceholder")}
        t_p_labelPlaceholder={t("admin.tripConfig.parameters.labelPlaceholder")}
        t_p_labelEnPlaceholder={t("admin.tripConfig.parameters.labelEnPlaceholder")}
        t_p_fieldTypeText={t("admin.tripConfig.parameters.fieldTypeText")}
        t_p_fieldTypeNumber={t("admin.tripConfig.parameters.fieldTypeNumber")}
        t_p_fieldTypeBoolean={t("admin.tripConfig.parameters.fieldTypeBoolean")}
        t_p_fieldTypeSelect={t("admin.tripConfig.parameters.fieldTypeSelect")}
        t_p_fieldTypeMultiselect={t("admin.tripConfig.parameters.fieldTypeMultiselect")}
        t_p_fieldTypeRange={t("admin.tripConfig.parameters.fieldTypeRange")}
        t_p_fieldTypeDate={t("admin.tripConfig.parameters.fieldTypeDate")}
        t_p_fieldTypeTextarea={t("admin.tripConfig.parameters.fieldTypeTextarea")}
        t_p_noParameters={t("admin.tripConfig.parameters.noParameters")}
        t_p_isRequired={t("admin.tripConfig.parameters.isRequired")}
        t_p_isFilterable={t("admin.tripConfig.parameters.isFilterable")}
        // Common
        t_saveSuccess={t("admin.tripConfig.saveSuccess")}
        t_deleteSuccess={t("admin.tripConfig.deleteSuccess")}
        t_errorSave={t("admin.tripConfig.errorSave")}
        t_errorDelete={t("admin.tripConfig.errorDelete")}
        t_noResults={t("admin.noResults")}
      />
    </div>
    </div>
  );
}
