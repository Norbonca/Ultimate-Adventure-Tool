import { fetchCategoriesWithSubDisciplines, fetchUserInterests, fetchUserSkills } from "../actions";
import { SkillsForm } from "./skills-form";

export default async function SkillsPage() {
  const [refData, interestsData, skillsData] = await Promise.all([
    fetchCategoriesWithSubDisciplines(),
    fetchUserInterests(),
    fetchUserSkills(),
  ]);

  return (
    <SkillsForm
      categories={refData.categories}
      subDisciplines={refData.subDisciplines}
      userInterests={interestsData.interests}
      initialSkills={skillsData.skills}
    />
  );
}
