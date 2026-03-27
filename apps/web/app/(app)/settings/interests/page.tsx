import { fetchCategoriesWithSubDisciplines, fetchUserInterests, fetchUserSkills } from "../actions";
import { InterestsForm } from "./interests-form";

export default async function InterestsPage() {
  const [refData, userData, skillsData] = await Promise.all([
    fetchCategoriesWithSubDisciplines(),
    fetchUserInterests(),
    fetchUserSkills(),
  ]);

  return (
    <InterestsForm
      categories={refData.categories}
      subDisciplines={refData.subDisciplines}
      initialInterests={userData.interests}
      initialSkills={skillsData.skills}
    />
  );
}
